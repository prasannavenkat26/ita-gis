import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Farm, FarmInput, IrrigationPoint, IrrigationPointInput } from '@/types';
import { apiRequest, AUTH_TOKEN_KEY } from '@/lib/api';
import { LOCAL_DEMO_TOKEN } from '@/lib/demoApi';

function installLocalStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    },
  });
}

describe('local demo API', () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.setItem(AUTH_TOKEN_KEY, LOCAL_DEMO_TOKEN);
  });

  it('loads seeded sample farms without making an API request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const farms = await apiRequest<Farm[]>('/farms');

    expect(farms).toHaveLength(6);
    expect(farms.every((farm) => farm.is_demo)).toBe(true);
    expect(new Set(farms.map((farm) => farm.crop_type)).size).toBe(6);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('persists farm and irrigation changes locally and removes related records', async () => {
    const input: FarmInput = {
      name: 'Local test farm',
      owner: 'Demo Farmer',
      location: 'Test location',
      center_lat: 28,
      center_lng: 77,
      boundary: null,
      area_hectares: 2,
      area_acres: 4.94,
      crop_type: 'Wheat',
      planting_date: null,
      soil_type: 'Loam',
      irrigation_method: 'Drip',
      notes: '',
      photo_url: '',
      is_demo: true,
    };
    const farm = await apiRequest<Farm>('/farms', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const pointInput: IrrigationPointInput = {
      farm_id: farm.id,
      type: 'Water Source',
      lat: 28.001,
      lng: 77.001,
      notes: 'Test point',
    };
    await apiRequest<IrrigationPoint>('/irrigation-points', {
      method: 'POST',
      body: JSON.stringify(pointInput),
    });

    const details = await apiRequest<{ farm: Farm; irrigation: IrrigationPoint[] }>(`/farms/${farm.id}/details`);
    expect(details.irrigation).toHaveLength(1);

    await apiRequest<void>(`/farms/${farm.id}`, { method: 'DELETE' });
    const remaining = await apiRequest<Farm[]>('/farms');
    const points = await apiRequest<IrrigationPoint[]>('/irrigation-points');
    expect(remaining.some((item) => item.id === farm.id)).toBe(false);
    expect(points.some((point) => point.farm_id === farm.id)).toBe(false);
  });
});
