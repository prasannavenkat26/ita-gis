import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Tractor,
  Sprout,
  Droplets,
  BarChart3,
  Settings,
  X,
  Sprout as Logo,
} from 'lucide-react';

const googleMapsConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/gis', label: 'GIS Explorer', icon: Map },
  { to: '/app/farms', label: 'Farms', icon: Tractor },
  { to: '/app/crops', label: 'Crop Management', icon: Sprout },
  { to: '/app/irrigation', label: 'Irrigation', icon: Droplets },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Profile & Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-forest-950/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 flex-shrink-0 rounded-none border-r border-[#e3e5d7] bg-[#fffefa] shadow-xl dark:border-forest-800 dark:bg-forest-900
          transition-transform duration-300 lg:sticky lg:left-auto lg:top-4 lg:my-4 lg:ml-4 lg:h-[calc(100vh-2rem)] lg:rounded-[26px] lg:border lg:shadow-[0_12px_36px_rgba(27,45,29,0.08)] lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-[#e9eadf] p-5 dark:border-forest-800">
          <NavLink to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#557744] shadow-sm">
              <Logo className="h-5 w-5 text-lime2-400" />
            </div>
            <div>
              <h1 className="font-display text-lg text-forest-900 dark:text-forest-50 leading-none">Farm GIS</h1>
              <p className="text-[10px] text-forest-400 uppercase tracking-wider mt-0.5">Field maps & records</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-forest-400 hover:bg-forest-100 dark:hover:bg-forest-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="h-[calc(100vh-76px)] space-y-1 overflow-y-auto p-3 lg:h-[calc(100%-76px)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all
                  ${isActive
                    ? 'bg-[#557744] text-white shadow-[0_8px_20px_rgba(64,93,60,0.2)]'
                    : 'text-forest-600 dark:text-forest-300 hover:bg-forest-50 dark:hover:bg-forest-800/60'
                  }`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}

          <div className="mt-4 border-t border-[#e9eadf] pt-4 dark:border-forest-800">
            <div className="rounded-2xl bg-[#f4f5ed] px-3.5 py-3 dark:bg-forest-800/40">
              <p className="text-[10px] text-forest-400 uppercase tracking-wider font-semibold mb-1">Map Provider</p>
              <p className="text-xs text-forest-600 dark:text-forest-300">
                {googleMapsConfigured ? 'Google Maps' : 'OpenStreetMap / Leaflet'}
              </p>
              <p className="text-[10px] text-forest-400 mt-0.5">
                {googleMapsConfigured ? 'Live API mode enabled' : 'Google Maps optional'}
              </p>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
