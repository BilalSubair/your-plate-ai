import { cn } from "@/lib/utils";
import { Home, Search, Plus, BarChart3, User } from "lucide-react";
import { useState } from "react";

interface NavItem {
  icon: typeof Home;
  label: string;
  active?: boolean;
}

export const Navigation = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems: NavItem[] = [
    { icon: Home, label: "Home" },
    { icon: Search, label: "Search" },
    { icon: Plus, label: "Log" },
    { icon: BarChart3, label: "Stats" },
    { icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 md:hidden">
      <div className="glass rounded-2xl border border-border/50 shadow-prominent p-2">
        <ul className="flex items-center justify-around">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            const isCenter = index === 2;

            return (
              <li key={item.label}>
                <button
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200",
                    isCenter 
                      ? "gradient-primary text-primary-foreground shadow-elevated -mt-6 w-14 h-14 rounded-full" 
                      : isActive 
                        ? "text-primary bg-secondary" 
                        : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isCenter && "w-6 h-6")} />
                  {!isCenter && (
                    <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
