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
  const [isCalculatingAI, setIsCalculatingAI] = useState(false);
  const [cravingLogs, setCravingLogs] = useState<CravingLog[]>([]);
  const [bankedCalories, setBankedCalories] = useState(0);
  const [dailyAllowance, setDailyAllowance] = useState(0);

  const fetchCravingsAndBank = async () => {
    try {
      const [resCravings, resBank] = await Promise.all([
        goalsApi.getCravings(),
        goalsApi.getCravingsBank()
      ]);
      if (resCravings.ok) {
        const data = await resCravings.json();
        setCravingLogs(Array.isArray(data) ? data : data.results || []);
      }
      if (resBank.ok) {
        const data = await resBank.json();
        setBankedCalories(data.banked_calories || 0);
        setDailyAllowance(data.daily_allowance || 0);
      }
    } catch { }
  };

  useEffect(() => {
    fetchCravingsAndBank();
  }, []);

  const handleLogCraving = async (craving: Craving) => {
    try {
      // Consume cheat calories from bank
      await goalsApi.consumeCheatMeal({
        name: craving.name,
        calories: craving.calories
      });
      fetchCravingsAndBank();

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
            if (data.activity_level) {
              let multiplier = 1.55;
              switch (data.activity_level) {
                case 'sedentary': multiplier = 1.2; break;
                case 'light': multiplier = 1.375; break;
                case 'moderate': multiplier = 1.55; break;
                case 'active': multiplier = 1.725; break;
                case 'extreme': multiplier = 1.9; break;
              }
              setActivityLevel(multiplier);
            }
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
    let mappedActivityLevel = "moderate";
    if (activityLevel <= 1.2) mappedActivityLevel = "sedentary";
    else if (activityLevel <= 1.375) mappedActivityLevel = "light";
    else if (activityLevel <= 1.55) mappedActivityLevel = "moderate";
    else if (activityLevel <= 1.725) mappedActivityLevel = "active";
    else mappedActivityLevel = "extreme";

    try {
      const res = await goalsApi.updateGoals({
        daily_calories: newGoals.calories,
        daily_protein: newGoals.protein,
        daily_carbs: newGoals.carbs,
        daily_fat: newGoals.fat,
        current_weight: currentWeight,
        target_weight: targetWeight,
        activity_level: mappedActivityLevel,
        weekly_target: weeklyTarget,
      });
      if (res.ok) {
        toast.success("Goals saved to your profile!");
      } else {
        toast.success("Goals updated locally!");
      }
    } catch {
      toast.error("Failed to update goals.");
    } finally {
      setSaving(false);
    }
  };

  const handleAiRecalibrate = async () => {
    setIsCalculatingAI(true);
    try {
      const res = await goalsApi.calculateMaintenance();
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(`ML Engine isolated your baseline at ${data.maintenance_calories} kcal using ${data.data_points_used} days of data!`);
        // We can update the TDEE math locally or force a refresh. For now, we'll fetch newest goals.
        const goalsRes = await goalsApi.getGoals();
        if (goalsRes.ok) {
          const newGoals = await goalsRes.json();
          if (newGoals.maintenance_calories) {
            setGoals((prev) => ({
              ...prev,
              calories: newGoals.daily_calories || prev.calories
            }));
          }
        }
      } else {
        toast.error(data.message || "Insufficient data for ML Regression (Needs 21 days min).");
      }
    } catch {
      toast.error("Failed to reach Neural Regressor.");
    } finally {
      setIsCalculatingAI(false);
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
              Cravings Bank
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
                      className={`p-3 rounded-lg border text-left transition-all ${activityLevel === level.value
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
                    <p className="text-2xl font-bold text-primary">
                      {goals.calories - dailyAllowance}
                    </p>
                    <p className="text-xs text-muted-foreground">Budget (Daily Target - Bank)</p>
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
                    <Label className="text-xs text-muted-foreground">Total Daily Calories</Label>
                    <Input
                      type="number"
                      value={goals.calories}
                      onChange={(e) => setGoals({ ...goals, calories: parseInt(e.target.value) })}
                      className="mt-1"
                      disabled={autoAdjust}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Effective Budget: {goals.calories - dailyAllowance} kcal (Allowance blocked)
                    </p>
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

                <Button className="w-full" onClick={handleRecalculate} disabled={saving}>
                  {saving ? "Updating..." : "Recalculate Profile"}
                </Button>
                <Button variant="secondary" className="w-full gap-2 border border-primary/20" onClick={handleAiRecalibrate} disabled={isCalculatingAI}>
                  <Sparkles className="h-4 w-4 text-primary" />
                  {isCalculatingAI ? "Synthesizing..." : "AI Adaptive Calibration"}
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
                      className={`hover-lift cursor-pointer transition-all animate-slide-up ${selectedCraving?.name === craving.name ? 'ring-2 ring-primary' : ''
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

            {/* Cravings Bank (Smart Cravings) */}
            <Card variant="elevated" className="border-accent/40 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Cravings Bank</span>
                  <Badge variant="outline" className="bg-background shadow-xs">Saved up treats!</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Daily Allowance (kcal)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={dailyAllowance} 
                      onChange={(e) => setDailyAllowance(parseInt(e.target.value) || 0)}
                      className="w-24 border-accent focus-visible:ring-accent"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="hover:bg-accent hover:text-white"
                      onClick={async () => {
                        try {
                          await goalsApi.patchGoals({ daily_cheat_allowance: dailyAllowance });
                          toast.success("Allowance updated!");
                          fetchCravingsAndBank();
                        } catch { toast.error("Failed to update"); }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-background border flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex flex-col items-center justify-center shrink-0">
                    <IceCream className="w-6 h-6 mb-0.5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available in Bank (Last 30 days)</p>
                    <p className={`text-3xl font-bold ${bankedCalories > 0 ? "text-success" : "text-destructive"}`}>
                      {bankedCalories} <span className="text-sm font-normal text-muted-foreground">kcal</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Unused daily cheat calories accumulate here automatically. 
                  When you log a craving from the buttons above, the calories are deducted from this bank!
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