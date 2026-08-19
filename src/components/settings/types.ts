export interface SettingsFormData {
  // Password
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;

  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  documentApproval: boolean;
  workflowUpdates: boolean;
  systemAlerts: boolean; // Added from user screenshot

  // Language & Region
  language: string;
  timezone: string;
  dateFormat: string;

  // Appearance
  theme: string;

  // Admin - API Keys
  apiKey?: string;
  apiKeyLastRegenerated?: string;

  // Personal security
  twoFactorEnabled: boolean;

  // Admin - Document Policy
  defaultRetentionDays: string;
  recycleBinRetentionDays: string;
  automaticVersionControl: boolean;
  maxVersionsPerDocument: number;
  mandatoryClassification: boolean;

  // Admin - Access Control
  twoFactorAuth: boolean;
  sessionTimeout: string;
  passwordPolicy: string;
  passwordExpiry: string;
  allowedFileTypes: string;
}

export interface SettingsComponentProps {
  formData: SettingsFormData;
  updateForm: (updates: Partial<SettingsFormData>) => void;
  errors: Record<string, string>;
  clearError: (field: string) => void;
}
