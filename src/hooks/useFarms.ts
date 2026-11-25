import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { calculateAreaFromGeoJSON } from '@/lib/geo';
import type { Farm, FarmInput, FarmActivity, IrrigationPoint } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function useFarms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Farm[]>('/farms');
      setFarms(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load farms.';
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  const createFarm = async (input: FarmInput): Promise<Farm | null> => {
    let farm: Farm;
    try {
      farm = await apiRequest<Farm>('/farms', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create farm.', 'error');
      return null;
    }

    toast('Farm created successfully', 'success');
    await fetchFarms();
    return farm;
  };

  const updateFarm = async (id: string, input: Partial<FarmInput>): Promise<Farm | null> => {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.owner !== undefined) updateData.owner = input.owner;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.center_lat !== undefined) updateData.center_lat = input.center_lat;
    if (input.center_lng !== undefined) updateData.center_lng = input.center_lng;
    if (input.boundary !== undefined) {
      updateData.boundary = input.boundary;
      const areas = calculateAreaFromGeoJSON(input.boundary ?? null);
      updateData.area_hectares = areas.hectares;
      updateData.area_acres = areas.acres;
    }
    if (input.area_hectares !== undefined) updateData.area_hectares = input.area_hectares;
    if (input.area_acres !== undefined) updateData.area_acres = input.area_acres;
    if (input.crop_type !== undefined) updateData.crop_type = input.crop_type;
    if (input.planting_date !== undefined) updateData.planting_date = input.planting_date;
    if (input.soil_type !== undefined) updateData.soil_type = input.soil_type;
    if (input.irrigation_method !== undefined) updateData.irrigation_method = input.irrigation_method;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.photo_url !== undefined) updateData.photo_url = input.photo_url;

    let farm: Farm;
    try {
      farm = await apiRequest<Farm>(`/farms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update farm.', 'error');
      return null;
    }

    toast('Farm updated successfully', 'success');
    await fetchFarms();
    return farm;
  };

  const deleteFarm = async (id: string): Promise<boolean> => {
    try {
      await apiRequest<void>(`/farms/${id}`, { method: 'DELETE' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete farm.', 'error');
      return false;
    }
    toast('Farm deleted', 'success');
    await fetchFarms();
    return true;
  };

  const getFarmWithDetails = async (id: string): Promise<{ farm: Farm; irrigation: IrrigationPoint[]; activity: FarmActivity[] } | null> => {
    try {
      return await apiRequest<{ farm: Farm; irrigation: IrrigationPoint[]; activity: FarmActivity[] }>(
        `/farms/${id}/details`
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load farm details.', 'error');
      return null;
    }
  };

  return {
    farms,
    loading,
    error,
    fetchFarms,
    createFarm,
    updateFarm,
    deleteFarm,
    getFarmWithDetails,
  };
}
