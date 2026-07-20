import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface KPICardsProps {
  isLoading: boolean;
}

const kpis = [
  {
    label: 'Business Density',
    value: '24',
    unit: 'per km²',
    change: '+12%',
    trend: 'up',
    icon: Target,
    color: 'var(--purple)'
  },
  {
    label: 'Foot Traffic',
    value: '1,247',
    unit: 'daily',
    change: '+8%',
    trend: 'up',
    icon: Users,
    color: 'var(--cyan)'
  },
  {
    label: 'Avg Rent',
    value: '₨45,000',
    unit: 'per month',
    change: '-3%',
    trend: 'down',
    icon: DollarSign,
    color: 'var(--amber)'
  },
  {
    label: 'Revenue Potential',
    value: '₨2.1M',
    unit: 'annual',
    change: '+15%',
    trend: 'up',
    icon: TrendingUp,
    color: 'var(--green)'
  }
];

export function KPICards({ isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shimmer">
            <div className="h-4 bg-[var(--bg3)] rounded mb-2"></div>
            <div className="h-6 bg-[var(--bg3)] rounded mb-1"></div>
            <div className="h-3 bg-[var(--bg3)] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.label}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4, type: 'spring', stiffness: 280, damping: 22 }}
            className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 hover:bg-[var(--bg3)] transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-[var(--radius-md)]" style={{ backgroundColor: `${kpi.color}20` }}>
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  kpi.trend === 'up' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'
                }`}
                style={{ fontFamily: 'DM Mono', fontWeight: 500 }}
              >
                {kpi.change}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-[var(--text2)]">{kpi.label}</p>
              <p className="text-xl font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
                {kpi.value}
              </p>
              <p className="text-xs text-[var(--text3)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
                {kpi.unit}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
