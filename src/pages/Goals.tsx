import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/CircularProgress";
import { 
  Target, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Scale,
  Flame,
  Activity,
  Calendar,
  IceCream,
  Coffee,
  Pizza,
  Cake,
  ArrowRight,
  Check,
  RefreshCw,
  Zap,
  X
} from "lucide-react";
import { toast } from "sonner";
import { goalsApi, apiFetch } from "@/lib/api";

interface NutritionGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Craving {
  name: string;
  icon: typeof IceCream;
  calories: number;
  frequency: string;
}

const defaultCravings: Craving[] = [
  { name: "Ice Cream", icon: IceCream, calories: 280, frequency: "2x/week" },
  { name: "Coffee with Sugar", icon: Coffee, calories: 120, frequency: "Daily" },
  { name: "Pizza Slice", icon: Pizza, calories: 350, frequency: "1x/week" },
  { name: "Dessert", icon: Cake, calories: 400, frequency: "3x/week" },
];

interface CravingLog {
  id: number;
  craving: string;
  alternative: string;
  intensity: number;
  resisted: boolean;
  logged_at: string;
}

const Goals = () => {
  const [currentWeight, setCurrentWeight] = useState(72);
  const [targetWeight, setTargetWeight] = useState(68);
  const [activityLevel, setActivityLevel] = useState(1.5);
  const [weeklyTarget, setWeeklyTarget] = useState(0.5);
  const [goals, setGoals] = useState<NutritionGoal>({
    calories: 2100,
    protein: 140,
    carbs: 260,
    fat: 70,
  });
  const [selectedCraving, setSelectedCraving] = useState<Craving | null>(null);
  const [cravingStrategy, setCravingStrategy] = useState<string | null>(null);
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cravingLogs, setCravingLogs] = useState<CravingLog[]>([]);

  useEffect(() => {
    const fetchCravings = async () => {
      try {
        const res = await goalsApi.getCravings();
        if (res.ok) {
          const data = await res.json();
          setCravingLogs(Array.isArray(data) ? data : data.results || []);
        }
      } catch {}
    };
    fetchCravings();
  }, []);

  const handleLogCraving = async (craving: Craving) => {
    try {
      const res = await goalsApi.logCraving({
        craving: craving.name,
        intensity: 5,
        resisted: false,
      });
      if (res.ok) {
        toast.success(`Logged craving: ${craving.name}`);
        const data = await res.json();
        setCravingLogs((prev) => [data, ...prev]);
      }
    } catch {
      toast.error("Could not log craving");
    }
  };

  const handleDeleteCraving = async (id: number) => {
    try {
      const res = await apiFetch(`/goals/cravings/${id}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        toast.success("Craving deleted");
        setCravingLogs((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      toast.error("Could not delete craving");
    }
  };

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await goalsApi.getGoals();
        if (res.ok) {
          const data = await res.json();
          if (data && data.daily_calories) {
            setGoals({
              calories: data.daily_calories,
              protein: data.daily_protein,
              carbs: data.daily_carbs,
              fat: data.daily_fat,
            });
            if (data.current_weight) setCurrentWeight(data.current_weight);
            if (data.target_weight) setTargetWeight(data.target_weight);
            if (data.activity_level) setActivityLevel(data.activity_level);
            if (data.weekly_target) setWeeklyTarget(data.weekly_target);
          }
        }
      } catch {
        // use defaults
      }
    };
    fetchGoals();
  }, []);

  const calculateBMR = () => {
    // Simplified BMR calculation
    return Math.round(10 * currentWeight + 6.25 * 175 - 5 * 30 + 5);
  };

  const calculateTDEE = () => {
    return Math.round(calculateBMR() * activityLevel);
  };

  const calculateDeficit = () => {
    return Math.round(weeklyTarget * 1100); // 1kg fat ≈ 7700 kcal, 7700/7 ≈ 1100
  };

  const weeksToGoal = Math.round((currentWeight - targetWeight) / weeklyTarget);

  const handleRecalculate = async () => {
    const newCalories = calculateTDEE() - calculateDeficit();
    const newGoals = {
      calories: Math.max(1200, newCalories),
      protein: Math.round(currentWeight * 1.8),
      carbs: Math.round((newCalories * 0.45) / 4),
      fat: Math.round((newCalories * 0.25) / 9),
    };
    setGoals(newGoals);

    setSaving(true);
    try {
      const res = await goalsApi.updateGoals({
        daily_calories: newGoals.calories,
        daily_protein: newGoals.protein,
        daily_carbs: newGoals.carbs,
        daily_fat: newGoals.fat,
        current_weight: currentWeight,
        target_weight: targetWeight,
        activity_level: activityLevel,
        weekly_target: weeklyTarget,
      });
      if (res.ok) {
        toast.success("Goals saved to your profile!");
      } else {
        toast.success("Goals updated locally!");
      }
    } catch {
      toast.success("Goals updated locally!");
    } finally {
      setSaving(false);
    }
  };

  const handleCravingStrategy = (craving: Craving) => {
    setSelectedCraving(craving);
    // Calculate trade-off strategy
    const deficit = craving.calories;
    setCravingStrategy(`To enjoy your ${craving.name}, you can either:
• Skip 1 snack (save ~${Math.round(deficit * 0.6)} kcal)
• Add 30 min cardio (burn ~${Math.round(deficit * 0.8)} kcal)
• Reduce dinner portion by 1/3`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />
      
      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">Goals & Planning</h1>
          <p className="text-muted-foreground mt-1">Customize your nutrition targets</p>
        </section>

        <Tabs defaultValue="goals" className="animate-slide-up stagger-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals" className="gap-2">
              <Target className="w-4 h-4" />
              My Goals
            </TabsTrigger>
            <TabsTrigger value="cravings" className="gap-2">
              <IceCream className="w-4 h-4" />
              Cravings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-4 mt-4">
            {/* Weight Goal Card */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Weight Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{currentWeight}</p>
                    <p className="text-sm text-muted-foreground">Current (kg)</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{targetWeight}</p>
                    <p className="text-sm text-muted-foreground">Target (kg)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Weight</Label>
                    <Input 
                      type="number"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(parseFloat(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Weight</Label>
                    <Input 
                      type="number"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Weekly Loss Target</Label>
                    <span className="text-sm font-medium text-foreground">{weeklyTarget} kg/week</span>
                  </div>
                  <Slider
                    value={[weeklyTarget]}
                    onValueChange={([value]) => setWeeklyTarget(value)}
                    min={0.25}
                    max={1}
                    step={0.25}
                    className="my-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Gentle (0.25kg)</span>
                    <span>Aggressive (1kg)</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary/30 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Estimated timeline</p>
                    <p className="text-sm text-muted-foreground">
                      {weeksToGoal > 0 ? `~${weeksToGoal} weeks to reach your goal` : "You're at your goal!"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Level */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Activity Level
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 1.2, label: "Sedentary", desc: "Little exercise" },
                    { value: 1.375, label: "Light", desc: "1-3 days/week" },
                    { value: 1.55, label: "Moderate", desc: "3-5 days/week" },
                    { value: 1.725, label: "Active", desc: "6-7 days/week" },
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setActivityLevel(level.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        activityLevel === level.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div className="p-3 rounded-lg bg-accent/10 text-center">
                    <p className="text-2xl font-bold text-accent">{calculateTDEE()}</p>
                    <p className="text-xs text-muted-foreground">TDEE (kcal)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <p className="text-2xl font-bold text-primary">{goals.calories}</p>
                    <p className="text-xs text-muted-foreground">Daily Target</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macro Goals */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    Daily Nutrient Goals
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-normal text-muted-foreground">Auto-adjust</span>
                    <Switch checked={autoAdjust} onCheckedChange={setAutoAdjust} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Calories</Label>
                    <Input 
                      type="number"
                      value={goals.calories}
                      onChange={(e) => setGoals({ ...goals, calories: parseInt(e.target.value) })}
                      className="mt-1"
                      disabled={autoAdjust}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                    <Input 
                      type="number"
                      value={goals.protein}
                      onChange={(e) => setGoals({ ...goals, protein: parseInt(e.target.value) })}
                      className="mt-1"
                      disabled={autoAdjust}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                    <Input 
                      type="number"
                      value={goals.carbs}
                      onChange={(e) => setGoals({ ...goals, carbs: parseInt(e.target.value) })}
                      className="mt-1"
                      disabled={autoAdjust}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                    <Input 
                      type="number"
                      value={goals.fat}
                      onChange={(e) => setGoals({ ...goals, fat: parseInt(e.target.value) })}
                      className="mt-1"
                      disabled={autoAdjust}
                    />
                  </div>
                </div>

                <Button onClick={handleRecalculate} disabled={saving} className="w-full gap-2 hover-glow">
                  <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? "Saving..." : "Recalculate & Save"}
                </Button>
              </CardContent>
            </Card>

            {/* Weekly Adjustment */}
            <Card className="bg-secondary/30 border-secondary">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Smart Weekly Adjustments</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      NutriGuide will automatically adjust your targets each week based on your progress, 
                      ensuring sustainable weight loss without plateaus.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cravings" className="space-y-4 mt-4">
            {/* Craving Info */}
            <Card variant="elevated" className="bg-accent/5 border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Smart Craving Management</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Don't fight your cravings — plan for them! Select a craving to see how you can 
                      incorporate it into your diet without derailing your goals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cravings List */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Common Cravings</h3>
              <div className="grid grid-cols-2 gap-3">
                {defaultCravings.map((craving, index) => {
                  const Icon = craving.icon;
                  return (
                    <Card 
                      key={craving.name}
                      className={`hover-lift cursor-pointer transition-all animate-slide-up ${
                        selectedCraving?.name === craving.name ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => handleCravingStrategy(craving)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium text-foreground">{craving.name}</p>
                        <p className="text-sm text-accent font-semibold">{craving.calories} kcal</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {craving.frequency}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Strategy Card */}
            {selectedCraving && cravingStrategy && (
              <Card variant="elevated" className="border-primary/50 animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Trade-off Strategy for {selectedCraving.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {cravingStrategy}
                  </p>
                  
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="font-medium text-foreground">Best Strategy</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Plan your {selectedCraving.name} for after your workout. You'll enjoy it more and 
                      offset the calories with your activity!
                    </p>
                  </div>

                  <Button className="w-full gap-2 hover-glow" onClick={() => handleLogCraving(selectedCraving)}>
                    <Calendar className="w-4 h-4" />
                    Log This Craving
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Craving History */}
            {cravingLogs.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Craving Logs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cravingLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors group">
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.craving}</p>
                        <p className="text-xs text-muted-foreground">
                          Intensity: {log.intensity}/10 • {log.resisted ? "Resisted ✅" : "Gave in"} • {new Date(log.logged_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteCraving(log.id)}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Daily Budget */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Today's Treat Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <CircularProgress
                    value={120}
                    max={200}
                    size={140}
                    strokeWidth={12}
                    variant="accent"
                  >
                    <span className="text-2xl font-bold text-foreground">80</span>
                    <span className="text-xs text-muted-foreground">kcal left</span>
                  </CircularProgress>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  You have 80 kcal of "flex calories" today for treats or unexpected snacks
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Navigation />
    </div>
  );
};

export default Goals;