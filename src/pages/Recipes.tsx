import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface Recipe {
  id: string;
  name: string;
  image: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
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
  },
  {
    original: "Pasta",
    swap: "Zucchini Noodles",
    saved: 180,
  },
  {
    original: "Potato Chips",
    swap: "Kale Chips",
    saved: 120,
  },
  {
    original: "Soda",
    swap: "Sparkling Water + Lime",
    saved: 140,
  },
];

const Recipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(["chicken", "rice", "broccoli"]);
  const [newIngredient, setNewIngredient] = useState("");
  const [recipes, setRecipes] = useState(sampleRecipes);
  const [isGenerating, setIsGenerating] = useState(false);

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.toLowerCase())) {
      setIngredients([...ingredients, newIngredient.toLowerCase()]);
      setNewIngredient("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const generateRecipes = () => {
    setIsGenerating(true);
    toast.loading("AI is finding recipes...");
    
    setTimeout(() => {
      setIsGenerating(false);
      toast.dismiss();
      toast.success("Found 3 recipes with your ingredients!");
    }, 2000);
  };

  const toggleFavorite = (id: string) => {
    setRecipes(recipes.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      toast(recipe.isFavorite ? "Removed from favorites" : "Added to favorites");
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />
      
      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">Meal Discovery</h1>
          <p className="text-muted-foreground mt-1">Find recipes and healthy swaps</p>
        </section>

        <Tabs defaultValue="discover" className="animate-slide-up stagger-1">
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
            </div>

            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecipes.map((recipe, index) => (
                <Card 
                  key={recipe.id} 
                  variant="elevated" 
                  className="overflow-hidden hover-lift animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative">
                    <img 
                      src={recipe.image} 
                      alt={recipe.name}
                      className="w-full h-40 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                      onClick={() => toggleFavorite(recipe.id)}
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
                      {recipe.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
                {sampleRecipes.slice(0, 2).map((recipe, index) => (
                  <Card 
                    key={recipe.id} 
                    className="hover-lift animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
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
                <p className="text-sm text-muted-foreground">
                  Simple ingredient swaps that can save you hundreds of calories without sacrificing taste
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {calorieSwaps.map((swap, index) => (
                <Card 
                  key={swap.original}
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
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        -{swap.saved} kcal
                      </Badge>
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
      </main>

      <Navigation />
    </div>
  );
};

export default Recipes;