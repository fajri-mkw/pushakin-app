'use client'

// Force dynamic rendering to prevent hydration mismatches
// This is needed because the page uses useSearchParams and browser APIs

import React, { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppStore, type User } from '@/lib/store'
import { LoginView } from '@/components/pushakin/login-view'
import { Sidebar } from '@/components/pushakin/sidebar'
import { Topbar } from '@/components/pushakin/topbar'
import { DashboardView } from '@/components/pushakin/dashboard-view'
import { CreateProjectView } from '@/components/pushakin/create-project-view'
import { ProjectDetailView } from '@/components/pushakin/project-detail-view'
import { OverviewView } from '@/components/pushakin/overview-view'
import { ReportsView } from '@/components/pushakin/reports-view'
import { UserManagementView } from '@/components/pushakin/user-management-view'
import { ProfileView } from '@/components/pushakin/profile-view'
import { SettingsView } from '@/components/pushakin/settings-view'
import { InboxView } from '@/components/pushakin/inbox-view'
import { AnnouncementView } from '@/components/pushakin/announcement-view'
import { DialogModal } from '@/components/pushakin/dialog-modal'
import { PublicTrackerView } from '@/components/pushakin/public-tracker-view'
import { Settings, Wrench, Clock, AlertTriangle, Shield } from 'lucide-react'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4" />
        <p className="text-slate-600">Memuat Pushakin Flows...</p>
      </div>
    </div>
  )
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100 p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h1>
        <p className="text-slate-500 mb-2 text-sm">Aplikasi mengalami error tidak terduga.</p>
        <p className="text-red-400 text-xs font-mono mb-6 bg-red-50 p-3 rounded-xl break-all">{error?.message || 'Unknown error'}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => { window.location.href = window.location.pathname }}
            className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors"
          >
            Reload Halaman
          </button>
        </div>
      </div>
    </div>
  )
}

interface MaintenanceData {
  maintenance: boolean
  message: string | null
}

function MaintenanceView({ message, onAdminLogin }: { message: string | null; onAdminLogin: () => void }) {
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAdminLogin = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login gagal')
        setIsLoading(false)
        return
      }

      // Check if user is admin
      if (data.user?.role !== 'Admin') {
        setError('Hanya Admin yang dapat mengakses saat maintenance')
        setIsLoading(false)
        return
      }

      // Store admin session
      localStorage.setItem('adminMaintenanceAccess', 'true')
      onAdminLogin()
    } catch (err) {
      console.error('Admin login error:', err)
      setError('Terjadi kesalahan saat login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/20 shadow-2xl">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-10 h-10 text-amber-400 animate-pulse" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Sedang Dalam Maintenance
          </h1>
          <p className="text-white/60 mb-4">
            {message || 'Pushakin Flows sedang diperbarui untuk meningkatkan layanan.'}
          </p>

          {/* Info */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-center gap-3 text-white/80">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-sm">Estimasi: Beberapa menit</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm">Silakan coba beberapa saat lagi</span>
            </div>
          </div>

          {/* Admin Access Toggle */}
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="text-white/40 hover:text-white/60 text-xs flex items-center gap-1 mx-auto mb-4"
          >
            <Settings className="w-3 h-3" />
            <span>Akses Admin</span>
          </button>

          {/* Admin Login Form */}
          {showAdmin && (
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-violet-300 text-sm mb-2">
                <Shield className="w-4 h-4" />
                <span>Login Admin untuk Mengakses</span>
              </div>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => { setAdminEmail(e.target.value); setError('') }}
                placeholder="Email Admin"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm"
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setError('') }}
                placeholder="Password"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={handleAdminLogin}
                disabled={isLoading || !adminEmail || !adminPassword}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Memproses...' : 'Login Admin'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          Tim Pusat Hubungan Masyarakat dan Keterbukaan Informasi
        </p>
      </div>
    </div>
  )
}

function AppContent() {
  const {
    currentUser, activeView,
    setUsers, setProjects, setNotifications, setSuratTugas,
    setCurrentUser
  } = useAppStore()

  const searchParams = useSearchParams()
  const isPublicView = searchParams.get('public') === 'tracker'

  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | undefined>()
  const [users, setUsersState] = useState<User[]>([])
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null)
  const [adminMaintenanceAccess, setAdminMaintenanceAccess] = useState(false)

  // Check admin maintenance access from localStorage
  useEffect(() => {
    const hasAccess = localStorage.getItem('adminMaintenanceAccess') === 'true'
    setAdminMaintenanceAccess(hasAccess)
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users, projects, and maintenance status in parallel
        const [usersRes, projectsRes, maintenanceRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects'),
          fetch('/api/maintenance')
        ])

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsersState(usersData)
          setUsers(usersData)
        }

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData)
        }

        if (maintenanceRes.ok) {
          const data = await maintenanceRes.json()
          setMaintenanceData(data)
        } else {
          setMaintenanceData({ maintenance: false, message: null })
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setMaintenanceData({ maintenance: false, message: null })
        setIsLoading(false)
      }
    }

    fetchData()
  }, [setUsers, setProjects])

  // Fetch notifications when user logs in
  useEffect(() => {
    const fetchNotifications = async () => {
      if (currentUser) {
        try {
          const res = await fetch(`/api/notifications?userId=${currentUser.id}`)
          if (res.ok) {
            const data = await res.json()
            setNotifications(data)
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error)
        }
      }
    }

    fetchNotifications()
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [currentUser, setNotifications])

  // Fetch surat tugas when user logs in
  useEffect(() => {
    const fetchSuratTugas = async () => {
      if (currentUser) {
        try {
          const res = await fetch(`/api/surat-tugas?userId=${currentUser.id}`)
          if (res.ok) {
            const data = await res.json()
            setSuratTugas(data)
          }
        } catch (error) {
          console.error('Failed to fetch surat tugas:', error)
        }
      }
    }

    fetchSuratTugas()
    // Poll for surat tugas every 30 seconds
    const interval = setInterval(fetchSuratTugas, 30000)
    return () => clearInterval(interval)
  }, [currentUser, setSuratTugas])

  // Handle database seeding
  const handleSeed = async () => {
    setIsSeeding(true)
    setSeedError(undefined)
    try {
      const res = await fetch('/api/seed')
      const data = await res.json()

      if (!res.ok || !data.success) {
        setSeedError(data.details || data.error || 'Terjadi kesalahan')
        return
      }

      // Refetch users
      const usersRes = await fetch('/api/users')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsersState(usersData)
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Seed failed:', error)
      setSeedError('Tidak dapat terhubung ke server. Pastikan DATABASE_URL sudah dikonfigurasi.')
    } finally {
      setIsSeeding(false)
    }
  }

  // Clear params and go to app
  const handleBackFromPublic = () => {
    window.location.href = window.location.pathname
  }

  // Handle admin login from maintenance view
  const handleAdminLogin = () => {
    setAdminMaintenanceAccess(true)
    window.location.reload()
  }

  // Public share view - No authentication required
  if (isPublicView) {
    return <PublicTrackerView onBack={handleBackFromPublic} />
  }

  // Still loading
  if (isLoading || maintenanceData === null) {
    return <LoadingSpinner />
  }

  // Maintenance mode - only allow Admin
  if (maintenanceData.maintenance) {
    // Check if current user is Admin
    if (currentUser?.role === 'Admin' || adminMaintenanceAccess) {
      // Admin can access, show main app with maintenance banner
      // Continue to main app below
    } else {
      // Non-admin: show maintenance view
      return (
        <MaintenanceView
          message={maintenanceData.message}
          onAdminLogin={handleAdminLogin}
        />
      )
    }
  }

  // Login view
  if (activeView === 'login' || !currentUser) {
    return (
      <>
        <LoginView onSeed={handleSeed} isSeeding={isSeeding} seedError={seedError} />
        <DialogModal />
      </>
    )
  }

  // Main application
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-50 font-sans selection:bg-violet-200 overflow-hidden">
      {/* Maintenance Banner for Admin */}
      {maintenanceData.maintenance && (currentUser?.role === 'Admin' || adminMaintenanceAccess) && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-900 text-center py-2 text-sm font-medium z-50 flex items-center justify-center gap-2">
          <Wrench className="w-4 h-4" />
          <span>Mode Maintenance Aktif - Hanya Admin yang dapat mengakses</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Main Content Area - Scrollable */}
        <main className={`flex-1 overflow-y-auto p-8 ${maintenanceData.maintenance ? 'mt-10' : ''}`}>
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'overview' && <OverviewView />}
          {activeView === 'inbox' && <InboxView />}
          {activeView === 'create' && <CreateProjectView />}
          {activeView === 'project_detail' && <ProjectDetailView />}
          {activeView === 'users' && <UserManagementView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'profile' && <ProfileView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'announcements' && <AnnouncementView />}
        </main>
      </div>

      {/* Global Dialog */}
      <DialogModal />
    </div>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
      super(props)
      this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error }
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('[Pushakin] Client-side error:', error, errorInfo)
    }
    render() {
      if (this.state.hasError) {
        return (
          <ErrorFallback
            error={this.state.error!}
            resetErrorBoundary={() => this.setState({ hasError: false, error: null })}
          />
        )
      }
      return this.props.children
    }
  }

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <AppContent />
      </Suspense>
    </ErrorBoundary>
  )
}
