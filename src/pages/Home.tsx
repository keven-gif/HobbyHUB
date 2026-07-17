import { useState, useMemo, memo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Users, Flame, MessageCircle, Bookmark, Flag, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/context/AuthContext'
import { usePosts } from '@/context/PostContext'
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees'
import { getAllCommunities, getSubcommittees } from '@/data/communityData'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ─── Interactive Feed Post Card ─── */
const FeedPostCard = memo(function FeedPostCard({ post }: { post: any }) {
  const { user } = useAuth()
  const { toggleLike, toggleSave, reportPost, deletePost, addComment } = usePosts()
  const navigate = useNavigate()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const currentUserId = user?.id ?? ''

  const isLiked = currentUserId ? post.likedBy.includes(currentUserId) : false
  const isSaved = currentUserId ? post.savedBy.includes(currentUserId) : false
  const isReported = currentUserId ? post.reportedBy.includes(currentUserId) : false
  const isOwner = currentUserId && post.userId === currentUserId

  const handleAddComment = () => {
    if (!user || !commentText.trim()) return;
    addComment(post.id, {
      userId: user.id,
      user: user.name || user.username,
      avatar: user.avatar,
      content: commentText.trim(),
    }).catch((err: any) => toast.error(err?.message || 'Comment failed'));
    setCommentText('');
  };

  const handleReply = (commentId: string, commentUserName: string) => {
    setReplyingTo({ id: commentId, name: commentUserName });
  };

  const handleSubmitReply = () => {
    if (!user || !replyText.trim() || !replyingTo) return;
    addComment(post.id, {
      userId: user.id,
      user: user.name || user.username,
      avatar: user.avatar,
      content: replyText.trim(),
      parentId: replyingTo.id,
      replyToName: replyingTo.name,
    }).catch((err: any) => toast.error(err?.message || 'Reply failed'));
    setReplyText('');
    setReplyingTo(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
    >
      {/* Post Header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => navigate(`/profile?userId=${post.userId}`)} className="flex-shrink-0" style={{ touchAction: 'manipulation' }}>
          <Avatar src={post.avatar} name={post.user} size={32} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/profile?userId=${post.userId}`)} className="font-body text-sm font-semibold truncate" style={{ color: '#ffffff', touchAction: 'manipulation' }}>{post.user}</button>
            {post.clanName && (
              <span className="font-body text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#d93a3a22', color: '#d93a3a', fontWeight: 600 }}>{post.clanName}</span>
            )}
          </div>
          <span className="font-body text-[11px]" style={{ color: '#666666' }}>{post.communityTag} &middot; {timeAgo(post.createdAt)}</span>
        </div>
      </div>

      {/* Post Media — Image or Video */}
      {post.image && (
        <div className="overflow-hidden">
          {post.image.startsWith('data:video/') || post.image.match(/\.(mp4|mov|webm)(\?|$)/i) ? (
            <video
              src={post.image}
              controls
              preload="metadata"
              playsInline
              className="w-full"
              style={{ maxHeight: '400px' }}
            />
          ) : (
            <img src={post.image} alt="" className="w-full object-cover" style={{ maxHeight: '400px' }} loading="lazy" />
          )}
        </div>
      )}

      {/* Post Content */}
      <div className="p-3">
        {post.title && <h3 className="font-body text-sm font-semibold mb-1" style={{ color: '#ffffff' }}>{post.title}</h3>}
        <p className="font-body text-[13px] leading-relaxed mb-3" style={{ color: '#aaaaaa' }}>{post.content}</p>

        {/* Action Buttons — 44px min tap targets for mobile */}
        <div className="flex items-center gap-1 pt-2" style={{ borderTop: '1px solid #222222', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}>
          {/* Like (Fire) */}
          <button
            onClick={() => {
              if (!currentUserId) return;
              toggleLike(post.id, currentUserId).catch((err: any) => toast.error(err?.message || 'Like failed'));
            }}
            className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-all duration-200 active:scale-90"
            style={{ color: isLiked ? '#d93a3a' : '#666666', WebkitTapHighlightColor: 'transparent' }}
          >
            <Flame size={18} fill={isLiked ? '#d93a3a' : 'none'} />
            <span>{post.likedBy.length}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors active:scale-90"
            style={{ color: showComments ? '#d93a3a' : '#666666', WebkitTapHighlightColor: 'transparent' }}
          >
            <MessageCircle size={18} />
            <span>{post.comments.length}</span>
          </button>

          {/* Save */}
          <button
            onClick={() => {
              if (!currentUserId) return;
              toggleSave(post.id, currentUserId).catch((err: any) => toast.error(err?.message || 'Save failed'));
            }}
            className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-all duration-200 active:scale-90"
            style={{ color: isSaved ? '#f5a623' : '#666666', WebkitTapHighlightColor: 'transparent' }}
          >
            <Bookmark size={18} fill={isSaved ? '#f5a623' : 'none'} />
            <span>{post.savedBy.length}</span>
          </button>

          {/* Delete — only for post owner */}
          {isOwner && (
            <button
              onClick={() => deletePost(post.id)}
              className="flex items-center justify-center font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-all duration-200 active:scale-90"
              style={{ color: '#ef4444', WebkitTapHighlightColor: 'transparent' }}
              title="Delete your post"
            >
              <Trash2 size={18} />
            </button>
          )}

          {/* Report (Flag) */}
          <button
            onClick={() => {
              if (!currentUserId) return;
              reportPost(post.id, currentUserId).catch((err: any) => toast.error(err?.message || 'Report failed'));
            }}
            className="flex items-center justify-center font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-all duration-200 active:scale-90 ml-auto"
            style={{ color: isReported ? '#ef4444' : '#666666', WebkitTapHighlightColor: 'transparent' }}
          >
            <Flag size={18} fill={isReported ? '#ef4444' : 'none'} />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-2" style={{ borderTop: '1px solid #222222' }}>
                {/* Threaded Comment List */}
                {post.comments.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                    {post.comments.filter((c: any) => !c.parentId).map((topLevel: any) => (
                      <div key={topLevel.id}>
                        {/* Top-level comment */}
                        <div className="flex items-start gap-2">
                          <Avatar src={topLevel.avatar} name={topLevel.user} size={24} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-body text-xs font-semibold" style={{ color: '#ffffff' }}>{topLevel.user}</span>
                              <span className="font-body text-[9px]" style={{ color: '#555' }}>{timeAgo(topLevel.createdAt)}</span>
                            </div>
                            <p className="font-body text-[12px] leading-relaxed" style={{ color: '#aaaaaa' }}>{topLevel.content}</p>
                            {currentUserId && (
                              <button
                                onClick={() => handleReply(topLevel.id, topLevel.user)}
                                className="font-body text-[10px] mt-0.5"
                                style={{ color: '#666' }}
                              >
                                Reply
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Replies */}
                        {post.comments.filter((r: any) => r.parentId === topLevel.id).map((reply: any) => (
                          <div key={reply.id} className="flex items-start gap-2 ml-6 mt-2" style={{ borderLeft: '2px solid #222', paddingLeft: '8px' }}>
                            <Avatar src={reply.avatar} name={reply.user} size={20} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-body text-xs font-semibold" style={{ color: '#ffffff' }}>{reply.user}</span>
                                <span className="font-body text-[10px]" style={{ color: '#d93a3a' }}>@{reply.replyToName}</span>
                                <span className="font-body text-[9px]" style={{ color: '#555' }}>{timeAgo(reply.createdAt)}</span>
                              </div>
                              <p className="font-body text-[11px] leading-relaxed" style={{ color: '#aaaaaa' }}>{reply.content}</p>
                            </div>
                          </div>
                        ))}
                        {/* Reply input */}
                        {replyingTo?.id === topLevel.id && (
                          <div className="flex items-center gap-2 ml-6 mt-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                              placeholder={`Reply to ${replyingTo?.name ?? ''}...`}
                              autoFocus
                              className="flex-1 font-body text-xs px-3 py-2 rounded-full outline-none"
                              style={{ backgroundColor: '#1a1a1a', color: '#ffffff', border: '1px solid #333333' }}
                            />
                            <button
                              onClick={handleSubmitReply}
                              disabled={!replyText.trim()}
                              className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full"
                              style={{ backgroundColor: replyText.trim() ? '#d93a3a' : '#222' }}
                            >
                              <Send size={12} style={{ color: '#fff' }} />
                            </button>
                            <button
                              onClick={handleCancelReply}
                              className="font-body text-[10px] px-2 py-1"
                              style={{ color: '#666' }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                {currentUserId ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Write a comment..."
                      className="flex-1 font-body text-sm px-4 py-3 rounded-full outline-none min-h-[44px]"
                      style={{ backgroundColor: '#1a1a1a', color: '#ffffff', border: '1px solid #333333' }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full active:scale-90"
                      style={{
                        backgroundColor: commentText.trim() ? '#d93a3a' : '#222',
                        opacity: commentText.trim() ? 1 : 0.4,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Send size={14} style={{ color: '#fff' }} />
                    </button>
                  </div>
                ) : (
                  <p className="font-body text-xs text-center py-2" style={{ color: '#555' }}>Sign in to leave a comment</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

/* ─── Home Feed ─── */
const POSTS_PER_PAGE = 25;

export default function Home() {
  const { user } = useAuth()
  const { posts } = usePosts()
  const { joined, count } = useJoinedSubcommittees(user?.id)
  const [subNamesToIds, setSubNamesToIds] = useState<Record<string, string>>({})

  /* Build mapping of subcommittee names → IDs for backward compat */
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const cid of getAllCommunities()) {
      for (const sub of getSubcommittees(cid)) {
        map[sub.name.toLowerCase()] = sub.id
      }
    }
    setSubNamesToIds(map)
  }, [])

  /* Filter: only posts from joined subcommittees */
  const feedPosts = useMemo(() => {
    if (count === 0) return []
    return posts
      .filter((p) => {
        // Check 1: communityTag is a joined subcommittee ID
        if (joined.has(p.communityTag)) return true
        // Check 2: communityTag is a subcommittee name (old posts)
        const subId = subNamesToIds[p.communityTag.toLowerCase()]
        if (subId && joined.has(subId)) return true
        return false
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, POSTS_PER_PAGE)
  }, [posts, joined, count, subNamesToIds])

  if (user && count > 0) {
    return (
      <div className="min-h-[100dvh] px-4 pt-4 pb-20" style={{ backgroundColor: '#000000', overflowX: 'hidden', touchAction: 'pan-y' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-lg tracking-wider" style={{ color: '#ffffff' }}>YOUR FEED</h1>
          <span className="font-body text-xs" style={{ color: '#666666' }}>{feedPosts.length} posts</span>
        </div>
        {feedPosts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {feedPosts.map((post) => <FeedPostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 rounded-lg" style={{ backgroundColor: '#111111', border: '1px dashed #222222' }}>
            <Users size={40} style={{ color: '#444444', marginBottom: 12 }} />
            <p className="font-body text-sm text-center px-6" style={{ color: '#666666' }}>No posts yet from your subcommittees.</p>
          </div>
        )}
      </div>
    )
  }

  if (user && count === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pb-20" style={{ backgroundColor: '#000000', overflowX: 'hidden', touchAction: 'pan-y' }}>
        <Users size={56} style={{ color: '#333333', marginBottom: 20 }} />
        <h2 className="font-display text-xl tracking-wider mb-2" style={{ color: '#ffffff' }}>YOUR FEED IS EMPTY</h2>
        <p className="font-body text-sm text-center mb-8 max-w-[280px]" style={{ color: '#666666' }}>Join subcommittees to see posts from people who share your niche interest.</p>
        <Link to="/explore" className="flex items-center gap-2 font-body font-semibold text-white px-8 py-3 rounded-lg" style={{ backgroundColor: '#d93a3a' }}>
          <Compass size={18} /> Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pb-20" style={{ backgroundColor: '#000000', overflowX: 'hidden', touchAction: 'pan-y' }}>
      <h1 className="font-display text-3xl tracking-wider mb-3 text-center" style={{ color: '#ffffff' }}>HOBBYHUB</h1>
      <p className="font-body text-sm text-center mb-8 max-w-[280px]" style={{ color: '#666666' }}>The community for hobby enthusiasts. Find your niche, share your passion.</p>
      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <Link to="/signup" className="flex items-center justify-center gap-2 font-body font-semibold text-white px-8 py-3 rounded-lg" style={{ backgroundColor: '#d93a3a' }}>Get Started</Link>
        <Link to="/login" className="flex items-center justify-center gap-2 font-body font-semibold px-8 py-3 rounded-lg" style={{ color: '#aaaaaa', border: '1px solid #333333' }}>Sign In</Link>
      </div>
    </div>
  )
}
