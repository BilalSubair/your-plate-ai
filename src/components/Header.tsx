import { Bell, Flame, Menu, LogOut, Home, ChefHat, Plus, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { goalsApi } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { username, logout } = useAuth();
  const location = useLocation();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      goalsApi.getGoals()
        .then(res => res.json())
        .then(data => {
          if (data.profile_picture) setProfilePicture(data.profile_picture);
        })
        .catch(() => { });
    }
  }, [username]);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: ChefHat, label: "Recipes", path: "/recipes" },
    { icon: BarChart3, label: "Stats", path: "/dashboard" },
    { icon: Target, label: "Goals", path: "/goals" },
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-foreground">NutriGuide</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">AI Nutrition</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location.pathname === item.path ? "text-primary flex-col after:w-full after:h-0.5 after:bg-primary after:mt-1" : "text-muted-foreground"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-semibold text-base px-3 py-2">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer">
                  <span className="font-medium text-sm">Don't forget to log your breakfast!</span>
                  <span className="text-xs text-muted-foreground mt-1">2 hours ago</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer">
                  <span className="font-medium text-sm">You hit your calorie target yesterday! 🎯</span>
                  <span className="text-xs text-muted-foreground mt-1">1 day ago</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer">
                  <span className="font-medium text-sm">New AI recipe suggestion available.</span>
                  <span className="text-xs text-muted-foreground mt-1">2 days ago</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer">
                <UserCircle className="w-4 h-4 mr-2" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/profile" className="hidden md:flex items-center gap-3 ml-2 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{username || "User"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center ring-2 ring-primary/20 overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-primary">{(username || "U")[0].toUpperCase()}</span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
