import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { supabase, hasRealConfig } from '@/lib/supabase';
import type { User } from './AuthContext';

interface SupabaseSyncContextType {
  syncProfile: (user: User) => Promise<boolean>;
  pushPost: (post: any) => Promise<boolean>;
  pullPosts: () => Promise<any[]>;
  isSupabaseReady: boolean;
}

const SupabaseSyncContext = createContext<SupabaseSyncContextType>({
  syncProfile: async () => false,
  pushPost: async () => false,
  pullPosts: async () => [],
  isSupabaseReady: false,
});

export function useSupabaseSync() { return useContext(SupabaseSyncContext); }

export function SupabaseSyncProvider({ children }: { children: ReactNode }) {
  const isSupabaseReady = hasRealConfig && !!supabase;

  /* Push profile to Supabase */
  const syncProfile = useCallback(async (user: User): Promise<boolean> => {
    if (!isSupabaseReady) {
      console.log('[Sync] Supabase not configured');
      return false;
    }
    try {
      // Build payload — omit 'name' if profiles table doesn't have it
      const payload: Record<string, any> = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        clan_name: user.clanName || null,
        bio: user.bio || null,
        updated_at: new Date().toISOString(),
      };
      // Only include 'name' if table has it (will fail 400 if not)
      // Use user.name in username if name column doesn't exist
      payload.name = user.name;

      const { error } = await supabase!.from('profiles').upsert(payload, { onConflict: 'id' });

      if (error) {
        // If 'name' column missing, retry without it
        if (error.message?.includes('name')) {
          delete payload.name;
          const { error: retryError } = await supabase!.from('profiles').upsert(payload, { onConflict: 'id' });
          if (retryError) {
            console.error('[Sync] Profile sync FAILED:', retryError.message);
            return false;
          }
          console.log('[Sync] Profile synced to Supabase ✅ (without name column)');
          return true;
        }
        console.error('[Sync] Profile sync FAILED:', error.message);
        return false;
      }
      console.log('[Sync] Profile synced to Supabase ✅');
      return true;
    } catch (e: any) {
      console.error('[Sync] Profile sync ERROR:', e?.message || e);
      return false;
    }
  }, [isSupabaseReady]);

  /* Push a post to Supabase */
  const pushPost = useCallback(async (post: any): Promise<boolean> => {
    if (!isSupabaseReady) return false;
    try {
      const payload: Record<string, any> = {
        id: post.id,
        community_tag: post.communityTag,
        user_id: post.userId,
        user_name: post.user,
        avatar: post.avatar,
        clan_name: post.clanName || null,
        title: post.title || null,
        content: post.content,
        image: post.image || null,
        liked_by: post.likedBy || [],
        saved_by: post.savedBy || [],
        reported_by: post.reportedBy || [],
        created_at: new Date(post.createdAt).toISOString(),
      };
      // Only include optional columns if they exist
      payload.community_id = post.communityId;
      payload.comments = (post.comments || []).map((c: any) => ({
        id: c.id, user_id: c.userId, user: c.user,
        avatar: c.avatar, content: c.content,
        created_at: new Date(c.createdAt).toISOString(),
      }));

      const { error } = await supabase!.from('posts').upsert(payload, { onConflict: 'id' });

      if (error) {
        // Retry without optional columns if they don't exist
        const msg = error.message || '';
        if (msg.includes('community_id') || msg.includes('comments')) {
          if (msg.includes('community_id')) delete payload.community_id;
          if (msg.includes('comments')) delete payload.comments;
          const { error: retryError } = await supabase!.from('posts').upsert(payload, { onConflict: 'id' });
          if (!retryError) return true;
        }
        console.error('[Sync] Post push FAILED:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }, [isSupabaseReady]);

  /* Pull all posts from Supabase */
  const pullPosts = useCallback(async (): Promise<any[]> => {
    if (!isSupabaseReady) return [];
    try {
      const { data, error } = await supabase!.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) return [];
      return (data || []).map((row: any) => ({
        id: row.id,
        communityId: row.community_id,
        communityTag: row.community_tag,
        userId: row.user_id,
        user: row.user_name,
        avatar: row.avatar,
        clanName: row.clan_name || '',
        title: row.title || '',
        content: row.content,
        image: row.image || '',
        likedBy: row.liked_by || [],
        savedBy: row.saved_by || [],
        reportedBy: row.reported_by || [],
        comments: (row.comments || []).map((c: any) => ({
          id: c.id, userId: c.user_id, user: c.user,
          avatar: c.avatar, content: c.content,
          createdAt: new Date(c.created_at).getTime(),
        })),
        createdAt: new Date(row.created_at).getTime(),
      }));
    } catch (e) { return []; }
  }, [isSupabaseReady]);

  return (
    <SupabaseSyncContext.Provider value={{ syncProfile, pushPost, pullPosts, isSupabaseReady }}>
      {children}
    </SupabaseSyncContext.Provider>
  );
}
