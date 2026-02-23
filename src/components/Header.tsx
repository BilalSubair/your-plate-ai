import { Bell, Flame, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const { username, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-foreground">NutriGuide</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">AI Nutrition</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden md:flex items-center gap-3 ml-2">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{username || "User"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center ring-2 ring-primary/20">
              <span className="text-sm font-semibold text-primary">{(username || "U")[0].toUpperCase()}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Log out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
