"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

type ShareAccessResponse = {
  documentId: string;
  allowDownload: boolean;
  allowComments: boolean;
  documentName?: string;
};

type ShareComment = {
  id: string;
  content: string;
  createdAt?: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

export default function SharePage() {
  const params = useParams();
  // Token from URL used to access shared document
  const shareToken = params.token as string;

  const [password, setPassword] = useState("");
  const [data, setData] = useState<ShareAccessResponse | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [documentName, setDocumentName] = useState("Document");
  // UI states for loading and access control
  const [downloading, setDownloading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  // States for editing comments
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Helper function to attach JWT token to requests
  const getAuthHeaders = () => {
    const jwt = localStorage.getItem("token");
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  };
  
  // Check whether user can access the shared document
  const handleAccess = async (value: string = password) => {
    setCheckingAccess(true);

    const jwt = localStorage.getItem("token");
    // Send request to backend to validate access (password / auth)
    const res = await fetch(`${API}/api/share-links/${shareToken}/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(jwt && { Authorization: `Bearer ${jwt}` }),
      },
      body: JSON.stringify({ password: value }),
    });

    // Handle access errors (invalid password, expired link, etc.)
    if (!res.ok) {
      const text = await res.text();
      if (text.includes("Password required") || text.includes("Invalid password")) {
        setNeedsPassword(true);
      } else {
        alert(text || "Access failed");
      }
      setCheckingAccess(false);
      return;
    }
    // On successful access, load document details and comments if allowed
    const d = await res.json();
    setData(d);
    setDocumentName(d.documentName || "Document");
    setNeedsPassword(false);
    setCheckingAccess(false);

    // If comments are allowed, load existing comments for the document
    if (d.allowComments) {
      loadComments();
    }
  };

  // Reset state when share token changes
  useEffect(() => {
    setPassword("");
    setData(null);
    setComments([]);
    setNeedsPassword(false);
    setCheckingAccess(true);
    handleAccess("");
  }, [shareToken]);

  // Fetch all comments for this shared document
  const loadComments = async () => {
    const res = await fetch(`${API}/api/comments/${shareToken}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert("Please log in again to view comments");
      }
      return;
    }

    const data = await res.json();
    setComments(Array.isArray(data) ? data : []);
 };

  // Download document if permission is granted
 const handleDownload = async () => {
    if (!data?.allowDownload) {
      alert("Download not allowed");
      return;
    }

    try {
      setDownloading(true);

      const jwt = localStorage.getItem("token");

      const res = await fetch(
        `${API}/api/share-links/${shareToken}/download?password=${password}`,
        {
          method: "GET",
          headers: {
            ...(jwt && { Authorization: `Bearer ${jwt}` }),
          },
        }
      );

      // Handle download errors (permissions, expired link, etc.)
      if (!res.ok) {
        const text = await res.text();
        alert(text || "Download failed");
        return;
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName;
      a.click();

    } catch {
      alert("Error downloading file");
    } finally {
      setDownloading(false);
    }
  };

  // Add a new comment to the shared document
  const addComment = async () => {
    if (!comment.trim()) {
      alert("Comment cannot be empty");
      return;
    }
    // Send POST request to backend to create a new comment
    const res = await fetch(`${API}/api/comments/${shareToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content: comment }),
      
    });

    // Handle errors when adding comment (permissions, validation, etc.)
    if (!res.ok) {
      const text = await res.text();
      alert(text || "Failed to add comment");
      return;
    }

    setComment("");
    await loadComments();
  };

  // Edit an existing comment by its ID
  const editComment = async (id: string, content: string) => {
    const res = await fetch(`${API}/api/comments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      alert("Failed to edit comment");
      return;
    }

    await loadComments();
  };

  // Delete a comment by its ID after user confirmation
  const deleteComment = async (id: string) => {
    const res = await fetch(`${API}/api/comments/${id}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      alert("Failed to delete comment");
      return;
    }

    await loadComments();
  };

  // Show password input if required or access is still checking
  if (!data) {
  if (checkingAccess && !needsPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg w-80">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Access Document</h2>
          <p className="text-sm text-gray-600">Checking link access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Access Document</h2>

        <div className="relative mb-3">
          <input
            type="password"
            className="border border-gray-300 p-2 w-full rounded-md text-sm focus:ring-2 focus:ring-[#953002] focus:border-transparent pr-10"
            placeholder="Enter password"
            name={`share-access-password-${shareToken}`}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAccess()}
          />
        </div>

        <Button
          onClick={handleAccess}
          className="w-full bg-[#953002] hover:bg-[#7a2600] text-white py-2 rounded-md"
        >
          Access Document
        </Button>
      </div>
    </div>
  );
 }

  // Main document view after access is granted
  return (
    <div className="bg-white min-h-screen">
      {/* Document Header */}
      <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{documentName}</h1>
        {data.allowDownload && (
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-[#953002] hover:bg-[#7a2600] text-white flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading..." : "Download"}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Document Preview */}
        <div className="bg-gray-50 rounded-lg p-12 mb-8 border border-gray-200 flex items-center justify-center min-h-96">
          <div className="text-center">
            <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">PDF Document Preview</p>
            <p className="text-sm text-gray-500">Document viewer integration here</p>
          </div>
        </div>

        {/* Show comments section only if allowed by share settings */}
        {data.allowComments && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Comments</h2>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                className="border border-gray-300 w-full p-3 rounded-md focus:ring-2 focus:ring-[#953002] focus:border-transparent resize-none"
                rows={4}
                placeholder="Add your comment here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                onClick={addComment}
                className="mt-3 bg-[#953002] hover:bg-[#7a2600] text-white px-6 py-2 rounded-md"
              >
                Add Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-gray-50 border border-gray-200 p-4 rounded-md"
                  >
                    <p className="text-gray-700">{c.content}</p>

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-2 mt-3">
                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditText(c.content);
                        }}
                        className="text-blue-600 text-sm"
                      >
                        Edit
                      </button>

                      {/* Edit Input */}
                      {editingId === c.id && (
                        <div className="mt-2">
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="border px-2 py-1 rounded w-full"
                          />
                          <button
                            onClick={() => {
                              editComment(c.id, editText);
                              setEditingId(null);
                            }}
                            className="text-green-600 text-sm mt-1"
                          >
                            Save
                          </button>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          const confirmDelete = confirm("Are you sure you want to delete?");
                          if (confirmDelete) deleteComment(c.id);
                        }}
                        className="text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}