import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getAllCommunities, getCommunity as getDefaultCommunity, type Subcommittee } from '@/data/communityData';

/* ─── Types ─── */
export interface CommunityData {
  id: string;
  name: string;
  description: string;
  cover: string;
  accentColor: string;
  memberCount: number;
  activeNow: number;
  subcommittees: Subcommittee[];
}

interface CommunityContextType {
  communities: CommunityData[];
  updateCommunityCover: (communityId: string, newCover: string) => void;
  updateSubcommitteeImage: (communityId: string, subcommitteeId: string, newImage: string) => void;
  addCommunity: (community: Omit<CommunityData, 'id'>) => string;
  addSubcommittee: (communityId: string, sub: Omit<Subcommittee, 'id'>) => void;
  removeCommunity: (communityId: string) => void;
  removeSubcommittee: (communityId: string, subcommitteeId: string) => void;
  getCommunity: (communityId: string) => CommunityData | undefined;
  getSubcommittees: (communityId: string) => Subcommittee[];
}

const CommunityContext = createContext<CommunityContextType | null>(null);

export function useCommunity(): CommunityContextType {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within <CommunityProvider>');
  return ctx;
}

const STORAGE_KEY = 'hobbyhub_communities';

/* ─── Load defaults from communityData.ts ─── */
function loadDefaults(): CommunityData[] {
  const ids = getAllCommunities();
  return ids.map((id) => {
    const c = getDefaultCommunity(id);
    return {
      id,
      name: c.name,
      description: c.description,
      cover: c.cover,
      accentColor: c.accentColor,
      memberCount: c.memberCount || 0,
      activeNow: c.activeNow || 0,
      subcommittees: c.subcommittees,
    };
  });
}

/* ─── Load from localStorage (with defaults fallback) ─── */
function loadCommunities(): CommunityData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CommunityData[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  const defaults = loadDefaults();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveCommunities(communities: CommunityData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(communities));
}

/* ─── Provider ─── */
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [communities, setCommunities] = useState<CommunityData[]>(loadCommunities);

  /* Sync to localStorage whenever communities change */
  useEffect(() => {
    saveCommunities(communities);
  }, [communities]);

  /* Get a single community */
  const getCommunity = useCallback((communityId: string) => {
    return communities.find((c) => c.id === communityId);
  }, [communities]);

  /* Get subcommittees for a community */
  const getSubcommittees = useCallback((communityId: string) => {
    return communities.find((c) => c.id === communityId)?.subcommittees || [];
  }, [communities]);

  /* Update community cover image */
  const updateCommunityCover = useCallback((communityId: string, newCover: string) => {
    setCommunities((prev) =>
      prev.map((c) => (c.id === communityId ? { ...c, cover: newCover } : c))
    );
  }, []);

  /* Update subcommittee image */
  const updateSubcommitteeImage = useCallback((communityId: string, subcommitteeId: string, newImage: string) => {
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? {
              ...c,
              subcommittees: c.subcommittees.map((s) =>
                s.id === subcommitteeId ? { ...s, image: newImage } : s
              ),
            }
          : c
      )
    );
  }, []);

  /* Add new community */
  const addCommunity = useCallback((community: Omit<CommunityData, 'id'>): string => {
    const id = community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCommunity: CommunityData = { ...community, id };
    setCommunities((prev) => {
      // Remove existing if same ID
      const filtered = prev.filter((c) => c.id !== id);
      return [...filtered, newCommunity];
    });
    return id;
  }, []);

  /* Add subcommittee to existing community */
  const addSubcommittee = useCallback((communityId: string, sub: Omit<Subcommittee, 'id'>) => {
    const id = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newSub: Subcommittee = { ...sub, id };
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, subcommittees: [...c.subcommittees, newSub] }
          : c
      )
    );
  }, []);

  /* Remove community */
  const removeCommunity = useCallback((communityId: string) => {
    setCommunities((prev) => prev.filter((c) => c.id !== communityId));
  }, []);

  /* Remove subcommittee */
  const removeSubcommittee = useCallback((communityId: string, subcommitteeId: string) => {
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, subcommittees: c.subcommittees.filter((s) => s.id !== subcommitteeId) }
          : c
      )
    );
  }, []);

  return (
    <CommunityContext.Provider
      value={{
        communities,
        updateCommunityCover,
        updateSubcommitteeImage,
        addCommunity,
        addSubcommittee,
        removeCommunity,
        removeSubcommittee,
        getCommunity,
        getSubcommittees,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}
