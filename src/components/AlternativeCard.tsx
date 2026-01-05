import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthScoreRing } from "./HealthScoreRing";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlternativeCardProps {
  name: string;
  brand?: string;
  score: number;
  image?: string;
  reason: string;
  className?: string;
  onClick?: () => void;
}

export const AlternativeCard = ({
  name,
  brand,
  score,
  image,
  reason,
  className,
  onClick,
}: AlternativeCardProps) => {
  return (
    <Card
      variant="elevated"
      className={cn("p-4 cursor-pointer group", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Product Image */}
        <div className="w-16 h-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
              🥗
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{name}</p>
          {brand && (
            <p className="text-sm text-muted-foreground truncate">{brand}</p>
          )}
          <p className="text-xs text-primary mt-1 line-clamp-1">{reason}</p>
        </div>

        {/* Score */}
        <HealthScoreRing score={score} size={56} strokeWidth={5} />

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </Card>
  );
};
