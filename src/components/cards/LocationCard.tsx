import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

interface LocationCardProps {
  location: { lat: number; lng: number; name: string } | null;
  isLoading: boolean;
}

export function LocationCard({ location, isLoading }: LocationCardProps) {
  if (isLoading) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shimmer">
        <div className="h-6 bg-[var(--bg3)] rounded mb-4"></div>
        <div className="h-4 bg-[var(--bg3)] rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-[var(--bg3)] rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--purple)]/20 rounded-[var(--radius-md)]">
            <MapPin className="w-5 h-5 text-[var(--purple)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
              {location?.name || 'Analyzing Location'}
            </h2>
            <p className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Coordinates pending'}
            </p>
          </div>
        </div>
        <Navigation className="w-4 h-4 text-[var(--text3)]" />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[var(--text2)]">Radius</span>
          <p className="text-[var(--text1)] font-medium" style={{ fontFamily: 'DM Mono', fontWeight: 500 }}>
            500m
          </p>
        </div>
        <div>
          <span className="text-[var(--text2)]">Last Updated</span>
          <p className="text-[var(--text1)] font-medium" style={{ fontFamily: 'DM Mono', fontWeight: 500 }}>
            Just now
          </p>
        </div>
      </div>
    </motion.div>
  );
}
