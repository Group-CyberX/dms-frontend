import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Key } from "lucide-react";
import { SettingsComponentProps } from "./types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ApiKeysCard({ formData, updateForm }: SettingsComponentProps) {
  const handleRegenerate = () => {
    // In a real app, this would call an API
    updateForm({
      apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      apiKeyLastRegenerated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    });
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Key className="text-[#953002]" size={24} />
          <div>
            <CardTitle>API Key Management</CardTitle>
            <CardDescription>Manage API keys for external integrations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Current API Key</Label>
          <div className="flex gap-4 mt-1">
            <Input
              readOnly
              value={formData.apiKey}
              className="font-mono bg-gray-50 text-gray-500 flex-1"
            />
            <Button variant="outline" onClick={handleRegenerate}>Regenerate</Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Last regenerated: {formData.apiKeyLastRegenerated}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
