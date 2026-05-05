"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Eye, EyeOff } from "lucide-react";

type ShareAccessResponse = {
  documentId: string;
  allowDownload: boolean;
  allowComments: boolean;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

export default function SharePage() {
  const params = useParams();
  const shareToken = params.token as string;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState<ShareAccessResponse | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [documentName, setDocumentName] = useState("Document");
  const [downloading, setDownloading] = useState(false);
  

  const handleAccess = async () => {
    
    const jwt = localStorage.getItem("token");
    const res = await fetch(`${API}/api/share-links/${shareToken}/access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(jwt && { Authorization: `Bearer ${jwt}` }),
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Access failed");
      return;
    }

    const d = await res.json();
    setData(d);
    setDocumentName(d.documentName || "Document");


    if (d.allowComments) {
      loadComments();
    }
  };

  const loadComments = async () => {
    const res = await fetch(`${API}/api/comments/${shareToken}`);
    if (res.ok) {
      setComments(await res.json());
    } 
 };

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

    } catch (error) {
      alert("Error downloading file");
    } finally {
      setDownloading(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    const jwt = localStorage.getItem("token");
    const res = await fetch(`${API}/api/comments/${shareToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ content: comment }),
      
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text || "Failed to add comment");
      return;
    }

    setComment("");
    loadComments();
  };

  // Edit comment
  const editComment = async (id: string, content: string) => {
    const jwt = localStorage.getItem("token");

    const res = await fetch(`${API}/api/comments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      alert("Failed to edit comment");
      return;
    }

    loadComments();
  };

  // Delete comment
  const deleteComment = async (id: string) => {
    const jwt = localStorage.getItem("token");

    const res = await fetch(`${API}/api/comments/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      alert("Failed to delete comment");
      return;
    }

    loadComments();
  };

  // Password screen
  if (!data) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Access Document</h2>

        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            className="border border-gray-300 p-2 w-full rounded-md text-sm focus:ring-2 focus:ring-[#953002] focus:border-transparent pr-10"
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAccess()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
        </button>
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

  // Document view
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

        {/* Comments Section */}
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
                      <button
                        onClick={() => {
                          const newContent = prompt("Edit comment:", c.content);
                          if (newContent) editComment(c.id, newContent);
                        }}
                        className="text-blue-600 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteComment(c.id)}
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