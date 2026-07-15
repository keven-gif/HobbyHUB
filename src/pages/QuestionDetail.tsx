import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { fetchQuestion, updateQuestionAnswers, deleteQuestion } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import { ArrowLeft, Trash2, CheckCircle2, HelpCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function QuestionDetail() {
  const { id: communityId, questionId } = useParams<{ id: string; questionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');

  const [question, setQuestion] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    if (!questionId) return;
    setIsLoading(true);
    fetchQuestion(questionId)
      .then(setQuestion)
      .catch(() => setError('This question could not be found.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [questionId]);

  const handleAnswer = async () => {
    if (!user || !question || !answerText.trim()) return;
    const newAnswer = {
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      user: user.name || user.username,
      avatar: user.avatar,
      content: answerText.trim(),
      createdAt: Date.now(),
      isAccepted: false,
    };
    const nextAnswers = [...(question.answers || []), newAnswer];
    setIsSubmitting(true);
    try {
      await updateQuestionAnswers(question.id, nextAnswers, question.is_resolved);
      setQuestion({ ...question, answers: nextAnswers });
      setAnswerText('');
      toast.success('Answer posted!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (answerId: string) => {
    if (!question || user?.id !== question.author_id) return;
    const nextAnswers = (question.answers || []).map((a: any) => ({ ...a, isAccepted: a.id === answerId }));
    try {
      await updateQuestionAnswers(question.id, nextAnswers, true);
      setQuestion({ ...question, answers: nextAnswers, is_resolved: true });
      toast.success('Marked as accepted answer');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept answer');
    }
  };

  const handleDelete = async () => {
    if (!question || !window.confirm('Delete this question? This cannot be undone.')) return;
    try {
      await deleteQuestion(question.id);
      toast.success('Question deleted');
      navigate(`/community/${communityId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete question');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <HelpCircle size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{error || 'Question not found.'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(`/community/${communityId}`)}>
          Back to community
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === question.author_id;
  const subName = subs.find((s) => s.id === question.subcommittee_id)?.name;
  const answers = [...(question.answers || [])].sort((a: any, b: any) => (b.isAccepted ? 1 : 0) - (a.isAccepted ? 1 : 0));

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
        {isOwner && (
          <button onClick={handleDelete} className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="font-body text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{
            backgroundColor: question.is_resolved ? '#39ff1422' : `${community.accentColor}22`,
            color: question.is_resolved ? '#39ff14' : community.accentColor,
          }}
        >
          {question.is_resolved ? 'Resolved' : 'Unanswered'}
        </span>
        {subName && (
          <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a1a1a', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            {subName}
          </span>
        )}
      </div>

      <h1 className="font-display text-xl tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
        {question.title}
      </h1>

      <div className="flex items-center gap-2 mb-4">
        <Avatar src={question.author_avatar} name={question.author_name} size={26} />
        <div>
          <p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{question.author_name}</p>
          <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(new Date(question.created_at).getTime())}</p>
        </div>
      </div>

      <p className="font-body text-sm leading-relaxed whitespace-pre-wrap mb-8 pb-8" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        {question.body}
      </p>

      <h2 className="font-body text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
      </h2>

      <div className="space-y-3 mb-6">
        {answers.map((a: any) => (
          <div
            key={a.id}
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: a.isAccepted ? '1px solid #39ff14' : '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start gap-2">
              <Avatar src={a.avatar} name={a.user} size={26} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.user}</span>
                  <span className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(a.createdAt)}</span>
                  {a.isAccepted && (
                    <span className="flex items-center gap-1 font-body text-[10px]" style={{ color: '#39ff14' }}>
                      <CheckCircle2 size={12} /> Accepted
                    </span>
                  )}
                </div>
                <p className="font-body text-sm leading-relaxed whitespace-pre-wrap mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {a.content}
                </p>
                {isOwner && !a.isAccepted && (
                  <button
                    onClick={() => handleAccept(a.id)}
                    className="font-body text-[11px] mt-2"
                    style={{ color: community.accentColor }}
                  >
                    Mark as accepted answer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {answers.length === 0 && (
          <p className="font-body text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
            No answers yet. Be the first to help.
          </p>
        )}
      </div>

      {user ? (
        <div className="flex items-start gap-2">
          <Avatar src={user.avatar} name={user.name} size={32} />
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && answerText.trim() && handleAnswer()}
              placeholder="Write an answer..."
              disabled={isSubmitting}
              className="flex-1 font-body text-sm px-4 py-3 rounded-full outline-none min-h-[44px]"
              style={{ backgroundColor: '#1a1a1a', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
            <button
              onClick={handleAnswer}
              disabled={isSubmitting || !answerText.trim()}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full active:scale-95 flex-shrink-0"
              style={{ backgroundColor: answerText.trim() ? community.accentColor : '#222' }}
            >
              <Send size={14} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>
      ) : (
        <p className="font-body text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Sign in to answer</p>
      )}
    </div>
  );
}
