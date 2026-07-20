import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { QueryTypeSelector } from './QueryTypeSelector';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const QUERY_COLORS: Record<string, string> = {
  'buffer_zone': '#f59e0b',
  'buffer-zone': '#f59e0b',
  within: '#10b981',
  contains: '#3b82f6',
  intersects: '#ef4444',
  supply_chain: '#a855f7',
  'supply-chain': '#a855f7',
};

const CATEGORY_ICONS: Record<string, string> = {
  cafe: '☕', tech: '💻', restaurant: '🍽', healthcare: '🏥',
  fitness: '💪', retail: '🛍', hotel: '🏨', education: '📚', default: '📍',
};

function QueryBadge({ type }: { type: string }) {
  const color = QUERY_COLORS[type] || '#94a3b8';
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {type.replace(/_/g, ' ').replace(/-/g, ' ')}
    </span>
  );
}

// ── Supply Chain Panel ────────────────────────────────────────────────────────
function SupplyChainPanel({ features }: { features: { geometry: { type: string }; properties: Record<string, unknown> }[] }) {
  const pts = features.filter(f => f.geometry.type === 'Point');
  const intersecting = pts.filter(f => f.properties.layer === 'intersecting');
  const contained = pts.filter(f => f.properties.layer === 'contained');

  const Row = ({ f, accent }: { f: { properties: Record<string, unknown> }; accent: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, border: `1px solid ${accent}30` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {String(f.properties.name || 'Unknown')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text4)' }}>{String(f.properties.category || f.properties.place_type || '')} · {Math.round(Number(f.properties.distance || 0))}m</div>
      </div>
      <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: `${accent}20`, color: accent, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {f.properties.st_contains ? 'ST_Contains ✓' : 'ST_Intersects ✓'}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ padding: '12px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: '#eab308', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>ST_Intersects</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#eab308', fontFamily: 'DM Mono, monospace' }}>{intersecting.length}</div>
          <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>Overlap buffer edge</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>ST_Contains</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#a855f7', fontFamily: 'DM Mono, monospace' }}>{contained.length}</div>
          <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 2 }}>Fully inside zone</div>
        </div>
      </div>

      {/* Contained list */}
      {contained.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>📦 Contained Suppliers ({contained.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {contained.map((f, i) => <Row key={i} f={f} accent="#a855f7" />)}
          </div>
        </div>
      )}

      {/* Intersecting list */}
      {intersecting.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🏭 Intersecting Suppliers ({intersecting.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {intersecting.map((f, i) => <Row key={i} f={f} accent="#eab308" />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function BentoGrid() {
  const { selectedLocation, activeQueryResults, isQuerying, showBento, setShowBento, searchHistory, selectedCategory } = useAppStore();

  const pointFeatures = activeQueryResults?.features.filter(f => f.geometry.type === 'Point' && (selectedCategory === 'all' || f.properties?.category === selectedCategory)) ?? [];
  const execTime = activeQueryResults?.execution_time_ms ?? 0;

  // Category breakdown for chart
  const catBreakdown = Object.entries(
    pointFeatures.reduce<Record<string, number>>((acc, f) => {
      const cat = String(f.properties.category || 'other');
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: 'spring' as const, stiffness: 300, damping: 24 } }),
  };

  return (
    <AnimatePresence>
      {showBento && (
        <motion.div
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          style={{ width: 360, height: '100%', background: 'var(--bg1)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Top bar */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                {selectedLocation?.name || 'Location Analysis'}
              </div>
              {selectedLocation && (
                <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                  {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setShowBento(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text4)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>

            {/* Query type selector */}
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <QueryTypeSelector />
            </div>

            {/* Results summary */}
            {activeQueryResults && (
              <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
                style={{ margin: '12px 12px 0', padding: '14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Results</div>
                  <QueryBadge type={activeQueryResults.query_type} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Locations Found', value: pointFeatures.length, color: 'var(--accent)' },
                    { label: 'Query Time', value: `${execTime.toFixed(0)}ms`, color: '#10b981' },
                    { label: 'Engine', value: 'PostGIS', color: '#3b82f6' },
                    { label: 'Index', value: 'GiST', color: '#8b5cf6' },
                  ].map((stat) => (
                    <div key={stat.label} style={{ padding: '10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text4)', marginBottom: 4 }}>{stat.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: stat.color, fontFamily: 'DM Mono, monospace' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Category chart */}
            {catBreakdown.length > 0 && (
              <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
                style={{ margin: '10px 12px 0', padding: '14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Category Breakdown</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={catBreakdown} barSize={20}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text4)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {catBreakdown.map((_, i) => (
                        <Cell key={i} fill={Object.values(QUERY_COLORS)[i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Supply Chain Analysis Panel — shown instead of generic list */}
            {activeQueryResults?.query_type === 'supply_chain' && (
              <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
                style={{ margin: '10px 12px 0', padding: '14px', background: 'var(--bg2)', border: '1px solid rgba(168,85,247,0.35)', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏭</span> Supply Chain
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'DM Mono, monospace' }}>
                    Buffer + ST_Intersects + ST_Contains
                  </div>
                </div>
                <SupplyChainPanel features={activeQueryResults.features} />
              </motion.div>
            )}

            {/* Location list — standard queries only */}
            {pointFeatures.length > 0 && activeQueryResults?.query_type !== 'supply_chain' && (
              <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
                style={{ margin: '10px 12px 0' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, padding: '0 2px' }}>
                  Nearby ({pointFeatures.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                  {pointFeatures.slice(0, 20).map((f, i) => {
                    const p = f.properties;
                    const cat = String(p.category || 'default');
                    const risk = String(p.risk_level || 'low');
                    const riskColor = risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#10b981';
                    return (
                      <motion.div key={i} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                        style={{ padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'default' }}
                        whileHover={{ borderColor: 'var(--accent-border)', background: 'var(--bg3)' }}>
                        <div style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat] || CATEGORY_ICONS.default}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(p.name || 'Unknown')}</div>
                          <div style={{ fontSize: 10, color: 'var(--text4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{String(p.address || '')}</div>
                        </div>
                        {p.distance !== undefined && (
                          <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                            {Math.round(Number(p.distance))}m
                          </div>
                        )}
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor, flexShrink: 0 }} title={`Risk: ${risk}`} />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Loading state */}
            {isQuerying && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Running PostGIS query...</div>
              </div>
            )}

            {/* Search history */}
            {searchHistory.length > 0 && (
              <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
                style={{ margin: '10px 12px 0', padding: '14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Search History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {searchHistory.slice(0, 5).map((h) => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                      <div style={{ flex: 1, fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.location.name}</div>
                      <QueryBadge type={h.queryType} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
