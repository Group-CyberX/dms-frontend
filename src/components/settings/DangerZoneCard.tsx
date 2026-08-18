import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/feedback";

export default function DangerZoneCard() {
  const confirm = useConfirm();
  const handleClearCache = async () => {
    if (await confirm({
      title: "Clear the system cache?",
      description: "Cached lookups are rebuilt on demand. Nothing stored is removed.",
      confirmLabel: "Clear cache",
    })) {
      notify.success("System cache cleared");
    }
  };

  const handleResetSettings = async () => {
    if (await confirm({
      title: "Restore default configuration?",
      description: "Every organisation setting returns to its shipped value. This cannot be undone.",
      confirmLabel: "Restore defaults",
      tone: "destructive",
    })) {
      notify.success("Settings restored to defaults");
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
