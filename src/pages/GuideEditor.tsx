import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { fetchWikiArticle, createWikiArticle, updateWikiArticle } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'guide', label: 'Guide / How-To' },
  { value: 'review', label: 'Gear Review' },
  { value: 'tutorial', label: 'Tutorial' },
];

export default function GuideEditor() {
  const { id: communityId, guideId } = useParams<{ id: string; guideId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');
  const isEditing = !!guideId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('guide');
  const [subcommitteeId, setSubcommitteeId] = useState<string>('none');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [ownerCheckFailed, setOwnerCheckFailed] = useState(false);

  useEffect(() => {
    if (!isEditing || !guideId) return;
    let cancelled = false;
    fetchWikiArticle(guideId)
      .then((article) => {
        if (cancelled) return;
        if (article.author_id !== user?.id) {
          setOwnerCheckFailed(true);
          return;
        }
        setTitle(article.title);
        setContent(article.content);
        setCategory(article.category);
        setSubcommitteeId(article.subcommittee_id || 'none');
        setTagsInput((article.tags || []).join(', '));
      })
      .catch(() => toast.error('Failed to load guide'))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [guideId, isEditing, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !communityId) return;
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8);

    setIsSubmitting(true);
    try {
      if (isEditing && guideId) {
        await updateWikiArticle(guideId, {
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
          subcommittee_id: subcommitteeId === 'none' ? undefined : subcommitteeId,
        });
        toast.success('Guide updated!');
        navigate(`/community/${communityId}/guides/${guideId}`);
      } else {
        const created = await createWikiArticle({
          community_id: communityId,
          subcommittee_id: subcommitteeId === 'none' ? undefined : subcommitteeId,
          category,
          title: title.trim(),
          content: content.trim(),
          tags,
          author_id: user.id,
          author_name: user.name || user.username,
          author_avatar: user.avatar,
        });
        toast.success('Guide published!');
        navigate(`/community/${communityId}/guides/${created.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save guide');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (ownerCheckFailed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          You can only edit guides you authored.
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(`/community/${communityId}`)}>
          Back to community
        </Button>
      </div>
    );
  }

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
        {isEditing ? 'Edit Guide' : 'New Guide'}
      </h1>
      <p className="font-body text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Posting to {community.name}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Beginner's guide to panel lining"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. weathering, airbrush, beginner"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your guide, review, or tutorial here..."
            className="min-h-[280px]"
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Guide'}
        </Button>
      </form>
    </div>
  );
}
