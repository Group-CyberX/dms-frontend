'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  initiateMultipartUpload,
  uploadPartChunk,
  completeMultipartUpload,
  getUploadProgress,
  abortMultipartUpload,
} from '@/lib/api-client';

interface MultipartUploadState {
  sessionId: string | null;
  partSize: number;
  uploadedBytes: number;
  totalBytes: number;
  percentComplete: number;
  isUploading: boolean;
  isPaused: boolean;
  error: string | null;
}

interface UploadMetadata {
  title: string;
  folderId?: string;
  category?: string;
  tags?: string;
  description?: string;
}

export const useMultipartUpload = () => {
  const [state, setState] = useState<MultipartUploadState>({
    sessionId: null,
    partSize: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    percentComplete: 0,
    isUploading: false,
    isPaused: false,
    error: null,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize multipart upload session with metadata
   */
  const initiateUpload = useCallback(async (file: File, metadata: UploadMetadata, documentId?: string) => {
    try {
      setState((prev) => ({ ...prev, error: null, isUploading: true }));

      const response = await initiateMultipartUpload(
        file.name,
        file.size,
        metadata.title,
        metadata.category || 'other',
        metadata.tags,
        metadata.description,
        documentId,
        metadata.folderId
      );

      setState((prev) => ({
        ...prev,
        sessionId: response.sessionId,
        partSize: response.partSize,
        totalBytes: file.size,
        uploadedBytes: 0,
        percentComplete: 0,
      }));

      return response;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to initiate upload';
      setState((prev) => ({ ...prev, error: errorMsg, isUploading: false }));
      throw error;
    }
  }, []);

  /**
   * Poll S3 for actual upload progress
   * This is the SOURCE OF TRUTH for progress bar
   */
  const startProgressPolling = useCallback((sessionId: string) => {
    console.log('[Polling] Starting S3 progress polling for session:', sessionId);
    let pollCount = 0;
    // Poll every 300ms (more aggressive) to get real S3 progress
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      try {
        const progress = await getUploadProgress(sessionId);
        console.log(`[Polling #${pollCount}] S3 Progress:`, { 
          uploadedBytes: progress.uploadedBytes, 
          totalBytes: progress.totalBytes,
          percentComplete: progress.percentComplete 
        });
        setState((prev) => ({
          ...prev,
          uploadedBytes: progress.uploadedBytes,
          totalBytes: progress.totalBytes,
          percentComplete: progress.percentComplete,
        }));
      } catch (error) {
        console.warn(`[Polling #${pollCount}] Failed to get S3 progress:`, error);
      }
    }, 300); // Check S3 every 300ms (more frequent than before)
  }, []);

  /**
   * Stop polling
   */
  const stopProgressPolling = useCallback(() => {
    console.log('[Polling] Stopping S3 progress polling');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Upload file chunks WITHOUT updating progress per chunk
   * Progress is tracked via S3 polling instead (see above)
   */
  const uploadChunks = useCallback(
    async (file: File, sessionId: string, partSize: number) => {
      const totalParts = Math.ceil(file.size / partSize);
      console.log('[Upload] Starting chunk upload:', { 
        fileName: file.name, 
        fileSize: file.size, 
        totalParts,
        partSize,
        sessionId 
      });

      // Start polling S3 progress in background
      startProgressPolling(sessionId);

      // Upload chunks silently - progress tracked via S3 polling
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (state.isPaused) {
          throw new Error('Upload paused');
        }

        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);
        const chunkFile = new File([chunk], `${file.name}.part${partNumber}`, {
          type: file.type,
        });

        let retries = 0;
        const maxRetries = 3;
        const baseDelay = 1000;
        const chunkUploadStartTime = Date.now();

        while (retries < maxRetries) {
          try {
            // Just upload - don't update progress here
            await uploadPartChunk(sessionId, partNumber, chunkFile);
            const chunkUploadDuration = Date.now() - chunkUploadStartTime;
            console.log(`[Upload] Part ${partNumber} uploaded in ${chunkUploadDuration}ms`);
            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, retries - 1);
            console.log(`[Upload] Part ${partNumber} failed, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      console.log('[Upload] All chunks uploaded, keeping polling active for finalization...');
      // DON'T STOP POLLING YET - let it continue so completeUpload can track S3 state
      // The polling will be stopped in completeUpload after completion
    },
    [state.isPaused, startProgressPolling, stopProgressPolling]
  );

  /**
   * Complete multipart upload
   * IMPORTANT: Keep polling active during completion to track S3 finalization
   */
  const completeUpload = useCallback(
    async (sessionId: string, metadata: UploadMetadata) => {
      try {
        console.log('[Upload] Completing multipart upload - KEEPING POLLING ACTIVE');
        // DO NOT stop polling yet - we need to monitor S3 finalization

        console.log('[Upload] Calling completeMultipartUpload API...');
        const response = await completeMultipartUpload(sessionId, metadata.title, {
          folderId: metadata.folderId,
          category: metadata.category,
          tags: metadata.tags,
          description: metadata.description,
        });

        console.log('[Upload] API response received, polling final state...');
        
        // Stop polling now that completion API is done
        stopProgressPolling();
        
        // Do final poll to ensure S3 shows 100%
        try {
          const finalProgress = await getUploadProgress(sessionId);
          console.log('[Upload] Final progress check:', finalProgress);
          setState((prev) => ({
            ...prev,
            uploadedBytes: finalProgress.uploadedBytes,
            totalBytes: finalProgress.totalBytes,
            percentComplete: 100,
            isUploading: false,
          }));
        } catch (e) {
          console.warn('[Upload] Final progress check failed, setting to 100%:', e);
          setState((prev) => ({
            ...prev,
            isUploading: false,
            percentComplete: 100,
          }));
        }

        console.log('[Upload] Multipart upload completed successfully');
        return response;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to complete upload';
        console.error('[Upload] Error completing upload:', errorMsg);
        stopProgressPolling();
        setState((prev) => ({ ...prev, error: errorMsg, isUploading: false }));
        throw error;
      }
    },
    [stopProgressPolling]
  );

  /**
   * Pause upload
   */
  const pauseUpload = useCallback(() => {
    stopProgressPolling();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, [stopProgressPolling]);

  /**
   * Resume upload
   */
  const resumeUpload = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
    if (state.sessionId) {
      startProgressPolling(state.sessionId);
    }
  }, [startProgressPolling, state.sessionId]);

  /**
   * Abort upload
   */
  const abort = useCallback(async (sessionId: string) => {
    try {
      stopProgressPolling();
      await abortMultipartUpload(sessionId);
      setState({
        sessionId: null,
        partSize: 0,
        uploadedBytes: 0,
        totalBytes: 0,
        percentComplete: 0,
        isUploading: false,
        isPaused: false,
        error: null,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to abort upload';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, [stopProgressPolling]);

  /**
   * Get current upload progress (manual check)
   */
  const getProgress = useCallback(async (sessionId: string) => {
    try {
      const response = await getUploadProgress(sessionId);
      setState((prev) => ({
        ...prev,
        uploadedBytes: response.uploadedBytes,
        totalBytes: response.totalBytes,
        percentComplete: response.percentComplete,
      }));
      return response;
    } catch (error) {
      console.error('Failed to get progress:', error);
      throw error;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    percentComplete: state.percentComplete,
    error: state.error,
    isUploading: state.isUploading,
    sessionId: state.sessionId,
    uploadedBytes: state.uploadedBytes,
    totalBytes: state.totalBytes,
    initiateUpload,
    uploadChunks,
    completeUpload,
    pauseUpload,
    resumeUpload,
    abort,
    getProgress,
  };
};

