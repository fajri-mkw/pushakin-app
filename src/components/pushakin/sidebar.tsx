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
  Megaphone
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { currentUser, activeView, setActiveView, setCurrentUser, projects, suratTugas } = useAppStore()
  const completedCount = projects.filter(p => p.currentStage === 5).length
  const unreadSuratCount = currentUser ? suratTugas.filter(s => s.userId === currentUser.id && !s.read).length : 0

  if (!currentUser) return null

  const canManageUsers = currentUser.role === 'Admin'
  const canViewReports = ['Manager', 'Admin'].includes(currentUser.role)

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

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-stone-300 flex flex-col h-full rounded-r-3xl shadow-xl z-20 print:hidden shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center space-x-3 text-stone-50 shrink-0">
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-2 rounded-xl shadow-lg shadow-violet-900/30">
          <PlayCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">Pushakin Flows</span>
      </div>
      
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
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700/50 shrink-0">
        <div className="flex items-center space-x-3 mb-4 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <Avatar className="h-10 w-10 border-2 border-violet-500">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden flex-1">
            <div className="text-sm font-semibold text-stone-100 truncate">{currentUser.name}</div>
            <div className="text-xs text-orange-400 truncate">{currentUser.role}</div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-between text-red-400 hover:text-red-300 hover:bg-red-900/30 bg-slate-800/50"
          onClick={() => { setCurrentUser(null); setActiveView('login'); }}
        >
          <span>Keluar (Logout)</span>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  )
}
