import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { createQuestion } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AskQuestion() {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subcommitteeId, setSubcommitteeId] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !communityId) return;
    if (!title.trim() || !body.trim()) {
      toast.error('Title and details are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createQuestion({
        community_id: communityId,
        subcommittee_id: subcommitteeId === 'none' ? undefined : subcommitteeId,
        author_id: user.id,
        author_name: user.name || user.username,
        author_avatar: user.avatar,
        title: title.trim(),
        body: body.trim(),
      });
      toast.success('Question posted!');
      navigate(`/community/${communityId}/questions/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post question');
    } finally {
      setIsSubmitting(false);
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

      <h1 className="font-display text-xl tracking-wide mb-1" style={{ color: 'var(--text-primary)' }}>
        Ask a Question
      </h1>
      <p className="font-body text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Posting to {community.name} — no question is too basic.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Question</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. What glue works best for clear parts?"
            disabled={isSubmitting}
          />
        </div>

        {subs.length > 0 && (
          <div className="space-y-1.5">
            <Label>Subcommittee (optional)</Label>
            <Select value={subcommitteeId} onValueChange={setSubcommitteeId} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General</SelectItem>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="body">Details</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add any details that would help someone answer well..."
            className="min-h-[200px]"
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Question'}
        </Button>
      </form>
    </div>
  );
}
