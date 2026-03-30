'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/store'
import {
  Settings as SettingsIcon,
  Folder,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  HardDrive,
  Wrench,
  Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SettingsData {
  driveAutoCreate: boolean
  driveParentFolderId: string
  driveSharedDriveId: string
  hasServiceAccountKey: boolean
  driveApiKey: string
  maintenanceMode: boolean
  maintenanceMessage: string
}

export function SettingsView() {
  const { currentUser, showAlert } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')

  const [settings, setSettings] = useState<SettingsData>({
    driveAutoCreate: false,
    driveParentFolderId: '',
    driveSharedDriveId: '',
    hasServiceAccountKey: false,
    driveApiKey: '',
    maintenanceMode: false,
    maintenanceMessage: ''
  })
  const [serviceAccountKey, setServiceAccountKey] = useState('')

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings({
            driveAutoCreate: data.driveAutoCreate || false,
            driveParentFolderId: data.driveParentFolderId || '',
            driveSharedDriveId: data.driveSharedDriveId || '',
            hasServiceAccountKey: data.hasServiceAccountKey || false,
            driveApiKey: data.driveApiKey || '',
            maintenanceMode: data.maintenanceMode || false,
            maintenanceMessage: data.maintenanceMessage || ''
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Test connection
  const testConnection = async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/drive')
      const data = await response.json()
      setConnectionStatus(data.connected ? 'connected' : 'disconnected')
      if (!data.connected) {
        showAlert(data.message || 'Koneksi gagal')
      }
    } catch {
      setConnectionStatus('disconnected')
    } finally {
      setIsTesting(false)
    }
  }

  // Toggle driveAutoCreate and auto-save
  const handleToggleAutoCreate = async (checked: boolean) => {
    setSettings(prev => ({ ...prev, driveAutoCreate: checked }))
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveAutoCreate: checked })
      })
      if (!response.ok) {
        setSettings(prev => ({ ...prev, driveAutoCreate: !checked }))
        showAlert('Gagal mengubah pengaturan auto-create')
      }
    } catch {
      setSettings(prev => ({ ...prev, driveAutoCreate: !checked }))
      showAlert('Terjadi kesalahan saat mengubah pengaturan')
    }
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updateData: {
        driveAutoCreate: boolean
        driveParentFolderId: string
        driveSharedDriveId: string
        driveServiceAccountKey?: string
      } = {
        driveAutoCreate: settings.driveAutoCreate,
        driveParentFolderId: settings.driveParentFolderId,
        driveSharedDriveId: settings.driveSharedDriveId
      }

      // Only include service account key if it was changed
      if (serviceAccountKey.trim()) {
        updateData.driveServiceAccountKey = serviceAccountKey
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({
          ...prev,
          driveAutoCreate: data.driveAutoCreate,
          driveParentFolderId: data.driveParentFolderId,
          driveSharedDriveId: data.driveSharedDriveId,
          hasServiceAccountKey: data.hasServiceAccountKey
        }))
        setServiceAccountKey('')
        showAlert('Pengaturan berhasil disimpan!')
      } else {
        showAlert('Gagal menyimpan pengaturan')
      }
    } catch {
      showAlert('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSaving(false)
    }
  }

  // Save maintenance settings
  const handleSaveMaintenance = async () => {
    setIsSavingMaintenance(true)
    try {
      const response = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
          userId: currentUser?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({
          ...prev,
          maintenanceMode: data.maintenance,
          maintenanceMessage: data.message || ''
        }))
        showAlert(settings.maintenanceMode
          ? 'Mode maintenance diaktifkan! User lain tidak dapat mengakses.'
          : 'Mode maintenance dinonaktifkan! User lain dapat mengakses kembali.'
        )
      } else {
        const data = await response.json()
        showAlert(data.error || 'Gagal menyimpan pengaturan maintenance')
      }
    } catch {
      showAlert('Terjadi kesalahan saat menyimpan')
    } finally {
      setIsSavingMaintenance(false)
    }
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-stone-800">Akses Ditolak</h2>
          <p className="text-stone-500 mt-2">Hanya Admin yang dapat mengakses pengaturan.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-stone-500 mt-4">Memuat pengaturan...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-stone-600" />
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Pengaturan</h1>
          <p className="text-stone-500 text-sm">Konfigurasi sistem Pushakin Flows</p>
        </div>
      </div>

      {/* Maintenance Mode Card - Admin Only */}
      <Card className={cn(
        "border-2 transition-all",
        settings.maintenanceMode
          ? "bg-red-50 border-red-300"
          : "bg-white border-stone-200"
      )}>
        <CardHeader className="border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              settings.maintenanceMode ? "bg-red-100" : "bg-amber-50"
            )}>
              <Wrench className={cn(
                "w-5 h-5",
                settings.maintenanceMode ? "text-red-600" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Mode Maintenance</CardTitle>
                {settings.maintenanceMode && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium animate-pulse">
                    AKTIF
                  </span>
                )}
              </div>
              <CardDescription>
                Aktifkan untuk membatasi akses hanya untuk Admin
              </CardDescription>
            </div>
            <Shield className="w-5 h-5 text-violet-500" />
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Warning */}
          <div className={cn(
            "p-4 rounded-xl text-sm",
            settings.maintenanceMode
              ? "bg-red-100 text-red-800"
              : "bg-amber-50 text-amber-800"
          )}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {settings.maintenanceMode
                    ? "⚠️ Mode Maintenance Sedang Aktif"
                    : "ℹ️ Tentang Mode Maintenance"
                  }
                </p>
                <p className="mt-1">
                  {settings.maintenanceMode
                    ? "Semua user selain Admin akan melihat halaman maintenance dan tidak dapat mengakses aplikasi."
                    : "Saat diaktifkan, hanya Admin yang dapat mengakses aplikasi. User lain akan melihat halaman maintenance."
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50">
            <div>
              <Label className="text-base font-semibold">Aktifkan Maintenance</Label>
              <p className="text-sm text-stone-500 mt-1">
                Non-Admin tidak dapat mengakses aplikasi
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, maintenanceMode: checked }))
              }
            />
          </div>

          {/* Maintenance Message */}
          <div className="space-y-2">
            <Label htmlFor="maintenanceMessage">Pesan Maintenance (Opsional)</Label>
            <Textarea
              id="maintenanceMessage"
              value={settings.maintenanceMessage}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))
              }
              placeholder="Contoh: Sedang melakukan update sistem. Estimasi selesai pukul 14:00 WIB."
              rows={3}
            />
            <p className="text-xs text-stone-500">
              Pesan ini akan ditampilkan kepada user selama maintenance.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveMaintenance}
              disabled={isSavingMaintenance}
              className={cn(
                settings.maintenanceMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {isSavingMaintenance ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                settings.maintenanceMode ? 'Simpan (Maintenance Aktif)' : 'Simpan Pengaturan'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shared Drive Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">⚠️ Penting: Gunakan Shared Drive (Drive Bersama)</p>
              <p className="mt-1">
                Service Account tidak memiliki kuota penyimpanan sendiri. Anda <strong>HARUS</strong> menggunakan Shared Drive untuk upload file.
              </p>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Buat Shared Drive di Google Drive (klik "Shared Drives" → "New")</li>
                <li>Tambahkan email Service Account sebagai member dengan akses "Content manager"</li>
                <li>Masukkan Shared Drive ID di field di bawah</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google Drive Integration */}
      <Card>
        <CardHeader className="border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Folder className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Integrasi Google Drive</CardTitle>
                <CardDescription>
                  Otomatis membuat folder proyek di Google Drive
                </CardDescription>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-3">
              {connectionStatus !== 'unknown' && (
                <div className={cn(
                  "flex items-center gap-1.5 text-sm",
                  connectionStatus === 'connected' ? "text-green-600" : "text-red-500"
                )}>
                  {connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terhubung</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Tidak Terhubung</span>
                    </>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isTesting || !settings.hasServiceAccountKey}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Test Koneksi'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Enable Toggle */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
            settings.driveAutoCreate
              ? "bg-green-50 border-green-300"
              : "bg-stone-50 border-transparent"
          )}>
            <div>
              <Label className="text-base font-semibold">Aktifkan Auto-Create Folder</Label>
              <p className="text-sm text-stone-500 mt-1">
                Saat proyek baru dibuat, folder akan otomatis dibuat di Google Drive
              </p>
              {settings.driveAutoCreate && (
                <p className="text-sm text-green-600 font-medium mt-2">
                  ✓ Google Drive Auto-Create AKTIF
                </p>
              )}
            </div>
            <Switch
              checked={settings.driveAutoCreate}
              onCheckedChange={handleToggleAutoCreate}
            />
          </div>

          {/* Warning when required config is missing */}
          {settings.driveAutoCreate && !settings.hasServiceAccountKey && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Service Account diperlukan</p>
                  <p className="mt-1">
                    Auto-Create sudah diaktifkan, tetapi Anda perlu mengunggah Google Service Account Key agar folder bisa dibuat otomatis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings.driveAutoCreate && settings.hasServiceAccountKey && !settings.driveSharedDriveId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Shared Drive ID diperlukan</p>
                  <p className="mt-1">
                    Auto-Create sudah diaktifkan, tetapi folder tidak dapat dibuat tanpa Shared Drive ID. Masukkan ID di bawah.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shared Drive ID - IMPORTANT */}
          <div className="space-y-2 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <Label htmlFor="sharedDrive" className="font-semibold text-indigo-900">
                Shared Drive ID (WAJIB)
              </Label>
            </div>
            <Input
              id="sharedDrive"
              value={settings.driveSharedDriveId}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, driveSharedDriveId: e.target.value }))
              }
              placeholder="Contoh: 0AEd3EhGff9SaUk9PVA"
              className="bg-white"
            />
            <p className="text-xs text-indigo-700">
              <strong>Cara mendapatkan Shared Drive ID:</strong> Buka Shared Drive di Google Drive,
              lihat URL: <code className="bg-white px-1 rounded">drive.google.com/drive/folders/[SHARED_DRIVE_ID]</code>
            </p>
          </div>

          {/* Parent Folder ID */}
          <div className="space-y-2">
            <Label htmlFor="parentFolder">Parent Folder ID (Opsional)</Label>
            <div className="flex gap-2">
              <Input
                id="parentFolder"
                value={settings.driveParentFolderId}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, driveParentFolderId: e.target.value }))
                }
                placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OEgvA"
                className="flex-1"
              />
              {settings.driveParentFolderId && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a
                    href={`https://drive.google.com/drive/folders/${settings.driveParentFolderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-stone-500">
              ID folder induk di dalam Shared Drive tempat folder proyek akan dibuat. Kosongkan untuk membuat di root Shared Drive.
            </p>
          </div>

          {/* Service Account Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-stone-500" />
              <Label>Google Service Account Key (JSON)</Label>
            </div>

            {settings.hasServiceAccountKey && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Service Account sudah dikonfigurasi</span>
              </div>
            )}

            <Textarea
              value={serviceAccountKey}
              onChange={(e) => setServiceAccountKey(e.target.value)}
              placeholder={settings.hasServiceAccountKey
                ? "Masukkan key baru untuk mengganti key yang ada..."
                : 'Paste isi file JSON Service Account di sini...'
              }
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-stone-100">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                'Simpan Pengaturan'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
        <CardHeader>
          <CardTitle className="text-lg text-indigo-900">Petunjuk Setup Lengkap</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-indigo-800 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Langkah 1: Buat Service Account</h4>
            <p>Buat di Google Cloud Console → IAM & Admin → Service Accounts. Buat key JSON dan simpan.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Langkah 2: Aktifkan Google Drive API</h4>
            <p>Di Google Cloud Console, buka Library dan aktifkan "Google Drive API".</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Langkah 3: Buat Shared Drive</h4>
            <p>Buka Google Drive → "Shared Drives" → "New". Beri nama misalnya "Pushakin Projects".</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Langkah 4: Tambahkan Service Account ke Shared Drive</h4>
            <p>
              Klik kanan Shared Drive → "Add members" → Masukkan email Service Account
              (format: <code className="bg-white px-1 rounded">nama@project-id.iam.gserviceaccount.com</code>)
              dengan akses "Content manager".
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Langkah 5: Masukkan Konfigurasi</h4>
            <p>Copy Shared Drive ID dari URL dan paste ke field di atas, lalu simpan.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
