import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { spatialApi, overpassApi, type SpatialQueryRequest, type SpatialQueryResponse } from '../api/client';

export type QueryType = 'buffer-zone' | 'within' | 'contains' | 'intersects' | 'supply-chain';

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface SearchHistoryItem {
  id: string;
  location: Location;
  queryType: QueryType;
  radius: number;
  resultsCount: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AppState {
  // Query state
  isQuerying: boolean;
  queryProgress: number;
  queryType: QueryType;
  radius: number;
  selectedLocation: Location | null;
  activeQueryResults: SpatialQueryResponse | null;
  executionTimeMs: number;

  // Panels
  showBento: boolean;
  showAIChat: boolean;
  selectedCategory: string;

  // Theme
  theme: 'dark' | 'light';

  // History (persisted)
  searchHistory: SearchHistoryItem[];

  // AI chat (session only)
  chatMessages: ChatMessage[];
  sessionId: string;
  isChatLoading: boolean;

  // Overpass fetch status
  overpassStatus: string | null;

  // Error
  error: string | null;

  // Actions
  setQuerying: (v: boolean) => void;
  setQueryProgress: (v: number) => void;
  setQueryType: (v: QueryType) => void;
  setRadius: (v: number) => void;
  setSelectedLocation: (v: Location | null) => void;
  setShowBento: (v: boolean) => void;
  setShowAIChat: (v: boolean) => void;
  setSelectedCategory: (v: string) => void;
  toggleTheme: () => void;
  setError: (v: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatLoading: (v: boolean) => void;

  performSpatialQuery: (type?: QueryType) => Promise<void>;
  clearHistory: () => void;
  reset: () => void;
}

const genId = () => Math.random().toString(36).slice(2);

const initial = {
  isQuerying: false,
  queryProgress: 0,
  queryType: 'buffer-zone' as QueryType,
  radius: 1000,
  selectedLocation: null,
  activeQueryResults: null,
  executionTimeMs: 0,
  showBento: false,
  showAIChat: false,
  selectedCategory: 'all',
  theme: 'dark' as const,
  searchHistory: [],
  chatMessages: [],
  sessionId: genId(),
  isChatLoading: false,
  overpassStatus: null,
  error: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initial,

        setQuerying: (v) => set({ isQuerying: v }),
        setQueryProgress: (v) => set({ queryProgress: v }),
        setQueryType: (v) => set({ queryType: v }),
        setRadius: (v) => set({ radius: v }),
        setSelectedLocation: (v) => set({ selectedLocation: v }),
        setShowBento: (v) => set({ showBento: v }),
        setShowAIChat: (v) => set({ showAIChat: v }),
        setSelectedCategory: (v) => set({ selectedCategory: v }),
        toggleTheme: () =>
          set((s) => {
            const next = s.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            return { theme: next };
          }),
        setError: (v) => set({ error: v }),
        addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
        setChatLoading: (v) => set({ isChatLoading: v }),

        performSpatialQuery: async (typeOverride) => {
          const { selectedLocation, queryType, radius, sessionId } = get();
          if (!selectedLocation) return;

          const type = typeOverride ?? queryType;
          set({ isQuerying: true, queryProgress: 5, error: null, overpassStatus: null });

          // Step 1: Fetch real OSM data from Overpass into PostGIS
          try {
            set({ overpassStatus: 'Fetching live OSM data...' });
            const osmResult = await overpassApi.fetch({
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
              radius: Math.min(radius * 2, 5000), // fetch wider area
            });
            set({
              queryProgress: 30,
              overpassStatus: `OSM: ${osmResult.inserted} new, ${osmResult.updated} updated`,
            });
          } catch {
            // Overpass failed (rate-limit, timeout) — proceed with local DB data
            set({ queryProgress: 30, overpassStatus: 'OSM fetch skipped (using local DB)' });
          }

          // Step 2: Run PostGIS spatial query on the now-enriched DB
          const req: SpatialQueryRequest = {
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            radius,
            query: selectedLocation.name,
            session_id: sessionId,
          };

          try {
            set({ queryProgress: 50 });
            await new Promise((r) => setTimeout(r, 100));
            set({ queryProgress: 75 });

            let res: SpatialQueryResponse;
            switch (type) {
              case 'buffer-zone': res = await spatialApi.bufferZone(req); break;
              case 'within': res = await spatialApi.within(req); break;
              case 'contains': res = await spatialApi.contains(req); break;
              case 'intersects': res = await spatialApi.intersects(req); break;
              case 'supply-chain': res = await spatialApi.supplyChain(req); break;
            }

            set({ queryProgress: 100, activeQueryResults: res, executionTimeMs: res.execution_time_ms });

            const pointFeatures = res.features.filter((f) => f.geometry.type === 'Point');
            const historyItem: SearchHistoryItem = {
              id: genId(),
              location: selectedLocation,
              queryType: type,
              radius,
              resultsCount: pointFeatures.length,
              timestamp: Date.now(),
            };
            set((s) => ({ searchHistory: [historyItem, ...s.searchHistory].slice(0, 50) }));

            await new Promise((r) => setTimeout(r, 300));
            set({ isQuerying: false, showBento: true, overpassStatus: null });
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Query failed',
              isQuerying: false,
              queryProgress: 0,
              overpassStatus: null,
            });
          }
        },

        clearHistory: () => set({ searchHistory: [] }),
        reset: () => set(initial),
      }),
      {
        name: 'bizby-store',
        partialize: (s) => ({ theme: s.theme, searchHistory: s.searchHistory, radius: s.radius, queryType: s.queryType }),
      }
    )
  )
);