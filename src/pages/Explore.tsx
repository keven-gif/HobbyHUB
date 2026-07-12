import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, Heart, Users, Circle, UserPlus, UserCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePosts } from '@/context/PostContext'
import { useFriends } from '@/hooks/useFriends'
import { useSubcommitteeMemberCounts } from '@/hooks/useSubcommitteeMemberCounts'
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees'
import { getActiveUsers, formatLastSeen, type UserActivity } from '@/lib/activityTracker'
import { getAllUsersAsync } from '@/lib/membershipRegistry'
import { getAllCommunities, getCommunity, getSubcommittees } from '@/data/communityData'

/* ───────── Types ───────── */

interface CommunityCard {
  id: string
  name: string
  category: string
  description: string
  image: string
  members: string
  active: number
  color: string
  subs: string[]
}

interface AppUser {
  id: string
  name: string
  username: string
  avatar: string
  bio?: string
}

/* ───────── Build from communityData + actual member counts ───────── */

function buildCommunities(
  memberCounts: Record<string, number>,
  activeUsers: UserActivity[]
): CommunityCard[] {
  const allIds = getAllCommunities()
  return allIds.map((id) => {
    const info = getCommunity(id)
    const subs = getSubcommittees(id)
    const totalMembers = memberCounts[id] ?? 0
    // Count actual active users (all active users shown for each community)
    const active = activeUsers.length
    return {
      id,
      name: info.name,
      category: info.category || 'Hobby',
      description: info.description,
      image: info.cover || '/explore-cars.jpg',
      members: totalMembers >= 1000 ? `${(totalMembers / 1000).toFixed(1)}K` : `${totalMembers}`,
      active: active > 0 ? active : Math.min(totalMembers, Math.floor(totalMembers * 0.1)),
      color: info.accentColor,
      subs: subs.map((s) => s.name),
    }
  })
}

/* ───────── Load users from Supabase ───────── */

async function loadAllUsersAsync(): Promise<AppUser[]> {
  try {
    const users = await getAllUsersAsync();
    return users.map((u) => ({ id: u.id, name: u.name, username: u.username, avatar: u.avatar }));
  } catch { return []; }
}

const trendingTags = ['Model Kits', 'Cars', 'TCG', 'Sneakers', 'Video Games', 'RC Cars', 'Golf', 'Photography']

const communityColorMap: Record<string, string> = {
  cars: '#d93a3a',
  'model-kits': '#3a8cff',
  tcg: '#8b5cf6',
  videogames: '#39ff14',
  'rc-cars': '#ff7b00',
  golf: '#2ecc71',
  reading: '#e67e22',
  'sports-betting': '#f1c40f',
  photography: '#1abc9c',
  gardening: '#27ae60',
  sneakers: '#e74c3c',
}

function getCommunityColor(communityId: string): string {
  return communityColorMap[communityId] || '#666'
}

/* ───────── Explore Page ───────── */

export default function Explore() {
  const { user: me } = useAuth()
  const { posts } = usePosts()
  const { loadCounts, counts: subCounts, getCountSync } = useSubcommitteeMemberCounts()
  const { syncDone } = useJoinedSubcommittees(me?.id)
  const friendsApi = useFriends(me?.id)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showSearch, setShowSearch] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [activeUsers, setActiveUsers] = useState<UserActivity[]>([])
  const [allAppUsers, setAllAppUsers] = useState<AppUser[]>([])

  /* Load active users from Supabase */
  useEffect(() => {
    let cancelled = false
    async function load() {
      const users = await getActiveUsers(me?.id)
      if (!cancelled) setActiveUsers(users)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [me?.id])

  /* Load all users from Supabase (shared across devices) */
  useEffect(() => {
    let cancelled = false
    loadAllUsersAsync().then((users) => {
      if (!cancelled) setAllAppUsers(users)
    })
    return () => { cancelled = true }
  }, [])

  /* ─── Load ACTUAL member counts from Supabase ─── */
  const [realMemberCounts, setRealMemberCounts] = useState<Record<string, number>>({})

  // Collect all subcommittee IDs across all communities
  const allSubIds = useMemo(() => {
    const ids: string[] = [];
    for (const commId of getAllCommunities()) {
      ids.push(...getSubcommittees(commId).map(s => s.id));
    }
    return ids;
  }, []);

  // Batch-load counts on mount + when sync completes
  useEffect(() => {
    if (!syncDone || allSubIds.length === 0) return;
    let cancelled = false;
    async function load() {
      await loadCounts(allSubIds);
      if (cancelled) return;
      // Aggregate sub counts into community totals
      const allCommIds = getAllCommunities();
      const countsMap: Record<string, number> = {};
      for (const commId of allCommIds) {
        const subs = getSubcommittees(commId);
        let total = 0;
        for (const sub of subs) {
          total += subCounts[sub.id] ?? getCountSync(sub.id);
        }
        countsMap[commId] = total;
      }
      setRealMemberCounts(countsMap);
    }
    load();
    return () => { cancelled = true; };
  }, [syncDone, allSubIds, loadCounts, subCounts, getCountSync]);

  // Poll counts every 10 seconds for cross-device updates
  useEffect(() => {
    if (allSubIds.length === 0) return;
    const interval = setInterval(() => {
      loadCounts(allSubIds).then(() => {
        // Re-aggregate after poll
        const allCommIds = getAllCommunities();
        const countsMap: Record<string, number> = {};
        for (const commId of allCommIds) {
          const subs = getSubcommittees(commId);
          let total = 0;
          for (const sub of subs) {
            total += subCounts[sub.id] ?? getCountSync(sub.id);
          }
          countsMap[commId] = total;
        }
        setRealMemberCounts(countsMap);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [allSubIds, loadCounts, subCounts, getCountSync]);

  const communities = useMemo(() => buildCommunities(realMemberCounts, activeUsers), [realMemberCounts, activeUsers])

  /* Filtered users */
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return []
    const q = userSearch.toLowerCase().trim()
    return allAppUsers.filter(
      (u) =>
        u.id !== me?.id &&
        (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    )
  }, [allAppUsers, userSearch, me?.id])

  /* Search state — controlled by parent */
  useEffect(() => {
    if (showSearch) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showSearch])

  /* Categories */
  const categories = useMemo(() => {
    const set = new Set(communities.map((c) => c.category))
    return ['All', ...Array.from(set).sort()]
  }, [communities])

  /* Trending */
  const trendingPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.likedBy.length - a.likedBy.length).slice(0, 6)
  }, [posts])

  /* Filter */
  const filteredCommunities = useMemo(() => {
    let result = communities
    if (activeCategory !== 'All') {
      result = result.filter((c) => c.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.subs.some((s) => s.toLowerCase().includes(q))
      )
    }
    return result
  }, [communities, activeCategory, search])

  /* Keyboard dismiss */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: '#000000' }}>

      {/* ═══ SEARCH OVERLAY (Mobile) ═══ */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-3 px-5 h-14" style={{ borderBottom: '1px solid #1a1a1a' }}>
            <Search size={18} style={{ color: '#555' }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities, subcommittees..."
              className="flex-1 bg-transparent outline-none font-body text-base"
              style={{ color: '#fff' }}
            />
            <button onClick={() => { setSearch(''); setShowSearch(false) }} style={{ color: '#555' }}>
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {search.trim() && filteredCommunities.length === 0 && (
              <p className="font-body text-sm text-center mt-10" style={{ color: '#555' }}>No communities found</p>
            )}
            <div className="flex flex-col gap-2">
              {filteredCommunities.map((c) => (
                <Link
                  key={c.id}
                  to={`/community/${c.id}`}
                  onClick={() => setShowSearch(false)}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: '#111', border: '1px solid #222' }}
                >
                  <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div>
                    <span className="font-body text-sm font-medium block" style={{ color: '#fff' }}>{c.name}</span>
                    <span className="font-body text-[11px]" style={{ color: '#666' }}>{c.subs.slice(0, 3).join(' · ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-lg tracking-wider" style={{ color: '#fff' }}>EXPLORE</h1>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-body text-xs"
            style={{ backgroundColor: '#111', color: '#888', border: '1px solid #222' }}
          >
            <Search size={14} /> Search
          </button>
        </div>

        {/* Subcommittees marquee */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {trendingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              className="flex-shrink-0 font-body text-[11px] px-3 py-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: search === tag ? '#d93a3a' : '#111',
                color: search === tag ? '#fff' : '#888',
                border: '1px solid',
                borderColor: search === tag ? '#d93a3a' : '#222',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ACTIVE NOW ═══ */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-sm tracking-wider" style={{ color: '#888' }}>ACTIVE NOW</h2>
          <Circle size={8} fill="#39ff14" stroke="none" />
          <span className="font-body text-[10px]" style={{ color: '#39ff14' }}>{activeUsers.length} online</span>
        </div>
        {activeUsers.length === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
            <Users size={16} style={{ color: '#555' }} />
            <span className="font-body text-xs" style={{ color: '#555' }}>No users active right now</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {activeUsers.map((u) => (
              <Link
                key={u.userId}
                to={`/profile?userId=${u.userId}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg min-w-[72px]"
                style={{ backgroundColor: '#111', border: '1px solid #222' }}
              >
                <div className="relative">
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                  <Circle size={8} fill="#39ff14" stroke="none" className="absolute bottom-0 right-0" />
                </div>
                <span className="font-body text-[10px] truncate max-w-[60px]" style={{ color: '#aaa' }}>{u.name}</span>
                <span className="font-body text-[8px]" style={{ color: '#39ff14' }}>{formatLastSeen(u.lastSeen)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FIND USERS ═══ */}
      <div className="px-4 pb-4">
        <h2 className="font-display text-sm tracking-wider mb-3" style={{ color: '#888' }}>FIND USERS</h2>
        <div className="flex items-center gap-3 p-3 rounded-lg mb-3" style={{ backgroundColor: '#111', border: '1px solid #222' }}>
          <Search size={16} style={{ color: '#555' }} />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="flex-1 bg-transparent outline-none font-body text-sm"
            style={{ color: '#fff' }}
          />
          {userSearch && (
            <button onClick={() => setUserSearch('')} style={{ color: '#555' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* User search results */}
        {userSearch.trim() && filteredUsers.length === 0 && (
          <p className="font-body text-xs text-center py-4" style={{ color: '#555' }}>No users found</p>
        )}
        <div className="flex flex-col gap-2">
          {filteredUsers.map((u) => {
            const status = me?.id ? friendsApi.getFriendStatus(u.id) : 'none'
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: '#111', border: '1px solid #222' }}
              >
                <Link to={`/profile?userId=${u.id}`} className="flex-shrink-0">
                  <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                </Link>
                <Link to={`/profile?userId=${u.id}`} className="flex-1 min-w-0">
                  <span className="font-body text-sm font-medium block" style={{ color: '#fff' }}>{u.name}</span>
                  <span className="font-body text-[11px]" style={{ color: '#666' }}>@{u.username}</span>
                </Link>
                {/* Friend action button */}
                {status === 'none' && (
                  <button
                    onClick={async () => {
                      if (!me?.id) return;
                      const success = await friendsApi.sendRequest(u.id, u.name, u.avatar, me.name || me.username, me.avatar);
                      if (success) { /* toast handled in hook */ }
                    }}
                    className="flex-shrink-0 flex items-center gap-1 font-body text-[10px] px-3 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: '#d93a3a' }}
                  >
                    <UserPlus size={12} /> Add
                  </button>
                )}
                {status === 'friends' && (
                  <span className="flex-shrink-0 flex items-center gap-1 font-body text-[10px] px-3 py-1.5 rounded-full" style={{ color: '#39ff14', border: '1px solid #39ff1440' }}>
                    <UserCheck size={12} /> Friends
                  </span>
                )}
                {status === 'pending_sent' && (
                  <span className="flex-shrink-0 font-body text-[10px] px-3 py-1.5 rounded-full" style={{ color: '#888', border: '1px solid #333' }}>
                    Pending
                  </span>
                )}
                {status === 'pending_received' && (
                  <span className="flex-shrink-0 font-body text-[10px] px-3 py-1.5 rounded-full" style={{ color: '#f1c40f', border: '1px solid #f1c40f40' }}>
                    Requested
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ TRENDING POSTS ═══ */}
      <div className="px-4 pb-4">
        <h2 className="font-display text-sm tracking-wider mb-3" style={{ color: '#888' }}>TRENDING NOW</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
          {trendingPosts.map((post) => {
            const color = getCommunityColor(post.communityId)
            return (
              <Link
                key={post.id}
                to={`/community/${post.communityId}`}
                className="flex-shrink-0 w-[240px] rounded-lg overflow-hidden snap-start"
                style={{ backgroundColor: '#111', border: '1px solid #222' }}
              >
                {post.image && (
                  <div className="h-28 overflow-hidden">
                    <img src={post.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-body text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
                      {post.communityTag}
                    </span>
                  </div>
                  <p className="font-body text-xs line-clamp-2" style={{ color: '#aaa' }}>{post.content}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Heart size={10} fill={color} stroke={color} />
                    <span className="font-body text-[10px]" style={{ color: '#666' }}>{post.likedBy.length}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ═══ CATEGORY TABS ═══ */}
      <div className="px-4 pb-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 font-body text-xs px-4 py-2 rounded-full transition-colors"
              style={{
                backgroundColor: activeCategory === cat ? '#d93a3a' : '#111',
                color: activeCategory === cat ? '#fff' : '#888',
                border: '1px solid',
                borderColor: activeCategory === cat ? '#d93a3a' : '#222',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ COMMUNITY GRID ═══ */}
      <div className="px-4 pb-20">
        <div className="flex flex-col gap-3">
          {filteredCommunities.map((c) => (
            <Link
              key={c.id}
              to={`/community/${c.id}`}
              className="flex gap-3 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: '#111', border: '1px solid #222' }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-body text-sm font-semibold" style={{ color: '#fff' }}>{c.name}</span>
                  <span className="font-body text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                    {c.category}
                  </span>
                </div>
                <p className="font-body text-xs line-clamp-1 mb-1.5" style={{ color: '#666' }}>{c.description}</p>
                {/* Subcommittees */}
                <div className="flex flex-wrap gap-1">
                  {c.subs.map((sub) => (
                    <span
                      key={sub}
                      className="font-body text-[9px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-body text-[10px]" style={{ color: '#555' }}>{c.members} members</span>
                  <span className="font-body text-[10px]" style={{ color: c.color }}>{c.active} active</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
