import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { LogoLoader } from "@/components/LogoLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthScoreRing } from "@/components/HealthScoreRing";
import { HealthBadge } from "@/components/HealthBadge";
import { IngredientCard } from "@/components/IngredientCard";
import { NutritionBar } from "@/components/NutritionBar";
import { AlternativeCard } from "@/components/AlternativeCard";
import { fetchProductByBarcode, ProductData, getHealthierAlternatives } from "@/lib/openFoodFacts";
import { analyzeIngredients, calculateHealthScore, getNutrientLevel } from "@/lib/ingredientAnalyzer";

export interface IngredientInfo {
  name: string;
  healthImpact: "healthy" | "neutral" | "harmful";
  reason: string;
}
import {
  Camera,
  ScanLine,
  X,
  AlertCircle,
  ChevronLeft,
  Package,
  Sparkles,
  RefreshCw,
  Keyboard,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

type ScanState = "idle" | "scanning" | "loading" | "result" | "error" | "manual" | "ocr_extracting" | "ai_analyzing" | "ai_result" | "choose_image_source" | "live_camera" | "ai_plate_result";

const Scanner = () => {
  const navigate = useNavigate();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [aiIngredients, setAiIngredients] = useState<IngredientInfo[]>([]);
  const [aiHealthScore, setAiHealthScore] = useState<number | null>(null); 
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanner = async () => {
    setScanState("scanning");

    setTimeout(async () => {
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
    }, 100);
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
    setAiIngredients([]);
    setAiHealthScore(null);
  };

  const handleLabelOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanState("ocr_extracting");
    toast.info("Extracting text and analyzing ingredients...");

    try {
      const { foodApi } = await import("@/lib/api");

      // Convert File to Base64 String
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const res = await foodApi.analyzeIngredients(base64Data);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze ingredients");
      }
      const data = await res.json();
      setAiIngredients(data.ingredients || []);
      setAiHealthScore(data.healthScore || null);
      setScanState("ai_result");
      toast.success("Analysis complete!");

    } catch (error: any) {
      console.error("OCR/AI Error:", error);
      toast.error(error?.message || "Error analyzing image. Please try a clearer photo.");
      setScanState("idle");
    }
  };

  const startLiveCamera = async () => {
    setScanState("live_camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera access denied:", err);
      toast.error("Could not access camera. Please allow permissions or use Gallery.");
      setScanState("choose_image_source");
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    stopLiveCamera();
    setScanState("ocr_extracting");
    toast.info("Extracting text and analyzing ingredients...");

    try {
      const { foodApi } = await import("@/lib/api");
      const res = await foodApi.analyzeIngredients(dataUrl);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze ingredients");
      }
      const data = await res.json();
      setAiIngredients(data.ingredients || []);
      setAiHealthScore(data.healthScore || null);
      setScanState("ai_result");
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("OCR/AI Error:", error);
      toast.error(error?.message || "Error analyzing image. Please try a clearer photo.");
      setScanState("idle");
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
      stopLiveCamera();
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
        {/* Hidden File Uploaders (Global to Component) */}
        <input
          id="label-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleLabelOCR}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        />
        <input
          id="label-gallery-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLabelOCR}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        />

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
          <div className="space-y-6">
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse-ring">
                <ScanLine className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground animate-slide-up">Label Scanner</h1>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto animate-slide-up stagger-1" style={{ animationFillMode: 'both' }}>
                Scan product barcodes to analyze nutritional content and detect harmful ingredients
              </p>
            </div>

            <div className="grid gap-3 max-w-md mx-auto">

              <Button
                size="lg"
                className="w-full animate-slide-up stagger-2 hover-glow group bg-accent text-accent-foreground"
                style={{ animationFillMode: 'both' }}
                onClick={() => {
                  setScanState("choose_image_source");
                }}
              >
                <Camera className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Scan Ingredients Label (OCR)
              </Button>
              <p className="text-xs text-center text-muted-foreground mb-2 mt-[-0.5rem] animate-slide-up stagger-2" style={{ animationFillMode: 'both' }}>
                Tip: Take a clear, close-up photo of <strong>only</strong> the ingredient list.
              </p>

              <Button
                size="lg"
                variant="outline"
                className="w-full animate-slide-up stagger-3 hover-lift group"
                style={{ animationFillMode: 'both' }}
                onClick={startScanner}
              >
                <ScanLine className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Scan Product Barcode
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full animate-slide-up stagger-4 hover-lift"
                style={{ animationFillMode: 'both' }}
                onClick={() => setScanState("manual")}
              >
                <Keyboard className="w-5 h-5 mr-2" />
                Enter Barcode Manually
              </Button>
            </div>

            {/* Demo Products */}
            <Card variant="elevated" className="max-w-md mx-auto animate-slide-up stagger-4" style={{ animationFillMode: 'both' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Try Demo Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Don't have a product? Try these sample barcodes:
                </p>
                {[
                  { code: "3017620422003", name: "Nutella", icon: "🍫" },
                  { code: "5449000000996", name: "Coca-Cola", icon: "🥤" },
                  { code: "7622210449283", name: "Oreo Cookies", icon: "🍪" },
                ].map((demo, index) => (
                  <button
                    key={demo.code}
                    onClick={() => lookupProduct(demo.code)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left group"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span className="text-lg group-hover:scale-125 transition-transform">{demo.icon}</span>
                      {demo.name}
                    </span>
                    <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">{demo.code}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Choose Image Source State */}
        {scanState === "choose_image_source" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="max-w-md mx-auto">
              <CardHeader className="pb-3 text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-4 hover:bg-secondary rounded-full"
                  onClick={() => setScanState("idle")}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Upload Label Image</CardTitle>
                <p className="text-muted-foreground text-sm mt-2">
                  For best results, crop the photo around the ingredients list.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg hover-glow group bg-primary text-primary-foreground"
                  onClick={startLiveCamera}
                >
                  <Camera className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                  Take Photo (Camera)
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-16 text-lg hover-lift group"
                  onClick={() => document.getElementById('label-gallery-input')?.click()}
                >
                  <ImageIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                  Upload from Gallery
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Live WebRTC Camera State */}
        {scanState === "live_camera" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="max-w-md mx-auto overflow-hidden">
              <div className="relative aspect-[3/4] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 pb-6 bg-card">
                <p className="text-center text-muted-foreground text-sm mb-6">
                  Position the ingredients list within the frame.
                </p>
                <div className="flex justify-center items-center gap-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 rounded-full hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      stopLiveCamera();
                      setScanState("choose_image_source");
                    }}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  <Button
                    size="icon"
                    className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(235,100,52,0.4)] hover:scale-105 transition-transform border-4 border-background"
                    onClick={captureSnapshot}
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-primary-foreground/30 flex items-center justify-center">
                      <Camera className="w-8 h-8" />
                    </div>
                  </Button>
                  <div className="w-12" /> {/* Spacer for centering */}
                </div>
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
                  {/* Darkened overlay outside scan area */}
                  <div className="absolute inset-0 bg-foreground/40" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Clear scan window */}
                    <div className="w-64 h-40 relative">
                      {/* Clear background for scan area */}
                      <div className="absolute inset-0 bg-background/0 backdrop-blur-0" style={{ clipPath: 'inset(0)' }} />

                      {/* Border with glow */}
                      <div className="absolute inset-0 border-2 border-primary rounded-lg shadow-glow" />

                      {/* Animated corner brackets */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-primary -translate-x-0.5 -translate-y-0.5 animate-corner-pulse" style={{ borderWidth: '3px' }} />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-primary translate-x-0.5 -translate-y-0.5 animate-corner-pulse stagger-1" style={{ borderWidth: '3px', animationDelay: '0.2s' }} />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-primary -translate-x-0.5 translate-y-0.5 animate-corner-pulse stagger-2" style={{ borderWidth: '3px', animationDelay: '0.4s' }} />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-primary translate-x-0.5 translate-y-0.5 animate-corner-pulse stagger-3" style={{ borderWidth: '3px', animationDelay: '0.6s' }} />

                      {/* Scanning laser line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line shadow-glow" />
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="pt-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p>Scanning for barcode...</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full hover-lift"
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
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <LogoLoader size="lg" text="Uploading and analyzing image..." />
          </div>
        )}

        {/* Error State */}
        {scanState === "error" && (
          <div className="space-y-6">
            <Card variant="elevated" className="max-w-md mx-auto animate-bounce-in">
              <CardContent className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 animate-slide-up">Product Not Found</h3>
                <p className="text-muted-foreground mb-6 animate-slide-up stagger-1" style={{ animationFillMode: 'both' }}>
                  This product isn't in our database yet. Try scanning another product or enter the barcode manually.
                </p>
                <Button onClick={resetScanner} className="w-full hover-glow group animate-slide-up stagger-2" style={{ animationFillMode: 'both' }}>
                  <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result State */}
        {scanState === "result" && product && (
          <div className="space-y-6">
            {/* Product Header */}
            <Card variant="elevated" className="animate-bounce-in overflow-hidden">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-xl bg-secondary flex-shrink-0 overflow-hidden hover:scale-105 transition-transform duration-300">
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
                    <h2 className="text-xl font-bold text-foreground animate-slide-up">{product.name}</h2>
                    {product.brand && (
                      <p className="text-muted-foreground mt-0.5 animate-slide-up stagger-1" style={{ animationFillMode: 'both' }}>{product.brand}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 animate-scale-in stagger-2" style={{ animationFillMode: 'both' }}>
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
            <Card variant="elevated" className="animate-slide-up stagger-1" style={{ animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="animate-scale-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                    <HealthScoreRing score={healthScore} size={140} strokeWidth={12} />
                  </div>
                </div>
                <p className="text-center text-muted-foreground mt-2">
                  Based on nutritional content and ingredient analysis
                </p>
              </CardContent>
            </Card>

            {/* Nutrition Facts */}
            <Card variant="elevated" className="animate-slide-up stagger-2" style={{ animationFillMode: 'both' }}>
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
              <Card variant="elevated" className="animate-slide-up stagger-3" style={{ animationFillMode: 'both' }}>
                <CardHeader>
                  <CardTitle>Ingredient Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analyzedIngredients.map((ingredient, index) => (
                      <div key={index} className="animate-scale-in" style={{ animationDelay: `${0.4 + index * 0.05}s`, animationFillMode: 'both' }}>
                        <IngredientCard {...ingredient} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Healthier Alternatives */}
            <Card variant="elevated" className="animate-slide-up stagger-4" style={{ animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Healthier Alternatives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alternatives.map((alt, index) => (
                  <div key={index} className="animate-slide-up hover-lift" style={{ animationDelay: `${0.6 + index * 0.1}s`, animationFillMode: 'both' }}>
                    <AlternativeCard
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
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scan Another */}
            <Button
              onClick={resetScanner}
              variant="outline"
              className="w-full hover-glow group animate-slide-up stagger-5"
              style={{ animationFillMode: 'both' }}
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Scan Another Product
            </Button>
          </div>
        )}

        {/* OCR Extracting State */}
        {scanState === "ocr_extracting" && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-muted animate-pulse" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-accent animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground mt-6 animate-pulse">Reading label text (OCR)...</p>
          </div>
        )}

        {/* AI Analyzing State */}
        {scanState === "ai_analyzing" && (
          <div className="flex flex-col justify-center items-center py-12 mx-auto">
            <LogoLoader size="lg" text="NutriGuide AI is analyzing..." />
          </div>
        )}

        {/* AI Result State */}
        {scanState === "ai_result" && (
          <div className="space-y-6 animate-fade-in">
            <Card variant="elevated" className="animate-bounce-in overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    AI Ingredient Analysis
                  </div>
                  {aiHealthScore !== null && (
                    <div className="flex items-center animate-fade-in">
                      <HealthBadge
                        level={aiHealthScore >= 8 ? "healthy" : aiHealthScore >= 4 ? "neutral" : "harmful"}
                        label={`${aiHealthScore >= 8 ? "Healthy" : aiHealthScore >= 4 ? "Moderate" : "Harmful"} (${aiHealthScore}/10)`}
                        size="md"
                      />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {aiIngredients.map((ingredient, index) => (
                    <div key={index} className="animate-scale-in" style={{ animationDelay: `${0.1 + index * 0.05}s`, animationFillMode: 'both' }}>
                      <IngredientCard
                        name={ingredient.name}
                        level={ingredient.healthImpact as "healthy" | "neutral" | "harmful"}
                        description={ingredient.reason}
                      />
                    </div>
                  ))}
                </div>

                {aiIngredients.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recognizable ingredients found in the text.</p>
                  </div>
                )}

                <Button
                  onClick={resetScanner}
                  className="w-full mt-6 gap-2"
                  size="lg"
                >
                  <ScanLine className="w-5 h-5" />
                  Scan Another Label
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
};

export default Scanner;
