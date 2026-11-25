import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Sprout,
  Calendar,
  Ruler,
  TrendingUp,
  Filter,
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
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { CROP_COLORS, CROP_TYPES } from '@/types';
import { hectaresToAcres } from '@/lib/geo';

interface OutletContext {
  searchValue: string;
}

export function CropManagementPage() {
  const { searchValue } = useOutletContext<OutletContext>();
  const { farms, loading } = useFarms();
  const [cropFilter, setCropFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'area' | 'date'>('area');

  const filteredFarms = useMemo(() => {
    let result = farms.filter((f) => f.crop_type);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(q) || f.crop_type.toLowerCase().includes(q)
      );
    }
    if (cropFilter) {
      result = result.filter((f) => f.crop_type === cropFilter);
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.planting_date || 0).getTime() - new Date(a.planting_date || 0).getTime();
      return b.area_hectares - a.area_hectares;
    });
    return result;
  }, [farms, searchValue, cropFilter, sortBy]);

  const cropStats = useMemo(() => {
    const map = new Map<string, { count: number; hectares: number; farms: typeof farms }>();
    farms.forEach((f) => {
      if (!f.crop_type) return;
      const existing = map.get(f.crop_type) || { count: 0, hectares: 0, farms: [] };
      existing.count += 1;
      existing.hectares += f.area_hectares;
      existing.farms.push(f);
      map.set(f.crop_type, existing);
    });
    return Array.from(map.entries()).map(([crop, data]) => ({
      crop,
      count: data.count,
      hectares: Number(data.hectares.toFixed(2)),
      acres: Number(hectaresToAcres(data.hectares).toFixed(2)),
    })).sort((a, b) => b.hectares - a.hectares);
  }, [farms]);

  const pieData = cropStats.map((c) => ({ name: c.crop, value: c.count }));
  const areaData = cropStats.map((c) => ({ name: c.crop, hectares: c.hectares }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card><CardBody><TableSkeleton rows={4} /></CardBody></Card>
      </div>
    );
  }

  const totalCropArea = cropStats.reduce((sum, c) => sum + c.hectares, 0);
  const totalCropFarms = cropStats.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900 dark:text-forest-50">Crop Management</h1>
        <p className="text-sm text-forest-400 mt-1">Track and analyze crops across all your farms</p>
      </div>

      {farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sprout className="w-8 h-8" />}
            title="No farms registered"
            description="Register farms with crop information to see them here."
          />
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Crop Types</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Sprout className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{cropStats.length}</div>
              <div className="text-xs text-forest-400 mt-1">Distinct crops grown</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Cropped Area</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Ruler className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{totalCropArea.toFixed(1)} ha</div>
              <div className="text-xs text-forest-400 mt-1">{hectaresToAcres(totalCropArea).toFixed(1)} acres</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Cropped Farms</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">{totalCropFarms}</div>
              <div className="text-xs text-forest-400 mt-1">Farms with assigned crops</div>
            </div>
            <div className="card-3d p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-forest-400 font-medium">Avg Plot Size</span>
                <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500">
                  <Ruler className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50">
                {totalCropFarms > 0 ? (totalCropArea / totalCropFarms).toFixed(1) : '0'} ha
              </div>
              <div className="text-xs text-forest-400 mt-1">Average per crop farm</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Crop Distribution" subtitle="Farms per crop type" icon={<Sprout className="w-5 h-5" />} />
              <CardBody>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={2}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CROP_COLORS[entry.name] || '#4387AE'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid rgba(23,38,56,0.08)', fontSize: '13px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-forest-400">No crop data</div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Area by Crop" subtitle="Hectares allocated per crop" icon={<TrendingUp className="w-5 h-5" />} />
              <CardBody>
                {areaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={areaData} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,38,56,0.08)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-forest-400" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} className="text-forest-400" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid rgba(23,38,56,0.08)', fontSize: '13px' }} formatter={(v) => [`${v} ha`, 'Area']} />
                      <Bar dataKey="hectares" radius={[6, 6, 0, 0]}>
                        {areaData.map((entry) => (
                          <Cell key={entry.name} fill={CROP_COLORS[entry.name] || '#4387AE'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-forest-400">No area data</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-forest-400" />
              <div className="w-44">
                <Select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} options={CROP_TYPES.map((c) => ({ value: c, label: c }))} placeholder="All crops" />
              </div>
              <div className="w-40">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'area' | 'date')}
                  options={[
                    { value: 'area', label: 'Sort: Area (desc)' },
                    { value: 'name', label: 'Sort: Name (A-Z)' },
                    { value: 'date', label: 'Sort: Planting date' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Farm crop table */}
          {filteredFarms.length === 0 ? (
            <Card>
              <EmptyState icon={<Sprout className="w-8 h-8" />} title="No crops found" description="Try adjusting filters or assign crop types to your farms." />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-forest-100 dark:border-forest-800">
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Farm</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Crop</th>
                      <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">Area</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Planted</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Soil</th>
                      <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Irrigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFarms.map((farm) => (
                      <tr key={farm.id} className="border-b border-forest-50 dark:border-forest-800/40 hover:bg-forest-50/50 dark:hover:bg-forest-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{farm.name}</p>
                          <p className="text-xs text-forest-400">{farm.owner}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[farm.crop_type] || '#4387AE' }} />
                            <span className="text-sm text-forest-600 dark:text-forest-300">{farm.crop_type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-forest-700 dark:text-forest-200">{farm.area_hectares.toFixed(2)} ha</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-forest-600 dark:text-forest-300">
                            <Calendar className="w-3.5 h-3.5 text-forest-400" />
                            {farm.planting_date ? new Date(farm.planting_date).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-forest-600 dark:text-forest-300">{farm.soil_type || '—'}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {farm.irrigation_method && farm.irrigation_method !== 'None' ? (
                            <Badge variant="success">{farm.irrigation_method}</Badge>
                          ) : (
                            <span className="text-sm text-forest-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
