import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { IrrigationPoint, IrrigationPointInput } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function useIrrigationPoints(farmId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [points, setPoints] = useState<IrrigationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const query = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
      setPoints(await apiRequest<IrrigationPoint[]>(`/irrigation-points${query}`));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load irrigation points.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, farmId, toast]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const createPoint = async (input: IrrigationPointInput): Promise<IrrigationPoint | null> => {
    let point: IrrigationPoint;
    try {
      point = await apiRequest<IrrigationPoint>('/irrigation-points', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add irrigation point.', 'error');
      return null;
    }
    toast('Irrigation point added', 'success');
    await fetchPoints();
    return point;
  };

  const updatePoint = async (id: string, input: Partial<IrrigationPointInput>): Promise<boolean> => {
    try {
      await apiRequest<IrrigationPoint>(`/irrigation-points/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update irrigation point.', 'error');
      return false;
    }
    toast('Irrigation point updated', 'success');
    await fetchPoints();
    return true;
  };

  const deletePoint = async (id: string): Promise<boolean> => {
    try {
      await apiRequest<void>(`/irrigation-points/${id}`, { method: 'DELETE' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove irrigation point.', 'error');
      return false;
    }
    toast('Irrigation point removed', 'success');
    await fetchPoints();
    return true;
  };

  return {
    points,
    loading,
    fetchPoints,
    createPoint,
    updatePoint,
    deletePoint,
  };
}
