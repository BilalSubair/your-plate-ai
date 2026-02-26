import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { CircularProgress } from "@/components/CircularProgress";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { QuickAction } from "@/components/QuickAction";
import { StatsCard } from "@/components/StatsCard";
import { FeatureCard } from "@/components/FeatureCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import FoodLog from "@/pages/FoodLog";
import {
  Camera,
  Utensils,
  Target,
  Zap,
  Droplets,
  Footprints,
  Moon,
  ScanLine,
  Search,
  Sparkles,
  ChefHat,
  MapPin,
  ArrowRight
} from "lucide-react";
import { foodApi, goalsApi } from "@/lib/api";

interface TodayEntry {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type?: string;
  logged_at?: string;
}

interface NutritionGoals {
  daily_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
}

const DEFAULT_GOALS: NutritionGoals = {
  daily_calories: 2100,
  protein_grams: 140,
  carbs_grams: 260,
  fat_grams: 70,
};

interface DailyTracking {
  water_ml: number;
  steps: number;
  sleep_hours: number;
  active_calories: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const Index = () => {
  const navigate = useNavigate();
  const { username } = useAuth();
  const [entries, setEntries] = useState<TodayEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [tracking, setTracking] = useState<DailyTracking>({
    water_ml: 0, steps: 0, sleep_hours: 0, active_calories: 0
  });
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [underConsumedDates, setUnderConsumedDates] = useState<Date[]>([]);
  const [overConsumedDates, setOverConsumedDates] = useState<Date[]>([]);

  const fetchTodayLogs = async () => {
    try {
      const todayRes = await foodApi.getToday();
      if (todayRes.ok) {
        const data = await todayRes.json();
        setEntries(Array.isArray(data) ? data : data.results || []);
      }
    } catch { }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, goalsRes, trackingRes] = await Promise.all([
          foodApi.getToday(),
          goalsApi.getGoals(),
          goalsApi.getDailyTracking(),
        ]);
        if (todayRes.ok) {
          const data = await todayRes.json();
          setEntries(Array.isArray(data) ? data : data.results || []);
        }
        if (goalsRes.ok) {
          const g = await goalsRes.json();
          if (g && g.daily_calories) setGoals(g);
        }
        if (trackingRes.ok) {
          const t = await trackingRes.json();
          if (t && t.id) setTracking(t);
        }
      } catch {
        // fallback to defaults
      }
    };
    fetchData();
  }, []);

  const handleUpdateTracking = async (field: keyof DailyTracking, label: string) => {
    const val = window.prompt(`Enter new value for ${label}:`, tracking[field].toString());
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      toast("Invalid number entered");
      return;
    }
    try {
      const res = await goalsApi.updateDailyTracking({ [field]: num });
      if (res.ok) {
        const t = await res.json();
        setTracking(t);
        toast(`${label} updated successfully!`);
      } else {
        toast("Failed to update tracking data");
      }
    } catch {
      toast("Error updating tracking data");
    }
  };

  const handleOpenReport = async () => {
    setShowReportModal(true);
    try {
      const res = await foodApi.getDailySummary(30);
      if (res.ok) {
        const history = await res.json();
        const under: Date[] = [];
        const over: Date[] = [];

        history.forEach((day: any) => {
          if (day.total_calories > 0) {
            const d = new Date(day.date);
            // Adjust offset to prevent Javascript from sliding date backwards based on local timezone
            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());

            if (day.total_calories <= goals.daily_calories) {
              under.push(d);
            } else {
              over.push(d);
            }
          }
        });

        setUnderConsumedDates(under);
        setOverConsumedDates(over);
      }
    } catch (error) {
      toast.error("Failed to load history");
    }
  };

  const caloriesConsumed = Math.round(entries.reduce((s, e) => s + Number(e.calories || 0), 0));
  const caloriesTarget = goals.daily_calories;
  const caloriesRemaining = Math.max(0, caloriesTarget - caloriesConsumed);
  const proteinConsumed = Math.round(entries.reduce((s, e) => s + Number(e.protein || 0), 0));
  const carbsConsumed = Math.round(entries.reduce((s, e) => s + Number(e.carbs || 0), 0));
  const fatConsumed = Math.round(entries.reduce((s, e) => s + Number(e.fat || 0), 0));

  // Group entries by meal_type for meal cards
  const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"];
  const mealLabels: Record<string, string> = {
    breakfast: "Breakfast",
    morning_snack: "Morning Snack",
    lunch: "Lunch",
    afternoon_snack: "Afternoon Snack",
    dinner: "Dinner",
    snack: "Snack",
  };

  const meals = mealTypes.map((type) => {
    const typeEntries = entries.filter((e) => e.meal_type === type);
    return {
      title: mealLabels[type] || type,
      time: "",
      calories: typeEntries.reduce((s, e) => s + e.calories, 0),
      items: typeEntries.map((e) => e.name),
      logged: typeEntries.length > 0,
    };
  }).filter((m) => m.logged || ["breakfast", "lunch", "dinner"].includes(m.title.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      <main className="container px-4 py-8 space-y-8 max-w-7xl mx-auto">
        {/* Greeting Section */}
        <section className="relative overflow-hidden rounded-3xl animate-scale-in glass">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 animate-shimmer" />
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{getGreeting()}, {username || "User"}!</h2>
              <p className="text-muted-foreground mt-1">You're on track today. Keep it up! 🌟</p>
            </div>
            <div className="hidden sm:block">
              <Button variant="default" className="shadow-soft hover-glow transition-all" onClick={handleOpenReport}>
                View Weekly Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Main Stats Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger-1 pl-1 pr-1">
          {/* Calorie Ring Card */}
          <Card variant="elevated" className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <span>Today's Calories</span>
                <span className="text-sm font-normal text-accent">{Math.round((caloriesConsumed / caloriesTarget) * 100)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CircularProgress
                value={caloriesConsumed}
                max={caloriesTarget}
                size={180}
                strokeWidth={14}
                variant="primary"
              >
                <span className="text-3xl font-bold text-foreground">{caloriesRemaining}</span>
                <span className="text-sm text-muted-foreground">kcal left</span>
              </CircularProgress>
              <div className="flex items-center justify-center gap-8 mt-6 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{caloriesConsumed}</p>
                  <p className="text-xs text-muted-foreground">Consumed</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-lg font-bold text-foreground">{caloriesTarget}</p>
                  <p className="text-xs text-muted-foreground">Target</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Macros Card */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Macronutrients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <MacroBar
                label="Protein"
                current={proteinConsumed}
                target={goals.protein_grams}
                variant="protein"
              />
              <MacroBar
                label="Carbohydrates"
                current={carbsConsumed}
                target={goals.carbs_grams}
                variant="carbs"
              />
              <MacroBar
                label="Fats"
                current={fatConsumed}
                target={goals.fat_grams}
                variant="fat"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                <div onClick={() => handleUpdateTracking("water_ml", "Water Intake (mL)")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1">
                  <StatsCard
                    icon={Droplets}
                    label="Water"
                    value={(tracking.water_ml / 1000).toFixed(1)}
                    unit="L"
                    trend={0}
                  />
                </div>
                <div onClick={() => handleUpdateTracking("steps", "Steps")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-1">
                  <StatsCard
                    icon={Footprints}
                    label="Steps"
                    value={tracking.steps.toLocaleString()}
                    trend={0}
                  />
                </div>
                <div onClick={() => handleUpdateTracking("sleep_hours", "Sleep Hours")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-2">
                  <StatsCard
                    icon={Moon}
                    label="Sleep"
                    value={tracking.sleep_hours.toString()}
                    unit="hrs"
                    trend={0}
                  />
                </div>
                <div onClick={() => handleUpdateTracking("active_calories", "Active Calories")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-3">
                  <StatsCard
                    icon={Zap}
                    label="Active Cal"
                    value={tracking.active_calories.toString()}
                    trend={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              icon={Camera}
              label="Scan Food"
              description="AI Recognition"
              variant="primary"
              onClick={() => navigate("/log")}
            />
            <QuickAction
              icon={Utensils}
              label="Log Meal"
              description="Manual Entry"
              onClick={() => navigate("/log")}
            />
            <QuickAction
              icon={ScanLine}
              label="Scan Label"
              description="Product Info"
              onClick={() => navigate("/scanner")}
            />
            <QuickAction
              icon={Target}
              label="Set Goal"
              description="Adjust Target"
              onClick={() => navigate("/goals")}
            />
          </div>
        </section>

        {/* Today's Meals */}
        <section className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Today's Meals</h3>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {meals.map((meal, index) => (
              <MealCard
                key={index}
                {...meal}
                onLog={() => setLoggingMeal(mealTypes[index])}
                className="hover-lift"
              />
            ))}
          </div>
        </section>

        {/* AI Features */}
        <section className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">AI-Powered Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={Sparkles}
              title="Smart Meal Planning"
              description="Get personalized meal suggestions based on your goals, preferences, and what's in your kitchen."
              gradient
            />
            <FeatureCard
              icon={ChefHat}
              title="Recipe Discovery"
              description="Find healthy recipes that match your macros and dietary restrictions."
            />
            <FeatureCard
              icon={Search}
              title="Supplement Research"
              description="Search and learn about supplements with evidence-based information and reviews."
              onClick={() => navigate("/supplements")}
            />
            <FeatureCard
              icon={MapPin}
              title="Budget-Friendly Finder"
              description="Discover affordable, healthy meal options near you that fit your calorie budget."
            />
          </div>
        </section>

        {/* Insights Card */}
        <section className="animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <Card className="gradient-hero text-primary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-medium opacity-90">AI Insight</span>
                  </div>
                  <h3 className="text-xl font-bold">
                    {goals.daily_protein - proteinConsumed > 0
                      ? `You're ${goals.daily_protein - proteinConsumed}g short on protein today`
                      : "Great job hitting your protein target today! 💪"}
                  </h3>
                  <p className="text-sm opacity-80 max-w-md">
                    Consider adding grilled chicken or Greek yogurt to your dinner to meet your muscle-building goals.
                  </p>
                </div>
                <Button variant="glass" className="flex-shrink-0 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30">
                  Get Suggestions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Navigation />

      <Dialog open={!!loggingMeal} onOpenChange={(open) => !open && setLoggingMeal(null)}>
        <DialogContent className="sm:max-w-[425px] h-[85vh] overflow-y-auto p-0 border-none bg-background">
          <DialogHeader className="p-4 border-b absolute top-0 w-full bg-background/80 backdrop-blur-md z-10 hidden">
            <DialogTitle>Log {loggingMeal ? mealLabels[loggingMeal] : "Food"}</DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-8">
            <FoodLog
              isModal={true}
              defaultMealType={loggingMeal || "snack"}
              onLogSuccess={() => {
                setLoggingMeal(null);
                fetchTodayLogs();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Monthly Tracking Report</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <Calendar
              mode="multiple"
              selected={[...underConsumedDates, ...overConsumedDates]}
              modifiers={{ under: underConsumedDates, over: overConsumedDates }}
              modifiersClassNames={{
                under: "bg-primary text-primary-foreground font-bold rounded-lg",
                over: "bg-destructive text-destructive-foreground font-bold rounded-lg"
              }}
              className="rounded-md border p-3 pointer-events-none"
            />
            <div className="flex w-full justify-between items-center text-sm mt-6 px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Within Target</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Over Target</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
