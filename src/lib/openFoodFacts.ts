export interface ProductData {
  code: string;
  name: string;
  brand?: string;
  image?: string;
  ingredients?: string;
  nutrients: {
    calories?: number;
    protein?: number;
    carbs?: number;
    sugars?: number;
    fat?: number;
    saturatedFat?: number;
    fiber?: number;
    sodium?: number;
  };
  servingSize?: string;
  nutriscore?: string;
}

export interface OpenFoodFactsResponse {
  status: number;
  product?: {
    code: string;
    product_name?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    nutriments?: {
      "energy-kcal_100g"?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      fat_100g?: number;
      "saturated-fat_100g"?: number;
      fiber_100g?: number;
      sodium_100g?: number;
      salt_100g?: number;
    };
    serving_size?: string;
    nutriscore_grade?: string;
  };
}

export const fetchProductByBarcode = async (barcode: string): Promise<ProductData | null> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch product");
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Convert sodium to mg (API returns in g)
    const sodiumG = nutriments.sodium_100g ?? (nutriments.salt_100g ? nutriments.salt_100g * 0.4 : undefined);
    const sodiumMg = sodiumG ? sodiumG * 1000 : undefined;

    return {
      code: product.code,
      name: product.product_name || "Unknown Product",
      brand: product.brands,
      image: product.image_front_url || product.image_url,
      ingredients: product.ingredients_text_en || product.ingredients_text,
      nutrients: {
        calories: nutriments["energy-kcal_100g"],
        protein: nutriments.proteins_100g,
        carbs: nutriments.carbohydrates_100g,
        sugars: nutriments.sugars_100g,
        fat: nutriments.fat_100g,
        saturatedFat: nutriments["saturated-fat_100g"],
        fiber: nutriments.fiber_100g,
        sodium: sodiumMg,
      },
      servingSize: product.serving_size,
      nutriscore: product.nutriscore_grade,
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};

// Mock healthier alternatives (in a real app, this would query a database or API)
export const getHealthierAlternatives = (product: ProductData): ProductData[] => {
  // This is mock data - in production, you'd query Open Food Facts with filters
  const alternatives: ProductData[] = [
    {
      code: "alt1",
      name: "Organic Whole Grain Alternative",
      brand: "Nature's Best",
      nutrients: {
        calories: (product.nutrients.calories || 200) * 0.7,
        protein: (product.nutrients.protein || 5) * 1.3,
        sugars: (product.nutrients.sugars || 10) * 0.4,
        fiber: (product.nutrients.fiber || 2) * 2,
        sodium: (product.nutrients.sodium || 300) * 0.5,
        fat: (product.nutrients.fat || 8) * 0.6,
        saturatedFat: (product.nutrients.saturatedFat || 3) * 0.5,
        carbs: (product.nutrients.carbs || 25) * 0.8,
      },
    },
    {
      code: "alt2",
      name: "Low Sugar Version",
      brand: "Healthy Choice",
      nutrients: {
        calories: (product.nutrients.calories || 200) * 0.8,
        protein: (product.nutrients.protein || 5) * 1.1,
        sugars: (product.nutrients.sugars || 10) * 0.2,
        fiber: (product.nutrients.fiber || 2) * 1.5,
        sodium: (product.nutrients.sodium || 300) * 0.7,
        fat: (product.nutrients.fat || 8) * 0.8,
        saturatedFat: (product.nutrients.saturatedFat || 3) * 0.7,
        carbs: (product.nutrients.carbs || 25) * 0.7,
      },
    },
  ];

  return alternatives;
};
