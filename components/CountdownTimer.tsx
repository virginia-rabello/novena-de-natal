import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, Gift } from 'lucide-react';
import { TimeLeft } from '../types';

interface CountdownTimerProps {
  targetDate: Date;
  title: string;
  christmasDate?: Date;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, title, christmasDate }) => {
  
  // -- Countdown Logic --
  const calculateTimeLeft = useCallback((): TimeLeft => {
    if (title === "Evento Encerrado") {
         return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const difference = +targetDate - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    }

    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }, [targetDate, title]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [daysToChristmas, setDaysToChristmas] = useState(0);

  // -- Local Clock & Christmas Logic --
  const [localTime, setLocalTime] = useState(new Date());

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    
    // Calculate days to christmas
    if (christmasDate) {
      const now = new Date();
      const diff = +christmasDate - +now;
      if (diff > 0) {
        setDaysToChristmas(Math.ceil(diff / (1000 * 60 * 60 * 24)));
      } else {
        setDaysToChristmas(0);
      }
    }

    // Update both countdown and local clock every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
      setLocalTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, christmasDate]);

  // Format local time nicely (Seconds removed)
  const localTimeString = localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // -- Views --

  // 1. Event Finished
  if (title === "Evento Encerrado") {
    return (
      <div className="bg-slate-700 text-white p-4 md:p-8 text-center shadow-xl sticky top-0 z-50 border-b-4 border-slate-900">
        <h2 className="text-xl md:text-4xl font-bold uppercase tracking-wide flex items-center justify-center gap-2 md:gap-4">
          <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
          Evento Encerrado
        </h2>
      </div>
    );
  }

  // 2. Event Live
  if (timeLeft.isExpired) {
    return (
      <div className="bg-green-700 text-white p-4 md:p-8 text-center shadow-xl sticky top-0 z-50 border-b-4 border-green-900">
        <h2 className="text-xl md:text-5xl font-bold uppercase tracking-wide flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
          <span className="animate-pulse bg-white text-green-700 rounded-full px-4 py-1 text-sm md:text-lg font-bold">AO VIVO</span>
          {title}
        </h2>
        <p className="text-sm md:text-2xl mt-2 font-medium">Evento em andamento.</p>
      </div>
    );
  }

  // 3. Countdown
  return (
    <div className="bg-accessible-blue text-white p-3 md:p-6 shadow-2xl sticky top-0 z-50 border-b-4 border-yellow-500">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-accessible-yellow" />
            <h2 className="text-lg md:text-2xl font-bold">
              Tempo para <span className="text-accessible-yellow">{title}</span>
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center md:flex-nowrap gap-2 md:gap-3 items-center">
             {/* Christmas Badge */}
             {daysToChristmas > 0 && (
                <div className="bg-red-700 text-white px-2 py-1 md:px-3 md:py-2 rounded-lg border border-red-500 flex items-center gap-2 shadow-sm animate-pulse">
                  <Gift className="w-3 h-3 md:w-4 md:h-4 text-yellow-300" />
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wide">Natal: {daysToChristmas} dias</span>
                </div>
             )}

            {/* Local Clock Display */}
            <div className="bg-blue-900/50 px-3 py-1 md:px-4 md:py-2 rounded-lg border border-blue-400/30 flex items-center gap-2">
              <span className="text-blue-200 text-xs md:text-sm font-semibold uppercase tracking-wider hidden sm:inline">Seu Horário:</span>
              <span className="text-lg md:text-2xl font-mono font-bold text-white tabular-nums">{localTimeString}</span>
            </div>
          </div>
        </div>

        {/* Countdown Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-xl mx-auto">
          <TimeUnit value={timeLeft.days} label="Dias" />
          <TimeUnit value={timeLeft.hours} label="Horas" />
          <TimeUnit value={timeLeft.minutes} label="Minutos" />
        </div>
      </div>
    </div>
  );
};

const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="bg-white text-accessible-blue rounded-lg p-2 md:p-4 flex flex-col items-center justify-center shadow-lg border-2 border-slate-200">
    <span className="text-3xl md:text-5xl font-extrabold tabular-nums leading-none">
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-xs md:text-lg font-bold uppercase tracking-wider mt-1 text-slate-600">
      {label}
    </span>
  </div>
);

export default CountdownTimer;