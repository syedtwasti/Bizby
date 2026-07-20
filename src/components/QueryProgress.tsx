import { motion } from 'framer-motion';

interface QueryProgressProps {
  progress: number;
  isActive: boolean;
}

export function QueryProgress({ progress, isActive }: QueryProgressProps) {
  return (
    <motion.div
      className="query-progress fixed left-0 top-0 h-1 origin-left bg-[var(--purple)]"
      style={{ width: `${progress}%`, transform: `scaleX(${progress / 100})` }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ opacity: { duration: 0.3 }, transform: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }}
    />
  );
}
