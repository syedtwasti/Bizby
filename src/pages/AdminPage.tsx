import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { adminApi } from '../api/client';

type Tab = 'overview' | 'searches' | 'ai-logs' | 'heatmap';

interface Stats {
  total_searches: number;
  total_locations: number;
  total_ai_interactions: number;
  total_spatial_queries: number;
  avg_query_time_ms: number;
  query_type_breakdown: { type: string; count: number }[];
  top_locations: { query: string; count: number }[];
  daily_searches: { day: string; count: number }[];
}

interface SearchEntry {
  id: number; query: string; latitude: number; longitude: number;
  radius: number; query_type: string; results_count: number;
  session_id: string; created_at: string;
}

interface AIEntry {
  id: number; session_id: string; user_message: string;
  ai_response: string; location_name: string | null; created_at: string;
}

const QUERY_COLORS: Record<string, string> = {
  buffer_zone: '#f59e0b', within: '#10b981', contains: '#3b82f6', intersects: '#ef4444',
};

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--success)' }}>{sub}</div>}
    </motion.div>
  );
}

function Badge({ type }: { type: string }) {
  const color = QUERY_COLORS[type] || '#94a3b8';
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [searches, setSearches] = useState<{ data: SearchEntry[]; total: number; page: number; pages: number } | null>(null);
  const [aiLogs, setAILogs] = useState<{ data: AIEntry[]; total: number; page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchPage, setSearchPage] = useState(1);
  const [aiPage, setAIPage] = useState(1);
  const [resetting, setResetting] = useState(false);

  const logout = () => { localStorage.removeItem('bizby_admin_token'); navigate('/admin/login'); };

  const loadStats = useCallback(async () => {
    try {
      const s = (await adminApi.stats()) as unknown as Stats;
      setStats(s);
    } catch { logout(); }
  }, []);

  const loadSearches = useCallback(async (page: number) => {
    const s = await adminApi.searches(page) as typeof searches;
    setSearches(s);
  }, []);

  const loadAILogs = useCallback(async (page: number) => {
    const s = await adminApi.aiLogs(page) as typeof aiLogs;
    setAILogs(s);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadStats();
      await loadSearches(1);
      await loadAILogs(1);
      setLoading(false);
    };
    init();
  }, [loadStats, loadSearches, loadAILogs]);

  useEffect(() => { loadSearches(searchPage); }, [searchPage, loadSearches]);
  useEffect(() => { loadAILogs(aiPage); }, [aiPage, loadAILogs]);

  const handleReset = async () => {
    if (!confirm('Delete all search history and AI logs? This cannot be undone.')) return;
    setResetting(true);
    await adminApi.reset();
    await loadStats();
    await loadSearches(1);
    await loadAILogs(1);
    setResetting(false);
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'searches', label: 'Searches', icon: '🔍' },
    { id: 'ai-logs', label: 'AI Logs', icon: '🤖' },
    { id: 'heatmap', label: 'Analytics', icon: '🗺' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 13 8 13s8-7.8 8-13a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Syne,sans-serif' }}>Bizby</div>
              <div style={{ fontSize: 10, color: 'var(--text4)' }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text4)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Management</div>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`sidebar-link ${tab === t.id ? 'active' : ''}`}
              style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 13 }}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link to="/" style={{ padding: '9px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', textDecoration: 'none', display: 'block', textAlign: 'center', transition: 'all 0.15s' }}>
            ← Back to Map
          </Link>
          <button type="button" onClick={logout} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>
              {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Bizby Geospatial Intelligence Platform</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="pill pill-green">
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
            System Online
          </div>
          <button type="button" onClick={handleReset} disabled={resetting}
            className="btn-danger" style={{ fontSize: 12, padding: '7px 14px' }}>
            {resetting ? '...' : '🗑 Reset Data'}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} className="spin" />
            </div>
          )}

          <AnimatePresence mode="wait">
            {!loading && tab === 'overview' && stats && (
              <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* KPI cards */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                  <StatCard label="Total Searches" value={stats.total_searches} sub="All time" icon="🔍" />
                  <StatCard label="Locations in DB" value={stats.total_locations} sub="Seeded" icon="📍" />
                  <StatCard label="AI Interactions" value={stats.total_ai_interactions} sub="GPT-4o Mini" icon="🤖" />
                  <StatCard label="Avg Query Time" value={`${stats.avg_query_time_ms}ms`} sub="PostGIS" icon="⚡" />
                </div>

                {/* Charts row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {/* Query type breakdown */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Query Types</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.query_type_breakdown} barSize={30}>
                        <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily searches */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Daily Activity (7d)</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={stats.daily_searches}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top locations */}
                {stats.top_locations.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Most Searched Locations</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stats.top_locations.map((loc, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{loc.query}</div>
                          <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>{loc.count}x</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!loading && tab === 'searches' && (
              <motion.div key="searches" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                    Search History ({searches?.total ?? 0} total)
                  </div>
                </div>
                <div className="table-container" style={{ background: 'var(--card)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Query</th><th>Type</th><th>Coordinates</th>
                        <th>Radius</th><th>Results</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searches?.data.map((s) => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text1)', fontWeight: 500, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.query}</td>
                          <td><Badge type={s.query_type} /></td>
                          <td style={{ fontFamily: 'DM Mono,monospace', fontSize: 11 }}>
                            {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                          </td>
                          <td style={{ fontFamily: 'DM Mono,monospace', fontSize: 12 }}>
                            {s.radius >= 1000 ? `${(s.radius / 1000).toFixed(1)}km` : `${s.radius}m`}
                          </td>
                          <td>
                            <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{s.results_count}</span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text4)' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {searches?.data.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text4)', padding: '32px' }}>No searches yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {searches && searches.pages > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                    {Array.from({ length: searches.pages }, (_, i) => i + 1).map((p) => (
                      <button key={p} type="button" onClick={() => setSearchPage(p)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: searchPage === p ? 'var(--accent)' : 'var(--bg3)',
                          color: searchPage === p ? '#000' : 'var(--text3)',
                          borderColor: searchPage === p ? 'var(--accent)' : 'var(--border)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {!loading && tab === 'ai-logs' && (
              <motion.div key="ai-logs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                  AI Interaction Logs ({aiLogs?.total ?? 0} total)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {aiLogs?.data.map((log) => (
                    <div key={log.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text4)' }}>Session: {log.session_id?.slice(0, 8)}</span>
                          {log.location_name && <span className="pill pill-amber">📍 {log.location_name}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text4)' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 4, fontWeight: 600 }}>USER</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{log.user_message}</div>
                      </div>
                      <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 4, fontWeight: 600 }}>AI</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', maxHeight: 80, overflowY: 'auto' }}>{log.ai_response}</div>
                      </div>
                    </div>
                  ))}
                  {aiLogs?.data.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text4)', padding: '48px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                      No AI interactions yet
                    </div>
                  )}
                </div>
                {/* Pagination */}
                {aiLogs && aiLogs.pages > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                    {Array.from({ length: aiLogs.pages }, (_, i) => i + 1).map((p) => (
                      <button key={p} type="button" onClick={() => setAIPage(p)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: aiPage === p ? 'var(--accent)' : 'var(--bg3)',
                          color: aiPage === p ? '#000' : 'var(--text3)',
                          borderColor: aiPage === p ? 'var(--accent)' : 'var(--border)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {!loading && tab === 'heatmap' && stats && (
              <motion.div key="heatmap" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Spatial Query Distribution</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.query_type_breakdown} layout="vertical" barSize={20}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Platform Summary</div>
                    {[
                      { label: 'Total Searches', value: stats.total_searches, icon: '🔍' },
                      { label: 'DB Locations', value: stats.total_locations, icon: '📍' },
                      { label: 'AI Queries', value: stats.total_ai_interactions, icon: '🤖' },
                      { label: 'Spatial Queries', value: stats.total_spatial_queries, icon: '⚡' },
                      { label: 'Avg Query Time', value: `${stats.avg_query_time_ms}ms`, icon: '⏱' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{item.icon}</span>
                          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'DM Mono,monospace' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
