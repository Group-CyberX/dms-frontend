// lib/signatureService.ts
import { fetchWithAuth } from "./api-client";
import { API_BASE_URL } from "./constants";

export interface UserSignatureRequest {
  label: string;
  signatureType: 'DRAW' | 'TYPE' | 'UPLOAD';
  signatureDataUrl: string;
  isDefault: boolean;
}

/**
 * One placed signature. Coordinates are fractions of the page (0-1) measured
 * from the top-left, so they survive any zoom level the user was working at.
 */
export interface SignaturePlacement {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageDataUrl: string;
}

export interface SignAndApproveRequest {
  documentId: string;
  taskId: number | null;
  comments: string;
  placements: SignaturePlacement[];
}

export interface SignAndApproveResponse {
  documentId: string;
  newVersionId: string;
  newVersionNumber: string;
  signatureId: string;
  documentHash: string;
  placementsApplied: number;
  taskApproved: boolean;
}

export const signatureService = {
  // 1. Fetch saved signatures for a user
  async getUserSignatures(userId: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/signatures/user/${userId}`, {
      method: "GET",
    });
    if (!response.ok) return [];
    return response.json();
  },

  // 2. Save a newly created signature template
  async saveSignature(userId: string, data: UserSignatureRequest) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/signatures/user/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to save signature configuration");
    return response.json();
  },

  // 3. Delete a signature profile template
  async deleteSignature(signatureId: string) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/signatures/${signatureId}`, {
      method: "DELETE",
    });
    return response.ok;
  },

  /**
   * 4. Stamp the placed signatures into the PDF. The server writes them into the
   * file, stores the result as a new document version, logs the signature, and
   * approves the workflow task when taskId is supplied.
   */
  async signAndApprove(data: SignAndApproveRequest): Promise<SignAndApproveResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/signatures/sign-and-approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let message = `Signing failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // response had no JSON body; keep the status-based message
      }
      throw new Error(message);
    }

    return response.json();
  }
};