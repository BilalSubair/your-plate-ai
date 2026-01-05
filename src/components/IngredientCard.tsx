import { cn } from "@/lib/utils";
import { HealthBadge, HealthLevel } from "./HealthBadge";

interface IngredientCardProps {
  name: string;
  description?: string;
  level: HealthLevel;
  className?: string;
}

export const IngredientCard = ({
  name,
  description,
  level,
  className,
}: IngredientCardProps) => {
  const borderColors = {
    healthy: "border-l-success",
    neutral: "border-l-warning",
    harmful: "border-l-destructive",
  };

  return (
    <div
      className={cn(
        "bg-card rounded-lg p-3 border-l-4 shadow-soft",
        borderColors[level],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{name}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <HealthBadge level={level} size="sm" showIcon={false} />
      </div>
    </div>
  );
};
