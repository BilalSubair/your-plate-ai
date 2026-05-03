import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MapPin,
    DollarSign,
    Flame,
    Dumbbell,
    Search,
    ArrowLeft,
    Utensils,
    Plus,
    Loader2,
    Navigation,
    ShoppingCart,
    Info,
    CheckCircle2,
    Briefcase,
    Settings2
} from "lucide-react";
import { foodApi, goalsApi } from "@/lib/api";

type MealMatch = {
    restaurant: string;
    item: string;
    price: number | string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    description: string;
};

export default function BudgetFinder() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState("");
    const [budget, setBudget] = useState(500);
    const [maxCalories, setMaxCalories] = useState(800);
    const [minProtein, setMinProtein] = useState(30);
    const [dietary, setDietary] = useState("");
    const [meals, setMeals] = useState<MealMatch[]>([]);
    const [locating, setLocating] = useState(false);

    // Grocery State
    const [groceryLoading, setGroceryLoading] = useState(false);
    const [weeklyBudget, setWeeklyBudget] = useState(2000); // Default 2000 INR
    const [groceryCalories, setGroceryCalories] = useState(2000);
    const [groceryProtein, setGroceryProtein] = useState(150);
    const [groceryCarbs, setGroceryCarbs] = useState(200);
    const [groceryFat, setGroceryFat] = useState(65);
    const [groceryList, setGroceryList] = useState<any>(null);

    // Fetch goals on mount
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const res = await goalsApi.getGoals();
                if (res.ok) {
                    const g = await res.json();
                    if (g && g.id) {
                        setGroceryCalories(g.daily_calories);
                        setGroceryCarbs(g.carbs);
                        setGroceryFat(g.fat);
                    }
                }
            } catch (err) {
                console.error("Failed to sync goals for grocery optimizer", err);
            }
        };
        fetchGoals();
    }, []);

    const handleLocateMe = async () => {
        setLocating(true);
        const fallbackToIP = async () => {
            try {
                const res = await fetch("https://ipapi.co/json/");
                const data = await res.json();
                if (data.city && data.region) {
                    setLocation(`${data.city}, ${data.region}`);
                    toast.success("Location found via network.");
                } else {
                    toast.error("Could not determine location.");
                }
            } catch (e) {
                toast.error("Location services unavailable.");
            } finally {
                setLocating(false);
            }
        };

        if (!navigator.geolocation) {
            fallbackToIP();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    const data = await res.json();
                    if (data.city && data.principalSubdivision) {
                        setLocation(`${data.city}, ${data.principalSubdivision}`);
                        toast.success("Location found via GPS!");
                    } else {
                        fallbackToIP();
                    }
                } catch (e) {
                    fallbackToIP();
                }
                setLocating(false);
            },
            () => fallbackToIP(), // on deny/error
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleSearch = async () => {
        if (!location.trim()) {
            toast.error("Please enter a location");
            return;
        }
        setLoading(true);
        setMeals([]);

        try {
            const res = await foodApi.getBudgetMeals({
                budget,
                location,
                max_calories: maxCalories,
                min_protein: minProtein,
                dietary_preferences: dietary || "None"
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to find meals");
            }

            setMeals(data.meals || []);
            toast.success("Found matching local spots!");
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateGrocery = async () => {
        setGroceryLoading(true);
        setGroceryList(null);
        try {
            const res = await foodApi.generateGroceryList({
                budget: weeklyBudget,
                daily_calories: groceryCalories,
                protein: groceryProtein,
                carbs: groceryCarbs,
                fat: groceryFat,
                dietary_preferences: dietary || "None"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate list");
            setGroceryList(data);
            toast.success("Grocery list optimized successfully!");
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setGroceryLoading(false);
        }
    };

    const handleLogMeal = async (meal: MealMatch) => {
        try {
            const res = await foodApi.logEntry({
                name: `${meal.item} (${meal.restaurant})`,
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                meal_type: "lunch"
            });
            if (res.ok) {
                toast.success(`Logged ${meal.item} to your diary!`);
                navigate("/");
            } else {
                toast.error("Failed to log meal");
            }
        } catch {
            toast.error("Error logging meal");
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <main className="container px-4 py-6 space-y-6">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Budget-Friendly Finder</h1>
                    <p className="text-muted-foreground">Find affordable local meals or generate an optimized weekly grocery list.</p>
                </div>

                <Tabs defaultValue="restaurants" className="w-full">
                    <TabsList className="mb-6 grid w-full md:w-[400px] grid-cols-2">
                        <TabsTrigger value="restaurants" className="flex items-center gap-2">
                            <Utensils className="w-4 h-4" /> Local Meals
                        </TabsTrigger>
                        <TabsTrigger value="groceries" className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Grocery Optimizer
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="restaurants" className="m-0 focus-visible:outline-none">
                        <div className="grid md:grid-cols-[350px_1fr] gap-6 items-start">
                            {/* Filters Column */}
                            <Card className="shadow-lg border-primary/20 sticky top-20">
                                <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Search className="w-5 h-5 text-primary" />
                                        Search Filters
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                Your Location
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                placeholder="e.g. Downtown Chicago, IL"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="bg-secondary/50 pr-10"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-0 top-0 h-full text-muted-foreground hover:text-primary"
                                                onClick={handleLocateMe}
                                                disabled={locating}
                                                title="Use my current location"
                                            >
                                                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                Max Meal Budget
                                            </label>
                                            <span className="font-bold text-emerald-500">₹{budget}</span>
                                        </div>
                                        <Slider value={[budget]} min={50} max={2000} step={50} onValueChange={(v) => setBudget(v[0])} />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <Flame className="w-4 h-4 text-orange-500" />
                                                Max Calories
                                            </label>
                                            <span className="font-bold text-orange-500">{maxCalories} kcal</span>
                                        </div>
                                        <Slider value={[maxCalories]} min={50} max={1000} step={50} onValueChange={(v) => setMaxCalories(v[0])} />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-blue-500" />
                                                Min Protein
                                            </label>
                                            <span className="font-bold text-blue-500">{minProtein}g</span>
                                        </div>
                                        <Slider value={[minProtein]} min={0} max={100} step={5} onValueChange={(v) => setMinProtein(v[0])} />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-muted-foreground">Dietary Preferences (Optional)</label>
                                        <Input placeholder="e.g. Vegan, Keto" value={dietary} onChange={(e) => setDietary(e.target.value)} className="bg-secondary/50" />
                                    </div>

                                    <Button onClick={handleSearch} disabled={loading} className="w-full font-bold h-12 text-md shadow-lg">
                                        {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                                        {loading ? "Searching Local Menus..." : "Find Meals"}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Results Column */}
                            <div className="space-y-4">
                                {meals.length === 0 && !loading && (
                                    <div className="text-center p-12 bg-secondary/30 rounded-2xl border-2 border-dashed border-border/60">
                                        <Utensils className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                                        <h3 className="text-xl font-medium text-foreground mb-2">Ready to discover hidden gems?</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Enter your city and macro goals to uncover the best healthy food steals around you.
                                        </p>
                                    </div>
                                )}

                                {meals.map((meal, index) => (
                                    <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="bg-primary/10 sm:w-48 p-6 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-border">
                                                <Utensils className="w-8 h-8 text-primary mb-2" />
                                                <h3 className="font-bold text-lg leading-tight">{meal.restaurant}</h3>
                                            </div>
                                            <div className="p-6 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="text-xl font-bold">{meal.item}</h4>
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg whitespace-nowrap">
                                                            {typeof meal.price === 'number' ? `₹${meal.price.toFixed(2)}` : meal.price}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{meal.description}</p>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/50 mt-auto">
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-muted-foreground font-semibold">CALORIES</span>
                                                            <span className="font-bold text-orange-500">{meal.calories}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-muted-foreground font-semibold">PROTEIN</span>
                                                            <span className="font-bold text-blue-500">{meal.protein}g</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-muted-foreground font-semibold">CARBS</span>
                                                            <span className="font-bold">{meal.carbs}g</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-muted-foreground font-semibold">FAT</span>
                                                            <span className="font-bold">{meal.fat}g</span>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" className="rounded-full shadow-sm hover:scale-105 transition-transform" onClick={() => handleLogMeal(meal)}>
                                                        <Plus className="w-4 h-4 mr-1" /> Log to Diary
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="groceries" className="m-0 focus-visible:outline-none">
                        <div className="grid md:grid-cols-[350px_1fr] gap-6 items-start">
                            {/* Grocery Filters Column */}
                            <Card className="shadow-lg border-emerald-500/20 sticky top-20">
                                <CardHeader className="bg-emerald-500/5 pb-4 border-b border-border/50">
                                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                                        <Briefcase className="w-5 h-5" />
                                        Weekly Constraint Setup
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                Weekly Grocery Budget
                                            </label>
                                            <span className="font-bold text-emerald-500">₹{weeklyBudget}</span>
                                        </div>
                                        <Slider value={[weeklyBudget]} min={500} max={15000} step={500} onValueChange={(v) => setWeeklyBudget(v[0])} />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-blue-500" />
                                                Daily Minimum Protein
                                            </label>
                                            <span className="font-bold text-blue-500">{groceryProtein}g</span>
                                        </div>
                                        <Slider value={[groceryProtein]} min={50} max={300} step={10} onValueChange={(v) => setGroceryProtein(v[0])} />
                                    </div>
                                    
                                    <div className="bg-secondary/30 rounded-lg p-4 border border-border/50 space-y-3">
                                        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-primary">
                                            <Settings2 className="w-4 h-4" />
                                            Auto-Synced Profile Limits
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                                    <Flame className="w-3 h-3 text-orange-500" /> CALORIES
                                                </span>
                                                <span className="font-bold text-md">{groceryCalories} k</span>
                                            </div>
                                            <div className="flex flex-col border-l border-border pl-2">
                                                <span className="text-xs text-muted-foreground font-semibold">CARBS MAX</span>
                                                <span className="font-bold text-md">{groceryCarbs}g</span>
                                            </div>
                                            <div className="flex flex-col border-l border-border pl-2">
                                                <span className="text-xs text-muted-foreground font-semibold">FAT MAX</span>
                                                <span className="font-bold text-md">{groceryFat}g</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-muted-foreground">Dietary Preferences</label>
                                        <Input placeholder="e.g. Vegan, Keto, No Seafood" value={dietary} onChange={(e) => setDietary(e.target.value)} className="bg-secondary/50" />
                                    </div>

                                    <Button onClick={handleGenerateGrocery} disabled={groceryLoading} className="w-full font-bold h-12 text-md shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {groceryLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                                        {groceryLoading ? "Running AI Optimizer..." : "Generate Smart List"}
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Grocery List Output Column */}
                            <div className="space-y-4">
                                {!groceryList && !groceryLoading && (
                                    <div className="text-center p-12 bg-secondary/30 rounded-2xl border-2 border-dashed border-border/60">
                                        <ShoppingCart className="w-12 h-12 mx-auto text-emerald-500/50 mb-4" />
                                        <h3 className="text-xl font-medium text-foreground mb-2">Empty Cart</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Set your constraints and let the Linear Programming AI optimize your perfect weekly grocery list to hit those macros strictly under budget.
                                        </p>
                                    </div>
                                )}

                                {groceryList && (
                                    <div className="animate-fade-in space-y-4">
                                        {/* Status Card */}
                                        <Card className="border-emerald-500/30 shadow-md">
                                            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center justify-between bg-emerald-500/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-xl text-foreground">AI Optimization Complete</h3>
                                                        <p className="text-muted-foreground text-sm mt-1 max-w-md">{groceryList.strategy_summary}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Estimated Total List Cost</p>
                                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹{groceryList.total_estimated_cost}</p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* List mapping */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                            {groceryList.items && [...groceryList.items].sort((a: any, b: any) => {
                                                const order: Record<string, number> = { "Protein": 1, "Carbs": 2, "Fat": 3, "Micros": 4 };
                                                return (order[a.macro_focus] || 5) - (order[b.macro_focus] || 5);
                                            }).map((item: any, idx: number) => (
                                                <Card key={idx} className="hover:shadow-md transition-shadow">
                                                    <CardContent className="p-5 flex flex-col h-full justify-between">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                                    {item.category}
                                                                </span>
                                                                <span className="text-xs font-semibold text-primary">{item.macro_focus}</span>
                                                            </div>
                                                            <h4 className="font-bold text-md leading-tight">{item.name}</h4>
                                                        </div>
                                                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                                                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                                                ₹{typeof item.estimated_price === 'number' ? item.estimated_price.toFixed(2) : item.estimated_price}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
