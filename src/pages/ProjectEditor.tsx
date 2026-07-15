import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { createProject } from '@/lib/supabaseQueries';
import { pickFile } from '@/lib/filePicker';
import { compressImage } from '@/lib/imageCompress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectEditor() {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [subcommitteeId, setSubcommitteeId] = useState<string>('none');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      setCoverImage(compressed);
    } catch {
      toast.error('Failed to process image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !communityId) return;
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject({
        community_id: communityId,
        subcommittee_id: subcommitteeId === 'none' ? undefined : subcommitteeId,
        author_id: user.id,
        author_name: user.name || user.username,
        author_avatar: user.avatar,
        title: title.trim(),
        description: description.trim(),
        status,
        cover_image: coverImage || undefined,
      });
      toast.success('Project started!');
      navigate(`/community/${communityId}/projects/${created.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create project');
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
        New Project
      </h1>
      <p className="font-body text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Track your progress in {community.name} from start to finish
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Cover Image (optional)</Label>
          {coverImage ? (
            <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickImage}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg font-body text-xs"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Camera size={22} />
              Add a cover photo
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Project Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. RX-78-2 Gundam full custom build"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
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
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building? What's the plan?"
            className="min-h-[160px]"
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Start Project'}
        </Button>
      </form>
    </div>
  );
}
