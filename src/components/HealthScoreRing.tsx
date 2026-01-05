import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const HealthScoreRing = ({
  score,
  size = 120,
  strokeWidth = 10,
  className,
}: HealthScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const strokeDashoffset = circumference - progress * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 70) return { start: "hsl(142, 71%, 45%)", end: "hsl(152, 76%, 50%)" };
    if (score >= 40) return { start: "hsl(38, 92%, 50%)", end: "hsl(48, 96%, 55%)" };
    return { start: "hsl(0, 72%, 55%)", end: "hsl(10, 77%, 60%)" };
  };

  const getLabel = () => {
    if (score >= 70) return "Good Choice";
    if (score >= 40) return "Moderate";
    return "Poor Choice";
  };

  const colors = getColor();
  const gradientId = `health-score-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{Math.round(score)}</span>
        <span className="text-xs text-muted-foreground mt-0.5">{getLabel()}</span>
      </div>
    </div>
  );
};
