import React from 'react';
import { Share2, Download, User, Calendar, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Imported precisely as requested
import ApprovalAction from '@/components/ui/search/aproval-action';

export default function DocumentDetailsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#8a3c26] mb-2">
            Invoice_Q1_2025.pdf
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>John Doe</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Feb 5, 2026</span>
            </div>
            <Badge className="bg-[#8a3c26] hover:bg-[#70301d] text-white">
              Approved
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (PDF Preview & Approval Actions) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PDF Preview Placeholder (Replace with PDF.js viewer later) */}
          <div className="bg-[#f4f4f5] border border-gray-200 rounded-lg flex flex-col items-center justify-center min-h-[600px]">
            <FileText className="w-16 h-16 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-700">
              PDF Document Preview
            </h3>
            <p className="text-sm text-gray-500">2.4 MB • 5 pages</p>
          </div>

          {/* Imported Approval Component */}
          <ApprovalAction />
        </div>

        {/* Right Column (Side Panels) */}
        <div className="space-y-6">
          {/* Document Information Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-600">Document Type</Label>
                <Input value="Invoice" readOnly className="bg-gray-50/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600">Document Number</Label>
                <Input value="INV-2025-Q1-001" readOnly className="bg-gray-50/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600">Amount</Label>
                <Input value="$12,450.00" readOnly className="bg-gray-50/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600">Vendor</Label>
                <Input value="ABC Corporation" readOnly className="bg-gray-50/50" />
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="transform rotate-45">🏷️</span> Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="text-gray-700">Finance</Badge>
                <Badge variant="outline" className="text-gray-700">Q1 2025</Badge>
                <Badge variant="outline" className="text-gray-700">Urgent</Badge>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500">
                  <Plus className="w-3 h-3 mr-1" /> Add Tag
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Version History Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                ⏱️ Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              
              {/* Version 2.0 */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">v2.0</span>
                    <Badge className="bg-[#8a3c26] hover:bg-[#70301d] text-[10px] h-5">
                      Current
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">John Doe</div>
                  <div className="text-xs text-gray-500">Feb 5, 2026 10:30 AM</div>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <Download className="w-4 h-4" />
                </Button>
              </div>

              {/* Version 1.1 */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">v1.1</span>
                  </div>
                  <div className="text-xs text-gray-600">Jane Smith</div>
                  <div className="text-xs text-gray-500">Feb 3, 2026 02:15 PM</div>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-500">
                  <Download className="w-4 h-4" />
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}