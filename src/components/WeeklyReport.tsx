import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { foodApi } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

interface WeeklyReportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  goals: {
    daily_calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  };
}

export function WeeklyReport({ isOpen, onOpenChange, goals }: WeeklyReportProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [underConsumedDates, setUnderConsumedDates] = useState<Date[]>([]);
  const [overConsumedDates, setOverConsumedDates] = useState<Date[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await foodApi.getDailySummary(7);
      if (res.ok) {
        const history = await res.json();
        const filledData = [];
        for (let i = 6; i >= 0; i--) {
          const d = subDays(new Date(), i);
          const dateStr = format(d, 'yyyy-MM-dd');
          const existing = history.find((h: any) => h.date === dateStr);
          filledData.push({
            date: dateStr,
            displayDate: format(d, 'EEE'), // Mon, Tue
            calories: existing ? existing.total_calories : 0,
            protein: existing ? existing.total_protein : 0,
            carbs: existing ? existing.total_carbs : 0,
            fat: existing ? existing.total_fat : 0,
          });
        }
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
        
        setData(filledData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const avgCalories = data.length ? Math.round(data.reduce((acc, curr) => acc + curr.calories, 0) / 7) : 0;
  const avgProtein = data.length ? Math.round(data.reduce((acc, curr) => acc + curr.protein, 0) / 7) : 0;
  const hitTargetDays = data.filter(d => d.calories > 0 && d.calories <= goals.daily_calories).length;
  const loggedDays = data.filter(d => d.calories > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[85vh] sm:h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Weekly Analytics Report
          </DialogTitle>
          <DialogDescription>
            Your nutrition trends and averages over the last 7 days.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-none shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-muted-foreground mb-1">Avg Calories</span>
                  <span className="text-2xl font-bold text-primary">{avgCalories}</span>
                  <span className="text-xs text-muted-foreground mt-1">Goal: {goals.daily_calories}</span>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-none shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-muted-foreground mb-1">Avg Protein</span>
                  <span className="text-2xl font-bold text-blue-500">{avgProtein}g</span>
                  <span className="text-xs text-muted-foreground mt-1">Goal: {goals.protein_grams}g</span>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/5 border-none shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-muted-foreground mb-1">Target Hits</span>
                  <span className="text-2xl font-bold text-emerald-500">{hitTargetDays}/{loggedDays || 7}</span>
                  <span className="text-xs text-muted-foreground mt-1">Days on track</span>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/5 border-none shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-muted-foreground mb-1">Trend</span>
                  <div className="flex items-center gap-1 mt-1">
                    {avgCalories <= goals.daily_calories && avgCalories > 0 ? (
                      <TrendingDown className="w-6 h-6 text-emerald-500" />
                    ) : avgCalories > goals.daily_calories ? (
                      <TrendingUp className="w-6 h-6 text-destructive" />
                    ) : (
                      <Target className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {avgCalories <= goals.daily_calories && avgCalories > 0 ? "On Track" : avgCalories > goals.daily_calories ? "Over Goal" : "No Data"}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calories Chart */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Calorie Trend (7 Days)</CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="displayDate" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        />
                        <ReferenceLine y={goals.daily_calories} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Calendar Tracking */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Monthly Tracking Report</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-2 pb-4">
                  <Calendar
                    modifiers={{ under: underConsumedDates, over: overConsumedDates }}
                    modifiersClassNames={{
                      under: "!bg-emerald-500 !text-white font-bold rounded-lg hover:!bg-emerald-600",
                      over: "!bg-red-500 !text-white font-bold rounded-lg hover:!bg-red-600"
                    }}
                    className="rounded-md border p-3 pointer-events-none"
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl text-sm text-muted-foreground text-center animate-fade-in shadow-inner border border-border/40">
              💡 {hitTargetDays >= 5 ? "Incredible work! You are highly consistent and consistently hitting your targets." : 
                 hitTargetDays >= 3 ? "Good effort this week! A little more consistency will help you reach your goals faster." : 
                 "Every day is a new opportunity. Focus on tracking your meals carefully this upcoming week!"}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
