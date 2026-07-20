import { motion } from 'framer-motion';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

interface CompetitorsCardProps {
  isLoading: boolean;
}

const competitors = [
  {
    name: 'CoffeeHub Express',
    distance: '120m',
    category: 'Café',
    risk: 'low',
    rating: 4.2,
    reviews: 156
  },
  {
    name: 'Urban Eats Bistro',
    distance: '180m',
    category: 'Restaurant',
    risk: 'medium',
    rating: 3.8,
    reviews: 89
  },
  {
    name: 'TechStart Solutions',
    distance: '250m',
    category: 'Tech Services',
    risk: 'high',
    rating: 4.5,
    reviews: 203
  },
  {
    name: 'GreenLeaf Pharmacy',
    distance: '320m',
    category: 'Healthcare',
    risk: 'low',
    rating: 4.0,
    reviews: 67
  }
];

export function CompetitorsCard({ isLoading }: CompetitorsCardProps) {
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-[var(--green)]" />;
      case 'medium':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-[var(--amber)]" />;
      default:
        return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'var(--green)';
      case 'medium':
        return 'var(--amber)';
      case 'high':
        return 'var(--red)';
      default:
        return 'var(--text2)';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shimmer">
        <div className="h-6 bg-[var(--bg3)] rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg3)] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
          Nearby Competitors
        </h3>
        <span className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
          {competitors.length} found
        </span>
      </div>

      <div className="space-y-3">
        {competitors.map((competitor, index) => (
          <motion.div
            key={competitor.name}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
            className="flex items-center justify-between p-3 bg-[var(--bg3)] rounded-[var(--radius-md)] hover:bg-[var(--bg1)] transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--purple)]/20 rounded-[var(--radius-sm)]">
                <MapPin className="w-4 h-4 text-[var(--purple)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text1)]">{competitor.name}</p>
                <p className="text-xs text-[var(--text2)]">{competitor.category}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-[var(--text1)]" style={{ fontFamily: 'DM Mono', fontWeight: 500 }}>
                {competitor.distance}
              </p>
              <div className="flex items-center gap-1">
                {getRiskIcon(competitor.risk)}
                <span style={{ color: getRiskColor(competitor.risk), fontFamily: 'DM Mono', fontWeight: 400 }} className="text-xs capitalize">
                  {competitor.risk}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
