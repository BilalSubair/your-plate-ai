import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface LogoLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LogoLoader = ({ className, size = 'md', text }: LogoLoaderProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32"
  };

  const iconClasses = {
    sm: "w-5 h-5",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-4", className)}>
      <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
        {/* Outer rotating solid/transparent border effect */}
        <div 
          className="absolute inset-0 rounded-full border-[3px] border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" 
          style={{ animationDuration: '1s', animationTimingFunction: 'linear' }} 
        />
        {/* Secondary slower ring for depth */}
        <div 
          className="absolute inset-1 rounded-full border-2 border-primary/20" 
        />
        
        {/* Inner flame icon with subtle pulse */}
        <div className="relative z-10 bg-background/80 backdrop-blur-sm shadow-soft rounded-full p-2 flex flex-col items-center justify-center animate-pulse-soft">
          <Flame className={cn("text-primary", iconClasses[size])} strokeWidth={2.5} />
        </div>
      </div>
      
      {text && (
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse-soft text-center" style={{ animationDuration: '2s' }}>
          {text}
        </p>
      )}
    </div>
  );
};
