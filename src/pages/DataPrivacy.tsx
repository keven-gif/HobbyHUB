import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { exportUserData, deleteAllUserContent } from '@/lib/supabaseQueries';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function DataPrivacy() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const data = await exportUserData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hobbyhub-data-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Your data has been downloaded');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export your data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!user) return;
    if (!window.confirm('Delete all posts, guides, questions, and projects you\'ve created? This cannot be undone.')) return;
    if (!window.confirm('This is permanent. Are you absolutely sure?')) return;
    setIsDeleting(true);
    try {
      await deleteAllUserContent(user.id);
      toast.success('Your content has been deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete your content');
    } finally {
      setIsDeleting(false);
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
        <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
        <h1 className="font-display text-xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Privacy & Data
        </h1>
      </div>
      <p className="font-body text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Your data belongs to you. Download or remove what HobbyHub has stored about you.
      </p>

      <div className="space-y-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-body text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Export your data</h2>
          <p className="font-body text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Download a JSON file of your profile, posts, guides, questions, projects, subcommittee joins, mentor listing, and friend requests.
          </p>
          <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
            <Download size={14} className="mr-1.5" /> {isExporting ? 'Preparing...' : 'Download my data'}
          </Button>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
          <h2 className="font-body text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>Delete my content</h2>
          <p className="font-body text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Permanently deletes every post, guide, question, and project you've created. Your account and profile stay intact.
          </p>
          <Button onClick={handleDeleteContent} disabled={isDeleting} variant="destructive" className="w-full sm:w-auto">
            <Trash2 size={14} className="mr-1.5" /> {isDeleting ? 'Deleting...' : 'Delete all my content'}
          </Button>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <h2 className="font-body text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Delete your account</h2>
          <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
            Full account deletion requires manual action from an admin. Delete your content above first, then{' '}
            <button onClick={() => { navigate('/support'); }} className="underline" style={{ color: 'var(--accent-primary)' }}>
              contact support
            </button>{' '}
            to close your account.
          </p>
        </div>
      </div>

      {user && (
        <p className="font-body text-[10px] text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          Signed in as {user.email}. Not you?{' '}
          <button onClick={() => { logout(); navigate('/login'); }} className="underline">Sign out</button>
        </p>
      )}
    </div>
  );
}
