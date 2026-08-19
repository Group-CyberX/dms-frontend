"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Lock, MapPin, MessageSquare, Save, Trash2, Type, X } from "lucide-react";
import { FileWarning } from "lucide-react";
import { fetchWithAuth } from "@/lib/api-client";
import { DocumentPreview } from "@/components/ui/DocumentPreview";
import { AnnotatablePdf, type AnnotationPin } from "@/components/ui/share/annotatable-pdf";
import { useDocumentLock } from "@/hooks/use-document-lock";
import { useAuthStore } from "@/store/auth-store";
import { useConfirm } from "@/hooks/use-confirm";
import { notify, apiMessage } from "@/lib/feedback";

type ShareAccessResponse = {
  documentId: string;
  allowDownload: boolean;
  allowComments: boolean;
  /** VIEW | COMMENT | EDIT */
  accessLevel?: string;
  canComment?: boolean;
  canEdit?: boolean;
  documentName?: string;
  fileName?: string;
};

type ShareComment = {
  id: string;
  content: string;
  createdAt?: string;
  updatedAt?: string | null;
  userId?: string | null;
  /** Display name of whoever wrote it. */
  authorName?: string | null;
  /**
   * Set by the backend: true when this caller may edit or delete it. The page
   * cannot work this out on its own - nothing in the login response or the JWT
   * carries the visitor's own user id to compare against.
   */
  mine?: boolean;
  pageNumber?: number | null;
  anchorX?: number | null;
  anchorY?: number | null;
  /** COMMENT = pinned note, TEXT = typewriter text drawn onto the page. */
  annotationType?: 'COMMENT' | 'TEXT' | null;
};

/** Whose comment it is, and so whether Edit and Delete are offered. */
const isOwnComment = (c: ShareComment, currentUserId: string | null) =>
  c.mine ?? (currentUserId != null && c.userId === currentUserId);

/** Best available label for a comment's author. */
const authorLabel = (c: ShareComment, currentUserId: string | null) =>
  isOwnComment(c, currentUserId) ? "You" : c.authorName || "Reviewer";

/** Which annotation the next click on the page creates. */
type Tool = 'comment' | 'text';

type PendingAnchor = { pageNumber: number; x: number; y: number };

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api").replace(/\/api\/?$/, "");
// Comments are a review conversation, not a live cursor: 15s is well inside
// what a reviewer notices, and a third of the connection pressure of 5s.
const COMMENT_POLL_MS = 15000;

export default function SharePage() {
  const confirm = useConfirm();
  const params = useParams();
  const shareToken = params.token as string;
  const currentUserId = useAuthStore((s) => s.userId);

  const [password, setPassword] = useState("");
  const [data, setData] = useState<ShareAccessResponse | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [documentName, setDocumentName] = useState("Document");
  const [downloading, setDownloading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  /** Set when the link itself is refused - revoked, expired or unknown. */
  const [accessError, setAccessError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'docx' | 'xlsx' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Annotation state
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnchor | null>(null);
  const [tool, setTool] = useState<Tool>('comment');
  const [textAnchor, setTextAnchor] = useState<PendingAnchor | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const commentBoxRef = useRef<HTMLTextAreaElement | null>(null);

  const canComment = Boolean(data?.canComment ?? data?.allowComments);
  const canEdit = Boolean(data?.canEdit);

  // The lock only applies to links that can actually change the document.
  // Acquired lazily on the first edit action rather than on open, so simply
  // reading through an edit-capable link does not block everyone else.
  const lock = useDocumentLock(data?.documentId ?? null, {
    acquireOnMount: false,
    enabled: canEdit,
  });

  const getDocumentType = (fileName: string): 'image' | 'pdf' | 'docx' | 'xlsx' | null => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx') return 'docx';
    if (ext === 'xlsx') return 'xlsx';
    return null;
  };

  const loadPreview = async (fileName: string) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await fetchWithAuth(
        `${API}/api/share-links/${shareToken}/preview?password=${password}`,
        { method: "GET" }
      );

      if (!res.ok) {
        const text = await res.text();
        setPreviewError(text || "Failed to load preview");
        return;
      }

      const blob = await res.blob();
      setPreviewUrl(window.URL.createObjectURL(blob));
      setPreviewType(getDocumentType(fileName));
    } catch (err) {
      console.error("Error loading preview:", err);
      setPreviewError("Error loading preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadComments = useCallback(async () => {
    const res = await fetchWithAuth(`${API}/api/comments/${shareToken}`);
    if (!res.ok) return;
    const body = await res.json();
    setComments(Array.isArray(body) ? body : []);
  }, [shareToken]);

  const handleAccess = async (value: string = password) => {
    setCheckingAccess(true);

    const res = await fetchWithAuth(`${API}/api/share-links/${shareToken}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: value }),
    });

    if (!res.ok) {
      const message = await apiMessage(res, "This link could not be opened.");
      if (message.includes("Password required") || message.includes("Invalid password")) {
        setNeedsPassword(true);
        if (value) notify.error("That password is not right.");
      } else {
        setAccessError(message);
      }
      setCheckingAccess(false);
      return;
    }

    setAccessError(null);

    const d = await res.json();
    setData(d);
    setDocumentName(d.documentName || "Document");
    setNeedsPassword(false);
    setCheckingAccess(false);

    // Use the server's canComment, not the raw checkbox: an Edit link can
    // annotate even when "allow comments" was never ticked, and reading the
    // wrong field is what left the drawer empty.
    if (d.canComment ?? d.allowComments) loadComments();
    if (d.fileName) loadPreview(d.fileName); else setPreviewLoading(false);
  };

  // Reset when the token changes
  useEffect(() => {
    setPassword("");
    setData(null);
    setComments([]);
    setNeedsPassword(false);
    setCheckingAccess(true);
    setPendingAnchor(null);
    setPreviewUrl((prev) => { if (prev) window.URL.revokeObjectURL(prev); return null; });
    setPreviewType(null);
    setPreviewError(null);
    setPreviewLoading(true);
    handleAccess("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken]);

  // Live collaboration: other reviewers' comments appear without a refresh.
  //
  // A shared link is normally left open in a background tab for long stretches,
  // and every poll takes one of the few database connections the whole
  // application shares. So polling runs only while the tab is actually being
  // looked at, and catches up in one request when the reader returns.
  useEffect(() => {
    if (!data || !canComment) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const sync = () => {
      if (window.document.visibilityState === "visible") {
        if (!timer) {
          loadComments();
          timer = setInterval(loadComments, COMMENT_POLL_MS);
        }
      } else {
        stop();
      }
    };

    sync();
    window.document.addEventListener("visibilitychange", sync);

    return () => {
      stop();
      window.document.removeEventListener("visibilitychange", sync);
    };
  }, [data, canComment, loadComments]);

  const handleDownload = async () => {
    if (!data?.allowDownload) {
      notify.error("This link does not allow downloads.");
      return;
    }
    try {
      setDownloading(true);
      const res = await fetchWithAuth(
        `${API}/api/share-links/${shareToken}/download?password=${password}`,
        { method: "GET" }
      );
      if (!res.ok) {
        notify.error(await apiMessage(res, "The download could not be started."));
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName;
      a.click();
    } catch {
      notify.error("The download could not be completed. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Clicking the page does one of two things depending on the active tool:
   * stage an anchor for the next comment, or open a text box to type into.
   */
  const handlePlaceAnchor = async (pageNumber: number, x: number, y: number) => {
    if (canEdit && !lock.holdsLock) {
      const acquired = await lock.acquire();
      if (!acquired) return; // banner explains who holds it
    }

    setSelectedPinId(null);

    if (tool === 'text') {
      setTextAnchor({ pageNumber, x, y });
      setPendingAnchor(null);
      return;
    }

    setPendingAnchor({ pageNumber, x, y });
    commentBoxRef.current?.focus();
  };

  /** Saves typewriter text as an annotation anchored where it was typed. */
  const commitTypedText = async (value: string) => {
    const anchor = textAnchor;
    setTextAnchor(null);
    if (!anchor || !value.trim()) return;

    const res = await fetchWithAuth(`${API}/api/comments/${shareToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: value.trim(),
        pageNumber: anchor.pageNumber,
        anchorX: anchor.x,
        anchorY: anchor.y,
        annotationType: 'TEXT',
      }),
    });

    if (!res.ok) {
      notify.error(await apiMessage(res, "Could not add that text."));
      return;
    }
    await loadComments();
  };

  const addComment = async () => {
    if (!comment.trim()) return;

    if (canEdit && !lock.holdsLock) {
      const acquired = await lock.acquire();
      if (!acquired) return;
    }

    const res = await fetchWithAuth(`${API}/api/comments/${shareToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: comment,
        pageNumber: pendingAnchor?.pageNumber ?? null,
        anchorX: pendingAnchor?.x ?? null,
        anchorY: pendingAnchor?.y ?? null,
        annotationType: 'COMMENT',
      }),
    });

    if (!res.ok) {
      notify.error(await apiMessage(res, "Could not add that comment."));
      return;
    }

    setComment("");
    setPendingAnchor(null);
    await loadComments();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  /** Reads the message the backend sent, whatever shape the error came in. */
  const errorMessage = async (res: Response, fallback: string) => {
    const body = await res.json().catch(() => null);
    return body?.message || fallback;
  };

  const editComment = async (id: string, content: string) => {
    if (!content.trim()) return;

    if (canEdit && !lock.holdsLock) {
      const acquired = await lock.acquire();
      if (!acquired) return;
    }

    const res = await fetchWithAuth(`${API}/api/comments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    if (!res.ok) {
      notify.error(await errorMessage(res, "Could not save that edit."));
      return;
    }

    setEditingId(null);
    setEditText("");
    await loadComments();
  };

  const deleteComment = async (id: string) => {
    if (!(await confirm({
      title: "Delete this annotation?",
      description: "It is removed from the review and from any version you save next.",
      confirmLabel: "Delete",
      tone: "destructive",
    }))) return;

    if (canEdit && !lock.holdsLock) {
      const acquired = await lock.acquire();
      if (!acquired) return;
    }

    const res = await fetchWithAuth(`${API}/api/comments/${id}`, { method: "DELETE" });

    if (!res.ok) {
      notify.error(await errorMessage(res, "Could not delete that annotation."));
      return;
    }

    // A deleted annotation must not stay selected, or the drawer keeps
    // highlighting a pin that is no longer on the page.
    if (selectedPinId === id) setSelectedPinId(null);
    if (editingId === id) setEditingId(null);
    await loadComments();
  };

  /** Writes every comment into the PDF and stores it as the next version. */
  const saveAsNewVersion = async () => {
    if (comments.length === 0) {
      notify.info("Add a comment or some text before saving a version.");
      return;
    }
    if (!(await confirm({
      title: `Save a new version with ${comments.length} annotation(s)?`,
      description: "The annotations are written into the document itself and stored as the next version.",
      confirmLabel: "Save version",
    }))) {
      return;
    }

    try {
      setSavingVersion(true);
      setSaveMessage(null);

      const res = await fetchWithAuth(`${API}/api/share-links/${shareToken}/save-version`, {
        method: "POST",
      });

      if (!res.ok) {
        notify.error(await apiMessage(res, "Could not save the new version."));
        return;
      }

      const result = await res.json();
      setSaveMessage(`Saved as version ${result.newVersionNumber} with ${result.commentsIncluded} annotation(s).`);
      if (data?.fileName) await loadPreview(data.fileName);
      await lock.refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not save the new version.");
    } finally {
      setSavingVersion(false);
    }
  };

  // Pins are numbered by their position in the full comment list so the numbers
  // match the summary page the backend appends when saving a version.
  // Numbering counts only real comments, because typewriter text is drawn into
  // the page rather than listed - the badge here has to match the mark there.
  let commentNumber = 0;
  const numbered = comments.map((c) => ({
    c,
    number: c.annotationType === 'TEXT' ? 0 : ++commentNumber,
  }));

  const pins: AnnotationPin[] = numbered
    .filter(({ c }) => c.pageNumber != null && c.anchorX != null && c.anchorY != null)
    .map(({ c, number }) => ({
      id: c.id,
      pageNumber: c.pageNumber as number,
      anchorX: c.anchorX as number,
      anchorY: c.anchorY as number,
      number,
      author: authorLabel(c, currentUserId),
      content: c.content,
      type: (c.annotationType === 'TEXT' ? 'TEXT' : 'COMMENT') as 'COMMENT' | 'TEXT',
    }));

  // ---- Access gate -----------------------------------------------------
  if (!data) {
    // A revoked, expired or unknown link has nothing behind it, so the page
    // says so instead of leaving "Checking link access..." on screen forever.
    if (accessError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f7ede8] text-[#953002]">
              <FileWarning className="h-6 w-6" />
            </span>
            <h1 className="text-lg font-semibold text-gray-900">
              This link is no longer available
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{accessError}</p>
            <p className="mt-4 text-sm text-gray-500">
              Ask whoever shared it with you for a new link.
            </p>
          </div>
        </div>
      );
    }

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
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAccess()}
            />
          </div>
          <Button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); handleAccess(); }}
            className="w-full bg-[#953002] hover:bg-[#7a2600] text-white py-2 rounded-md"
          >
            Access Document
          </Button>
        </div>
      </div>
    );
  }

  const annotationMode = canComment && previewType === 'pdf' && previewUrl && !previewError;

  // ---- Document view ---------------------------------------------------
  return (
    <div className="bg-white min-h-screen">

      {/* Someone else is editing */}
      {lock.isLockedByOther && (
        <div className="flex items-center gap-2.5 border-b border-amber-200 bg-amber-50 px-8 py-3">
          <Lock className="h-4 w-4 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-900">
            <span className="font-semibold">{lock.lockedByUsername || "Another user"}</span> is
            editing this document. You can read and comment, but changes are held until they finish.
          </p>
        </div>
      )}

      <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{documentName}</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Shared link · {data.accessLevel || (canComment ? "COMMENT" : "VIEW")} access
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <Button
              onClick={saveAsNewVersion}
              disabled={savingVersion || lock.isLockedByOther || comments.length === 0}
              className="bg-[#8B2E00] hover:bg-[#722600] disabled:opacity-40 text-white flex items-center gap-2 px-4 py-2 rounded-md"
            >
              {savingVersion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingVersion ? "Saving..." : "Save as new version"}
            </Button>
          )}
          {data.allowDownload && (
            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
              className="flex items-center gap-2 px-4 py-2 rounded-md"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Downloading..." : "Download"}
            </Button>
          )}
        </div>
      </div>

      {saveMessage && (
        <div className="border-b border-green-200 bg-green-50 px-8 py-2.5 text-sm text-green-800">
          {saveMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">

        {/* Document */}
        <div className="flex-1 overflow-x-auto px-8 py-8">
          {previewLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#953002] animate-spin" />
                <p className="text-gray-600 mt-3 text-sm">Loading preview...</p>
              </div>
            </div>
          ) : previewError ? (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border border-red-200 p-6">
              <p className="text-red-600 font-medium">{previewError}</p>
            </div>
          ) : annotationMode ? (
            <AnnotatablePdf
              fileUrl={previewUrl as string}
              pins={pins}
              onPlace={lock.isLockedByOther ? null : handlePlaceAnchor}
              onPinClick={(id) => setSelectedPinId(id)}
              selectedPinId={selectedPinId}
              textAnchor={textAnchor}
              onCommitText={commitTypedText}
              onCancelText={() => setTextAnchor(null)}
            />
          ) : (
            <DocumentPreview url={previewUrl} type={previewType} title={documentName} />
          )}
        </div>

        {/* Comment drawer */}
        {canComment && (
          <aside className="w-full shrink-0 border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col">

              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                <MessageSquare className="h-4 w-4 text-[#8B2E00]" />
                <h2 className="text-sm font-bold text-gray-800">
                  Comments <span className="font-normal text-gray-400">({comments.length})</span>
                </h2>
              </div>

              {/* Tool switch. Only meaningful on a PDF, where there is a page
                  to click on; a general comment needs no tool. */}
              {annotationMode && (
                <div className="border-b border-gray-100 px-5 py-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Click on the document to
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setTool('comment'); setTextAnchor(null); }}
                      className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                        tool === 'comment'
                          ? 'border-[#8B2E00] bg-[#8B2E00] text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="mr-1 inline h-3 w-3" /> Pin a comment
                    </button>
                    <button
                      onClick={() => { setTool('text'); setPendingAnchor(null); }}
                      className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                        tool === 'text'
                          ? 'border-[#103A7A] bg-[#103A7A] text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Type className="mr-1 inline h-3 w-3" /> Type on it
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-gray-400">
                    {tool === 'text'
                      ? 'Typed text is written into the page itself when you save a version.'
                      : 'Comments become numbered marks with a summary page.'}
                  </p>
                </div>
              )}

              {/* New comment */}
              <div className="border-b border-gray-100 px-5 py-4">
                {pendingAnchor ? (
                  <div className="mb-2 flex items-center justify-between rounded-md bg-[#8B2E00]/5 px-2.5 py-1.5 text-xs text-[#8B2E00]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3 w-3" />
                      Pinned to page {pendingAnchor.pageNumber}
                    </span>
                    <button onClick={() => setPendingAnchor(null)} className="hover:text-[#5c1e00]" aria-label="Remove pin">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : annotationMode && (
                  <p className="mb-2 text-xs text-gray-400">
                    Click the document to pin your comment to a spot, or just write a general one.
                  </p>
                )}

                <textarea
                  ref={commentBoxRef}
                  className="w-full resize-none rounded-md border border-gray-300 p-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-[#953002]"
                  rows={3}
                  placeholder="Add your comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  onClick={addComment}
                  disabled={!comment.trim()}
                  className="mt-2 w-full bg-[#953002] hover:bg-[#7a2600] disabled:opacity-40 text-white py-2 rounded-md text-sm"
                >
                  {pendingAnchor ? "Add pinned comment" : "Add comment"}
                </Button>
              </div>

              {/* Thread */}
              <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                {comments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No comments yet</p>
                ) : (
                  numbered.map(({ c, number }) => {
                    const isEditing = editingId === c.id;
                    const isAnchored = c.pageNumber != null && c.anchorX != null;
                    const isMine = isOwnComment(c, currentUserId);
                    const isText = c.annotationType === 'TEXT';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedPinId(c.id)}
                        className={`rounded-md border p-3 text-sm transition cursor-pointer ${
                          selectedPinId === c.id
                            ? "border-[#8B2E00]/40 bg-[#8B2E00]/5"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            isText ? 'bg-[#103A7A]' : 'bg-[#8B2E00]'
                          }`}>
                            {isText ? <Type className="h-2.5 w-2.5" /> : number}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            {authorLabel(c, currentUserId)}
                          </span>
                          {isText && (
                            <span className="rounded bg-[#103A7A]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#103A7A]">
                              On page
                            </span>
                          )}
                          {isAnchored && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              <MapPin className="h-2.5 w-2.5" /> p.{c.pageNumber}
                            </span>
                          )}
                          {c.createdAt && (
                            <span className="ml-auto text-[10px] text-gray-400">
                              {c.updatedAt && "edited · "}
                              {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                // Escape abandons the edit, the same way it does
                                // for the typewriter box on the page.
                                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                              }}
                              className="w-full resize-none rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#953002]"
                              rows={3}
                            />
                            {isText && (
                              <p className="text-[11px] leading-snug text-gray-400">
                                This text is drawn onto the page - the change appears in the next version you save.
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => editComment(c.id, editText)}
                                disabled={!editText.trim() || editText.trim() === c.content}
                                className="rounded bg-[#00A130] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#008c2a] disabled:opacity-40"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded bg-[#E2E4E9] px-4 py-1.5 text-sm font-medium text-[#4A5568] hover:bg-[#D1D5DB]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap text-gray-700">{c.content}</p>
                            {isMine && (
                              <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 pt-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditText(c.content); }}
                                  className="text-sm font-medium text-[#8B4513] hover:text-[#A0522D]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteComment(c.id); }}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
