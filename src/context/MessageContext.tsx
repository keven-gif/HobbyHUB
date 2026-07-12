import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

/* ─── Types ─── */
export interface Participant {
  userId: string;
  name: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  participants: Participant[];
  lastMessage?: { content: string; createdAt: number; senderName: string };
  unreadCount: number;
  createdAt: number;
}

/* ─── Supabase row types ─── */
interface SupaConversation {
  id: string;
  type: "direct" | "group";
  name: string;
  participant_ids: string[];
  created_at: string;
}

interface SupaMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  created_at: string;
}

/* ─── localStorage helper (UI state only: read positions) ─── */
function readKey(key: string) {
  try {
    const r = localStorage.getItem(`hh_ui_${key}`);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function writeKey(key: string, val: unknown) {
  try {
    localStorage.setItem(`hh_ui_${key}`, JSON.stringify(val));
  } catch {
    /* noop */
  }
}

/* ─── Context ─── */
interface MessageContextValue {
  conversations: Conversation[];
  messages: ChatMessage[];
  sendMessage: (
    conversationId: string,
    content: string,
    sender: { userId: string; name: string; avatar: string }
  ) => void;
  createConversation: (
    type: "direct" | "group",
    name: string,
    participants: Participant[]
  ) => Promise<string>;
  markRead: (conversationId: string) => void;
  getMessagesForConversation: (conversationId: string) => ChatMessage[];
  getConversation: (conversationId: string) => Conversation | undefined;
  leaveConversation: (conversationId: string, userId: string) => void;
  totalUnread: number;
}

const MessageContext = createContext<MessageContextValue | null>(null);

export function useMessages(): MessageContextValue {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessages must be used within <MessageProvider>");
  return ctx;
}

/* ─── Participant resolution ─── */
async function resolveParticipants(
  ids: string[]
): Promise<Participant[]> {
  if (ids.length === 0) return [];

  /* Deduplicate IDs */
  const uniqueIds = [...new Set(ids)];

  const { data, error } = await supabase!
    .from("profiles")
    .select("id, name, username, avatar")
    .in("id", uniqueIds);

  if (error || !data) {
    console.error('[Messages] Failed to resolve participants:', error?.message);
    return uniqueIds.map((id) => ({ userId: id, name: "Unknown", avatar: "" }));
  }

  const profileMap = new Map(
    data.map((p: any) => [
      p.id,
      {
        userId: p.id,
        name: p.name ?? p.username ?? "User",
        avatar: p.avatar ?? "",
      },
    ])
  );

  return uniqueIds.map(
    (id) => profileMap.get(id) ?? { userId: id, name: "Unknown", avatar: "" }
  );
}

/* ─── Provider ─── */
export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readMap, setReadMap] = useState<Record<string, number>>(
    () => readKey("read_positions") ?? {}
  );
  const subscriptionsRef = useRef<any[]>([]);

  /* Sync read positions to localStorage */
  useEffect(() => {
    writeKey("read_positions", readMap);
  }, [readMap]);

  /* ── Load conversations & messages from Supabase ── */
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function load() {
      /* 1. Fetch conversations where user is a participant */
      const { data: convRows } = await supabase!
        .from("conversations")
        .select("*")
        .contains("participant_ids", [user!.id])
        .order("created_at", { ascending: false });

      if (!convRows || cancelled) return;

      const convIds = (convRows as SupaConversation[]).map((c) => c.id);

      /* 2. Resolve participants for each conversation */
      const participantPromises = (convRows as SupaConversation[]).map(async (c) => ({
        convId: c.id,
        participants: await resolveParticipants(c.participant_ids ?? []),
      }));
      const participantResults = await Promise.all(participantPromises);
      const participantMap = new Map(
        participantResults.map((p) => [p.convId, p.participants])
      );

      /* 3. Fetch messages for all these conversations */
      let allMessages: ChatMessage[] = [];
      if (convIds.length > 0) {
        const { data: msgRows } = await supabase!
          .from("messages")
          .select("*")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true });

        if (msgRows && !cancelled) {
          allMessages = (msgRows as SupaMessage[]).map((m) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            content: m.content,
            createdAt: new Date(m.created_at).getTime(),
          }));
        }
      }

      if (cancelled) return;

      /* 4. Build conversations with lastMessage */
      const convs: Conversation[] = (convRows as SupaConversation[]).map(
        (c) => {
          const convMsgs = allMessages.filter((m) => m.conversationId === c.id);
          const lastMsg =
            convMsgs.length > 0
              ? convMsgs[convMsgs.length - 1]
              : undefined;
          const unread = convMsgs.filter(
            (m) => m.senderId !== user!.id && m.createdAt > (readMap[c.id] ?? 0)
          ).length;

          return {
            id: c.id,
            type: c.type,
            name: c.name,
            participants: participantMap.get(c.id) ?? [],
            lastMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  createdAt: lastMsg.createdAt,
                  senderName: lastMsg.senderName,
                }
              : undefined,
            unreadCount: unread,
            createdAt: new Date(c.created_at).getTime(),
          };
        }
      );

      setConversations(convs);
      setMessages(allMessages);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ── Supabase Realtime subscriptions ── */
  useEffect(() => {
    if (!user) return;

    /* Subscribe to conversations changes */
    const convChannel = supabase!
      .channel("conversations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        async (payload) => {
          const c = payload.new as SupaConversation;
          const isParticipant = c.participant_ids?.includes(user.id);
          if (!isParticipant && payload.eventType !== "DELETE") return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const participants = await resolveParticipants(
              c.participant_ids ?? []
            );

            setConversations((prev) => {
              const exists = prev.some((p) => p.id === c.id);
              const conv: Conversation = {
                id: c.id,
                type: c.type,
                name: c.name,
                participants,
                lastMessage: undefined,
                unreadCount: 0,
                createdAt: new Date(c.created_at).getTime(),
              };

              if (exists) {
                /* Preserve lastMessage / unreadCount from existing state */
                const existing = prev.find((p) => p.id === c.id);
                if (existing) {
                  conv.lastMessage = existing.lastMessage;
                  conv.unreadCount = existing.unreadCount;
                }
                return prev.map((p) => (p.id === c.id ? conv : p));
              }

              return [conv, ...prev];
            });
          }

          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setConversations((prev) => prev.filter((p) => p.id !== old.id));
          }
        }
      )
      .subscribe();

    /* Subscribe to messages inserts */
    const msgChannel = supabase!
      .channel("messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as SupaMessage;
          const msg: ChatMessage = {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            content: m.content,
            createdAt: new Date(m.created_at).getTime(),
          };

          setMessages((prev) => {
            if (prev.some((p) => p.id === msg.id)) return prev;
            return [...prev, msg];
          });

          /* Update lastMessage for the conversation */
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== m.conversation_id) return c;
              const isUnread =
                m.sender_id !== user.id &&
                msg.createdAt > (readMap[m.conversation_id] ?? 0);
              return {
                ...c,
                lastMessage: {
                  content: m.content,
                  createdAt: msg.createdAt,
                  senderName: m.sender_name,
                },
                unreadCount: isUnread ? c.unreadCount + 1 : c.unreadCount,
              };
            })
          );
        }
      )
      .subscribe();

    subscriptionsRef.current = [convChannel, msgChannel];

    return () => {
      convChannel.unsubscribe();
      msgChannel.unsubscribe();
    };
  }, [user, readMap]);

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      sender: { userId: string; name: string; avatar: string }
    ) => {
      const tempId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: sender.userId,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        content,
        createdAt: Date.now(),
      };

      /* 1. Optimistic UI — show message immediately */
      setMessages((prev) => [...prev, optimisticMsg]);

      /* 2. Update conversation lastMessage */
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: {
                  content,
                  createdAt: Date.now(),
                  senderName: sender.name,
                },
              }
            : c
        )
      );

      /* 3. Send to Supabase */
      try {
        const { error } = await supabase!.from("messages").insert({
          conversation_id: conversationId,
          sender_id: sender.userId,
          sender_name: sender.name,
          sender_avatar: sender.avatar,
          content,
        });
        if (error) throw error;
      } catch (e: any) {
        /* 4. Revert on failure */
        console.error('[Messages] Send failed:', e);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error('Message failed to send: ' + (e?.message || 'Unknown error'));
      }

      /* 5. Realtime will deliver the confirmed message with real ID.
         Clean up the optimistic placeholder after a short delay. */
      setTimeout(() => {
        setMessages((prev) => {
          const hasRealVersion = prev.some(
            (m) => m.id !== tempId && m.senderId === sender.userId && m.content === content && m.createdAt >= optimisticMsg.createdAt - 1000
          );
          if (hasRealVersion) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev;
        });
      }, 3000);
    },
    []
  );

  /* ── Create conversation ── */
  const createConversation = useCallback(
    async (
      type: "direct" | "group",
      name: string,
      participants: Participant[]
    ) => {
      const allParticipants = [
        ...participants,
        { userId: user!.id, name: user!.name, avatar: user!.avatar || '' },
      ];

      const { data, error } = await supabase!
        .from("conversations")
        .insert({
          type,
          name,
          participant_ids: allParticipants.map((p) => p.userId),
        })
        .select("*")
        .single();

      if (error) throw error;

      const newConvId = data.id as string;

      /* Optimistically add to local state so Chat can find it immediately */
      const newConv: Conversation = {
        id: newConvId,
        type,
        name,
        participants: allParticipants,
        lastMessage: undefined,
        unreadCount: 0,
        createdAt: Date.now(),
      };
      setConversations((prev) => [newConv, ...prev]);

      return newConvId;
    },
    [user]
  );

  /* ── Mark read ── */
  const markRead = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
      setReadMap((prev) => ({
        ...prev,
        [conversationId]: Date.now(),
      }));
    },
    []
  );

  /* ── Getters ── */
  const getMessagesForConversation = useCallback(
    (conversationId: string) =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  );

  const getConversation = useCallback(
    (conversationId: string) => conversations.find((c) => c.id === conversationId),
    [conversations]
  );

  /* ── Leave conversation ── */
  const leaveConversation = useCallback(
    async (conversationId: string, userId: string) => {
      /* Fetch current participant_ids, remove userId */
      const { data } = await supabase!
        .from("conversations")
        .select("participant_ids, type")
        .eq("id", conversationId)
        .single();

      if (!data) {
        /* Already gone — clean up local state */
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        setMessages((prev) =>
          prev.filter((m) => m.conversationId !== conversationId)
        );
        return;
      }

      const currentIds = (data as any).participant_ids as string[];
      const type = (data as any).type as "direct" | "group";
      const remaining = currentIds.filter((id) => id !== userId);

      if (type === "direct" || remaining.length === 0) {
        await supabase!.from("conversations").delete().eq("id", conversationId);
      } else {
        await supabase!
          .from("conversations")
          .update({ participant_ids: remaining })
          .eq("id", conversationId);
      }

      /* Optimistically remove from local state */
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setMessages((prev) =>
        prev.filter((m) => m.conversationId !== conversationId)
      );
    },
    []
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const value: MessageContextValue = {
    conversations,
    messages,
    sendMessage,
    createConversation,
    markRead,
    getMessagesForConversation,
    getConversation,
    leaveConversation,
    totalUnread,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}
