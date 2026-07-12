import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';

const REMEMBER_ME_KEY = 'hobbyhub_remember_me';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  /* Pre-fill identifier if Remember Me was checked */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleDemoLogin = () => {
    setIdentifier('hobbyking');
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(identifier, password, rememberMe);
      if (result.success) {
        /* Save or clear Remember Me */
        try {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, identifier.trim().toLowerCase());
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
          }
        } catch { /* ignore */ }
        navigate('/');
      } else {
        setError(result.error || 'Invalid username, email, or password.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* H Logo + HobbyHub */}
        <Link to="/" className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-lg font-display text-xl"
            style={{ backgroundColor: '#d93a3a', color: '#fff' }}
          >
            H
          </div>
          <span
            className="font-display text-2xl tracking-[2px]"
            style={{ color: 'var(--text-primary)' }}
          >
            HOBBYHUB
          </span>
        </Link>

        <Card className="w-full shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier">Username or Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="hobbyking or email@example.com"
                    className="pl-9"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2 select-none"
                  disabled={isSubmitting}
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: rememberMe ? '#d93a3a' : 'var(--border-subtle)',
                      backgroundColor: rememberMe ? '#d93a3a' : 'transparent',
                    }}
                  >
                    {rememberMe && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Remember me
                  </span>
                </button>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or Sandbox Testing</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full border-dashed" onClick={handleDemoLogin} disabled={isSubmitting}>
              Fill Demo Credentials
            </Button>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-center gap-1 border-t bg-muted/20 py-4 text-sm text-muted-foreground">
            Do not have an account?
            <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up here
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
