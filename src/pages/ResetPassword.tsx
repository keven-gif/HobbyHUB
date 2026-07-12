import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Check if we have a recovery token in the URL
  useEffect(() => {
    // Supabase sends tokens via hash fragment in the URL
    const hash = window.location.hash;
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      setHasToken(true);
      // Supabase client automatically handles the session from the URL hash
      supabase?.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError('Invalid or expired reset link. Please request a new one.');
          setHasToken(false);
        }
      });
    } else if (hash.includes('error')) {
      // Parse error from hash
      const params = new URLSearchParams(hash.replace('#', ''));
      const errorDesc = params.get('error_description') || 'Invalid reset link';
      setError(errorDesc);
    } else {
      setError('No reset token found. Please use the link from your email.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase!.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Sign out after password reset so user logs in with new password
        await supabase!.auth.signOut();
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
        {/* Logo */}
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

        <div className="w-full rounded-lg border bg-card text-card-foreground shadow-lg">
          <div className="p-6 space-y-1 text-center">
            <h2 className="text-xl font-bold tracking-tight">Set New Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <div className="p-6 pt-0">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-center text-muted-foreground">
                  Your password has been updated successfully.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="mt-2"
                >
                  Sign In with New Password
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {hasToken && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9 pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isSubmitting}
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </>
                )}

                {!hasToken && (
                  <div className="text-center pt-2">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline underline-offset-4"
                    >
                      Request a new reset link
                    </Link>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
