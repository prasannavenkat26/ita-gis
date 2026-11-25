import { describe, it, expect } from 'vitest';
import {
  calculatePolygonAreaMeters,
  squareMetersToHectares,
  squareMetersToAcres,
  hectaresToAcres,
  acresToHectares,
  calculateCentroid,
  isValidCoordinate,
  isValidPolygon,
  pointsToGeoJSON,
  geoJSONToPoints,
  formatCoordinate,
  haversineDistance,
} from '../geo';
import type { GeoJSONPolygon } from '../../types';

describe('Area Calculations', () => {
  it('calculates area of a simple square polygon', () => {
    // ~1km x 1km square at the equator
    const coords = [
      [0, 0],
      [0.009, 0],
      [0.009, 0.009],
      [0, 0.009],
      [0, 0],
    ];
    const area = calculatePolygonAreaMeters(coords);
    // ~1 km² = 1,000,000 m² (approximately, with spherical correction)
    expect(area).toBeGreaterThan(900000);
    expect(area).toBeLessThan(1100000);
  });

  it('returns 0 for invalid polygons (fewer than 4 points)', () => {
    expect(calculatePolygonAreaMeters([[0, 0], [1, 1]])).toBe(0);
    expect(calculatePolygonAreaMeters([])).toBe(0);
  });

  it('converts square meters to hectares correctly', () => {
    expect(squareMetersToHectares(10000)).toBe(1);
    expect(squareMetersToHectares(50000)).toBe(5);
  });

  it('converts square meters to acres correctly', () => {
    expect(squareMetersToAcres(4046.8564224)).toBeCloseTo(1, 2);
  });

  it('converts hectares to acres correctly', () => {
    expect(hectaresToAcres(1)).toBeCloseTo(2.471, 1);
    expect(hectaresToAcres(10)).toBeCloseTo(24.71, 0);
  });

  it('converts acres to hectares correctly', () => {
    expect(acresToHectares(2.4710538147)).toBeCloseTo(1, 1);
  });
});

describe('Centroid Calculation', () => {
  it('calculates centroid of a polygon', () => {
    // 4 unique points + closing point (first = last)
    const coords = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const [lat, lng] = calculateCentroid(coords);
    // n = coords.length - 1 = 4, sum of lat = 0+10+10+0 = 20, 20/4 = 5
    expect(lat).toBe(5);
    expect(lng).toBe(5);
  });

  it('returns [0,0] for empty coords', () => {
    const [lat, lng] = calculateCentroid([]);
    expect(lat).toBe(0);
    expect(lng).toBe(0);
  });
});

describe('Coordinate Validation', () => {
  it('validates correct coordinates', () => {
    expect(isValidCoordinate(45, -90)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
  });

  it('rejects invalid coordinates', () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
  });
});

describe('Polygon Validation', () => {
  it('validates a proper closed polygon', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    expect(isValidPolygon(polygon)).toBe(true);
  });

  it('rejects polygon with fewer than 4 points', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 1], [0, 0]]],
    };
    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('rejects unclosed polygon ring', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
    };
    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('rejects null polygon', () => {
    expect(isValidPolygon(null)).toBe(false);
  });

  it('rejects self-intersecting farm boundaries', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]],
    };
    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('rejects repeated adjacent vertices', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 0], [0, 1], [0, 0]]],
    };
    expect(isValidPolygon(polygon)).toBe(false);
  });

  it('rejects malformed vertex entries without throwing', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [[[77, 28], null, [78, 29], [77, 28]]],
    } as unknown as GeoJSONPolygon;
    expect(isValidPolygon(polygon)).toBe(false);
  });
});

describe('GeoJSON Conversion', () => {
  it('converts [lat, lng] points to GeoJSON [lng, lat] format', () => {
    const points: [number, number][] = [[40, -100], [41, -99], [40.5, -98]];
    const geojson = pointsToGeoJSON(points);
    expect(geojson.type).toBe('Polygon');
    expect(geojson.coordinates[0][0]).toEqual([-100, 40]);
    expect(geojson.coordinates[0][1]).toEqual([-99, 41]);
    // Last point should equal first (closed ring)
    expect(geojson.coordinates[0][3]).toEqual([-100, 40]);
  });

  it('converts GeoJSON back to [lat, lng] points', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[[-100, 40], [-99, 41], [-98, 40.5], [-100, 40]]],
    };
    const points = geoJSONToPoints(polygon);
    expect(points.length).toBe(3); // Last point (closing) is removed
    expect(points[0]).toEqual([40, -100]);
    expect(points[1]).toEqual([41, -99]);
    expect(points[2]).toEqual([40.5, -98]);
  });

  it('handles null in geoJSONToPoints', () => {
    expect(geoJSONToPoints(null)).toEqual([]);
  });
});

describe('Coordinate Formatting', () => {
  it('formats positive coordinates with N and E', () => {
    const result = formatCoordinate(40.7128, -74.006);
    expect(result).toContain('40.712800');
    expect(result).toContain('N');
    expect(result).toContain('W');
  });

  it('formats negative coordinates with S and W', () => {
    const result = formatCoordinate(-33.8688, -151.2093);
    expect(result).toContain('S');
    expect(result).toContain('W');
  });
});

describe('Haversine Distance', () => {
  it('calculates distance between two known points', () => {
    // New York to Los Angeles is ~3,944 km
    const dist = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(3900000);
    expect(dist).toBeLessThan(4000000);
  });

  it('returns 0 for same point', () => {
    expect(haversineDistance(40, -100, 40, -100)).toBe(0);
  });
});
