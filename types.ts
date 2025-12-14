export interface EventData {
  title: string;
  dayLabel?: string;
  dayIndex?: number;
  targetDate: Date;
  description: string;
  notes?: string;
  christmasMessage?: string;
  pdfUrl: string | null;
  fileName: string | null;
  isFinished?: boolean;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}