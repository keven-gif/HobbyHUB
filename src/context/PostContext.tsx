import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchPosts, insertPost, deletePost as deletePostDb, toggleLikePost, toggleSavePost, addComment as addCommentDb } from '@/lib/supabaseQueries';

/* ─── Types ─── */
export interface Comment {
  id: string;
  userId: string;
  user: string;
  avatar: string;
  content: string;
  createdAt: number;
  parentId?: string;      // ID of parent comment (for threaded replies)
  replyToName?: string;   // Name of user being replied to
}

export interface Post {
  id: string;
  communityId: string;
  communityTag: string;
  userId: string;
  user: string;
  avatar: string;
  clanName: string;
  title: string;
  content: string;
  image: string;
  likedBy: string[];
  savedBy: string[];
  reportedBy: string[];
  comments: Comment[];
  createdAt: number;
}

/* ─── Transform Supabase row to Post ─── */
function rowToPost(row: any): Post {
  return {
    id: row.id,
    communityId: row.community_id,
    communityTag: row.community_tag,
    userId: row.user_id,
    user: row.user_name,
    avatar: row.avatar || '',
    clanName: row.clan_name || '',
    title: row.title || '',
    content: row.content,
    image: row.image || '',
    likedBy: row.liked_by || [],
    savedBy: row.saved_by || [],
    reportedBy: row.reported_by || [],
    comments: (row.comments || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      user: c.user,
      avatar: c.avatar,
      content: c.content,
      createdAt: new Date(c.created_at).getTime(),
      parentId: c.parent_id || undefined,
      replyToName: c.reply_to_name || undefined,
    })),
    createdAt: new Date(row.created_at).getTime(),
  };
}

/* ─── Actions ─── */
type Action =
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'DELETE_POST'; payload: string }
  | { type: 'UPDATE_POST'; payload: Post }
  | { type: 'TOGGLE_LIKE'; payload: { postId: string; userId: string; likedBy: string[] } }
  | { type: 'TOGGLE_SAVE'; payload: { postId: string; userId: string; savedBy: string[] } }
  | { type: 'ADD_COMMENT'; payload: { postId: string; comments: Comment[] } };

interface State { posts: Post[]; }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_POSTS': return { posts: action.payload };
    case 'ADD_POST': {
      // Prevent duplicates from optimistic UI + realtime
      if (state.posts.some((p) => p.id === action.payload.id)) return state;
      return { posts: [action.payload, ...state.posts] };
    }
    case 'DELETE_POST': return { posts: state.posts.filter((p) => p.id !== action.payload) };
    case 'UPDATE_POST': {
      // Merge: only update fields that actually changed, preserve local data
      return {
        posts: state.posts.map((p) => {
          if (p.id !== action.payload.id) return p;
          return {
            ...p,
            likedBy: action.payload.likedBy ?? p.likedBy,
            savedBy: action.payload.savedBy ?? p.savedBy,
            reportedBy: action.payload.reportedBy ?? p.reportedBy,
            comments: action.payload.comments ?? p.comments,
            // Never overwrite content/avatar/user with null from realtime
            avatar: action.payload.avatar || p.avatar,
            user: action.payload.user || p.user,
            content: action.payload.content || p.content,
            image: action.payload.image || p.image,
            title: action.payload.title || p.title,
          };
        }),
      };
    }
    case 'TOGGLE_LIKE': return { posts: state.posts.map((p) => p.id === action.payload.postId ? { ...p, likedBy: action.payload.likedBy } : p) };
    case 'TOGGLE_SAVE': return { posts: state.posts.map((p) => p.id === action.payload.postId ? { ...p, savedBy: action.payload.savedBy } : p) };
    case 'ADD_COMMENT': return { posts: state.posts.map((p) => p.id === action.payload.postId ? { ...p, comments: action.payload.comments } : p) };
    default: return state;
  }
}

/* ─── Context ─── */
interface PostContextValue {
  posts: Post[];
  addPost: (data: Omit<Post, 'id' | 'likedBy' | 'savedBy' | 'reportedBy' | 'comments' | 'createdAt'>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  toggleSave: (postId: string, userId: string) => Promise<void>;
  reportPost: (postId: string, userId: string) => Promise<void>;
  addComment: (postId: string, data: Omit<Comment, 'id' | 'createdAt'>) => Promise<void>;
  getPostsForCommunity: (communityId: string) => Post[];
  searchPosts: (query: string) => Post[];
  pinPost: (userId: string, postId: string) => Promise<void>;
  unpinPost: (userId: string) => Promise<void>;
}

const PostContext = createContext<PostContextValue | null>(null);

export function usePosts() {
  const ctx = useContext(PostContext);
  if (!ctx) throw new Error('usePosts must be used within PostProvider');
  return ctx;
}

/* ─── Provider ─── */
export function PostProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { posts: [] });

  /* Load posts from Supabase — limit to 50 for performance */
  const loadPosts = useCallback(async () => {
    try {
      const rows = await fetchPosts(undefined, 50);
      dispatch({ type: 'SET_POSTS', payload: rows.map(rowToPost) });
    } catch (e) { console.error('[Posts] Load failed:', e); }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* Realtime subscription — targeted updates, NOT full reload */
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = rowToPost(payload.new);
        dispatch({ type: 'ADD_POST', payload: newPost });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const updated = rowToPost(payload.new);
        dispatch({ type: 'UPDATE_POST', payload: updated });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        dispatch({ type: 'DELETE_POST', payload: payload.old.id });
      })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, []);

  const addPost = useCallback(
    async (data: Omit<Post, 'id' | 'likedBy' | 'savedBy' | 'reportedBy' | 'comments' | 'createdAt'>) => {
      try {
        const row = await insertPost({
          community_id: data.communityId,
          community_tag: data.communityTag,
          user_id: data.userId,
          user_name: data.user,
          avatar: data.avatar,
          clan_name: data.clanName,
          title: data.title,
          content: data.content,
          image: data.image,
        });
        dispatch({ type: 'ADD_POST', payload: rowToPost(row) });
      } catch (e) { console.error('[Posts] Add failed:', e); }
    },
    []
  );

  const deletePostFn = useCallback(
    async (postId: string) => {
      try {
        await deletePostDb(postId);
        dispatch({ type: 'DELETE_POST', payload: postId });
      } catch (e) { console.error('[Posts] Delete failed:', e); }
    },
    []
  );

  const toggleLike = useCallback(
    async (postId: string, userId: string) => {
      const post = state.posts.find((p) => p.id === postId);
      if (!post) return;
      const newLikedBy = post.likedBy.includes(userId)
        ? post.likedBy.filter((id) => id !== userId)
        : [...post.likedBy, userId];
      // Optimistic UI update first
      dispatch({ type: 'TOGGLE_LIKE', payload: { postId, userId, likedBy: newLikedBy } });
      try {
        await toggleLikePost(postId, userId, post.likedBy);
      } catch (e: any) {
        // Revert on failure
        dispatch({ type: 'TOGGLE_LIKE', payload: { postId, userId, likedBy: post.likedBy } });
        throw new Error('Like failed: ' + (e?.message || 'Unknown error'));
      }
    },
    [state.posts]
  );

  const toggleSave = useCallback(
    async (postId: string, userId: string) => {
      const post = state.posts.find((p) => p.id === postId);
      if (!post) return;
      const newSavedBy = post.savedBy.includes(userId)
        ? post.savedBy.filter((id) => id !== userId)
        : [...post.savedBy, userId];
      dispatch({ type: 'TOGGLE_SAVE', payload: { postId, userId, savedBy: newSavedBy } });
      try {
        await toggleSavePost(postId, userId, post.savedBy);
      } catch (e: any) {
        dispatch({ type: 'TOGGLE_SAVE', payload: { postId, userId, savedBy: post.savedBy } });
        throw new Error('Save failed: ' + (e?.message || 'Unknown error'));
      }
    },
    [state.posts]
  );

  const reportPost = useCallback(
    async (postId: string, userId: string) => {
      const post = state.posts.find((p) => p.id === postId);
      if (!post) return;
      const reported = post.reportedBy.includes(userId);
      const newReportedBy = reported
        ? post.reportedBy.filter((id) => id !== userId)
        : [...post.reportedBy, userId];
      dispatch({ type: 'UPDATE_POST', payload: { ...post, reportedBy: newReportedBy } });
      try {
        await supabase!.from('posts').update({ reported_by: newReportedBy }).eq('id', postId);
      } catch (e: any) {
        dispatch({ type: 'UPDATE_POST', payload: { ...post, reportedBy: post.reportedBy } });
        throw new Error('Report failed: ' + (e?.message || 'Unknown error'));
      }
    },
    [state.posts]
  );

  const addComment = useCallback(
    async (postId: string, data: Omit<Comment, 'id' | 'createdAt'>) => {
      const post = state.posts.find((p) => p.id === postId);
      if (!post) return;
      const comment: Comment = { ...data, id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
      const newComments = [...post.comments, comment];
      dispatch({ type: 'ADD_COMMENT', payload: { postId, comments: newComments } });
      try {
        await addCommentDb(postId, newComments.map((c) => ({
          id: c.id,
          user_id: c.userId,
          user: c.user,
          avatar: c.avatar,
          content: c.content,
          created_at: new Date(c.createdAt).toISOString(),
          parent_id: c.parentId || null,
          reply_to_name: c.replyToName || null,
        })));
      } catch (e: any) {
        dispatch({ type: 'ADD_COMMENT', payload: { postId, comments: post.comments } });
        throw new Error('Comment failed: ' + (e?.message || 'Unknown error'));
      }
    },
    [state.posts]
  );

  const getPostsForCommunity = useCallback(
    (communityId: string) => state.posts.filter((p) => p.communityId === communityId),
    [state.posts]
  );

  const searchPosts = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return state.posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.communityTag.toLowerCase().includes(q) ||
          p.user.toLowerCase().includes(q)
      );
    },
    [state.posts]
  );

  /* ── Pin / Unpin post on profile ── */
  const pinPost = useCallback(
    async (userId: string, postId: string) => {
      const { error } = await supabase!.from('profiles').update({ pinned_post_id: postId }).eq('id', userId);
      if (error) throw new Error('Pin failed: ' + error.message);
    },
    []
  );

  const unpinPost = useCallback(
    async (userId: string) => {
      const { error } = await supabase!.from('profiles').update({ pinned_post_id: null }).eq('id', userId);
      if (error) throw new Error('Unpin failed: ' + error.message);
    },
    []
  );

  return (
    <PostContext.Provider
      value={{
        posts: state.posts,
        addPost,
        deletePost: deletePostFn,
        toggleLike,
        toggleSave,
        reportPost,
        addComment,
        getPostsForCommunity,
        searchPosts,
        pinPost,
        unpinPost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
}
