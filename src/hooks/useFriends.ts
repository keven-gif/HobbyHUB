import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchFriendRequests,
  sendFriendRequest as sendFriendRequestDb,
  updateFriendRequest,
  deleteFriendRequest,
  insertNotification,
} from '@/lib/supabaseQueries';

/* ─── Types ─── */
export interface FriendRequest {
  id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar: string;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Friend {
  userId: string;
  name: string;
  avatar: string;
  since: number;
}

/* ─── Hook ─── */
export function useFriends(currentUserId?: string) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  /* Load from Supabase */
  const loadRequests = useCallback(async () => {
    if (!currentUserId) { setRequests([]); return; }
    try {
      const data = await fetchFriendRequests(currentUserId);
      setRequests(data as FriendRequest[]);
    } catch (e) {
      console.error('[Friends] Failed to load:', e);
    }
  }, [currentUserId]);

  // Initial load
  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Realtime subscription for friend requests
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    const channel = supabase!
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_user_id=eq.${currentUserId}`,
        },
        () => { loadRequests(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${currentUserId}`,
        },
        () => { loadRequests(); }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [currentUserId, loadRequests]);

  /* Send a friend request */
  const sendRequest = useCallback(
    async (toUserId: string, toUserName: string, toUserAvatar: string, fromUserName: string, fromUserAvatar: string): Promise<boolean> => {
      if (!currentUserId || currentUserId === toUserId) return false;

      // Check local state first
      const alreadyFriends = requests.some(
        (r) => r.status === 'accepted' && ((r.from_user_id === currentUserId && r.to_user_id === toUserId) || (r.from_user_id === toUserId && r.to_user_id === currentUserId))
      );
      if (alreadyFriends) return false;

      const alreadyPending = requests.some(
        (r) => r.status === 'pending' && ((r.from_user_id === currentUserId && r.to_user_id === toUserId) || (r.from_user_id === toUserId && r.to_user_id === currentUserId))
      );
      if (alreadyPending) return false;

      try {
        await sendFriendRequestDb({
          from_user_id: currentUserId,
          from_user_name: fromUserName,
          from_user_avatar: fromUserAvatar,
          to_user_id: toUserId,
          to_user_name: toUserName,
          to_user_avatar: toUserAvatar,
        });

        // Create notification for recipient
        await insertNotification({
          type: 'follow',
          title: 'Friend Request',
          message: `${fromUserName} sent you a friend request`,
          from_user_id: currentUserId,
          from_user_name: fromUserName,
          from_user_avatar: fromUserAvatar,
          to_user_id: toUserId,
          link: `/profile?userId=${currentUserId}`,
        });

        await loadRequests();
        return true;
      } catch (e) {
        console.error('[Friends] Send failed:', e);
        return false;
      }
    },
    [currentUserId, requests, loadRequests]
  );

  /* Accept a request */
  const acceptRequest = useCallback(
    async (requestId: string) => {
      try {
        await updateFriendRequest(requestId, 'accepted');
        await loadRequests();
      } catch (e) { console.error('[Friends] Accept failed:', e); }
    },
    [loadRequests]
  );

  /* Decline a request */
  const declineRequest = useCallback(
    async (requestId: string) => {
      try {
        await updateFriendRequest(requestId, 'declined');
        await loadRequests();
      } catch (e) { console.error('[Friends] Decline failed:', e); }
    },
    [loadRequests]
  );

  /* Cancel a request */
  const cancelRequest = useCallback(
    async (requestId: string) => {
      try {
        await deleteFriendRequest(requestId);
        await loadRequests();
      } catch (e) { console.error('[Friends] Cancel failed:', e); }
    },
    [loadRequests]
  );

  /* Remove a friend */
  const removeFriend = useCallback(
    async (otherUserId: string) => {
      if (!currentUserId) return;
      const req = requests.find(
        (r) => r.status === 'accepted' && ((r.from_user_id === currentUserId && r.to_user_id === otherUserId) || (r.from_user_id === otherUserId && r.to_user_id === currentUserId))
      );
      if (req) {
        try {
          await deleteFriendRequest(req.id);
          await loadRequests();
        } catch (e) { console.error('[Friends] Remove failed:', e); }
      }
    },
    [currentUserId, requests, loadRequests]
  );

  /* Get status */
  const getFriendStatus = useCallback(
    (otherUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'friends' => {
      if (!currentUserId || currentUserId === otherUserId) return 'none';
      if (requests.some((r) => r.status === 'accepted' && ((r.from_user_id === currentUserId && r.to_user_id === otherUserId) || (r.from_user_id === otherUserId && r.to_user_id === currentUserId)))) return 'friends';
      if (requests.some((r) => r.status === 'pending' && r.from_user_id === currentUserId && r.to_user_id === otherUserId)) return 'pending_sent';
      if (requests.some((r) => r.status === 'pending' && r.from_user_id === otherUserId && r.to_user_id === currentUserId)) return 'pending_received';
      return 'none';
    },
    [currentUserId, requests]
  );

  const getFriends = useCallback((): Friend[] => {
    if (!currentUserId) return [];
    const friends: Friend[] = [];
    for (const r of requests) {
      if (r.status !== 'accepted') continue;
      if (r.from_user_id === currentUserId) friends.push({ userId: r.to_user_id, name: r.to_user_name, avatar: r.to_user_avatar, since: new Date(r.created_at).getTime() });
      else if (r.to_user_id === currentUserId) friends.push({ userId: r.from_user_id, name: r.from_user_name, avatar: r.from_user_avatar, since: new Date(r.created_at).getTime() });
    }
    return friends;
  }, [currentUserId, requests]);

  const getIncomingRequests = useCallback(() => {
    if (!currentUserId) return [];
    return requests.filter((r) => r.status === 'pending' && r.to_user_id === currentUserId);
  }, [currentUserId, requests]);

  const getOutgoingRequests = useCallback(() => {
    if (!currentUserId) return [];
    return requests.filter((r) => r.status === 'pending' && r.from_user_id === currentUserId);
  }, [currentUserId, requests]);

  return {
    requests,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    getFriendStatus,
    getFriends,
    getIncomingRequests,
    getOutgoingRequests,
  };
}

/* ─── Count incoming requests (for badges) ─── */
export function useFriendRequestCount(userId?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId || !supabase) return;

    async function load() {
      try {
        const { count: c, error } = await supabase!
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', userId)
          .eq('status', 'pending');
        if (!error) setCount(c || 0);
      } catch { /* ignore */ }
    }

    load();

    // Realtime subscription
    const channel = supabase!
      .channel(`friend_req_count_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${userId}` }, () => { load(); })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [userId]);

  return count;
}
