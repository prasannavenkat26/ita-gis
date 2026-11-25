import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Search, Sun, Moon, LogOut, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

interface TopNavProps {
  onMenuClick: () => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}

const routeLabels: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/gis': 'GIS Explorer',
  '/app/farms': 'Farm Management',
  '/app/crops': 'Crop Management',
  '/app/irrigation': 'Irrigation Points',
  '/app/analytics': 'Analytics & Reports',
  '/app/settings': 'Profile & Settings',
};

export function TopNav({ onMenuClick, searchValue, onSearchChange }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentLabel = routeLabels[location.pathname] || 'Dashboard';

  return (
    <header className="glass-strong sticky top-3 z-20 mx-3 mt-3 flex h-[68px] items-center gap-3 rounded-full px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-full p-2 text-forest-600 transition-colors hover:bg-forest-100 dark:text-forest-300 dark:hover:bg-forest-800 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      <nav className="flex items-center gap-1.5 text-sm flex-shrink-0">
        <Link to="/app/dashboard" className="text-forest-400 hover:text-forest-600 dark:hover:text-forest-200 transition-colors">
          App
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-forest-300" />
        <span className="font-medium text-forest-700 dark:text-forest-100">{currentLabel}</span>
      </nav>

      <div className="flex-1 max-w-md mx-auto relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400 pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search farms, locations, crops..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-[#f2f3ec] dark:bg-forest-800/60 border border-[#e1e5da] focus:border-[#aebda3] focus:ring-2 focus:ring-[#31583d]/10 transition-all text-forest-900 dark:text-forest-50 placeholder:text-forest-400"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-forest-600 dark:text-forest-300 hover:bg-forest-100 dark:hover:bg-forest-800 transition-colors"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-forest-100 dark:hover:bg-forest-800"
            aria-label="User menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-forest-500 to-forest-700 text-xs font-extrabold text-white">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-forest-700 dark:text-forest-200 hidden md:block max-w-[140px] truncate">
              {user?.email}
            </span>
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-forest-900 rounded-xl shadow-card-xl border border-forest-100 dark:border-forest-800 p-2 z-20 animate-scale-in">
                <div className="px-3 py-2 border-b border-forest-100 dark:border-forest-800 mb-1">
                  <p className="text-xs text-forest-400">Signed in as</p>
                  <p className="text-sm font-medium text-forest-700 dark:text-forest-200 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/app/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-forest-600 dark:text-forest-300 hover:bg-forest-50 dark:hover:bg-forest-800 transition-colors"
                >
                  Profile & Settings
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
