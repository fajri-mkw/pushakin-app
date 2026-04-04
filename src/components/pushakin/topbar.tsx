'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { Bell, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'

export function Topbar() {
  const { activeView, currentUser, originalAdminUser, notifications, markNotifRead, setSelectedProjectId, setActiveView, restoreAdmin } = useAppStore()

  const myNotifications = useMemo(() => 
    notifications.filter(n => n.userId === currentUser?.id),
    [notifications, currentUser?.id]
  )
  const unreadCount = useMemo(() => 
    myNotifications.filter(n => !n.read).length,
    [myNotifications]
  )

  const viewTitles: Record<string, string> = {
    'dashboard': 'Project Dashboard',
    'create': 'Buat Proyek Baru',
    'overview': 'Statistik & Progress',
    'users': 'Manajemen Pengguna',
    'reports': 'Rekap Laporan Kegiatan',
    'profile': 'Profil Saya',
    'settings': 'Pengaturan',
    'project_detail': 'Detail Proyek'
  }

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotifRead(notif.id)
    if (notif.projectId) {
      setSelectedProjectId(notif.projectId)
    }
    setActiveView((notif.targetView || 'project_detail') as 'dashboard' | 'project_detail' | 'reports')
  }

  return (
    <>
      {/* Admin Impersonation Banner */}
      {originalAdminUser && (
        <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between text-sm font-medium z-20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Mode Impersonasi — Anda sedang login sebagai <strong>{currentUser?.name}</strong> ({currentUser?.role})</span>
          </div>
          <button
            onClick={restoreAdmin}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
          >
            Kembali ke Admin
          </button>
        </div>
      )}
      <header className="h-20 bg-gradient-to-r from-slate-50 via-white to-violet-50/30 border-b border-slate-200 flex items-center justify-between px-8 z-10 print:hidden">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 capitalize">
          {viewTitles[activeView] || 'Project Dashboard'}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-violet-600">Sistem Manajemen Produksi</span>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500">Tim Pusat Hubungan Masyarakat dan Keterbukaan Informasi</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative rounded-full hover:border-violet-300 hover:bg-violet-50">
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">
                  {unreadCount} Baru
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-80">
              {myNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Tidak ada notifikasi
                </div>
              ) : (
                myNotifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`p-4 cursor-pointer border-b border-slate-50 ${
                      notif.read ? 'bg-white' : 'bg-violet-50/50'
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <div className="w-2 h-2 bg-violet-500 rounded-full mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-slate-800">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">Klik untuk melihat detail</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  )
}
