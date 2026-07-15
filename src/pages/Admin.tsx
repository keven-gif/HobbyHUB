import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, FileText, Flag, Trash2, ArrowLeft,
  TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Search, Image, ChevronDown, ChevronUp, Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostContext';
import { useCommunity } from '@/context/CommunityContext';
import { pickFile, fileToBase64 } from '@/lib/filePicker';
import type { Subcommittee } from '@/data/communityData';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  clearPostReports,
  fetchAllWikiArticles, deleteWikiArticle, clearWikiArticleReports,
  fetchAllQuestions, deleteQuestion, clearQuestionReports,
  fetchAllProjects, deleteProject, clearProjectReports,
} from '@/lib/supabaseQueries';

const ADMIN_EMAIL = 'roninonedigital@gmail.com';
type TabKey = 'overview' | 'users' | 'posts' | 'reports' | 'communities';

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function loadAllUsers() {
  const { data, error } = await supabase!.from('profiles').select('*').order('name');
  if (error || !data) return [];
  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    clanName: u.clan_name,
    bio: u.bio,
    isAdmin: u.is_admin,
  }));
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="rounded-lg p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <p className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

/* ─── Image Upload Row ─── */
function ImageRow({ label, imageUrl, fallbackColor, onFile }: { label: string; imageUrl: string; fallbackColor: string; onFile: (f: File) => void }) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 text-left w-full active:scale-[0.98]"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      onClick={async () => { const f = await pickFile('image/*'); if (f) onFile(f); }}
    >
      <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ backgroundColor: fallbackColor + '20' }}>
            <Image size={20} style={{ color: fallbackColor }} />
          </div>
        )}
        {/* Camera overlay so users KNOW to tap */}
        <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center rounded-b-lg" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Camera size={10} color="#fff" />
        </div>
      </div>
      <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════ */
export default function Admin() {
  const { user } = useAuth();
  const { posts, deletePost } = usePosts();
  const {
    communities,
    updateCommunityCover,
    updateSubcommitteeImage,
    addCommunity,
    addSubcommittee,
    removeSubcommittee,
  } = useCommunity();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddCommunity, setShowAddCommunity] = useState(false);
  const [showAddSub, setShowAddSub] = useState<string | null>(null);
  const [newC, setNewC] = useState({ name: '', description: '', accentColor: '#d93a3a' });
  const [newS, setNewS] = useState({ name: '', description: '' });

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const reportedPosts = useMemo(() => posts.filter((p) => (p.reportedBy?.length || 0) > 0), [posts]);

  const [guides, setGuides] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const reportedGuides = useMemo(() => guides.filter((g) => (g.reported_by?.length || 0) > 0), [guides]);
  const reportedQuestions = useMemo(() => questions.filter((q) => (q.reported_by?.length || 0) > 0), [questions]);
  const reportedProjects = useMemo(() => projects.filter((p) => (p.reported_by?.length || 0) > 0), [projects]);
  const totalReports = reportedPosts.length + reportedGuides.length + reportedQuestions.length + reportedProjects.length;

  const loadModerationContent = () => {
    fetchAllWikiArticles().then(setGuides).catch(() => {});
    fetchAllQuestions().then(setQuestions).catch(() => {});
    fetchAllProjects().then(setProjects).catch(() => {});
  };

  useEffect(() => {
    loadAllUsers().then(setAllUsers);
    loadModerationContent();
  }, []);

  const onDel = (id: string) => { if (window.confirm('Delete?')) { deletePost(id); toast.success('Deleted'); } };

  const onDismissPost = async (id: string) => {
    try { await clearPostReports(id); toast.success('Dismissed'); } catch (e: any) { toast.error(e?.message || 'Failed to dismiss'); }
  };

  const onDelGuide = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteWikiArticle(id); setGuides((prev) => prev.filter((g) => g.id !== id)); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
  };
  const onDismissGuide = async (id: string) => {
    try { await clearWikiArticleReports(id); setGuides((prev) => prev.map((g) => g.id === id ? { ...g, reported_by: [] } : g)); toast.success('Dismissed'); } catch (e: any) { toast.error(e?.message || 'Failed to dismiss'); }
  };

  const onDelQuestion = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteQuestion(id); setQuestions((prev) => prev.filter((q) => q.id !== id)); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
  };
  const onDismissQuestion = async (id: string) => {
    try { await clearQuestionReports(id); setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, reported_by: [] } : q)); toast.success('Dismissed'); } catch (e: any) { toast.error(e?.message || 'Failed to dismiss'); }
  };

  const onDelProject = async (id: string) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteProject(id); setProjects((prev) => prev.filter((p) => p.id !== id)); toast.success('Deleted'); } catch (e: any) { toast.error(e?.message || 'Failed to delete'); }
  };
  const onDismissProject = async (id: string) => {
    try { await clearProjectReports(id); setProjects((prev) => prev.map((p) => p.id === id ? { ...p, reported_by: [] } : p)); toast.success('Dismissed'); } catch (e: any) { toast.error(e?.message || 'Failed to dismiss'); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Shield size={48} style={{ color: 'var(--text-muted)' }} />
        <h1 className="font-display text-xl mt-4" style={{ color: 'var(--text-primary)' }}>Admin Only</h1>
        <button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 rounded font-body text-sm text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>Go Back</button>
      </div>
    );
  }

  const handleAddCommunity = () => {
    if (!newC.name.trim() || !newC.description.trim()) { toast.error('Name and description required'); return; }
    addCommunity({ name: newC.name.trim(), description: newC.description.trim(), cover: '', accentColor: newC.accentColor, memberCount: 0, activeNow: 0, subcommittees: [] });
    setNewC({ name: '', description: '', accentColor: '#d93a3a' });
    setShowAddCommunity(false);
    toast.success('Community added!');
  };

  const handleAddSub = (cid: string) => {
    if (!newS.name.trim() || !newS.description.trim()) { toast.error('Name and description required'); return; }
    addSubcommittee(cid, { name: newS.name.trim(), description: newS.description.trim(), memberCount: 0 });
    setNewS({ name: '', description: '' });
    setShowAddSub(null);
    toast.success('Subcommittee added!');
  };

  const tabs = [
    { key: 'overview' as TabKey, label: 'Overview', icon: TrendingUp },
    { key: 'users' as TabKey, label: 'Users', icon: Users },
    { key: 'posts' as TabKey, label: 'Posts', icon: FileText },
    { key: 'reports' as TabKey, label: 'Reports', icon: Flag },
    { key: 'communities' as TabKey, label: 'Communities', icon: Shield },
  ];

  return (
    <div className="min-h-[100dvh] pb-20" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 h-14 flex items-center gap-3" style={{ backgroundColor: 'rgba(15,17,21,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} /></button>
        <Shield size={20} style={{ color: '#d93a3a' }} />
        <h1 className="font-display text-lg tracking-[2px]" style={{ color: 'var(--text-primary)' }}>ADMIN</h1>
        <span className="ml-auto font-body text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#d93a3a20', color: '#d93a3a' }}>{user?.name}</span>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Users" value={allUsers.length} icon={Users} color="#4a80ff" />
          <StatCard label="Posts" value={posts.length} icon={FileText} color="#10b981" />
          <StatCard label="Reports" value={totalReports} icon={Flag} color="#ef4444" />
          <StatCard label="Communities" value={communities.length} icon={Shield} color="#f5a623" />
          <StatCard label="Likes" value={posts.reduce((s, p) => s + (p.likedBy?.length || 0), 0)} icon={TrendingUp} color="#8b5cf6" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-medium whitespace-nowrap" style={{ color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid #d93a3a' : '2px solid transparent' }}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <h2 className="font-display text-lg mb-3" style={{ color: 'var(--text-primary)' }}>Recent Posts</h2>
              {posts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.user}</p>
                    <p className="font-body text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.content}</p>
                  </div>
                  <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(p.createdAt)}</span>
                </div>
              ))}
              {posts.length === 0 && <p className="font-body text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No posts yet</p>}
            </div>
            {reportedPosts.length > 0 && (
              <div className="rounded-lg p-4" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
                <h2 className="font-display text-lg mb-3 flex items-center gap-2" style={{ color: '#ef4444' }}><AlertTriangle size={18} /> Flagged ({reportedPosts.length})</h2>
                {reportedPosts.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2">
                    <Flag size={14} style={{ color: '#ef4444' }} />
                    <p className="font-body text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{p.content}</p>
                    <button onClick={() => onDel(p.id)} className="p-1"><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === 'users' && (
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="relative p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Search className="absolute left-6 top-5 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 rounded font-body text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th className="text-left px-4 py-3 font-body text-xs" style={{ color: 'var(--text-muted)' }}>User</th>
                    <th className="text-left px-4 py-3 font-body text-xs" style={{ color: 'var(--text-muted)' }}>Email</th>
                    <th className="text-left px-4 py-3 font-body text-xs" style={{ color: 'var(--text-muted)' }}>Clan</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter((u: any) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map((u: any) => (
                    <tr key={u.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs" style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>{u.name[0]?.toUpperCase()}</div>
                          <div><p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</p><p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td className="px-4 py-3">{u.clanName ? <span className="font-body text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>{u.clanName}</span> : <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── POSTS ─── */}
        {tab === 'posts' && (
          <div className="space-y-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 h-10 rounded font-body text-sm" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
            </div>
            {posts.filter((p) => !search || p.content.toLowerCase().includes(search.toLowerCase())).map((p) => (
              <div key={p.id} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start gap-3">
                  <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.user} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>in {p.communityTag}</span></p>
                    <p className="font-body text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{p.content}</p>
                    <div className="flex items-center gap-3">
                      <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{p.likedBy?.length || 0} likes</span>
                      <button onClick={() => onDel(p.id)} className="ml-auto flex items-center gap-1 font-body text-xs px-2 py-1 rounded" style={{ color: '#ef4444', border: '1px solid #ef444440' }}><Trash2 size={10} /> Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── REPORTS ─── */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {totalReports === 0 ? (
              <div className="flex flex-col items-center py-12"><CheckCircle size={40} style={{ color: '#10b981' }} /><p className="font-body text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Nothing flagged</p></div>
            ) : (
              <>
                {reportedPosts.map((p) => (
                  <div key={p.id} className="rounded-lg p-4" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
                    <div className="flex items-start gap-3">
                      <Flag size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div className="flex-1">
                        <span className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>POST</span>
                        <p className="font-body text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{p.user} · {p.reportedBy.length} report{p.reportedBy.length !== 1 ? 's' : ''}</p>
                        <p className="font-body text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{p.content}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onDel(p.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}><Trash2 size={10} /> Remove</button>
                          <button onClick={() => onDismissPost(p.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><XCircle size={10} /> Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {reportedGuides.map((g) => (
                  <div key={g.id} className="rounded-lg p-4" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
                    <div className="flex items-start gap-3">
                      <Flag size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div className="flex-1">
                        <span className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>GUIDE</span>
                        <p className="font-body text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{g.author_name} · {g.reported_by.length} report{g.reported_by.length !== 1 ? 's' : ''}</p>
                        <p className="font-body text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{g.title}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onDelGuide(g.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}><Trash2 size={10} /> Remove</button>
                          <button onClick={() => onDismissGuide(g.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><XCircle size={10} /> Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {reportedQuestions.map((q) => (
                  <div key={q.id} className="rounded-lg p-4" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
                    <div className="flex items-start gap-3">
                      <Flag size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div className="flex-1">
                        <span className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>QUESTION</span>
                        <p className="font-body text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{q.author_name} · {q.reported_by.length} report{q.reported_by.length !== 1 ? 's' : ''}</p>
                        <p className="font-body text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{q.title}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onDelQuestion(q.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}><Trash2 size={10} /> Remove</button>
                          <button onClick={() => onDismissQuestion(q.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><XCircle size={10} /> Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {reportedProjects.map((pr) => (
                  <div key={pr.id} className="rounded-lg p-4" style={{ backgroundColor: '#ef444410', border: '1px solid #ef444440' }}>
                    <div className="flex items-start gap-3">
                      <Flag size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div className="flex-1">
                        <span className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>PROJECT</span>
                        <p className="font-body text-xs font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{pr.author_name} · {pr.reported_by.length} report{pr.reported_by.length !== 1 ? 's' : ''}</p>
                        <p className="font-body text-xs my-1" style={{ color: 'var(--text-secondary)' }}>{pr.title}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onDelProject(pr.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}><Trash2 size={10} /> Remove</button>
                          <button onClick={() => onDismissProject(pr.id)} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><XCircle size={10} /> Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ─── COMMUNITIES ─── */}
        {tab === 'communities' && (
          <div className="space-y-5">
            {/* Help text */}
            <p className="font-body text-xs text-center" style={{ color: 'var(--text-muted)' }}>Tap the camera icon on any image to change it</p>

            {/* Create Community Button */}
            <button onClick={() => setShowAddCommunity(!showAddCommunity)} className="w-full py-4 rounded-xl font-body text-sm font-semibold text-white active:scale-[0.97]" style={{ backgroundColor: '#d93a3a', touchAction: 'manipulation' }}>
              {showAddCommunity ? 'Cancel' : '+ Create New Community'}
            </button>

            {showAddCommunity && (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <p className="font-display text-base" style={{ color: 'var(--text-primary)' }}>New Community</p>
                <input type="text" placeholder="Name (e.g. Fishing)" value={newC.name} onChange={(e) => setNewC((p) => ({ ...p, name: e.target.value }))} className="w-full px-4 h-11 rounded-lg font-body text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <input type="text" placeholder="Description" value={newC.description} onChange={(e) => setNewC((p) => ({ ...p, description: e.target.value }))} className="w-full px-4 h-11 rounded-lg font-body text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                <div className="flex items-center gap-3">
                  <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>Color:</span>
                  <input type="color" value={newC.accentColor} onChange={(e) => setNewC((p) => ({ ...p, accentColor: e.target.value }))} className="w-10 h-10 rounded-lg" />
                </div>
                <button onClick={handleAddCommunity} className="w-full py-3 rounded-lg font-body text-sm font-semibold text-white" style={{ backgroundColor: '#10b981' }}>Create</button>
              </div>
            )}

            {/* Community Cards */}
            {communities.map((c) => (
              <div key={c.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="p-4">
                  {/* Cover image row */}
                  <ImageRow label={`${c.name} — tap image to change`} imageUrl={c.cover} fallbackColor={c.accentColor} onFile={async (f) => { const b64 = await fileToBase64(f); updateCommunityCover(c.id, b64); toast.success('Cover updated!'); }} />

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        {expanded === c.id ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
                      </button>
                    </div>
                    <p className="font-body text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                    <span className="inline-block font-body text-xs px-2 py-0.5 rounded mt-2" style={{ backgroundColor: c.accentColor + '20', color: c.accentColor }}>{c.subcommittees.length} subcommittees</span>
                  </div>
                </div>

                {/* Expanded subcommittees */}
                {expanded === c.id && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Add subcommittee */}
                    <button onClick={() => setShowAddSub(showAddSub === c.id ? null : c.id)} className="w-full mt-3 py-3 rounded-lg font-body text-sm font-semibold text-white active:scale-[0.97]" style={{ backgroundColor: '#4a80ff', touchAction: 'manipulation' }}>
                      {showAddSub === c.id ? 'Cancel' : '+ Add Subcommittee'}
                    </button>

                    {showAddSub === c.id && (
                      <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--bg-base)' }}>
                        <input type="text" placeholder="Name (e.g. Fly Fishing)" value={newS.name} onChange={(e) => setNewS((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 h-10 rounded-lg font-body text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                        <input type="text" placeholder="Description" value={newS.description} onChange={(e) => setNewS((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 h-10 rounded-lg font-body text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                        <button onClick={() => handleAddSub(c.id)} className="w-full py-2.5 rounded-lg font-body text-xs font-semibold text-white" style={{ backgroundColor: '#10b981' }}>Add Subcommittee</button>
                      </div>
                    )}

                    {/* Sub list */}
                    {c.subcommittees.map((sub: Subcommittee) => (
                      <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-base)' }}>
                        <ImageRow label={sub.name} imageUrl={sub.image || ''} fallbackColor={c.accentColor} onFile={async (f) => { const b64 = await fileToBase64(f); updateSubcommitteeImage(c.id, sub.id, b64); toast.success('Image updated!'); }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{sub.description}</p>
                        </div>
                        <button onClick={() => { removeSubcommittee(c.id, sub.id); toast.success('Removed'); }} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    ))}

                    {c.subcommittees.length === 0 && <p className="font-body text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No subcommittees yet. Tap "Add Subcommittee" above.</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
