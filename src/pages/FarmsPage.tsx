import { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Tractor,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowUpDown,
} from 'lucide-react';
import { useFarms } from '@/hooks/useFarms';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { FarmFormModal } from '@/components/farms/FarmFormModal';
import { CROP_COLORS, CROP_TYPES } from '@/types';
import type { Farm } from '@/types';
import { hectaresToAcres } from '@/lib/geo';

interface OutletContext {
  searchValue: string;
}

type SortField = 'name' | 'area_hectares' | 'created_at' | 'crop_type';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 8;

export function FarmsPage() {
  const { searchValue } = useOutletContext<OutletContext>();
  const { farms, loading, deleteFarm, createFarm, updateFarm } = useFarms();

  const [showForm, setShowForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const effectiveSearch = searchValue || localSearch;

  const filteredFarms = useMemo(() => {
    let result = [...farms];
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.owner.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q)
      );
    }
    if (cropFilter) {
      result = result.filter((f) => f.crop_type === cropFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'area_hectares') cmp = a.area_hectares - b.area_hectares;
      else if (sortField === 'crop_type') cmp = a.crop_type.localeCompare(b.crop_type);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [farms, effectiveSearch, cropFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredFarms.length / PAGE_SIZE);
  const paginatedFarms = filteredFarms.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteFarm(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 skeleton" />
        <Card><TableSkeleton rows={5} /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900 dark:text-forest-50">Farm Management</h1>
          <p className="text-sm text-forest-400 mt-1">{farms.length} farms registered</p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => { setEditingFarm(null); setShowForm(true); }}
        >
          Register New Farm
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
            <input
              type="text"
              placeholder="Search farms..."
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(0); }}
              className="input-field pl-10"
            />
          </div>
          <div className="w-44">
            <Select
              value={cropFilter}
              onChange={(e) => { setCropFilter(e.target.value); setPage(0); }}
              options={CROP_TYPES.map((c) => ({ value: c, label: c }))}
              placeholder="All crops"
            />
          </div>
        </div>
      </Card>

      {/* Table or empty state */}
      {paginatedFarms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tractor className="w-8 h-8" />}
            title={farms.length === 0 ? 'No farms registered' : 'No results found'}
            description={farms.length === 0 ? 'Register your first farm to get started.' : 'Try adjusting your search or filters.'}
            action={farms.length === 0 ? (
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
                Register New Farm
              </Button>
            ) : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-forest-100 dark:border-forest-800">
                  <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-forest-600">
                      Farm <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    <button onClick={() => handleSort('crop_type')} className="flex items-center gap-1 hover:text-forest-600">
                      Crop <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">
                    <button onClick={() => handleSort('area_hectares')} className="flex items-center gap-1 hover:text-forest-600 ml-auto">
                      Area <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Location
                  </th>
                  <th className="text-left text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-forest-600">
                      Created <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-right text-xs font-semibold text-forest-400 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFarms.map((farm) => (
                  <tr
                    key={farm.id}
                    className="border-b border-forest-50 dark:border-forest-800/40 hover:bg-forest-50/50 dark:hover:bg-forest-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: CROP_COLORS[farm.crop_type] || '#4387AE' }}
                        >
                          {farm.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-forest-900 dark:text-forest-50 truncate">{farm.name}</p>
                          <p className="text-xs text-forest-400 truncate">{farm.owner || 'No owner'}</p>
                        </div>
                        {farm.is_demo && <Badge variant="accent">Demo</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: CROP_COLORS[farm.crop_type] || '#4387AE' }}
                        />
                        <span className="text-sm text-forest-600 dark:text-forest-300">{farm.crop_type || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-forest-700 dark:text-forest-200">
                        {farm.area_hectares.toFixed(2)} ha
                      </span>
                      <p className="text-xs text-forest-400">{hectaresToAcres(farm.area_hectares).toFixed(1)} ac</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-forest-600 dark:text-forest-300 truncate">{farm.location || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-forest-400">
                        {new Date(farm.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to="/app/gis"
                          className="p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 hover:text-forest-600 transition-colors"
                          title="View on map"
                        >
                          <MapPin className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => { setEditingFarm(farm); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 hover:text-forest-600 transition-colors"
                          title="Edit farm"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(farm)}
                          className="p-1.5 rounded-lg text-forest-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                          title="Delete farm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-forest-100 dark:border-forest-800">
              <p className="text-xs text-forest-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredFarms.length)} of {filteredFarms.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-forest-600 dark:text-forest-300">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Form modal */}
      {showForm && (
        <FarmFormModal
          farm={editingFarm}
          onClose={() => { setShowForm(false); setEditingFarm(null); }}
          onSave={async (data) => {
            if (editingFarm) {
              await updateFarm(editingFarm.id, data);
            } else {
              await createFarm(data);
            }
            setShowForm(false);
            setEditingFarm(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Farm"
        message={`Delete "${deleteTarget?.name}"? This also removes all associated irrigation points. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
