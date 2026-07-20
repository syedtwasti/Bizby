import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../store/appStore';
import type { SpatialQueryResponse } from '../api/client';

// Fix Leaflet default icon path issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS: Record<string, string> = {
  cafe: '#f59e0b',
  tech: '#3b82f6',
  restaurant: '#ef4444',
  healthcare: '#10b981',
  fitness: '#22c55e',
  retail: '#8b5cf6',
  hotel: '#06b6d4',
  education: '#f97316',
  default: '#94a3b8',
};

const QUERY_COLORS: Record<string, string> = {
  'buffer-zone': '#f59e0b',
  within: '#10b981',
  contains: '#3b82f6',
  intersects: '#ef4444',
  'supply-chain': '#a855f7',
  supply_chain: '#a855f7',
};

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_DARK_ATTR = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>';
const TILE_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_SAT_ATTR = 'Tiles &copy; Esri';

interface Props {
  queryResults: SpatialQueryResponse | null;
}

export default function MapCanvas({ queryResults }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const queryLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedMarkerRef = useRef<L.CircleMarker | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [mapReady, setMapReady] = useState(false);

  const { selectedLocation, isQuerying, queryType } = useAppStore();

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [33.6844, 73.0479],
      zoom: 12,
      zoomControl: false,
    });

    // Add zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark tile layer
    const tile = L.tileLayer(TILE_DARK, {
      attribution: TILE_DARK_ATTR,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tile;

    // Query results layer group
    const queryLayer = L.layerGroup().addTo(map);
    queryLayerRef.current = queryLayer;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      queryLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Toggle tile layer style
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    const newTile = L.tileLayer(
      mapStyle === 'dark' ? TILE_DARK : TILE_SAT,
      {
        attribution: mapStyle === 'dark' ? TILE_DARK_ATTR : TILE_SAT_ATTR,
        subdomains: mapStyle === 'dark' ? 'abcd' : '',
        maxZoom: 19,
      }
    ).addTo(mapRef.current);
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // Fly to selected location
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    mapRef.current.flyTo([selectedLocation.lat, selectedLocation.lng], 14, { duration: 1.2 });

    // Selected pin
    if (selectedMarkerRef.current) selectedMarkerRef.current.remove();
    const pin = L.circleMarker([selectedLocation.lat, selectedLocation.lng], {
      radius: 10,
      fillColor: '#f59e0b',
      color: '#fff',
      weight: 3,
      fillOpacity: 1,
    }).addTo(mapRef.current);

    // Pulsing ring via repeated expand
    let pulseMarker: L.CircleMarker | null = L.circleMarker([selectedLocation.lat, selectedLocation.lng], {
      radius: 10, fillColor: 'transparent', color: '#f59e0b', weight: 2, opacity: 0.8,
    }).addTo(mapRef.current);

    let animFrame: number;
    let startTime = Date.now();
    const animatePulse = () => {
      const elapsed = (Date.now() - startTime) % 1200;
      const progress = elapsed / 1200;
      const r = 10 + progress * 40;
      const opacity = 1 - progress;
      pulseMarker?.setStyle({ opacity, color: '#f59e0b' });
      (pulseMarker as unknown as { setRadius: (r: number) => void }).setRadius(r);
      animFrame = requestAnimationFrame(animatePulse);
    };
    animatePulse();

    selectedMarkerRef.current = pin;

    return () => {
      cancelAnimationFrame(animFrame);
      pulseMarker?.remove();
      pulseMarker = null;
    };
  }, [selectedLocation]);

  // Render query results
  useEffect(() => {
    if (!queryLayerRef.current || !mapRef.current) return;
    queryLayerRef.current.clearLayers();
    if (!queryResults) return;

    const color = QUERY_COLORS[queryType] || '#f59e0b';

    queryResults.features.forEach((feature) => {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        // Buffer zone polygon
        const coords = (feature.geometry.coordinates as number[][][])[0].map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );
        L.polygon(coords, {
          color,
          weight: 2,
          dashArray: '8 6',
          fillColor: color,
          fillOpacity: 0.07,
        }).addTo(queryLayerRef.current!);
      }

      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const props = feature.properties;
        const cat = String(props.category || 'default');
        
        let markerColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
        if (queryType === 'supply-chain' || props.query_type === 'supply_chain') {
          if (props.layer === 'contained') markerColor = '#a855f7'; // Purple for fully contained
          else if (props.layer === 'intersecting') markerColor = '#eab308'; // Yellow for intersecting service area
        }

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: markerColor,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(queryLayerRef.current!);

        const riskColor = props.risk_level === 'high' ? '#ef4444' : props.risk_level === 'medium' ? '#f59e0b' : '#10b981';
        const dist = props.distance ? `<span style="background:#ffffff10;color:#94a3b8;padding:2px 8px;border-radius:99px;font-size:11px;">${Math.round(Number(props.distance))}m</span>` : '';

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px;">
            <div style="font-weight:700;font-size:14px;color:#f8fafc;margin-bottom:4px;">${props.name || 'Location'}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${props.address || ''}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="background:${markerColor}22;color:${markerColor};border:1px solid ${markerColor}44;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;">${cat}</span>
              ${dist}
              <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;">
                <span style="width:6px;height:6px;border-radius:50%;background:${riskColor};display:inline-block;"></span>
                ${String(props.risk_level || 'low')} risk
              </span>
            </div>
          </div>
        `, {
          className: 'bizby-popup',
          maxWidth: 280,
        });
      }
    });
  }, [queryResults, queryType]);

  const pointCount = queryResults?.features.filter(f => f.geometry.type === 'Point').length ?? 0;
  const execTime = queryResults?.execution_time_ms ?? 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#09090f' }} />

      {/* Style toggle */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 800, display: 'flex', gap: 6 }}>
        {(['dark', 'satellite'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setMapStyle(s)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: mapStyle === s ? 'var(--accent)' : 'rgba(9,9,15,0.85)',
              color: mapStyle === s ? '#000' : 'var(--text3)',
              border: `1px solid ${mapStyle === s ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
              backdropFilter: 'blur(8px)', transition: 'all 0.2s',
            }}>
            {s === 'dark' ? '🗺 Street' : '🛰 Satellite'}
          </button>
        ))}
      </div>

      {/* Stats overlay bottom-left */}
      {queryResults && pointCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'absolute', bottom: 48, left: 12, zIndex: 800, display: 'flex', gap: 8 }}>
          {[
            { label: 'Results', value: pointCount },
            { label: 'Query Time', value: `${execTime.toFixed(0)}ms` },
            { label: 'Engine', value: 'PostGIS' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'rgba(9,9,15,0.9)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '8px 14px',
            }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{stat.value}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Query ripple overlay */}
      <AnimatePresence>
        {isQuerying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 700,
              background: 'radial-gradient(circle at center, rgba(245,158,11,0.06) 0%, transparent 65%)' }} />
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, background: '#09090f', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}>
          <div>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f59e0b', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Initializing map...</div>
          </div>
        </div>
      )}

      {/* Popup styles */}
      <style>{`
        .bizby-popup .leaflet-popup-content-wrapper {
          background: #12161f !important;
          border: 1px solid rgba(245,158,11,0.25) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
          color: #f8fafc !important;
        }
        .bizby-popup .leaflet-popup-content { margin: 14px 16px !important; }
        .bizby-popup .leaflet-popup-tip { background: #12161f !important; }
        .bizby-popup .leaflet-popup-close-button { color: #64748b !important; }
        .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.08) !important; }
        .leaflet-control-zoom a { background: rgba(9,9,15,0.85) !important; color: #94a3b8 !important; border-color: rgba(255,255,255,0.06) !important; }
        .leaflet-control-zoom a:hover { background: rgba(245,158,11,0.15) !important; color: #f59e0b !important; }
        .leaflet-control-attribution { background: rgba(9,9,15,0.7) !important; color: #475569 !important; font-size: 9px !important; }
      `}</style>
    </div>
  );
}
