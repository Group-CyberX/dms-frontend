import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";
import { SettingsComponentProps } from "./types";
import { Label } from "@/components/ui/label";

export default function AppearanceCard({ formData, updateForm }: SettingsComponentProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Palette className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the visual appearance of the application</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Theme</Label>
          <Select
            value={formData.theme}
            onValueChange={(val) => updateForm({ theme: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Light">Light</SelectItem>
              <SelectItem value="Dark">Dark</SelectItem>
              <SelectItem value="System Default">System Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
