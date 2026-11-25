import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  MapPin,
  Pencil,
  Trash2,
  X,
  Layers,
  Crosshair,
  Ruler,
  Save,
  Download,
  Upload,
  Tractor,
  Droplets,
  Calendar,
  Sprout,
} from 'lucide-react';
import { useFarms } from '@/hooks/useFarms';
import { useIrrigationPoints } from '@/hooks/useIrrigationPoints';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import { CROP_COLORS, IRRIGATION_POINT_COLORS } from '@/types';
import type { Farm } from '@/types';
import {
  calculateAreaFromGeoJSON,
  calculateCentroid,
  formatArea,
  formatCoordinate,
  pointsToGeoJSON,
  geoJSONToPoints,
  isValidPolygon,
} from '@/lib/geo';

interface OutletContext {
  searchValue: string;
}

export function GISExplorerPage() {
  const { searchValue } = useOutletContext<OutletContext>();
  const { farms, loading, deleteFarm, updateFarm } = useFarms();
  const { points } = useIrrigationPoints();
  const { toast } = useToast();

  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Farm | null>(null);
  const [unit, setUnit] = useState<'hectares' | 'acres'>('hectares');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const filteredFarms = useMemo(() => {
    if (!searchValue) return farms;
    const q = searchValue.toLowerCase();
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.owner.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q)
    );
  }, [farms, searchValue]);

  const selectedFarm = useMemo(
    () => farms.find((f) => f.id === selectedFarmId) || null,
    [farms, selectedFarmId]
  );

  const selectedFarmIrrigation = useMemo(
    () => points.filter((p) => p.farm_id === selectedFarmId),
    [points, selectedFarmId]
  );

  const drawnArea = useMemo(() => {
    if (drawnPoints.length < 3) return null;
    const geojson = pointsToGeoJSON(drawnPoints);
    return calculateAreaFromGeoJSON(geojson);
  }, [drawnPoints]);

  const handleDrawComplete = useCallback((pts: [number, number][]) => {
    setDrawnPoints(pts);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });
  }, []);

  const handleSaveBoundary = async () => {
    if (!editingFarmId || drawnPoints.length < 3) return;
    const geojson = pointsToGeoJSON(drawnPoints);
    if (!isValidPolygon(geojson)) {
      toast('Polygon must have at least 3 vertices', 'error');
      return;
    }
    const areas = calculateAreaFromGeoJSON(geojson);
    const centroid = calculateCentroid(
      geojson.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number])
    );

    const updatedFarm = await updateFarm(editingFarmId, {
      boundary: geojson,
      area_hectares: areas.hectares,
      area_acres: areas.acres,
      center_lat: centroid[0],
      center_lng: centroid[1],
    });
    if (!updatedFarm) return;

    setDrawingMode(false);
    setSelectionMode(true);
    setDrawnPoints([]);
    setEditingFarmId(null);
    toast('Boundary saved successfully', 'success');
  };

  const handleStartDrawing = (farmId: string) => {
    setEditingFarmId(farmId);
    setDrawingMode(true);
    setSelectionMode(false);
    setDrawnPoints([]);
    toast('Click on the map to draw boundary vertices. Click Save when done.', 'info');
  };

  const handleCancelDrawing = () => {
    setDrawingMode(false);
    setSelectionMode(true);
    setDrawnPoints([]);
    setEditingFarmId(null);
  };

  const handleExportGeoJSON = () => {
    if (!selectedFarm || !selectedFarm.boundary) {
      toast('No boundary to export', 'error');
      return;
    }
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: selectedFarm.name,
            crop_type: selectedFarm.crop_type,
            area_hectares: selectedFarm.area_hectares,
          },
          geometry: selectedFarm.boundary,
        },
      ],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFarm.name.replace(/\s+/g, '_')}_boundary.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast('GeoJSON exported', 'success');
  };

  const handleImportGeoJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        let geometry = null;
        if (data.type === 'FeatureCollection' && data.features?.[0]) {
          geometry = data.features[0].geometry;
        } else if (data.type === 'Polygon') {
          geometry = data;
        }
        if (!geometry || geometry.type !== 'Polygon') {
          toast('Invalid GeoJSON: expected a Polygon', 'error');
          return;
        }
        if (!isValidPolygon(geometry)) {
          toast('Invalid polygon geometry', 'error');
          return;
        }
        const pts = geoJSONToPoints(geometry);
        setDrawnPoints(pts);
        setDrawingMode(true);
        toast('GeoJSON loaded. Review and click Save to apply.', 'info');
      } catch {
        toast('Failed to parse GeoJSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast('Geolocation not supported by your browser', 'error');
      return;
    }
    toast('Requesting your location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast(`Location: ${formatCoordinate(pos.coords.latitude, pos.coords.longitude)}`, 'success');
      },
      (err) => {
        toast(`Geolocation error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true }
    );
  };

  // Sync drawn points when starting edit of a farm with existing boundary
  useEffect(() => {
    if (editingFarmId && drawingMode && drawnPoints.length === 0) {
      const farm = farms.find((f) => f.id === editingFarmId);
      if (farm?.boundary) {
        const pts = geoJSONToPoints(farm.boundary);
        if (pts.length >= 3) {
          setDrawnPoints(pts);
        }
      }
    }
  }, [editingFarmId, drawingMode, drawnPoints.length, farms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-10 h-10 border-3 border-forest-200 border-t-forest-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)] gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-forest-200/80 bg-white/90 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-forest-700/60 dark:bg-forest-900/90">
        <div className="flex items-center gap-2 rounded-lg border border-forest-200 bg-forest-50/80 p-1 dark:border-forest-700 dark:bg-forest-800/70">
          <button
            type="button"
            onClick={() => {
              setSelectionMode(true);
              setDrawingMode(false);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${selectionMode && !drawingMode ? 'bg-white text-forest-800 shadow-sm dark:bg-forest-700 dark:text-forest-50' : 'text-forest-500 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-200'}`}
          >
            Select
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedFarm) {
                handleStartDrawing(selectedFarm.id);
              }
            }}
            disabled={!selectedFarm}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${drawingMode ? 'bg-white text-forest-800 shadow-sm dark:bg-forest-700 dark:text-forest-50' : 'text-forest-500 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-200'} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            Draw
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedFarm && !drawingMode && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => handleStartDrawing(selectedFarm.id)}
            >
              Edit Boundary
            </Button>
          )}
          {drawingMode && (
            <>
              <Button size="sm" variant="accent" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveBoundary}>
                Save Boundary
              </Button>
              <Button size="sm" variant="secondary" icon={<X className="w-3.5 h-3.5" />} onClick={handleCancelDrawing}>
                Cancel
              </Button>
              {drawnPoints.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setDrawnPoints([])}
                >
                  Clear
                </Button>
              )}
              <Badge variant="warning">
                {drawnPoints.length} vertices · {drawnArea ? formatArea(drawnArea.hectares, unit) : 'Drawing...'}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button size="sm" variant="ghost" icon={<Crosshair className="w-3.5 h-3.5" />} onClick={handleGeolocate}>
            <span className="hidden sm:inline">Locate Me</span>
          </Button>
          <label className="btn-ghost text-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".geojson,.json" className="hidden" onChange={handleImportGeoJSON} />
          </label>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportGeoJSON}
            disabled={!selectedFarm?.boundary}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-forest-200 bg-forest-50/80 p-1 dark:border-forest-700 dark:bg-forest-800/70">
            <button
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${unit === 'hectares' ? 'bg-forest-500 text-white shadow-sm' : 'text-forest-500'}`}
              onClick={() => setUnit('hectares')}
            >
              ha
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${unit === 'acres' ? 'bg-forest-500 text-white shadow-sm' : 'text-forest-500'}`}
              onClick={() => setUnit('acres')}
            >
              ac
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative min-w-0">
          <MapView
            farms={filteredFarms}
            irrigationPoints={points}
            selectedFarmId={selectedFarmId}
            selectionMode={selectionMode}
            onSelectFarm={(id) => {
              setSelectedFarmId(id);
              setSelectionMode(true);
              setMobilePanelOpen(true);
            }}
            onMapClick={handleMapClick}
            drawingMode={drawingMode}
            drawnPoints={drawnPoints}
            onDrawComplete={handleDrawComplete}
            showLegend
            showCoordinates
            height="100%"
          />
          {drawingMode && (
            <div className="absolute top-3 left-3 z-[500] glass-strong rounded-lg px-4 py-2.5 max-w-xs animate-fade-in">
              <p className="text-sm font-medium text-forest-700 dark:text-forest-200">
                Drawing Mode Active
              </p>
              <p className="text-xs text-forest-400 mt-0.5">
                Click to add vertices, then drag the numbered points to refine the boundary. Save with at least 3 points.
              </p>
            </div>
          )}
        </div>

        {/* Details panel — desktop */}
        <div className="hidden lg:flex w-80 flex-shrink-0 flex-col">
          <DetailsPanel
            farm={selectedFarm}
            irrigation={selectedFarmIrrigation}
            unit={unit}
            onSelectFarm={setSelectedFarmId}
            onDelete={(f) => setDeleteConfirm(f)}
            farms={filteredFarms}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-forest-600 dark:text-forest-300">
          <MapPin className="w-3.5 h-3.5 text-forest-400" />
          <span className="font-mono">
            {currentCoords
              ? formatCoordinate(currentCoords.lat, currentCoords.lng)
              : 'Move cursor on map'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-forest-600 dark:text-forest-300">
          <Tractor className="w-3.5 h-3.5 text-forest-400" />
          {selectedFarm ? selectedFarm.name : 'No farm selected'}
        </div>
        <div className="flex items-center gap-1.5 text-forest-600 dark:text-forest-300 ml-auto">
          <Ruler className="w-3.5 h-3.5 text-forest-400" />
          {selectedFarm ? formatArea(selectedFarm.area_hectares, unit) : `Unit: ${unit}`}
        </div>
        <div className="flex items-center gap-1.5 text-forest-400">
          <Layers className="w-3.5 h-3.5" />
          {filteredFarms.length} farms · {points.length} irrigation pts
        </div>
      </div>

      {/* Mobile details panel */}
      {mobilePanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm" onClick={() => setMobilePanelOpen(false)} />
          <div className="relative w-full max-h-[70vh] overflow-y-auto bg-white dark:bg-forest-900 rounded-t-2xl shadow-card-xl animate-slide-in-left p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-1 bg-forest-200 dark:bg-forest-700 rounded-full mx-auto" />
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="absolute right-4 top-4 p-1 rounded text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800"
                aria-label="Close farm details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DetailsPanel
              farm={selectedFarm}
              irrigation={selectedFarmIrrigation}
              unit={unit}
              onSelectFarm={setSelectedFarmId}
              onDelete={(f) => setDeleteConfirm(f)}
              farms={filteredFarms}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Farm"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also remove all irrigation points associated with this farm. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteConfirm) {
            const ok = await deleteFarm(deleteConfirm.id);
            if (ok) setSelectedFarmId(null);
          }
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

interface DetailsPanelProps {
  farm: Farm | null;
  irrigation: Array<{ id: string; type: string; lat: number; lng: number; notes: string }>;
  unit: 'hectares' | 'acres';
  onSelectFarm: (id: string) => void;
  onDelete: (farm: Farm) => void;
  farms: Farm[];
}

function DetailsPanel({ farm, irrigation, unit, onSelectFarm, onDelete, farms }: DetailsPanelProps) {
  if (!farm) {
    return (
      <div className="card-3d h-full flex flex-col">
        <div className="p-4 border-b border-forest-100 dark:border-forest-800">
          <h3 className="font-semibold text-forest-900 dark:text-forest-50">Farm Details</h3>
          <p className="text-xs text-forest-400 mt-0.5">Select a farm on the map</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {farms.length === 0 ? (
            <EmptyState
              icon={<Tractor className="w-7 h-7" />}
              title="No farms visible"
              description="Register farms to see them on the map."
            />
          ) : (
            <div className="p-3 space-y-1.5">
              <p className="text-xs text-forest-400 font-medium uppercase tracking-wider px-2 mb-1">
                Farm List
              </p>
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSelectFarm(f.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-forest-50 dark:hover:bg-forest-800/60 transition-colors text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: CROP_COLORS[f.crop_type] || '#4387AE' }}
                  >
                    {f.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50 truncate">{f.name}</p>
                    <p className="text-xs text-forest-400 truncate">
                      {f.crop_type || 'Uncropped'} · {formatArea(f.area_hectares, unit)}
                    </p>
                  </div>
                  {f.is_demo && <Badge variant="accent">Demo</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card-3d h-full flex flex-col">
      <div className="p-4 border-b border-forest-100 dark:border-forest-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-forest-900 dark:text-forest-50 truncate">{farm.name}</h3>
            <p className="text-xs text-forest-400 mt-0.5">{farm.owner || 'No owner'}</p>
          </div>
          <button
            onClick={() => onSelectFarm('')}
            className="p-1 rounded text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 transition-colors flex-shrink-0"
            aria-label="Deselect farm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Area */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-forest-50 dark:bg-forest-800/60 p-3">
            <p className="text-xs text-forest-400">Area</p>
            <p className="text-lg font-semibold text-forest-900 dark:text-forest-50 mt-0.5">
              {formatArea(farm.area_hectares, unit)}
            </p>
          </div>
          <div className="rounded-lg bg-forest-50 dark:bg-forest-800/60 p-3">
            <p className="text-xs text-forest-400">Center</p>
            <p className="text-xs font-mono text-forest-700 dark:text-forest-200 mt-0.5">
              {farm.center_lat.toFixed(4)}°, {farm.center_lng.toFixed(4)}°
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5">
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={farm.location || 'Not specified'} />
          <DetailRow icon={<Sprout className="w-4 h-4" />} label="Crop" value={farm.crop_type || 'Uncropped'} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Planted" value={farm.planting_date || 'Not set'} />
          <DetailRow icon={<Droplets className="w-4 h-4" />} label="Irrigation" value={farm.irrigation_method || 'None'} />
          <DetailRow icon={<Layers className="w-4 h-4" />} label="Soil" value={farm.soil_type || 'Unknown'} />
        </div>

        {/* Notes */}
        {farm.notes && (
          <div>
            <p className="text-xs text-forest-400 font-medium uppercase tracking-wider mb-1.5">Notes</p>
            <p className="text-sm text-forest-600 dark:text-forest-300 bg-forest-50 dark:bg-forest-800/60 rounded-lg p-3 leading-relaxed">
              {farm.notes}
            </p>
          </div>
        )}

        {/* Irrigation points */}
        {irrigation.length > 0 && (
          <div>
            <p className="text-xs text-forest-400 font-medium uppercase tracking-wider mb-2">
              Irrigation Points ({irrigation.length})
            </p>
            <div className="space-y-1.5">
              {irrigation.map((pt) => (
                <div
                  key={pt.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-forest-50 dark:bg-forest-800/60"
                >
                  <div
                    className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: IRRIGATION_POINT_COLORS[pt.type] || '#67B7D9' }}
                  >
                    {pt.type[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{pt.type}</p>
                    {pt.notes && <p className="text-xs text-forest-400 truncate">{pt.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo */}
        {farm.photo_url && (
          <div>
            <p className="text-xs text-forest-400 font-medium uppercase tracking-wider mb-1.5">Photo</p>
            <img
              src={farm.photo_url}
              alt={farm.name}
              className="w-full rounded-lg border border-forest-100 dark:border-forest-800"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-forest-100 dark:border-forest-800 flex gap-2">
        <Button
          size="sm"
          variant="danger"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => onDelete(farm)}
          className="flex-1"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-400 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-forest-400">{label}: </span>
        <span className="text-sm font-medium text-forest-700 dark:text-forest-200">{value}</span>
      </div>
    </div>
  );
}
