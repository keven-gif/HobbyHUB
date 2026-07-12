/* ───────── Types ───────── */

export interface Post {
  id: string
  user: string
  avatar: string
  timeAgo: string
  text: string
  image?: string
  likes: number
  comments: number
  saves: number
  communityTag: string
  aspectRatio?: string
}

export interface Build {
  id: string
  title: string
  user: string
  avatar: string
  image: string
  tags: string[]
  likes: number
  creator?: string
  progress?: string
}

export interface Member {
  id: string
  name: string
  avatar: string
  role: string
  points: number
  isOnline?: boolean
  posts?: number
  likes?: number
  joinedDate?: string
}

export interface Event {
  id: string
  title: string
  date: string
  description: string
  attendees: number
  location: string
  host?: string
}

export interface Subcommittee {
  id: string
  name: string
  description: string
  memberCount: number
  image?: string
}

interface CommunityInfo {
  name: string
  description: string
  cover: string
  accentColor: string
  tagline?: string
  memberCount?: number
  postCount?: number
  category?: string
  activeNow?: number
  createdDate?: string
  coverImage?: string
  subcommittees: Subcommittee[]
}

interface RulesData {
  rules: string[]
  moderators: { name: string; avatar: string }[]
}

/* ───────── Community info map ───────── */

const communityInfoMap: Record<string, CommunityInfo> = {
  'model-kits': {
    name: 'Model Kits',
    description: 'Scale model builders unite — share your builds, techniques, and collections across all types of kits. Join the community and share your passion.',
    cover: '/explore-gundam.jpg',
    accentColor: '#3a8cff',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'gundam', name: 'Gundam', description: 'All things Gundam — anime, kits, collectibles, and lore', memberCount: 0, image: '/explore-gundam.jpg' },
      { id: 'cars', name: 'Cars', description: 'Die-cast and model car builds and dioramas', memberCount: 0, image: '/explore-cars.jpg' },
      { id: 'planes', name: 'Planes', description: 'Aircraft scale models — military and civilian', memberCount: 0, image: '/sub-planes.jpg' },
      { id: 'legos', name: 'Legos', description: 'LEGO MOCs, sets, and custom brick builds', memberCount: 0, image: '/sub-legos.jpg' },
    ],
  },
  cars: {
    name: 'Cars',
    description: 'For car enthusiasts — from restorations to track days, share your builds and passion. Join the community and share your passion.',
    cover: '/explore-cars.jpg',
    accentColor: '#d93a3a',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'jdm', name: 'JDM', description: 'Japanese Domestic Market — imports, tuners, and JDM culture', memberCount: 0, image: '/sub-jdm.jpg' },
      { id: 'muscle', name: 'Muscle', description: 'American muscle cars — V8 power and classic Detroit iron', memberCount: 0, image: '/sub-muscle-car.jpg' },
      { id: 'classic', name: 'Classic', description: 'Vintage and classic car restoration and preservation', memberCount: 0, image: '/sub-classic-car.jpg' },
      { id: 'lowrider', name: 'Low Rider', description: 'Lowrider culture, hydraulics, and custom paint', memberCount: 0, image: '/sub-lowrider.jpg' },
    ],
  },
  tcg: {
    name: 'TCG',
    description: 'Trading card games — pulls, trades, deck builds, and grading. A thriving community of collectors across all major TCGs. across all major TCGs.',
    cover: '/explore-tcg.jpg',
    accentColor: '#8b5cf6',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'pokemon', name: 'Pokemon', description: 'Pokemon TCG — collecting, competitive play, and grading', memberCount: 0, image: '/explore-tcg.jpg' },
      { id: 'onepiece', name: 'One Piece', description: 'One Piece Card Game — meta, deck tech, and pulls', memberCount: 0, image: '/sub-onepiece.jpg' },
      { id: 'magic', name: 'Magic', description: 'Magic: The Gathering — all formats, all skill levels', memberCount: 0, image: '/sub-magic.jpg' },
      { id: 'digimon', name: 'Digimon', description: 'Digimon Card Game — deck building and trading', memberCount: 0, image: '/sub-digimon.jpg' },
      { id: 'dragonballz', name: 'Dragon Ball Z', description: 'Dragon Ball Super Card Game — fighters and collectors', memberCount: 0, image: '/sub-dragonballz.jpg' },
      { id: 'yugioh', name: 'Yu-Gi-Oh!', description: 'Yu-Gi-Oh! TCG — competitive, casual, and collecting', memberCount: 0, image: '/sub-yugioh.jpg' },
    ],
  },
  videogames: {
    name: 'Video Games',
    description: 'From retro classics to next-gen — gameplay clips, reviews, and setup showcases. Gamers sharing their passion.',
    cover: '/explore-videogames.jpg',
    accentColor: '#39ff14',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'modernwarfare', name: 'Modern Warfare', description: 'Call of Duty — multiplayer, ranked, and loadouts', memberCount: 0, image: '/explore-videogames.jpg' },
      { id: 'leagueoflegends', name: 'League of Legends', description: 'LoL — ranked climb, esports, and theorycrafting', memberCount: 0, image: '/sub-league.jpg' },
      { id: 'battlefield', name: 'Battlefield', description: 'Battlefield series — squad play, vehicles, and conquest', memberCount: 0, image: '/sub-battlefield.jpg' },
      { id: 'marvellegends', name: 'Marvel Legends', description: 'Marvel games — from Contest of Champions to Midnight Suns', memberCount: 0, image: '/sub-marvellegends.jpg' },
    ],
  },
  'rc-cars': {
    name: 'RC Cars',
    description: 'Bash, drift, race — share your RC rigs, jumps, mods, and track times. A tight-knit community of RC enthusiasts.',
    cover: '/explore-rc.jpg',
    accentColor: '#ff7b00',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'racing', name: 'Racing', description: 'On-road RC racing — asphalt, carpet, and organized events', memberCount: 0, image: '/explore-rc.jpg' },
      { id: 'offroad', name: 'Off Road', description: 'Bashing, dirt, and monster truck action', memberCount: 0, image: '/sub-rc-offroad.jpg' },
      { id: 'customs', name: 'Customs', description: 'Custom builds, paint, and scale accessories', memberCount: 0, image: '/sub-rc-custom.jpg' },
    ],
  },
  golf: {
    name: 'Golf',
    description: 'Tee off with fellow golfers — share swing tips, course reviews, gear talk, and tournament discussions. Join us!',
    cover: '/golf-cover.jpg',
    accentColor: '#2ecc71',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'pro', name: 'Pro', description: 'Advanced golfers — single-digit handicaps and tournament play', memberCount: 0, image: '/golf-pro.jpg' },
      { id: 'newbie', name: 'Newbie', description: 'Beginners welcome — tips, encouragement, and first-timer advice', memberCount: 0, image: '/golf-newbie.jpg' },
    ],
  },
  reading: {
    name: 'Reading',
    description: 'Book lovers unite — share recommendations, reviews, reading lists, and literary discussions. Avid readers sharing their love of books.',
    cover: '/community-reading.jpg',
    accentColor: '#e67e22',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'romance', name: 'Romance', description: 'Love stories, contemporary and historical romance', memberCount: 0, image: '/sub-romance.jpg' },
      { id: 'romcom', name: 'Rom-Com', description: 'Romantic comedy books — lighthearted love and laughs', memberCount: 0, image: '/sub-romcom.jpg' },
      { id: 'fantasy', name: 'Fantasy', description: 'Epic fantasy, urban fantasy, and magical worlds', memberCount: 0, image: '/sub-fantasy.jpg' },
      { id: 'horror', name: 'Horror', description: 'Horror fiction and psychological thrillers', memberCount: 0, image: '/sub-horror.jpg' },
      { id: 'scifi', name: 'Sci-Fi', description: 'Science fiction — space opera, cyberpunk, and dystopian', memberCount: 0, image: '/sub-scifi.jpg' },
    ],
  },
  'sports-betting': {
    name: 'Sports Betting',
    description: 'Responsible sports betting discussion — picks, strategies, odds analysis, and bankroll management. Join the community!',
    cover: '/community-sportsbetting.jpg',
    accentColor: '#f1c40f',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'basketball', name: 'Basketball', description: 'NBA, college hoops, and international basketball betting', memberCount: 0, image: '/sub-basketball.jpg' },
      { id: 'baseball', name: 'Baseball', description: 'MLB betting — lines, props, and season-long strategies', memberCount: 0, image: '/sub-baseball.jpg' },
      { id: 'soccer', name: 'Soccer', description: 'Football betting — Premier League, Champions League, and more', memberCount: 0, image: '/sub-soccer.jpg' },
      { id: 'football', name: 'Football', description: 'NFL and college football — spreads, totals, and props', memberCount: 0, image: '/sub-football.jpg' },
    ],
  },
  photography: {
    name: 'Photography',
    description: 'Capture the world — share shots, gear reviews, editing techniques, and composition tips. Shutterbugs sharing their work.',
    cover: '/explore-photography.jpg',
    accentColor: '#1abc9c',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'landscape', name: 'Landscape', description: 'Nature and landscape photography — mountains, oceans, skies', memberCount: 0, image: '/explore-photography.jpg' },
      { id: 'wildlife', name: 'Wildlife', description: 'Animal photography — birds, mammals, and macro critters', memberCount: 0, image: '/sub-wildlife.jpg' },
      { id: 'street', name: 'Street', description: 'Street photography — urban life, candid moments, and cityscapes', memberCount: 0, image: '/sub-street.jpg' },
    ],
  },
  gardening: {
    name: 'Gardening',
    description: 'Grow green thumbs together — from houseplants to vegetable gardens, share tips and harvests. Growers sharing their gardens.',
    cover: '/community-gardening.jpg',
    accentColor: '#27ae60',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'yard', name: 'Yard', description: 'Backyard gardens — lawns, flower beds, and landscaping', memberCount: 0, image: '/sub-yard.jpg' },
      { id: 'balcony', name: 'Balcony', description: 'Container gardening and small-space growing solutions', memberCount: 0, image: '/sub-balcony.jpg' },
    ],
  },
  sneakers: {
    name: 'Sneakers',
    description: 'Sneaker culture — pickups, restorations, custom work, and the latest drops. Sneakerheads sharing the culture.',
    cover: '/community-sneakers.jpg',
    accentColor: '#e74c3c',
    memberCount: 0,
    activeNow: 0,
    subcommittees: [
      { id: 'jordan', name: 'Jordan', description: 'Air Jordan line — retros, collabs, and the culture', memberCount: 0, image: '/sub-jordan.jpg' },
      { id: 'designer', name: 'Designer', description: 'Designer sneakers — Off-White, Yeezy, Balenciaga, and luxury kicks', memberCount: 0, image: '/sub-designer.jpg' },
    ],
  },
}

/* ───────── Mock posts ───────── */

const mockPostsMap: Record<string, Post[]> = {}

/* ───────── Mock builds ───────── */

const mockBuildsMap: Record<string, Build[]> = {}

/* ───────── Mock members ───────── */

const mockMembersMap: Record<string, Member[]> = {}

/* ───────── Mock events ───────── */

const mockEventsMap: Record<string, Event[]> = {}

/* ───────── Mock rules ───────── */

const mockRulesMap: Record<string, RulesData> = {}

/* ───────── API Functions ───────── */

export function getCommunity(communityId: string): CommunityInfo {
  return (
    communityInfoMap[communityId] ?? {
      name: communityId.toUpperCase(),
      description: 'A community for enthusiasts.',
      cover: '/explore-cars.jpg',
      accentColor: '#d93a3a',
      subcommittees: [],
    }
  )
}

export function getPosts(communityId: string): Post[] {
  return mockPostsMap[communityId] ?? []
}

export function getBuilds(communityId: string): Build[] {
  return mockBuildsMap[communityId] ?? []
}

export function getMembers(communityId: string): Member[] {
  return mockMembersMap[communityId] ?? []
}

export function getEvents(communityId: string): Event[] {
  return mockEventsMap[communityId] ?? []
}

export function getRules(communityId: string): RulesData {
  return (
    mockRulesMap[communityId] ?? {
      rules: ['Be respectful to all members.'],
      moderators: [],
    }
  )
}

export function getAllCommunities(): string[] {
  return Object.keys(communityInfoMap)
}

export function getSubcommittees(communityId: string): Subcommittee[] {
  return communityInfoMap[communityId]?.subcommittees ?? []
}
