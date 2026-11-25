import os
import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

TEST_DATA = tempfile.TemporaryDirectory(prefix="farm-gis-test-")
os.environ["FARM_GIS_DATA_DIR"] = TEST_DATA.name
os.environ["FARM_GIS_DB_PATH"] = str(Path(TEST_DATA.name) / "test.sqlite3")
os.environ["FARM_GIS_SECRET_KEY"] = "test-secret-key-not-for-production"

from fastapi.testclient import TestClient

from backend.main import app


class FarmGisApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()
        self.email = f"farmer-{uuid4().hex}@example.com"

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)

    def register_and_login(self, email: str | None = None) -> str:
        email = email or self.email
        response = self.client.post(
            "/api/auth/register",
            json={"email": email, "password": "secure-password-123"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "secure-password-123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_auth_required_and_password_check(self) -> None:
        self.assertEqual(self.client.get("/api/farms").status_code, 401)
        self.client.post(
            "/api/auth/register",
            json={"email": self.email, "password": "secure-password-123"},
        )
        invalid_login = self.client.post(
            "/api/auth/login",
            json={"email": self.email, "password": "wrong-password"},
        )
        self.assertEqual(invalid_login.status_code, 401)

    def test_farm_and_irrigation_are_persisted_and_user_scoped(self) -> None:
        first_token = self.register_and_login()
        first_auth = {"Authorization": f"Bearer {first_token}"}
        farm_response = self.client.post(
            "/api/farms",
            headers=first_auth,
            json={
                "name": "Punjab Field",
                "owner": "Test Farmer",
                "location": "Ludhiana, India",
                "center_lat": 30.9,
                "center_lng": 75.85,
                "boundary": {
                    "type": "Polygon",
                    "coordinates": [[[75.8, 30.9], [75.9, 30.9], [75.9, 31.0], [75.8, 31.0], [75.8, 30.9]]],
                },
                "area_hectares": 10,
                "area_acres": 24.7,
            },
        )
        self.assertEqual(farm_response.status_code, 201, farm_response.text)
        farm = farm_response.json()
        self.assertEqual(farm["boundary"]["type"], "Polygon")

        point_response = self.client.post(
            "/api/irrigation-points",
            headers=first_auth,
            json={
                "farm_id": farm["id"],
                "type": "Water Source",
                "lat": 30.95,
                "lng": 75.85,
                "notes": "Borewell",
            },
        )
        self.assertEqual(point_response.status_code, 201, point_response.text)
        details = self.client.get(f"/api/farms/{farm['id']}/details", headers=first_auth)
        self.assertEqual(details.status_code, 200)
        self.assertEqual(len(details.json()["irrigation"]), 1)

        second_token = self.register_and_login(f"another-{uuid4().hex}@example.com")
        unauthorized_farm = self.client.get(
            f"/api/farms/{farm['id']}",
            headers={"Authorization": f"Bearer {second_token}"},
        )
        self.assertEqual(unauthorized_farm.status_code, 404)

    def test_demo_session_has_india_sample_farm(self) -> None:
        response = self.client.post("/api/auth/demo")
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()["access_token"]
        farms = self.client.get(
            "/api/farms",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(farms.status_code, 200)
        demo_farms = farms.json()
        self.assertEqual(len(demo_farms), 6)
        self.assertTrue(all(farm["is_demo"] for farm in demo_farms))
        self.assertIn("New Delhi, India", {farm["location"] for farm in demo_farms})
        self.assertEqual(len({farm["crop_type"] for farm in demo_farms}), 6)

        irrigation = self.client.get(
            "/api/irrigation-points",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(irrigation.status_code, 200)
        self.assertEqual(len(irrigation.json()), 6)


if __name__ == "__main__":
    unittest.main()
