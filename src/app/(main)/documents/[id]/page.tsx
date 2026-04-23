"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Share2, Download, User, Calendar, FileText, Plus, Loader2, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import ApprovalAction from '@/components/ui/search/aproval-action';
import { getDocumentById, getDocumentTags, updateMetadata, deleteMetadata, addMetadata } from '@/lib/api';

export default function DocumentDetailsPage() {
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Metadata Edit States
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Add Metadata States
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fetchData = async () => {
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
  };

  useEffect(() => {
    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  const handleUpdateMeta = async (key: string) => {
    try {
      await updateMetadata(documentId, key, editValue);
      setEditingKey(null);
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to update metadata", error);
      alert("Failed to update metadata");
    }
  };

  const handleDeleteMeta = async (key: string) => {
    if (!confirm("Are you sure you want to delete this metadata?")) return;
    try {
      await deleteMetadata(documentId, key);
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to delete metadata", error);
      alert("Failed to delete metadata");
    }
  };

  const handleAddMeta = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      alert("Key and Value are required");
      return;
    }
    try {
      await addMetadata(documentId, newKey, newValue);
      setIsAdding(false);
      setNewKey('');
      setNewValue('');
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to add metadata", error);
      alert("Failed to add metadata. Key might already exist.");
    }
  };

  if (loading && !doc) {
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
  let displayStatus = "Pending";
  let displayOwner = "System Admin";

  if (doc.metadata && Array.isArray(doc.metadata)) {
    doc.metadata.forEach((m: any) => {
      // Keep the EXACT key for saving/updating back to the database!
      metaObj[m.key] = m.value;
      
      // Capture these specific keys ignoring case for the header
      const lowerKey = m.key.toLowerCase();
      if (lowerKey === "status") displayStatus = m.value;
      if (lowerKey === "owner") displayOwner = m.value;
    });
  }

  // Fallback info if not available in DB
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Document Information
              </CardTitle>
              {!isAdding && (
                <Button variant="ghost" size="icon" onClick={() => setIsAdding(true)} className="h-8 w-8 text-[#8a3c26]">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Add New Metadata Inline Form */}
              {isAdding && (
                <div className="p-3 border border-[#8a3c26]/20 bg-[#8a3c26]/5 rounded-lg space-y-3 mb-4">
                  <div className="text-xs font-semibold text-[#8a3c26] mb-1">Add Metadata</div>
                  <Input 
                    placeholder="Key (e.g. Department)" 
                    value={newKey} 
                    onChange={e => setNewKey(e.target.value)} 
                    className="h-8 text-sm"
                  />
                  <Input 
                    placeholder="Value (e.g. HR)" 
                    value={newValue} 
                    onChange={e => setNewValue(e.target.value)} 
                    className="h-8 text-sm"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs bg-[#8a3c26] hover:bg-[#70301d]" onClick={handleAddMeta}>Save</Button>
                  </div>
                </div>
              )}

              {Object.keys(metaObj).length === 0 ? (
                <div className="text-sm text-gray-500 italic">No metadata available</div>
              ) : (
                Object.entries(metaObj).map(([key, value]) => {
                  const lowerKey = key.toLowerCase();
                  if (lowerKey === 'status' || lowerKey === 'owner') return null; // We show these in the header already
                  
                  const isEditing = editingKey === key;
                  const isSystemKey = lowerKey === 'file-size' || lowerKey === 'content-type' || lowerKey === 'word-count';

                  return (
                    <div className="space-y-1.5 group" key={key}>
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        
                        {/* Actions (Only show for non-system keys, visible on hover) */}
                        {!isSystemKey && !isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => { setEditingKey(key); setEditValue(value); }} className="p-1 text-gray-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteMeta(key)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleUpdateMeta(key)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingKey(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <Input 
                          value={editValue} 
                          onChange={(e) => setEditValue(e.target.value)} 
                          className="border-green-300 focus-visible:ring-green-200" 
                          autoFocus
                        />
                      ) : (
                        <Input value={value} readOnly className="bg-gray-50/50 outline-none focus-visible:ring-0 cursor-default" />
                      )}
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