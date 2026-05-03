import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Camera, 
    ArrowLeft, 
    Loader2, 
    Crosshair, 
    Plus, 
    Dumbbell, 
    Flame,
    Zap,
    Utensils,
    ImagePlus
} from "lucide-react";
import { foodApi } from "@/lib/api";

type Recommendation = {
    item_name: string;
    estimated_calories: number;
    estimated_protein: number;
    estimated_carbs: number;
    estimated_fat: number;
    price_estimate: string;
    reason: string;
};

export default function MenuSniper() {
    const navigate = useNavigate();
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ remaining_macros: any, recommendations: Recommendation[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null); // Clear previous results
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        if (!loading) {
            fileInputRef.current?.click();
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await foodApi.snipMenu(image);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Analysis failed");
            setResult(data);
            toast.success("AI Successfully snipped the menu!", { icon: "🎯" });
        } catch (err: any) {
            toast.error(err.message || "An error occurred during OCR.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogMeal = async (item: Recommendation) => {
        try {
            const res = await foodApi.logEntry({
                name: item.item_name,
                calories: item.estimated_calories,
                protein: item.estimated_protein,
                carbs: item.estimated_carbs,
                fat: item.estimated_fat,
                meal_type: "lunch"
            });
            if (res.ok) {
                toast.success(`Logged ${item.item_name} to your diary!`, { icon: "✅" });
                navigate("/");
            } else {
                toast.error("Failed to log meal.");
            }
        } catch {
            toast.error("Error logging meal.");
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 selection:bg-orange-500/30">
            <Header />

            {/* Dynamic Background */}
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-background to-background" />

            <main className="container px-4 py-8 space-y-8 max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-2 transition-transform" />
                            Return to Dashboard
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-xl animate-pulse" />
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-all">
                                    <Crosshair className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                    Menu Sniper <span className="text-orange-500">AI</span>
                                </h1>
                                <p className="text-muted-foreground text-md mt-1 font-medium">
                                    Upload any menu. We'll find what fits your macros.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start relative">
                    {/* Left Column: Uploader */}
                    <div className="lg:col-span-5 space-y-6 sticky top-28 self-start">
                        <Card className="overflow-hidden border-orange-500/20 shadow-2xl bg-card/60 backdrop-blur-xl relative group transition-all">
                            {/* Animated scanner line effect when loading */}
                            {loading && (
                                <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-xl">
                                    <div className="w-full h-1 bg-orange-400 shadow-[0_0_15px_3px_rgba(249,115,22,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                                    <div className="absolute inset-0 bg-orange-500/5 backdrop-blur-[1px]" />
                                </div>
                            )}

                            <CardContent className="p-0">
                                <div 
                                    onClick={triggerFileInput}
                                    className={`
                                        relative overflow-hidden transition-all cursor-pointer text-center
                                        flex flex-col items-center justify-center min-h-[400px]
                                        ${image ? 'bg-black/5' : 'bg-secondary/50 hover:bg-secondary border-2 border-dashed border-border m-4 rounded-xl'}
                                    `}
                                >
                                    {image ? (
                                        <div className="relative w-full h-full">
                                            <img 
                                                src={image} 
                                                alt="Menu preview" 
                                                className={`w-full h-full max-h-[500px] object-cover transition-all duration-700 ${loading ? 'brightness-50 grayscale-[50%]' : 'brightness-100'}`} 
                                            />
                                            {!loading && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                    <div className="bg-white/10 p-4 rounded-full border border-white/20 text-white flex items-center gap-2 font-bold backdrop-blur-md">
                                                        <ImagePlus className="w-5 h-5" /> Change Menu
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-8 flex flex-col items-center">
                                            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center shadow-inner mb-6">
                                                <Camera className="w-10 h-10 text-orange-500/80" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">Target Acquired</h3>
                                            <p className="text-sm text-muted-foreground max-w-[250px] leading-relaxed">
                                                Tap to scan a physical menu or upload a screenshot from your gallery.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                            </CardContent>

                            {image && (
                                <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border">
                                    <Button 
                                        onClick={handleAnalyze} 
                                        disabled={loading}
                                        className="w-full h-14 text-lg font-bold shadow-xl shadow-orange-500/20 bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 text-white rounded-xl transition-all relative overflow-hidden group"
                                    >
                                        {/* Button shiny sweep effect */}
                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                                        
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                                Running OCR Analysis...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5 mr-3" />
                                                Execute Sniper
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-7 space-y-6">
                        {!result && !loading && (
                           <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 bg-secondary/20 rounded-3xl border border-dashed border-border/60">
                               <div className="relative mb-6">
                                   <div className="absolute inset-0 bg-muted/50 rounded-full blur-xl" />
                                   <Utensils className="w-20 h-20 text-muted-foreground/30 relative z-10" />
                               </div>
                               <h3 className="text-2xl font-extrabold text-foreground mb-3">Awaiting Target</h3>
                               <p className="text-muted-foreground text-lg max-w-sm">
                                   Upload a menu to deploy the AI. It will calculate exactly what macros you have left today and lock onto the perfect meal.
                               </p>
                           </div> 
                        )}

                        {loading && !result && (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 rounded-3xl border border-primary/10 bg-primary/5">
                                <div className="relative flex items-center justify-center mb-8">
                                    <div className="absolute w-24 h-24 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                    <div className="absolute w-16 h-16 border-4 border-rose-500/20 border-b-rose-500 rounded-full animate-spin direction-reverse" />
                                    <Crosshair className="w-8 h-8 text-orange-600 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500 animate-pulse">
                                    Cross-referencing Menu...
                                </h3>
                                <p className="text-sm text-muted-foreground mt-2">Checking your remaining deficit for today...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6 animate-slide-up">
                                {/* Macro Context Bar */}
                                <Card className="bg-gradient-to-br from-card to-secondary/50 border-orange-500/30 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                        <div className="text-center md:text-left">
                                            <h3 className="font-extrabold text-lg text-foreground flex items-center justify-center md:justify-start gap-2">
                                                <TargetIcon className="w-5 h-5 text-orange-500" /> Current Deficit
                                            </h3>
                                            <p className="text-sm text-muted-foreground font-medium mt-1">
                                                AI filtered the menu using these limits:
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-3">
                                            <div className="text-center bg-background rounded-xl p-3 min-w-[90px] shadow-sm border border-border">
                                                <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                                                    <Flame className="w-3 h-3 text-orange-500" /> Cals
                                                </span>
                                                <span className="font-black text-xl text-foreground">{result.remaining_macros.calories}</span>
                                            </div>
                                            <div className="text-center bg-background rounded-xl p-3 min-w-[90px] shadow-sm border border-border">
                                                <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                                                    <Dumbbell className="w-3 h-3 text-blue-500" /> Pro
                                                </span>
                                                <span className="font-black text-xl text-foreground">{result.remaining_macros.protein}g</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pb-2 pt-2 border-b border-border/50">
                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 px-3 py-1 font-bold text-sm">
                                            Top 3 Safest Orders
                                        </Badge>
                                        <div className="h-px bg-border flex-1" />
                                    </div>

                                    {result.recommendations.map((item, idx) => (
                                        <Card 
                                            key={idx} 
                                            className="overflow-hidden hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 border-l-[6px] border-l-orange-500 bg-card/80 backdrop-blur-md transform hover:-translate-y-1 relative group"
                                            style={{ animationDelay: `${idx * 0.15}s` }}
                                        >
                                            {/* Price Ribbon */}
                                            {item.price_estimate && (
                                                <div className="absolute top-0 right-0 bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-sm px-4 py-1 rounded-bl-xl border-b border-l border-green-500/20">
                                                    {item.price_estimate}
                                                </div>
                                            )}

                                            <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                                                <div className="p-6 flex-1 space-y-4">
                                                    <div className="pr-16">
                                                        <h3 className="text-xl font-extrabold leading-tight text-foreground">
                                                            {item.item_name}
                                                        </h3>
                                                    </div>
                                                    
                                                    <p className="text-sm text-muted-foreground leading-relaxed italic bg-secondary/30 p-3 rounded-lg border border-border/50">
                                                        "{item.reason}"
                                                    </p>
                                                    
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 rounded-md px-2.5 py-1">
                                                            <Flame className="w-3.5 h-3.5 mr-1" /> {item.estimated_calories} kcal
                                                        </Badge>
                                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-md px-2.5 py-1">
                                                            <Dumbbell className="w-3.5 h-3.5 mr-1" /> {item.estimated_protein}g Protein
                                                        </Badge>
                                                        <Badge variant="outline" className="text-muted-foreground rounded-md px-2.5 py-1">
                                                            C: {item.estimated_carbs}g
                                                        </Badge>
                                                        <Badge variant="outline" className="text-muted-foreground rounded-md px-2.5 py-1">
                                                            F: {item.estimated_fat}g
                                                        </Badge>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-secondary/40 p-6 border-t sm:border-t-0 sm:border-l border-border flex items-center justify-center min-w-[140px] group-hover:bg-orange-500/5 transition-colors">
                                                    <Button 
                                                        onClick={() => handleLogMeal(item)} 
                                                        className="w-full h-12 shadow-md rounded-xl bg-foreground text-background hover:bg-orange-600 hover:text-white transition-colors"
                                                    >
                                                        <Plus className="w-5 h-5 mr-1.5" />
                                                        Log Meal
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Inline Target Icon Component
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
