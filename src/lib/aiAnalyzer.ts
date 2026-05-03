export interface IngredientInfo {
    name: string;
    level: "healthy" | "neutral" | "harmful";
    description: string;
}

export const analyzeIngredientsWithGroq = async (
    ocrText: string,
    apiKey: string
): Promise<IngredientInfo[]> => {
    if (!ocrText || !ocrText.trim()) return [];

    const prompt = `
You are an expert nutritionist and food scientist.
I am providing you with text extracted from a product's ingredient label using OCR. 

CRITICAL INSTRUCTION: The text is extracted using OCR from a photo and is highly likely to contain severe typos, misspelled words, and noise.
Your first task is to heavily autocorrect and reconstruct the potential ingredient names using context. (e.g. "h1gh fruc t0se corn syr" -> "High Fructose Corn Syrup", "vvater" -> "Water").

After reconstructing the ingredients:
1. Identify the actual food ingredients.
2. Ignore noise, nutritional facts (like "Calories 200", "Fat 10g"), marketing text, or allergen warnings.
3. Classify each identified ingredient as "healthy", "neutral", or "harmful".
4. Provide a short description (1-2 sentences) of why.

Return the result STRICTLY as a JSON array of objects with the keys: "name" (string), "level" (string: exactly "healthy", "neutral", or "harmful"), and "description" (string).
Do not wrap the JSON in markdown blocks (e.g. no \`\`\`json). Just return the raw JSON array.

Extracted Text:
"""
${ocrText}
"""
  `.trim();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful JSON API." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error:", response.status, errorText);
            throw new Error(`Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return [];

        try {
            // Sometimes LLMs still wrap in markdown despite instructions, so we strip it if present
            let jsonStr = content;
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
            } else if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();
            }

            const parsed: IngredientInfo[] = JSON.parse(jsonStr);
            // Validate structure before returning
            return parsed.filter(i =>
                i.name &&
                ["healthy", "neutral", "harmful"].includes(i.level) &&
                i.description
            );
        } catch (parseError) {
            console.error("Failed to parse Groq JSON response", parseError, content);
            return [];
        }
    } catch (error) {
        console.error("Error communicating with Groq API:", error);
        throw error;
    }
};

export const generateRecipesWithGroq = async (
    ingredients: string[],
    apiKey: string
) => {
    if (!ingredients.length) return [];

    const prompt = `
You are an expert chef and nutritionist specializing in global and Indian cuisine.
I have the following ingredients in my kitchen: ${ingredients.join(", ")}.

Your task is to generate exactly 3 healthy, delicious recipes that STRICTLY utilize at least 70% or more of the specific ingredients I provided. 
CRITICAL: You must structure the 3 recipes as follows:
- Recipe 1 and 2 MUST be authentic Indian or South Indian dishes.
- Recipe 3 MUST be a dish from outside India (e.g., Continental, Mediterranean, Mexican, Asian, etc.).

The recipes must be primarily based on the ingredients I gave you. You may assume I have basic pantry staples (salt, pepper, oil, water, and common Indian/global spices) to supplement the dish.

Return the result STRICTLY as a JSON array of objects. Do not wrap the JSON in markdown blocks (e.g. no \`\`\`json). Just return the raw JSON array.

Each object must have the following exact keys and types:
- "id" (string, generate a random short string like "rec-123")
- "name" (string, the title of the recipe)
- "image" (string, a placeholder URL based on the meal type, use "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400" as a safe fallback)
- "calories" (number, estimated total calories)
- "protein" (number, estimated protein in grams)
- "carbs" (number, estimated carbs in grams)
- "fat" (number, estimated fat in grams)
- "time" (string, e.g. "20 min")
- "difficulty" (string, strictly one of: "Easy", "Medium", "Hard")
- "tags" (array of exactly 3 strings, e.g. ["High Protein", "Quick", "Vegetarian"])
- "ingredientsList" (array of strings, exactly what ingredients are needed with measurements)
- "instructions" (array of strings, step-by-step preparation instructions)
    `.trim();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful JSON API." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
            }),
        });

        if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return [];

        let jsonStr = content;
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
        else if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating recipes:", error);
        throw error;
    }
};

export const researchSupplementWithGroq = async (query: string, apiKey: string) => {
    if (!query.trim()) throw new Error("Empty query");

    const prompt = `
You are an expert biochemist, sports nutritionist, and supplement evaluator.
Provide a clinical research summary and product evaluation for the supplement: "${query}".
Note: The query may be a generic compound (e.g. "Ashwagandha") or a specific commercial product (e.g. "MuscleBlaze Whey"). If it is a commercial product, evaluate that specific brand/formulation.

Return the result STRICTLY as a JSON object. Do not wrap the JSON in markdown blocks.

The object must have the following exact keys and types:
- "name" (string, formally corrected name of the supplement or product)
- "category" (string, strictly one of: "Vitamins", "Minerals", "Fatty Acids", "Adaptogens", "Sports", "Gut Health", "Nootropics")
- "evidenceLevel" (string, strictly one of: "strong", "moderate", "limited")
- "benefits" (JSON array of exactly 3 strings detailing primary clinical benefits or product "Pros". e.g. ["Improved sleep", "High protein yield", "Good mixability"])
- "risks" (JSON array of 1-3 strings detailing side effects, risks, or product "Cons". e.g. ["Upset stomach", "Contains artificial sweeteners"])
- "dosage" (string, typical recommended daily dosage range or serving size)
- "description" (string, a 2 sentence summary of its mechanism of action or product description)
- "interactions" (JSON array of strings, potential drug interactions. e.g. ["Blood thinners"]. Empty array [] if none known.)
- "rating" (number, estimated average user review score out of 5. e.g. 4.3)
- "reviewCount" (number, estimated total number of user reviews online. e.g. 1500)
    `.trim();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful JSON API." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
            }),
        });

        if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Empty response");

        let jsonStr = content;
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
        else if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error researching supplement:", error);
        throw error;
    }
};

export const generateCalorieSwapsWithGroq = async (query: string, apiKey: string) => {
    if (!query.trim()) throw new Error("Empty query");

    const prompt = `
You are an expert nutritionist and dietitian specializing in global and Indian cuisine.
A user is craving the following food: "${query}".

Your task is to provide exactly 3 healthy, lower-calorie, delicious alternatives or "smart swaps" that satisfy this craving.
CRITICAL: You must structure the 3 swaps as follows:
- Swap 1 and 2 MUST be healthy Indian or South Indian alternatives.
- Swap 3 MUST be a healthy alternative from outside India.

Return the result STRICTLY as a JSON array of objects. Do not wrap the JSON in markdown blocks (e.g. no \`\`\`json). Just return the raw JSON array.

Each object must have the following exact keys and types:
- "original" (string, the name of the user's craving, properly capitalized)
- "swap" (string, the name of the healthier alternative)
- "saved" (number, the estimated number of calories saved per typical serving by making this swap)
- "calories" (number, estimated total calories for the swap)
- "protein" (number, estimated protein in grams for the swap)
- "carbs" (number, estimated carbs in grams for the swap)
- "fat" (number, estimated fat in grams for the swap)
    `.trim();

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful JSON API." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
            }),
        });

        if (!response.ok) throw new Error(`Groq API Error: ${response.status}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Empty response");

        let jsonStr = content;
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
        else if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating calorie swaps:", error);
        throw error;
    }
};
