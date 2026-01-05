import { HealthLevel } from "@/components/HealthBadge";

interface IngredientInfo {
  name: string;
  level: HealthLevel;
  description: string;
}

// Database of known harmful, neutral, and healthy ingredients
const ingredientDatabase: Record<string, Omit<IngredientInfo, "name">> = {
  // Harmful ingredients
  "high fructose corn syrup": { level: "harmful", description: "Linked to obesity and metabolic issues" },
  "hfcs": { level: "harmful", description: "High fructose corn syrup - linked to metabolic issues" },
  "aspartame": { level: "harmful", description: "Artificial sweetener with controversial health effects" },
  "sucralose": { level: "neutral", description: "Artificial sweetener, generally safe in moderation" },
  "monosodium glutamate": { level: "neutral", description: "Flavor enhancer, may cause sensitivity in some" },
  "msg": { level: "neutral", description: "Flavor enhancer, may cause sensitivity in some" },
  "sodium nitrite": { level: "harmful", description: "Preservative linked to increased cancer risk" },
  "sodium nitrate": { level: "harmful", description: "Preservative linked to increased cancer risk" },
  "bha": { level: "harmful", description: "Preservative - possible carcinogen" },
  "bht": { level: "harmful", description: "Preservative - possible endocrine disruptor" },
  "red 40": { level: "harmful", description: "Artificial dye linked to hyperactivity" },
  "yellow 5": { level: "harmful", description: "Artificial dye linked to hyperactivity" },
  "yellow 6": { level: "harmful", description: "Artificial dye linked to hyperactivity" },
  "blue 1": { level: "neutral", description: "Artificial dye, generally considered safe" },
  "blue 2": { level: "neutral", description: "Artificial dye, generally considered safe" },
  "caramel color": { level: "neutral", description: "May contain 4-MEI, a possible carcinogen in large amounts" },
  "partially hydrogenated": { level: "harmful", description: "Contains trans fats - harmful to heart health" },
  "hydrogenated oil": { level: "harmful", description: "May contain trans fats - harmful to heart health" },
  "palm oil": { level: "neutral", description: "High in saturated fat, environmental concerns" },
  "sodium benzoate": { level: "neutral", description: "Preservative, may form benzene with vitamin C" },
  "potassium sorbate": { level: "neutral", description: "Preservative, generally safe" },
  "carrageenan": { level: "neutral", description: "Thickener, may cause digestive issues in some" },
  "polysorbate 80": { level: "neutral", description: "Emulsifier, may affect gut bacteria" },
  "artificial flavor": { level: "neutral", description: "Synthetic flavor compounds" },
  "natural flavor": { level: "healthy", description: "Derived from natural sources" },
  
  // Healthy ingredients
  "whole grain": { level: "healthy", description: "Rich in fiber and nutrients" },
  "oats": { level: "healthy", description: "Heart-healthy whole grain" },
  "quinoa": { level: "healthy", description: "Complete protein, rich in nutrients" },
  "olive oil": { level: "healthy", description: "Heart-healthy monounsaturated fats" },
  "coconut oil": { level: "neutral", description: "High in saturated fat, use in moderation" },
  "almonds": { level: "healthy", description: "Heart-healthy nuts, rich in vitamin E" },
  "walnuts": { level: "healthy", description: "Rich in omega-3 fatty acids" },
  "chia seeds": { level: "healthy", description: "High in omega-3s and fiber" },
  "flaxseed": { level: "healthy", description: "Rich in omega-3s and lignans" },
  "honey": { level: "neutral", description: "Natural sweetener, still high in sugar" },
  "stevia": { level: "healthy", description: "Natural zero-calorie sweetener" },
  "turmeric": { level: "healthy", description: "Anti-inflammatory properties" },
  "ginger": { level: "healthy", description: "Digestive and anti-inflammatory benefits" },
  "spinach": { level: "healthy", description: "Nutrient-dense leafy green" },
  "kale": { level: "healthy", description: "Superfood rich in vitamins and antioxidants" },
  "blueberries": { level: "healthy", description: "High in antioxidants" },
  "salmon": { level: "healthy", description: "Rich in omega-3 fatty acids" },
  "chicken breast": { level: "healthy", description: "Lean protein source" },
  "greek yogurt": { level: "healthy", description: "High in protein and probiotics" },
  "avocado": { level: "healthy", description: "Healthy fats and fiber" },
  "legumes": { level: "healthy", description: "High in fiber and plant protein" },
  "lentils": { level: "healthy", description: "Excellent plant protein source" },
  "chickpeas": { level: "healthy", description: "High in fiber and protein" },
};

export const analyzeIngredients = (ingredientsText: string): IngredientInfo[] => {
  if (!ingredientsText) return [];

  const text = ingredientsText.toLowerCase();
  const results: IngredientInfo[] = [];
  const foundIngredients = new Set<string>();

  // Check each known ingredient
  Object.entries(ingredientDatabase).forEach(([ingredient, info]) => {
    if (text.includes(ingredient) && !foundIngredients.has(ingredient)) {
      foundIngredients.add(ingredient);
      results.push({
        name: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
        ...info,
      });
    }
  });

  // Sort by health level (harmful first, then neutral, then healthy)
  const levelOrder: Record<HealthLevel, number> = { harmful: 0, neutral: 1, healthy: 2 };
  results.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return results;
};

export const calculateHealthScore = (
  nutrients: {
    sugars?: number;
    saturatedFat?: number;
    sodium?: number;
    fiber?: number;
    protein?: number;
  },
  ingredients: IngredientInfo[]
): number => {
  let score = 70; // Start with a base score

  // Deduct for harmful ingredients
  const harmfulCount = ingredients.filter((i) => i.level === "harmful").length;
  score -= harmfulCount * 10;

  // Add for healthy ingredients
  const healthyCount = ingredients.filter((i) => i.level === "healthy").length;
  score += healthyCount * 3;

  // Adjust for nutrients (per 100g)
  if (nutrients.sugars !== undefined) {
    if (nutrients.sugars > 20) score -= 15;
    else if (nutrients.sugars > 10) score -= 8;
    else if (nutrients.sugars < 5) score += 5;
  }

  if (nutrients.saturatedFat !== undefined) {
    if (nutrients.saturatedFat > 10) score -= 12;
    else if (nutrients.saturatedFat > 5) score -= 6;
    else if (nutrients.saturatedFat < 2) score += 5;
  }

  if (nutrients.sodium !== undefined) {
    if (nutrients.sodium > 1000) score -= 15;
    else if (nutrients.sodium > 500) score -= 8;
    else if (nutrients.sodium < 200) score += 5;
  }

  if (nutrients.fiber !== undefined) {
    if (nutrients.fiber > 6) score += 10;
    else if (nutrients.fiber > 3) score += 5;
  }

  if (nutrients.protein !== undefined) {
    if (nutrients.protein > 15) score += 8;
    else if (nutrients.protein > 8) score += 4;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
};

export const getNutrientLevel = (
  nutrient: string,
  value: number,
  per100g: boolean = true
): HealthLevel => {
  // Thresholds per 100g
  const thresholds: Record<string, { good: number; bad: number; inverse?: boolean }> = {
    sugars: { good: 5, bad: 15 },
    saturatedFat: { good: 2, bad: 8 },
    sodium: { good: 200, bad: 600 },
    fiber: { good: 6, bad: 2, inverse: true },
    protein: { good: 10, bad: 3, inverse: true },
    calories: { good: 100, bad: 300 },
  };

  const threshold = thresholds[nutrient];
  if (!threshold) return "neutral";

  if (threshold.inverse) {
    if (value >= threshold.good) return "healthy";
    if (value <= threshold.bad) return "harmful";
    return "neutral";
  } else {
    if (value <= threshold.good) return "healthy";
    if (value >= threshold.bad) return "harmful";
    return "neutral";
  }
};
