// lib/signatureService.ts
import { fetchWithAuth } from "./api-client";
import { API_BASE_URL } from "./constants";

export interface UserSignatureRequest {
  label: string;
  signatureType: 'DRAW' | 'TYPE' | 'UPLOAD';
  signatureDataUrl: string;
  isDefault: boolean;
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
  }
};