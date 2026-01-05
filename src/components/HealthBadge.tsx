import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, MinusCircle } from "lucide-react";

export type HealthLevel = "healthy" | "neutral" | "harmful";

interface HealthBadgeProps {
  level: HealthLevel;
  label?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const HealthBadge = ({
  level,
  label,
  size = "md",
  showIcon = true,
  className,
}: HealthBadgeProps) => {
  const config = {
    healthy: {
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/30",
      icon: CheckCircle,
      defaultLabel: "Healthy",
    },
    neutral: {
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/30",
      icon: MinusCircle,
      defaultLabel: "Moderate",
    },
    harmful: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      border: "border-destructive/30",
      icon: AlertTriangle,
      defaultLabel: "Harmful",
    },
  };

  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const { bg, text, border, icon: Icon, defaultLabel } = config[level];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        bg,
        text,
        border,
        sizes[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label || defaultLabel}
    </span>
  );
};
