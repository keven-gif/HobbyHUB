import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertProfile } from '@/lib/supabaseQueries';
import { recordActivity } from '@/lib/activityTracker';

/* ─── Types ─── */
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverImage?: string;
  clanName?: string;
  bio?: string;
  isAdmin?: boolean;
  usernameLastChanged?: string; // ISO timestamp of last username change
  pinnedPostId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: Omit<User, 'id' | 'avatar' | 'usernameLastChanged'> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  canChangeUsername: () => boolean;
  getUsernameCooldownDays: () => number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

const ADMIN_EMAIL = 'roninonedigital@gmail.com';

/* ─── Transform Supabase user to our User type ─── */
function toUser(profile: any): User {
  return {
    id: profile.id,
    name: profile.name || profile.username || 'User',
    username: profile.username || 'user',
    email: profile.email || '',
    avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
    coverImage: profile.cover_image || undefined,
    clanName: profile.clan_name || undefined,
    bio: profile.bio || undefined,
    isAdmin: profile.is_admin || profile.email === ADMIN_EMAIL,
    usernameLastChanged: profile.username_last_changed || undefined,
    pinnedPostId: profile.pinned_post_id || undefined,
  };
}

/* ─── Provider ─── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Record activity + start heartbeat when user is loaded ── */
  const startActivityTracking = useCallback((u: User) => {
    // Record immediately
    recordActivity(u.id, u.name, u.avatar).catch(() => {});
    // Heartbeat every 30 seconds while logged in
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      recordActivity(u.id, u.name, u.avatar).catch(() => {});
    }, 30000);
  }, []);

  const stopActivityTracking = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /* Listen for Supabase auth state changes */
  useEffect(() => {
    if (!supabase) { setIsLoading(false); return; }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
        stopActivityTracking();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      stopActivityTracking();
    };
  }, [startActivityTracking, stopActivityTracking]);

  async function loadProfile(userId: string) {
    if (!supabase) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const u = toUser(data);
      setUser(u);
      setIsLoading(false);
      startActivityTracking(u);
      return;
    }

    /* Profile missing — try to recover from auth metadata */
    console.warn('[Auth] Profile not found for', userId, '- attempting recovery');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const email = authUser.email || '';
      const name = (authUser.user_metadata?.name as string) || email.split('@')[0] || 'User';
      const username = (authUser.user_metadata?.username as string) || email.split('@')[0] || 'user';

      /* Upsert the missing profile */
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        name,
        username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        is_admin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      });

      if (!upsertErr) {
        /* Fetch again after recovery */
        const { data: recovered } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (recovered) {
          const u = toUser(recovered);
          setUser(u);
          console.log('[Auth] Profile recovered for', email);
          setIsLoading(false);
          startActivityTracking(u);
          return;
        }
      }
    }

    setIsLoading(false);
  }

  /* ── Login with Supabase Auth ── */
  const login = useCallback(async (identifier: string, password: string, _rememberMe?: boolean) => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' };

    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPw = password.trim();

    if (!trimmedId || !trimmedPw) {
      return { success: false, error: 'Please enter username/email and password.' };
    }

    // Try login with email first, then username lookup
    let email = trimmedId;
    if (!trimmedId.includes('@')) {
      // Username lookup - query profiles for username
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', trimmedId)
        .single();
      if (lookupErr || !profile?.email) {
        return { success: false, error: 'Account not found.' };
      }
      email = profile.email;
    }

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: trimmedPw,
    });

    if (signInErr) {
      return { success: false, error: signInErr.message };
    }

    if (!signInData.user) {
      return { success: false, error: 'Login failed - no user returned.' };
    }

    // Ensure admin flag is set on profile
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      await supabase.from('profiles').update({ is_admin: true }).eq('id', signInData.user.id);
    }

    return { success: true };
  }, []);

  /* ── Signup with Supabase Auth ── */
  const signup = useCallback(
    async (userData: Omit<User, 'id' | 'avatar'> & { password?: string }) => {
      if (!supabase) return { success: false, error: 'Supabase not configured.' };

      const email = userData.email.trim().toLowerCase();
      const username = userData.username.trim();
      const pw = userData.password?.trim();
      const name = userData.name?.trim() || username;

      if (!email || !username || !pw) {
        return { success: false, error: 'All fields are required.' };
      }
      if (pw.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      // Check username uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existing) {
        return { success: false, error: 'This username is already taken.' };
      }

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { name, username },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Insert profile (trigger will also do this, but we ensure it)
        await upsertProfile({
          id: data.user.id,
          name,
          username,
          email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          is_admin: email === ADMIN_EMAIL,
        });
      }

      return { success: true };
    },
    []
  );

  /* ── Request a password reset email ── */
  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' };

    const trimmedEmail = email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  /* ── Logout ── */
  const logout = useCallback(async () => {
    stopActivityTracking();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }, [stopActivityTracking]);

  /* ── Check if username can be changed (30-day cooldown) ── */
  const canChangeUsername = useCallback((): boolean => {
    if (!user?.usernameLastChanged) return true; // never changed = can change
    const lastChanged = new Date(user.usernameLastChanged).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - lastChanged >= thirtyDaysMs;
  }, [user]);

  const getUsernameCooldownDays = useCallback((): number => {
    if (!user?.usernameLastChanged) return 0;
    const lastChanged = new Date(user.usernameLastChanged).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const remaining = thirtyDaysMs - (Date.now() - lastChanged);
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  }, [user]);

  /* ── Update profile ── */
  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      if (!user || !supabase) return;

      // Enforce 30-day username cooldown
      if (updates.username && updates.username !== user.username) {
        if (!canChangeUsername()) {
          const daysLeft = getUsernameCooldownDays();
          throw new Error(`You can only change your username once every 30 days. ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`);
        }
      }

      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.username && updates.username !== user.username) {
        dbUpdates.username = updates.username;
        dbUpdates.username_last_changed = new Date().toISOString();
      }
      if (updates.avatar) dbUpdates.avatar = updates.avatar;
      if (updates.clanName !== undefined) dbUpdates.clan_name = updates.clanName;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (!error) {
        setUser({ ...user, ...updates, usernameLastChanged: dbUpdates.username_last_changed || user.usernameLastChanged });
      }
    },
    [user, canChangeUsername, getUsernameCooldownDays]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        resetPassword,
        logout,
        updateProfile,
        canChangeUsername,
        getUsernameCooldownDays,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
