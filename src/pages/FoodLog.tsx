import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check
} from "lucide-react";
import { toast } from "sonner";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  image?: string;
}

const recentFoods = [
  { name: "Oatmeal with Banana", calories: 280, protein: 8, carbs: 52, fat: 5 },
  { name: "Grilled Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 1 },
  { name: "Brown Rice", calories: 216, protein: 5, carbs: 45, fat: 2 },
  { name: "Mixed Salad", calories: 45, protein: 2, carbs: 8, fat: 1 },
];

const FoodLog = () => {
  const [activeTab, setActiveTab] = useState("manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<typeof recentFoods[0] | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<FoodEntry | null>(null);

  const handlePhotoCapture = () => {
    setIsCapturing(true);
    // Simulate camera capture
    setTimeout(() => {
      setCapturedImage("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400");
      setIsCapturing(false);
      setAiAnalyzing(true);
      
      // Simulate AI analysis
      setTimeout(() => {
        setAiResult({
          id: Date.now().toString(),
          name: "Mediterranean Salad Bowl",
          calories: 385,
          protein: 12,
          carbs: 28,
          fat: 24,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
        });
        setAiAnalyzing(false);
      }, 2000);
    }, 1500);
  };

  const handleLogFood = () => {
    if (selectedFood) {
      toast.success(`Logged ${selectedFood.name}`, {
        description: `${Math.round(selectedFood.calories * parseFloat(quantity))} kcal added to your diary`
      });
      setSelectedFood(null);
      setQuantity("1");
    }
  };

  const handleLogAiFood = () => {
    if (aiResult) {
      toast.success(`Logged ${aiResult.name}`, {
        description: `${aiResult.calories} kcal added to your diary`
      });
      setCapturedImage(null);
      setAiResult(null);
    }
  };

  const resetPhoto = () => {
    setCapturedImage(null);
    setAiResult(null);
    setAiAnalyzing(false);
  };

  const filteredFoods = recentFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />
      
      <main className="container px-4 py-6 space-y-6">
        <section className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">Log Food</h1>
          <p className="text-muted-foreground mt-1">Track what you eat manually or with AI</p>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up stagger-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Utensils className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-2">
              <Camera className="w-4 h-4" />
              Photo AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search foods..." 
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
                  
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-accent/10">
                      <p className="text-lg font-bold text-accent">{Math.round(selectedFood.calories * parseFloat(quantity || "1"))}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-protein/10">
                      <p className="text-lg font-bold text-protein">{Math.round(selectedFood.protein * parseFloat(quantity || "1"))}g</p>
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
                    <Button 
                      className="flex-1 mt-5 gap-2 hover-glow"
                      onClick={handleLogFood}
                    >
                      <Check className="w-4 h-4" />
                      Log Food
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Foods */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {searchQuery ? "Search Results" : "Recent Foods"}
              </h3>
              <div className="space-y-2">
                {filteredFoods.map((food, index) => (
                  <Card 
                    key={food.name} 
                    className={`hover-lift cursor-pointer transition-all ${selectedFood?.name === food.name ? 'ring-2 ring-primary' : ''}`}
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
            </div>

            {/* Add Custom Food */}
            <Button variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Custom Food
            </Button>
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
                          <Button 
                            onClick={handlePhotoCapture}
                            className="gap-2 hover-glow"
                          >
                            <Camera className="w-4 h-4" />
                            Take Photo
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Upload
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Captured Image */}
                <Card variant="elevated" className="overflow-hidden animate-bounce-in">
                  <CardContent className="p-0 relative">
                    <img 
                      src={capturedImage} 
                      alt="Captured food" 
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <Button 
                      variant="secondary"
                      size="icon"
                      className="absolute top-3 right-3"
                      onClick={resetPhoto}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    
                    {aiAnalyzing && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Sparkles className="w-12 h-12 text-primary animate-pulse mb-4" />
                        <p className="font-medium text-foreground">AI is analyzing your food...</p>
                        <div className="flex gap-1 mt-3">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Result */}
                {aiResult && (
                  <Card variant="elevated" className="animate-slide-up border-primary/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-primary" />
                        AI Detection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-xl">{aiResult.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {aiResult.time}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 rounded-lg bg-accent/10">
                          <Flame className="w-5 h-5 text-accent mx-auto mb-1" />
                          <p className="text-lg font-bold text-accent">{aiResult.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-protein/10">
                          <p className="text-lg font-bold text-protein">{aiResult.protein}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-primary/10">
                          <p className="text-lg font-bold text-primary">{aiResult.carbs}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-warning/10">
                          <p className="text-lg font-bold text-warning">{aiResult.fat}g</p>
                          <p className="text-xs text-muted-foreground">Fat</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={resetPhoto}>
                          Retake
                        </Button>
                        <Button className="flex-1 gap-2 hover-glow" onClick={handleLogAiFood}>
                          <Check className="w-4 h-4" />
                          Log This Meal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tips */}
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

      <Navigation />
    </div>
  );
};

export default FoodLog;