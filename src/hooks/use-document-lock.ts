'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  lockDocument,
  unlockDocument,
  getDocumentLockStatus,
  DocumentLockedError,
  type DocumentLockStatus,
} from '@/lib/api-client';

const POLL_INTERVAL_MS = 15000;

interface Options {
  /**
   * Take the lock as soon as the document opens. Use false where the page is
   * primarily for reading and editing starts on demand.
   */
  acquireOnMount?: boolean;
  /** Skip everything - for example on a view-only share link. */
  enabled?: boolean;
}

/**
 * Holds a document for editing while the component is mounted.
 *
 * Deliberately local state rather than a Zustand store: a lock belongs to one
 * open document, so global state would only risk going stale across
 * navigations. The lock is released on unmount, on an explicit release, and -
 * best effort - when the tab closes.
 */
export function useDocumentLock(documentId: string | null, options: Options = {}) {
  const { acquireOnMount = true, enabled = true } = options;

  const [status, setStatus] = useState<DocumentLockStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAcquiring, setIsAcquiring] = useState(false);

  // Tracked in a ref so the unmount cleanup knows whether to release without
  // re-running the effect every time the status changes.
  const holdsLockRef = useRef(false);

  const applyStatus = useCallback((next: DocumentLockStatus) => {
    setStatus(next);
    holdsLockRef.current = next.locked && next.heldByCurrentUser;
  }, []);

  /** Take the lock. Returns true when this user now holds it. */
  const acquire = useCallback(async (): Promise<boolean> => {
    if (!documentId || !enabled) return false;
    try {
      setIsAcquiring(true);
      setError(null);
      applyStatus(await lockDocument(documentId));
      return true;
    } catch (err) {
      if (err instanceof DocumentLockedError) {
        setError(err.message);
        // Refresh so the banner can name the holder.
        try {
          applyStatus(await getDocumentLockStatus(documentId));
        } catch {
          /* status is best effort here */
        }
      } else {
        setError(err instanceof Error ? err.message : 'Could not start editing');
      }
      return false;
    } finally {
      setIsAcquiring(false);
    }
  }, [documentId, enabled, applyStatus]);

  const release = useCallback(async () => {
    if (!documentId || !enabled || !holdsLockRef.current) return;
    try {
      applyStatus(await unlockDocument(documentId));
    } catch {
      // Losing a release is survivable - the lock expires on its own.
    }
  }, [documentId, enabled, applyStatus]);

  const refresh = useCallback(async () => {
    if (!documentId || !enabled) return;
    try {
      applyStatus(await getDocumentLockStatus(documentId));
    } catch {
      /* transient failures should not clear a good status */
    }
  }, [documentId, enabled, applyStatus]);

  // Initial acquire or status read
  useEffect(() => {
    if (!documentId || !enabled) return;
    if (acquireOnMount) {
      acquire();
    } else {
      refresh();
    }
  }, [documentId, enabled, acquireOnMount, acquire, refresh]);

  // Keep the banner honest: someone else's lock may expire while we watch.
  useEffect(() => {
    if (!documentId || !enabled) return;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [documentId, enabled, refresh]);

  // Release on unmount (covers navigation) and, best effort, on tab close.
  useEffect(() => {
    if (!documentId || !enabled) return;

    const releaseOnUnload = () => {
      if (!holdsLockRef.current) return;
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken') || localStorage.getItem('token')
          : null;
      // keepalive lets the request outlive the page.
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api'}/documents/${documentId}/unlock`,
        {
          method: 'POST',
          keepalive: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      ).catch(() => undefined);
    };

    window.addEventListener('beforeunload', releaseOnUnload);
    return () => {
      window.removeEventListener('beforeunload', releaseOnUnload);
      releaseOnUnload();
    };
  }, [documentId, enabled]);

  const isLockedByOther = Boolean(status?.locked && !status.heldByCurrentUser);

  return {
    status,
    error,
    isAcquiring,
    /** Someone else is editing - show the banner and disable the controls. */
    isLockedByOther,
    lockedByUsername: status?.lockedByUsername ?? null,
    /** Safe to change the document. */
    canEdit: !isLockedByOther,
    holdsLock: Boolean(status?.locked && status.heldByCurrentUser),
    acquire,
    release,
    refresh,
  };
}
