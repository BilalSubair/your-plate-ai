import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Star,
  Shield,
  FlaskConical,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ChevronRight,
  Leaf,
  Pill,
  Zap,
  Heart,
  Brain,
  Bone,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supplementsApi } from "@/lib/api";
import { toast } from "sonner";

// Icon mapping for categories from API
const categoryIconMap: Record<string, typeof Pill> = {
  Vitamins: Zap,
  Minerals: Bone,
  "Fatty Acids": Heart,
  Adaptogens: Leaf,
  Sports: Zap,
  "Gut Health": FlaskConical,
  Nootropics: Brain,
};

interface Supplement {
  id: string | number;
  name: string;
  category: string;
  icon: typeof Pill;
  rating: number;
  reviewCount: number;
  evidenceLevel: "strong" | "moderate" | "limited";
  benefits: string[];
  risks: string[];
  dosage: string;
  description: string;
  interactions: string[];
  reviews: Review[];
}

interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

// Fallback mock data used when API is unreachable
const fallbackSupplements: Supplement[] = [
  { id: "vitamin-d", name: "Vitamin D3", category: "Vitamins", icon: Zap, rating: 4.7, reviewCount: 2340, evidenceLevel: "strong", benefits: ["Bone health", "Immune support", "Mood regulation"], risks: ["Toxicity at very high doses"], dosage: "1,000–4,000 IU daily", description: "Essential for calcium absorption and bone health.", interactions: ["Statins", "Steroids"], reviews: [] },
  { id: "omega-3", name: "Omega-3 Fish Oil", category: "Fatty Acids", icon: Heart, rating: 4.5, reviewCount: 1890, evidenceLevel: "strong", benefits: ["Heart health", "Brain function", "Anti-inflammatory"], risks: ["Fishy aftertaste"], dosage: "1,000–2,000 mg EPA+DHA daily", description: "Supports cardiovascular health and brain function.", interactions: ["Blood thinners"], reviews: [] },
  { id: "creatine", name: "Creatine Monohydrate", category: "Sports", icon: Zap, rating: 4.8, reviewCount: 3200, evidenceLevel: "strong", benefits: ["Muscle strength", "Power output", "Cognitive function"], risks: ["Water retention initially"], dosage: "3–5 g daily", description: "One of the most researched supplements for strength.", interactions: [], reviews: [] },
];

const mapApiSupplement = (s: any): Supplement => ({
  id: s.id,
  name: s.name,
  category: s.category || "Other",
  icon: categoryIconMap[s.category] || Pill,
  rating: s.avg_rating ?? 0,
  reviewCount: s.reviews?.length ?? 0,
  evidenceLevel: s.evidence_level || "limited",
  benefits: s.benefits || [],
  risks: s.risks || [],
  dosage: s.dosage || "",
  description: s.description || "",
  interactions: s.interactions || [],
  reviews: (s.reviews || []).map((r: any) => ({
    user: r.username || "Anonymous",
    rating: r.rating,
    comment: r.comment,
    date: r.created_at?.split("T")[0] || "",
    verified: true,
  })),
});

const categories = ["All", "Vitamins", "Minerals", "Fatty Acids", "Adaptogens", "Sports", "Gut Health", "Nootropics"];

const evidenceConfig = {
  strong: { label: "Strong Evidence", color: "bg-success/15 text-success border-success/30" },
  moderate: { label: "Moderate Evidence", color: "bg-warning/15 text-warning border-warning/30" },
  limited: { label: "Limited Evidence", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const Supplements = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  const [supplements, setSupplements] = useState<Supplement[]>(fallbackSupplements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplements = async () => {
      setLoading(true);
      try {
        const res = await supplementsApi.getAll();
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : data.results || [];
          if (results.length > 0) {
            setSupplements(results.map(mapApiSupplement));
          }
        }
      } catch {
        // use fallback
      } finally {
        setLoading(false);
      }
    };
    fetchSupplements();
  }, []);

  const filtered = supplements.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.benefits.some((b) => b.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  if (selectedSupplement) {
    const s = selectedSupplement;
    const evidence = evidenceConfig[s.evidenceLevel];

    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="gradient-primary px-4 pt-12 pb-6">
          <button onClick={() => setSelectedSupplement(null)} className="flex items-center gap-1 text-primary-foreground/80 mb-4">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <s.icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">{s.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {renderStars(s.rating)}
                  <span className="text-primary-foreground/80 text-sm ml-1">{s.rating}</span>
                </div>
                <span className="text-primary-foreground/60 text-sm">({s.reviewCount} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-3 space-y-4">
          {/* Evidence & Dosage */}
          <Card variant="elevated" className="animate-slide-up">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${evidence.color}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {evidence.label}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">{s.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-xs font-semibold text-secondary-foreground mb-1">Recommended Dosage</p>
                <p className="text-sm font-bold text-foreground">{s.dosage}</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="benefits" className="animate-slide-up stagger-1">
            <TabsList className="w-full">
              <TabsTrigger value="benefits" className="flex-1">Benefits</TabsTrigger>
              <TabsTrigger value="risks" className="flex-1">Risks</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="benefits" className="space-y-2 mt-3">
              {s.benefits.map((b) => (
                <div key={b} className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-xl p-3">
                  <ThumbsUp className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{b}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="risks" className="space-y-2 mt-3">
              {s.risks.map((r) => (
                <div key={r} className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                  <ThumbsDown className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{r}</span>
                </div>
              ))}
              {s.interactions.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm font-semibold text-foreground">Drug Interactions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.interactions.map((i) => (
                      <Badge key={i} variant="outline" className="border-warning/40 text-warning text-xs">{i}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-3 mt-3">
              {s.reviews.map((r, idx) => (
                <Card key={idx} variant="glass" className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{r.user}</span>
                      {r.verified && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Verified</Badge>
                      )}
                    </div>
                    {renderStars(r.rating)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">{r.date}</p>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary px-4 pt-12 pb-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-primary-foreground/80 mb-3">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Home</span>
        </button>
        <h1 className="text-2xl font-bold text-primary-foreground">Supplement Search</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Evidence-based information & reviews</p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplements or benefits..."
            className="pl-10 bg-card border-0 shadow-elevated h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "gradient-primary text-primary-foreground shadow-elevated"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card variant="glass" className="p-8 text-center">
              <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No supplements found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
            </Card>
          )}

          {filtered.map((s) => {
            const evidence = evidenceConfig[s.evidenceLevel];
            const Icon = s.icon;
            return (
              <Card
                key={s.id}
                variant="elevated"
                className="p-4 cursor-pointer group animate-fade-in"
                onClick={() => setSelectedSupplement(s)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{s.name}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${evidence.color}`}>
                        <Shield className="w-3 h-3" />
                        {s.evidenceLevel === "strong" ? "Strong" : s.evidenceLevel === "moderate" ? "Moderate" : "Limited"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {renderStars(s.rating)}
                      <span className="text-xs text-muted-foreground">{s.rating} ({s.reviewCount})</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.benefits.slice(0, 3).map((b) => (
                        <span key={b} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Supplements;
