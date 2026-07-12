import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSupabaseSync } from '../context/SupabaseSyncContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ShieldAlert, CheckCircle2, User, Mail, Shield, FileText } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const { syncProfile } = useSupabaseSync();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    clanName: '',
    bio: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Empty', color: 'bg-muted' });
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    const pass = formData.password;
    if (!pass) { setPasswordStrength({ score: 0, label: 'Empty', color: 'bg-muted' }); return; }
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1: case 2: setPasswordStrength({ score: 20, label: 'Weak', color: 'bg-destructive' }); break;
      case 3: setPasswordStrength({ score: 50, label: 'Fair', color: 'bg-amber-500' }); break;
      case 4: setPasswordStrength({ score: 80, label: 'Good', color: 'bg-blue-500' }); break;
      case 5: setPasswordStrength({ score: 100, label: 'Strong', color: 'bg-emerald-500' }); break;
      default: setPasswordStrength({ score: 0, label: 'Too Weak', color: 'bg-destructive' });
    }
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      if (!value && name !== 'bio') next[name] = 'Required';
      else if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) next[name] = 'Invalid email';
      else if (name === 'username' && value.length < 3) next[name] = 'Min 3 characters';
      else if (name === 'clanName' && value.length > 4) next[name] = 'Max 4 characters';
      else if (name === 'password' && value.length < 6) next[name] = 'Min 6 characters';
      else delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    const required: (keyof typeof formData)[] = ['name', 'username', 'email', 'clanName', 'password'];
    const missing = required.filter((k) => !formData[k]);
    if (missing.length > 0 || formData.password.length < 6 || formData.clanName.length > 4) {
      setErrors((prev) => {
        const next = { ...prev };
        missing.forEach((k) => { if (!next[k]) next[k] = 'Required'; });
        return next;
      });
      setGlobalError('Please fill in all required fields.');
      return;
    }

    const result = await signup({
      name: formData.name,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      clanName: formData.clanName,
      bio: formData.bio,
    });
    if (result.success) {
      // Sync profile to Supabase
      await syncProfile({
        id: crypto.randomUUID(),
        name: formData.name,
        username: formData.username,
        email: formData.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
        clanName: formData.clanName,
        bio: formData.bio,
      });
      navigate('/');
    } else {
      setGlobalError(result.error || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-8">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-5">

        {/* Signup Form */}
        <Card className="lg:col-span-3 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Create Account</CardTitle>
            <CardDescription>Join HobbyHub and connect with hobby enthusiasts</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {globalError && (
                <Alert variant="destructive" className="py-2">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription className="text-xs">{globalError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} />
                  {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="username" name="username" className="pl-8" placeholder="johndoe" value={formData.username} onChange={handleChange} />
                  </div>
                  {errors.username && <p className="text-[11px] text-destructive">{errors.username}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="email" name="email" type="email" className="pl-8" placeholder="john@example.com" value={formData.email} onChange={handleChange} />
                </div>
                {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="clanName">Clan Tag</Label>
                  <div className="relative">
                    <Shield className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="clanName" name="clanName" className="pl-8 uppercase" placeholder="HUB" maxLength={4} value={formData.clanName} onChange={handleChange} />
                  </div>
                  {errors.clanName && <p className="text-[11px] text-destructive">{errors.clanName}</p>}
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <div className="relative">
                    <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="bio" name="bio" className="pl-8" placeholder="Tell us about yourself..." value={formData.bio} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
                {formData.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Strength: {passwordStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center" style={{ color: '#666666' }}>
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="underline" style={{ color: '#d93a3a' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="underline" style={{ color: '#d93a3a' }}>Privacy Policy</Link>.
              </p>

              <Button type="submit" className="w-full mt-2">Create Account</Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-muted/20 py-3 text-xs text-muted-foreground">
            Already have an account?
            <Link to="/login" className="font-medium text-primary underline underline-offset-4 pl-1">
              Sign in
            </Link>
          </CardFooter>
        </Card>

        {/* Profile Preview */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-background to-muted/50 border flex flex-col justify-center items-center p-6 text-center shadow-sm">
          <div className="space-y-4 w-full max-w-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Preview</h3>
            <div className="border rounded-xl bg-card p-5 text-left relative shadow-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
              <div className="flex items-center gap-3 mt-1">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-primary uppercase border">
                  {formData.username ? formData.username.substring(0, 2) : 'HH'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight truncate max-w-[120px]">
                      {formData.name || 'Your Name'}
                    </span>
                    {formData.clanName && (
                      <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                        [{formData.clanName}]
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{formData.username || 'username'}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                <p className="italic line-clamp-2">{formData.bio || 'Add a bio to tell people about yourself.'}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Your profile card will look like this</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
