import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Droplets,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Save,
} from 'lucide-react';
import { useFarms } from '@/hooks/useFarms';
import { useIrrigationPoints } from '@/hooks/useIrrigationPoints';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton';
import { MapView } from '@/components/map/MapView';
import { IRRIGATION_POINT_TYPES, IRRIGATION_POINT_COLORS } from '@/types';
import type { IrrigationPoint, Farm } from '@/types';
import { formatCoordinate } from '@/lib/geo';

interface OutletContext {
  searchValue: string;
}

export function IrrigationPage() {
  const { searchValue } = useOutletContext<OutletContext>();
  const { farms, loading: farmsLoading } = useFarms();
  const { points, loading: pointsLoading, createPoint, deletePoint, updatePoint } = useIrrigationPoints();

  const [showForm, setShowForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IrrigationPoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IrrigationPoint | null>(null);
  const [farmFilter, setFarmFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [clickPoint, setClickPoint] = useState<{ lat: number; lng: number } | null>(null);

  const farmMap = useMemo(() => {
    const map = new Map<string, Farm>();
    farms.forEach((f) => map.set(f.id, f));
    return map;
  }, [farms]);

  const filteredPoints = useMemo(() => {
    let result = points;
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter((p) => {
        const farm = farmMap.get(p.farm_id);
        return p.type.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q) || farm?.name.toLowerCase().includes(q);
      });
    }
    if (farmFilter) result = result.filter((p) => p.farm_id === farmFilter);
    if (typeFilter) result = result.filter((p) => p.type === typeFilter);
    return result;
  }, [points, searchValue, farmFilter, typeFilter, farmMap]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    points.forEach((p) => map.set(p.type, (map.get(p.type) || 0) + 1));
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [points]);

  const loading = farmsLoading || pointsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card><CardBody><TableSkeleton rows={4} /></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900 dark:text-forest-50">Irrigation Management</h1>
          <p className="text-sm text-forest-400 mt-1">{points.length} irrigation points across {farms.length} farms</p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => { setEditingPoint(null); setShowForm(true); }}
          disabled={farms.length === 0}
        >
          Add Irrigation Point
        </Button>
      </div>

      {farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Droplets className="w-8 h-8" />}
            title="No farms registered"
            description="Register farms first before adding irrigation points."
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Total Points</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{points.length}</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Point Types</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{typeCounts.length}</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Farms with Irrigation</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">
                {new Set(points.map((p) => p.farm_id)).size}
              </div>
            </div>
          </div>

          {/* Type distribution */}
          {typeCounts.length > 0 && (
            <Card>
              <CardHeader title="Irrigation Types" subtitle="Distribution by point type" icon={<Droplets className="w-5 h-5" />} />
              <CardBody>
                <div className="flex flex-wrap gap-3">
                  {typeCounts.map((t) => (
                    <div key={t.type} className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-forest-50 dark:bg-forest-800/60">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: IRRIGATION_POINT_COLORS[t.type] || '#67B7D9' }}>
                        {t.type[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{t.type}</p>
                        <p className="text-xs text-forest-400">{t.count} point{t.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <Select value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)} options={farms.map((f) => ({ value: f.id, label: f.name }))} placeholder="All farms" />
              </div>
              <div className="w-44">
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={IRRIGATION_POINT_TYPES.map((t) => ({ value: t, label: t }))} placeholder="All types" />
              </div>
            </div>
          </Card>

          {/* Map */}
          <Card>
            <CardHeader title="Irrigation Map" subtitle="All irrigation point locations" icon={<MapPin className="w-5 h-5" />} />
            <CardBody className="p-0">
              <MapView
                farms={farms}
                irrigationPoints={filteredPoints}
                height="350px"
                showLegend
                className="rounded-none border-0"
                onMapClick={(lat, lng) => setClickPoint({ lat, lng })}
              />
              {clickPoint && (
                <div className="px-4 py-2 border-t border-forest-100 dark:border-forest-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-forest-400">{formatCoordinate(clickPoint.lat, clickPoint.lng)}</span>
                  <Button
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => { setEditingPoint(null); setShowForm(true); }}
                  >
                    Add point here
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Table */}
          {filteredPoints.length === 0 ? (
            <Card>
              <EmptyState icon={<Droplets className="w-8 h-8" />} title="No irrigation points" description="Add irrigation points to track your water infrastructure." />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-forest-100 dark:border-forest-800">
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Farm</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Coordinates</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Notes</th>
                      <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPoints.map((pt) => {
                      const farm = farmMap.get(pt.farm_id);
                      return (
                        <tr key={pt.id} className="border-b border-forest-50 dark:border-forest-800/40 hover:bg-forest-50/50 dark:hover:bg-forest-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: IRRIGATION_POINT_COLORS[pt.type] || '#67B7D9' }}>
                                {pt.type[0]}
                              </div>
                              <span className="text-sm font-medium text-forest-900 dark:text-forest-50">{pt.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-forest-600 dark:text-forest-300">{farm?.name || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs font-mono text-forest-400">{formatCoordinate(pt.lat, pt.lng)}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-sm text-forest-600 dark:text-forest-300 truncate max-w-[200px] block">{pt.notes || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => { setEditingPoint(pt); setShowForm(true); }} className="p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 hover:text-forest-600 transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(pt)} className="p-1.5 rounded-lg text-forest-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {showForm && (
        <IrrigationFormModal
          point={editingPoint}
          farms={farms}
          defaultCoords={clickPoint || undefined}
          onClose={() => { setShowForm(false); setEditingPoint(null); setClickPoint(null); }}
          onSave={async (data) => {
            if (editingPoint) {
              await updatePoint(editingPoint.id, data);
            } else {
              await createPoint(data);
            }
            setShowForm(false);
            setEditingPoint(null);
            setClickPoint(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Irrigation Point"
        message={`Delete this ${deleteTarget?.type} point? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await deletePoint(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface IrrigationFormModalProps {
  point: IrrigationPoint | null;
  farms: Farm[];
  defaultCoords?: { lat: number; lng: number };
  onClose: () => void;
  onSave: (data: { farm_id: string; type: string; lat: number; lng: number; notes: string }) => Promise<void>;
}

function IrrigationFormModal({ point, farms, defaultCoords, onClose, onSave }: IrrigationFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farm_id: point?.farm_id || farms[0]?.id || '',
    type: point?.type || 'Drip Valve',
    lat: point?.lat ?? defaultCoords?.lat ?? 39.8283,
    lng: point?.lng ?? defaultCoords?.lng ?? -98.5795,
    notes: point?.notes || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={point ? 'Edit Irrigation Point' : 'Add Irrigation Point'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} icon={!saving && <Save className="w-4 h-4" />}>
            {point ? 'Update' : 'Add Point'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Farm"
          value={form.farm_id}
          onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
          options={farms.map((f) => ({ value: f.id, label: f.name }))}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={IRRIGATION_POINT_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="0.000001"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Longitude"
            type="number"
            step="0.000001"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Textarea
          label="Notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional notes about this irrigation point..."
        />
      </div>
    </Modal>
  );
}
