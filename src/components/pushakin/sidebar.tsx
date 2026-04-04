'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/lib/store'
import { 
  UserCircle, 
  Users, 
  LogOut,
  PlayCircle,
  BarChart2,
  FileText,
  LayoutDashboard,
  Settings,
  Inbox,
  Megaphone,
  ShieldAlert,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function Sidebar() {
  const { currentUser, realAdminUser, activeView, setActiveView, setCurrentUser, projects, suratTugas, users, impersonateUser, stopImpersonating } = useAppStore()
  const completedCount = projects.filter(p => p.currentStage === 5).length
  const unreadSuratCount = currentUser ? suratTugas.filter(s => s.userId === currentUser.id && !s.read).length : 0
  const [showImpersonatePicker, setShowImpersonatePicker] = useState(false)
  const [impersonateSearch, setImpersonateSearch] = useState('')

  if (!currentUser) return null

  const isImpersonating = realAdminUser !== null
  const isAdmin = realAdminUser ? realAdminUser.role === 'Admin' : currentUser.role === 'Admin'
  const canManageUsers = isAdmin
  const canViewReports = ['Manager', 'Admin'].includes(currentUser.role)
  
  // When impersonating, admin sees dashboard/users/reports based on impersonated role
  // but always has access to stop impersonating

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'overview', label: 'Statistik & Progress', icon: BarChart2 },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadSuratCount > 0 ? unreadSuratCount : undefined },
    { id: 'announcements', label: currentUser?.role === 'Admin' ? 'Manajemen Konten' : 'Informasi', icon: Megaphone },
    ...(canViewReports ? [{ id: 'reports', label: 'Laporan Kegiatan', icon: FileText, badge: completedCount > 0 ? completedCount : undefined }] : []),
    { id: 'profile', label: 'Profil Saya', icon: UserCircle },
    ...(canManageUsers ? [{ id: 'users', label: 'Manajemen User', icon: Users }] : []),
    ...(canManageUsers ? [{ id: 'settings', label: 'Pengaturan', icon: Settings }] : []),
  ]

  // Filter users for impersonation (exclude self and other admins)
  const impersonateableUsers = users.filter(u => 
    u.id !== currentUser.id && u.role !== 'Admin'
  )
  
  const filteredUsers = impersonateSearch 
    ? impersonateableUsers.filter(u => 
        u.name.toLowerCase().includes(impersonateSearch.toLowerCase()) || 
        u.role.toLowerCase().includes(impersonateSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(impersonateSearch.toLowerCase())
      )
    : impersonateableUsers

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-stone-300 flex flex-col h-full rounded-r-3xl shadow-xl z-20 print:hidden shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center space-x-3 text-stone-50 shrink-0">
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-2 rounded-xl shadow-lg shadow-violet-900/30">
          <PlayCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">Pushakin Flows</span>
      </div>
      
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="mx-4 mb-2 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Mode Impersonasi</span>
          </div>
          <div className="text-[11px] text-amber-200 mb-1">
            Login sebagai: <span className="font-semibold">{currentUser.name}</span>
          </div>
          <div className="text-[10px] text-amber-300/60 mb-2">
            Admin asli: {realAdminUser?.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-amber-100 border border-amber-500/30 gap-1.5"
            onClick={stopImpersonating}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Kembali ke Admin</span>
          </Button>
        </div>
      )}
      
      {/* Navigation */}
      <div className="flex-1 px-4 py-2 overflow-y-auto">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-2">
          Menu Utama
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-4 py-3 rounded-xl transition-all",
                  activeView === item.id 
                    ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md shadow-violet-900/30 hover:from-violet-600 hover:to-purple-700 hover:text-white" 
                    : "hover:bg-slate-800/80 hover:text-stone-100"
                )}
                onClick={() => setActiveView(item.id as 'dashboard' | 'overview' | 'reports' | 'profile' | 'users' | 'settings' | 'inbox' | 'announcements')}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Button>
            )
          })}
        </nav>

        {/* Impersonate Section (Admin only, when not impersonating) */}
        {isAdmin && !isImpersonating && impersonateableUsers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-2">
              Admin Tools
            </div>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-4 py-3 rounded-xl transition-all",
                showImpersonatePicker
                  ? "bg-amber-600/20 text-amber-300 hover:bg-amber-600/30"
                  : "hover:bg-slate-800/80 hover:text-stone-100"
              )}
              onClick={() => setShowImpersonatePicker(!showImpersonatePicker)}
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="font-medium">Impersonasi User</span>
            </Button>

            {showImpersonatePicker && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  placeholder="Cari nama atau role..."
                  value={impersonateSearch}
                  onChange={(e) => setImpersonateSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-600/50 rounded-lg text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-violet-500/50"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 ? (
                    <p className="text-[10px] text-stone-500 px-3 py-2">User tidak ditemukan</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left"
                        onClick={() => {
                          impersonateUser(u)
                          setShowImpersonatePicker(false)
                          setImpersonateSearch('')
                        }}
                      >
                        <Avatar className="h-7 w-7 border border-slate-600">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="text-[10px]">{u.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden flex-1 min-w-0">
                          <div className="text-xs font-medium text-stone-200 truncate">{u.name}</div>
                          <div className="text-[10px] text-stone-500 truncate">{u.role}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700/50 shrink-0">
        <div className="flex items-center space-x-3 mb-4 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <Avatar className={cn("h-10 w-10", isImpersonating ? "border-2 border-amber-500" : "border-2 border-violet-500")}>
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden flex-1">
            <div className="text-sm font-semibold text-stone-100 truncate">{currentUser.name}</div>
            <div className={cn("text-xs truncate", isImpersonating ? "text-amber-400" : "text-orange-400")}>
              {currentUser.role}
              {isImpersonating && ' (impersonated)'}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-between text-red-400 hover:text-red-300 hover:bg-red-900/30 bg-slate-800/50"
          onClick={() => { 
            setCurrentUser(null); 
            setActiveView('login'); 
            setShowImpersonatePicker(false)
          }}
        >
          <span>Keluar (Logout)</span>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  )
}
