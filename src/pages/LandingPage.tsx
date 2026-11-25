import { Link } from 'react-router-dom';
import {
  Map as MapIcon,
  Tractor,
  Sprout,
  Droplets,
  BarChart3,
  FileUp,
  ArrowRight,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-forest-950 text-forest-900 dark:text-forest-50">
      {/* Nav */}
      <nav className="fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] max-w-[1320px] -translate-x-1/2">
        <div className="flex h-[68px] items-center justify-between rounded-full border border-white/80 bg-[#fffefa]/95 px-4 shadow-[0_12px_36px_rgba(27,45,29,0.12)] backdrop-blur-xl sm:px-7">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#557744] shadow-sm">
              <Sprout className="h-5 w-5 text-[#f3d16b]" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold leading-none text-forest-800">Farm GIS</h1>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-forest-400">Land, thoughtfully mapped</p>
            </div>
          </Link>
          <div className="hidden items-center gap-8 text-[11px] font-extrabold uppercase tracking-[0.12em] text-forest-700 lg:flex">
            <a href="#home" className="text-[#ad852c] transition-colors hover:text-forest-800">Home</a>
            <a href="#tools" className="transition-colors hover:text-[#ad852c]">What you can do</a>
            <a href="#process" className="transition-colors hover:text-[#ad852c]">How it works</a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2.5 text-forest-700 transition-colors hover:bg-forest-100"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <Link to="/auth" className="hidden rounded-full px-3 py-2 text-sm font-bold text-forest-700 transition-colors hover:text-[#ad852c] sm:flex">Sign in</Link>
            <Link to={user ? '/app/dashboard' : '/auth'} className="btn-accent hidden px-5 py-3 text-xs sm:inline-flex">
              {user ? 'Workspace' : 'Get started'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="landing-photo-hero relative isolate mx-3 mt-3 flex min-h-[680px] items-center justify-center overflow-hidden rounded-[30px] px-5 pb-20 pt-32 text-center sm:mx-5 sm:mt-4 sm:min-h-[85vh] sm:max-h-[850px] sm:rounded-[38px] sm:px-10">
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#fffefa]/95 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-forest-800 shadow-lg">
            <Sprout className="h-4 w-4 text-[#718d5d]" />
            Welcome to a better view of your farm
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.055em] text-white drop-shadow sm:text-7xl lg:text-[88px]">
            A clearer view of
            <span className="mt-2 block text-[#f2ca62]">every field.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-white/90 drop-shadow sm:text-lg sm:leading-8">
            Bring boundaries, crop notes and irrigation details together. Spend less time searching
            through records, and more time understanding your land.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to={user ? '/app/dashboard' : '/auth'} className="btn-accent px-7 py-4 text-sm">
              {user ? 'Open your workspace' : 'Explore the demo'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#tools" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/55 bg-white/10 px-6 py-4 text-sm font-extrabold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              Discover Farm GIS
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs font-bold text-white/90">
            {['Field boundaries', 'Crop & soil notes', 'Irrigation points'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-[#f2ca62]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="tools" className="scroll-mt-24 py-20 px-4 sm:px-6 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ad852c]">A little more clarity, every day</p>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight mb-3">Everything your fields need, in one place.</h2>
            <p className="text-forest-400">
              Start with a map. Add the farm details you want to keep track of as you go.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 feature-bento-grid">
            {[
              { icon: MapIcon, title: 'Draw field boundaries', desc: 'Mark a field on the map, adjust its outline, and see the estimated area in hectares or acres.' },
              { icon: Tractor, title: 'Keep farm details', desc: 'Save a farm’s name, location, owner and notes together instead of hunting through separate files.' },
              { icon: Sprout, title: 'Record crops and soil', desc: 'Add crop type, planting date, soil and irrigation method to each farm record.' },
              { icon: Droplets, title: 'Mark water points', desc: 'Place valves, pumps and other irrigation points on the map, with a note when you need one.' },
              { icon: BarChart3, title: 'See the bigger picture', desc: 'Review total area, crop mix and irrigation summaries from your own farm records.' },
              { icon: FileUp, title: 'Use GeoJSON files', desc: 'Import existing field boundaries or export them for use in another GIS tool.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="card-3d min-h-[220px] p-6 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-forest-100 to-forest-200 dark:from-forest-800 dark:to-forest-700 flex items-center justify-center mb-4 group-hover:from-forest-400 group-hover:to-forest-600 transition-all duration-300">
                    <Icon className="w-6 h-6 text-forest-500 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-forest-400 dark:text-forest-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="process" className="scroll-mt-24 border-y border-[#e5e6da] bg-[#f0f1e7] py-20 px-4 sm:px-6 lg:py-28 dark:border-forest-800 dark:bg-forest-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4">A straightforward place to start</h2>
            <p className="text-forest-400 max-w-2xl mx-auto">Add what you know now. You can fill in the rest later.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {[
              { step: '1', title: 'Add a farm', desc: 'Enter its name and location, or place it on the map.' },
              { step: '2', title: 'Mark the boundary', desc: 'Trace the field edge. The app estimates its area as you draw.' },
              { step: '3', title: 'Add the details', desc: 'Note the crop, planting date, soil or irrigation method.' },
              { step: '4', title: 'Check your overview', desc: 'See your farms and totals together on the dashboard.' },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700 dark:bg-forest-800 dark:text-forest-200">{s.step}</div>
                <h3 className="font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-sm text-forest-400 leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-6 -right-3 text-forest-200 dark:text-forest-700">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="scroll-mt-24 py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="relative card-3d p-8 sm:p-12 bg-forest-900 border-0">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-4">Start with one field</h2>
            <p className="text-forest-200 mb-8 max-w-xl mx-auto">
              Add a farm, save its location and draw a boundary when you’re ready.
            </p>
            <Link
              to={user ? '/app/dashboard' : '/auth'}
              className="btn-accent px-6 py-3"
            >
              {user ? 'Open your workspace' : 'Try the demo'}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e6da] py-8 px-4 sm:px-6 dark:border-forest-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-forest-400">
            <Sprout className="w-4 h-4" />
            Farm GIS · Field maps and records
          </div>
          <div className="flex items-center gap-4 text-xs text-forest-400">
            <span>{import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Maps by Google Maps' : 'Maps by OpenStreetMap & Leaflet'}</span>
            <span>·</span>
            <span>{import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Google Maps API' : 'OpenStreetMap'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

