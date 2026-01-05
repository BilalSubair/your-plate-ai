import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  variant: "protein" | "carbs" | "fat";
  className?: string;
}

export const MacroBar = ({
  label,
  current,
  target,
  unit = "g",
  variant,
  className,
}: MacroBarProps) => {
  const percentage = Math.min((current / target) * 100, 100);

  const colors = {
    protein: "text-protein",
    carbs: "text-carbs",
    fat: "text-fat",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("font-bold", colors[variant])}>
          {current}{unit} <span className="text-muted-foreground font-normal">/ {target}{unit}</span>
        </span>
      </div>
      <Progress value={percentage} variant={variant} className="h-2" />
    </div>
  );
};
