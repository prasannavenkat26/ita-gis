from __future__ import annotations

import base64
import hashlib
import hmac
import json
import math
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Iterator

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

DATA_DIR = Path(os.getenv("FARM_GIS_DATA_DIR", Path(__file__).parent / "data"))
DATABASE_PATH = Path(os.getenv("FARM_GIS_DB_PATH", DATA_DIR / "farm_gis.sqlite3"))
TOKEN_LIFETIME_SECONDS = 60 * 60 * 24
PASSWORD_ITERATIONS = 310_000
TOKEN_SECRET: bytes


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_token_secret() -> bytes:
    configured_secret = os.getenv("FARM_GIS_SECRET_KEY")
    if configured_secret:
        return configured_secret.encode("utf-8")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    secret_path = DATA_DIR / "auth.key"
    try:
        with secret_path.open("xb") as secret_file:
            secret_file.write(secrets.token_bytes(32))
    except FileExistsError:
        pass
    return secret_path.read_bytes()


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS farms (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                owner TEXT NOT NULL DEFAULT '',
                location TEXT NOT NULL DEFAULT '',
                center_lat REAL NOT NULL,
                center_lng REAL NOT NULL,
                boundary TEXT,
                area_hectares REAL NOT NULL DEFAULT 0,
                area_acres REAL NOT NULL DEFAULT 0,
                crop_type TEXT NOT NULL DEFAULT 'Other',
                planting_date TEXT,
                soil_type TEXT NOT NULL DEFAULT 'Unknown',
                irrigation_method TEXT NOT NULL DEFAULT 'None',
                notes TEXT NOT NULL DEFAULT '',
                photo_url TEXT NOT NULL DEFAULT '',
                is_demo INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS irrigation_points (
                id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS farm_activity (
                id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS farms_user_created
                ON farms(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS irrigation_user_created
                ON irrigation_points(user_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS activity_farm_created
                ON farm_activity(farm_id, created_at DESC);
            """
        )


def encode_segment(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def create_token(user_id: str) -> str:
    now = int(time.time())
    header = encode_segment(b'{"alg":"HS256","typ":"JWT"}')
    payload = encode_segment(
        json.dumps(
            {"sub": user_id, "iat": now, "exp": now + TOKEN_LIFETIME_SECONDS},
            separators=(",", ":"),
        ).encode("utf-8")
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = encode_segment(hmac.new(TOKEN_SECRET, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_token(token: str) -> str:
    try:
        header, payload, signature = token.split(".")
        signing_input = f"{header}.{payload}".encode("ascii")
        expected = encode_segment(hmac.new(TOKEN_SECRET, signing_input, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid token signature")
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(claims["exp"]) <= int(time.time()):
            raise ValueError("Expired token")
        return str(claims["sub"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from error


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"{encode_segment(salt)}${encode_segment(digest)}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        salt_part, digest_part = encoded_hash.split("$", maxsplit=1)
        salt = base64.urlsafe_b64decode(salt_part + "=" * (-len(salt_part) % 4))
        expected = base64.urlsafe_b64decode(digest_part + "=" * (-len(digest_part) % 4))
    except (ValueError, TypeError):
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return hmac.compare_digest(actual, expected)


def user_response(row: sqlite3.Row) -> dict[str, str]:
    return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}


def farm_response(row: sqlite3.Row) -> dict[str, Any]:
    farm = dict(row)
    farm["boundary"] = json.loads(farm["boundary"]) if farm["boundary"] else None
    farm["is_demo"] = bool(farm["is_demo"])
    return farm


def irrigation_response(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class PasswordResetPayload(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class BoundaryPayload(BaseModel):
    boundary: dict[str, Any] | None = None

    @field_validator("boundary")
    @classmethod
    def validate_boundary(cls, boundary: dict[str, Any] | None) -> dict[str, Any] | None:
        if boundary is None:
            return None
        if boundary.get("type") != "Polygon":
            raise ValueError("Farm boundary must be a GeoJSON Polygon")
        coordinates = boundary.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates or not isinstance(coordinates[0], list):
            raise ValueError("Farm boundary must contain an outer coordinate ring")
        ring = coordinates[0]
        if len(ring) < 4:
            raise ValueError("Farm boundary needs at least three vertices and a closing point")
        if any(
            not isinstance(point, list)
            or len(point) < 2
            or not isinstance(point[0], (int, float))
            or not isinstance(point[1], (int, float))
            or isinstance(point[0], bool)
            or isinstance(point[1], bool)
            or not -180 <= point[0] <= 180
            or not -90 <= point[1] <= 90
            for point in ring
        ):
            raise ValueError("Boundary vertices must be valid [longitude, latitude] coordinates")
        if ring[0][:2] != ring[-1][:2]:
            raise ValueError("Farm boundary ring must be closed")
        vertices = ring[:-1]
        if len({(point[0], point[1]) for point in vertices}) < 3:
            raise ValueError("Farm boundary needs at least three unique vertices")
        if any(vertices[index][:2] == vertices[(index + 1) % len(vertices)][:2] for index in range(len(vertices))):
            raise ValueError("Farm boundary cannot contain repeated adjacent vertices")
        return boundary


class FarmInput(BoundaryPayload):
    name: str = Field(min_length=1, max_length=120)
    owner: str = Field(default="", max_length=120)
    location: str = Field(default="", max_length=240)
    center_lat: float = Field(ge=-90, le=90)
    center_lng: float = Field(ge=-180, le=180)
    area_hectares: float = Field(default=0, ge=0)
    area_acres: float = Field(default=0, ge=0)
    crop_type: str = Field(default="Other", max_length=80)
    planting_date: str | None = None
    soil_type: str = Field(default="Unknown", max_length=80)
    irrigation_method: str = Field(default="None", max_length=80)
    notes: str = Field(default="", max_length=4000)
    photo_url: str = Field(default="", max_length=1000)
    is_demo: bool = False


class FarmPatch(BoundaryPayload):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    owner: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=240)
    center_lat: float | None = Field(default=None, ge=-90, le=90)
    center_lng: float | None = Field(default=None, ge=-180, le=180)
    area_hectares: float | None = Field(default=None, ge=0)
    area_acres: float | None = Field(default=None, ge=0)
    crop_type: str | None = Field(default=None, max_length=80)
    planting_date: str | None = None
    soil_type: str | None = Field(default=None, max_length=80)
    irrigation_method: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=4000)
    photo_url: str | None = Field(default=None, max_length=1000)


class IrrigationInput(BaseModel):
    farm_id: str
    type: str = Field(min_length=1, max_length=80)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    notes: str = Field(default="", max_length=2000)


class IrrigationPatch(BaseModel):
    type: str | None = Field(default=None, min_length=1, max_length=80)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    notes: str | None = Field(default=None, max_length=2000)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global TOKEN_SECRET
    TOKEN_SECRET = get_token_secret()
    initialize_database()
    seed_existing_demo_data()
    yield


security = HTTPBearer(auto_error=False)
app = FastAPI(
    title="Farm GIS API",
    description="Authentication and farm spatial-data API for the Farm GIS application.",
    version="1.0.0",
    lifespan=lifespan,
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FARM_GIS_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> sqlite3.Row:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sign in is required")
    user_id = decode_token(credentials.credentials)
    with database() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return row


def record_activity(
    connection: sqlite3.Connection,
    farm_id: str,
    user_id: str,
    action: str,
    details: str,
) -> None:
    connection.execute(
        "INSERT INTO farm_activity (id, farm_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), farm_id, user_id, action, details, utc_now()),
    )


DEMO_FARM_SAMPLES: tuple[dict[str, Any], ...] = (
    {
        "name": "Demo Farm — New Delhi",
        "location": "New Delhi, India",
        "center_lat": 28.6275,
        "center_lng": 77.19,
        "area_hectares": 3.1,
        "crop_type": "Wheat",
        "soil_type": "Loam",
        "irrigation_method": "Drip",
        "notes": "A small wheat field near New Delhi for exploring the map.",
        "point_type": "Drip Valve",
        "point_notes": "North field drip line",
    },
    {
        "name": "Karnal Rice Fields",
        "location": "Karnal, Haryana, India",
        "center_lat": 29.6857,
        "center_lng": 76.9905,
        "area_hectares": 7.8,
        "crop_type": "Rice",
        "soil_type": "Silty Loam",
        "irrigation_method": "Flood",
        "notes": "Lowland paddy fields with a shared canal intake.",
        "point_type": "Canal Intake",
        "point_notes": "Canal gate",
    },
    {
        "name": "Ludhiana North Plot",
        "location": "Ludhiana, Punjab, India",
        "center_lat": 30.901,
        "center_lng": 75.8573,
        "area_hectares": 5.4,
        "crop_type": "Corn",
        "soil_type": "Loam",
        "irrigation_method": "Sprinkler",
        "notes": "Rotated corn plot with sprinkler coverage.",
        "point_type": "Sprinkler Head",
        "point_notes": "West sprinkler line",
    },
    {
        "name": "Jaipur Dryland Farm",
        "location": "Jaipur, Rajasthan, India",
        "center_lat": 26.9124,
        "center_lng": 75.7873,
        "area_hectares": 12.2,
        "crop_type": "Barley",
        "soil_type": "Sandy",
        "irrigation_method": "Furrow",
        "notes": "Barley field with a seasonal pump-fed furrow system.",
        "point_type": "Pump Station",
        "point_notes": "Seasonal irrigation pump",
    },
    {
        "name": "Nashik Hillside Vineyard",
        "location": "Nashik, Maharashtra, India",
        "center_lat": 19.9975,
        "center_lng": 73.7898,
        "area_hectares": 6.2,
        "crop_type": "Grapes",
        "soil_type": "Sandy",
        "irrigation_method": "Drip",
        "notes": "Hillside grape rows supplied by a drip system.",
        "point_type": "Water Source",
        "point_notes": "Vineyard water tank",
    },
    {
        "name": "Pune Market Garden",
        "location": "Pune, Maharashtra, India",
        "center_lat": 18.5204,
        "center_lng": 73.8567,
        "area_hectares": 2.4,
        "crop_type": "Tomatoes",
        "soil_type": "Loam",
        "irrigation_method": "Drip",
        "notes": "Market garden with a compact tomato block.",
        "point_type": "Reservoir",
        "point_notes": "Garden storage reservoir",
    },
)


def demo_boundary(latitude: float, longitude: float, area_hectares: float) -> dict[str, Any]:
    half_side_km = math.sqrt(area_hectares / 100) / 2
    latitude_offset = half_side_km / 111.32
    longitude_offset = latitude_offset / math.cos(math.radians(latitude))
    west = longitude - longitude_offset
    east = longitude + longitude_offset
    south = latitude - latitude_offset
    north = latitude + latitude_offset
    return {
        "type": "Polygon",
        "coordinates": [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    }


def seed_demo_farms(connection: sqlite3.Connection, user_id: str) -> None:
    for sample in DEMO_FARM_SAMPLES:
        existing_farm = connection.execute(
            "SELECT id FROM farms WHERE user_id = ? AND name = ?",
            (user_id, sample["name"]),
        ).fetchone()
        if existing_farm is None:
            farm_id = str(uuid.uuid4())
            created_at = utc_now()
            area_hectares = sample["area_hectares"]
            connection.execute(
                """
                INSERT INTO farms (
                    id, user_id, name, owner, location, center_lat, center_lng, boundary,
                    area_hectares, area_acres, crop_type, planting_date, soil_type,
                    irrigation_method, notes, photo_url, is_demo, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, ?, ?)
                """,
                (
                    farm_id, user_id, sample["name"], "Demo Farmer", sample["location"],
                    sample["center_lat"], sample["center_lng"],
                    json.dumps(demo_boundary(sample["center_lat"], sample["center_lng"], area_hectares)),
                    area_hectares, area_hectares * 2.47105, sample["crop_type"], None,
                    sample["soil_type"], sample["irrigation_method"], sample["notes"],
                    created_at, created_at,
                ),
            )
            record_activity(connection, farm_id, user_id, "created", f'Demo sample farm "{sample["name"]}" created')
        else:
            farm_id = existing_farm["id"]

        point_exists = connection.execute(
            "SELECT 1 FROM irrigation_points WHERE farm_id = ? AND type = ? AND notes = ?",
            (farm_id, sample["point_type"], sample["point_notes"]),
        ).fetchone()
        if point_exists is None:
            connection.execute(
                """
                INSERT INTO irrigation_points (
                    id, farm_id, user_id, type, lat, lng, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()), farm_id, user_id, sample["point_type"],
                    sample["center_lat"] + 0.0002, sample["center_lng"] + 0.0002,
                    sample["point_notes"], utc_now(),
                ),
            )


def seed_existing_demo_data() -> None:
    with database() as connection:
        demo_users = connection.execute(
            "SELECT id FROM users WHERE email LIKE '%@demo.local'"
        ).fetchall()
        for user in demo_users:
            seed_demo_farms(connection, user["id"])


def get_owned_farm(connection: sqlite3.Connection, farm_id: str, user_id: str) -> sqlite3.Row:
    row = connection.execute(
        "SELECT * FROM farms WHERE id = ? AND user_id = ?", (farm_id, user_id)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return row


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register(payload: Credentials) -> dict[str, Any]:
    email = payload.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    user_id = str(uuid.uuid4())
    created_at = utc_now()
    try:
        with database() as connection:
            connection.execute(
                "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, email, hash_password(payload.password), created_at),
            )
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from error
    return {"user": {"id": user_id, "email": email, "created_at": created_at}}


@app.post("/api/auth/login")
def login(payload: Credentials) -> dict[str, Any]:
    email = payload.email.strip().lower()
    with database() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    return {
        "access_token": create_token(row["id"]),
        "token_type": "bearer",
        "expires_in": TOKEN_LIFETIME_SECONDS,
        "user": user_response(row),
    }


@app.post("/api/auth/demo")
def demo_login() -> dict[str, Any]:
    user_id = str(uuid.uuid4())
    email = f"guest-{user_id[:8]}@demo.local"
    created_at = utc_now()
    with database() as connection:
        connection.execute(
            "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, email, hash_password(secrets.token_urlsafe(24)), created_at),
        )
        seed_demo_farms(connection, user_id)
    return {
        "access_token": create_token(user_id),
        "token_type": "bearer",
        "expires_in": TOKEN_LIFETIME_SECONDS,
        "user": {"id": user_id, "email": email, "created_at": created_at},
    }


@app.post("/api/auth/password-reset")
def password_reset(payload: PasswordResetPayload) -> None:
    email = payload.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    raise HTTPException(
        status_code=501,
        detail="Password-reset email delivery is not configured for this local deployment.",
    )


@app.get("/api/auth/me")
def get_me(user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    return user_response(user)


@app.get("/api/farms")
def list_farms(user: sqlite3.Row = Depends(current_user)) -> list[dict[str, Any]]:
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM farms WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)
        ).fetchall()
    return [farm_response(row) for row in rows]


@app.post("/api/farms", status_code=201)
def create_farm(payload: FarmInput, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    farm_id = str(uuid.uuid4())
    created_at = utc_now()
    values = payload.model_dump()
    values["boundary"] = json.dumps(values["boundary"]) if values["boundary"] is not None else None
    values["is_demo"] = int(values["is_demo"])
    columns = ["id", "user_id", *values.keys(), "created_at", "updated_at"]
    row_values = [farm_id, user["id"], *values.values(), created_at, created_at]
    with database() as connection:
        connection.execute(
            f"INSERT INTO farms ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)})",
            row_values,
        )
        record_activity(connection, farm_id, user["id"], "created", f'Farm "{payload.name}" was created')
        row = get_owned_farm(connection, farm_id, user["id"])
    return farm_response(row)


@app.get("/api/farms/{farm_id}")
def get_farm(farm_id: str, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    with database() as connection:
        return farm_response(get_owned_farm(connection, farm_id, user["id"]))


@app.get("/api/farms/{farm_id}/details")
def get_farm_details(farm_id: str, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    with database() as connection:
        farm = get_owned_farm(connection, farm_id, user["id"])
        irrigation = connection.execute(
            "SELECT * FROM irrigation_points WHERE farm_id = ? AND user_id = ? ORDER BY created_at DESC",
            (farm_id, user["id"]),
        ).fetchall()
        activity = connection.execute(
            "SELECT * FROM farm_activity WHERE farm_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20",
            (farm_id, user["id"]),
        ).fetchall()
    return {
        "farm": farm_response(farm),
        "irrigation": [irrigation_response(row) for row in irrigation],
        "activity": [dict(row) for row in activity],
    }


@app.patch("/api/farms/{farm_id}")
def update_farm(
    farm_id: str,
    payload: FarmPatch,
    user: sqlite3.Row = Depends(current_user),
) -> dict[str, Any]:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one farm field to update")
    if any(value is None for key, value in changes.items() if key not in {"boundary", "planting_date"}):
        raise HTTPException(status_code=422, detail="Required farm fields cannot be null")
    if "boundary" in changes:
        changes["boundary"] = json.dumps(changes["boundary"]) if changes["boundary"] is not None else None
    if "is_demo" in changes:
        changes["is_demo"] = int(changes["is_demo"])
    changes["updated_at"] = utc_now()
    with database() as connection:
        farm = get_owned_farm(connection, farm_id, user["id"])
        assignments = ", ".join(f"{key} = ?" for key in changes)
        connection.execute(
            f"UPDATE farms SET {assignments} WHERE id = ? AND user_id = ?",
            [*changes.values(), farm_id, user["id"]],
        )
        record_activity(
            connection,
            farm_id,
            user["id"],
            "updated",
            f'Farm "{changes.get("name", farm["name"])}" was updated',
        )
        updated = get_owned_farm(connection, farm_id, user["id"])
    return farm_response(updated)


@app.delete("/api/farms/{farm_id}", status_code=204)
def delete_farm(farm_id: str, user: sqlite3.Row = Depends(current_user)) -> None:
    with database() as connection:
        get_owned_farm(connection, farm_id, user["id"])
        connection.execute("DELETE FROM farms WHERE id = ? AND user_id = ?", (farm_id, user["id"]))


@app.get("/api/irrigation-points")
def list_irrigation_points(
    farm_id: str | None = Query(default=None),
    user: sqlite3.Row = Depends(current_user),
) -> list[dict[str, Any]]:
    with database() as connection:
        if farm_id:
            get_owned_farm(connection, farm_id, user["id"])
            rows = connection.execute(
                "SELECT * FROM irrigation_points WHERE user_id = ? AND farm_id = ? ORDER BY created_at DESC",
                (user["id"], farm_id),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM irrigation_points WHERE user_id = ? ORDER BY created_at DESC",
                (user["id"],),
            ).fetchall()
    return [irrigation_response(row) for row in rows]


@app.post("/api/irrigation-points", status_code=201)
def create_irrigation_point(
    payload: IrrigationInput,
    user: sqlite3.Row = Depends(current_user),
) -> dict[str, Any]:
    point_id = str(uuid.uuid4())
    created_at = utc_now()
    with database() as connection:
        get_owned_farm(connection, payload.farm_id, user["id"])
        connection.execute(
            """
            INSERT INTO irrigation_points (id, farm_id, user_id, type, lat, lng, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (point_id, payload.farm_id, user["id"], payload.type, payload.lat, payload.lng, payload.notes, created_at),
        )
        row = connection.execute("SELECT * FROM irrigation_points WHERE id = ?", (point_id,)).fetchone()
    return irrigation_response(row)


@app.patch("/api/irrigation-points/{point_id}")
def update_irrigation_point(
    point_id: str,
    payload: IrrigationPatch,
    user: sqlite3.Row = Depends(current_user),
) -> dict[str, Any]:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one irrigation field to update")
    if any(value is None for value in changes.values()):
        raise HTTPException(status_code=422, detail="Irrigation fields cannot be null")
    with database() as connection:
        row = connection.execute(
            "SELECT * FROM irrigation_points WHERE id = ? AND user_id = ?", (point_id, user["id"])
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Irrigation point not found")
        assignments = ", ".join(f"{key} = ?" for key in changes)
        connection.execute(
            f"UPDATE irrigation_points SET {assignments} WHERE id = ? AND user_id = ?",
            [*changes.values(), point_id, user["id"]],
        )
        updated = connection.execute(
            "SELECT * FROM irrigation_points WHERE id = ?", (point_id,)
        ).fetchone()
    return irrigation_response(updated)


@app.delete("/api/irrigation-points/{point_id}", status_code=204)
def delete_irrigation_point(point_id: str, user: sqlite3.Row = Depends(current_user)) -> None:
    with database() as connection:
        cursor = connection.execute(
            "DELETE FROM irrigation_points WHERE id = ? AND user_id = ?", (point_id, user["id"])
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Irrigation point not found")
