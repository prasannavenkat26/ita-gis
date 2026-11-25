import type { GeoJSONPolygon } from '@/types';

const EARTH_RADIUS_M = 6378137;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the area of a polygon on the Earth's surface using the spherical
 * excess formula. Returns area in square meters.
 */
export function calculatePolygonAreaMeters(coords: number[][]): number {
  if (!Array.isArray(coords) || coords.length < 4) return 0;

  const ring = coords.length > 0 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
    ? coords.slice(0, -1)
    : coords;

  if (ring.length < 3) return 0;

  let total = 0;
  const n = ring.length;

  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % n];

    if (!Number.isFinite(lng1) || !Number.isFinite(lat1) || !Number.isFinite(lng2) || !Number.isFinite(lat2)) {
      return 0;
    }

    if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
      return 0;
    }

    total += toRadians(lng2 - lng1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function squareMetersToHectares(sqM: number): number {
  return sqM / 10000;
}

export function squareMetersToAcres(sqM: number): number {
  return sqM / 4046.8564224;
}

export function hectaresToAcres(ha: number): number {
  return ha * 2.4710538147;
}

export function acresToHectares(acres: number): number {
  return acres / 2.4710538147;
}

export function formatArea(hectares: number, unit: 'hectares' | 'acres'): string {
  if (unit === 'acres') {
    const acres = hectaresToAcres(hectares);
    return `${acres.toFixed(2)} acres`;
  }
  return `${hectares.toFixed(2)} ha`;
}

/**
 * Calculate centroid of a polygon for map centering.
 */
export function calculateCentroid(coords: number[][]): [number, number] {
  if (!coords || coords.length < 2) return [0, 0];
  let lat = 0;
  let lng = 0;
  const n = coords.length - 1;
  if (n <= 0) return [0, 0];
  for (let i = 0; i < n; i++) {
    lng += coords[i][0];
    lat += coords[i][1];
  }
  return [lat / n, lng / n];
}

/**
 * Validate that coordinates are within valid ranges.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Validate a GeoJSON polygon: at least 3 unique points, first = last (closed ring).
 */
export function isValidPolygon(polygon: GeoJSONPolygon | null): boolean {
  if (!polygon || polygon.type !== 'Polygon') return false;
  const ring = polygon.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return false;

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!Array.isArray(first) || !Array.isArray(last) || first.length < 2 || last.length < 2) return false;
  if (first[0] !== last[0] || first[1] !== last[1]) return false;

  const vertices = ring.slice(0, -1);
  if (!vertices.every((point) =>
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    isValidCoordinate(point[1], point[0])
  )) return false;

  const uniqueVertices = new Set(vertices.map(([lng, lat]) => `${lng},${lat}`));
  if (uniqueVertices.size < 3) return false;

  let twiceArea = 0;
  for (let i = 0; i < vertices.length; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % vertices.length];
    if (x1 === x2 && y1 === y2) return false;
    twiceArea += x1 * y2 - x2 * y1;
  }
  if (twiceArea === 0) return false;

  const orientation = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSegment = (a: number[], b: number[], point: number[]) =>
    point[0] >= Math.min(a[0], b[0]) &&
    point[0] <= Math.max(a[0], b[0]) &&
    point[1] >= Math.min(a[1], b[1]) &&
    point[1] <= Math.max(a[1], b[1]);
  const intersects = (a: number[], b: number[], c: number[], d: number[]) => {
    const abC = orientation(a, b, c);
    const abD = orientation(a, b, d);
    const cdA = orientation(c, d, a);
    const cdB = orientation(c, d, b);
    if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
        ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
    return (abC === 0 && onSegment(a, b, c)) ||
      (abD === 0 && onSegment(a, b, d)) ||
      (cdA === 0 && onSegment(c, d, a)) ||
      (cdB === 0 && onSegment(c, d, b));
  };

  for (let i = 0; i < vertices.length; i++) {
    const nextI = (i + 1) % vertices.length;
    for (let j = i + 1; j < vertices.length; j++) {
      const nextJ = (j + 1) % vertices.length;
      if (i === j || nextI === j || nextJ === i) continue;
      if (intersects(vertices[i], vertices[nextI], vertices[j], vertices[nextJ])) return false;
    }
  }
  return true;
}

/**
 * Calculate area from a GeoJSON polygon and return both hectares and acres.
 */
export function calculateAreaFromGeoJSON(polygon: GeoJSONPolygon | null): { hectares: number; acres: number } {
  if (!polygon || !polygon.coordinates[0]) return { hectares: 0, acres: 0 };
  const sqM = calculatePolygonAreaMeters(polygon.coordinates[0]);
  return {
    hectares: squareMetersToHectares(sqM),
    acres: squareMetersToAcres(sqM),
  };
}

/**
 * Convert array of [lat, lng] points to GeoJSON Polygon format.
 * Leaflet uses [lat, lng], GeoJSON uses [lng, lat].
 */
export function pointsToGeoJSON(points: [number, number][]): GeoJSONPolygon {
  const normalized = points.length > 0 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1]
    ? points.slice(0, -1)
    : points;

  const coords = normalized.map(([lat, lng]) => [lng, lat]);
  if (coords.length > 0) {
    const first = coords[0];
    if (coords[coords.length - 1][0] !== first[0] || coords[coords.length - 1][1] !== first[1]) {
      coords.push([...first]);
    }
  }
  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

/**
 * Convert GeoJSON Polygon to array of [lat, lng] points for Leaflet.
 */
export function geoJSONToPoints(polygon: GeoJSONPolygon | null): [number, number][] {
  if (!polygon || !polygon.coordinates[0]) return [];
  const ring = polygon.coordinates[0];
  if (!Array.isArray(ring) || ring.length === 0) return [];

  const points: [number, number][] = ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
  return points;
}

/**
 * Convert GeoJSON polygon to WKT for PostGIS insertion.
 */
export function geoJSONToWKT(polygon: GeoJSONPolygon | null): string | null {
  if (!polygon || !polygon.coordinates[0]) return null;
  const ring = polygon.coordinates[0];
  const ringStr = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `SRID=4326;POLYGON((${ringStr}))`;
}

/**
 * Format coordinates for display.
 */
export function formatCoordinate(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

/**
 * Calculate distance between two points in meters (Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}
