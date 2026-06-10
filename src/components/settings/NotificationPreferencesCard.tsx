import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Bell } from "lucide-react";
import { SettingsComponentProps } from "./types";

export default function NotificationPreferencesCard({ formData, updateForm }: SettingsComponentProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to receive notifications</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Email Notifications</p>
            <p className="text-sm text-gray-500">Receive notifications via email</p>
          </div>
          <Toggle
            checked={formData.emailNotifications}
            onToggle={(checked) => updateForm({ emailNotifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Push Notifications</p>
            <p className="text-sm text-gray-500">Receive browser push notifications</p>
          </div>
          <Toggle
            checked={formData.pushNotifications}
            onToggle={(checked) => updateForm({ pushNotifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Document Approval</p>
            <p className="text-sm text-gray-500">Notify when documents are approved or rejected</p>
          </div>
          <Toggle
            checked={formData.documentApproval}
            onToggle={(checked) => updateForm({ documentApproval: checked })}
          />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Workflow Updates</p>
            <p className="text-sm text-gray-500">Notify about workflow status changes</p>
          </div>
          <Toggle
            checked={formData.workflowUpdates}
            onToggle={(checked) => updateForm({ workflowUpdates: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">System Alerts</p>
            <p className="text-sm text-gray-500">Critical system notifications and alerts</p>
          </div>
          <Toggle
            checked={formData.systemAlerts}
            onToggle={(checked) => updateForm({ systemAlerts: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
