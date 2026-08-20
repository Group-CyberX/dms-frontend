'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/access-control'
import { apiClient } from '@/lib/api-client'

import ChangePasswordCard from '@/components/settings/ChangePasswordCard'
import NotificationPreferencesCard from '@/components/settings/NotificationPreferencesCard'
import LanguageRegionCard from '@/components/settings/LanguageRegionCard'
import AppearanceCard from '@/components/settings/AppearanceCard'
import AdministratorSettings from '@/components/settings/AdministratorSettings'
import { SettingsFormData } from '@/components/settings/types'

export default function SettingsPage() {
  const { role, permissions } = useAuthStore()

  const [formData, setFormData] = useState<SettingsFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    pushNotifications: false,
    documentApproval: true,
    workflowUpdates: true,
    systemAlerts: false,
    language: 'English',
    timezone: 'UTC-5 (Eastern Time)',
    dateFormat: 'MM/DD/YYYY',
    theme: 'Light',
    
    // Admin defaults
    apiKey: "sk_live_" + Math.random().toString(36).substring(2, 15),
    apiKeyLastRegenerated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    defaultRetentionDays: "2555 Days",
    recycleBinRetentionDays: "30 Days",
    automaticVersionControl: true,
    maxVersionsPerDocument: 10,
    mandatoryClassification: false,
    twoFactorAuth: false,
    twoFactorEnabled: false,
    sessionTimeout: "30 Minutes",
    passwordPolicy: "Strong (8+ chars, mixed, numbers, symbols)",
    passwordExpiry: "90 Days",
    allowedFileTypes: "PDF, DOC, DOCX, XLS, XLSX, JPG, PNG"
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load what was actually saved. Without this the screen always opened on the
  // hardcoded defaults above, so a saved choice looked as though it had been
  // forgotten even when it had been stored.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [preferences, organisation] = await Promise.all([
          apiClient.get('/api/settings/me').catch(() => null),
          apiClient.get('/api/settings/organisation').catch(() => null)
        ])
        if (cancelled) return

        setFormData((prev) => ({
          ...prev,
          ...(preferences && typeof preferences === 'object' ? preferences : {}),
          ...(organisation && typeof organisation === 'object' ? organisation : {})
        }))
      } catch (error) {
        console.error('Could not load settings:', error)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const updateForm = (updates: Partial<SettingsFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate password change if any password field is filled
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required'
      }
      if (formData.newPassword && formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Personal preferences belong to the signed-in user; the administrator block
  // is organisation-wide. They are stored separately, so they are saved
  // separately and only the halves the user may change are sent.
  const canEditOrgSettings =
    role === 'SYSTEM_ADMIN' || hasPermission(permissions, role, 'canEditSetting')

  const handleSave = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setSuccessMessage('')
    const saved: string[] = []

    try {
      if (formData.currentPassword && formData.newPassword) {
        await apiClient.post('/api/profile/change-password', {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })

        setFormData((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
        saved.push('password')
      }

      const preferences = await apiClient.put('/api/settings/me', {
        emailNotifications: formData.emailNotifications,
        pushNotifications: formData.pushNotifications,
        documentApproval: formData.documentApproval,
        workflowUpdates: formData.workflowUpdates,
        systemAlerts: formData.systemAlerts,
        language: formData.language,
        timezone: formData.timezone,
        dateFormat: formData.dateFormat,
        theme: formData.theme,
        twoFactorEnabled: formData.twoFactorEnabled
      })
      saved.push('preferences')

      if (canEditOrgSettings) {
        await apiClient.put('/api/settings/organisation', {
          defaultRetentionDays: formData.defaultRetentionDays,
          recycleBinRetentionDays: formData.recycleBinRetentionDays,
          automaticVersionControl: formData.automaticVersionControl,
          maxVersionsPerDocument: formData.maxVersionsPerDocument,
          mandatoryClassification: formData.mandatoryClassification,
          sessionTimeout: formData.sessionTimeout,
          passwordPolicy: formData.passwordPolicy,
          passwordExpiry: formData.passwordExpiry,
          allowedFileTypes: formData.allowedFileTypes,
          twoFactorAuth: formData.twoFactorAuth
        })
        saved.push('system configuration')
      }

      // Reflect exactly what the server kept, so the screen cannot show a
      // value that was rejected or trimmed on the way in.
      if (preferences && typeof preferences === 'object') {
        setFormData((prev) => ({ ...prev, ...(preferences as Partial<SettingsFormData>) }))
      }

      setSuccessMessage(`Saved ${saved.join(', ')}.`)
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (error: any) {
      console.error('Error saving settings:', error)

      const errorMessage = error.message || 'Failed to save settings. Please try again.'
      setErrors({ submit: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    window.location.reload()
  }

  const componentProps = { formData, updateForm, errors, clearError }

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="max-w-4xl mx-auto py-10 px-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">Manage your preferences and system configuration</p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        <div className="space-y-6 pb-24">
          <ChangePasswordCard {...componentProps} />
          <NotificationPreferencesCard {...componentProps} />
          <LanguageRegionCard {...componentProps} />
          <AppearanceCard {...componentProps} />
          
          <AdministratorSettings {...componentProps} />
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="bg-[#953002] hover:bg-[#7a2401] text-white"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

    </div>
  )
}
