import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Ruler,
  Tractor,
  Sprout,
  Droplets,
  MapPin,
  Download,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFarms } from '@/hooks/useFarms';
import { useIrrigationPoints } from '@/hooks/useIrrigationPoints';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { CROP_COLORS } from '@/types';
import { hectaresToAcres, formatArea } from '@/lib/geo';
import { useToast } from '@/contexts/ToastContext';

export function AnalyticsPage() {
  const { farms, loading } = useFarms();
  const { points } = useIrrigationPoints();
  const { toast } = useToast();
  const [cropFilter, setCropFilter] = useState('');
  const [unit, setUnit] = useState<'hectares' | 'acres'>('hectares');

  const filteredFarms = useMemo(() => {
    if (!cropFilter) return farms;
    return farms.filter((f) => f.crop_type === cropFilter);
  }, [farms, cropFilter]);

  const stats = useMemo(() => {
    const totalFarms = filteredFarms.length;
    const totalArea = filteredFarms.reduce((sum, f) => sum + f.area_hectares, 0);
    const avgSize = totalFarms > 0 ? totalArea / totalFarms : 0;
    const largest = filteredFarms.length > 0 ? filteredFarms.reduce((max, f) => (f.area_hectares > max.area_hectares ? f : max)) : null;
    const smallest = filteredFarms.length > 0 ? filteredFarms.reduce((min, f) => (f.area_hectares < min.area_hectares ? f : min)) : null;
    return { totalFarms, totalArea, avgSize, largest, smallest };
  }, [filteredFarms]);

  const cropDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredFarms.forEach((f) => {
      if (f.crop_type) map.set(f.crop_type, (map.get(f.crop_type) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredFarms]);

  const irrigationDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredFarms.forEach((f) => {
      if (f.irrigation_method && f.irrigation_method !== 'None') {
        map.set(f.irrigation_method, (map.get(f.irrigation_method) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredFarms]);

  const areaComparison = useMemo(() => {
    return [...filteredFarms]
      .sort((a, b) => b.area_hectares - a.area_hectares)
      .slice(0, 10)
      .map((f) => ({
        name: f.name.length > 15 ? f.name.slice(0, 15) + '…' : f.name,
        [unit === 'hectares' ? 'hectares' : 'acres']: unit === 'hectares'
          ? Number(f.area_hectares.toFixed(2))
          : Number(hectaresToAcres(f.area_hectares).toFixed(2)),
      }));
  }, [filteredFarms, unit]);

  const locationSummary = useMemo(() => {
    const map = new Map<string, { count: number; area: number }>();
    filteredFarms.forEach((f) => {
      if (f.location) {
        const existing = map.get(f.location) || { count: 0, area: 0 };
        existing.count += 1;
        existing.area += f.area_hectares;
        map.set(f.location, existing);
      }
    });
    return Array.from(map.entries())
      .map(([location, data]) => ({ location, count: data.count, area: Number(data.area.toFixed(2)) }))
      .sort((a, b) => b.area - a.area);
  }, [filteredFarms]);

  const handleExportCSV = () => {
    const headers = ['Farm Name', 'Owner', 'Location', 'Crop Type', 'Area (ha)', 'Area (ac)', 'Soil Type', 'Irrigation Method', 'Planting Date'];
    const rows = filteredFarms.map((f) => [
      f.name, f.owner, f.location, f.crop_type,
      f.area_hectares.toFixed(2), hectaresToAcres(f.area_hectares).toFixed(2),
      f.soil_type, f.irrigation_method, f.planting_date || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'farm_analytics_report.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Report exported as CSV', 'success');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900 dark:text-forest-50">Analytics & Reports</h1>
          <p className="text-sm text-forest-400 mt-1">Spatial analytics from your farm data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              options={['Corn','Wheat','Soybeans','Rice','Cotton','Alfalfa','Tomatoes','Potatoes','Grapes','Almonds','Sunflower','Barley','Other'].map((c) => ({ value: c, label: c }))}
              placeholder="All crops"
            />
          </div>
          <button onClick={handleExportCSV} className="btn-secondary text-sm" disabled={filteredFarms.length === 0}>
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="w-8 h-8" />}
            title="No data to analyze"
            description="Register farms to generate analytics and reports."
          />
        </Card>
      ) : (
        <>
          {/* Key stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Total Farms</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Tractor className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{stats.totalFarms}</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Total Area</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Ruler className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{formatArea(stats.totalArea, unit)}</div>
              <div className="text-xs text-forest-400 mt-1">{unit === 'hectares' ? hectaresToAcres(stats.totalArea).toFixed(1) + ' acres' : stats.totalArea.toFixed(1) + ' ha'}</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Average Size</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{stats.avgSize.toFixed(1)} ha</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Irrigation Points</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{points.length}</div>
            </div>
          </div>

          {/* Area comparison + largest/smallest */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Farm Area Comparison"
                subtitle={`Top farms by ${unit}`}
                icon={<BarChart3 className="w-5 h-5" />}
                action={
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-forest-50 dark:bg-forest-800/60">
                    <button className={`px-2 py-0.5 rounded text-xs font-medium ${unit === 'hectares' ? 'bg-forest-500 text-white' : 'text-forest-500'}`} onClick={() => setUnit('hectares')}>ha</button>
                    <button className={`px-2 py-0.5 rounded text-xs font-medium ${unit === 'acres' ? 'bg-forest-500 text-white' : 'text-forest-500'}`} onClick={() => setUnit('acres')}>ac</button>
                  </div>
                }
              />
              <CardBody>
                {areaComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={areaComparison} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,38,56,0.08)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="text-forest-400" axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="text-forest-400" axisLine={false} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid rgba(23,38,56,0.08)', fontSize: '13px' }} />
                      <Bar dataKey={unit === 'hectares' ? 'hectares' : 'acres'} radius={[0, 6, 6, 0]}>
                        {areaComparison.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#F3CD79' : '#4387AE'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-forest-400">No data</div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Extremes" subtitle="Largest & smallest" icon={<TrendingUp className="w-5 h-5" />} />
              <CardBody className="space-y-4">
                {stats.largest && (
                  <div className="rounded-lg bg-forest-50 dark:bg-forest-800/60 p-4">
                    <Badge variant="success">Largest</Badge>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50 mt-2">{stats.largest.name}</p>
                    <p className="text-xs text-forest-400 mt-0.5">{formatArea(stats.largest.area_hectares, unit)}</p>
                  </div>
                )}
                {stats.smallest && (
                  <div className="rounded-lg bg-forest-50 dark:bg-forest-800/60 p-4">
                    <Badge variant="info">Smallest</Badge>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50 mt-2">{stats.smallest.name}</p>
                    <p className="text-xs text-forest-400 mt-0.5">{formatArea(stats.smallest.area_hectares, unit)}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Distribution charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Crop Distribution" subtitle="Farms per crop" icon={<Sprout className="w-5 h-5" />} />
              <CardBody>
                {cropDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={cropDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                        {cropDistribution.map((e) => <Cell key={e.name} fill={CROP_COLORS[e.name] || '#4387AE'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '13px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[260px] flex items-center justify-center text-sm text-forest-400">No data</div>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Irrigation Distribution" subtitle="Farms per irrigation method" icon={<Droplets className="w-5 h-5" />} />
              <CardBody>
                {irrigationDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={irrigationDistribution} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,38,56,0.08)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-forest-400" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} className="text-forest-400" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '13px' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#4387AE" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[260px] flex items-center justify-center text-sm text-forest-400">No irrigation data</div>}
              </CardBody>
            </Card>
          </div>

          {/* Location summary */}
          <Card>
            <CardHeader title="Location Summary" subtitle="Farms grouped by location" icon={<MapPin className="w-5 h-5" />} />
            <CardBody>
              {locationSummary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-forest-100 dark:border-forest-800">
                        <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Location</th>
                        <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Farms</th>
                        <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Total Area</th>
                        <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Avg Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationSummary.map((loc) => (
                        <tr key={loc.location} className="border-b border-forest-50 dark:border-forest-800/40">
                          <td className="px-4 py-3 text-sm font-medium text-forest-900 dark:text-forest-50">{loc.location}</td>
                          <td className="px-4 py-3 text-right text-sm text-forest-600 dark:text-forest-300">{loc.count}</td>
                          <td className="px-4 py-3 text-right text-sm text-forest-600 dark:text-forest-300">{formatArea(loc.area, unit)}</td>
                          <td className="px-4 py-3 text-right text-sm text-forest-600 dark:text-forest-300">{(loc.area / loc.count).toFixed(1)} ha</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-forest-400 py-8 text-center">No location data available. Add locations to your farms.</p>
              )}
            </CardBody>
          </Card>

          {/* Optional modules */}
          <Card>
            <CardHeader title="Optional Modules" subtitle="External integrations — not yet configured" icon={<BarChart3 className="w-5 h-5" />} />
            <CardBody>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Weather API', desc: 'Real-time weather data for farm locations', icon: '🌤️' },
                  { name: 'Satellite Monitoring', desc: 'NDVI and crop health from satellite imagery', icon: '🛰️' },
                  { name: 'Soil Sensors', desc: 'IoT soil moisture and nutrient sensors', icon: '🌱' },
                  { name: 'IoT Integration', desc: 'Connected devices for automated irrigation', icon: '📡' },
                ].map((mod) => (
                  <div key={mod.name} className="rounded-lg border border-dashed border-forest-200 dark:border-forest-700 p-4">
                    <div className="text-2xl mb-2">{mod.icon}</div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{mod.name}</p>
                    <p className="text-xs text-forest-400 mt-1 leading-relaxed">{mod.desc}</p>
                    <Badge variant="warning" className="mt-2">Not Connected</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-forest-400 mt-4">
                These modules require external API keys. Add them in Settings to enable real-time data.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
