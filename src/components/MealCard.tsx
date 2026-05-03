import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, Flame, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MealCardProps {
  title: string;
  time: string;
  calories: number;
  image?: string;
  items?: any[];
  logged?: boolean;
  className?: string;
  onLog?: () => void;
  onClick?: () => void;
}

export const MealCard = ({
  title,
  time,
  calories,
  image,
  items = [],
  logged = false,
  className,
  onLog,
  onClick,
}: MealCardProps) => {
  return (
    <Card 
      variant="elevated" 
      onClick={onClick}
      className={cn(
        "overflow-hidden group cursor-pointer",
        logged && "ring-2 ring-primary/20",
        className
      )}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
          {image ? (
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Flame className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {logged && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {time}
                </span>
                <span className="flex items-center gap-1 text-accent font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  {calories} kcal
                </span>
              </div>
            </div>
            {!logged && (
              <Button 
                size="icon" 
                variant="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); onLog?.(); }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          {items.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
              {items.map(i => i.name || i).join(" • ")}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
