import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ShieldAlert } from "lucide-react";
import { SettingsComponentProps } from "./types";
import { Label } from "@/components/ui/label";

export default function AccessControlCard({ formData, updateForm }: SettingsComponentProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Access Control & Security</CardTitle>
            <CardDescription>Configure security policies and access control settings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Two-Factor Authentication (2FA)</p>
            <p className="text-sm text-gray-500">Require 2FA for all user accounts</p>
          </div>
          <Toggle
            checked={formData.twoFactorAuth}
            onToggle={(checked) => updateForm({ twoFactorAuth: checked })}
          />
        </div>

        <div>
          <Label>Session Timeout (Minutes)</Label>
          <Select
            value={formData.sessionTimeout}
            onValueChange={(val) => updateForm({ sessionTimeout: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select session timeout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15 Minutes">15 Minutes</SelectItem>
              <SelectItem value="30 Minutes">30 Minutes</SelectItem>
              <SelectItem value="60 Minutes">60 Minutes</SelectItem>
              <SelectItem value="120 Minutes">120 Minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">Users will be logged out after this period of inactivity</p>
        </div>

        <div>
          <Label>Password Policy</Label>
          <Select
            value={formData.passwordPolicy}
            onValueChange={(val) => updateForm({ passwordPolicy: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select password policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard (8+ chars)">Standard (8+ chars)</SelectItem>
              <SelectItem value="Strong (8+ chars, mixed, numbers, symbols)">Strong (8+ chars, mixed, numbers, symbols)</SelectItem>
              <SelectItem value="Very Strong (12+ chars, mixed, numbers, symbols)">Very Strong (12+ chars, mixed, numbers, symbols)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Password Expiry (Days)</Label>
          <Select
            value={formData.passwordExpiry}
            onValueChange={(val) => updateForm({ passwordExpiry: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select password expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30 Days">30 Days</SelectItem>
              <SelectItem value="60 Days">60 Days</SelectItem>
              <SelectItem value="90 Days">90 Days</SelectItem>
              <SelectItem value="Never">Never</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">Users must change password after this period</p>
        </div>

        <div className="border-t pt-4">
          <Label>Allowed File Types</Label>
          <Input
            className="mt-1"
            value={formData.allowedFileTypes}
            onChange={(e) => updateForm({ allowedFileTypes: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-2">Only these file types can be uploaded</p>
        </div>
      </CardContent>
    </Card>
  );
}
