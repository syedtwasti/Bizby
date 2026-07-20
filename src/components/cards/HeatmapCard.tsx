import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface HeatmapCardProps {
  isLoading: boolean;
}

const footTrafficData = [
  [12, 8, 5, 3, 2, 1, 15],
  [8, 5, 3, 2, 1, 1, 12],
  [5, 3, 2, 1, 1, 1, 8],
  [3, 2, 1, 1, 1, 1, 5],
  [2, 1, 1, 1, 1, 1, 3],
  [1, 1, 1, 1, 1, 1, 2],
  [25, 45, 65, 85, 75, 35, 20],
  [85, 95, 100, 98, 90, 70, 60],
  [95, 100, 98, 95, 92, 85, 80],
  [90, 95, 92, 88, 85, 80, 75],
  [75, 80, 78, 75, 72, 65, 60],
  [80, 85, 82, 80, 78, 70, 65],
  [95, 100, 98, 96, 94, 85, 80],
  [90, 95, 92, 90, 88, 80, 75],
  [85, 90, 88, 85, 82, 75, 70],
  [80, 85, 82, 80, 78, 70, 65],
  [75, 80, 78, 75, 72, 65, 60],
  [70, 75, 72, 70, 68, 60, 55],
  [85, 90, 88, 85, 82, 75, 70],
  [95, 100, 98, 95, 92, 85, 80],
  [90, 95, 92, 88, 85, 80, 75],
  [80, 85, 82, 80, 78, 70, 65],
  [60, 65, 62, 60, 58, 50, 45],
  [40, 45, 42, 40, 38, 30, 25]
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapCard({ isLoading }: HeatmapCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = canvas.width / 7;
    const cellHeight = canvas.height / 24;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    footTrafficData.forEach((hourData, hourIndex) => {
      hourData.forEach((value, dayIndex) => {
        const intensity = value / 100;
        const x = dayIndex * cellWidth;
        const y = hourIndex * cellHeight;

        const gradient = ctx.createLinearGradient(x, y, x + cellWidth, y + cellHeight);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${intensity * 0.8})`);
        gradient.addColorStop(1, `rgba(34, 211, 238, ${intensity * 0.6})`);

        ctx.fillStyle = intensity > 0.7 ? gradient : `rgba(8, 9, 13, ${(1 - intensity) * 0.9})`;
        ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellWidth - 1, cellHeight - 1);
      });
    });
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shimmer">
        <div className="h-6 bg-[var(--bg3)] rounded mb-4"></div>
        <div className="h-32 bg-[var(--bg3)] rounded"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
          Weekly Foot Traffic
        </h3>
        <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
          <span>Low</span>
          <div className="w-16 h-2 bg-gradient-to-r from-[var(--bg0)] to-[var(--cyan)] rounded"></div>
          <span>High</span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={280}
          height={240}
          className="w-full h-auto border border-[var(--border)] rounded-[var(--radius-md)]"
        />

        <div className="flex justify-between mt-2 px-1">
          {days.map((day) => (
            <span key={day} className="text-xs text-[var(--text3)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
              {day}
            </span>
          ))}
        </div>

        <div className="absolute -left-8 top-0 h-full flex flex-col justify-between py-1">
          {hours.filter((_, i) => i % 4 === 0).map((hour) => (
            <span key={hour} className="text-xs text-[var(--text3)] leading-none" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
              {hour.toString().padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--text2)] mt-4" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
        Peak hours: 8-10 AM, 12-2 PM, 6-9 PM
      </p>
    </motion.div>
  );
}
