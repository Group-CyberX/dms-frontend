import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { SettingsComponentProps } from "./types";

export default function ChangePasswordCard({ formData, updateForm, errors, clearError }: SettingsComponentProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateForm({ [name]: value });
    if (errors[name]) {
      clearError(name);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Lock className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            placeholder="Enter current password"
            value={formData.currentPassword || ""}
            onChange={handleChange}
            className={errors.currentPassword ? "border-red-500" : ""}
          />
          {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
        </div>
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            placeholder="Enter new password"
            value={formData.newPassword || ""}
            onChange={handleChange}
            className={errors.newPassword ? "border-red-500" : ""}
          />
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={formData.confirmPassword || ""}
            onChange={handleChange}
            className={errors.confirmPassword ? "border-red-500" : ""}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
