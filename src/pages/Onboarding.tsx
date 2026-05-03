import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { goalsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Onboarding = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [activity, setActivity] = useState("");
    const [primaryGoal, setPrimaryGoal] = useState("");
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setProfilePicture(base64String);
                setPreviewUrl(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!age || !gender || !height || !weight || !activity || !primaryGoal) {
            toast.error("Please fill in all fields");
            return;
        }

        setLoading(true);

        // Mifflin-St Jeor Math
        const weightKg = parseFloat(weight);
        const heightCm = parseFloat(height);
        const ageYrs = parseInt(age);
        let bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYrs;
        bmr += (gender === "male") ? 5 : -161;

        let multiplier = 1.2;
        switch (activity) {
            case "sedentary": multiplier = 1.2; break;
            case "light": multiplier = 1.375; break;
            case "moderate": multiplier = 1.55; break;
            case "active": multiplier = 1.725; break;
            case "extreme": multiplier = 1.9; break;
        }

        let finalCalories = Math.round(bmr * multiplier);

        // Adjust for Goal
        if (primaryGoal === 'weight_loss') {
            finalCalories -= 500;
        } else if (primaryGoal === 'weight_gain') {
            finalCalories += 500;
        }

        // Macro Split
        const proteinGrams = Math.round(weightKg * 2.0); // 2g per kg
        const fatGrams = Math.round((finalCalories * 0.25) / 9); // 25% of cals from fat
        const remainingCals = finalCalories - (proteinGrams * 4) - (fatGrams * 9);
        const carbsGrams = Math.max(0, Math.round(remainingCals / 4));

        const payload = {
            age: ageYrs,
            gender,
            height_cm: heightCm,
            current_weight: weightKg,
            activity_level: activity,
            primary_goal: primaryGoal,
            profile_picture: profilePicture,
            daily_calories: finalCalories,
            protein_grams: proteinGrams,
            fat_grams: fatGrams,
            carbs_grams: carbsGrams
        };

        try {
            const res = await goalsApi.updateGoals(payload);
            if (res.ok) {
                toast.success("Profile generated successfully!");
                navigate("/");
            } else {
                throw new Error();
            }
        } catch {
            toast.error("Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
            <div className="mb-6 text-center animate-slide-up">
                <h1 className="text-3xl font-bold font-heading text-foreground mb-2">Welcome to NutriGuide AI</h1>
                <p className="text-muted-foreground">Let's calculate your personalized macro targets.</p>
            </div>

            <Card className="w-full max-w-lg shadow-elevated border-none glass animate-scale-in" style={{ animationDelay: "0.1s" }}>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>Age</Label>
                                <Input type="number" min="10" max="100" placeholder="Years" value={age} onChange={(e) => setAge(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={gender} onValueChange={setGender} required>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label>Height (cm)</Label>
                                <Input type="number" min="100" max="250" placeholder="e.g. 175" value={height} onChange={(e) => setHeight(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Weight (kg)</Label>
                                <Input type="number" min="30" max="300" placeholder="e.g. 70" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Activity Level</Label>
                            <Select value={activity} onValueChange={setActivity} required>
                                <SelectTrigger><SelectValue placeholder="How active are you?" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sedentary">Sedentary (Little/no exercise)</SelectItem>
                                    <SelectItem value="light">Lightly Active (1-3 days/wk)</SelectItem>
                                    <SelectItem value="moderate">Moderately Active (3-5 days/wk)</SelectItem>
                                    <SelectItem value="active">Very Active (6-7 days/wk)</SelectItem>
                                    <SelectItem value="extreme">Extremely Active (Physical job)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Primary Objective</Label>
                            <Select value={primaryGoal} onValueChange={setPrimaryGoal} required>
                                <SelectTrigger><SelectValue placeholder="What are we aiming for?" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                                    <SelectItem value="recomposition">Body Recomposition</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-border/50">
                            <Label>Profile Picture (Optional)</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/20">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-primary">U</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                                    <p className="text-xs text-muted-foreground mt-1 text-left">Upload a square image for best results. Max 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-4 h-12" size="lg" disabled={loading}>
                            {loading ? <span className="animate-pulse">Calculating Goals...</span> : "Generate AI Profile"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
export default Onboarding;
