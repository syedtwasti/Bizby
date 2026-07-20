import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { geocodeApi } from '../api/client';
import type { GeocodeResult } from '../api/client';

export function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setSelectedLocation, performSpatialQuery, searchHistory } = useAppStore();

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await geocodeApi.search(query);
        setResults(data);
        setShowDropdown(true);
      } catch { setResults([]); }
      finally { setIsSearching(false); }
    }, 400);
  }, [query]);

  const handleSelect = (r: GeocodeResult) => {
    setSelectedLocation({ lat: r.lat, lng: r.lng, name: r.display_name.split(',')[0] });
    setQuery(r.display_name.split(',')[0]);
    setShowDropdown(false);
    performSpatialQuery();
  };

  const handleHistorySelect = (item: (typeof searchHistory)[0]) => {
    setSelectedLocation(item.location);
    setQuery(item.location.name);
    setShowDropdown(false);
    performSpatialQuery(item.queryType);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(15,17,23,0.92)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-accent)', borderRadius: 12,
        padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); } }}
          placeholder="Search any location..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text1)', fontSize: 15, fontFamily: 'inherit',
          }}
        />
        {isSearching && (
          <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} className="spin" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (results.length > 0 || searchHistory.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: 'rgba(15,17,23,0.97)', backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-accent)', borderRadius: 12,
              boxShadow: '0 16px 48px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 1000,
            }}>
            {results.length > 0 && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ padding: '6px 16px', fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Results</div>
                {results.map((r, i) => (
                  <button key={i} type="button" onClick={() => handleSelect(r)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: 12, transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{r.display_name.split(',')[0]}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{r.display_name.split(',').slice(1, 3).join(',')}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchHistory.length > 0 && results.length === 0 && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ padding: '6px 16px', fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent</div>
                {searchHistory.slice(0, 5).map((h) => (
                  <button key={h.id} type="button" onClick={() => handleHistorySelect(h)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                    </svg>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>{h.location.name}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text4)' }}>{h.queryType.replace('-', ' ')}</div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
