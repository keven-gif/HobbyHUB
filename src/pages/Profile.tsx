import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Flame, MessageCircle, Bookmark, Users, FileText, MapPin, Edit3, Check, X, Shield, UserPlus, UserCheck, UserMinus, UserX, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/context/PostContext';
import { useFriends } from '@/hooks/useFriends';
import { pickFile } from '@/lib/filePicker';
import { compressImage, getBase64SizeKB } from '@/lib/imageCompress';
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees';
import { fetchProfile } from '@/lib/supabaseQueries';
import { toast } from 'sonner';

/* ─── Time ago helper ─── */
function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

type TabKey = 'posts' | 'saved' | 'friends' | 'requests';

interface ProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverImage?: string;
  clanName?: string;
  bio?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('userId');

  const { user: me, updateProfile, canChangeUsername, getUsernameCooldownDays } = useAuth();
  const { posts, deletePost, pinPost, unpinPost } = usePosts();
  const { count: joinedCount } = useJoinedSubcommittees(me?.id);
  const friendsApi = useFriends(me?.id);

  // Determine whose profile we're viewing
  const isViewingSelf = !viewUserId || viewUserId === me?.id;

  // Fetch other user's profile from Supabase
  const [otherProfile, setOtherProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(!isViewingSelf);

  useEffect(() => {
    if (isViewingSelf) { setOtherProfile(null); setLoading(false); return; }
    if (!viewUserId) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    fetchProfile(viewUserId)
      .then((data) => {
        if (cancelled) return;
        setOtherProfile({
          id: data.id,
          name: data.name || data.username,
          username: data.username,
          email: data.email,
          avatar: data.avatar || '/avatar-1.jpg',
          clanName: data.clan_name || undefined,
          bio: data.bio || undefined,
        });
      })
      .catch(() => { setOtherProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [viewUserId, isViewingSelf]);

  const profileUser: ProfileData | null = isViewingSelf
    ? (me ? { id: me.id, name: me.name, username: me.username, email: me.email, avatar: me.avatar, coverImage: me.coverImage, clanName: me.clanName, bio: me.bio } : null)
    : otherProfile;
  const userId = profileUser?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(me?.bio || '');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(me?.name || '');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(me?.username || '');
  const [usernameError, setUsernameError] = useState('');

  /* ── Friend data ── */
  const friends = useMemo(() => friendsApi.getFriends(), [friendsApi, friendsApi.requests]);
  const incomingRequests = useMemo(() => friendsApi.getIncomingRequests(), [friendsApi, friendsApi.requests]);
  const outgoingRequests = useMemo(() => friendsApi.getOutgoingRequests(), [friendsApi, friendsApi.requests]);
  const friendStatus = viewUserId && me?.id ? friendsApi.getFriendStatus(viewUserId) : 'none';

  /* ── User posts ── */
  const userPosts = useMemo(
    () => posts.filter((p) => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt),
    [posts, userId]
  );

  /* ── Saved posts (only for self) ── */
  const savedPosts = useMemo(
    () => posts.filter((p) => me?.id && p.savedBy.includes(me.id)).sort((a, b) => b.createdAt - a.createdAt),
    [posts, me?.id]
  );

  /* ── Stats ── */
  const totalLikes = useMemo(() => userPosts.reduce((sum, p) => sum + p.likedBy.length, 0), [userPosts]);
  const totalComments = useMemo(() => userPosts.reduce((sum, p) => sum + p.comments.length, 0), [userPosts]);

  /* ── Handle file from picker ── */
  const handleFileFromPicker = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large. Max 10MB.'); return; }

    toast.loading('Compressing image...', { id: 'avatar-upload' });

    try {
      // Compress image before upload — phone photos are 3-8MB uncompressed
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
      const sizeKB = getBase64SizeKB(compressed);

      if (sizeKB > 500) {
        toast.error('Image still too large after compression. Try a smaller image.', { id: 'avatar-upload' });
        return;
      }

      await updateProfile({ avatar: compressed });
      toast.success(`Profile picture updated! (${sizeKB}KB)`, { id: 'avatar-upload' });
    } catch (err: any) {
      toast.error('Failed to process image: ' + (err.message || 'Unknown error'), { id: 'avatar-upload' });
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large. Max 10MB.'); return; }

    toast.loading('Compressing cover...', { id: 'cover-upload' });

    try {
      // Cover images are wider: 800x300
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 300, quality: 0.8 });
      const sizeKB = getBase64SizeKB(compressed);

      if (sizeKB > 800) {
        toast.error('Image still too large. Try a smaller image.', { id: 'cover-upload' });
        return;
      }

      await updateProfile({ coverImage: compressed });
      toast.success(`Cover image updated! (${sizeKB}KB)`, { id: 'cover-upload' });
    } catch (err: any) {
      toast.error('Failed to process cover: ' + (err.message || 'Unknown error'), { id: 'cover-upload' });
    }
  };

  const handleSaveBio = () => { updateProfile({ bio: bioDraft.trim() }); setEditingBio(false); toast.success('Bio updated!'); };
  const handleCancelBio = () => { setBioDraft(me?.bio || ''); setEditingBio(false); };
  const handleSaveName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) { toast.error('Name cannot be empty'); return; }
    updateProfile({ name: trimmed }); setEditingName(false); toast.success('Name updated!');
  };
  const handleCancelName = () => { setNameDraft(me?.name || ''); setEditingName(false); };

  const handleSaveUsername = async () => {
    setUsernameError('');
    const trimmed = usernameDraft.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!trimmed) { setUsernameError('Username cannot be empty'); return; }
    if (trimmed.length < 3) { setUsernameError('Username must be at least 3 characters'); return; }
    if (trimmed.length > 20) { setUsernameError('Username must be under 20 characters'); return; }
    if (trimmed === me?.username) { setEditingUsername(false); return; }
    if (!canChangeUsername()) {
      const daysLeft = getUsernameCooldownDays();
      setUsernameError(`You can change your username again in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`);
      return;
    }
    try {
      await updateProfile({ username: trimmed });
      setEditingUsername(false);
      toast.success('Username updated!');
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username');
    }
  };
  const handleCancelUsername = () => {
    setUsernameDraft(me?.username || '');
    setUsernameError('');
    setEditingUsername(false);
  };

  const isAdmin = me?.email?.toLowerCase() === 'roninonedigital@gmail.com';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        <p className="font-body text-sm mt-4" style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profileUser || !userId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <p className="font-body text-lg" style={{ color: 'var(--text-muted)' }}>User not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 font-body text-sm" style={{ color: 'var(--accent-primary)' }}>Go back</button>
      </div>
    );
  }

  /* ── Friend action button ── */
  function FriendActionButton() {
    if (isViewingSelf || !me?.id || !viewUserId) return null;

    const handleAdd = async () => {
      const success = await friendsApi.sendRequest(
        viewUserId,
        profileUser?.name || 'User',
        profileUser?.avatar || '/avatar-1.jpg',
        me.name || me.username,
        me.avatar
      );
      if (success) toast.success('Friend request sent!');
      else toast.error('Request already sent or already friends.');
    };

    const handleRemove = () => {
      if (window.confirm('Remove this friend?')) {
        friendsApi.removeFriend(viewUserId);
        toast.success('Friend removed');
      }
    };

    const handleCancel = () => {
      const req = friendsApi.requests.find(
        (r) => r.status === 'pending' && r.from_user_id === me.id && r.to_user_id === viewUserId
      );
      if (req) { friendsApi.cancelRequest(req.id); toast.success('Request cancelled'); }
    };

    if (friendStatus === 'friends') {
      return (
        <button onClick={handleRemove} className="flex items-center gap-2 font-body text-sm px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          <UserMinus size={16} /> Remove Friend
        </button>
      );
    }
    if (friendStatus === 'pending_sent') {
      return (
        <button onClick={handleCancel} className="flex items-center gap-2 font-body text-sm px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          <Clock size={16} /> Request Sent
        </button>
      );
    }
    if (friendStatus === 'pending_received') {
      const req = friendsApi.requests.find(
        (r) => r.status === 'pending' && r.from_user_id === viewUserId && r.to_user_id === me.id
      );
      return (
        <div className="flex items-center gap-2">
          <button onClick={() => { if (req) { friendsApi.acceptRequest(req.id); toast.success('Friend request accepted!'); } }} className="flex items-center gap-1.5 font-body text-sm px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
            <UserCheck size={16} /> Accept
          </button>
          <button onClick={() => { if (req) { friendsApi.declineRequest(req.id); toast.success('Friend request declined'); } }} className="flex items-center gap-1.5 font-body text-sm px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            <UserX size={16} /> Decline
          </button>
        </div>
      );
    }
    return (
      <button onClick={handleAdd} className="flex items-center gap-2 font-body text-sm px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
        <UserPlus size={16} /> Add Friend
      </button>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Admin badge */}
      {isViewingSelf && isAdmin && (
        <div className="px-6 lg:px-12 pt-4">
          <Link to="/admin" className="inline-flex items-center gap-2 font-body text-xs px-3 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#d93a3a20', color: '#d93a3a', border: '1px solid #d93a3a40' }}>
            <Shield size={14} /> Admin Dashboard
          </Link>
        </div>
      )}

      {/* ═══ FRIEND REQUEST ALERT BANNER ═══ */}
      {isViewingSelf && incomingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 lg:px-12 pt-4"
        >
          <div
            className="max-w-4xl mx-auto rounded-xl p-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          >
            <div className="flex -space-x-2 flex-shrink-0">
              {incomingRequests.slice(0, 3).map((req) => (
                <img
                  key={req.id}
                  src={req.from_user_avatar || '/avatar-1.jpg'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border-2"
                  style={{ borderColor: 'var(--accent-primary)' }}
                />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-semibold">
                {incomingRequests.length === 1
                  ? `${incomingRequests[0].from_user_name} wants to be friends`
                  : `${incomingRequests.length} friend requests`}
              </p>
              <p className="font-body text-xs opacity-80">
                Tap below to accept or decline
              </p>
            </div>
            <button
              onClick={() => setActiveTab('requests')}
              className="flex-shrink-0 font-body text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#fff', color: 'var(--accent-primary)' }}
            >
              View
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ COVER IMAGE ═══ */}
      <div className="relative w-full" style={{ height: 'clamp(140px, 25vw, 220px)' }}>
        {profileUser.coverImage ? (
          <img src={profileUser.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)' }} />
        )}
        {/* Cover image upload button (self only) */}
        {isViewingSelf && (
          <button
            onClick={async () => { const f = await pickFile('image/*'); if (f) handleCoverUpload(f); }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 font-body text-[11px] px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid #444' }}
          >
            <Camera size={14} /> {profileUser.coverImage ? 'Change Cover' : 'Add Cover'}
          </button>
        )}
      </div>

      {/* ═══ PROFILE HEADER ═══ */}
      <section className="px-6 lg:px-12 pt-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                type="button"
                className="relative w-28 h-28 rounded-full active:scale-[0.97] -mt-16"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                onClick={async () => { if (isViewingSelf) { const f = await pickFile('image/*'); if (f) handleFileFromPicker(f); } }}
              >
                <img src={profileUser.avatar} alt={profileUser.name} className={`w-28 h-28 rounded-full object-cover border-4 ${isViewingSelf ? 'pointer-events-none' : ''}`} style={{ borderColor: 'var(--bg-base)' }} />
                {isViewingSelf && (
                  <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full flex items-center justify-center border-2 pointer-events-none" style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--bg-base)' }}>
                    <Camera size={16} style={{ color: '#fff' }} />
                  </div>
                )}
              </button>
              {isViewingSelf && <span className="font-body text-xs" style={{ color: 'var(--accent-primary)' }}>Tap photo to change</span>}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              {/* Name */}
              {isViewingSelf && editingName ? (
                <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start flex-wrap">
                  <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="font-display text-3xl sm:text-4xl px-2 py-1 rounded outline-none" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)', width: 'min(280px, 70vw)' }} autoFocus />
                  <div className="flex items-center gap-1">
                    <button onClick={handleSaveName} className="p-1.5 rounded transition-colors" style={{ backgroundColor: 'var(--accent-primary)' }}><Check size={16} style={{ color: '#fff' }} /></button>
                    <button onClick={handleCancelName} className="p-1.5 rounded transition-colors" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                  <h1 className="font-display text-3xl sm:text-4xl" style={{ color: 'var(--text-primary)' }}>{profileUser.name}</h1>
                  {isViewingSelf && (
                    <button onClick={() => setEditingName(true)} className="p-1.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }} title="Edit name"><Edit3 size={16} /></button>
                  )}
                </div>
              )}

              {/* Username — editable with 30-day cooldown */}
              {isViewingSelf && editingUsername ? (
                <div className="mb-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
                    <input
                      type="text"
                      value={usernameDraft}
                      onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="font-body text-sm px-2 py-1 rounded outline-none"
                      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)', width: 'min(200px, 50vw)' }}
                      autoFocus
                      placeholder="username"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={handleSaveUsername} className="p-1.5 rounded transition-colors" style={{ backgroundColor: 'var(--accent-primary)' }}><Check size={16} style={{ color: '#fff' }} /></button>
                      <button onClick={handleCancelUsername} className="p-1.5 rounded transition-colors" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}><X size={16} /></button>
                    </div>
                  </div>
                  {usernameError && (
                    <p className="font-body text-xs mt-1" style={{ color: '#ef4444' }}>{usernameError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
                  <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>@{profileUser.username}</p>
                  {isViewingSelf && (
                    <button
                      onClick={() => { if (canChangeUsername()) { setEditingUsername(true); } else { toast.error(`You can change your username again in ${getUsernameCooldownDays()} days.`); } }}
                      className="p-1 rounded transition-colors"
                      style={{ color: canChangeUsername() ? 'var(--text-muted)' : 'var(--text-muted)', opacity: canChangeUsername() ? 1 : 0.5 }}
                      title={canChangeUsername() ? 'Edit username' : `Can edit in ${getUsernameCooldownDays()} days`}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              )}

              {profileUser.clanName && (
                <span className="inline-flex items-center gap-1 font-body text-xs px-3 py-1 rounded-full mb-3" style={{ backgroundColor: 'var(--accent-primary)18', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  <Users size={12} />{profileUser.clanName}
                </span>
              )}

              {/* Bio */}
              {isViewingSelf ? (
                <div className="mt-2">
                  {editingBio ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} placeholder="Tell the community about yourself..." className="w-full font-body text-sm px-3 py-2 rounded resize-none outline-none" rows={3} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-active)' }} />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={handleCancelBio} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}><X size={12} /> Cancel</button>
                        <button onClick={handleSaveBio} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded text-white" style={{ backgroundColor: 'var(--accent-primary)' }}><Check size={12} /> Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 justify-center sm:justify-start">
                      <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profileUser.bio || 'No bio yet. Click the pencil to add one!'}</p>
                      <button onClick={() => setEditingBio(true)} className="p-1 rounded shrink-0" style={{ color: 'var(--text-muted)' }}><Edit3 size={14} /></button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profileUser.bio || 'No bio yet.'}</p>
              )}

              {/* Friend action button (when viewing others) */}
              {!isViewingSelf && (
                <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
                  <FriendActionButton />
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-8">
            {[
              { label: 'Posts', value: userPosts.length, icon: FileText },
              { label: 'Likes', value: totalLikes, icon: Flame },
              { label: 'Comments', value: totalComments, icon: MessageCircle },
              { label: 'Subs', value: isViewingSelf ? joinedCount : 0, icon: MapPin },
              { label: 'Friends', value: friends.length, icon: Users },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <stat.icon size={16} className="mb-1" style={{ color: 'var(--accent-primary)' }} />
                <span className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>{stat.value}</span>
                <span className="font-body text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="px-6 lg:px-12 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-1 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {[
              { key: 'posts' as TabKey, label: 'Posts', icon: FileText },
              ...(isViewingSelf ? [{ key: 'saved' as TabKey, label: 'Saved', icon: Bookmark }] : []),
              { key: 'friends' as TabKey, label: `Friends (${friends.length})`, icon: Users },
              ...(isViewingSelf ? [{ key: 'requests' as TabKey, label: incomingRequests.length > 0 ? `Requests (${incomingRequests.length})` : 'Requests', icon: UserPlus, hasBadge: incomingRequests.length > 0 }] : []),
            ].map((tab: any) => {
              const isActive = activeTab === tab.key;
              const isRequestsWithPending = tab.key === 'requests' && tab.hasBadge;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="relative flex items-center gap-1.5 px-4 py-3 font-body text-sm font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: isActive
                      ? 'var(--text-primary)'
                      : isRequestsWithPending
                        ? '#d93a3a'
                        : 'var(--text-muted)',
                    fontWeight: isRequestsWithPending && !isActive ? 700 : isActive ? 600 : 400,
                  }}
                >
                  <div className="relative">
                    <tab.icon size={14} />
                    {/* Red dot on Requests tab when pending */}
                    {isRequestsWithPending && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#d93a3a' }} />
                    )}
                  </div>
                  {tab.label}
                  {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: isRequestsWithPending ? '#d93a3a' : 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>

          <div>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {/* Pinned Post */}
                {me?.pinnedPostId && (() => {
                  const pinned = posts.find((p) => p.id === me.pinnedPostId);
                  if (!pinned || pinned.userId !== userId) return null;
                  return (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-body text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: '#d93a3a22', color: '#d93a3a' }}>
                          Pinned Post
                        </span>
                        {isViewingSelf && (
                          <button onClick={() => { unpinPost(me.id).then(() => toast.success('Post unpinned')); }} className="font-body text-[10px]" style={{ color: '#666' }}>
                            Unpin
                          </button>
                        )}
                      </div>
                      <PostCard post={pinned} onDelete={isViewingSelf ? () => deletePost(pinned.id) : undefined} showDelete={isViewingSelf} showPin={false} />
                    </div>
                  );
                })()}

                {userPosts.length === 0 ? (
                  <EmptyState message={isViewingSelf ? "You haven't posted yet. Share your first build!" : "No posts yet."} icon={FileText} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {userPosts
                      .filter((p) => p.id !== me?.pinnedPostId) // Don't show pinned post twice
                      .map((post) => (
                        <PostCard key={post.id} post={post} onDelete={isViewingSelf ? () => deletePost(post.id) : undefined} showDelete={isViewingSelf} showPin={isViewingSelf} onPin={() => { pinPost(me!.id, post.id).then(() => toast.success('Post pinned!')); }} />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Saved Tab (self only) */}
            {activeTab === 'saved' && isViewingSelf && (
              <div>
                {savedPosts.length === 0 ? <EmptyState message="No saved posts yet." icon={Bookmark} /> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedPosts.map((post) => <PostCard key={post.id} post={post} />)}
                  </div>
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                {friends.length === 0 ? (
                  <EmptyState message={isViewingSelf ? "No friends yet. Start connecting!" : "No friends yet."} icon={Users} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <div key={friend.userId} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link to={`/profile?userId=${friend.userId}`} className="font-body text-sm font-semibold truncate hover:underline" style={{ color: 'var(--text-primary)' }}>{friend.name}</Link>
                          <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>Friends since {timeAgo(friend.since)}</p>
                        </div>
                        {isViewingSelf && (
                          <button onClick={() => { friendsApi.removeFriend(friend.userId); toast.success('Friend removed'); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }} title="Remove friend">
                            <UserMinus size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab (self only) */}
            {activeTab === 'requests' && isViewingSelf && (
              <div>
                {incomingRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-body text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Incoming Requests</h3>
                    <div className="flex flex-col gap-2">
                      {incomingRequests.map((req) => (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                          <img src={req.from_user_avatar} alt={req.from_user_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link to={`/profile?userId=${req.from_user_id}`} className="font-body text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>{req.from_user_name}</Link>
                            <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>wants to be friends &middot; {timeAgo(new Date(req.created_at).getTime())}</p>
                          </div>
                          <button onClick={() => { friendsApi.acceptRequest(req.id); toast.success('Friend request accepted!'); }} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => { friendsApi.declineRequest(req.id); toast.success('Declined'); }} className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outgoingRequests.length > 0 && (
                  <div>
                    <h3 className="font-body text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Sent Requests</h3>
                    <div className="flex flex-col gap-2">
                      {outgoingRequests.map((req) => (
                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                          <img src={req.to_user_avatar} alt={req.to_user_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-body text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{req.to_user_name}</span>
                            <p className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>Request pending &middot; {timeAgo(new Date(req.created_at).getTime())}</p>
                          </div>
                          <button onClick={() => { friendsApi.cancelRequest(req.id); toast.success('Request cancelled'); }} className="font-body text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>Cancel</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                  <EmptyState message="No pending friend requests." icon={UserPlus} />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Post Card (compact) ─── */
function PostCard({ post, onDelete, showDelete, showPin, onPin }: { post: any; onDelete?: () => void; showDelete?: boolean; showPin?: boolean; onPin?: () => void }) {
  return (
    <div className="rounded-lg overflow-hidden transition-all duration-200 group relative" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {showPin && onPin && (
          <button onClick={() => { if (window.confirm('Pin this post to your profile?')) { onPin(); } }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d93a3aee', color: '#fff' }} title="Pin post">
            <Bookmark size={14} />
          </button>
        )}
        {showDelete && onDelete && (
          <button onClick={() => { if (window.confirm('Delete this post?')) { onDelete(); toast.success('Post deleted'); } }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }} title="Delete post">
            <X size={14} />
          </button>
        )}
      </div>
      {post.image && (
        <div className="overflow-hidden" style={{ aspectRatio: '16/10' }}>
          <img src={post.image} alt={post.title || ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)18', color: 'var(--accent-primary)', fontWeight: 500 }}>{post.communityTag}</span>
          <span className="font-body text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(post.createdAt)}</span>
        </div>
        {post.title && <h3 className="font-body text-sm font-semibold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>}
        <p className="font-body text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-body text-xs" style={{ color: 'var(--text-muted)' }}><Flame size={12} /> {post.likedBy.length}</span>
          <span className="flex items-center gap-1 font-body text-xs" style={{ color: 'var(--text-muted)' }}><MessageCircle size={12} /> {post.comments.length}</span>
          <span className="flex items-center gap-1 font-body text-xs" style={{ color: 'var(--text-muted)' }}><Bookmark size={12} /> {post.savedBy.length}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ message, icon: Icon }: { message: string; icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)' }}>
      <Icon size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
      <p className="font-body text-sm text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}
