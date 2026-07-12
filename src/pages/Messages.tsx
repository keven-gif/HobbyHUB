import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Plus, Users, Search, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { useMessages, type Participant } from '@/context/MessageContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import { toast } from 'sonner';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function Messages() {
  const { conversations, createConversation } = useMessages();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<Participant[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* ── Load all users from Supabase when overlay opens ── */
  useEffect(() => {
    if (!showNewChat || !user) return;
    let cancelled = false;
    setLoadingUsers(true);
    supabase!.from('profiles')
      .select('id, name, username, avatar')
      .neq('id', user.id)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error('Failed to load users');
        } else if (data) {
          setAllUsers(data.map((p: any) => ({
            userId: p.id,
            name: p.name ?? p.username ?? 'User',
            avatar: p.avatar ?? '',
          })));
        }
        setLoadingUsers(false);
      });
    return () => { cancelled = true; };
  }, [showNewChat, user]);

  const existingConvUserIds = useMemo(() => {
    const directConvs = conversations.filter((c) => c.type === 'direct');
    const ids = new Set<string>();
    directConvs.forEach((c) => {
      c.participants.forEach((p) => { if (p.userId !== user?.id) ids.add(p.userId); });
    });
    return ids;
  }, [conversations, user?.id]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allUsers
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q));
  }, [searchQuery, allUsers]);

  const handleStartDirectChat = async (participant: Participant) => {
    const existing = conversations.find(
      (c) => c.type === 'direct' && c.participants.some((p) => p.userId === participant.userId)
    );
    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }
    try {
      const convId = await createConversation('direct', participant.name, [participant]);
      navigate(`/chat/${convId}`);
    } catch (e: any) {
      toast.error('Failed to start chat: ' + (e.message || 'Unknown error'));
    }
  };

  const handleToggleUserSelection = (participant: Participant) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((p) => p.userId === participant.userId);
      if (exists) return prev.filter((p) => p.userId !== participant.userId);
      return [...prev, participant];
    });
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      toast.error('Select at least 2 people for a group chat');
      return;
    }
    const name = groupName.trim() || selectedUsers.map((u) => u.name.split(' ')[0]).join(', ');
    try {
      const convId = await createConversation('group', name, selectedUsers);
      setShowNewChat(false);
      setGroupMode(false);
      setGroupName('');
      setSelectedUsers([]);
      navigate(`/chat/${convId}`);
    } catch (e: any) {
      toast.error('Failed to create group: ' + (e.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-[100dvh] px-4 pt-4 pb-20" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-lg tracking-wider" style={{ color: '#ffffff' }}>
          MESSAGES
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setGroupMode(true); setShowNewChat(true); }}
            className="flex items-center gap-1 font-body text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#d93a3a22', color: '#d93a3a', border: '1px solid #d93a3a44' }}
          >
            <Users size={14} /> Group
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#d93a3a', color: '#ffffff' }}
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <MessageCircle size={48} style={{ color: '#333333', marginBottom: 16 }} />
          <p className="font-body text-sm text-center mb-6" style={{ color: '#555555' }}>
            No conversations yet.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewChat(true)}
              className="font-body text-sm px-5 py-2.5 rounded-lg"
              style={{ backgroundColor: '#d93a3a', color: '#ffffff' }}
            >
              <Plus size={16} className="inline mr-2" />New Message
            </button>
            <button
              onClick={() => { setGroupMode(true); setShowNewChat(true); }}
              className="font-body text-sm px-5 py-2.5 rounded-lg"
              style={{ backgroundColor: '#d93a3a22', color: '#d93a3a', border: '1px solid #d93a3a44' }}
            >
              <Users size={16} className="inline mr-2" />Group Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {conversations.map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: easeOutExpo }}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex items-center gap-3 w-full text-left py-3 px-2 rounded-lg transition-colors"
              style={{ borderBottom: '1px solid #111111' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#111111'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conv.type === 'group' ? (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#1a1a1a', border: '2px solid #333333' }}
                  >
                    <Users size={20} style={{ color: '#888888' }} />
                  </div>
                ) : (
                  <Avatar src={conv.participants[0]?.avatar} name={conv.participants[0]?.name || 'User'} size={48} />
                )}
                {conv.unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ backgroundColor: '#d93a3a', color: '#fff' }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm font-semibold truncate" style={{ color: '#ffffff' }}>
                    {conv.name}
                  </span>
                  {conv.lastMessage && (
                    <span className="font-body text-[10px] flex-shrink-0 ml-2" style={{ color: '#555555' }}>
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="font-body text-xs truncate mt-0.5" style={{ color: conv.unreadCount > 0 ? '#aaaaaa' : '#555555' }}>
                    {conv.lastMessage.senderName}: {conv.lastMessage.content}
                  </p>
                )}
              </div>

              <ChevronRight size={16} style={{ color: '#333333' }} className="flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {/* New Chat Overlay */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: '#000000' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <button onClick={() => { setShowNewChat(false); setGroupMode(false); setSelectedUsers([]); setGroupName(''); setSearchQuery(''); }} style={{ color: '#888888' }}>
                <ArrowLeft size={22} />
              </button>
              <h2 className="font-display text-lg tracking-wider flex-1" style={{ color: '#ffffff' }}>
                {groupMode ? 'NEW GROUP' : 'NEW MESSAGE'}
              </h2>
              {!groupMode && (
                <button
                  onClick={() => setGroupMode(true)}
                  className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#d93a3a', color: '#ffffff' }}
                >
                  <Users size={14} className="inline mr-1" /> Group Chat
                </button>
              )}
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
              >
                <Search size={16} style={{ color: '#555555' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 font-body text-sm bg-transparent outline-none"
                  style={{ color: '#ffffff' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: '#555555' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Group name input (group mode) */}
            {groupMode && (
              <div className="px-4 pb-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name (optional)..."
                  className="w-full font-body text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ backgroundColor: '#111111', color: '#ffffff', border: '1px solid #222222' }}
                />
              </div>
            )}

            {/* Selected users badge row (group mode) */}
            {groupMode && selectedUsers.length > 0 && (
              <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
                {selectedUsers.map((u) => (
                  <span
                    key={u.userId}
                    className="flex items-center gap-1 font-body text-[10px] px-2 py-1 rounded-full"
                    style={{ backgroundColor: '#d93a3a22', color: '#d93a3a', border: '1px solid #d93a3a44' }}
                  >
                    {u.name}
                    <button onClick={() => handleToggleUserSelection(u)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* User list */}
            <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 180px)' }}>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d93a3a', borderTopColor: 'transparent' }} />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="font-body text-sm text-center py-12" style={{ color: '#555555' }}>
                  {searchQuery ? 'No users found' : 'No users available'}
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUsers.some((s) => s.userId === u.userId);
                  const hasDirectChat = existingConvUserIds.has(u.userId);
                  return (
                    <button
                      key={u.userId}
                      onClick={() => {
                        if (groupMode) {
                          handleToggleUserSelection(u);
                        } else {
                          handleStartDirectChat(u);
                        }
                      }}
                      className="flex items-center gap-3 w-full text-left py-3 px-2 rounded-lg transition-colors"
                      style={{ backgroundColor: isSelected ? '#1a1a1a' : 'transparent' }}
                    >
                      <Avatar src={u.avatar} name={u.name} size={40} />
                      <div className="flex-1 min-w-0">
                        <span className="font-body text-sm font-medium block" style={{ color: '#ffffff' }}>{u.name}</span>
                        {!groupMode && hasDirectChat && (
                          <span className="font-body text-[10px]" style={{ color: '#555555' }}>Already chatting</span>
                        )}
                      </div>
                      {groupMode && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `2px solid ${isSelected ? '#d93a3a' : '#444444'}`,
                            backgroundColor: isSelected ? '#d93a3a' : 'transparent',
                          }}
                        >
                          {isSelected && <CheckIcon />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Create group button */}
            {groupMode && selectedUsers.length >= 2 && (
              <div className="fixed bottom-0 left-0 right-0 px-4 py-4" style={{ backgroundColor: '#000000', borderTop: '1px solid #1a1a1a' }}>
                <button
                  onClick={handleCreateGroup}
                  className="w-full font-body font-semibold text-white py-3 rounded-lg"
                  style={{ backgroundColor: '#d93a3a' }}
                >
                  Create Group ({selectedUsers.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
