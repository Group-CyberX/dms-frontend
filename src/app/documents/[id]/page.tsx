"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Share2, Download, User, Calendar, FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import ApprovalAction from '@/components/ui/search/aproval-action';
import { getDocumentById, getDocumentTags } from '@/lib/api';

export default function DocumentDetailsPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch document details
        const docData = await getDocumentById(documentId);
        setDoc(docData);

        // Fetch tags
        const tagsData = await getDocumentTags(documentId);
        setTags(tagsData);
      } catch (error) {
        console.error("Error fetching document data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#8a3c26]" />
        <span className="ml-3 text-lg font-medium text-gray-600">Loading document...</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-500">Document not found</div>
      </div>
    );
  }

  // Map metadata array into a key-value object for easy lookup
  const metaObj: Record<string, string> = {};
  if (doc.metadata && Array.isArray(doc.metadata)) {
    doc.metadata.forEach((m: any) => {
      metaObj[m.key.toLowerCase()] = m.value;
    });
  }

  // Fallback info if not available in DB
  const displayStatus = metaObj["status"] || "Pending";
  const displayOwner = metaObj["owner"] || "System Admin";
  const displayDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Just now";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#8a3c26] mb-2">
            {doc.title || "Untitled Document"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{displayOwner}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{displayDate}</span>
            </div>
            <Badge className={`${
              displayStatus.toLowerCase() === 'approved' 
                ? 'bg-[#8a3c26] hover:bg-[#70301d]' 
                : 'bg-[#Eab308] hover:bg-[#ca8a04]'
            } text-white`}>
              {displayStatus}
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
          {/* PDF Preview Placeholder */}
          <div className="bg-[#f4f4f5] border border-gray-200 rounded-lg flex flex-col items-center justify-center min-h-[600px]">
            <FileText className="w-16 h-16 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-700">
              PDF Document Preview
            </h3>
            <p className="text-sm text-gray-500">Preview not available</p>
          </div>

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
              {Object.keys(metaObj).length === 0 ? (
                <div className="text-sm text-gray-500 italic">No metadata available</div>
              ) : (
                Object.entries(metaObj).map(([key, value]) => {
                  if (key === 'status' || key === 'owner') return null; // We show these in the header already
                  
                  return (
                    <div className="space-y-1.5" key={key}>
                      <Label className="text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <Input value={value} readOnly className="bg-gray-50/50" />
                    </div>
                  );
                })
              )}
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
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-500 italic">No tags attached</span>
                ) : (
                  tags.map(t => (
                    <Badge key={t.id || t.tagId || t.name} variant="outline" className="text-gray-700">
                      {t.tagName || t.name}
                    </Badge>
                  ))
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 ml-auto">
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
              
              {/* Fake Version History list since there's no backend endpoint for it yet */}
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">v1.0</span>
                    <Badge className="bg-[#8a3c26] hover:bg-[#70301d] text-[10px] h-5">
                      Current
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">{displayOwner}</div>
                  <div className="text-xs text-gray-500">{displayDate}</div>
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