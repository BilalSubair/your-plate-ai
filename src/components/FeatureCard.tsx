import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: boolean;
  onClick?: () => void;
  className?: string;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  gradient = false,
  onClick,
  className,
}: FeatureCardProps) => {
  return (
    <Card 
      variant={gradient ? "default" : "elevated"}
      className={cn(
        "p-5 cursor-pointer group transition-all duration-200 hover:scale-[1.02]",
        gradient && "gradient-hero text-primary-foreground",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          gradient ? "bg-primary-foreground/20" : "bg-secondary"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            gradient ? "text-primary-foreground" : "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className={cn(
            "text-sm mt-1 line-clamp-2",
            gradient ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {description}
          </p>
        </div>
        <ChevronRight className={cn(
          "w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1",
          gradient ? "text-primary-foreground/60" : "text-muted-foreground"
        )} />
      </div>
    </Card>
  );
};
