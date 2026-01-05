import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/CircularProgress";
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
  Meh
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

const weeklyCalories = [
  { day: "Mon", calories: 1850, target: 2100 },
  { day: "Tue", calories: 2200, target: 2100 },
  { day: "Wed", calories: 1950, target: 2100 },
  { day: "Thu", calories: 2050, target: 2100 },
  { day: "Fri", calories: 2300, target: 2100 },
  { day: "Sat", calories: 2400, target: 2100 },
  { day: "Sun", calories: 1420, target: 2100 },
];

const macroData = [
  { name: "Protein", value: 85, target: 140, color: "hsl(262, 83%, 58%)" },
  { name: "Carbs", value: 180, target: 260, color: "hsl(158, 64%, 42%)" },
  { name: "Fat", value: 45, target: 70, color: "hsl(38, 92%, 50%)" },
];

const nutrientTrends = [
  { day: "Mon", protein: 120, carbs: 240, fat: 65 },
  { day: "Tue", protein: 135, carbs: 220, fat: 70 },
  { day: "Wed", protein: 110, carbs: 250, fat: 60 },
  { day: "Thu", protein: 145, carbs: 230, fat: 68 },
  { day: "Fri", protein: 130, carbs: 270, fat: 75 },
  { day: "Sat", protein: 100, carbs: 290, fat: 80 },
  { day: "Sun", protein: 85, carbs: 180, fat: 45 },
];

const moodCorrelation = [
  { mood: "Great", calories: 2000, icon: Smile },
  { mood: "Good", calories: 1900, icon: Smile },
  { mood: "Okay", calories: 2200, icon: Meh },
  { mood: "Low", calories: 2400, icon: Frown },
];

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState("week");
  
  const todayStats = {
    calories: { current: 1420, target: 2100 },
    water: { current: 1.8, target: 3 },
    steps: { current: 6420, target: 10000 },
    sleep: { current: 7.5, target: 8 },
  };

  const weeklyAvg = {
    calories: 2024,
    protein: 118,
    steps: 7250,
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />
      
      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Your nutrition insights at a glance</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              This Week
            </Button>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up stagger-1">
          <Card variant="elevated" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayStats.calories.current}</p>
                  <p className="text-xs text-muted-foreground">of {todayStats.calories.target} kcal</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayStats.water.current}L</p>
                  <p className="text-xs text-muted-foreground">of {todayStats.water.target}L water</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Footprints className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayStats.steps.current.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">steps today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Moon className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayStats.sleep.current}h</p>
                  <p className="text-xs text-muted-foreground">sleep last night</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Calorie Chart */}
        <section className="animate-slide-up stagger-2">
          <Card variant="elevated">
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
                        <stop offset="5%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0}/>
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
          <Card variant="elevated">
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
                    <span className="text-2xl font-bold text-foreground">310g</span>
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
          <Card variant="elevated">
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

        {/* Mood Correlation */}
        <section className="animate-slide-up stagger-4">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-primary" />
                Mood & Calorie Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Track how your eating patterns affect your mood over time
              </p>
              <div className="grid grid-cols-4 gap-3">
                {moodCorrelation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.mood}
                      className="text-center p-3 rounded-lg bg-secondary/30 hover-lift"
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${
                        item.mood === 'Great' || item.mood === 'Good' 
                          ? 'text-success' 
                          : item.mood === 'Okay' 
                            ? 'text-warning' 
                            : 'text-destructive'
                      }`} />
                      <p className="font-semibold text-foreground">{item.mood}</p>
                      <p className="text-xs text-muted-foreground">{item.calories} avg</p>
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
      </main>

      <Navigation />
    </div>
  );
};

export default Dashboard;