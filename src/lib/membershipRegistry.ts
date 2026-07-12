/**
 * Membership Registry — subcommittee join tracking.
 *
 * PRIMARY: Supabase `subcommittee_joins` table (shared across devices)
 * FALLBACK: localStorage (offline mode)
 */

import { supabase, hasRealConfig } from './supabase';
import { loadSync, saveDurable } from './durableStorage';
import { getSubcommittees } from '@/data/communityData';

const MEMBERSHIP_KEY = 'hobbyhub_memberships';
const TIMESTAMP_KEY = 'hobbyhub_membership_ts';

export interface MembershipRecord {
  userId: string;
  subcommitteeId: string;
  communityId: string;
  joinedAt: string;
}

/* ─── Helpers ─── */

function loadLocalMemberships(): MembershipRecord[] {
  return loadSync<MembershipRecord[]>(MEMBERSHIP_KEY, []);
}

function saveLocalMemberships(records: MembershipRecord[]) {
  saveDurable(MEMBERSHIP_KEY, records);
  localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
}

/* Get subcommittee IDs for a community using actual communityData */
export function getCommunitySubIds(communityId: string): string[] {
  return getSubcommittees(communityId).map((sub) => sub.id);
}

/* ─── CRUD: Subcommittee Joins ─── */

export async function getUserMembershipsAsync(userId: string): Promise<MembershipRecord[]> {
  if (!hasRealConfig || !supabase) return loadLocalMemberships().filter((m) => m.userId === userId);

  try {
    const { data, error } = await supabase
      .from('subcommittee_joins')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      userId: row.user_id,
      subcommitteeId: row.subcommittee_id,
      communityId: row.community_id,
      joinedAt: row.created_at,
    }));
  } catch {
    return loadLocalMemberships().filter((m) => m.userId === userId);
  }
}

export async function addMembershipAsync(userId: string, subcommitteeId: string, communityId: string): Promise<void> {
  const record: MembershipRecord = { userId, subcommitteeId, communityId, joinedAt: new Date().toISOString() };

  // Supabase
  if (hasRealConfig && supabase) {
    try {
      await supabase.from('subcommittee_joins').upsert(
        { user_id: userId, subcommittee_id: subcommitteeId, community_id: communityId },
        { onConflict: 'user_id,subcommittee_id' }
      );
    } catch (e) { console.error('[Membership] Add failed:', e); }
  }

  // Local backup
  const all = loadLocalMemberships().filter((m) => !(m.userId === userId && m.subcommitteeId === subcommitteeId));
  all.push(record);
  saveLocalMemberships(all);
}

export async function removeMembershipAsync(userId: string, subcommitteeId: string): Promise<void> {
  if (hasRealConfig && supabase) {
    try {
      await supabase
        .from('subcommittee_joins')
        .delete()
        .eq('user_id', userId)
        .eq('subcommittee_id', subcommitteeId);
    } catch (e) { console.error('[Membership] Remove failed:', e); }
  }

  const all = loadLocalMemberships().filter((m) => !(m.userId === userId && m.subcommitteeId === subcommitteeId));
  saveLocalMemberships(all);
}

export async function getSubcommitteeMembersAsync(subcommitteeId: string): Promise<MembershipRecord[]> {
  if (!hasRealConfig || !supabase) {
    return loadLocalMemberships().filter((m) => m.subcommitteeId === subcommitteeId);
  }

  try {
    const { data, error } = await supabase
      .from('subcommittee_joins')
      .select('*')
      .eq('subcommittee_id', subcommitteeId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      userId: row.user_id,
      subcommitteeId: row.subcommittee_id,
      communityId: row.community_id,
      joinedAt: row.created_at,
    }));
  } catch {
    return loadLocalMemberships().filter((m) => m.subcommitteeId === subcommitteeId);
  }
}

export async function getSubcommitteeJoinCountAsync(subcommitteeId: string): Promise<number> {
  if (!hasRealConfig || !supabase) {
    return loadLocalMemberships().filter((m) => m.subcommitteeId === subcommitteeId).length;
  }

  try {
    const { count, error } = await supabase
      .from('subcommittee_joins')
      .select('*', { count: 'exact', head: true })
      .eq('subcommittee_id', subcommitteeId);
    if (error) throw error;
    return count || 0;
  } catch {
    return loadLocalMemberships().filter((m) => m.subcommitteeId === subcommitteeId).length;
  }
}

export async function getCommunityMembersAsync(_communityId: string, subIds: string[]): Promise<CommunityMember[]> {
  if (!hasRealConfig || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('subcommittee_joins')
      .select('user_id, subcommittee_id')
      .in('subcommittee_id', subIds);
    if (error || !data) return [];

    // Get unique user IDs
    const userIds = [...new Set(data.map((row: any) => row.user_id))];
    if (userIds.length === 0) return [];

    // Fetch profiles for these users
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, username')
      .in('id', userIds);
    if (profileErr || !profiles) return [];

    return profiles.map((p: any) => ({
      id: p.id,
      name: p.name || p.username || 'User',
      username: p.username || 'user',
    }));
  } catch {
    return [];
  }
}

export async function getCommunityMemberCountAsync(_communityId: string, subIds: string[]): Promise<number> {
  if (!hasRealConfig || !supabase) return 0;

  try {
    const { count, error } = await supabase
      .from('subcommittee_joins')
      .select('*', { count: 'exact', head: true })
      .in('subcommittee_id', subIds);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

export interface CommunityMember {
  id: string;
  name: string;
  username: string;
}

/* ─── Legacy Exports (for backward compat) ─── */
export function getMembershipTimestamp(): number {
  const ts = localStorage.getItem(TIMESTAMP_KEY);
  return ts ? parseInt(ts, 10) : 0;
}

export function clearMemberships() {
  localStorage.removeItem(MEMBERSHIP_KEY);
  localStorage.removeItem(TIMESTAMP_KEY);
}


/* ─── Legacy Exports (backward compat) ─── */
export async function getAllUsersAsync(): Promise<any[]> {
  if (!hasRealConfig || !supabase) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('id, name, username, avatar, clan_name, bio, created_at').order('name');
    if (error) throw error;
    return data || [];
  } catch { return []; }
}

export function saveUserJoinsLocal(userId: string, subIds: string[]) {
  const all = loadLocalMemberships().filter((m) => m.userId !== userId);
  for (const subId of subIds) {
    all.push({ userId, subcommitteeId: subId, communityId: '', joinedAt: new Date().toISOString() });
  }
  saveLocalMemberships(all);
}

export function loadUserJoinsLocal(userId: string): string[] {
  return loadLocalMemberships()
    .filter((m) => m.userId === userId)
    .map((m) => m.subcommitteeId);
}
