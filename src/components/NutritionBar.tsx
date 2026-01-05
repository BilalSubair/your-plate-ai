import { cn } from "@/lib/utils";
import { HealthLevel } from "./HealthBadge";

interface NutritionBarProps {
  label: string;
  value: number;
  unit: string;
  dailyPercentage?: number;
  level?: HealthLevel;
  className?: string;
}

export const NutritionBar = ({
  label,
  value,
  unit,
  dailyPercentage,
  level = "neutral",
  className,
}: NutritionBarProps) => {
  const barColors = {
    healthy: "bg-success",
    neutral: "bg-warning",
    harmful: "bg-destructive",
  };

  const percentage = Math.min(dailyPercentage || 0, 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{value}</span>
          {unit}
          {dailyPercentage !== undefined && (
            <span className="ml-1.5 text-xs">({Math.round(dailyPercentage)}% DV)</span>
          )}
        </span>
      </div>
      {dailyPercentage !== undefined && (
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColors[level])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
