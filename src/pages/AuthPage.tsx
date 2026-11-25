import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'signin' | 'signup' | 'reset';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInDemo, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error: err } = await signInDemo();
      if (err) {
        setError(err);
      } else {
        navigate('/app/dashboard');
      }
    } catch {
      setError('Unable to start the local demo session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error: err } = await resetPassword(email);
        if (err) {
          setError(err);
        } else {
          setSuccess('Password reset email sent. Check your inbox.');
        }
      } else if (mode === 'signin') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          navigate('/app/dashboard');
        }
      } else {
        const { error: err } = await signUp(email, password);
        if (err) {
          setError(err);
        } else {
          setSuccess('Account created. You can now sign in.');
          setMode('signin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="auth-photo-panel relative hidden w-1/2 overflow-hidden lg:flex">
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 shadow-lg backdrop-blur">
              <Sprout className="w-5 h-5 text-lime2-400" />
            </div>
            <div>
              <h1 className="font-display text-xl leading-none">Farm GIS</h1>
              <p className="text-[10px] text-forest-300 uppercase tracking-wider mt-0.5">Field maps & records</p>
            </div>
          </Link>

          <div>
            <h2 className="font-display text-4xl mb-4 leading-tight">
              Your fields,
              <span className="block text-lime2-400">in one place.</span>
            </h2>
            <p className="text-forest-200 max-w-md leading-relaxed">
              Keep field boundaries, crop details and irrigation points together, and find them
              again from your farm map.
            </p>

            <div className="mt-8 space-y-3">
              {['Area in hectares or acres', 'Crop and irrigation details', 'GeoJSON import and export'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-forest-200">
                  <div className="w-5 h-5 rounded-full bg-forest-500/30 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime2-400" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-forest-400">
            © {new Date().getFullYear()} Farm GIS
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-5 bg-cream-50 dark:bg-forest-950 sm:p-8">
        <div className="card-3d w-full max-w-sm p-6 sm:p-9">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-forest-500 to-forest-700 flex items-center justify-center shadow-md">
                <Sprout className="w-5 h-5 text-lime2-400" />
              </div>
              <div>
                <h1 className="font-display text-xl leading-none text-forest-900 dark:text-forest-50">Farm GIS</h1>
                <p className="text-[10px] text-forest-400 uppercase tracking-wider mt-0.5">Field maps & records</p>
              </div>
            </Link>
          </div>

          <h2 className="text-2xl font-semibold text-forest-900 dark:text-forest-50 mb-1.5">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>
          <p className="text-sm text-forest-400 mb-8">
            {mode === 'signin' && 'Sign in to access your farm dashboard.'}
            {mode === 'signup' && 'Start mapping your farmland today.'}
            {mode === 'reset' && 'Enter your email to receive a reset link.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-forest-700 dark:text-forest-200">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@farm.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-forest-700 dark:text-forest-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10"
                    minLength={8}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="px-3.5 py-2.5 rounded-lg bg-forest-50 dark:bg-forest-800/60 border border-forest-200 dark:border-forest-700 text-sm text-forest-600 dark:text-forest-200">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === 'signin' && (
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-2.5 text-sm font-medium rounded-lg border border-forest-300 dark:border-forest-700 text-forest-700 dark:text-forest-200 hover:bg-forest-50 dark:hover:bg-forest-900 transition-colors"
              >
                Continue with Demo Account
              </button>
            )}
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                  className="text-forest-400 hover:text-forest-600 dark:hover:text-forest-200 transition-colors"
                >
                  Forgot password?
                </button>
                <p className="text-forest-400">
                  No account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                    className="text-forest-600 dark:text-forest-200 font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-forest-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                  className="text-forest-600 dark:text-forest-200 font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className="text-forest-600 dark:text-forest-200 font-medium hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-forest-100 dark:border-forest-800">
            <Link to="/" className="text-xs text-forest-400 hover:text-forest-600 transition-colors flex items-center justify-center gap-1.5">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
