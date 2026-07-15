import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { fetchWikiArticle, deleteWikiArticle, toggleWikiArticleReport, toggleWikiArticleUpvote } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import { ArrowLeft, Pencil, Trash2, BookOpen, Flag, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'Guide',
  review: 'Review',
  tutorial: 'Tutorial',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function GuideDetail() {
  const { id: communityId, guideId } = useParams<{ id: string; guideId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');

  const [article, setArticle] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guideId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchWikiArticle(guideId)
      .then((data) => { if (!cancelled) setArticle(data); })
      .catch(() => { if (!cancelled) setError('This guide could not be found.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [guideId]);

  const handleDelete = async () => {
    if (!article || !window.confirm('Delete this guide? This cannot be undone.')) return;
    try {
      await deleteWikiArticle(article.id);
      toast.success('Guide deleted');
      navigate(`/community/${communityId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete guide');
    }
  };

  const handleReport = async () => {
    if (!user || !article) return;
    try {
      const next = await toggleWikiArticleReport(article.id, user.id, article.reported_by || []);
      setArticle({ ...article, reported_by: next });
      toast.success(next.includes(user.id) ? 'Reported' : 'Report removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to report guide');
    }
  };

  const handleUpvote = async () => {
    if (!user || !article) return;
    try {
      const next = await toggleWikiArticleUpvote(article.id, user.id, article.upvoted_by || []);
      setArticle({ ...article, upvoted_by: next });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upvote guide');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <BookOpen size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{error || 'Guide not found.'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(`/community/${communityId}`)}>
          Back to community
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === article.author_id;
  const subName = subs.find((s) => s.id === article.subcommittee_id)?.name;
  const upvotedBy: string[] = article.upvoted_by || [];
  const reportedBy: string[] = article.reported_by || [];
  const isUpvoted = user ? upvotedBy.includes(user.id) : false;
  const isReported = user ? reportedBy.includes(user.id) : false;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <Link
          to={`/community/${communityId}`}
          className="flex items-center gap-1.5 font-body text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} /> {community.name}
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={handleUpvote}
              className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded"
              style={{ color: isUpvoted ? community.accentColor : 'var(--text-muted)' }}
            >
              <ThumbsUp size={13} fill={isUpvoted ? community.accentColor : 'none'} /> {upvotedBy.length}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => navigate(`/community/${communityId}/guides/${article.id}/edit`)}
                className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
          {!isOwner && user && (
            <button
              onClick={handleReport}
              className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded"
              style={{ color: isReported ? '#ef4444' : 'var(--text-muted)' }}
            >
              <Flag size={13} fill={isReported ? '#ef4444' : 'none'} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="font-body text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ backgroundColor: `${community.accentColor}22`, color: community.accentColor }}
        >
          {CATEGORY_LABELS[article.category] || article.category}
        </span>
        {subName && (
          <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a1a1a', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            {subName}
          </span>
        )}
      </div>

      <h1 className="font-display text-2xl tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
        {article.title}
      </h1>

      <div className="flex items-center gap-2 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Avatar src={article.author_avatar} name={article.author_name} size={28} />
        <div>
          <p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{article.author_name}</p>
          <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatDate(article.updated_at)}
            {article.updated_at !== article.created_at ? ' (edited)' : ''}
          </p>
        </div>
      </div>

      <div
        className="font-body text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        {article.content}
      </div>

      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {article.tags.map((tag: string) => (
            <span
              key={tag}
              className="font-body text-[10px] px-2 py-0.5 rounded"
              style={{ backgroundColor: '#1a1a1a', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
