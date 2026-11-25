import { useState, useEffect } from 'react';
import { MapPin, Trash2, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MapView } from '@/components/map/MapView';
import { CROP_TYPES, SOIL_TYPES, IRRIGATION_METHODS } from '@/types';
import type { Farm, FarmInput } from '@/types';
import {
  calculateAreaFromGeoJSON,
  calculateCentroid,
  formatArea,
  pointsToGeoJSON,
  geoJSONToPoints,
  isValidPolygon,
} from '@/lib/geo';
import { useToast } from '@/contexts/ToastContext';

interface FarmFormModalProps {
  farm: Farm | null;
  onClose: () => void;
  onSave: (data: FarmInput) => Promise<void>;
}

export function FarmFormModal({ farm, onClose, onSave }: FarmFormModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: farm?.name || '',
    owner: farm?.owner || '',
    location: farm?.location || '',
    crop_type: farm?.crop_type || '',
    planting_date: farm?.planting_date || '',
    soil_type: farm?.soil_type || '',
    irrigation_method: farm?.irrigation_method || '',
    notes: farm?.notes || '',
    photo_url: farm?.photo_url || '',
  });

  useEffect(() => {
    if (farm?.boundary) {
      setDrawnPoints(geoJSONToPoints(farm.boundary));
    }
  }, [farm]);

  const area = drawnPoints.length >= 3
    ? calculateAreaFromGeoJSON(pointsToGeoJSON(drawnPoints))
    : { hectares: 0, acres: 0 };

  const centroid = drawnPoints.length >= 3
    ? calculateCentroid(drawnPoints)
    : [farm?.center_lat || 39.8283, farm?.center_lng || -98.5795] as [number, number];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Farm name is required';
    if (drawnPoints.length > 0 && drawnPoints.length < 3) e.boundary = 'Polygon needs at least 3 vertices';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast('Please fix the errors before saving', 'error');
      return;
    }

    setSaving(true);
    const boundary = drawnPoints.length >= 3 ? pointsToGeoJSON(drawnPoints) : null;
    const areas = boundary ? calculateAreaFromGeoJSON(boundary) : { hectares: 0, acres: 0 };
    const center = boundary
      ? calculateCentroid(drawnPoints)
      : [farm?.center_lat || 0, farm?.center_lng || 0] as [number, number];

    const data: FarmInput = {
      name: form.name.trim(),
      owner: form.owner.trim(),
      location: form.location.trim(),
      center_lat: center[0],
      center_lng: center[1],
      boundary: isValidPolygon(boundary) ? boundary : null,
      area_hectares: areas.hectares,
      area_acres: areas.acres,
      crop_type: form.crop_type,
      planting_date: form.planting_date || null,
      soil_type: form.soil_type,
      irrigation_method: form.irrigation_method,
      notes: form.notes.trim(),
      photo_url: form.photo_url.trim(),
      is_demo: farm?.is_demo ?? false,
    };

    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={farm ? 'Edit Farm' : 'Register New Farm'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} icon={!saving && <Check className="w-4 h-4" />}>
            {farm ? 'Update Farm' : 'Create Farm'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Boundary drawing map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-forest-700 dark:text-forest-200">
              Farm Boundary
            </label>
            {drawnPoints.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant={drawnPoints.length >= 3 ? 'success' : 'warning'}>
                  {drawnPoints.length} vertices
                </Badge>
                {drawnPoints.length >= 3 && (
                  <Badge variant="info">{formatArea(area.hectares, 'hectares')}</Badge>
                )}
                <button
                  onClick={() => setDrawnPoints([])}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-forest-400 mb-2">
            Click on the map to add boundary vertices. Draw at least 3 points to create a polygon.
          </p>
          <MapView
            farms={farm ? [farm] : []}
            drawingMode={true}
            drawnPoints={drawnPoints}
            onDrawComplete={setDrawnPoints}
            center={centroid}
            zoom={drawnPoints.length > 0 ? 14 : 4}
            height="300px"
          />
          {errors.boundary && <p className="text-xs text-red-500 mt-1">{errors.boundary}</p>}
        </div>

        {/* Form fields */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Farm Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Greenwood Acres"
            icon={<MapPin className="w-4 h-4" />}
          />
          <Input
            label="Owner / Farmer"
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            placeholder="e.g. John Smith"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Sacramento Valley, CA"
          />
          <Select
            label="Crop Type"
            value={form.crop_type}
            onChange={(e) => setForm({ ...form, crop_type: e.target.value })}
            options={CROP_TYPES.map((c) => ({ value: c, label: c }))}
            placeholder="Select crop"
          />
          <Input
            label="Planting Date"
            type="date"
            value={form.planting_date}
            onChange={(e) => setForm({ ...form, planting_date: e.target.value })}
          />
          <Select
            label="Soil Type"
            value={form.soil_type}
            onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
            options={SOIL_TYPES.map((s) => ({ value: s, label: s }))}
            placeholder="Select soil type"
          />
          <Select
            label="Irrigation Method"
            value={form.irrigation_method}
            onChange={(e) => setForm({ ...form, irrigation_method: e.target.value })}
            options={IRRIGATION_METHODS.map((i) => ({ value: i, label: i }))}
            placeholder="Select method"
          />
          <Input
            label="Photo URL"
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            placeholder="https://..."
            hint="Optional photo of the farm"
          />
        </div>

        <Textarea
          label="Notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Additional notes about this farm..."
        />
      </div>
    </Modal>
  );
}
