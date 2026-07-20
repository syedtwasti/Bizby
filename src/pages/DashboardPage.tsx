import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MapCanvas from '../components/MapCanvas';
import { BentoGrid } from '../components/BentoGrid';
import { SearchInput } from '../components/SearchInput';
import { AIChat } from '../components/AIChat';
import { useAppStore } from '../store/appStore';
import { spatialApi } from '../api/client';

const NAV_ITEMS = [
  { id: 'map', label: 'Map View', icon: '🗺' },
  { id: 'history', label: 'Search History', icon: '🕒' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🔍' },
  { id: 'cafe', label: 'Cafe', icon: '☕' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
];

const QUERY_COLORS: Record<string, string> = {
  buffer_zone: '#f59e0b', within: '#10b981', contains: '#3b82f6', intersects: '#ef4444',
};

const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

interface HistoryItem {
  id: number; query: string; latitude: number; longitude: number;
  radius: number; query_type: string; results_count: number; created_at: string;
}

function AnalyticsPanel({ history }: { history: HistoryItem[] }) {
  // Derive stats from local search history
  const typeBreakdown = Object.entries(
    history.reduce<Record<string, number>>((acc, h) => {
      const t = h.query_type || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value, rawName: name }));

  const topQueries = Object.entries(
    history.reduce<Record<string, number>>((acc, h) => {
      if (h.query) acc[h.query] = (acc[h.query] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

  const avgResults = history.length
    ? Math.round(history.reduce((s, h) => s + (h.results_count || 0), 0) / history.length)
    : 0;

  const totalResults = history.reduce((s, h) => s + (h.results_count || 0), 0);

  const card = (label: string, value: string | number, icon: string, color = 'var(--accent)') => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>📊 Session Analytics</div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10 }}>
        {card('Queries Run', history.length, '🔍')}
        {card('Total Results', totalResults, '📍', '#10b981')}
        {card('Avg Results', avgResults, '⚡', '#3b82f6')}
      </div>

      {/* Query type pie */}
      {typeBreakdown.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Query Type Distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={typeBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                  {typeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typeBreakdown.map((t, i) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize', flex: 1 }}>{t.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: QUERY_COLORS[t.rawName] || 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results bar chart */}
      {history.length > 1 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Results per Query</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={history.slice(-8).map((h, i) => ({ name: `#${i + 1}`, results: h.results_count }))} barSize={18}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="results" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top queries */}
      {topQueries.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Searched Locations</div>
          {topQueries.map((q, i) => (
            <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < topQueries.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{q.count}x</span>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text4)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 13 }}>Run some spatial queries to see analytics here</div>
        </div>
      )}

      {/* Admin link */}
      <Link to="/admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'var(--accent-glow)', border: '1px solid var(--accent-border)', borderRadius: 12, textDecoration: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
        ⚙️ View Full Admin Analytics →
      </Link>
    </motion.div>
  );
}

function HistoryPanel({ history }: { history: HistoryItem[] }) {
  const { setSelectedLocation, performSpatialQuery, setQueryType } = useAppStore();

  const replay = (h: HistoryItem) => {
    setSelectedLocation({ lat: h.latitude, lng: h.longitude, name: h.query || 'Location' });
    setQueryType(h.query_type.replace('_', '-') as 'buffer-zone' | 'within' | 'contains' | 'intersects');
    performSpatialQuery();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>🕒 Search History</div>
      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No searches yet. Search a location to get started.</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((h) => {
          const color = QUERY_COLORS[h.query_type] || '#94a3b8';
          return (
            <div key={h.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.query}</div>
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{h.query_type?.replace('_', ' ')} · {h.results_count} results</div>
              </div>
              <button type="button" onClick={() => replay(h)} style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ▶ Replay
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { activeQueryResults, isQuerying, queryProgress, theme, toggleTheme, showBento, overpassStatus } = useAppStore();
  const [activeNav, setActiveNav] = useState('map');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbHistory, setDbHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load history from backend when analytics/history tab opens
  useEffect(() => {
    if (activeNav === 'analytics' || activeNav === 'history') {
      spatialApi.history(30).then((data) => setDbHistory(data as HistoryItem[])).catch(() => {});
    }
  }, [activeNav]);

  const execTime = activeQueryResults?.execution_time_ms ?? 0;
  const resultCount = activeQueryResults?.features.filter(f => f.geometry.type === 'Point').length ?? 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg0)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? 244 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, zIndex: 10 }}>

        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 13 8 13s8-7.8 8-13a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Syne, sans-serif' }}>Bizby</div>
              <div style={{ fontSize: 10, color: 'var(--text4)' }}>Spatial Intelligence</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
          <SearchInput />
        </div>

        {/* Nav */}
        <nav style={{ padding: '8px 8px 0' }}>
          <div style={{ fontSize: 10, color: 'var(--text4)', padding: '8px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Navigation</div>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveNav(item.id)}
              className={`sidebar-link ${activeNav === item.id ? 'active' : ''}`}
              style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ fontSize: 13 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Categories — only show in Map view */}
        {activeNav === 'map' && (
          <div style={{ padding: '0 8px' }}>
            <div style={{ fontSize: 10, color: 'var(--text4)', padding: '12px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Business Filter</div>
            {CATEGORIES.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 10px', margin: '2px 0', borderRadius: 8,
                  background: selectedCategory === cat.id ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${selectedCategory === cat.id ? 'var(--accent-border)' : 'transparent'}`,
                  color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text3)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }}>
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* PostGIS badge */}
        <div style={{ padding: '10px 12px', margin: '0 8px 8px', background: 'var(--accent-glow)', border: '1px solid var(--accent-border)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>📌 PostGIS-Powered</div>
          <div style={{ fontSize: 10, color: 'var(--text4)' }}>GiST spatial index enabled</div>
          {execTime > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10 }}>
              <span style={{ color: 'var(--text4)' }}>Last query</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{execTime.toFixed(0)}ms</span>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '0 8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* ADMIN BUTTON — prominent */}
          <Link to="/admin"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--accent)', borderRadius: 10, textDecoration: 'none', color: '#000', fontSize: 13, fontWeight: 700, transition: 'all 0.15s', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
            Admin Panel
          </Link>
          <button type="button" onClick={toggleTheme}
            style={{ padding: '9px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </motion.div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Top bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg1)', zIndex: 5, flexShrink: 0 }}>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>

          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>Geospatial Dashboard</div>

          <div style={{ flex: 1 }} />

          <AnimatePresence>
            {isQuerying && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--accent-border)', borderRadius: 99 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} className="glow-pulse" />
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  {overpassStatus || `Running... ${queryProgress}%`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {resultCount > 0 && !isQuerying && <div className="pill pill-amber">{resultCount} results</div>}
          <div className="pill pill-green">
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
            PostGIS Live
          </div>

          {/* Admin shortcut in topbar */}
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'var(--text3)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}>
            ⚙ Admin
          </Link>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Map view */}
          <AnimatePresence>
            {activeNav === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, position: 'relative' }}>
                <MapCanvas queryResults={activeQueryResults} />

                <AnimatePresence>
                  {!showBento && !isQuerying && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      style={{ position: 'absolute', bottom: '50%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(9,9,15,0.85)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-accent)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>🔍 Search a location to start spatial analysis</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isQuerying && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--bg3)', zIndex: 10 }}>
                    <motion.div style={{ height: '100%', background: 'var(--accent)', transformOrigin: 'left' }}
                      animate={{ width: `${queryProgress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analytics view */}
          <AnimatePresence>
            {activeNav === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, overflowY: 'auto', background: 'var(--bg0)' }}>
                <AnalyticsPanel history={dbHistory} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* History view */}
          <AnimatePresence>
            {activeNav === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, overflowY: 'auto', background: 'var(--bg0)' }}>
                <HistoryPanel history={dbHistory} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bento sidebar — only in map view */}
          {activeNav === 'map' && <BentoGrid />}
        </div>
      </div>

      <AIChat />
    </div>
  );
}
