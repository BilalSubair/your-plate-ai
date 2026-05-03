import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { LogoLoader } from "@/components/LogoLoader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Plus,
  Search,
  Clock,
  Flame,
  Utensils,
  ImageIcon,
  Sparkles,
  X,
  Check,
  Loader2,
  Trash2,
  Pencil,
  RefreshCw,
  Settings2,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { foodApi, goalsApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Zap, Wheat, Info, ChevronRight, Target } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import confetti from "canvas-confetti";
import { useLocation } from "react-router-dom";

interface FoodEntry {
  id: number | string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type?: string;
  servings?: number;
  logged_at?: string;
  image?: string;
}

interface FavoriteFood {
  id: number | string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodLogProps {
  isModal?: boolean;
  defaultMealType?: string;
  onLogSuccess?: () => void;
}

const FoodLog = ({ isModal = false, defaultMealType, onLogSuccess }: FoodLogProps = {}) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || "manual");

  // 3D Tilt Logic for Showcase Mode
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-100, 100], [15, -15]);
  const rotateY = useTransform(mouseX, [-100, 100], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const resetMouse = () => {
    mouseX.set(0);
    mouseY.set(0);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FavoriteFood | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiFoods, setAiFoods] = useState<any[]>([]);
  const [aiPlateNutrition, setAiPlateNutrition] = useState<any>(null);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [mealType, setMealType] = useState(defaultMealType || "snack");

  // API state
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [isCheatMeal, setIsCheatMeal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");

  const [searchResults, setSearchResults] = useState<FavoriteFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, favRes, goalsRes] = await Promise.all([
        foodApi.getToday(),
        foodApi.getFavorites(),
        goalsApi.getGoals(),
      ]);
      
      if (goalsRes.ok) {
        const g = await goalsRes.json();
        setTargetCalories(g.effective_daily_calories ?? g.daily_calories);
      }

      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayEntries(Array.isArray(data) ? data : data.results || []);
      }
      if (favRes.ok) {
        const data = await favRes.json();
        setFavorites(Array.isArray(data) ? data : data.results || []);
      }
    } catch {
      // API not reachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (defaultMealType) {
      setMealType(defaultMealType);
    }
  }, [defaultMealType]);

  // Sync tab from navigation state or query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.search, location.state]);

  // Debounce the raw search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const res = await foodApi.searchFood(debouncedQuery);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleLogFood = async () => {
    if (!selectedFood) return;
    setLogging(true);
    try {
      const servings = parseFloat(quantity) || 1;
      const res = await foodApi.logEntry({
        name: selectedFood.name,
        calories: selectedFood.calories * servings,
        protein: selectedFood.protein * servings,
        carbs: selectedFood.carbs * servings,
        fat: selectedFood.fat * servings,
        servings,
        meal_type: mealType,
      });
      if (res.ok) {
        if (isCheatMeal) {
          await goalsApi.consumeCheatMeal({ name: selectedFood.name, calories: selectedFood.calories * servings });
        }
        toast.success(`Logged ${selectedFood.name}`, {
          description: `${Math.round(selectedFood.calories * servings)} kcal added${isCheatMeal ? ' (Deducted from Cravings Bank)' : ''}`,
        });
        setSelectedFood(null);
        setQuantity("1");
        setIsCheatMeal(false);
        fetchData();
        if (onLogSuccess) onLogSuccess();
      } else {
        toast.error("Failed to log food");
      }
    } catch {
      toast.error("Could not connect to server");
    } finally {
      setLogging(false);
    }
  };

  const handleLogAiFood = async () => {
    if (aiFoods.length === 0) return;
    setLogging(true);
    try {
      for (const item of aiFoods) {
        await foodApi.logEntry({
          name: item.name,
          calories: item.nutrition.calories,
          protein: item.nutrition.protein,
          carbs: item.nutrition.carbs,
          fat: item.nutrition.fat,
          meal_type: mealType,
        });
        
        if (isCheatMeal) {
          await goalsApi.consumeCheatMeal({ name: item.name, calories: item.nutrition.calories });
        }
      }
      
      toast.success(`Logged ${aiFoods.length} items`, {
        description: `${Math.round(aiPlateNutrition.calories)} kcal added to your log${isCheatMeal ? ' (Deducted from Bank)' : ''}`,
      });
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });
      
      setCapturedImage(null);
      setAiFoods([]);
      setAiPlateNutrition(null);
      setIsCheatMeal(false);
      fetchData();
      if (onLogSuccess) onLogSuccess();
    } catch {
      toast.error("Could not connect to server");
    } finally {
      setLogging(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string;
      setCapturedImage(base64Str);
      setIsCapturing(false);
      setAiAnalyzing(true);

      try {
        const res = await foodApi.analyzePlate(base64Str);
        if (res.ok) {
          const data = await res.json();
          if (data.foods && data.foods.length > 0) {
            const enriched = data.foods.map((f: any) => ({
              ...f,
              baseNutrition: {
                calories: f.nutrition.calories / (f.grams || 1),
                protein: f.nutrition.protein / (f.grams || 1),
                carbs: f.nutrition.carbs / (f.grams || 1),
                fat: f.nutrition.fat / (f.grams || 1),
              }
            }));
            setAiFoods(enriched);
            setAiPlateNutrition(data.total_nutrition);
            setShowAiDetails(false); // Default to summary view
          } else {
            toast.error("Could not find any food in the image.");
          }
        } else {
          const errBase = await res.json().catch(() => ({}));
          toast.error(errBase.error || "Failed to analyze photo");
        }
      } catch (err) {
        toast.error("Network error while analyzing photo");
      } finally {
        setAiAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetPhoto = () => {
    setCapturedImage(null);
    setAiFoods([]);
    setAiPlateNutrition(null);
    setAiAnalyzing(false);
    setShowAiDetails(false);
  };

  const handleDeleteEntry = async (entry: FoodEntry) => {
    try {
      const res = await foodApi.deleteEntry(Number(entry.id));
      if (res.ok || res.status === 204) {
        toast.success(`Deleted ${entry.name}`);
        fetchData();
      } else {
        toast.error("Failed to delete entry");
      }
    } catch {
      toast.error("Could not connect to server");
    }
  };

  const startEditing = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditCalories(String(entry.calories));
    setEditProtein(String(entry.protein));
    setEditCarbs(String(entry.carbs));
    setEditFat(String(entry.fat));
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    setLogging(true);
    try {
      const res = await foodApi.updateEntry(Number(editingEntry.id), {
        calories: parseFloat(editCalories) || 0,
        protein: parseFloat(editProtein) || 0,
        carbs: parseFloat(editCarbs) || 0,
        fat: parseFloat(editFat) || 0,
      });
      if (res.ok) {
        toast.success(`Updated ${editingEntry.name}`);
        setEditingEntry(null);
        fetchData();
      } else {
        toast.error("Failed to update entry");
      }
    } catch {
      toast.error("Could not connect to server");
    } finally {
      setLogging(false);
    }
  };

  const displayFoods = searchQuery ? searchResults : favorites;

  return (
    <div className={isModal ? "" : "min-h-screen bg-background pb-24 md:pb-8"}>
      {!isModal && <Header />}

      <main className={isModal ? "space-y-4" : "container px-4 py-6 space-y-6"}>
        {!isModal && (
          <section className="animate-slide-up">
            <h1 className="text-2xl font-bold text-foreground">Log Food</h1>
            <p className="text-muted-foreground mt-1">Track what you eat manually or with AI</p>
          </section>
        )}

        {/* Today's summary */}
        {todayEntries.length > 0 && !isModal && (
          <Card variant="glass" className="animate-slide-up">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Today's Log ({todayEntries.length} entries)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-accent">
                    {Math.round(todayEntries.reduce((s, e) => s + e.calories, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">
                    {Math.round(todayEntries.reduce((s, e) => s + e.protein, 0))}g
                  </p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">
                    {Math.round(todayEntries.reduce((s, e) => s + e.carbs, 0))}g
                  </p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warning">
                    {Math.round(todayEntries.reduce((s, e) => s + e.fat, 0))}g
                  </p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>

              {/* Entry list with edit/delete */}
              <div className="space-y-2 border-t border-border pt-3">
                {todayEntries.map((entry) => (
                  <div key={entry.id}>
                    {editingEntry?.id === entry.id ? (
                      <div className="p-3 rounded-lg bg-secondary/50 space-y-3 animate-scale-in">
                        <p className="font-medium text-foreground text-sm">{entry.name}</p>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Calories</Label>
                            <Input type="number" value={editCalories} onChange={(e) => setEditCalories(e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Protein</Label>
                            <Input type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Carbs</Label>
                            <Input type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Fat</Label>
                            <Input type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>Cancel</Button>
                          <Button size="sm" className="flex-1 gap-1" onClick={handleUpdateEntry} disabled={logging}>
                            {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                            <Utensils className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">
                              P:{Math.round(entry.protein)}g • C:{Math.round(entry.carbs)}g • F:{Math.round(entry.fat)}g
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-accent mr-2">{Math.round(entry.calories)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditing(entry)}>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteEntry(entry)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up stagger-1">
        <AnimatePresence>
          {!capturedImage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="gap-2">
                  <Utensils className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="photo" className="gap-2">
                  <Camera className="w-4 h-4" />
                  Food Identification
                </TabsTrigger>
              </TabsList>
            </motion.div>
          )}
        </AnimatePresence>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search favorites..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Selected Food Card */}
            {selectedFood && (
              <Card variant="elevated" className="animate-scale-in border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedFood.name}</h3>
                      <p className="text-sm text-muted-foreground">per serving</p>
                    </div>
                      <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedFood(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-accent/10">
                      <p className="text-lg font-bold text-accent">{Math.round(selectedFood.calories * parseFloat(quantity || "1"))}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-primary/10">
                      <p className="text-lg font-bold text-primary">{Math.round(selectedFood.protein * parseFloat(quantity || "1"))}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-primary/10">
                      <p className="text-lg font-bold text-primary">{Math.round(selectedFood.carbs * parseFloat(quantity || "1"))}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-warning/10">
                      <p className="text-lg font-bold text-warning">{Math.round(selectedFood.fat * parseFloat(quantity || "1"))}g</p>
                      <p className="text-xs text-muted-foreground">Fat</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="quantity" className="text-xs text-muted-foreground">Servings</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Meal</Label>
                      <Select value={mealType} onValueChange={setMealType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select meal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg mt-4 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2 text-destructive">
                      <Flame className="w-4 h-4" />
                      Use Cheat Meal Allowance
                    </Label>
                      <p className="text-[10px] text-muted-foreground">Deduct from Cravings Bank</p>
                    </div>
                    <Switch checked={isCheatMeal} onCheckedChange={setIsCheatMeal} />
                  </div>
                  <Button
                    className="w-full mt-4 gap-2 hover-glow"
                    onClick={handleLogFood}
                    disabled={logging}
                  >
                    {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Log Food
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Favorites / Search Results */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {searchQuery ? "Search Results" : "Favorite Foods"}
              </h3>

              {loading || isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <LogoLoader size="sm" />
                </div>
              ) : displayFoods.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {searchQuery ? "No matching results found" : "No favorites yet. Add some below!"}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {displayFoods.map((food, index) => (
                    <Card
                      key={food.id}
                      className={`hover-lift cursor-pointer transition-all ${selectedFood?.id === food.id ? 'ring-2 ring-primary' : ''}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => setSelectedFood(food)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <Utensils className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{food.name}</p>
                            <p className="text-xs text-muted-foreground">
                              P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-accent">{food.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Add Custom Food */}
            {editingEntry?.id === -1 ? (
              <div className="p-4 rounded-lg bg-secondary/30 space-y-4 animate-scale-in">
                <p className="font-medium text-foreground">Add Custom Food</p>
                <Input placeholder="Food Name" value={selectedFood?.name || ""} onChange={(e) => setSelectedFood({ ...selectedFood, id: Date.now(), name: e.target.value, calories: selectedFood?.calories || 0, protein: selectedFood?.protein || 0, carbs: selectedFood?.carbs || 0, fat: selectedFood?.fat || 0 })} />
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Calories</Label>
                    <Input type="number" placeholder="kcal" onChange={(e) => setSelectedFood(prev => prev ? { ...prev, calories: parseFloat(e.target.value) || 0 } : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Protein</Label>
                    <Input type="number" placeholder="g" onChange={(e) => setSelectedFood(prev => prev ? { ...prev, protein: parseFloat(e.target.value) || 0 } : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Carbs</Label>
                    <Input type="number" placeholder="g" onChange={(e) => setSelectedFood(prev => prev ? { ...prev, carbs: parseFloat(e.target.value) || 0 } : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Fat</Label>
                    <Input type="number" placeholder="g" onChange={(e) => setSelectedFood(prev => prev ? { ...prev, fat: parseFloat(e.target.value) || 0 } : null)} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="text-[10px] text-muted-foreground">Meal Category</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="Select meal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg mb-4 border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2 text-destructive">
                      <Flame className="w-4 h-4" />
                      Use Cheat Meal Allowance
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Deduct from Cravings Bank</p>
                  </div>
                  <Switch checked={isCheatMeal} onCheckedChange={setIsCheatMeal} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingEntry(null); setSelectedFood(null); }}>Cancel</Button>
                  <Button size="sm" className="flex-1 gap-1" onClick={() => { handleLogFood(); setEditingEntry(null); }} disabled={logging || !selectedFood?.name}>
                    {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Log It
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => {
                setEditingEntry({ id: -1, name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
                setSelectedFood({ id: Date.now(), name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
              }}>
                <Plus className="w-4 h-4" />
                Add Custom Food
              </Button>
            )}
          </TabsContent>


          <TabsContent value="photo" className="space-y-4 mt-4">
            {!capturedImage ? (
              <Card variant="elevated" className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-muted flex flex-col items-center justify-center relative">
                    {isCapturing ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <p className="text-muted-foreground">Capturing...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-4 animate-pulse-ring">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4">Take a photo of your food</p>
                        <div className="flex gap-3">
                          <Button onClick={() => document.getElementById('cameraInput')?.click()} className="gap-2 hover-glow">
                            <Camera className="w-4 h-4" />
                            Take Photo
                          </Button>
                          <Button variant="outline" className="gap-2" onClick={() => document.getElementById('cameraInput')?.click()}>
                            <ImageIcon className="w-4 h-4" />
                            Upload
                          </Button>
                          <input
                            id="cameraInput"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handlePhotoCapture}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card variant="elevated" className="overflow-hidden animate-bounce-in">
                  <CardContent className="p-0 relative">
                    <img src={capturedImage} alt="Captured food" className="w-full h-auto block rounded-xl shadow-inner bg-secondary/10 min-h-[300px] object-contain" />
                    

                    <Button variant="secondary" size="icon" className="absolute top-3 right-3 z-10" onClick={resetPhoto}>
                      <X className="w-4 h-4" />
                    </Button>
                    {aiAnalyzing && (
                      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex flex-col items-center justify-center overflow-hidden rounded-xl">
                        {/* Futuristic Scanning Line */}
                        <motion.div
                          initial={{ top: "-10%" }}
                          animate={{ top: "110%" }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1.5, 
                            ease: "easeInOut" 
                          }}
                          className="absolute left-0 right-0 h-1 z-30 flex items-center justify-center"
                        >
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
                          <div className="absolute inset-0 bg-primary/40 blur-md h-4" />
                        </motion.div>

                        {/* Particle effects or pulse */}
                        <motion.div 
                          animate={{ opacity: [0.2, 0.4, 0.2] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]" 
                        />

                        <div className="relative z-40 flex flex-col items-center">
                          <div className="relative mb-6">
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -inset-8 bg-primary/20 blur-2xl rounded-full"
                            />
                            <Sparkles className="w-16 h-16 text-primary animate-pulse relative z-10" />
                            
                            {/* Rotating Perception Rings */}
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                              className="absolute -inset-6 border-2 border-dashed border-primary/40 rounded-full"
                            />
                            <motion.div 
                              animate={{ rotate: -360 }}
                              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                              className="absolute -inset-10 border border-primary/10 rounded-full border-t-primary/60 border-b-primary/60"
                            />
                          </div>
                          
                          <p className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground tracking-tighter uppercase mb-2">
                            Food Identification
                          </p>
                          <p className="text-[10px] text-primary/60 font-mono tracking-widest uppercase">
                            Food Identification in Progress...
                          </p>
                          
                          <div className="flex gap-2 mt-6">
                            {[0, 1, 2, 3].map((i) => (
                              <motion.div 
                                key={i}
                                animate={{ 
                                  height: [12, 24, 12],
                                  backgroundColor: i % 2 === 0 ? "var(--primary)" : "var(--emerald-500)"
                                }}
                                transition={{ 
                                  repeat: Infinity, 
                                  duration: 1, 
                                  delay: i * 0.1 
                                }}
                                className="w-1.5 rounded-full opacity-80" 
                              />
                            ))}
                          </div>
                        </div>

                        {/* Digital Grid Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {aiFoods.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        <h3 className="text-lg font-bold">
                          {showAiDetails ? "Edit Plate Details" : "Plate Summary"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {!showAiDetails && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-primary/10 text-primary hover:bg-primary/20 gap-1.5 h-8 animate-in fade-in zoom-in"
                            onClick={() => setShowAiDetails(true)}
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Edit Dishes
                          </Button>
                        )}
                        {showAiDetails && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="text-muted-foreground hover:text-primary gap-1.5 h-8 animate-in fade-in zoom-in"
                             onClick={() => setShowAiDetails(false)}
                           >
                             <ArrowLeft className="w-3.5 h-3.5" />
                             Summary
                           </Button>
                        )}
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 animate-pulse text-[10px]">
                          Live Macro Sync
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence mode="wait">
                        {!showAiDetails ? (
                          <motion.div
                            key="summary"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-4"
                          >
                            <motion.div
                              className="w-full"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <Card className="border-white/20 bg-secondary/20 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden group relative border-t-white/30 border-l-white/20">
                              {/* Animated Mesh Gradient Background */}
                              <div className="absolute inset-0 opacity-20 pointer-events-none">
                                <motion.div 
                                  animate={{ 
                                    scale: [1, 1.2, 1],
                                    x: [0, 10, 0],
                                    y: [0, -10, 0]
                                  }}
                                  transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                                  className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/30 blur-[100px] rounded-full"
                                />
                                <motion.div 
                                  animate={{ 
                                    scale: [1.2, 1, 1.2],
                                    x: [0, -10, 0],
                                    y: [0, 10, 0]
                                  }}
                                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                                  className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-emerald-500/20 blur-[100px] rounded-full"
                                />
                              </div>

                              <CardContent className="p-5 space-y-4 relative z-10">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-primary uppercase font-black tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                    AI Perception Results
                                  </span>
                                  <p className="text-xl font-black text-foreground capitalize leading-none tracking-tight">
                                    {aiFoods.map(f => f.name).join(", ")}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/5">
                                  {[
                                    { label: 'kcal', val: Math.round(aiPlateNutrition?.calories), color: 'text-orange-500' },
                                    { label: 'Prot', val: Math.round(aiPlateNutrition?.protein), unit: 'g', color: 'text-blue-500' },
                                    { label: 'Carbs', val: Math.round(aiPlateNutrition?.carbs), unit: 'g', color: 'text-emerald-500' },
                                    { label: 'Fat', val: Math.round(aiPlateNutrition?.fat), unit: 'g', color: 'text-yellow-500' }
                                  ].map((stat, i) => (
                                    <div key={i} className="text-center group/stat">
                                      <motion.p 
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        className={`text-base font-black ${stat.color} leading-none mb-1`}
                                      >
                                        {stat.val}{stat.unit || ''}
                                      </motion.p>
                                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 group-hover/stat:opacity-100 transition-opacity">
                                        {stat.label}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                              
                              {/* Bottom Glow Bar */}
                              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                            </Card>
                          </motion.div>

                          {/* Showcase Energy Orbs */}
                          <div className="flex justify-center gap-6 py-4">
                            {[
                              { label: 'Protein', color: 'bg-blue-500', val: Math.round(aiPlateNutrition?.protein), icon: Dumbbell },
                              { label: 'Carbs', color: 'bg-emerald-500', val: Math.round(aiPlateNutrition?.carbs), icon: Wheat },
                              { label: 'Fat', color: 'bg-yellow-500', val: Math.round(aiPlateNutrition?.fat), icon: Zap }
                            ].map((orb, i) => (
                              <motion.div
                                key={i}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="flex flex-col items-center gap-2"
                              >
                                <div className="relative">
                                  <motion.div 
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 3, delay: i * 0.5 }}
                                    className={`absolute -inset-2 ${orb.color} blur-lg rounded-full`}
                                  />
                                  <div className={`w-12 h-12 rounded-full ${orb.color} flex items-center justify-center relative z-10 shadow-lg border border-white/20`}>
                                    <orb.icon className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-black text-foreground leading-none">{orb.val}g</p>
                                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{orb.label}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                          <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-3"
                          >
                            <AnimatePresence>
                              {aiFoods.map((item, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ 
                                      duration: 0.4, 
                                      delay: index * 0.1,
                                      type: "spring",
                                      stiffness: 100
                                    }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Card 
                                      className="overflow-hidden border transition-all duration-300 shadow-xl group border-white/10 bg-secondary/40 backdrop-blur-xl relative"
                                    >
                                      {/* Subtle Corner Glow */}
                                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors" />
                                      
                                      <CardContent className="p-4 space-y-4 relative z-10">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 space-y-1">
                                            <label className="text-[9px] font-black text-primary uppercase tracking-widest opacity-70">Dish Name</label>
                                            <input 
                                              type="text" 
                                              value={item.name}
                                              onChange={(e) => {
                                                const updated = [...aiFoods];
                                                updated[index].name = e.target.value;
                                                setAiFoods(updated);
                                              }}
                                              className="bg-transparent border-0 border-b border-primary/20 hover:border-primary/50 focus:border-primary font-black text-lg text-foreground capitalize outline-none w-full transition-all"
                                            />
                                          </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            onClick={async (e) => {
                                              const btn = e.currentTarget;
                                              btn.classList.add("animate-spin");
                                              try {
                                                const res = await foodApi.quickNutritionLookup(`${item.grams}g ${item.name}`);
                                                if (res.ok) {
                                                  const nutrition = await res.json();
                                                  const updated = [...aiFoods];
                                                  updated[index].nutrition = nutrition;
                                                  updated[index].baseNutrition = {
                                                    calories: nutrition.calories / (item.grams || 1),
                                                    protein: nutrition.protein / (item.grams || 1),
                                                    carbs: nutrition.carbs / (item.grams || 1),
                                                    fat: nutrition.fat / (item.grams || 1),
                                                  };
                                                  setAiFoods(updated);
                                                  
                                                  const newTotal = updated.reduce((acc, f) => ({
                                                    calories: acc.calories + f.nutrition.calories,
                                                    protein: acc.protein + f.nutrition.protein,
                                                    carbs: acc.carbs + f.nutrition.carbs,
                                                    fat: acc.fat + f.nutrition.fat,
                                                  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
                                                  setAiPlateNutrition(newTotal);
                                                  toast.success(`Updated ${item.name}`);
                                                }
                                              } finally {
                                                btn.classList.remove("animate-spin");
                                              }
                                            }}
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => {
                                              const updated = aiFoods.filter((_, i) => i !== index);
                                              setAiFoods(updated);
                                              if (updated.length > 0) {
                                                const newTotal = updated.reduce((acc, f) => ({
                                                  calories: acc.calories + f.nutrition.calories,
                                                  protein: acc.protein + f.nutrition.protein,
                                                  carbs: acc.carbs + f.nutrition.carbs,
                                                  fat: acc.fat + f.nutrition.fat,
                                                }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
                                                setAiPlateNutrition(newTotal);
                                              } else {
                                                setAiPlateNutrition(null);
                                              }
                                            }}
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-2">
                                        <motion.div 
                                          whileHover={{ scale: 1.05 }}
                                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors"
                                        >
                                          <Flame className="w-3 h-3 text-orange-500 mb-1" />
                                          <span className="text-xs font-bold">{Math.round(item.nutrition.calories)}</span>
                                          <span className="text-[8px] text-muted-foreground uppercase">kcal</span>
                                        </motion.div>
                                        <motion.div 
                                          whileHover={{ scale: 1.05 }}
                                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors"
                                        >
                                          <Dumbbell className="w-3 h-3 text-blue-500 mb-1" />
                                          <span className="text-xs font-bold">{Math.round(item.nutrition.protein)}g</span>
                                          <span className="text-[8px] text-muted-foreground uppercase">Prot</span>
                                        </motion.div>
                                        <motion.div 
                                          whileHover={{ scale: 1.05 }}
                                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors"
                                        >
                                          <Wheat className="w-3 h-3 text-emerald-500 mb-1" />
                                          <span className="text-xs font-bold">{Math.round(item.nutrition.carbs)}g</span>
                                          <span className="text-[8px] text-muted-foreground uppercase">Carbs</span>
                                        </motion.div>
                                        <motion.div 
                                          whileHover={{ scale: 1.05 }}
                                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors"
                                        >
                                          <Zap className="w-3 h-3 text-yellow-500 mb-1" />
                                          <span className="text-xs font-bold">{Math.round(item.nutrition.fat)}g</span>
                                          <span className="text-[8px] text-muted-foreground uppercase">Fat</span>
                                        </motion.div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px]">
                                          <span className="text-muted-foreground">Portion Size</span>
                                          <span className="font-bold text-primary">{item.grams}g</span>
                                        </div>
                                        <Slider 
                                          value={[item.grams]} 
                                          max={1000} 
                                          step={5}
                                          onValueChange={([newGrams]) => {
                                            const updated = [...aiFoods];
                                            const currentItem = updated[index];
                                            updated[index].grams = newGrams;
                                            updated[index].nutrition = {
                                              calories: Math.round(currentItem.baseNutrition.calories * newGrams),
                                              protein: Math.round(currentItem.baseNutrition.protein * newGrams * 10) / 10,
                                              carbs: Math.round(currentItem.baseNutrition.carbs * newGrams * 10) / 10,
                                              fat: Math.round(currentItem.baseNutrition.fat * newGrams * 10) / 10,
                                            };
                                            setAiFoods(updated);
                                            
                                            const newTotal = updated.reduce((acc, f) => ({
                                              calories: acc.calories + f.nutrition.calories,
                                              protein: acc.protein + f.nutrition.protein,
                                              carbs: acc.carbs + f.nutrition.carbs,
                                              fat: acc.fat + f.nutrition.fat,
                                            }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
                                            setAiPlateNutrition(newTotal);
                                          }}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {aiPlateNutrition && showAiDetails && (
                      <Card className="border-primary/20 bg-primary shadow-lg text-primary-foreground animate-in fade-in slide-in-from-bottom-4">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider">Total Plate</h4>
                            <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Final Summary</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold">{Math.round(aiPlateNutrition.calories)}</p>
                              <p className="text-[8px] opacity-70 uppercase">kcal</p>
                            </div>
                            <div>
                              <p className="text-base font-bold">{Math.round(aiPlateNutrition.protein)}g</p>
                              <p className="text-[8px] opacity-70 uppercase">P</p>
                            </div>
                            <div>
                              <p className="text-base font-bold">{Math.round(aiPlateNutrition.carbs)}g</p>
                              <p className="text-[8px] opacity-70 uppercase">C</p>
                            </div>
                            <div>
                              <p className="text-base font-bold">{Math.round(aiPlateNutrition.fat)}g</p>
                              <p className="text-[8px] opacity-70 uppercase">F</p>
                            </div>
                          </div>
                          
                          {/* Liquid Progress Bar */}
                          <div className="mt-3 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (aiPlateNutrition.calories / targetCalories) * 100)}%` }}
                              className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                              transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium flex items-center gap-2 text-destructive">
                          <Flame className="w-4 h-4" />
                          Cheat Meal?
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Save to Cravings Bank</p>
                      </div>
                      <Switch checked={isCheatMeal} onCheckedChange={setIsCheatMeal} />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={resetPhoto}>Cancel</Button>
                      <Button className="flex-[2] gap-2 hover-glow shadow-lg shadow-primary/20" onClick={handleLogAiFood} disabled={logging || aiFoods.length === 0}>
                        {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirm & Log Plate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Card className="bg-secondary/30 border-secondary">
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Tips for best results
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Take photos in good lighting</li>
                  <li>• Include the entire plate in frame</li>
                  <li>• Avoid blurry or dark images</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {!isModal && <Navigation />}
    </div>
  );
};

export default FoodLog;
