import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthScoreRing } from "@/components/HealthScoreRing";
import { HealthBadge } from "@/components/HealthBadge";
import { IngredientCard } from "@/components/IngredientCard";
import { NutritionBar } from "@/components/NutritionBar";
import { AlternativeCard } from "@/components/AlternativeCard";
import { fetchProductByBarcode, ProductData, getHealthierAlternatives } from "@/lib/openFoodFacts";
import { analyzeIngredients, calculateHealthScore, getNutrientLevel } from "@/lib/ingredientAnalyzer";
import {
  Camera,
  ScanLine,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Package,
  Sparkles,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";

type ScanState = "idle" | "scanning" | "loading" | "result" | "error" | "manual";

const Scanner = () => {
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setScanState("scanning");

    try {
      const html5Qrcode = new Html5Qrcode("scanner-container");
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await stopScanner();
          await lookupProduct(decodedText);
        },
        undefined
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setScanState("idle");
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
  };

  const lookupProduct = async (barcode: string) => {
    setScanState("loading");
    
    try {
      const productData = await fetchProductByBarcode(barcode);
      
      if (productData) {
        setProduct(productData);
        setScanState("result");
        toast.success("Product found!");
      } else {
        setScanState("error");
        toast.error("Product not found in database");
      }
    } catch (error) {
      setScanState("error");
      toast.error("Error looking up product");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupProduct(manualBarcode.trim());
    }
  };

  const resetScanner = () => {
    setProduct(null);
    setManualBarcode("");
    setScanState("idle");
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const analyzedIngredients = product?.ingredients
    ? analyzeIngredients(product.ingredients)
    : [];

  const healthScore = product
    ? calculateHealthScore(
        {
          sugars: product.nutrients.sugars,
          saturatedFat: product.nutrients.saturatedFat,
          sodium: product.nutrients.sodium,
          fiber: product.nutrients.fiber,
          protein: product.nutrients.protein,
        },
        analyzedIngredients
      )
    : 0;

  const alternatives = product ? getHealthierAlternatives(product) : [];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      <main className="container px-4 py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Idle State */}
        {scanState === "idle" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                <ScanLine className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Label Scanner</h1>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Scan product barcodes to analyze nutritional content and detect harmful ingredients
              </p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <Button size="lg" className="w-full" onClick={startScanner}>
                <Camera className="w-5 h-5 mr-2" />
                Scan Barcode with Camera
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setScanState("manual")}
              >
                <Keyboard className="w-5 h-5 mr-2" />
                Enter Barcode Manually
              </Button>
            </div>

            {/* Demo Products */}
            <Card variant="elevated" className="max-w-md mx-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Try Demo Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Don't have a product? Try these sample barcodes:
                </p>
                {[
                  { code: "3017620422003", name: "Nutella" },
                  { code: "5449000000996", name: "Coca-Cola" },
                  { code: "7622210449283", name: "Oreo Cookies" },
                ].map((demo) => (
                  <button
                    key={demo.code}
                    onClick={() => lookupProduct(demo.code)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <span className="font-medium text-foreground">{demo.name}</span>
                    <span className="text-sm text-muted-foreground">{demo.code}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manual Entry State */}
        {scanState === "manual" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  Enter Barcode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter barcode number..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={resetScanner}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={!manualBarcode.trim()}>
                      Look Up Product
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scanning State */}
        {scanState === "scanning" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="max-w-md mx-auto overflow-hidden">
              <div className="relative">
                <div
                  id="scanner-container"
                  ref={containerRef}
                  className="w-full aspect-square bg-foreground/5"
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-40 border-2 border-primary rounded-lg relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary -translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary -translate-x-0.5 translate-y-0.5" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary translate-x-0.5 translate-y-0.5" />
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-0.5 bg-primary/50 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="pt-4">
                <p className="text-center text-muted-foreground">
                  Position the barcode within the frame
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    stopScanner();
                    resetScanner();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {scanState === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Looking up product...</p>
          </div>
        )}

        {/* Error State */}
        {scanState === "error" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="max-w-md mx-auto">
              <CardContent className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Product Not Found</h3>
                <p className="text-muted-foreground mb-6">
                  This product isn't in our database yet. Try scanning another product or enter the barcode manually.
                </p>
                <Button onClick={resetScanner} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result State */}
        {scanState === "result" && product && (
          <div className="space-y-6 animate-slide-up">
            {/* Product Header */}
            <Card variant="elevated">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
                    {product.brand && (
                      <p className="text-muted-foreground mt-0.5">{product.brand}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {product.nutriscore && (
                        <HealthBadge
                          level={
                            ["a", "b"].includes(product.nutriscore.toLowerCase())
                              ? "healthy"
                              : ["c"].includes(product.nutriscore.toLowerCase())
                              ? "neutral"
                              : "harmful"
                          }
                          label={`Nutri-Score ${product.nutriscore.toUpperCase()}`}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Score */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <HealthScoreRing score={healthScore} size={140} strokeWidth={12} />
                </div>
                <p className="text-center text-muted-foreground mt-2">
                  Based on nutritional content and ingredient analysis
                </p>
              </CardContent>
            </Card>

            {/* Nutrition Facts */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Nutrition Facts (per 100g)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.nutrients.calories !== undefined && (
                  <NutritionBar
                    label="Calories"
                    value={Math.round(product.nutrients.calories)}
                    unit=" kcal"
                    dailyPercentage={(product.nutrients.calories / 2000) * 100}
                    level={getNutrientLevel("calories", product.nutrients.calories)}
                  />
                )}
                {product.nutrients.protein !== undefined && (
                  <NutritionBar
                    label="Protein"
                    value={Math.round(product.nutrients.protein * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.protein / 50) * 100}
                    level={getNutrientLevel("protein", product.nutrients.protein)}
                  />
                )}
                {product.nutrients.carbs !== undefined && (
                  <NutritionBar
                    label="Carbohydrates"
                    value={Math.round(product.nutrients.carbs * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.carbs / 300) * 100}
                    level="neutral"
                  />
                )}
                {product.nutrients.sugars !== undefined && (
                  <NutritionBar
                    label="Sugars"
                    value={Math.round(product.nutrients.sugars * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.sugars / 50) * 100}
                    level={getNutrientLevel("sugars", product.nutrients.sugars)}
                  />
                )}
                {product.nutrients.fat !== undefined && (
                  <NutritionBar
                    label="Total Fat"
                    value={Math.round(product.nutrients.fat * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.fat / 65) * 100}
                    level="neutral"
                  />
                )}
                {product.nutrients.saturatedFat !== undefined && (
                  <NutritionBar
                    label="Saturated Fat"
                    value={Math.round(product.nutrients.saturatedFat * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.saturatedFat / 20) * 100}
                    level={getNutrientLevel("saturatedFat", product.nutrients.saturatedFat)}
                  />
                )}
                {product.nutrients.fiber !== undefined && (
                  <NutritionBar
                    label="Fiber"
                    value={Math.round(product.nutrients.fiber * 10) / 10}
                    unit="g"
                    dailyPercentage={(product.nutrients.fiber / 25) * 100}
                    level={getNutrientLevel("fiber", product.nutrients.fiber)}
                  />
                )}
                {product.nutrients.sodium !== undefined && (
                  <NutritionBar
                    label="Sodium"
                    value={Math.round(product.nutrients.sodium)}
                    unit="mg"
                    dailyPercentage={(product.nutrients.sodium / 2300) * 100}
                    level={getNutrientLevel("sodium", product.nutrients.sodium)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Ingredient Analysis */}
            {analyzedIngredients.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Ingredient Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analyzedIngredients.map((ingredient, index) => (
                      <IngredientCard key={index} {...ingredient} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Healthier Alternatives */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Healthier Alternatives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alternatives.map((alt, index) => (
                  <AlternativeCard
                    key={index}
                    name={alt.name}
                    brand={alt.brand}
                    score={calculateHealthScore(
                      {
                        sugars: alt.nutrients.sugars,
                        saturatedFat: alt.nutrients.saturatedFat,
                        sodium: alt.nutrients.sodium,
                        fiber: alt.nutrients.fiber,
                        protein: alt.nutrients.protein,
                      },
                      []
                    )}
                    reason={
                      index === 0
                        ? "Higher fiber, lower sugar"
                        : "80% less sugar"
                    }
                  />
                ))}
              </CardContent>
            </Card>

            {/* Scan Another */}
            <Button onClick={resetScanner} variant="outline" className="w-full" size="lg">
              <Camera className="w-5 h-5 mr-2" />
              Scan Another Product
            </Button>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
};

export default Scanner;
