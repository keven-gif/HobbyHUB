import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchFounderUpdates, createFounderUpdate, deleteFounderUpdate } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Avatar from '@/components/Avatar';
import { ArrowLeft, Megaphone, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Updates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchFounderUpdates()
      .then(setUpdates)
      .catch(() => toast.error('Failed to load updates'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handlePost = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createFounderUpdate({
        author_id: user.id,
        author_name: user.name || user.username,
        author_avatar: user.avatar,
        title: title.trim(),
        content: content.trim(),
      });
      setUpdates((prev) => [created, ...prev]);
      setTitle('');
      setContent('');
      setShowForm(false);
      toast.success('Update posted!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this update?')) return;
    try {
      await deleteFounderUpdate(id);
      setUpdates((prev) => prev.filter((u) => u.id !== id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 font-body text-xs mb-4"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={20} style={{ color: 'var(--accent-primary)' }} />
        <h1 className="font-display text-xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
          From the Founder
        </h1>
      </div>
      <p className="font-body text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Follow along as HobbyHub gets built, one update at a time.
      </p>

      {user?.isAdmin && (
        <div className="mb-6">
          {showForm ? (
            <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Update title" disabled={isSubmitting} />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's new?"
                className="min-h-[140px]"
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <Button onClick={handlePost} disabled={isSubmitting || !title.trim() || !content.trim()} className="flex-1">
                  {isSubmitting ? 'Posting...' : 'Post Update'}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 font-body text-xs font-medium px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
            >
              <Plus size={14} /> New Update
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)' }}>
          <Megaphone size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No updates yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <div key={u.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Avatar src={u.author_avatar} name={u.author_name} size={26} />
                  <div>
                    <p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{u.author_name}</p>
                    <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</p>
                  </div>
                </div>
                {user?.isAdmin && (
                  <button onClick={() => handleDelete(u.id)} className="p-1" style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <h2 className="font-body text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{u.title}</h2>
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {u.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
