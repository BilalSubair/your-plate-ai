import { cn } from "@/lib/utils";
import { Home, Plus, BarChart3, Target, ChefHat } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/" },
    { icon: ChefHat, label: "Recipes", path: "/recipes" },
    { icon: Plus, label: "Log", path: "/log" },
    { icon: BarChart3, label: "Stats", path: "/dashboard" },
    { icon: Target, label: "Goals", path: "/goals" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 md:hidden">
      <div className="glass rounded-2xl border border-border/50 shadow-prominent p-2">
        <ul className="flex items-center justify-around">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isCenter = index === 2;

            return (
              <li key={item.label}>
                <button
                  onClick={() => navigate(item.path)}
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
