import { useState } from 'react';
import {
  User,
  Settings as SettingsIcon,
  HelpCircle,
  Sun,
  Moon,
  Mail,
  LogOut,
  Cloud,
  Satellite,
  Cpu,
  Radio,
  Key,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

type Tab = 'profile' | 'settings' | 'help';

const googleMapsConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
    { key: 'help', label: 'Help & API Guide', icon: HelpCircle },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900 dark:text-forest-50">Profile & Settings</h1>
        <p className="text-sm text-forest-400 mt-1">Manage your account and application preferences</p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-forest-100 dark:border-forest-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.key
                  ? 'border-forest-500 text-forest-600 dark:text-forest-300'
                  : 'border-transparent text-forest-400 hover:text-forest-600 dark:hover:text-forest-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardBody className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <h3 className="font-semibold text-forest-900 dark:text-forest-50">{displayName}</h3>
              <p className="text-sm text-forest-400 mt-1">{user?.email}</p>
              <Badge variant="success" className="mt-3">Active Account</Badge>
              <div className="mt-6 pt-6 border-t border-forest-100 dark:border-forest-800">
                <Button variant="danger" icon={<LogOut className="w-4 h-4" />} onClick={signOut} className="w-full">
                  Sign Out
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Profile Information" subtitle="Update your display name" icon={<User className="w-5 h-5" />} />
            <CardBody className="space-y-4">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                hint="Email cannot be changed"
                icon={<Mail className="w-4 h-4" />}
              />
              <div className="pt-2">
                <Button onClick={() => toast('Profile updated', 'success')}>Save Changes</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Appearance" subtitle="Theme and display preferences" icon={<SettingsIcon className="w-5 h-5" />} />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-forest-50 dark:bg-forest-800/60">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-forest-400" /> : <Sun className="w-5 h-5 text-forest-400" />}
                  <div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">Theme</p>
                    <p className="text-xs text-forest-400">Currently {theme === 'dark' ? 'Dark' : 'Light'} mode</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Map Configuration" subtitle="Map provider and API keys" icon={<Key className="w-5 h-5" />} />
            <CardBody className="space-y-4">
              <div className="p-3 rounded-lg bg-forest-50 dark:bg-forest-800/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">Current Provider</p>
                    <p className="text-xs text-forest-400">
                      {googleMapsConfigured ? 'Google Maps JavaScript API' : 'OpenStreetMap / Leaflet (free)'}
                    </p>
                  </div>
                  <Badge variant={googleMapsConfigured ? 'success' : 'warning'}>
                    {googleMapsConfigured ? 'Active' : 'Fallback'}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-dashed border-forest-200 dark:border-forest-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">Google Maps API</p>
                    <p className="text-xs text-forest-400 mt-0.5">Premium satellite & drawing tools</p>
                  </div>
                  <Badge variant={googleMapsConfigured ? 'success' : 'warning'}>
                    {googleMapsConfigured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>
                <p className="text-xs text-forest-400 mt-2">
                  {googleMapsConfigured
                    ? 'Google Maps is enabled through VITE_GOOGLE_MAPS_API_KEY.'
                    : 'To enable Google Maps, add VITE_GOOGLE_MAPS_API_KEY to your .env file.'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Data & Privacy" subtitle="Storage and account access" icon={<SettingsIcon className="w-5 h-5" />} />
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-forest-100 dark:bg-forest-800 flex items-center justify-center text-forest-500 flex-shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">Account-scoped access</p>
                    <p className="text-xs text-forest-400 mt-0.5">Signed-in accounts can access only their own farm records.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-forest-100 dark:bg-forest-800 flex items-center justify-center text-forest-500 flex-shrink-0">
                    <SettingsIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900 dark:text-forest-50">SQLite data storage</p>
                    <p className="text-xs text-forest-400 mt-0.5">Farm records are stored in SQLite, with boundaries represented as GeoJSON.</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'help' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Getting Started" subtitle="Quick guide to using Farm GIS" icon={<BookOpen className="w-5 h-5" />} />
            <CardBody>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Register a farm', desc: 'Go to Farms → Register New Farm. Fill in the details and draw the boundary on the map.' },
                  { step: 2, title: 'Draw boundaries', desc: 'In the farm form, click on the map to add polygon vertices. Area is calculated automatically using geodesic math.' },
                  { step: 3, title: 'Add irrigation points', desc: 'Go to Irrigation → Add Point. Select a farm, choose the type, and set coordinates.' },
                  { step: 4, title: 'Explore the GIS map', desc: 'Open GIS Explorer to view all farms, switch map layers, search, and manage boundaries.' },
                  { step: 5, title: 'View analytics', desc: 'Check Analytics for crop distribution, area comparisons, and location summaries.' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-forest-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{s.title}</p>
                      <p className="text-sm text-forest-400 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="API Integration Guide" subtitle="How to connect external services" icon={<ExternalLink className="w-5 h-5" />} />
            <CardBody>
              <div className="space-y-4">
                {[
                  { icon: Cloud, name: 'Weather API', env: 'VITE_WEATHER_API_KEY', desc: 'Add a weather API key (e.g. OpenWeatherMap) to enable real-time weather data on farm locations.' },
                  { icon: Satellite, name: 'Satellite Monitoring', env: 'VITE_SATELLITE_API_KEY', desc: 'Connect to satellite imagery APIs (e.g. Sentinel Hub) for NDVI and crop health monitoring.' },
                  { icon: Cpu, name: 'Soil Sensors', env: 'VITE_SOIL_SENSOR_API_KEY', desc: 'Integrate IoT soil sensor platforms for moisture and nutrient data.' },
                  { icon: Radio, name: 'IoT Irrigation', env: 'VITE_IOT_API_KEY', desc: 'Connect smart irrigation controllers for automated watering schedules.' },
                ].map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div key={mod.name} className="flex items-start gap-3 p-3 rounded-lg border border-forest-100 dark:border-forest-800">
                      <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-forest-800/60 flex items-center justify-center text-forest-500 flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-forest-900 dark:text-forest-50">{mod.name}</p>
                          <Badge variant="warning">Optional</Badge>
                        </div>
                        <p className="text-xs text-forest-400 mt-1">{mod.desc}</p>
                        <p className="text-xs font-mono text-forest-500 mt-1.5">{mod.env}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Environment Variables" subtitle="Configuration reference" icon={<Key className="w-5 h-5" />} />
            <CardBody>
              <div className="rounded-lg bg-forest-950 text-forest-100 p-4 font-mono text-xs overflow-x-auto">
                <p className="text-forest-400"># Backend (FastAPI + SQLite)</p>
                <p>API: http://127.0.0.1:8000/api</p>
                <p>Database: backend/data/farm_gis.sqlite3</p>
                <p className="text-forest-400 mt-2"># Optional — Map provider</p>
                <p>VITE_GOOGLE_MAPS_API_KEY=your_key</p>
                <p className="text-forest-400 mt-2"># Optional — External modules</p>
                <p>VITE_WEATHER_API_KEY=your_key</p>
                <p>VITE_SATELLITE_API_KEY=your_key</p>
              </div>
              <p className="text-xs text-forest-400 mt-3">
                API authentication and farm records are handled by the local Python backend. Configure FARM_GIS_SECRET_KEY as a server-only environment variable when deploying.
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
