import { useState, useMemo, memo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Users, Flame, MessageCircle, Bookmark, Flag, Send, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/context/AuthContext'
import { usePosts } from '@/context/PostContext'
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees'
import { getAllCommunities, getSubcommittees } from '@/data/communityData'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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

/* ─── Full-bleed feed post card — fills the entire swipe screen ─── */
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
  const isVideo = post.image && (post.image.startsWith('data:video/') || post.image.match(/\.(mp4|mov|webm)(\?|$)/i))

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
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Media fills the entire card */}
      {post.image ? (
        isVideo ? (
          <video
            src={post.image}
            controls
            preload="metadata"
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img src={post.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{ background: 'radial-gradient(circle at 30% 20%, #1a1a1a 0%, #000000 75%)' }}
        >
          <p className="font-body text-lg leading-relaxed text-center" style={{ color: '#cccccc' }}>{post.content}</p>
        </div>
      )}

      {/* Top gradient + header */}
      <div
        className="absolute top-0 inset-x-0 p-4 flex items-center gap-3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
      >
        <button onClick={() => navigate(`/profile?userId=${post.userId}`)} className="flex-shrink-0 pointer-events-auto" style={{ touchAction: 'manipulation' }}>
          <Avatar src={post.avatar} name={post.user} size={36} />
        </button>
        <div className="flex-1 min-w-0 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/profile?userId=${post.userId}`)} className="font-body text-sm font-semibold truncate" style={{ color: '#ffffff', touchAction: 'manipulation' }}>{post.user}</button>
            {post.clanName && (
              <span className="font-body text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#d93a3a33', color: '#ff8080', fontWeight: 600 }}>{post.clanName}</span>
            )}
          </div>
          <span className="font-body text-[11px]" style={{ color: '#dddddd' }}>{post.communityTag} &middot; {timeAgo(post.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1 pointer-events-auto" style={{ touchAction: 'manipulation' }}>
          {isOwner && (
            <button
              onClick={() => deletePost(post.id)}
              className="flex items-center justify-center min-h-[36px] min-w-[36px] rounded-full active:scale-90"
              style={{ color: '#ff8080', WebkitTapHighlightColor: 'transparent' }}
              title="Delete your post"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={() => {
              if (!currentUserId) return;
              reportPost(post.id, currentUserId).catch((err: any) => toast.error(err?.message || 'Report failed'));
            }}
            className="flex items-center justify-center min-h-[36px] min-w-[36px] rounded-full active:scale-90"
            style={{ color: isReported ? '#ff8080' : '#eeeeee', WebkitTapHighlightColor: 'transparent' }}
          >
            <Flag size={16} fill={isReported ? '#ff8080' : 'none'} />
          </button>
        </div>
      </div>

      {/* Bottom gradient + caption + actions */}
      <div
        className="absolute bottom-0 inset-x-0 pt-16 p-4 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 55%, transparent 100%)' }}
      >
        <div className="pointer-events-auto max-h-[45vh] overflow-y-auto">
          {post.title && <h3 className="font-body text-sm font-semibold mb-1" style={{ color: '#ffffff' }}>{post.title}</h3>}
          {post.image && <p className="font-body text-[13px] leading-relaxed mb-3" style={{ color: '#eeeeee' }}>{post.content}</p>}

          {/* Action Buttons — 44px min tap targets for mobile */}
          <div className="flex items-center gap-1" style={{ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}>
            {/* Like (Fire) */}
            <button
              onClick={() => {
                if (!currentUserId) return;
                toggleLike(post.id, currentUserId).catch((err: any) => toast.error(err?.message || 'Like failed'));
              }}
              className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-all duration-200 active:scale-90"
              style={{ color: isLiked ? '#ff5c5c' : '#eeeeee', WebkitTapHighlightColor: 'transparent' }}
            >
              <Flame size={18} fill={isLiked ? '#ff5c5c' : 'none'} />
              <span>{post.likedBy.length}</span>
            </button>

            {/* Comment — opens bottom sheet */}
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1.5 font-body text-xs min-h-[44px] min-w-[44px] px-2 rounded-lg transition-colors active:scale-90"
              style={{ color: '#eeeeee', WebkitTapHighlightColor: 'transparent' }}
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
              style={{ color: isSaved ? '#f5a623' : '#eeeeee', WebkitTapHighlightColor: 'transparent' }}
            >
              <Bookmark size={18} fill={isSaved ? '#f5a623' : 'none'} />
              <span>{post.savedBy.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments — bottom sheet overlay so it never breaks the full-bleed card layout */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="max-h-[75vh] flex flex-col p-0">
          <SheetHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <SheetTitle>Comments ({post.comments.length})</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {post.comments.length > 0 ? (
              <div className="space-y-3">
                {post.comments.filter((c: any) => !c.parentId).map((topLevel: any) => (
                  <div key={topLevel.id}>
                    {/* Top-level comment */}
                    <div className="flex items-start gap-2">
                      <Avatar src={topLevel.avatar} name={topLevel.user} size={24} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{topLevel.user}</span>
                          <span className="font-body text-[9px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(topLevel.createdAt)}</span>
                        </div>
                        <p className="font-body text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topLevel.content}</p>
                        {currentUserId && (
                          <button
                            onClick={() => handleReply(topLevel.id, topLevel.user)}
                            className="font-body text-[10px] mt-0.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Replies */}
                    {post.comments.filter((r: any) => r.parentId === topLevel.id).map((reply: any) => (
                      <div key={reply.id} className="flex items-start gap-2 ml-6 mt-2" style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: '8px' }}>
                        <Avatar src={reply.avatar} name={reply.user} size={20} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{reply.user}</span>
                            <span className="font-body text-[10px]" style={{ color: '#d93a3a' }}>@{reply.replyToName}</span>
                            <span className="font-body text-[9px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="font-body text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{reply.content}</p>
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
                          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        />
                        <button
                          onClick={handleSubmitReply}
                          disabled={!replyText.trim()}
                          className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full"
                          style={{ backgroundColor: replyText.trim() ? '#d93a3a' : 'var(--bg-surface)' }}
                        >
                          <Send size={12} style={{ color: '#fff' }} />
                        </button>
                        <button
                          onClick={handleCancelReply}
                          className="font-body text-[10px] px-2 py-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first.</p>
            )}
          </div>

          <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            {currentUserId ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Write a comment..."
                  className="flex-1 font-body text-sm px-4 py-3 rounded-full outline-none min-h-[44px]"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full active:scale-90"
                  style={{
                    backgroundColor: commentText.trim() ? '#d93a3a' : 'var(--bg-surface)',
                    opacity: commentText.trim() ? 1 : 0.4,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Send size={14} style={{ color: '#fff' }} />
                </button>
              </div>
            ) : (
              <p className="font-body text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Sign in to leave a comment</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

/* ─── Horizontal swipe pager — one full-screen post at a time ─── */
const swipeConfidenceThreshold = 80;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

function FeedSwiper({ posts }: { posts: any[] }) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
  const clampedIndex = Math.min(index, Math.max(0, posts.length - 1));
  const post = posts[clampedIndex];

  const paginate = (newDirection: number) => {
    setPage(([prevIndex]) => {
      const next = prevIndex + newDirection;
      if (next < 0 || next >= posts.length) return [prevIndex, 0];
      return [next, newDirection];
    });
  };

  if (!post) return null;

  return (
    <div className="relative h-full w-full" style={{ touchAction: 'pan-y' }}>
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={post.id}
          className="absolute inset-0"
          initial={{ x: direction > 0 ? 80 : direction < 0 ? -80 : 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
          transition={{ duration: 0.22, ease: easeOutExpo }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={(_: any, info: any) => {
            const swipe = swipePower(info.offset.x, info.velocity.x);
            if (swipe < -swipeConfidenceThreshold) paginate(1);
            else if (swipe > swipeConfidenceThreshold) paginate(-1);
          }}
        >
          <FeedPostCard post={post} />
        </motion.div>
      </AnimatePresence>

      {/* Prev/Next fallback for non-touch input */}
      {clampedIndex > 0 && (
        <button
          onClick={() => paginate(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {clampedIndex < posts.length - 1 && (
        <button
          onClick={() => paginate(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Position counter */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full font-body text-[11px]"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff' }}
      >
        {clampedIndex + 1} / {posts.length}
      </div>
    </div>
  );
}

/* ─── Home Feed ─── */
const POSTS_PER_PAGE = 25;

/* The bottom nav is fixed/out-of-flow and only shows below the `sm`
   breakpoint, so the reserved space for it must be conditional too —
   percentage/flex heights don't reliably cascade through the nested
   absolutely-positioned swiper layers on real mobile browsers, so this
   computes an explicit height instead (same calc+env pattern already
   used in Navbar/Layout). */
function useFeedScreenHeight(): string {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return `calc(100dvh - 72px - env(safe-area-inset-top, 0px)${isDesktop ? '' : ' - 56px'})`
}

export default function Home() {
  const { user } = useAuth()
  const { posts } = usePosts()
  const { joined, count } = useJoinedSubcommittees(user?.id)
  const [subNamesToIds, setSubNamesToIds] = useState<Record<string, string>>({})
  const feedScreenHeight = useFeedScreenHeight()

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
      <div className="flex flex-col overflow-hidden" style={{ height: feedScreenHeight, backgroundColor: '#000000' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
          <h1 className="font-display text-lg tracking-wider" style={{ color: '#ffffff' }}>YOUR FEED</h1>
          <span className="font-body text-xs" style={{ color: '#666666' }}>{feedPosts.length} posts</span>
        </div>
        {feedPosts.length > 0 ? (
          <div className="flex-1 min-h-0">
            <FeedSwiper posts={feedPosts} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center mx-4 mb-4 rounded-lg" style={{ backgroundColor: '#111111', border: '1px dashed #222222' }}>
            <Users size={40} style={{ color: '#444444', marginBottom: 12 }} />
            <p className="font-body text-sm text-center px-6" style={{ color: '#666666' }}>No posts yet from your subcommittees.</p>
          </div>
        )}
      </div>
    )
  }

  if (user && count === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6" style={{ height: feedScreenHeight, backgroundColor: '#000000' }}>
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
    <div className="flex flex-col items-center justify-center px-6" style={{ height: feedScreenHeight, backgroundColor: '#000000' }}>
      <h1 className="font-display text-3xl tracking-wider mb-3 text-center" style={{ color: '#ffffff' }}>HOBBYHUB</h1>
      <p className="font-body text-sm text-center mb-8 max-w-[280px]" style={{ color: '#666666' }}>The community for hobby enthusiasts. Find your niche, share your passion.</p>
      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <Link to="/signup" className="flex items-center justify-center gap-2 font-body font-semibold text-white px-8 py-3 rounded-lg" style={{ backgroundColor: '#d93a3a' }}>Get Started</Link>
        <Link to="/login" className="flex items-center justify-center gap-2 font-body font-semibold px-8 py-3 rounded-lg" style={{ color: '#aaaaaa', border: '1px solid #333333' }}>Sign In</Link>
      </div>
    </div>
  )
}
