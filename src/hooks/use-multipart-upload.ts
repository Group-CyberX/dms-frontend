'use client';

import { useState, useCallback } from 'react';
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

  /**
   * Initialize multipart upload session
   */
  const initiateUpload = useCallback(async (file: File, documentId?: string) => {
    try {
      setState((prev) => ({ ...prev, error: null, isUploading: true }));

      const response = await initiateMultipartUpload(
        file.name,
        file.size,
        documentId
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
   * Upload file chunks with retry logic
   */
  const uploadChunks = useCallback(
    async (file: File, sessionId: string, partSize: number) => {
      const totalParts = Math.ceil(file.size / partSize);
      let uploadedBytes = 0;

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

        while (retries < maxRetries) {
          try {
            await uploadPartChunk(sessionId, partNumber, chunkFile);
            uploadedBytes += chunk.size;

            const percentComplete = (uploadedBytes / file.size) * 100;
            setState((prev) => ({
              ...prev,
              uploadedBytes,
              percentComplete,
            }));

            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, retries - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    },
    [state.isPaused]
  );

  /**
   * Complete multipart upload
   */
  const completeUpload = useCallback(
    async (sessionId: string, metadata: UploadMetadata) => {
      try {
        const response = await completeMultipartUpload(sessionId, metadata.title, {
          folderId: metadata.folderId,
          category: metadata.category,
          tags: metadata.tags,
          description: metadata.description,
        });

        setState((prev) => ({
          ...prev,
          isUploading: false,
          percentComplete: 100,
        }));

        return response;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to complete upload';
        setState((prev) => ({ ...prev, error: errorMsg, isUploading: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Pause upload
   */
  const pauseUpload = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  /**
   * Resume upload
   */
  const resumeUpload = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  /**
   * Abort upload
   */
  const abort = useCallback(async (sessionId: string) => {
    try {
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
  }, []);

  /**
   * Get current upload progress
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

  return {
    state,
    initiateUpload,
    uploadChunks,
    completeUpload,
    pauseUpload,
    resumeUpload,
    abort,
    getProgress,
  };
};
