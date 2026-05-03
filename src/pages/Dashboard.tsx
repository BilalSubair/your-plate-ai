import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/CircularProgress";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Flame,
  Droplets,
  Moon,
  Footprints,
  Activity,
  Target,
  Smile,
  Frown,
  Meh,
  Loader2,
  Scale,
  Download
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { foodApi, goalsApi } from "@/lib/api";
import { format, parseISO } from "date-fns";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MOOD_ICONS = {
  great: Smile,
  good: Smile,
  okay: Meh,
  low: Frown,
} as const;

type Mood = keyof typeof MOOD_ICONS;

interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  entry_count: number;
}

interface NutritionGoals {
  daily_calories: number;
  effective_daily_calories?: number;
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
  mood?: Mood;
  date?: string;
}

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("week");
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [tracking, setTracking] = useState<DailyTracking>({
    water_ml: 0, steps: 0, sleep_hours: 0, active_calories: 0
  });
  const [trackingHistoryData, setTrackingHistoryData] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, goalsRes, trackingRes, weightRes] = await Promise.all([
          foodApi.getDailySummary(7),
          goalsApi.getGoals(),
          goalsApi.getDailyTracking(),
          goalsApi.getTrackingHistory(30),
        ]);
        if (summaryRes.ok) {
          setDailySummary(await summaryRes.json());
        }
        if (goalsRes.ok) {
          const g = await goalsRes.json();
          if (g && g.daily_calories) setGoals(g);
        }
        if (trackingRes.ok) {
          const t = await trackingRes.json();
          if (t && t.id) setTracking(t);
        }
        if (weightRes.ok) {
          const w = await weightRes.json();
          setTrackingHistoryData(w);
          setWeightHistory(w.filter((d: any) => d.weight_kg != null).map((d: any) => ({
            day: format(parseISO(d.date), "MMM d"),
            weight: d.weight_kg,
            rawTracking: d
          })));
        }
      } catch {
        // fallback to defaults
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayEntry = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return dailySummary.find((d) => d.date === today);
  }, [dailySummary]);

  const todayStats = {
    calories: { 
      current: todayEntry?.total_calories ?? 0, 
      target: goals.effective_daily_calories ?? goals.daily_calories 
    },
    water: { current: (tracking.water_ml / 1000).toFixed(1), target: 3 },
    steps: { current: tracking.steps, target: 10000 },
    sleep: { current: tracking.sleep_hours, target: 8 },
  };

  const handleMoodSelect = async (mood: Mood) => {
    try {
      setTracking(prev => ({ ...prev, mood }));
      await goalsApi.updateDailyTracking({ mood });
    } catch {
      // revert if failed
    }
  };

  const dynamicMoodCorrelation = useMemo(() => {
    // Collect all tracking data (today's live + 30 days history)
    // Filter out entries with no mood
    const allTracking = [...(tracking.date ? [tracking] : []), ...weightHistory.map(w => w.rawTracking || {})]
      .filter((t: any) => t && t.mood);

    const moodStats: Record<string, { total_calories: number, count: number }> = {
      great: { total_calories: 0, count: 0 },
      good: { total_calories: 0, count: 0 },
      okay: { total_calories: 0, count: 0 },
      low: { total_calories: 0, count: 0 },
    };

    allTracking.forEach((t: any) => {
      const dbDate = t.date; // "YYYY-MM-DD"
      // Find matching calories in dailySummary
      const summaryMatch = dailySummary.find(ds => ds.date === dbDate);
      if (summaryMatch && summaryMatch.total_calories > 0 && moodStats[t.mood]) {
        moodStats[t.mood].total_calories += summaryMatch.total_calories;
        moodStats[t.mood].count += 1;
      }
    });

    return [
      { mood: "great" as const, label: "Great", data: moodStats.great },
      { mood: "good" as const, label: "Good", data: moodStats.good },
      { mood: "okay" as const, label: "Okay", data: moodStats.okay },
      { mood: "low" as const, label: "Low", data: moodStats.low },
    ].map(item => ({
      mood: item.label,
      key: item.mood,
      calories: item.data.count > 0 ? Math.round(item.data.total_calories / item.data.count) : 0,
      icon: MOOD_ICONS[item.mood]
    }));
  }, [tracking, weightHistory, dailySummary]);

  const weeklyCalories = useMemo(
    () =>
      dailySummary.map((d) => ({
        day: DAY_NAMES[parseISO(d.date).getDay()],
        calories: d.total_calories ?? 0,
        target: goals.effective_daily_calories ?? goals.daily_calories,
      })),
    [dailySummary, goals]
  );

  const macroData = useMemo(() => {
    const p = todayEntry?.total_protein ?? 0;
    const c = todayEntry?.total_carbs ?? 0;
    const f = todayEntry?.total_fat ?? 0;
    return [
      { name: "Protein", value: p, target: goals.protein_grams || DEFAULT_GOALS.protein_grams, color: "hsl(262, 83%, 58%)" },
      { name: "Carbs", value: c, target: goals.carbs_grams || DEFAULT_GOALS.carbs_grams, color: "hsl(158, 64%, 42%)" },
      { name: "Fat", value: f, target: goals.fat_grams || DEFAULT_GOALS.fat_grams, color: "hsl(38, 92%, 50%)" },
    ];
  }, [todayEntry, goals]);

  const nutrientTrends = useMemo(
    () =>
      dailySummary.map((d) => ({
        day: DAY_NAMES[parseISO(d.date).getDay()],
        protein: d.total_protein ?? 0,
        carbs: d.total_carbs ?? 0,
        fat: d.total_fat ?? 0,
      })),
    [dailySummary]
  );

  const weeklyAvg = useMemo(() => {
    if (!dailySummary.length) return { calories: 0, protein: 0, steps: tracking.steps || 0 };
    const len = dailySummary.length;
    return {
      calories: Math.round(dailySummary.reduce((s, d) => s + (d.total_calories ?? 0), 0) / len),
      protein: Math.round(dailySummary.reduce((s, d) => s + (d.total_protein ?? 0), 0) / len),
      steps: tracking.steps || 0,
    };
  }, [dailySummary, tracking.steps]);

  const weeklyStats = useMemo(() => {
    const last7 = trackingHistoryData.slice(0, 7) || [];
    const len = last7.length || 1;
    const avgWater = last7.reduce((s, t) => s + (t.water_ml || 0), 0) / len;
    const avgSteps = last7.reduce((s, t) => s + (t.steps || 0), 0) / len;
    const avgSleep = last7.reduce((s, t) => s + (t.sleep_hours || 0), 0) / len;

    return {
      calories: { 
        current: weeklyAvg.calories, 
        target: goals.effective_daily_calories ?? goals.daily_calories 
      },
      water: { current: (avgWater / 1000).toFixed(1), target: 3 },
      steps: { current: Math.round(avgSteps), target: 10000 },
      sleep: { current: (Math.round(avgSleep * 10) / 10).toFixed(1), target: 8 },
    };
  }, [trackingHistoryData, weeklyAvg, goals]);

  const totalMacros = macroData.reduce((s, m) => s + m.value, 0);

  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"today" | "week">("today");

  const displayStats = viewMode === "today" ? todayStats : weeklyStats;

  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.loading("Generating your PDF Report...");

    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(249, 115, 22); // Orange primary
      doc.text("NutriGuide AI Report", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Exported: ${format(new Date(), "MMM dd, yyyy")}`, 14, 30);
      doc.text(`Reporting Period: 7-Day Macronutrient Tracking`, 14, 36);

      const headers = [["Date", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Items Logged"]];
      
      const rows = dailySummary.map(day => [
        format(parseISO(day.date), "MMM dd, yyyy"),
        day.total_calories || 0,
        day.total_protein || 0,
        day.total_carbs || 0,
        day.total_fat || 0,
        day.entry_count || 0
      ]);

      autoTable(doc, {
        startY: 45,
        head: headers,
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' }
        }
      });

      // Averages Footer
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Weekly Averages", 14, finalY + 15);
      
      doc.setFontSize(11);
      doc.setTextColor(80);
      doc.text(`Daily Calories: ${weeklyAvg.calories.toLocaleString()} kcal`, 14, finalY + 23);
      doc.text(`Daily Protein: ${weeklyAvg.protein}g`, 14, finalY + 29);

      doc.save(`NutriGuide_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast.dismiss();
      toast.success("PDF Report successfully generated! 📄");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background pb-24 md:pb-8"
    >
      <Header />

      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Your nutrition insights at a glance</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/20 text-primary hover:bg-primary/10"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF Report
              </Button>
              <Button 
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm" 
                className="gap-2 hidden sm:flex transition-all duration-300"
                onClick={() => setViewMode(prev => prev === "today" ? "week" : "today")}
              >
                <Calendar className="w-4 h-4" />
                {viewMode === "week" ? "Today's Stats" : "This Week"}
              </Button>
            </div>
          </div>
        </section>

        <div id="dashboard-export-area" className="space-y-6">

        {/* Quick Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up stagger-1">
          <Card variant="elevated" className="hover-lift transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground transition-all">{displayStats.calories.current}</p>
                  <p className="text-xs text-muted-foreground transition-all">
                    {viewMode === "week" ? "avg/day" : `of ${displayStats.calories.target} kcal`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="hover-lift transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground transition-all">{displayStats.water.current}L</p>
                  <p className="text-xs text-muted-foreground transition-all">
                    {viewMode === "week" ? "avg/day" : `of ${displayStats.water.target}L water`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="hover-lift transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Footprints className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground transition-all">{displayStats.steps.current.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground transition-all">
                    {viewMode === "week" ? "avg steps/day" : "steps today"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="hover-lift transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Moon className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground transition-all">{displayStats.sleep.current}h</p>
                  <p className="text-xs text-muted-foreground transition-all">
                    {viewMode === "week" ? "avg sleep/night" : "sleep last night"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Calorie Chart */}
        <section className="animate-slide-up stagger-2">
          <Card className="glass-premium border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Calorie Intake
                </span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span className="text-muted-foreground">Avg:</span>
                  <span className="text-foreground font-semibold">{weeklyAvg.calories}</span>
                  <span className="text-muted-foreground">kcal</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyCalories}>
                    <defs>
                      <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="hsl(158, 64%, 42%)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCalories)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Macros & Trends */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up stagger-3">
          {/* Macro Distribution */}
          <Card className="glass-premium border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Today's Macros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={macroData}
                      cx={90}
                      cy={90}
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground">{totalMacros}g</span>
                    <span className="text-xs text-muted-foreground">total</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {macroData.map((macro) => (
                  <div key={macro.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: macro.color }}
                      />
                      <span className="text-sm text-foreground">{macro.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{macro.value}g</span>
                      <span className="text-xs text-muted-foreground">/ {macro.target}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nutrient Trends */}
          <Card className="glass-premium border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weekly Macro Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nutrientTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="protein" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="carbs" fill="hsl(158, 64%, 42%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fat" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-protein" />
                  <span className="text-xs text-muted-foreground">Protein</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Carbs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-xs text-muted-foreground">Fat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Weight Pattern */}
        {weightHistory.length > 0 && (
          <section className="animate-slide-up stagger-4">
            <Card className="glass-premium border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-500" />
                  Weight Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}kg`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Weight']}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(142, 71%, 45%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(142, 71%, 45%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Mood Tracker & Correlation */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up stagger-4">
          <Card className="glass-premium border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-primary" />
                How are you feeling today?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 border border-border bg-secondary/10 p-4 rounded-xl">
                {[
                  { key: 'great', label: 'Great', icon: Smile, color: 'text-success hover:bg-success/20' },
                  { key: 'good', label: 'Good', icon: Smile, color: 'text-success/80 hover:bg-success/10' },
                  { key: 'okay', label: 'Okay', icon: Meh, color: 'text-warning hover:bg-warning/20' },
                  { key: 'low', label: 'Low', icon: Frown, color: 'text-destructive hover:bg-destructive/20' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = tracking.mood === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleMoodSelect(item.key as Mood)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${isSelected
                          ? 'bg-background shadow-soft ring-2 ring-primary scale-110 z-10'
                          : `bg-transparent hover:scale-105 ${item.color}`
                        }`}
                    >
                      <Icon className={`w-8 h-8 mb-2 ${isSelected ? item.color.split(' ')[0] : 'opacity-70'}`} />
                      <span className={`text-xs font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-premium border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Mood & Calorie Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your actual 30-day average calories vs logged mood.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dynamicMoodCorrelation.map((item) => {
                  const Icon = item.icon;
                  const hasData = item.calories > 0;
                  return (
                    <div
                      key={item.mood}
                      className={`text-center p-3 rounded-lg ${hasData ? 'bg-secondary/30 hover-lift' : 'bg-secondary/10 opacity-50'}`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${item.mood === 'Great' || item.mood === 'Good'
                          ? 'text-success'
                          : item.mood === 'Okay'
                            ? 'text-warning'
                            : 'text-destructive'
                        }`} />
                      <p className="font-semibold text-foreground text-sm">{item.mood}</p>
                      <p className="text-xs text-muted-foreground">{hasData ? `${item.calories} avg` : 'No data'}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Weekly Summary */}
        <section className="animate-slide-up stagger-5">
          <Card className="gradient-hero text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold">{weeklyAvg.calories}</p>
                  <p className="text-sm opacity-80">Avg Calories</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{weeklyAvg.protein}g</p>
                  <p className="text-sm opacity-80">Avg Protein</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{weeklyAvg.steps.toLocaleString()}</p>
                  <p className="text-sm opacity-80">Avg Steps</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>You're 12% more active than last week!</span>
              </div>
            </CardContent>
          </Card>
        </section>
        </div>
      </main>

      <Navigation />
    </motion.div>
  );
};

export default Dashboard;