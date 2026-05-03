import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChefHat,
  Search,
  Clock,
  Flame,
  Sparkles,
  Leaf,
  Heart,
  ArrowRight,
  Plus,
  X,
  RefreshCw,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { foodApi, goalsApi } from "@/lib/api";

interface Recipe {
  id: string;
  name: string;
  image: string;
  url?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  ingredientsList?: string[];
  instructions?: string[];
  isFavorite?: boolean;
}

const sampleRecipes: Recipe[] = [
  {
    id: "1",
    name: "Mediterranean Quinoa Bowl",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
    calories: 420,
    protein: 18,
    carbs: 52,
    fat: 16,
    time: "25 min",
    difficulty: "Easy",
    tags: ["High Protein", "Vegetarian", "Meal Prep"],
    ingredientsList: ["1/2 cup Quinoa", "1 cup Cherry Tomatoes", "1/2 Cucumber", "1/4 cup Feta Cheese", "2 tbsp Olive Oil"],
    instructions: ["Cook quinoa according to package directions.", "Chop cherry tomatoes and cucumber.", "Toss all ingredients together with olive oil and serve."],
  },
  {
    id: "2",
    name: "Grilled Salmon with Asparagus",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
    calories: 380,
    protein: 35,
    carbs: 12,
    fat: 22,
    time: "30 min",
    difficulty: "Medium",
    tags: ["High Protein", "Omega-3", "Low Carb"],
  },
  {
    id: "3",
    name: "Overnight Oats with Berries",
    image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400",
    calories: 320,
    protein: 12,
    carbs: 48,
    fat: 8,
    time: "5 min",
    difficulty: "Easy",
    tags: ["Breakfast", "High Fiber", "No Cook"],
  },
  {
    id: "4",
    name: "Chicken Stir Fry",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400",
    calories: 450,
    protein: 32,
    carbs: 35,
    fat: 18,
    time: "20 min",
    difficulty: "Easy",
    tags: ["High Protein", "Quick", "Family Friendly"],
  },
];

const calorieSwaps = [
  {
    original: "White Rice",
    swap: "Cauliflower Rice",
    saved: 150,
    calories: 25,
    protein: 2,
    carbs: 5,
    fat: 0
  },
  {
    original: "Pasta",
    swap: "Zucchini Noodles",
    saved: 180,
    calories: 20,
    protein: 1,
    carbs: 4,
    fat: 0
  },
  {
    original: "Potato Chips",
    swap: "Kale Chips",
    saved: 120,
    calories: 50,
    protein: 3,
    carbs: 6,
    fat: 2
  },
  {
    original: "Soda",
    swap: "Sparkling Water + Lime",
    saved: 140,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
];

const RecipeCard = memo(({ recipe, index, onClick, onToggleFavorite }: { recipe: Recipe, index: number, onClick: (r: Recipe) => void, onToggleFavorite: (id: string) => void }) => {
  return (
    <Card
      key={recipe.id}
      className="overflow-hidden hover-lift animate-slide-up cursor-pointer"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => onClick(recipe)}
    >
      <div className="relative">
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
        >
          <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-destructive text-destructive' : ''}`} />
        </Button>
        <Badge
          className="absolute bottom-2 left-2"
          variant={recipe.difficulty === 'Easy' ? 'default' : recipe.difficulty === 'Medium' ? 'secondary' : 'destructive'}
        >
          {recipe.difficulty}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-2">{recipe.name}</h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {recipe.time}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-accent" />
            {recipe.calories} kcal
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs mb-3">
          <span className="text-protein font-medium">P: {recipe.protein}g</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary font-medium">C: {recipe.carbs}g</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-warning font-medium">F: {recipe.fat}g</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {(recipe.tags || []).slice(0, 3).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const Recipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(["chicken", "rice", "broccoli"]);
  const [newIngredient, setNewIngredient] = useState("");
  const [recipes, setRecipes] = useState(sampleRecipes);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mealType, setMealType] = useState<string>("all-meals");
  const [cuisineType, setCuisineType] = useState<string>("all-cuisines");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [swapQuery, setSwapQuery] = useState("");
  const [swaps, setSwaps] = useState<any[]>(calorieSwaps);
  const [isGeneratingSwaps, setIsGeneratingSwaps] = useState(false);

  const [isLogging, setIsLogging] = useState<string | null>(null);
  const [isCheatMeal, setIsCheatMeal] = useState(false);
  const [swapCheatMeals, setSwapCheatMeals] = useState<Record<string, boolean>>({});

  const addIngredient = useCallback(() => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.toLowerCase())) {
      setIngredients(prev => [...prev, newIngredient.toLowerCase()]);
      setNewIngredient("");
    }
  }, [newIngredient, ingredients]);

  const removeIngredient = useCallback((ingredient: string) => {
    setIngredients(prev => prev.filter(i => i !== ingredient));
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setRecipes(sampleRecipes);
      return;
    }

    setIsSearching(true);
    try {
      const res = await foodApi.searchRecipes(query, {
        mealType: mealType !== "all-meals" ? mealType : undefined,
        cuisineType: cuisineType !== "all-cuisines" ? cuisineType : undefined
      });
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Edamam Error: ${errData.error || res.statusText || res.status}`);
      }
    } catch (err: any) {
      toast.error(`Technical error: ${err.message || "Connection failed"}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce the raw search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery) {
      handleSearch(debouncedQuery);
    } else if (searchQuery === "") {
      setRecipes(sampleRecipes);
    }
  }, [debouncedQuery, mealType, cuisineType]);

  const generateRecipes = async () => {
    setIsGenerating(true);
    toast.loading("AI is analyzing your ingredients...");
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      toast.dismiss();
      toast.error("Groq API key is missing. Please configuration your environment.");
      setIsGenerating(false);
      return;
    }

    try {
      const { generateRecipesWithGroq } = await import("@/lib/aiAnalyzer");
      const generated = await generateRecipesWithGroq(ingredients, apiKey);
      if (generated && generated.length > 0) {
        setRecipes([...generated, ...recipes]);
        setActiveTab("discover");
        toast.dismiss();
        toast.success(`Successfully generated ${generated.length} custom recipes!`);
      } else {
        toast.dismiss();
        toast.error("AI couldn't generate recipes. Try adding different ingredients.");
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("An error occurred while generating recipes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSwaps = async () => {
    if (!swapQuery.trim()) return;

    setIsGeneratingSwaps(true);
    toast.loading(`Finding healthier alternatives for ${swapQuery}...`);
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      toast.dismiss();
      toast.error("Groq API key is missing. Please check your configuration.");
      setIsGeneratingSwaps(false);
      return;
    }

    try {
      const { generateCalorieSwapsWithGroq } = await import("@/lib/aiAnalyzer");
      const generated = await generateCalorieSwapsWithGroq(swapQuery, apiKey);
      if (generated && generated.length > 0) {
        setSwaps(generated);
        toast.dismiss();
        toast.success("Found some smart swaps!");
        setSwapQuery("");
      } else {
        toast.dismiss();
        toast.error("AI couldn't generate swaps. Try a different food.");
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("An error occurred while hunting for swaps.");
    } finally {
      setIsGeneratingSwaps(false);
    }
  };

  const toggleFavorite = useCallback((id: string) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      toast(recipe.isFavorite ? "Removed from favorites" : "Added to favorites");
    }
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return (recipes || []).filter(recipe => {
      if (!recipe) return false;
      const nameMatch = (recipe.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const tagMatch = (recipe.tags || []).some(tag => (tag || "").toLowerCase().includes(searchQuery.toLowerCase()));
      return nameMatch || tagMatch;
    });
  }, [recipes, searchQuery]);

  const handleLogItem = async (type: 'swap' | 'recipe', name: string, calories: number, protein: number, carbs: number, fat: number, useCheatAllowance: boolean = false) => {
    setIsLogging(name);
    try {
      const res = await foodApi.logEntry({
        name,
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        meal_type: type === 'recipe' ? "lunch" : "snack",
      });
      if (res.ok) {
        if (useCheatAllowance) {
          await goalsApi.consumeCheatMeal({ name, calories: calories || 0 });
        }
        toast.success(`Successfully logged ${name} to your dashboard!`, {
          description: useCheatAllowance ? 'Deducted from Cravings Bank' : '',
        });
        if (type === 'recipe') setIsCheatMeal(false);
        if (type === 'recipe') {
          setSelectedRecipe(null);
        }
      } else {
        toast.error("Failed to log entry to dashboard.");
      }
    } catch {
      toast.error("Network error while trying to log item.");
    } finally {
      setIsLogging(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">Meal Discovery</h1>
          <p className="text-muted-foreground mt-1">Find recipes and healthy swaps</p>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up stagger-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="ingredients">My Ingredients</TabsTrigger>
            <TabsTrigger value="swaps">Calorie Swaps</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search recipes, tags..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Select value={cuisineType} onValueChange={setCuisineType}>
                <SelectTrigger className="w-[120px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-cuisines">All Cuisines</SelectItem>
                  <SelectItem value="american">American</SelectItem>
                  <SelectItem value="asian">Asian</SelectItem>
                  <SelectItem value="british">British</SelectItem>
                  <SelectItem value="caribbean">Caribbean</SelectItem>
                  <SelectItem value="central europe">Central Europe</SelectItem>
                  <SelectItem value="chinese">Chinese</SelectItem>
                  <SelectItem value="eastern europe">Eastern Europe</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="indian">Indian</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="kosher">Kosher</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                  <SelectItem value="mexican">Mexican</SelectItem>
                  <SelectItem value="middle eastern">Middle Eastern</SelectItem>
                  <SelectItem value="nordic">Nordic</SelectItem>
                  <SelectItem value="south american">South American</SelectItem>
                  <SelectItem value="south east asian">South East Asian</SelectItem>
                </SelectContent>
              </Select>

              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="w-[120px] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Meal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-meals">All Meals</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="teatime">Teatime</SelectItem>
                </SelectContent>
              </Select>

              {(cuisineType !== "all-cuisines" || mealType !== "all-meals") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => { setCuisineType("all-cuisines"); setMealType("all-meals"); }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={index}
                  onClick={setSelectedRecipe}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4 mt-4">
            {/* Add Ingredient */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="w-5 h-5 text-primary" />
                  What's in your kitchen?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an ingredient..."
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  />
                  <Button onClick={addIngredient} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ingredients.map(ingredient => (
                    <Badge
                      key={ingredient}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1"
                    >
                      {ingredient}
                      <button
                        onClick={() => removeIngredient(ingredient)}
                        className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full gap-2 hover-glow"
                  onClick={generateRecipes}
                  disabled={ingredients.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Find Recipes with These Ingredients
                </Button>
              </CardContent>
            </Card>

            {/* Suggested Recipes */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Suggested based on your ingredients
              </h3>
              <div className="space-y-3">
                {recipes.slice(0, 3).map((recipe, index) => (
                  <Card
                    key={recipe.id}
                    className="hover-lift animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{recipe.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{recipe.time}</span>
                          <span>{recipe.calories} kcal</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="swaps" className="space-y-4 mt-4">
            <Card variant="elevated" className="bg-secondary/30 border-secondary">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">Smart Swaps</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  What are you craving? We'll find a healthier alternative that saves calories.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Ice Cream, Pasta, Potato Chips..."
                    value={swapQuery}
                    onChange={(e) => setSwapQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generateSwaps()}
                  />
                  <Button onClick={generateSwaps} disabled={isGeneratingSwaps || !swapQuery.trim()} className="gap-2 shrink-0">
                    {isGeneratingSwaps ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Find Swaps
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {swaps.map((swap, index) => (
                <Card
                  key={swap.original + index}
                  variant="elevated"
                  className="hover-lift animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="font-medium text-foreground">{swap.original}</p>
                          <p className="text-xs text-muted-foreground">Original</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary" />
                        <div className="text-center">
                          <p className="font-medium text-primary">{swap.swap}</p>
                          <p className="text-xs text-muted-foreground">Healthier</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            -{swap.saved} kcal
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            disabled={isLogging === swap.swap}
                            onClick={() => handleLogItem('swap', swap.swap, swap.calories, swap.protein, swap.carbs, swap.fat, swapCheatMeals[swap.swap] || false)}
                          >
                            {isLogging === swap.swap ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Log Swap
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Label className="text-xs font-medium flex items-center gap-1 text-destructive">
                            <Flame className="w-3 h-3 text-destructive" /> Cheat Meal
                          </Label>
                          <Switch 
                            checked={swapCheatMeals[swap.swap] || false} 
                            onCheckedChange={(checked) => setSwapCheatMeals(prev => ({...prev, [swap.swap]: checked}))} 
                            className="scale-75" 
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="gradient-hero text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Weekly Savings Potential</p>
                    <p className="text-2xl font-bold">~4,130 kcal</p>
                    <p className="text-sm opacity-80">That's over 1 lb of fat per week!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recipe Details Dialog */}
        <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {selectedRecipe && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedRecipe.name}</DialogTitle>
                </DialogHeader>

                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.name}
                  className="w-full h-48 object-cover rounded-md"
                />

                <div className="grid grid-cols-4 gap-2 text-center py-2 bg-secondary/20 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="font-semibold text-foreground">{selectedRecipe.calories}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="font-semibold text-protein">{selectedRecipe.protein}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="font-semibold text-primary">{selectedRecipe.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="font-semibold text-warning">{selectedRecipe.fat}g</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm font-medium mb-2">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-muted-foreground" /> {selectedRecipe.time}</span>
                  <Badge variant={selectedRecipe.difficulty === 'Easy' ? 'default' : selectedRecipe.difficulty === 'Medium' ? 'secondary' : 'destructive'}>
                    {selectedRecipe.difficulty}
                  </Badge>
                </div>

                {(selectedRecipe.ingredientsList || []).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground border-b pb-1">Ingredients</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {(selectedRecipe.ingredientsList || []).map((ing, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{ing}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedRecipe.instructions || []).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground border-b pb-1">Instructions</h4>
                    <ol className="list-decimal pl-5 space-y-2">
                      {(selectedRecipe.instructions || []).map((step, i) => (
                        <li key={i} className="text-sm text-foreground leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

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
                  className="w-full mt-2 flex items-center gap-2"
                  disabled={isLogging === selectedRecipe.name}
                  onClick={() => handleLogItem('recipe', selectedRecipe.name, selectedRecipe.calories, selectedRecipe.protein, selectedRecipe.carbs, selectedRecipe.fat, isCheatMeal)}
                >
                  {isLogging === selectedRecipe.name ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Log to Dashboard
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <Navigation />
    </div>
  );
};

export default Recipes;