import { motion } from 'framer-motion';
import { useAppStore, type QueryType } from '../store/appStore';

const QUERY_TYPES: { id: QueryType; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'buffer-zone', label: 'Buffer Zone', icon: '◎', desc: 'ST_Buffer', color: '#f59e0b' },
  { id: 'within', label: 'ST_Within', icon: '⊂', desc: 'Points inside radius', color: '#10b981' },
  { id: 'contains', label: 'ST_Contains', icon: '⊃', desc: 'Geom contains point', color: '#3b82f6' },
  { id: 'intersects', label: 'ST_Intersects', icon: '∩', desc: 'Overlapping geoms', color: '#ef4444' },
];

const SUPPLY_CHAIN: { id: QueryType; label: string; icon: string; desc: string; color: string } = {
  id: 'supply-chain',
  label: 'Supply Chain Analysis',
  icon: '🏭',
  desc: 'ST_Buffer · ST_Intersects · ST_Contains — Suppliers & Factories',
  color: '#a855f7',
};

const RADIUS_PRESETS = [250, 500, 1000, 2500, 5000, 10000];

export function QueryTypeSelector() {
  const { queryType, setQueryType, radius, setRadius, selectedLocation, performSpatialQuery, isQuerying } = useAppStore();

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spatial Query</span>
      </div>

      {/* Query Type Grid — 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {QUERY_TYPES.map((qt) => (
          <motion.button
            key={qt.id}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setQueryType(qt.id)}
            style={{
              padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: queryType === qt.id ? `${qt.color}18` : 'var(--bg3)',
              border: `1px solid ${queryType === qt.id ? qt.color + '50' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
            <div style={{ fontSize: 20, marginBottom: 4, color: qt.color }}>{qt.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: queryType === qt.id ? qt.color : 'var(--text2)' }}>{qt.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{qt.desc}</div>
          </motion.button>
        ))}
      </div>

      {/* Supply Chain — full-width special card */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setQueryType(SUPPLY_CHAIN.id)}
        style={{
          padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
          background: queryType === SUPPLY_CHAIN.id ? 'rgba(168,85,247,0.12)' : 'var(--bg3)',
          border: `1px solid ${queryType === SUPPLY_CHAIN.id ? '#a855f780' : 'var(--border)'}`,
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14,
        }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{SUPPLY_CHAIN.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: queryType === SUPPLY_CHAIN.id ? '#a855f7' : 'var(--text1)' }}>
              {SUPPLY_CHAIN.label}
            </span>
            {queryType === SUPPLY_CHAIN.id && (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: '#a855f720', color: '#a855f7', border: '1px solid #a855f740', fontWeight: 700 }}>ACTIVE</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'DM Mono, monospace' }}>{SUPPLY_CHAIN.desc}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {['ST_Buffer', 'ST_Intersects', 'ST_Contains'].map(op => (
              <span key={op} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#a855f715', color: '#a855f7', border: '1px solid #a855f730', fontWeight: 600 }}>{op}</span>
            ))}
          </div>
        </div>
      </motion.button>

      {/* Radius Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Search Radius</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>
            {radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}
          </span>
        </div>
        <input type="range" min={100} max={10000} step={100} value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {RADIUS_PRESETS.map((r) => (
            <button key={r} type="button" onClick={() => setRadius(r)}
              style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                background: radius === r ? 'var(--accent)' : 'var(--bg3)',
                color: radius === r ? '#000' : 'var(--text3)',
                border: `1px solid ${radius === r ? 'var(--accent)' : 'var(--border)'}`,
                fontWeight: 600, transition: 'all 0.15s',
              }}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Run Query Button */}
      <motion.button
        type="button"
        whileHover={{ scale: selectedLocation && !isQuerying ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => selectedLocation && performSpatialQuery()}
        disabled={!selectedLocation || isQuerying}
        style={{
          padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: selectedLocation && !isQuerying ? 'pointer' : 'not-allowed',
          background: selectedLocation && !isQuerying ? 'var(--accent)' : 'var(--bg3)',
          color: selectedLocation && !isQuerying ? '#000' : 'var(--text4)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}>
        {isQuerying ? (
          <>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%' }} className="spin" />
            Running Query...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Spatial Query
          </>
        )}
      </motion.button>

      {!selectedLocation && (
        <p style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', margin: 0 }}>
          Search a location above to enable queries
        </p>
      )}
    </div>
  );
}
