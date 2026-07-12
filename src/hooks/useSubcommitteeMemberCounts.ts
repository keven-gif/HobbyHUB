/**
 * useSubcommitteeMemberCounts — actual member counts from Supabase.
 *
 * Queries the `subcommittee_joins` table for real counts.
 */

import { useState, useCallback } from 'react';
import { supabase, hasRealConfig } from '@/lib/supabase';

export function useSubcommitteeMemberCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  /* Load count for a specific subcommittee */
  const getCount = useCallback(
    async (subcommitteeId: string): Promise<number> => {
      // Return cached if available
      if (counts[subcommitteeId] !== undefined) return counts[subcommitteeId];

      if (!hasRealConfig || !supabase) return 0;
      try {
        const { count: cnt, error } = await supabase
          .from('subcommittee_joins')
          .select('*', { count: 'exact', head: true })
          .eq('subcommittee_id', subcommitteeId);
        if (error) throw error;
        const result = cnt || 0;
        setCounts((prev) => ({ ...prev, [subcommitteeId]: result }));
        return result;
      } catch {
        return 0;
      }
    },
    [counts]
  );

  /* Load counts for multiple subcommittees at once */
  const loadCounts = useCallback(
    async (subcommitteeIds: string[]) => {
      if (!hasRealConfig || !supabase || subcommitteeIds.length === 0) return;
      
      // Filter out already-loaded IDs
      const idsToLoad = subcommitteeIds.filter((id) => counts[id] === undefined);
      if (idsToLoad.length === 0) return;

      try {
        // Try to get all counts in one query using group by
        const { data, error } = await supabase
          .from('subcommittee_joins')
          .select('subcommittee_id')
          .in('subcommittee_id', idsToLoad);
        
        if (error) throw error;
        
        // Count occurrences per subcommittee_id
        const newCounts: Record<string, number> = {};
        for (const row of data || []) {
          const sid = (row as any).subcommittee_id;
          newCounts[sid] = (newCounts[sid] || 0) + 1;
        }
        
        // Set 0 for IDs that had no results
        for (const id of idsToLoad) {
          if (newCounts[id] === undefined) newCounts[id] = 0;
        }
        
        setCounts((prev) => ({ ...prev, ...newCounts }));
      } catch {
        // Fallback: load individually
        for (const id of idsToLoad) {
          try {
            const { count: cnt } = await supabase
              .from('subcommittee_joins')
              .select('*', { count: 'exact', head: true })
              .eq('subcommittee_id', id);
            setCounts((prev) => ({ ...prev, [id]: cnt || 0 }));
          } catch { /* ignore */ }
        }
      }
    },
    [counts]
  );

  /* Synchronous read (returns cached value or 0 if not loaded yet) */
  const getCountSync = useCallback(
    (subcommitteeId: string): number => counts[subcommitteeId] ?? 0,
    [counts]
  );

  return { getCount, getCountSync, loadCounts, counts };
}
