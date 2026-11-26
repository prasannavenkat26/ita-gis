import type { Farm, FarmActivity, FarmInput, IrrigationPoint, IrrigationPointInput } from '@/types';
import { ApiError } from '@/lib/apiError';

export const LOCAL_DEMO_TOKEN = 'farm-gis-local-demo';
export const LOCAL_DEMO_USER_KEY = 'farm-gis-local-demo-user';
const DEMO_DATA_KEY = 'farm-gis-local-demo-data';
const DEMO_USER_ID = 'local-demo-user';

interface DemoData {
  farms: Farm[];
  irrigationPoints: IrrigationPoint[];
  activity: FarmActivity[];
}

const DEMO_FARM_SAMPLES = [
  {
    name: 'Demo Farm — New Delhi',
    location: 'New Delhi, India',
    center_lat: 28.6275,
    center_lng: 77.19,
    area_hectares: 3.1,
    crop_type: 'Wheat',
    soil_type: 'Loam',
    irrigation_method: 'Drip',
    notes: 'A small wheat field near New Delhi for exploring the map.',
    point_type: 'Drip Valve',
    point_notes: 'North field drip line',
  },
  {
    name: 'Karnal Rice Fields',
    location: 'Karnal, Haryana, India',
    center_lat: 29.6857,
    center_lng: 76.9905,
    area_hectares: 7.8,
    crop_type: 'Rice',
    soil_type: 'Silty Loam',
    irrigation_method: 'Flood',
    notes: 'Lowland paddy fields with a shared canal intake.',
    point_type: 'Canal Intake',
    point_notes: 'Canal gate',
  },
  {
    name: 'Ludhiana North Plot',
    location: 'Ludhiana, Punjab, India',
    center_lat: 30.901,
    center_lng: 75.8573,
    area_hectares: 5.4,
    crop_type: 'Corn',
    soil_type: 'Loam',
    irrigation_method: 'Sprinkler',
    notes: 'Rotated corn plot with sprinkler coverage.',
    point_type: 'Sprinkler Head',
    point_notes: 'West sprinkler line',
  },
  {
    name: 'Jaipur Dryland Farm',
    location: 'Jaipur, Rajasthan, India',
    center_lat: 26.9124,
    center_lng: 75.7873,
    area_hectares: 12.2,
    crop_type: 'Barley',
    soil_type: 'Sandy',
    irrigation_method: 'Furrow',
    notes: 'Barley field with a seasonal pump-fed furrow system.',
    point_type: 'Pump Station',
    point_notes: 'Seasonal irrigation pump',
  },
  {
    name: 'Nashik Hillside Vineyard',
    location: 'Nashik, Maharashtra, India',
    center_lat: 19.9975,
    center_lng: 73.7898,
    area_hectares: 6.2,
    crop_type: 'Grapes',
    soil_type: 'Sandy',
    irrigation_method: 'Drip',
    notes: 'Hillside grape rows supplied by a drip system.',
    point_type: 'Water Source',
    point_notes: 'Vineyard water tank',
  },
  {
    name: 'Pune Market Garden',
    location: 'Pune, Maharashtra, India',
    center_lat: 18.5204,
    center_lng: 73.8567,
    area_hectares: 2.4,
    crop_type: 'Tomatoes',
    soil_type: 'Loam',
    irrigation_method: 'Drip',
    notes: 'Market garden with a compact tomato block.',
    point_type: 'Reservoir',
    point_notes: 'Garden storage reservoir',
  },
] as const;

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function demoBoundary(latitude: number, longitude: number, areaHectares: number): Farm['boundary'] {
  const halfSideKm = Math.sqrt(areaHectares / 100) / 2;
  const latitudeOffset = halfSideKm / 111.32;
  const longitudeOffset = latitudeOffset / Math.cos((latitude * Math.PI) / 180);
  const west = longitude - longitudeOffset;
  const east = longitude + longitudeOffset;
  const south = latitude - latitudeOffset;
  const north = latitude + latitudeOffset;
  return {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

function seedDemoData(): DemoData {
  const now = new Date().toISOString();
  const farms: Farm[] = DEMO_FARM_SAMPLES.map((sample) => ({
    id: createId(),
    user_id: DEMO_USER_ID,
    name: sample.name,
    owner: 'Demo Farmer',
    location: sample.location,
    center_lat: sample.center_lat,
    center_lng: sample.center_lng,
    boundary: demoBoundary(sample.center_lat, sample.center_lng, sample.area_hectares),
    area_hectares: sample.area_hectares,
    area_acres: sample.area_hectares * 2.47105,
    crop_type: sample.crop_type,
    planting_date: null,
    soil_type: sample.soil_type,
    irrigation_method: sample.irrigation_method,
    notes: sample.notes,
    photo_url: '',
    is_demo: true,
    created_at: now,
    updated_at: now,
  }));
  const irrigationPoints: IrrigationPoint[] = farms.map((farm, index) => {
    const sample = DEMO_FARM_SAMPLES[index];
    return {
      id: createId(),
      farm_id: farm.id,
      user_id: DEMO_USER_ID,
      type: sample.point_type,
      lat: farm.center_lat + 0.0002,
      lng: farm.center_lng + 0.0002,
      notes: sample.point_notes,
      created_at: now,
    };
  });
  const activity: FarmActivity[] = farms.map((farm) => ({
    id: createId(),
    farm_id: farm.id,
    user_id: DEMO_USER_ID,
    action: 'created',
    details: `Demo sample farm "${farm.name}" created`,
    created_at: now,
  }));
  return { farms, irrigationPoints, activity };
}

function loadDemoData(): DemoData {
  const stored = localStorage.getItem(DEMO_DATA_KEY);
  if (stored === null) {
    const seeded = seedDemoData();
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const data: unknown = JSON.parse(stored);
    if (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray((data as DemoData).farms) &&
      Array.isArray((data as DemoData).irrigationPoints) &&
      Array.isArray((data as DemoData).activity)
    ) {
      return data as DemoData;
    }
  } catch {
    throw new ApiError("Local demo data is invalid. Clear this site's storage and try again.", 500);
  }
  throw new ApiError("Local demo data is invalid. Clear this site's storage and try again.", 500);
}

function saveDemoData(data: DemoData): void {
  localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
}

function addActivity(data: DemoData, farm: Farm, action: string): void {
  data.activity.unshift({
    id: createId(),
    farm_id: farm.id,
    user_id: DEMO_USER_ID,
    action,
    details: `Farm "${farm.name}" was ${action}`,
    created_at: new Date().toISOString(),
  });
}

function parseBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(init.body);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new ApiError('The request body is not valid JSON.', 400);
  }
  throw new ApiError('The request body must be a JSON object.', 400);
}

export async function demoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [pathname, queryString = ''] = path.split('?', 2);
  const method = (init.method ?? 'GET').toUpperCase();
  const data = loadDemoData();
  const farmDetailsMatch = pathname.match(/^\/farms\/([^/]+)\/details$/);
  const farmMatch = pathname.match(/^\/farms\/([^/]+)$/);
  const pointMatch = pathname.match(/^\/irrigation-points\/([^/]+)$/);
  const now = new Date().toISOString();

  if (pathname === '/farms' && method === 'GET') {
    return [...data.farms].sort((a, b) => b.created_at.localeCompare(a.created_at)) as T;
  }
  if (pathname === '/farms' && method === 'POST') {
    const input = parseBody(init) as unknown as FarmInput;
    const farm: Farm = {
      ...input,
      id: createId(),
      user_id: DEMO_USER_ID,
      is_demo: true,
      created_at: now,
      updated_at: now,
    };
    data.farms.unshift(farm);
    addActivity(data, farm, 'created');
    saveDemoData(data);
    return farm as T;
  }
  if (farmDetailsMatch && method === 'GET') {
    const farm = data.farms.find((item) => item.id === decodeURIComponent(farmDetailsMatch[1]));
    if (!farm) throw new ApiError('Farm not found.', 404);
    return {
      farm,
      irrigation: data.irrigationPoints.filter((point) => point.farm_id === farm.id),
      activity: data.activity.filter((entry) => entry.farm_id === farm.id).slice(0, 20),
    } as T;
  }
  if (farmMatch) {
    const farmId = decodeURIComponent(farmMatch[1]);
    const index = data.farms.findIndex((item) => item.id === farmId);
    if (index < 0) throw new ApiError('Farm not found.', 404);
    if (method === 'PATCH') {
      const changes = parseBody(init);
      const farm = { ...data.farms[index], ...changes, updated_at: now };
      data.farms[index] = farm;
      addActivity(data, farm, 'updated');
      saveDemoData(data);
      return farm as T;
    }
    if (method === 'DELETE') {
      data.farms.splice(index, 1);
      data.irrigationPoints = data.irrigationPoints.filter((point) => point.farm_id !== farmId);
      data.activity = data.activity.filter((entry) => entry.farm_id !== farmId);
      saveDemoData(data);
      return undefined as T;
    }
    if (method === 'GET') return data.farms[index] as T;
  }
  if (pathname === '/irrigation-points' && method === 'GET') {
    const farmId = new URLSearchParams(queryString).get('farm_id');
    const points = farmId
      ? data.irrigationPoints.filter((point) => point.farm_id === farmId)
      : data.irrigationPoints;
    return [...points].sort((a, b) => b.created_at.localeCompare(a.created_at)) as T;
  }
  if (pathname === '/irrigation-points' && method === 'POST') {
    const input = parseBody(init) as unknown as IrrigationPointInput;
    if (!data.farms.some((farm) => farm.id === input.farm_id)) {
      throw new ApiError('Farm not found.', 404);
    }
    const point: IrrigationPoint = {
      ...input,
      id: createId(),
      user_id: DEMO_USER_ID,
      created_at: now,
    };
    data.irrigationPoints.unshift(point);
    saveDemoData(data);
    return point as T;
  }
  if (pointMatch) {
    const pointId = decodeURIComponent(pointMatch[1]);
    const index = data.irrigationPoints.findIndex((point) => point.id === pointId);
    if (index < 0) throw new ApiError('Irrigation point not found.', 404);
    if (method === 'PATCH') {
      const point = { ...data.irrigationPoints[index], ...parseBody(init) };
      data.irrigationPoints[index] = point;
      saveDemoData(data);
      return point as T;
    }
    if (method === 'DELETE') {
      data.irrigationPoints.splice(index, 1);
      saveDemoData(data);
      return undefined as T;
    }
    if (method === 'GET') return data.irrigationPoints[index] as T;
  }

  throw new ApiError(`Unsupported local demo request: ${method} ${pathname}`, 404);
}
