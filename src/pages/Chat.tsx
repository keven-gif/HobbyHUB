import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Users, MoreVertical, LogOut } from 'lucide-react';
import { useMessages } from '@/context/MessageContext';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { toast } from 'sonner';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Message Bubble ─── */
function MessageBubble({ msg, isMe }: { msg: any; isMe: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2 mb-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isMe && (
        <Avatar src={msg.senderAvatar} name={msg.senderName} size={28} />
      )}
      <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="font-body text-[10px] mb-0.5 ml-1" style={{ color: '#666666' }}>
            {msg.senderName}
          </span>
        )}
        <div
          className="px-3 py-2 rounded-2xl font-body text-[13px] leading-relaxed"
          style={{
            backgroundColor: isMe ? '#d93a3a' : '#1a1a1a',
            color: isMe ? '#ffffff' : '#dddddd',
            borderBottomRightRadius: isMe ? '4px' : '2xl',
            borderBottomLeftRadius: isMe ? '2xl' : '4px',
          }}
        >
          {msg.content}
        </div>
        <span className="font-body text-[9px] mt-0.5 px-1" style={{ color: '#444444' }}>
          {timeAgo(msg.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getConversation, getMessagesForConversation, sendMessage, markRead, leaveConversation } = useMessages();
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversation = useMemo(() => (id ? getConversation(id) : undefined), [id, getConversation]);
  const messages = useMemo(() => (id ? getMessagesForConversation(id) : []), [id, getMessagesForConversation]);

  /* Brief loading delay — conversations may still be loading from Supabase */
  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 2000);
    return () => clearTimeout(timer);
  }, [id]);

  /* Mark as read on mount */
  useEffect(() => {
    if (id && conversation) markRead(id);
  }, [id, conversation, markRead]);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /* Focus input on mount */
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !id || !user) return;
    try {
      await sendMessage(id, text, { userId: user.id, name: user.name, avatar: user.avatar });
      setInputText('');
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
    }
  };

  const handleLeave = () => {
    if (!id || !user) return;
    leaveConversation(id, user.id);
    toast.success('Left conversation');
    navigate('/messages');
  };

  /* Loading state — conversation may still be loading from Supabase */
  if (!conversation && !hasLoaded) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d93a3a', borderTopColor: 'transparent' }} />
        <p className="font-body text-xs mt-3" style={{ color: '#555555' }}>Loading conversation...</p>
      </div>
    );
  }

  /* Truly not found after loading period */
  if (!conversation) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center" style={{ backgroundColor: '#000000' }}>
        <p className="font-body text-sm" style={{ color: '#555555' }}>Conversation not found</p>
        <button onClick={() => navigate('/messages')} className="mt-4 font-body text-xs px-4 py-2 rounded-lg" style={{ backgroundColor: '#d93a3a', color: '#fff' }}>
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col" style={{ backgroundColor: '#000000' }}>
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a' }}
      >
        <button onClick={() => navigate('/messages')} style={{ color: '#888888' }}>
          <ArrowLeft size={22} />
        </button>

        {/* Avatar / Icon */}
        {conversation.type === 'group' ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
          >
            <Users size={16} style={{ color: '#888888' }} />
          </div>
        ) : (
          <Avatar src={conversation.participants[0]?.avatar} name={conversation.name} size={32} />
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-body text-sm font-semibold truncate" style={{ color: '#ffffff' }}>
            {conversation.name}
          </h2>
          <p className="font-body text-[10px]" style={{ color: '#555555' }}>
            {conversation.type === 'group'
              ? `${conversation.participants.length} members`
              : conversation.participants[0]?.name || ''}
          </p>
        </div>

        {/* Menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} style={{ color: '#888888' }}>
            <MoreVertical size={20} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-50 w-40 rounded-lg overflow-hidden py-1"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}
                >
                  <button
                    onClick={() => { setShowMenu(false); handleLeave(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 font-body text-xs transition-colors"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#222222'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <LogOut size={14} /> Leave Chat
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="font-body text-sm" style={{ color: '#444444' }}>
              Start the conversation...
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === user?.id} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.95)', borderTop: '1px solid #1a1a1a' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type a message..."
            className="flex-1 font-body text-sm px-4 py-2.5 rounded-full outline-none"
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: '1px solid #333333',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-opacity"
            style={{
              backgroundColor: inputText.trim() ? '#d93a3a' : '#222222',
              opacity: inputText.trim() ? 1 : 0.5,
            }}
          >
            <Send size={16} style={{ color: '#ffffff' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
