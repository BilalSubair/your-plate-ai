import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight, ChefHat, Loader2, Sparkles, Plus, Check, RefreshCw, BookOpen, Flame } from "lucide-react";
import { toast } from "sonner";
import { goalsApi, foodApi } from "@/lib/api";

interface Meal {
    meal_type: string;
    name: string;
    description: string;
    recipe?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface MealPlanResponse {
    plan: Meal[];
    summary: string;
}

const MealPlan = () => {
    const [preferences, setPreferences] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
    const [loggingItems, setLoggingItems] = useState<Record<string, boolean>>({});
    const [cheatMeals, setCheatMeals] = useState<Record<string, boolean>>({});
    const [selectedRecipe, setSelectedRecipe] = useState<Meal | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        toast.loading("AI is designing your perfect day...");
        try {
            const res = await goalsApi.generateMealPlan(preferences || "None specifically");
            if (res.ok) {
                const data = await res.json();
                setMealPlan(data);
                toast.dismiss();
                toast.success("Meal plan successfully generated!");
            } else {
                toast.dismiss();
                toast.error("Failed to generate meal plan. Make sure your goals are set up.");
            }
        } catch (err) {
            toast.dismiss();
            toast.error("Network error while generating meal plan.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLogMeal = async (meal: Meal, index: number) => {
        const key = `${meal.name}-${index}`;
        setLoggingItems(prev => ({ ...prev, [key]: true }));

        const isCheat = cheatMeals[key] || false;

        // Map AI meal types to our backend ENUM types
        const typeMap: Record<string, string> = {
            "Breakfast": "breakfast",
            "Lunch": "lunch",
            "Dinner": "dinner",
            "Snack": "snack"
        };

        const mealType = typeMap[meal.meal_type] || "snack";

        try {
            const res = await foodApi.logEntry({
                name: meal.name,
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                meal_type: mealType,
            });

            if (res.ok) {
                if (isCheat) {
                    await goalsApi.consumeCheatMeal({ name: meal.name, calories: meal.calories });
                }
                toast.success(`${meal.name} logged to your dashboard!`, {
                    description: isCheat ? 'Deducted from Cravings Bank' : '',
                });
            } else {
                toast.error("Failed to log meal.");
                setLoggingItems(prev => ({ ...prev, [key]: false }));
            }
        } catch {
            toast.error("Network error.");
            setLoggingItems(prev => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-8">
            <Header />

            <main className="container px-4 py-8 space-y-6 max-w-4xl mx-auto">
                <section className="animate-slide-up bg-gradient-to-r from-primary/10 to-accent/5 p-8 rounded-3xl border border-primary/20 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 opacity-10">
                        <Sparkles className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary/20 text-primary rounded-xl">
                            <ChefHat className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Smart Meal Planner</h1>
                            <p className="text-muted-foreground mt-1 text-lg">AI-powered daily menus tailored exactly to your remaining macros.</p>
                        </div>
                    </div>
                </section>

                {!mealPlan && (
                    <Card variant="elevated" className="animate-slide-up stagger-1">
                        <CardHeader>
                            <CardTitle>Dietary Preferences (Optional)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="e.g. Vegetarian, no dairy, craving Mexican food..."
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                                className="min-h-[120px] resize-none"
                            />
                            <Button
                                className="w-full text-lg h-14 hover-glow"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Designing Plan...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Generate My Daily Plan
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {mealPlan && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Your Custom Menu</h2>
                                <p className="text-muted-foreground mt-1">{mealPlan.summary}</p>
                            </div>
                            <Button variant="outline" onClick={() => setMealPlan(null)}>
                                Start Over
                            </Button>
                        </div>

                        <div className="grid gap-6">
                            {mealPlan.plan.map((meal, idx) => {
                                const key = `${meal.name}-${idx}`;
                                const isLogged = loggingItems[key];

                                return (
                                    <Card key={idx} variant="elevated" className="overflow-hidden hover-lift transition-all">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="p-6 flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary uppercase tracking-wider text-xs font-bold">
                                                        {meal.meal_type}
                                                    </Badge>
                                                    <div className="flex gap-4 text-sm font-medium">
                                                        <span className="text-foreground flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-accent"></span>
                                                            {meal.calories} kcal
                                                        </span>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-foreground mb-2">{meal.name}</h3>
                                                <p className="text-muted-foreground mb-4">{meal.description}</p>

                                                <div className="flex gap-4 mb-4 sm:mb-0 text-sm bg-secondary/30 p-3 rounded-lg inline-flex">
                                                    <span className="text-protein font-semibold">P: {meal.protein}g</span>
                                                    <span className="text-primary font-semibold">C: {meal.carbs}g</span>
                                                    <span className="text-warning font-semibold">F: {meal.fat}g</span>
                                                </div>
                                            </div>

                                            <div className="bg-secondary/10 p-6 flex flex-col items-center justify-center gap-3 sm:border-l border-t sm:border-t-0 border-border sm:w-48">
                                                {meal.recipe && (
                                                    <Button
                                                        className="w-full shadow-soft mb-1"
                                                        variant="outline"
                                                        onClick={() => setSelectedRecipe(meal)}
                                                    >
                                                        <BookOpen className="w-4 h-4 mr-2" />
                                                        Preparation
                                                    </Button>
                                                )}
                                                <div className="flex items-center justify-between w-full px-1 py-2 bg-secondary/10 rounded-md border border-border/50">
                                                    <Label className="text-[11px] font-medium flex items-center gap-1 text-destructive whitespace-nowrap">
                                                        <Flame className="w-3 h-3 text-destructive" /> Cheat
                                                    </Label>
                                                    <Switch 
                                                        checked={cheatMeals[key] || false} 
                                                        onCheckedChange={(checked) => setCheatMeals(prev => ({...prev, [key]: checked}))} 
                                                        className="scale-75"
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full shadow-soft"
                                                    variant={isLogged ? "secondary" : "default"}
                                                    disabled={isLogged}
                                                    onClick={() => handleLogMeal(meal, idx)}
                                                >
                                                    {isLogged ? (
                                                        <>
                                                            <Check className="w-4 h-4 mr-2 text-success" />
                                                            Logged
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            Log Meal
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
                                <RefreshCw className="w-4 h-4" />
                                Regenerate Alternative Plan
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* Recipe Modal */}
            <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <ChefHat className="w-6 h-6 text-primary" />
                            {selectedRecipe?.name}
                        </DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            {selectedRecipe?.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 bg-secondary/20 p-4 rounded-xl max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-foreground">
                        {selectedRecipe?.recipe}
                    </div>
                </DialogContent>
            </Dialog>

            <Navigation />
        </div>
    );
};

export default MealPlan;
