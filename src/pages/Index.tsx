import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { CircularProgress } from "@/components/CircularProgress";
import { MacroBar } from "@/components/MacroBar";
import { MealCard } from "@/components/MealCard";
import { QuickAction } from "@/components/QuickAction";
import { StatsCard } from "@/components/StatsCard";
import { FeatureCard } from "@/components/FeatureCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const Index = () => {
  const navigate = useNavigate();
  const caloriesConsumed = 1420;
  const caloriesTarget = 2100;
  const caloriesRemaining = caloriesTarget - caloriesConsumed;

  const meals = [
    {
      title: "Breakfast",
      time: "8:00 AM",
      calories: 380,
      items: ["Oatmeal", "Banana", "Almonds", "Green Tea"],
      logged: true,
    },
    {
      title: "Morning Snack",
      time: "10:30 AM",
      calories: 150,
      items: ["Greek Yogurt", "Berries"],
      logged: true,
    },
    {
      title: "Lunch",
      time: "1:00 PM",
      calories: 520,
      items: ["Grilled Chicken Salad", "Quinoa", "Olive Oil"],
      logged: true,
    },
    {
      title: "Afternoon Snack",
      time: "4:00 PM",
      calories: 200,
      items: ["Apple", "Peanut Butter"],
      logged: false,
    },
    {
      title: "Dinner",
      time: "7:30 PM",
      calories: 600,
      items: ["Suggested: Salmon, Brown Rice, Vegetables"],
      logged: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />
      
      <main className="container px-4 py-6 space-y-6">
        {/* Greeting Section */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Good afternoon, Sarah!</h2>
              <p className="text-muted-foreground mt-1">You're on track today. Keep it up! 🌟</p>
            </div>
            <div className="hidden sm:block">
              <Button variant="outline" size="sm">
                View Weekly Report
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Main Stats Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
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
                current={85} 
                target={140} 
                variant="protein"
              />
              <MacroBar 
                label="Carbohydrates" 
                current={180} 
                target={260} 
                variant="carbs"
              />
              <MacroBar 
                label="Fats" 
                current={45} 
                target={70} 
                variant="fat"
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                <StatsCard 
                  icon={Droplets} 
                  label="Water" 
                  value="1.8" 
                  unit="L"
                  trend={12}
                />
                <StatsCard 
                  icon={Footprints} 
                  label="Steps" 
                  value="6,420"
                  trend={-5}
                />
                <StatsCard 
                  icon={Moon} 
                  label="Sleep" 
                  value="7.5" 
                  unit="hrs"
                  trend={8}
                />
                <StatsCard 
                  icon={Zap} 
                  label="Active Cal" 
                  value="320"
                  trend={15}
                />
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
                onLog={() => console.log(`Log ${meal.title}`)}
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
                  <h3 className="text-xl font-bold">You're 55g short on protein today</h3>
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
    </div>
  );
};

export default Index;
