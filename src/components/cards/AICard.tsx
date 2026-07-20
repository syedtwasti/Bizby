import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Database } from 'lucide-react';

interface Recommendation {
  name: string;
  category: string;
  reasoning: string;
  viability_score: number;
}

interface AICardProps {
  location: { lat: number; lng: number; name: string } | null;
  isLoading: boolean;
}

const placeholderRecommendations: Recommendation[] = [
  {
    name: 'Select a location',
    category: 'insight',
    reasoning: 'Tap on the map to generate tailored product recommendations for this area.',
    viability_score: 0
  }
];

const sampleRecommendations: Recommendation[] = [
  {
    name: 'Healthy Bites Café',
    category: 'Restaurant',
    reasoning: 'High foot traffic at nearby commercial streets and a growing demand for quick dining.',
    viability_score: 92
  },
  {
    name: 'Urban Wellness Pharmacy',
    category: 'Healthcare',
    reasoning: 'Limited nearby pharmacy coverage and strong demand from local office workers.',
    viability_score: 88
  },
  {
    name: 'QuickServe Logistics',
    category: 'Logistics',
    reasoning: 'Good access to main roads and rising e-commerce deliveries in the area.',
    viability_score: 84
  }
];

export function AICard({ location, isLoading }: AICardProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(placeholderRecommendations);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (!location) {
      setRecommendations(placeholderRecommendations);
      return;
    }

    setLoadingAI(true);
    const timer = window.setTimeout(() => {
      setRecommendations(sampleRecommendations);
      setLoadingAI(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [location]);

  if (isLoading || loadingAI) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shimmer">
        <div className="h-6 bg-[var(--bg3)] rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--bg3)] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[var(--green)]/20 rounded-[var(--radius-md)]">
          <Sparkles className="w-5 h-5 text-[var(--green)]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
            AI Product Recommendations
          </h3>
          <p className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
            Product ideas tailored for this location.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <motion.div
            key={`${rec.name}-${index}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.75 + index * 0.1, duration: 0.35 }}
            className="p-4 bg-[var(--bg3)] rounded-[var(--radius-md)] border-l-4 border-[var(--green)]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--green)]/10 text-[var(--green)] mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[var(--text1)] mb-1" style={{ fontFamily: 'Syne', fontWeight: 600 }}>
                  {rec.name}
                </h4>
                <p className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
                  {rec.reasoning}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-6 py-3 bg-[var(--green)] hover:bg-[#0f766e] text-white rounded-[var(--radius-lg)] font-medium transition-colors duration-200"
        style={{ fontFamily: 'Syne', fontWeight: 600 }}
      >
        Refresh Recommendations
      </motion.button>
    </motion.div>
  );
}
