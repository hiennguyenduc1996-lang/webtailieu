import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer() {
  const calculateTimeLeft = (): TimeLeft => {
    // Target date: June 11, 2026 07:00:00
    const targetDate = new Date('2026-06-11T07:00:00').getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeUnit = ({ value, label, isSeconds }: { value: number; label: string; isSeconds?: boolean }) => (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl w-14 h-16 md:w-20 md:h-24 flex items-center justify-center shadow-lg overflow-hidden group ${isSeconds ? 'ring-1 ring-amber/20' : ''}`}>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/5 border-b border-white/10" />
        {isSeconds ? (
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-2xl md:text-4xl font-black z-10 text-amber animate-pulse"
            >
              {value.toString().padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span className="text-2xl md:text-4xl font-black z-10 text-white">
            {value.toString().padStart(2, '0')}
          </span>
        )}
      </div>
      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6 py-4">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="h-px w-8 md:w-12 bg-gradient-to-r from-transparent to-amber/50" />
        <h2 className="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-2">
          Đếm ngược ngày thi tốt nghiệp <span className="text-amber">THPT 2026</span>
        </h2>
        <div className="h-px w-8 md:w-12 bg-gradient-to-l from-transparent to-amber/50" />
      </div>
      
      <div className="flex gap-3 md:gap-6">
        <TimeUnit value={timeLeft.days} label="Ngày" />
        <TimeUnit value={timeLeft.hours} label="Giờ" />
        <TimeUnit value={timeLeft.minutes} label="Phút" />
        <TimeUnit value={timeLeft.seconds} label="Giây" isSeconds />
      </div>
    </div>
  );
}
