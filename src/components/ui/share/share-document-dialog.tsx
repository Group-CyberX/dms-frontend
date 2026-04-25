"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Link2, Lock, Calendar, ChevronDown, Eye, EyeOff } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const SHARE_LINK_ENDPOINT = `${API_BASE_URL}/api/share-links`;
const COPY_TIMEOUT_MS = 2000;
const DEFAULT_EXPIRY_DAYS = 7;

type AccessLevel = "VIEW" | "COMMENT" | "EDIT";

interface ShareDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentTitle: string;
    documentId: string;
}

interface ShareLinkResponse {
    url: string;
    expiresAt: string;
    accessLevel: AccessLevel;
}

export default function ShareDocumentDialog({
    open,
    onOpenChange,
    documentTitle,
    documentId,
}: ShareDocumentDialogProps) {
    const [accessLevel, setAccessLevel] = useState<AccessLevel>("VIEW");
    const [linkExpiry, setLinkExpiry] = useState<number>(DEFAULT_EXPIRY_DAYS);
    const [copied, setCopied] = useState<boolean>(false);
    const [requireAuth, setRequireAuth] = useState<boolean>(true);
    const [allowDownload, setAllowDownload] = useState<boolean>(false);
    const [allowComments, setAllowComments] = useState<boolean>(true);
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [generatedLink, setGeneratedLink] = useState<string>("");
    const [token, setToken] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            if (!documentId || !documentTitle) {
                setError("Document information is missing");
                return;
            }

            const jwt = localStorage.getItem("token"); // ✅ ADD THIS

const response = await fetch(SHARE_LINK_ENDPOINT, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`, // 🔥 THIS IS THE FIX
    },
                body: JSON.stringify({
                    documentId: documentId,
                    accessLevel,
                    expiryDays: linkExpiry,
                    requireAuth,
                    allowDownload,
                    allowComments,
                    password: password || null,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Failed to generate share link");
            }

            const data = await response.json();
            setGeneratedLink(data.url);

            const extractedToken = data.url.split("/").pop() || "";
            setToken(extractedToken);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            console.error("Generate link error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (): Promise<void> => {
        try {
            const response = await fetch(
                `${SHARE_LINK_ENDPOINT}/${token}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to revoke link");
            }

            setGeneratedLink("");
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error revoking link";
            setError(errorMessage);
            console.error("Revoke error:", err);
        }
    };

    const handleCopyLink = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_TIMEOUT_MS);
        } catch (err) {
            setError("Failed to copy link");
            console.error("Copy error:", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-[#8B4513]" />
                        <DialogTitle>Share Document</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Create a secure share link for{" "}
                        <span className="font-medium text-gray-800">
                            {documentTitle}
                        </span>
                    </p>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Access Level */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                            <Lock className="w-4 h-4" />
                            Access Level
                        </label>
                        <div className="relative">
                            <select
                                value={accessLevel}
                                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#8B4513] appearance-none bg-white"
                            >
                                <option value="VIEW">View Only</option>
                                <option value="COMMENT">View & Comment</option>
                                <option value="EDIT">Edit</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Expiry */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                            <Calendar className="w-4 h-4" />
                            Link Expiry
                        </label>
                        <div className="relative">
                            <select
                                value={linkExpiry}
                                onChange={(e) => setLinkExpiry(Number(e.target.value))}
                                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#8B4513] appearance-none bg-white"
                            >
                                <option value={1}>1 Day</option>
                                <option value={7}>7 Days</option>
                                <option value={30}>30 Days</option>
                                <option value={90}>90 Days</option>
                                <option value={365}>1 Year</option>
                                <option value={0}>Never</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-sm font-medium text-gray-800 mb-2 block">
                            Password (optional)
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#8B4513]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-gray-500 hover:text-gray-700 transition"
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-800 mb-4">
                            Advanced Options
                        </h3>
                        <ToggleOption
                            label="Require Authentication"
                            description="Users must log in to access"
                            checked={requireAuth}
                            onChange={setRequireAuth}
                        />
                        <ToggleOption
                            label="Allow Download"
                            description="Users can download the document"
                            checked={allowDownload}
                            onChange={setAllowDownload}
                        />
                        <ToggleOption
                            label="Allow Comments"
                            description="Users can add comments"
                            checked={allowComments}
                            onChange={setAllowComments}
                        />
                    </div>

                    {/* Generated Link */}
                    {generatedLink && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded space-y-2">
                            <p className="text-sm font-medium text-gray-800">Generated Link</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={generatedLink}
                                    readOnly
                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleCopyLink}
                                    className="bg-[#8B4513] hover:bg-[#7a3d1f]"
                                >
                                    {copied ? "Copied!" : "Copy"}
                                </Button>
                            </div>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleRevoke}
                                className="w-full"
                            >
                                Revoke Link
                            </Button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="flex-1 bg-[#8B4513] hover:bg-[#7a3d1f]"
                        >
                            {loading ? "Generating..." : "Generate Share Link"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ToggleOptionProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
    return (
        <div className="flex items-start justify-between mb-4 last:mb-0">
            <div className="flex-1 pr-4">
                <div className="text-sm font-medium text-gray-800">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{description}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8B4513] peer-focus:ring-offset-1 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B85C2E]"></div>
            </label>
        </div>
    );
}