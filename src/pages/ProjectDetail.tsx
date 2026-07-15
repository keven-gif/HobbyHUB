import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getCommunity, getSubcommittees } from '@/data/communityData';
import { fetchProject, updateProject, deleteProject, toggleProjectReport } from '@/lib/supabaseQueries';
import { pickFile } from '@/lib/filePicker';
import { compressImage } from '@/lib/imageCompress';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Trash2, Camera, X, Wrench, Flag } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  planning: '#f1c40f',
  in_progress: '#3a8cff',
  done: '#39ff14',
};

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProjectDetail() {
  const { id: communityId, projectId } = useParams<{ id: string; projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const community = getCommunity(communityId || '');
  const subs = getSubcommittees(communityId || '');

  const [project, setProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [updateImage, setUpdateImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetchProject(projectId)
      .then(setProject)
      .catch(() => setError('This project could not be found.'))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const isOwner = user?.id === project?.author_id;

  const handleStatusChange = async (newStatus: string) => {
    if (!project || !isOwner) return;
    try {
      const updated = await updateProject(project.id, { status: newStatus, updates: project.updates });
      setProject(updated);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handlePickImage = async () => {
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      setUpdateImage(compressed);
    } catch {
      toast.error('Failed to process image');
    }
  };

  const handlePostUpdate = async () => {
    if (!project || !isOwner || (!updateText.trim() && !updateImage)) return;
    const newUpdate = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content: updateText.trim(),
      image: updateImage || undefined,
      createdAt: Date.now(),
    };
    const nextUpdates = [newUpdate, ...(project.updates || [])];
    setIsSubmitting(true);
    try {
      const updated = await updateProject(project.id, { status: project.status, updates: nextUpdates });
      setProject(updated);
      setUpdateText('');
      setUpdateImage('');
      toast.success('Progress update posted!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
      navigate(`/community/${communityId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete project');
    }
  };

  const handleReport = async () => {
    if (!user || !project) return;
    try {
      const next = await toggleProjectReport(project.id, user.id, project.reported_by || []);
      setProject({ ...project, reported_by: next });
      toast.success(next.includes(user.id) ? 'Reported' : 'Report removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to report project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <Wrench size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{error || 'Project not found.'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(`/community/${communityId}`)}>
          Back to community
        </Button>
      </div>
    );
  }

  const subName = subs.find((s) => s.id === project.subcommittee_id)?.name;

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
        {isOwner ? (
          <button onClick={handleDelete} className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>
            <Trash2 size={13} /> Delete
          </button>
        ) : user && (
          <button
            onClick={handleReport}
            className="flex items-center gap-1 font-body text-xs px-2 py-1 rounded"
            style={{ color: (project.reported_by || []).includes(user.id) ? '#ef4444' : 'var(--text-muted)' }}
          >
            <Flag size={13} fill={(project.reported_by || []).includes(user.id) ? '#ef4444' : 'none'} />
          </button>
        )}
      </div>

      {project.cover_image && (
        <div className="rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
          <img src={project.cover_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isOwner ? (
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-auto h-auto py-1 px-2 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span
            className="font-body text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ backgroundColor: `${STATUS_COLORS[project.status]}22`, color: STATUS_COLORS[project.status] }}
          >
            {STATUS_LABELS[project.status] || project.status}
          </span>
        )}
        {subName && (
          <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a1a1a', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            {subName}
          </span>
        )}
      </div>

      <h1 className="font-display text-xl tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
        {project.title}
      </h1>

      <div className="flex items-center gap-2 mb-4">
        <Avatar src={project.author_avatar} name={project.author_name} size={26} />
        <div>
          <p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{project.author_name}</p>
          <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>Started {timeAgo(new Date(project.created_at).getTime())}</p>
        </div>
      </div>

      <p className="font-body text-sm leading-relaxed whitespace-pre-wrap mb-8 pb-8" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        {project.description}
      </p>

      {isOwner && (
        <div className="p-3 rounded-lg mb-6 space-y-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="font-body text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Post a progress update</p>
          <textarea
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder="What's new since the last update?"
            className="w-full font-body text-sm px-3 py-2 rounded-lg outline-none min-h-[80px] resize-none"
            style={{ backgroundColor: '#1a1a1a', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            disabled={isSubmitting}
          />
          {updateImage ? (
            <div className="relative rounded-lg overflow-hidden w-32">
              <img src={updateImage} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setUpdateImage('')}
                className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickImage}
              className="flex items-center gap-1.5 font-body text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <Camera size={13} /> Add photo
            </button>
          )}
          <Button
            onClick={handlePostUpdate}
            disabled={isSubmitting || (!updateText.trim() && !updateImage)}
            className="w-full"
          >
            {isSubmitting ? 'Posting...' : 'Post Update'}
          </Button>
        </div>
      )}

      <h2 className="font-body text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        Progress Log
      </h2>

      {(!project.updates || project.updates.length === 0) ? (
        <p className="font-body text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
          No updates yet.
        </p>
      ) : (
        <div className="space-y-4" style={{ borderLeft: '2px solid var(--border-subtle)', marginLeft: 6 }}>
          {project.updates.map((u: any) => (
            <div key={u.id} className="pl-4 relative">
              <div
                className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: community.accentColor }}
              />
              <p className="font-body text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(u.createdAt)}</p>
              {u.content && (
                <p className="font-body text-sm leading-relaxed whitespace-pre-wrap mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {u.content}
                </p>
              )}
              {u.image && (
                <div className="rounded-lg overflow-hidden w-full max-w-sm">
                  <img src={u.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
