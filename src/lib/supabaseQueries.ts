/**
 * Supabase Query Helpers
 * All data operations go through Supabase as primary source.
 */

import { supabase } from './supabase';

/* ─── PROFILES ─── */

export async function fetchProfiles() {
  const { data, error } = await supabase!.from('profiles').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile: {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  clan_name?: string;
  bio?: string;
  is_admin?: boolean;
}) {
  const { error } = await supabase!.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

/* ─── POSTS ─── */

export async function fetchPosts(communityId?: string, limit = 100) {
  let query = supabase!
    .from('posts')
    .select('id,community_id,community_tag,user_id,user_name,avatar,clan_name,title,content,image,liked_by,saved_by,reported_by,comments,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (communityId) query = query.eq('community_id', communityId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function insertPost(post: {
  community_id: string;
  community_tag: string;
  user_id: string;
  user_name: string;
  avatar?: string;
  clan_name?: string;
  title?: string;
  content: string;
  image?: string;
}) {
  const { data, error } = await supabase!.from('posts').insert(post).select().single();
  if (error) throw error;
  return data;
}

export async function deletePost(postId: string) {
  const { error } = await supabase!.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleLikePost(postId: string, userId: string, currentLikedBy: string[]) {
  const liked = currentLikedBy.includes(userId);
  const newLikedBy = liked
    ? currentLikedBy.filter((id) => id !== userId)
    : [...currentLikedBy, userId];
  const { error } = await supabase!.from('posts').update({ liked_by: newLikedBy }).eq('id', postId);
  if (error) throw error;
  return newLikedBy;
}

export async function toggleSavePost(postId: string, userId: string, currentSavedBy: string[]) {
  const saved = currentSavedBy.includes(userId);
  const newSavedBy = saved
    ? currentSavedBy.filter((id) => id !== userId)
    : [...currentSavedBy, userId];
  const { error } = await supabase!.from('posts').update({ saved_by: newSavedBy }).eq('id', postId);
  if (error) throw error;
  return newSavedBy;
}

export async function addComment(postId: string, comments: any[]) {
  const { error } = await supabase!.from('posts').update({ comments }).eq('id', postId);
  if (error) throw error;
}

/* ─── FRIEND REQUESTS ─── */

export async function fetchFriendRequests(userId: string) {
  const { data, error } = await supabase!
    .from('friend_requests')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendFriendRequest(req: {
  from_user_id: string;
  from_user_name: string;
  from_user_avatar?: string;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar?: string;
}) {
  const { data, error } = await supabase!.from('friend_requests').insert(req).select().single();
  if (error) throw error;
  return data;
}

export async function updateFriendRequest(requestId: string, status: 'accepted' | 'declined') {
  const { error } = await supabase!.from('friend_requests').update({ status }).eq('id', requestId);
  if (error) throw error;
}

export async function deleteFriendRequest(requestId: string) {
  const { error } = await supabase!.from('friend_requests').delete().eq('id', requestId);
  if (error) throw error;
}

/* ─── SUBCOMMITTEE JOINS ─── */

export async function fetchSubcommitteeJoins(userId?: string) {
  let query = supabase!.from('subcommittee_joins').select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchCommunityMembers(subcommitteeIds: string[]) {
  const { data, error } = await supabase!
    .from('subcommittee_joins')
    .select('user_id, profiles(id, name, username, avatar, email)')
    .in('subcommittee_id', subcommitteeIds);
  if (error) throw error;
  return data || [];
}

export async function joinSubcommittee(userId: string, subcommitteeId: string, communityId: string) {
  const { error } = await supabase!
    .from('subcommittee_joins')
    .upsert({ user_id: userId, subcommittee_id: subcommitteeId, community_id: communityId }, {
      onConflict: 'user_id,subcommittee_id',
    });
  if (error) throw error;
}

export async function leaveSubcommittee(userId: string, subcommitteeId: string) {
  const { error } = await supabase!
    .from('subcommittee_joins')
    .delete()
    .eq('user_id', userId)
    .eq('subcommittee_id', subcommitteeId);
  if (error) throw error;
}

/* ─── USER ACTIVITY ─── */

export async function recordActivity(userId: string, name: string, avatar?: string) {
  const { error } = await supabase!
    .from('user_activity')
    .upsert({ user_id: userId, user_name: name, user_avatar: avatar }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchActiveUsers() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await supabase!
    .from('user_activity')
    .select('*')
    .gte('last_seen', fifteenMinutesAgo)
    .order('last_seen', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ─── NOTIFICATIONS ─── */

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase!
    .from('notifications')
    .select('*')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertNotification(notification: {
  type: string;
  title: string;
  message: string;
  from_user_id?: string;
  from_user_name?: string;
  from_user_avatar?: string;
  to_user_id: string;
  link?: string;
}) {
  const { error } = await supabase!.from('notifications').insert(notification);
  if (error) throw error;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase!.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) throw error;
}

/* ─── EVENTS ─── */
export async function fetchEvents(communityId: string) {
  const { data, error } = await supabase!
    .from('events')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createEvent(event: {
  community_id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  created_by: string;
  creator_name?: string;
}) {
  const { data, error } = await supabase!.from('events').insert(event).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase!.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

/* ─── WIKI ARTICLES ─── */
export async function fetchWikiArticles(communityId: string) {
  const { data, error } = await supabase!
    .from('wiki_articles')
    .select('*')
    .eq('community_id', communityId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchWikiArticle(articleId: string) {
  const { data, error } = await supabase!
    .from('wiki_articles')
    .select('*')
    .eq('id', articleId)
    .single();
  if (error) throw error;
  return data;
}

export async function createWikiArticle(article: {
  community_id: string;
  subcommittee_id?: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_avatar?: string;
}) {
  const { data, error } = await supabase!.from('wiki_articles').insert(article).select().single();
  if (error) throw error;
  return data;
}

export async function updateWikiArticle(
  articleId: string,
  updates: { title: string; content: string; category: string; tags: string[]; subcommittee_id?: string }
) {
  const { data, error } = await supabase!
    .from('wiki_articles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWikiArticle(articleId: string) {
  const { error } = await supabase!.from('wiki_articles').delete().eq('id', articleId);
  if (error) throw error;
}

/* ─── Q&A QUESTIONS ─── */
export async function fetchQuestions(communityId: string) {
  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchQuestion(questionId: string) {
  const { data, error } = await supabase!
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();
  if (error) throw error;
  return data;
}

export async function createQuestion(question: {
  community_id: string;
  subcommittee_id?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  body: string;
}) {
  const { data, error } = await supabase!.from('questions').insert(question).select().single();
  if (error) throw error;
  return data;
}

export async function updateQuestionAnswers(questionId: string, answers: any[], isResolved: boolean) {
  const { error } = await supabase!
    .from('questions')
    .update({ answers, is_resolved: isResolved })
    .eq('id', questionId);
  if (error) throw error;
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase!.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}

/* ─── MENTORS ─── */
export async function fetchMentors(communityId: string) {
  const { data, error } = await supabase!
    .from('mentors')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function becomeMentor(mentor: {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  community_id: string;
  subcommittee_id: string;
  bio?: string;
}) {
  const { data, error } = await supabase!
    .from('mentors')
    .upsert(mentor, { onConflict: 'user_id,subcommittee_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeMentor(userId: string, subcommitteeId: string) {
  const { error } = await supabase!
    .from('mentors')
    .delete()
    .eq('user_id', userId)
    .eq('subcommittee_id', subcommitteeId);
  if (error) throw error;
}

/* ─── PROJECTS ─── */
export async function fetchProjects(communityId: string) {
  const { data, error } = await supabase!
    .from('projects')
    .select('*')
    .eq('community_id', communityId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchProject(projectId: string) {
  const { data, error } = await supabase!
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(project: {
  community_id: string;
  subcommittee_id?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  description: string;
  status: string;
  cover_image?: string;
}) {
  const { data, error } = await supabase!.from('projects').insert(project).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  projectId: string,
  updates: { status?: string; updates?: any[] }
) {
  const { data, error } = await supabase!
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase!.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

/* ─── MODERATION ─── */
export async function clearPostReports(postId: string) {
  const { error } = await supabase!.from('posts').update({ reported_by: [] }).eq('id', postId);
  if (error) throw error;
}

export async function toggleWikiArticleReport(articleId: string, userId: string, currentReportedBy: string[]) {
  const next = currentReportedBy.includes(userId)
    ? currentReportedBy.filter((id) => id !== userId)
    : [...currentReportedBy, userId];
  const { error } = await supabase!.from('wiki_articles').update({ reported_by: next }).eq('id', articleId);
  if (error) throw error;
  return next;
}

export async function clearWikiArticleReports(articleId: string) {
  const { error } = await supabase!.from('wiki_articles').update({ reported_by: [] }).eq('id', articleId);
  if (error) throw error;
}

export async function toggleQuestionReport(questionId: string, userId: string, currentReportedBy: string[]) {
  const next = currentReportedBy.includes(userId)
    ? currentReportedBy.filter((id) => id !== userId)
    : [...currentReportedBy, userId];
  const { error } = await supabase!.from('questions').update({ reported_by: next }).eq('id', questionId);
  if (error) throw error;
  return next;
}

export async function clearQuestionReports(questionId: string) {
  const { error } = await supabase!.from('questions').update({ reported_by: [] }).eq('id', questionId);
  if (error) throw error;
}

export async function toggleProjectReport(projectId: string, userId: string, currentReportedBy: string[]) {
  const next = currentReportedBy.includes(userId)
    ? currentReportedBy.filter((id) => id !== userId)
    : [...currentReportedBy, userId];
  const { error } = await supabase!.from('projects').update({ reported_by: next }).eq('id', projectId);
  if (error) throw error;
  return next;
}

export async function clearProjectReports(projectId: string) {
  const { error } = await supabase!.from('projects').update({ reported_by: [] }).eq('id', projectId);
  if (error) throw error;
}

/* Cross-community fetches for the admin moderation queue */
export async function fetchAllWikiArticles() {
  const { data, error } = await supabase!.from('wiki_articles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllQuestions() {
  const { data, error } = await supabase!.from('questions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllProjects() {
  const { data, error } = await supabase!.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ─── UPVOTES (Guides) ─── */
export async function toggleWikiArticleUpvote(articleId: string, userId: string, currentUpvotedBy: string[]) {
  const next = currentUpvotedBy.includes(userId)
    ? currentUpvotedBy.filter((id) => id !== userId)
    : [...currentUpvotedBy, userId];
  const { error } = await supabase!.from('wiki_articles').update({ upvoted_by: next }).eq('id', articleId);
  if (error) throw error;
  return next;
}

/* ─── FOUNDER UPDATES ─── */
export async function fetchFounderUpdates() {
  const { data, error } = await supabase!
    .from('founder_updates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createFounderUpdate(update: {
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
}) {
  const { data, error } = await supabase!.from('founder_updates').insert(update).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFounderUpdate(updateId: string) {
  const { error } = await supabase!.from('founder_updates').delete().eq('id', updateId);
  if (error) throw error;
}

/* ─── DATA SOVEREIGNTY ─── */
/** Everything the app has stored that's identifiably this user's. */
export async function exportUserData(userId: string) {
  const [profile, posts, guides, questions, projects, joins, mentorListings, friendRequests] = await Promise.all([
    supabase!.from('profiles').select('*').eq('id', userId).single().then((r) => r.data),
    supabase!.from('posts').select('*').eq('user_id', userId).then((r) => r.data || []),
    supabase!.from('wiki_articles').select('*').eq('author_id', userId).then((r) => r.data || []),
    supabase!.from('questions').select('*').eq('author_id', userId).then((r) => r.data || []),
    supabase!.from('projects').select('*').eq('author_id', userId).then((r) => r.data || []),
    supabase!.from('subcommittee_joins').select('*').eq('user_id', userId).then((r) => r.data || []),
    supabase!.from('mentors').select('*').eq('user_id', userId).then((r) => r.data || []),
    supabase!.from('friend_requests').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).then((r) => r.data || []),
  ]);

  return {
    exported_at: new Date().toISOString(),
    profile,
    posts,
    guides,
    questions,
    projects,
    subcommittee_joins: joins,
    mentor_listings: mentorListings,
    friend_requests: friendRequests,
  };
}

/** Deletes everything this user authored -- posts, guides, questions,
 * projects. Does NOT delete the account itself (that needs a service-role
 * backend action this client-only app doesn't have). */
export async function deleteAllUserContent(userId: string) {
  await Promise.all([
    supabase!.from('posts').delete().eq('user_id', userId),
    supabase!.from('wiki_articles').delete().eq('author_id', userId),
    supabase!.from('questions').delete().eq('author_id', userId),
    supabase!.from('projects').delete().eq('author_id', userId),
  ]);
}
