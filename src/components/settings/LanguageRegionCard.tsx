import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { SettingsComponentProps } from "./types";
import { Label } from "@/components/ui/label";

export default function LanguageRegionCard({ formData, updateForm }: SettingsComponentProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Globe className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Language & Region</CardTitle>
            <CardDescription>Set your preferred language and regional settings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Language</Label>
          <Select
            value={formData.language}
            onValueChange={(val) => updateForm({ language: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="German">German</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Timezone</Label>
          <Select
            value={formData.timezone}
            onValueChange={(val) => updateForm({ timezone: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</SelectItem>
              <SelectItem value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</SelectItem>
              <SelectItem value="UTC+0 (GMT)">UTC+0 (GMT)</SelectItem>
              <SelectItem value="UTC+5:30 (IST)">UTC+5:30 (IST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date Format</Label>
          <Select
            value={formData.dateFormat}
            onValueChange={(val) => updateForm({ dateFormat: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
