import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScoreRingProps {
  isLoading: boolean;
}

export function ScoreRing({ isLoading }: ScoreRingProps) {
  const [score, setScore] = useState(0);
  const targetScore = 87;

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setScore(targetScore);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (isLoading) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shimmer">
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 bg-[var(--bg3)] rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6"
    >
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="var(--bg3)" strokeWidth="8" fill="transparent" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke="var(--purple)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.8 }}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
              className="text-2xl font-bold text-[var(--text1)]"
              style={{ fontFamily: 'Syne', fontWeight: 800 }}
            >
              {score}
            </motion.span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-[var(--text1)] mb-2" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
          Business Score
        </h3>
        <p className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
          Excellent location potential
        </p>
      </div>
    </motion.div>
  );
}
