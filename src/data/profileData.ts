export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  joinDate: string;
  avatar: string;
  coverImage: string;
  followers: number;
  following: number;
  posts: number;
  totalLikes: number;
  communities: number;
  buildLogs: number;
  isFollowing: boolean;
}

export interface Post {
  id: string;
  community: string;
  communityColor: string;
  timeAgo: string;
  content: string;
  images: string[];
  isVideo: boolean;
  likes: number;
  comments: number;
  bookmarks: number;
}

export interface Collection {
  id: string;
  name: string;
  itemCount: number;
  thumbnails: string[];
}

export interface BuildStep {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
}

export interface BuildLog {
  id: string;
  name: string;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'PLANNED';
  startDate: string;
  endDate?: string;
  hoursTotal: number;
  progress: number;
  steps: BuildStep[];
}

export interface CommunityMembership {
  id: string;
  name: string;
  coverImage: string;
  color: string;
  rank: string;
  postCount: number;
}

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  earned: boolean;
  earnedDate?: string;
}

export interface MonthlyActivity {
  month: string;
  posts: number;
}

export interface CommunityStat {
  name: string;
  count: number;
  color: string;
}

/* ── Empty defaults — no fake seed data ── */
export const userProfile: UserProfile = {
  id: '',
  username: '',
  displayName: '',
  bio: '',
  location: '',
  joinDate: '',
  avatar: '/avatar-1.jpg',
  coverImage: '/profile-cover.jpg',
  followers: 0,
  following: 0,
  posts: 0,
  totalLikes: 0,
  communities: 0,
  buildLogs: 0,
  isFollowing: false,
};

export const userPosts: Post[] = [];

export const collections: Collection[] = [];

export const buildLogs: BuildLog[] = [];

export const communityMemberships: CommunityMembership[] = [];

export const achievements: Achievement[] = [];

export const monthlyActivity: MonthlyActivity[] = [];

export const communityStats: CommunityStat[] = [];

export const hobbies: string[] = [];

export const socialLinks: { name: string; url: string }[] = [];

export const availableCommunities: { id: string; name: string; members: string; cover: string; color: string }[] = [];
