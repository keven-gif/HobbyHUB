import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Flame, MessageCircle, Bookmark, Share2, Calendar,
  Users, FileText, Info, Wrench, Check, Circle, Flag,
  Send, Trash2,
} from 'lucide-react';
import {
  getCommunity, getPosts, getBuilds, getRules,
  getSubcommittees, type Post as MockPost, type Build,
} from '@/data/communityData';
import { usePosts, type Post as RealPost } from '@/context/PostContext';
import { useAuth } from '@/context/AuthContext';
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees';
import { useSubcommitteeMemberCounts } from '@/hooks/useSubcommitteeMemberCounts';
import { getCommunityMembersAsync, getCommunitySubIds, type CommunityMember } from '@/lib/membershipRegistry';
import { fetchEvents, createEvent, deleteEvent } from '@/lib/supabaseQueries';
import { toast } from 'sonner';
import Avatar from '@/components/Avatar';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Types ─── */
type DisplayPost = {
  id: string;
  user: string;
  avatar: string;
  text: string;
  image: string;
  likes: number;
  comments: number;
  likedBy: string[];
  savedBy: string[];
  reportedBy: string[];
  commentsData: any[];
  isReal: boolean;
  userId: string;
  communityTag: string;
  createdAt: number;
};

function normalizeRealPost(p: RealPost): DisplayPost {
  return {
    id: p.id,
    user: p.user,
    avatar: p.avatar,
    text: p.content,
    image: p.image,
    likes: p.likedBy.length,
    comments: p.comments.length,
    likedBy: p.likedBy,
    savedBy: p.savedBy,
    reportedBy: p.reportedBy,
    commentsData: p.comments,
    isReal: true,
    userId: p.userId,
    communityTag: p.communityTag,
    createdAt: p.createdAt,
  };
}

function normalizeMockPost(p: MockPost): DisplayPost {
  return {
    id: p.id,
    user: p.user,
    avatar: p.avatar,
    text: p.text,
    image: p.image || '',
    likes: p.likes,
    comments: p.comments,
    likedBy: [],
    savedBy: [],
    reportedBy: [],
    commentsData: [],
    isReal: false,
    userId: '',
    communityTag: p.communityTag,
    createdAt: 0,
  };
}

/* ════════════════════════════════════════════════════
   TAB: FEED
   ════════════════════════════════════════════════════ */
function FeedTab({ communityId }: { communityId: string }) {
  const { getPostsForCommunity, toggleLike, toggleSave, reportPost, deletePost, addComment } = usePosts();
  const { user } = useAuth();
  const { joined: joinedSubs, isJoined } = useJoinedSubcommittees(user?.id);
  const navigate = useNavigate();

  const realPosts = useMemo(() => getPostsForCommunity(communityId), [getPostsForCommunity, communityId]);
  const mockPosts = useMemo(() => getPosts(communityId), [communityId]);

  const allPosts = useMemo(() => {
    const realIds = new Set(realPosts.map((p) => p.id));
    const posts = [
      ...realPosts.map(normalizeRealPost),
      ...mockPosts.filter((p) => !realIds.has(p.id)).map(normalizeMockPost),
    ];
    /* Filter: only show posts from subcommittees the user has joined */
    if (!user) return posts; // guests see all
    if (joinedSubs.size === 0) {
      // User logged in but hasn't joined any subcommittees in this community
      // Show ALL posts so they can discover content, with a prompt to join
      return posts;
    }
    return posts.filter((p) => {
      if (joinedSubs.has(p.communityTag)) return true
      const allSubs = getSubcommittees(communityId)
      const sub = allSubs.find((s) => s.id === p.communityTag || s.name.toLowerCase() === p.communityTag.toLowerCase())
      return sub ? isJoined(sub.id) : false
    });
  }, [realPosts, mockPosts, user, joinedSubs, isJoined, communityId]);

  const currentUserId = user?.id ?? '';

  const handleLike = useCallback((postId: string) => {
    if (!currentUserId) return;
    toggleLike(postId, currentUserId).catch((err: any) => toast.error(err?.message || 'Like failed'));
  }, [currentUserId, toggleLike]);

  const handleSave = useCallback((postId: string) => {
    if (!currentUserId) return;
    toggleSave(postId, currentUserId).catch((err: any) => toast.error(err?.message || 'Save failed'));
  }, [currentUserId, toggleSave]);

  const handleDelete = useCallback((postId: string) => {
    if (!currentUserId) return;
    deletePost(postId).catch((err: any) => toast.error(err?.message || 'Delete failed'));
  }, [currentUserId, deletePost]);

  const handleReport = useCallback((postId: string) => {
    if (!currentUserId) return;
    reportPost(postId, currentUserId).catch((err: any) => toast.error(err?.message || 'Report failed'));
  }, [currentUserId, reportPost]);

  const handleAddComment = useCallback((postId: string, content: string, replyInfo?: { parentId: string; replyToName: string }) => {
    if (!user || !content.trim()) return;
    addComment(postId, {
      userId: user.id,
      user: user.name || user.username,
      avatar: user.avatar,
      content: content.trim(),
      parentId: replyInfo?.parentId,
      replyToName: replyInfo?.replyToName,
    }).catch((err: any) => toast.error(err?.message || 'Comment failed'));
  }, [user, addComment]);

  return (
    <div className="space-y-3">
      {allPosts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          user={user}
          onLike={handleLike}
          onSave={handleSave}
          onDelete={handleDelete}
          onReport={handleReport}
          onAddComment={handleAddComment}
          onNavigate={navigate}
        />
      ))}
      {allPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ backgroundColor: '#111', border: '1px dashed #222' }}>
          <FileText size={40} style={{ color: '#444', marginBottom: 12 }} />
          <p className="font-body text-sm" style={{ color: '#666' }}>No posts yet. Be the first to share!</p>
        </div>
      )}
    </div>
  );
}

/* ─── Feed Post Card ─── */
function FeedPostCard({
  post, currentUserId, user, onLike, onSave, onDelete, onReport, onAddComment, onNavigate,
}: {
  post: DisplayPost;
  currentUserId: string;
  user: any;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onAddComment: (id: string, content: string, replyInfo?: { parentId: string; replyToName: string }) => void;
  onNavigate: (path: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isLiked = currentUserId ? post.likedBy.includes(currentUserId) : false;
  const isSaved = currentUserId ? post.savedBy.includes(currentUserId) : false;
  const isReported = currentUserId ? post.reportedBy.includes(currentUserId) : false;
  const isOwner = currentUserId && post.userId === currentUserId;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${post.user}: ${post.text.slice(0, 100)}${post.text.length > 100 ? '...' : ''}`);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => post.userId && onNavigate(`/profile?userId=${post.userId}`)} className="flex-shrink-0">
          <Avatar src={post.avatar} name={post.user} size={32} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => post.userId && onNavigate(`/profile?userId=${post.userId}`)} className="font-body text-sm font-semibold truncate" style={{ color: '#fff' }}>{post.user}</button>
          <p className="font-body text-[11px]" style={{ color: '#666' }}>{post.communityTag} &middot; {post.createdAt ? timeAgo(post.createdAt) : ''}</p>
        </div>
      </div>

      {/* Media — Image or Video */}
      {post.image && (
        <div className="overflow-hidden">
          {post.image.startsWith('data:video/') || post.image.match(/\.(mp4|mov|webm)(\?|$)/i) ? (
            <video src={post.image} controls preload="metadata" playsInline className="w-full" style={{ maxHeight: '400px' }} />
          ) : (
            <img src={post.image} alt="" className={`w-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ maxHeight: '400px', minHeight: '120px', backgroundColor: '#1a1a1a' }} loading="lazy" onLoad={() => setImgLoaded(true)} />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <p className="font-body text-[13px] leading-relaxed mb-3" style={{ color: '#aaaaaa' }}>{post.text}</p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2" style={{ borderTop: '1px solid #222' }}>
          <button onClick={() => onLike(post.id)} className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95" style={{ color: isLiked ? '#d93a3a' : '#666' }}>
            <Flame size={18} fill={isLiked ? '#d93a3a' : 'none'} />
            <span>{post.likedBy.length}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95" style={{ color: showComments ? '#d93a3a' : '#666' }}>
            <MessageCircle size={18} />
            <span>{post.isReal ? post.commentsData.length : post.comments}</span>
          </button>
          <button onClick={() => onSave(post.id)} className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95" style={{ color: isSaved ? '#f5a623' : '#666' }}>
            <Bookmark size={18} fill={isSaved ? '#f5a623' : 'none'} />
            <span>{post.savedBy.length}</span>
          </button>
          {isOwner && (
            <button onClick={() => onDelete(post.id)} className="flex items-center justify-center font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95" style={{ color: '#ef4444' }}>
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={handleShare} className="flex items-center justify-center font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95 ml-auto relative" style={{ color: '#666' }}>
            <Share2 size={18} />
            {showShareToast && <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-body text-[10px] whitespace-nowrap px-2 py-0.5 rounded" style={{ backgroundColor: '#333', color: '#fff' }}>Copied!</span>}
          </button>
          <button onClick={() => onReport(post.id)} className="flex items-center justify-center font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg active:scale-95" style={{ color: isReported ? '#ef4444' : '#666' }}>
            <Flag size={18} fill={isReported ? '#ef4444' : 'none'} />
          </button>
        </div>

        {/* Comments - Threaded */}
        {showComments && post.isReal && (
          <div className="pt-3 mt-2" style={{ borderTop: '1px solid #222' }}>
            {post.commentsData.length > 0 && (
              <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                {post.commentsData.filter((c: any) => !c.parentId).map((topLevel: any) => (
                  <div key={topLevel.id}>
                    {/* Top-level comment */}
                    <div className="flex items-start gap-2">
                      <Avatar src={topLevel.avatar} name={topLevel.user} size={24} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs font-semibold" style={{ color: '#fff' }}>{topLevel.user}</span>
                          <span className="font-body text-[9px]" style={{ color: '#555' }}>{timeAgo(topLevel.createdAt)}</span>
                        </div>
                        <p className="font-body text-[12px] leading-relaxed" style={{ color: '#aaa' }}>{topLevel.content}</p>
                        {currentUserId && (
                          <button
                            onClick={() => setReplyingTo({ id: topLevel.id, name: topLevel.user })}
                            className="font-body text-[10px] mt-0.5"
                            style={{ color: '#666' }}
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Replies */}
                    {post.commentsData.filter((r: any) => r.parentId === topLevel.id).map((reply: any) => (
                      <div key={reply.id} className="flex items-start gap-2 ml-6 mt-2" style={{ borderLeft: '2px solid #222', paddingLeft: '8px' }}>
                        <Avatar src={reply.avatar} name={reply.user} size={20} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-semibold" style={{ color: '#fff' }}>{reply.user}</span>
                            <span className="font-body text-[10px]" style={{ color: '#d93a3a' }}>@{reply.replyToName}</span>
                            <span className="font-body text-[9px]" style={{ color: '#555' }}>{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="font-body text-[11px] leading-relaxed" style={{ color: '#aaa' }}>{reply.content}</p>
                        </div>
                      </div>
                    ))}
                    {/* Reply input */}
                    {replyingTo?.id === topLevel.id && (() => {
                      const target = replyingTo!;
                      return (
                        <div className="flex items-center gap-2 ml-6 mt-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) { onAddComment(post.id, replyText, { parentId: target.id, replyToName: target.name }); setReplyText(''); setReplyingTo(null); } }}
                            placeholder={`Reply to ${target.name}...`}
                            autoFocus
                            className="flex-1 font-body text-xs px-3 py-2 rounded-full outline-none"
                            style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }}
                          />
                          <button
                            onClick={() => { if (replyText.trim()) { onAddComment(post.id, replyText, { parentId: target.id, replyToName: target.name }); setReplyText(''); setReplyingTo(null); } }}
                            className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full"
                            style={{ backgroundColor: replyText.trim() ? '#d93a3a' : '#222' }}
                          >
                            <Send size={12} style={{ color: '#fff' }} />
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            className="font-body text-[10px] px-2 py-1"
                            style={{ color: '#666' }}
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commentText.trim() && (onAddComment(post.id, commentText), setCommentText(''))}
                  placeholder="Write a comment..." className="flex-1 font-body text-sm px-4 py-3 rounded-full outline-none min-h-[44px]" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
                <button onClick={() => { if (commentText.trim()) { onAddComment(post.id, commentText); setCommentText(''); } }} className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full active:scale-95" style={{ backgroundColor: commentText.trim() ? '#d93a3a' : '#222' }}>
                  <Send size={14} style={{ color: '#fff' }} />
                </button>
              </div>
            ) : (
              <p className="font-body text-xs text-center py-2" style={{ color: '#555' }}>Sign in to comment</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB: BUILDS
   ════════════════════════════════════════════════════ */
function BuildsTab({ communityId }: { communityId: string }) {
  const builds = useMemo(() => getBuilds(communityId), [communityId]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {builds.map((build: Build) => (
        <div key={build.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="overflow-hidden" style={{ aspectRatio: '16/10' }}>
            <img src={build.image} alt={build.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={build.avatar} alt={build.user} className="w-6 h-6 rounded-full object-cover" loading="lazy" />
              <span className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{build.user}</span>
            </div>
            <h3 className="font-body text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{build.title}</h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {build.tags.map((tag) => (
                <span key={tag} className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-primary)15', color: 'var(--accent-primary)' }}>{tag}</span>
              ))}
            </div>
            <span className="flex items-center gap-1 font-body text-xs" style={{ color: 'var(--text-muted)' }}><Flame size={12} /> {build.likes}</span>
          </div>
        </div>
      ))}
      {builds.length === 0 && <EmptyTab icon={Wrench} text="No builds shared yet." />}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB: EVENTS
   ════════════════════════════════════════════════════ */
function EventsTab({ communityId }: { communityId: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEvents(communityId).then((data) => {
      if (!cancelled) { setEvents(data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId]);

  const handleCreate = async () => {
    if (!title.trim() || !date.trim() || !user) {
      toast.error('Title and date are required');
      return;
    }
    try {
      const newEvent = await createEvent({
        community_id: communityId,
        title: title.trim(),
        description: desc.trim() || undefined,
        date: date.trim(),
        time: time.trim() || undefined,
        location: location.trim() || undefined,
        created_by: user.id,
        creator_name: user.name,
      });
      setEvents((prev) => [newEvent, ...prev]);
      setTitle(''); setDesc(''); setDate(''); setTime(''); setLocation('');
      setShowForm(false);
      toast.success('Event created!');
    } catch (e: any) {
      toast.error('Failed to create event: ' + (e.message || 'Unknown'));
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success('Event deleted');
    } catch (e: any) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-3">
      {/* Create Event Button */}
      {user && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full font-body text-sm py-3 rounded-lg flex items-center justify-center gap-2"
          style={{ backgroundColor: showForm ? '#1a1a1a' : '#d93a3a20', color: showForm ? '#aaa' : '#d93a3a', border: '1px solid', borderColor: showForm ? '#333' : '#d93a3a44' }}
        >
          <Calendar size={16} /> {showForm ? 'Cancel' : 'Create Event'}
        </button>
      )}

      {/* Create Event Form */}
      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title *" className="w-full font-body text-sm px-3 py-2.5 rounded-lg outline-none" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-full font-body text-sm px-3 py-2.5 rounded-lg outline-none" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
          <div className="flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 font-body text-sm px-3 py-2.5 rounded-lg outline-none" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-body text-sm px-3 py-2.5 rounded-lg outline-none" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
          </div>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-full font-body text-sm px-3 py-2.5 rounded-lg outline-none" style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }} />
          <button onClick={handleCreate} className="w-full font-body text-sm font-semibold py-2.5 rounded-lg" style={{ backgroundColor: '#d93a3a', color: '#fff' }}>
            Post Event
          </button>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d93a3a', borderTopColor: 'transparent' }} />
        </div>
      ) : events.length === 0 ? (
        <EmptyTab icon={Calendar} text="No events scheduled. Be the first to create one!" />
      ) : (
        events.map((event: any) => (
          <div key={event.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-primary)20' }}>
                <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-body text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
                <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                  {event.date}{event.time ? ` at ${event.time}` : ''}{event.location ? ` · ${event.location}` : ''}
                </p>
                {event.description && <p className="font-body text-xs line-clamp-2 mt-1" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>}
                {event.creator_name && <p className="font-body text-[10px] mt-1" style={{ color: '#555' }}>Posted by {event.creator_name}</p>}
              </div>
              {user && event.created_by === user.id && (
                <button onClick={() => handleDelete(event.id)} className="p-2 rounded-lg flex-shrink-0" style={{ color: '#ef4444' }} title="Delete">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB: MEMBERS
   ════════════════════════════════════════════════════ */
function MembersTab({ communityId, subIds }: { communityId: string; subIds: string[] }) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommunityMembersAsync(communityId, subIds).then((data) => {
      if (!cancelled) { setMembers(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [communityId, subIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {members.map((m) => (
        <Link key={m.id} to={`/profile?userId=${m.id}`} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm flex-shrink-0" style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>
            {m.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
            <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>@{m.username}</p>
          </div>
        </Link>
      ))}
      {members.length === 0 && <EmptyTab icon={Users} text="No members yet." />}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB: ABOUT
   ════════════════════════════════════════════════════ */
function AboutTab({ communityId, accentColor }: { communityId: string; accentColor: string }) {
  const community = getCommunity(communityId);
  const rulesData = useMemo(() => getRules(communityId), [communityId]);
  const guidelines = [
    'Be respectful to fellow hobbyists',
    'Share original content and builds',
    'No spam or self-promotion',
    'Use appropriate tags for posts',
    'Help newcomers learn the hobby',
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <h3 className="font-body text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>About</h3>
        <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{community.description}</p>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <h3 className="font-body text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Community Guidelines</h3>
        <div className="space-y-2">
          {guidelines.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check size={14} style={{ color: accentColor }} />
              <span className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>{g}</span>
            </div>
          ))}
        </div>
      </div>

      {rulesData.rules.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="font-body text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Rules</h3>
          <div className="space-y-2">
            {rulesData.rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <Circle size={10} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                <span className="font-body text-xs" style={{ color: 'var(--text-secondary)' }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   UTILITY COMPONENTS
   ════════════════════════════════════════════════════ */
function EmptyTab({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 col-span-full rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)' }}>
      <Icon size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
      <p className="font-body text-sm text-center px-6" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN COMMUNITY PAGE
   ════════════════════════════════════════════════════ */
type TabKey = 'feed' | 'builds' | 'events' | 'members' | 'about';

export default function Community() {
  const { id } = useParams<{ id: string }>();
  const communityId = id || 'gundam';
  const community = getCommunity(communityId);
  const { user } = useAuth();
  const { joinSub, leaveSub, isJoined: isSubJoined, syncDone } = useJoinedSubcommittees(user?.id);
  const { getCountSync: getMemberCount, loadCounts, counts } = useSubcommitteeMemberCounts();
  const [activeTab, setActiveTab] = useState<TabKey>('feed');

  const accentColor = community.accentColor;
  const subs = useMemo(() => getSubcommittees(communityId), [communityId]);
  const subIds = useMemo(() => getCommunitySubIds(communityId), [communityId]);

  /* Load member counts for all subcommittees - reload when sync completes */
  useEffect(() => {
    if (subIds.length > 0) loadCounts(subIds);
  }, [subIds, loadCounts, syncDone]);

  /* Poll counts every 10s to catch cross-device updates */
  useEffect(() => {
    if (subIds.length === 0) return;
    const interval = setInterval(() => loadCounts(subIds), 10000);
    return () => clearInterval(interval);
  }, [subIds, loadCounts]);

  const totalMembers = useMemo(() => subs.reduce((sum, sub) => sum + getMemberCount(sub.id), 0), [subs, getMemberCount, counts]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'feed', label: 'Feed', icon: FileText },
    { key: 'builds', label: 'Builds', icon: Wrench },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'about', label: 'About', icon: Info },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Hero Banner - static, no animation */}
      <section className="relative w-full overflow-hidden" style={{ height: 'clamp(200px, 30vh, 360px)' }}>
        <img src={community.coverImage || community.cover} alt={community.name} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,17,21,0.3) 0%, rgba(15,17,21,0.95) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accentColor + '30', border: `2px solid ${accentColor}50` }}>
                <Users size={28} style={{ color: accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl tracking-wider" style={{ color: '#ffffff' }}>{community.name}</h1>
                <p className="font-body text-xs mt-1 line-clamp-2" style={{ color: '#aaaaaa' }}>{community.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-body text-[11px]" style={{ color: '#888' }}><Users size={12} className="inline mr-1" />{totalMembers} members</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subcommittees */}
      <section className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-body text-xs font-semibold mb-3 tracking-wider" style={{ color: 'var(--text-muted)' }}>SUBCOMMITTEES</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {subs.map((sub) => {
              const joined = isSubJoined(sub.id);
              return (
                <div key={sub.id} className="flex-shrink-0 w-40 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: joined ? `1px solid ${accentColor}` : '1px solid var(--border-subtle)' }}>
                  <div className="overflow-hidden" style={{ height: '80px' }}>
                    <img src={sub.image || community.cover} alt={sub.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-2">
                    <p className="font-body text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{sub.name}</p>
                    <p className="font-body text-[10px] line-clamp-1" style={{ color: 'var(--text-muted)' }}>{sub.description}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>{getMemberCount(sub.id)}</span>
                      {user && (
                        <button onClick={() => joined ? leaveSub(sub.id) : joinSub(sub.id, communityId)}
                          className="font-body text-[10px] px-2 py-0.5 rounded active:scale-95"
                          style={{ backgroundColor: joined ? 'var(--bg-surface)' : accentColor + '20', color: joined ? 'var(--text-muted)' : accentColor, border: joined ? '1px solid var(--border-subtle)' : 'none' }}>
                          {joined ? 'Joined' : 'Join'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tabs - CSS sticky */}
      <div className="sticky z-30 px-6" style={{ top: 'calc(72px + env(safe-area-inset-top, 0px))', backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-1.5 px-4 py-3 font-body text-sm font-medium whitespace-nowrap relative">
                <tab.icon size={14} />
                <span style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{tab.label}</span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--accent-primary)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <section className="px-6 py-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'feed' && <FeedTab communityId={communityId} />}
          {activeTab === 'builds' && <BuildsTab communityId={communityId} />}
          {activeTab === 'events' && <EventsTab communityId={communityId} />}
          {activeTab === 'members' && <MembersTab communityId={communityId} subIds={subIds} />}
          {activeTab === 'about' && <AboutTab communityId={communityId} accentColor={accentColor} />}
        </div>
      </section>
    </div>
  );
}
