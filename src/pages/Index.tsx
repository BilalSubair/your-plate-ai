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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeeklyReport } from "@/components/WeeklyReport";
import FoodLog from "@/pages/FoodLog";
import {
  Camera,
  Utensils,
  Target,
  Zap,
  Droplets,
  Flame,
  Footprints,
  Moon,
  ScanLine,
  Search,
  Sparkles,
  MapPin,
  Edit2,
  Copy,
  Trash2,
  ArrowRight,
  Scale,
  Crosshair,
  Bot
} from "lucide-react";
import { foodApi, goalsApi } from "@/lib/api";

type TrackEditState = {
  isOpen: boolean;
  field: keyof DailyTracking | null;
  label: string;
  value: string;
};

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
  weight_kg?: number;
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
  const [trackEdit, setTrackEdit] = useState<TrackEditState>({
    isOpen: false,
    field: null,
    label: "",
    value: ""
  });
  const [editEntry, setEditEntry] = useState<TodayEntry | null>(null);
  const [activeMealTitle, setActiveMealTitle] = useState<string | null>(null);
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [crashPrediction, setCrashPrediction] = useState<{ risk: string, message: string, minutes: number } | null>(null);

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
        const [todayRes, goalsRes, trackingRes, crashRes] = await Promise.all([
          foodApi.getToday(),
          goalsApi.getGoals(),
          goalsApi.getDailyTracking(),
          goalsApi.predictCrash(),
        ]);
        let fetchedEntries: TodayEntry[] = [];
        let fetchedGoals = DEFAULT_GOALS;
        let fetchedTracking = { water_ml: 0, steps: 0, sleep_hours: 0, active_calories: 0 };

        if (todayRes.ok) {
          const data = await todayRes.json();
          fetchedEntries = Array.isArray(data) ? data : data.results || [];
          setEntries(fetchedEntries);
        }
        if (goalsRes.ok) {
          const g = await goalsRes.json();
          if (g && g.daily_calories) {
            fetchedGoals = g;
            setGoals(g);
          }
        }
        if (trackingRes.ok) {
          const t = await trackingRes.json();
          if (t && t.id) {
            fetchedTracking = t;
            setTracking(t);
          }
        }
        if (crashRes && crashRes.ok) {
          const c = await crashRes.json();
          setCrashPrediction(c);
        }

      } catch {
        // fallback to defaults
      }
    };
    fetchData();
  }, []);

  const openTrackEdit = (field: keyof DailyTracking, label: string) => {
    let currentValue = tracking[field] || 0;
    if (field === "water_ml") {
      currentValue = (currentValue as number) / 1000;
      label = "Water Intake (Liters)";
    }
    setTrackEdit({
      isOpen: true,
      field,
      label,
      value: currentValue.toString()
    });
  };

  const submitTrackingEdit = async () => {
    if (!trackEdit.field) return;

    let num = parseFloat(trackEdit.value);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (trackEdit.field === "water_ml" && trackEdit.label.includes("Liters")) {
      num = num * 1000;
    }

    try {
      const res = await goalsApi.updateDailyTracking({ [trackEdit.field]: num });
      if (res.ok) {
        const t = await res.json();
        setTracking(t);
        toast.success(`${trackEdit.label.replace(" (Liters)", "")} updated successfully!`);
        setTrackEdit(prev => ({ ...prev, isOpen: false }));
      } else {
        toast.error("Failed to update tracking data");
      }
    } catch {
      toast.error("Error updating tracking data");
    }
  };

  const handleDeleteEntry = async (item: TodayEntry) => {
    try {
      const res = await foodApi.deleteEntry(item.id);
      if (res.ok) {
        toast.success(`Removed ${item.name} from your log.`);
        fetchTodayLogs();
      } else {
        toast.error("Failed to delete entry.");
      }
    } catch {
      toast.error("Error deleting entry.");
    }
  };

  const submitEditEntry = async () => {
    if (!editEntry) return;
    try {
      const res = await foodApi.updateEntry(editEntry.id, {
        calories: Number(editEntry.calories),
        protein: Number(editEntry.protein),
        carbs: Number(editEntry.carbs),
        fat: Number(editEntry.fat)
      });
      if (res.ok) {
        toast.success(`Updated macros for ${editEntry.name}!`);
        setEditEntry(null);
        fetchTodayLogs();
      } else {
        toast.error("Failed to update entry.");
      }
    } catch {
      toast.error("Error updating entry.");
    }
  };


  const caloriesConsumed = Math.round(entries.reduce((s, e) => s + Number(e.calories || 0), 0));
  const caloriesTarget = goals.daily_calories;
  const caloriesRemaining = Math.max(0, caloriesTarget - caloriesConsumed);
  const proteinConsumed = Math.round(entries.reduce((s, e) => s + Number(e.protein || 0), 0));
  const carbsConsumed = Math.round(entries.reduce((s, e) => s + Number(e.carbs || 0), 0));
  const fatConsumed = Math.round(entries.reduce((s, e) => s + Number(e.fat || 0), 0));

  // Group entries by meal_type for meal cards
  const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const mealLabels: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snacks",
  };

  const meals = mealTypes.map((type) => {
    const typeEntries = entries.filter((e) => e.meal_type === type);
    return {
      title: mealLabels[type] || type,
      time: "",
      calories: typeEntries.reduce((s, e) => s + Number(e.calories), 0),
      items: typeEntries,
      logged: typeEntries.length > 0,
    };
  }).filter((m) => m.logged || ["breakfast", "lunch", "dinner", "snacks"].includes(m.title.toLowerCase()));

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
              <Button variant="default" className="shadow-soft hover-glow transition-all" onClick={() => setShowReportModal(true)}>
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
                <span className={`text-sm font-normal ${caloriesConsumed > caloriesTarget ? "text-destructive" : caloriesConsumed === caloriesTarget ? "text-warning" : "text-accent"}`}>{Math.round((caloriesConsumed / caloriesTarget) * 100)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CircularProgress
                value={caloriesConsumed}
                max={caloriesTarget}
                size={180}
                strokeWidth={14}
                variant={caloriesConsumed > caloriesTarget ? "destructive" : caloriesConsumed === caloriesTarget ? "warning" : "primary"}
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

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-border">
                <div onClick={() => openTrackEdit("weight_kg", "Current Weight")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1">
                  <StatsCard
                    icon={Scale}
                    label="Weight"
                    value={tracking.weight_kg ? tracking.weight_kg.toString() : "--"}
                    unit="kg"
                    trend={0}
                  />
                </div>
                <div onClick={() => openTrackEdit("water_ml", "Water Intake")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-1">
                  <StatsCard
                    icon={Droplets}
                    label="Water"
                    value={(tracking.water_ml / 1000).toFixed(1)}
                    unit="L"
                    trend={0}
                  />
                </div>
                <div onClick={() => openTrackEdit("steps", "Steps")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-1">
                  <StatsCard
                    icon={Footprints}
                    label="Steps"
                    value={tracking.steps.toLocaleString()}
                    trend={0}
                  />
                </div>
                <div onClick={() => openTrackEdit("sleep_hours", "Sleep Hours")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-3">
                  <StatsCard
                    icon={Moon}
                    label="Sleep"
                    value={tracking.sleep_hours.toString()}
                    unit="hrs"
                    trend={0}
                  />
                </div>
                <div onClick={() => openTrackEdit("active_calories", "Active Calories")} className="cursor-pointer transition-all duration-300 hover:-translate-y-1 stagger-4">
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
              onClick={() => navigate("/log?tab=photo", { state: { defaultTab: "photo" } })}
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
              icon={Bot}
              label="AI Coach"
              description="Fitness Chat"
              variant="secondary"
              onClick={() => navigate("/ai-coach")}
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
                onClick={() => setActiveMealTitle(meal.title)}
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
              onClick={() => navigate("/meal-plan")}
              gradient
            />

            <FeatureCard
              icon={Search}
              title="Supplement Research"
              description="Search and learn about supplements with evidence-based information and reviews."
              onClick={() => navigate("/supplements")}
            />
            <FeatureCard
              icon={Crosshair}
              title="Restaurant Menu Sniper"
              description="Upload a menu and let AI securely lock onto the 3 meals that best fit your remaining daily macros."
              onClick={() => navigate("/menu-sniper")}
            />
            <FeatureCard
              icon={MapPin}
              title="Budget-Friendly Finder"
              description="Discover affordable, healthy meal options near you that fit your calorie budget."
              onClick={() => navigate('/budget-finder')}
            />
          </div>
        </section>

        <section className="animate-slide-up mb-8" style={{ animationDelay: "0.5s" }}>
          {crashPrediction && (
            <Card className={`overflow-hidden relative flex flex-col h-full border-none text-white shadow-sm hover-lift ${crashPrediction.risk === 'high' ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardContent className="p-5 relative flex flex-col justify-between flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 opacity-90" />
                      <span className="text-sm font-medium opacity-90">Energy Forecaster</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider bg-white/20`}>
                      {crashPrediction.risk === 'high' ? 'High Risk' : 'Stable'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight">
                    {crashPrediction.risk === 'high' ? 'Energy Crash Imminent' : 'Metabolism is Stable'}
                  </h3>
                  <p className="text-sm opacity-90">
                    {crashPrediction.message}
                  </p>
                  {crashPrediction.risk === 'low' && (
                    <p className="text-xs opacity-75 mt-2 font-medium">
                      Expected drop in: ~{Math.floor(crashPrediction.minutes / 60)}h {crashPrediction.minutes % 60}m
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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

      <WeeklyReport isOpen={showReportModal} onOpenChange={setShowReportModal} goals={goals} />

      {/* Tracking Edit Modal */}
      <Dialog open={trackEdit.isOpen} onOpenChange={(open) => !open && setTrackEdit(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update {trackEdit.label}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="tracking-value" className="text-sm font-medium text-foreground">
                New Value
              </label>
              <Input
                id="tracking-value"
                type="number"
                step="any"
                value={trackEdit.value}
                onChange={(e) => setTrackEdit(prev => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submitTrackingEdit();
                  }
                }}
                className="text-lg h-12"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackEdit(prev => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button onClick={submitTrackingEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meal Details Modal */}
      <Dialog open={!!activeMealTitle} onOpenChange={(open) => !open && setActiveMealTitle(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{activeMealTitle} Details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {meals.find(m => m.title === activeMealTitle)?.items.map((item: TodayEntry, i: number) => (
              <div key={i} className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg border border-border/40 hover:bg-secondary/60 transition-colors group/item">
                <div className="flex flex-col truncate pr-2">
                  <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 text-accent"><Flame className="w-3 h-3"/> {item.calories}</span>
                    <span className="flex items-center gap-1 text-protein"><Utensils className="w-3 h-3"/> {item.protein}g</span>
                    <span className="flex items-center gap-1 text-primary"><Utensils className="w-3 h-3"/> {item.carbs}g</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setActiveMealTitle(null); setEditEntry(item); }}
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    title="Edit Entry"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteEntry(item)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {meals.find(m => m.title === activeMealTitle)?.items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No items logged for this meal yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Edit Modal */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit {editEntry?.name}</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Flame className="w-4 h-4 text-accent" /> Calories
                </label>
                <Input
                  type="number"
                  value={editEntry.calories}
                  onChange={(e) => setEditEntry({ ...editEntry, calories: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Utensils className="w-4 h-4 text-protein" /> Protein (g)
                </label>
                <Input
                  type="number"
                  value={editEntry.protein}
                  onChange={(e) => setEditEntry({ ...editEntry, protein: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Utensils className="w-4 h-4 text-primary" /> Carbs (g)
                </label>
                <Input
                  type="number"
                  value={editEntry.carbs}
                  onChange={(e) => setEditEntry({ ...editEntry, carbs: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Utensils className="w-4 h-4 text-warning" /> Fat (g)
                </label>
                <Input
                  type="number"
                  value={editEntry.fat}
                  onChange={(e) => setEditEntry({ ...editEntry, fat: Number(e.target.value) })}
                  className="text-lg"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={submitEditEntry}>Save Macros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
