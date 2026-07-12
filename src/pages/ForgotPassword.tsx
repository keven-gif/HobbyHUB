import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, newPassword);
      setSuccess(true);
      setEmail('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-3">
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
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-lg">
          <div className="p-6 space-y-1 text-center">
            <h2 className="text-xl font-bold tracking-tight">Reset Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and a new password below.
            </p>
          </div>

          <div className="p-6 pt-0">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-center text-muted-foreground">
                  Your password has been reset successfully!
                </p>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline underline-offset-4 mt-2"
                >
                  Sign In with New Password
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Account Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      className="pl-9 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
