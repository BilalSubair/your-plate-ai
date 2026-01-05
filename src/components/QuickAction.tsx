import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  variant?: "primary" | "accent" | "secondary";
  onClick?: () => void;
  className?: string;
}

export const QuickAction = ({
  icon: Icon,
  label,
  description,
  variant = "secondary",
  onClick,
  className,
}: QuickActionProps) => {
  const variants = {
    primary: "gradient-primary text-primary-foreground shadow-elevated hover:shadow-prominent",
    accent: "gradient-accent text-accent-foreground shadow-elevated hover:shadow-prominent",
    secondary: "bg-card border border-border hover:border-primary/30 hover:shadow-elevated text-foreground",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        variants[variant],
        className
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mb-3",
        variant === "secondary" ? "bg-secondary" : "bg-primary-foreground/20"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="font-semibold text-sm">{label}</span>
      {description && (
        <span className={cn(
          "text-xs mt-1",
          variant === "secondary" ? "text-muted-foreground" : "opacity-80"
        )}>
          {description}
        </span>
      )}
    </button>
  );
};
