import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, Flame, Target, Activity, Settings, Scale, Camera } from "lucide-react";
import { goalsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UserProfileData {
    age?: number;
    gender?: string;
    current_weight?: number;
    target_weight?: number;
    activity_level?: string;
    primary_goal?: string;
    profile_picture?: string;
    daily_calories?: number;
    maintenance_calories?: number;
}

const Profile = () => {
    const { username, logout } = useAuth();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState<UserProfileData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Using a ref to trigger the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await goalsApi.getGoals();
                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                } else {
                    toast.error("Failed to load profile data");
                }
            } catch (error) {
                toast.error("Network error reaching profile service");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/auth");
    };

    const getInitials = (name: string) => {
        return name ? name.substring(0, 2).toUpperCase() : "U";
    };

    const formatActivityLevel = (level?: string) => {
        if (!level) return "Not Set";
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
                const res = await goalsApi.patchGoals({ profile_picture: base64String });
                if (res.ok) {
                    setProfileData((prev) => ({ ...prev, profile_picture: base64String }));
                    toast.success("Profile picture updated!");
                } else {
                    toast.error("Failed to update profile picture.");
                }
            } catch {
                toast.error("Network error while updating picture.");
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0">
            <Header />
            <main className="container max-w-2xl px-4 py-8 mx-auto space-y-8 animate-fade-up">

                {/* Profile Header */}
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div
                        className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center shadow-soft border-4 border-background ring-2 ring-primary/20 overflow-hidden cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {profileData.profile_picture ? (
                            <img src={profileData.profile_picture} alt="Profile Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                        ) : (
                            <span className="text-3xl font-bold text-primary transition-opacity group-hover:opacity-50">{getInitials(username || "")}</span>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        {isUploading && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <span className="animate-pulse w-4 h-4 rounded-full bg-primary"></span>
                            </div>
                        )}
                    </div>
                    {/* Hidden Native File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">@{username}</h1>
                        <Badge variant="outline" className="mt-2 capitalize bg-primary/5 text-primary border-primary/20">
                            NutriGuide Member
                        </Badge>
                    </div>
                </div>

                {/* Metabolic Analytics */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="glass shadow-soft overflow-hidden">
                        <div className="h-1 w-full bg-blue-500/50"></div>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <Flame className="w-8 h-8 text-blue-500 mb-2 opacity-80" />
                            <p className="text-sm font-medium text-muted-foreground">Target Calories</p>
                            <h3 className="text-2xl font-bold text-foreground">
                                {profileData.daily_calories ? `${profileData.daily_calories} kcal` : "---"}
                            </h3>
                        </CardContent>
                    </Card>

                    <Card className="glass shadow-soft overflow-hidden">
                        <div className="h-1 w-full bg-orange-500/50"></div>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                            <Target className="w-8 h-8 text-orange-500 mb-2 opacity-80" />
                            <p className="text-sm font-medium text-muted-foreground">AI Maintenance</p>
                            <h3 className="text-2xl font-bold text-foreground">
                                {profileData.maintenance_calories ? `${profileData.maintenance_calories} kcal` : "Analyzing..."}
                            </h3>
                        </CardContent>
                    </Card>
                </div>

                {/* Physical Attributes */}
                <Card className="glass shadow-soft border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5 text-primary" />
                            Physical Snapshot
                        </CardTitle>
                        <CardDescription>Your configured physiological base metrics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">

                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Age
                                </span>
                                <span className="font-medium text-foreground">{profileData.age || "---"}</span>
                            </div>

                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <UserCircle className="w-4 h-4" /> Gender
                                </span>
                                <span className="font-medium text-foreground capitalize">{profileData.gender || "---"}</span>
                            </div>

                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Scale className="w-4 h-4" /> Target Weight
                                </span>
                                <span className="font-medium text-foreground">{profileData.target_weight ? `${profileData.target_weight} kg` : "---"}</span>
                            </div>

                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Scale className="w-4 h-4" /> Current Weight
                                </span>
                                <span className="font-medium text-foreground">{profileData.current_weight ? `${profileData.current_weight} kg` : "---"}</span>
                            </div>

                            <div className="flex justify-between items-center border-b border-border/50 pb-2 col-span-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Primary Objective
                                </span>
                                <span className="font-medium text-foreground capitalize">
                                    {profileData.primary_goal ? profileData.primary_goal.replace('_', ' ') : "Not Set"}
                                </span>
                            </div>

                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Activity Level
                            </span>
                            <span className="text-sm font-medium text-foreground">{formatActivityLevel(profileData.activity_level)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Actions */}
                <Card className="border-destructive/20 bg-destructive/5 shadow-soft">
                    <CardContent className="p-6">
                        <Button variant="destructive" className="w-full gap-2 font-semibold shadow-sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Log out of NutriGuide
                        </Button>
                    </CardContent>
                </Card>

            </main>
            <Navigation />
        </div>
    );
};

export default Profile;
