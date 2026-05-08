'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { Lock, Bell, Globe, Palette, CheckCircle, AlertCircle } from 'lucide-react'

interface SettingsFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  emailNotifications: boolean
  pushNotifications: boolean
  documentApproval: boolean
  workflowUpdates: boolean
  language: string
  timezone: string
  dateFormat: string
  theme: string
}

interface ValidationErrors {
  [key: string]: string
}

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    pushNotifications: false,
    documentApproval: true,
    workflowUpdates: true,
    language: 'English',
    timezone: 'UTC-5 (Eastern Time)',
    dateFormat: 'MM/DD/YYYY',
    theme: 'Light',
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Validate password change if any password field is filled
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required'
      }
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleToggleChange = (key: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: checked,
    }))
  }

  const handleSelectChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Here you would call your API to save settings
      // const response = await fetch('/api/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // })

      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setErrors({ submit: 'Failed to save settings. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to initial state or close
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      emailNotifications: true,
      pushNotifications: false,
      documentApproval: true,
      workflowUpdates: true,
      language: 'English',
      timezone: 'UTC-5 (Eastern Time)',
      dateFormat: 'MM/DD/YYYY',
      theme: 'Light',
    })
    setErrors({})
    setSuccessMessage('')
  }

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">Manage your preferences and system configuration</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Change Password Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="text-[#8B2E00]" size={24} />
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-slate-700 font-medium">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={handlePasswordChange}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                {errors.currentPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-slate-700 font-medium">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handlePasswordChange}
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                {errors.newPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="text-[#8B2E00]" size={24} />
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <Label className="text-slate-700 font-medium block">Email Notifications</Label>
                  <p className="text-slate-500 text-sm">Receive notifications via email</p>
                </div>
                <Toggle
                  checked={formData.emailNotifications}
                  onToggle={(checked) => handleToggleChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <Label className="text-slate-700 font-medium block">Push Notifications</Label>
                  <p className="text-slate-500 text-sm">Receive browser push notifications</p>
                </div>
                <Toggle
                  checked={formData.pushNotifications}
                  onToggle={(checked) => handleToggleChange('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <Label className="text-slate-700 font-medium block">Document Approval</Label>
                  <p className="text-slate-500 text-sm">Notify when documents are approved or rejected</p>
                </div>
                <Toggle
                  checked={formData.documentApproval}
                  onToggle={(checked) => handleToggleChange('documentApproval', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-slate-700 font-medium block">Workflow Updates</Label>
                  <p className="text-slate-500 text-sm">Notify about workflow status changes</p>
                </div>
                <Toggle
                  checked={formData.workflowUpdates}
                  onToggle={(checked) => handleToggleChange('workflowUpdates', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Region Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe className="text-[#8B2E00]" size={24} />
                <div>
                  <CardTitle>Language & Region</CardTitle>
                  <CardDescription>Set your preferred language and regional settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language" className="text-slate-700 font-medium">
                  Language
                </Label>
                <Select value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone" className="text-slate-700 font-medium">
                  Timezone
                </Label>
                <Select value={formData.timezone} onValueChange={(value) => handleSelectChange('timezone', value)}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</SelectItem>
                    <SelectItem value="UTC-6 (Central Time)">UTC-6 (Central Time)</SelectItem>
                    <SelectItem value="UTC-7 (Mountain Time)">UTC-7 (Mountain Time)</SelectItem>
                    <SelectItem value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateFormat" className="text-slate-700 font-medium">
                  Date Format
                </Label>
                <Select value={formData.dateFormat} onValueChange={(value) => handleSelectChange('dateFormat', value)}>
                  <SelectTrigger id="dateFormat">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="text-[#8B2E00]" size={24} />
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the visual appearance of the application</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme" className="text-slate-700 font-medium">
                  Theme
                </Label>
                <Select value={formData.theme} onValueChange={(value) => handleSelectChange('theme', value)}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Dark">Dark</SelectItem>
                    <SelectItem value="Auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-6">
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              className="bg-[#8B2E00] hover:bg-[#6D2400] text-white"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
