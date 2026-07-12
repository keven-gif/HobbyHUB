/**
 * useJoinedSubcommittees — tracks which subcommittees the current user joined.
 *
 * PRIMARY: Supabase `subcommittee_joins` table (shared across all devices)
 * FALLBACK: localStorage (offline mode)
 *
 * KEY BEHAVIOR: On first load, if Supabase has no joins but localStorage does,
 * we SYNC localStorage joins UP to Supabase (migration path).
 * If BOTH are empty (new user), we auto-join them to default subcommittees.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, hasRealConfig } from '@/lib/supabase';
import { loadSync, saveDurable } from '@/lib/durableStorage';
import { getAllCommunities, getSubcommittees } from '@/data/communityData';

function joinsKey(userId: string): string {
  return `hobbyhub_joins_${userId}`;
}

function loadJoinsLocal(userId: string): string[] {
  if (!userId) return [];
  const parsed = loadSync<string[]>(joinsKey(userId), []);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  const oldParsed = loadSync<string[]>('hobbyhub_joined_subcommittees', []);
  if (Array.isArray(oldParsed) && oldParsed.length > 0) {
    saveDurable(joinsKey(userId), oldParsed);
    return oldParsed;
  }
  return [];
}

function saveJoinsLocal(userId: string, subIds: string[]) {
  saveDurable(joinsKey(userId), subIds);
}

/** Get the first subcommittee ID for each community (for auto-join) */
function getDefaultSubIds(): string[] {
  const defaults: string[] = [];
  for (const commId of getAllCommunities()) {
    const subs = getSubcommittees(commId);
    if (subs.length > 0) defaults.push(subs[0].id);
  }
  return defaults;
}

export function useJoinedSubcommittees(currentUserId: string | undefined) {
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [syncDone, setSyncDone] = useState(false);
  const syncInProgress = useRef(false);

  /* ─── Load from Supabase + sync localStorage up + auto-join defaults ─── */
  useEffect(() => {
    if (!currentUserId) { setJoined(new Set()); setCount(0); setIsLoading(false); setSyncDone(true); return; }

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // Try Supabase first
      let supabaseSubIds: string[] = [];
      if (hasRealConfig && supabase) {
        try {
          const { data, error } = await supabase
            .from('subcommittee_joins')
            .select('subcommittee_id, community_id')
            .eq('user_id', currentUserId);

          if (!error && data) {
            supabaseSubIds = data.map((row: any) => row.subcommittee_id as string);
          }
        } catch { /* fall through */ }
      }

      // If Supabase has data → use it (source of truth)
      if (supabaseSubIds.length > 0) {
        saveJoinsLocal(currentUserId!, supabaseSubIds);
        if (!cancelled) {
          setJoined(new Set(supabaseSubIds));
          setCount(supabaseSubIds.length);
          setIsLoading(false);
          setSyncDone(true);
        }
        return;
      }

      // ─── Supabase is empty → check localStorage (migration) ───
      const localSubIds = loadJoinsLocal(currentUserId!);

      if (localSubIds.length > 0 && hasRealConfig && supabase && !syncInProgress.current) {
        // SYNC: Push localStorage joins UP to Supabase
        syncInProgress.current = true;
        try {
          // Build rows with community_id lookup
          const rows = localSubIds.map((subId: string) => {
            // Find which community this sub belongs to
            let commId = '';
            for (const cid of getAllCommunities()) {
              if (getSubcommittees(cid).some(s => s.id === subId)) {
                commId = cid;
                break;
              }
            }
            return { user_id: currentUserId, subcommittee_id: subId, community_id: commId };
          }).filter(r => r.community_id); // only valid ones

          if (rows.length > 0) {
            const { error: upsertErr } = await supabase!.from('subcommittee_joins').upsert(rows, { onConflict: 'user_id,subcommittee_id' });
            if (!upsertErr) {
              // Now use these as the joins
              if (!cancelled) {
                setJoined(new Set(localSubIds));
                setCount(localSubIds.length);
                setIsLoading(false);
                setSyncDone(true);
              }
              syncInProgress.current = false;
              return;
            }
          }
        } catch (e) {
          console.error('[Sync] Failed to push local joins to Supabase:', e);
        }
        syncInProgress.current = false;
      }

      // ─── Both empty → auto-join to defaults (new user experience) ───
      if (localSubIds.length === 0 && hasRealConfig && supabase && !syncInProgress.current) {
        syncInProgress.current = true;
        try {
          const defaults = getDefaultSubIds();
          if (defaults.length > 0) {
            const rows = defaults.map((subId: string) => {
              let commId = '';
              for (const cid of getAllCommunities()) {
                if (getSubcommittees(cid).some(s => s.id === subId)) {
                  commId = cid;
                  break;
                }
              }
              return { user_id: currentUserId, subcommittee_id: subId, community_id: commId };
            }).filter(r => r.community_id);

            if (rows.length > 0) {
              const { error } = await supabase!.from('subcommittee_joins').upsert(rows, { onConflict: 'user_id,subcommittee_id' });
              if (!error) {
                saveJoinsLocal(currentUserId!, defaults);
                if (!cancelled) {
                  setJoined(new Set(defaults));
                  setCount(defaults.length);
                  setIsLoading(false);
                  setSyncDone(true);
                }
                syncInProgress.current = false;
                return;
              }
            }
          }
        } catch (e) {
          console.error('[AutoJoin] Failed:', e);
        }
        syncInProgress.current = false;
      }

      // Fallback: use whatever we have locally
      const finalIds = localSubIds.length > 0 ? localSubIds : getDefaultSubIds();
      saveJoinsLocal(currentUserId!, finalIds);
      if (!cancelled) {
        setJoined(new Set(finalIds));
        setCount(finalIds.length);
        setIsLoading(false);
        setSyncDone(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUserId]);

  /* Subscribe to realtime changes */
  useEffect(() => {
    if (!currentUserId || !hasRealConfig || !supabase) return;

    const channel = supabase!
      .channel('subcommittee_joins_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subcommittee_joins', filter: `user_id=eq.${currentUserId}` },
        () => {
          supabase!.from('subcommittee_joins')
            .select('subcommittee_id')
            .eq('user_id', currentUserId)
            .then(({ data }) => {
              if (data) {
                const subIds = data.map((row: any) => row.subcommittee_id as string);
                saveJoinsLocal(currentUserId, subIds);
                setJoined(new Set(subIds));
                setCount(subIds.length);
              }
            });
        }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [currentUserId]);

  const joinSub = useCallback(
    async (subId: string, communityId: string) => {
      if (!currentUserId) return;

      // Optimistic
      setJoined((prev) => {
        const next = new Set(prev);
        next.add(subId);
        return next;
      });
      setCount((c) => c + 1);

      // Supabase
      if (hasRealConfig && supabase) {
        try {
          await supabase!.from('subcommittee_joins').upsert(
            { user_id: currentUserId, subcommittee_id: subId, community_id: communityId },
            { onConflict: 'user_id,subcommittee_id' }
          );
        } catch (e) {
          console.error('[Join] Failed:', e);
        }
      }

      // Local backup
      const current = loadJoinsLocal(currentUserId);
      if (!current.includes(subId)) {
        current.push(subId);
        saveJoinsLocal(currentUserId, current);
      }
    },
    [currentUserId]
  );

  const leaveSub = useCallback(
    async (subId: string) => {
      if (!currentUserId) return;

      // Optimistic
      setJoined((prev) => {
        const next = new Set(prev);
        next.delete(subId);
        return next;
      });
      setCount((c) => Math.max(0, c - 1));

      // Supabase
      if (hasRealConfig && supabase) {
        try {
          await supabase
            .from('subcommittee_joins')
            .delete()
            .eq('user_id', currentUserId)
            .eq('subcommittee_id', subId);
        } catch (e) {
          console.error('[Leave] Failed:', e);
        }
      }

      // Local backup
      const current = loadJoinsLocal(currentUserId).filter((id) => id !== subId);
      saveJoinsLocal(currentUserId, current);
    },
    [currentUserId]
  );

  const isJoined = useCallback(
    (subId: string) => joined.has(subId),
    [joined]
  );

  return { joined, count, isLoading, syncDone, joinSub, leaveSub, isJoined };
}
