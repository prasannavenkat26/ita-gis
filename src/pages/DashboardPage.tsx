import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Tractor,
  Ruler,
  Sprout,
  Droplets,
  TrendingUp,
  ArrowRight,
  Map as MapIcon,
  Plus,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useFarms } from '@/hooks/useFarms';
import { useIrrigationPoints } from '@/hooks/useIrrigationPoints';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapView } from '@/components/map/MapView';
import { CROP_COLORS } from '@/types';
import { formatArea, hectaresToAcres } from '@/lib/geo';

interface OutletContext {
  searchValue: string;
}

export function DashboardPage() {
  const { searchValue } = useOutletContext<OutletContext>();
  const { farms, loading } = useFarms();
  const { points } = useIrrigationPoints();

  const filteredFarms = useMemo(() => {
    if (!searchValue) return farms;
    const q = searchValue.toLowerCase();
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.owner.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.crop_type.toLowerCase().includes(q)
    );
  }, [farms, searchValue]);

  const stats = useMemo(() => {
    const totalFarms = farms.length;
    const totalHectares = farms.reduce((sum, f) => sum + (f.area_hectares || 0), 0);
    const totalAcres = hectaresToAcres(totalHectares);
    const avgSize = totalFarms > 0 ? totalHectares / totalFarms : 0;
    const cropCategories = new Set(farms.map((f) => f.crop_type).filter(Boolean)).size;
    const irrigated = farms.filter((f) => f.irrigation_method && f.irrigation_method !== 'None' && f.irrigation_method !== 'Dryland').length;
    const irrigationCoverage = totalFarms > 0 ? (irrigated / totalFarms) * 100 : 0;

    return { totalFarms, totalHectares, totalAcres, avgSize, cropCategories, irrigationCoverage };
  }, [farms]);

  const cropData = useMemo(() => {
    const map = new Map<string, number>();
    farms.forEach((f) => {
      if (f.crop_type) {
        map.set(f.crop_type, (map.get(f.crop_type) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [farms]);

  const areaByCrop = useMemo(() => {
    const map = new Map<string, number>();
    farms.forEach((f) => {
      if (f.crop_type && f.area_hectares) {
        map.set(f.crop_type, (map.get(f.crop_type) || 0) + f.area_hectares);
      }
    });
    return Array.from(map.entries())
      .map(([name, hectares]) => ({ name, hectares: Number(hectares.toFixed(2)) }))
      .sort((a, b) => b.hectares - a.hectares)
      .slice(0, 6);
  }, [farms]);

  const recentFarms = useMemo(() => {
    return [...filteredFarms]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [filteredFarms]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="dashboard-photo-hero flex min-h-[170px] flex-wrap items-end justify-between gap-5 rounded-[26px] p-6 sm:p-8">
        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#f2ca62]">Your season at a glance</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm font-semibold text-white/85">A clearer view of your farms, crops and irrigation.</p>
        </div>
        <Link to="/app/farms" className="btn-accent">
          <Plus className="w-4 h-4" />
          Add New Farm
        </Link>
      </div>

      {farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tractor className="w-8 h-8" />}
            title="No farms yet"
            description="Register your first farm to start mapping boundaries, tracking crops, and managing irrigation."
            action={
              <Link to="/app/farms" className="btn-primary">
                <Plus className="w-4 h-4" />
                Register Your First Farm
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Tractor className="w-5 h-5" />}
              label="Total Farms"
              value={stats.totalFarms.toString()}
              sub="Registered fields"
            />
            <StatCard
              icon={<Ruler className="w-5 h-5" />}
              label="Total Mapped Area"
              value={formatArea(stats.totalHectares, 'hectares')}
              sub={`${stats.totalAcres.toFixed(1)} acres`}
            />
            <StatCard
              icon={<Sprout className="w-5 h-5" />}
              label="Crop Categories"
              value={stats.cropCategories.toString()}
              sub={`Avg size: ${stats.avgSize.toFixed(1)} ha`}
            />
            <StatCard
              icon={<Droplets className="w-5 h-5" />}
              label="Irrigation Coverage"
              value={`${stats.irrigationCoverage.toFixed(0)}%`}
              sub={`${points.length} irrigation points`}
            />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader
                title="Crop Distribution"
                subtitle="Farms by crop type"
                icon={<Sprout className="w-5 h-5" />}
              />
              <CardBody>
                {cropData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={cropData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={2}
                      >
                        {cropData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CROP_COLORS[entry.name] || '#4387AE'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '10px',
                          border: '1px solid rgba(23,38,56,0.08)',
                          boxShadow: '0 4px 16px rgba(23,38,56,0.08)',
                          fontSize: '13px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-forest-400">
                    No crop data available
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Area by Crop"
                subtitle="Hectares per crop type"
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <CardBody>
                {areaByCrop.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={areaByCrop} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,38,56,0.08)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-forest-400"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-forest-400"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '10px',
                          border: '1px solid rgba(23,38,56,0.08)',
                          boxShadow: '0 4px 16px rgba(23,38,56,0.08)',
                          fontSize: '13px',
                        }}
                        formatter={(v) => [`${v} ha`, 'Area']}
                      />
                      <Bar dataKey="hectares" radius={[6, 6, 0, 0]}>
                        {areaByCrop.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CROP_COLORS[entry.name] || '#4387AE'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-forest-400">
                    No area data available
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Map preview + Recent activity */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Map Preview"
                subtitle="All your farms at a glance"
                icon={<MapIcon className="w-5 h-5" />}
                action={
                  <Link to="/app/gis" className="btn-ghost text-sm">
                    Open Explorer
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              />
              <CardBody className="p-0">
                <MapView
                  farms={farms}
                  irrigationPoints={points}
                  height="360px"
                  showLegend
                  className="rounded-none border-0"
                  zoom={3}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Recent Activity"
                subtitle="Latest registered farms"
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <CardBody className="space-y-3">
                {recentFarms.length === 0 ? (
                  <p className="text-sm text-forest-400">No recent activity</p>
                ) : (
                  recentFarms.map((farm) => (
                    <Link
                      key={farm.id}
                      to="/app/gis"
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-forest-50 dark:hover:bg-forest-800/60 transition-colors group"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: CROP_COLORS[farm.crop_type] || '#4387AE' }}
                      >
                        {farm.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-forest-900 dark:text-forest-50 truncate">
                          {farm.name}
                        </p>
                        <p className="text-xs text-forest-400 truncate">
                          {farm.crop_type || 'Uncropped'} · {farm.area_hectares.toFixed(1)} ha
                        </p>
                      </div>
                      {farm.is_demo && <Badge variant="accent">Demo</Badge>}
                      <ArrowRight className="w-4 h-4 text-forest-300 group-hover:text-forest-500 transition-colors flex-shrink-0" />
                    </Link>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="card-3d p-5 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-forest-400 font-medium">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500 group-hover:bg-forest-500 group-hover:text-white transition-all">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-semibold text-forest-900 dark:text-forest-50 mb-1">{value}</div>
      <div className="text-xs text-forest-400">{sub}</div>
    </div>
  );
}
