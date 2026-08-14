'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { PhoneUpdateModal } from "@/components/profile/PhoneUpdateModal";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { email, role, userName, setProfilePicture } = useAuthStore();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get("/api/profile");
        setUserProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await apiClient.post("/api/profile/profile-picture", { profilePicture: base64String });
        setUserProfile((prev: any) => ({ ...prev, profilePicture: base64String }));
        setProfilePicture(base64String);
        toast.success("Profile picture updated successfully!");
      } catch (err) {
        console.error("Failed to upload profile picture", err);
        toast.error("Failed to upload profile picture");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = async () => {
    try {
      await apiClient.delete("/api/profile/profile-picture");
      setUserProfile((prev: any) => ({ ...prev, profilePicture: null }));
      setProfilePicture(null);
      toast.success("Profile picture removed successfully!");
    } catch (err) {
      console.error("Failed to remove profile picture", err);
      toast.error("Failed to remove profile picture");
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading profile...</div>;
  }

  // Fallback initial avatar letters
  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "US";

  return (
    <div className="min-h-screen w-full bg-gray-100 pb-20">
      <div className="max-w-3xl mx-auto py-10 px-6 space-y-6">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#8B2E00]">User Profile</h1>
          <p className="text-slate-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Profile Picture Card */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <Label className="text-base font-semibold mb-4 block">Profile Picture</Label>
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-[#953002] flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-md">
                {userProfile?.profilePicture ? (
                  <img src={userProfile.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Label 
                    htmlFor="picture-upload" 
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    Change Picture
                  </Label>
                  {userProfile?.profilePicture && (
                    <Button 
                      variant="outline" 
                      className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={handleRemovePicture}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input 
                  id="picture-upload" 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.gif" 
                  className="hidden" 
                  onChange={handleProfilePictureUpload}
                />
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={userProfile?.username || userName || ""} disabled className="mt-1 bg-gray-50 text-gray-700" />
            </div>

            <div>
              <Label>Username</Label>
              <Input value={userProfile?.username || userName || ""} disabled className="mt-1 bg-gray-50 text-gray-700" />
              <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <Label>Email Address</Label>
              <Input value={userProfile?.email || email || ""} disabled className="mt-1 bg-gray-50 text-gray-700" />
            </div>

            <div>
              <Label>Phone Number</Label>
              <div className="flex gap-4 mt-1">
                <Input value={userProfile?.phone || "Not set"} disabled className="bg-gray-50 text-gray-700 flex-1" />
                <Button variant="outline" onClick={() => setIsPhoneModalOpen(true)}>Edit</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-500">User ID</span>
              <span className="text-sm font-mono text-gray-800">{userProfile?.userId}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm font-semibold text-gray-800">{role}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Account Created</span>
              <span className="text-sm text-gray-800">
                {userProfile?.createdAt ? format(new Date(userProfile.createdAt), "MMM d, yyyy") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Last Login</span>
              <span className="text-sm text-gray-800">
                {userProfile?.lastLogin ? format(new Date(userProfile.lastLogin), "MMM d, yyyy hh:mm a") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Account Status</span>
              <span className="text-sm font-bold text-green-600">
                {userProfile?.status === "ACTIVE" ? "Active" : userProfile?.status || "Active"}
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {isPhoneModalOpen && (
        <PhoneUpdateModal 
          currentPhone={userProfile?.phone}
          onClose={() => setIsPhoneModalOpen(false)}
          onSuccess={(newPhone) => {
            setUserProfile((prev: any) => ({ ...prev, phone: newPhone }));
            setIsPhoneModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
