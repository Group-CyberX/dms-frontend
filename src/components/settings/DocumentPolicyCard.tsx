import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { FileText } from "lucide-react";
import { SettingsComponentProps } from "./types";
import { Label } from "@/components/ui/label";

export default function DocumentPolicyCard({ formData, updateForm }: SettingsComponentProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="text-[#953002]" size={24} />
          <div>
            <CardTitle>Document Policy Management</CardTitle>
            <CardDescription>Configure document retention, storage, and compliance policies</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Default Retention Period (Days)</Label>
          <Select
            value={formData.defaultRetentionDays}
            onValueChange={(val) => updateForm({ defaultRetentionDays: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="365 Days">1 Year (365 days)</SelectItem>
              <SelectItem value="1095 Days">3 Years (1,095 days)</SelectItem>
              <SelectItem value="2555 Days">7 Years (2,555 days)</SelectItem>
              <SelectItem value="Indefinite">Indefinite</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">Documents will be automatically archived after this period</p>
        </div>

        <div>
          <Label>Recycle Bin Retention (Days)</Label>
          <Select
            value={formData.recycleBinRetentionDays}
            onValueChange={(val) => updateForm({ recycleBinRetentionDays: val })}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select recycle bin retention" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14 Days">14 Days</SelectItem>
              <SelectItem value="30 Days">30 Days</SelectItem>
              <SelectItem value="90 Days">90 Days</SelectItem>
              <SelectItem value="Never">Never Empty Automatically</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">Deleted documents permanently removed after this period</p>
        </div>

        <div className="flex items-center justify-between border-t pt-4 border-b pb-4">
          <div>
            <p className="font-medium text-gray-900">Automatic Version Control</p>
            <p className="text-sm text-gray-500">Keep previous versions when documents are updated</p>
          </div>
          <Toggle
            checked={formData.automaticVersionControl}
            onToggle={(checked) => updateForm({ automaticVersionControl: checked })}
          />
        </div>

        <div>
          <Label>Max Versions Per Document</Label>
          <Input
            type="number"
            className="mt-1"
            value={formData.maxVersionsPerDocument}
            onChange={(e) => updateForm({ maxVersionsPerDocument: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-gray-500 mt-2">Older versions will be automatically removed</p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="font-medium text-gray-900">Mandatory Document Classification</p>
            <p className="text-sm text-gray-500">Require users to classify documents on upload</p>
          </div>
          <Toggle
            checked={formData.mandatoryClassification}
            onToggle={(checked) => updateForm({ mandatoryClassification: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
