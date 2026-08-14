import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DangerZoneCard() {
  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear the system cache?")) {
      console.log("System cache cleared.");
    }
  };

  const handleResetSettings = () => {
    if (window.confirm("Are you sure you want to restore the system to default configuration? This action cannot be undone.")) {
      console.log("System settings reset.");
    }
  };

  return (
    <Card className="border-red-200 shadow-sm bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={24} />
          <div>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription className="text-gray-500">Irreversible actions - proceed with caution</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/30">
          <div>
            <p className="font-medium text-gray-900">Clear System Cache</p>
            <p className="text-sm text-gray-500">Remove all cached data to free up space</p>
          </div>
          <Button variant="destructive" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/30">
          <div>
            <p className="font-medium text-gray-900">Reset All Settings</p>
            <p className="text-sm text-gray-500">Restore system to default configuration</p>
          </div>
          <Button variant="destructive" onClick={handleResetSettings}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
