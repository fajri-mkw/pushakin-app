'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore, STAGES } from '@/lib/store'
import { 
  Inbox, 
  Clock, 
  MapPin, 
  User, 
  Building2,
  Calendar,
  Phone,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ActivityDetail {
  id: string
  projectId: string
  userId: string
  role: string
  stage: number
  status: string
  read: boolean
  createdAt: string
  project?: {
    id: string
    title: string
    description?: string
    requesterUnit?: string
    location?: string
    executionTime?: string
    picName?: string
    picWhatsApp?: string
    activityTypes?: string[]
    outputNeeds?: string[]
    manager?: {
      id: string
      name: string
      email: string
    }
  }
}

export function InboxView() {
  const { currentUser, setActiveView, setSelectedProjectId, markSuratRead } = useAppStore()
  const [activityList, setActivityList] = useState<ActivityDetail[]>([])
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentUser) return
      try {
        const response = await fetch(`/api/surat-tugas?userId=${currentUser.id}`)
        if (response.ok) {
          const data = await response.json()
          setActivityList(data)
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [currentUser])

  const handleViewActivity = async (activity: ActivityDetail) => {
    try {
      const response = await fetch(`/api/surat-tugas?id=${activity.id}`)
      if (response.ok) {
        const detail = await response.json()
        setSelectedActivity(detail)
        
        // Mark as read
        if (!activity.read) {
          await fetch('/api/surat-tugas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activity.id, read: true })
          })
          markSuratRead(activity.id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity detail:', error)
    }
  }

  const handleGoToProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setActiveView('project_detail')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatExecutionTime = (timeStr: string) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr)
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timeStr
    }
  }

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" />
          <p className="mt-4 text-stone-500">Memuat data kegiatan...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Inbox</h1>
            <p className="text-sm text-stone-500">Daftar kegiatan yang ditugaskan</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {activityList.filter(a => !a.read).length} Belum Dibaca
        </Badge>
      </div>

      {/* Activity List */}
      {activityList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="w-12 h-12 mx-auto text-stone-300" />
            <p className="mt-4 text-stone-500">Belum ada kegiatan</p>
            <p className="text-sm text-stone-400 mt-1">Kegiatan akan muncul ketika Anda ditugaskan dalam proyek</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3 pr-4">
            {activityList.map((activity) => (
              <Card 
                key={activity.id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  !activity.read ? "border-l-4 border-l-violet-500 bg-violet-50/30" : "bg-white"
                )}
                onClick={() => handleViewActivity(activity)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!activity.read && (
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          Tahap {activity.stage}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-stone-800">{activity.project?.title || 'Proyek'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {activity.role}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                        {activity.status === 'active' ? 'Aktif' : activity.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedActivity && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Detail Kegiatan</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Project Info */}
                <div className="bg-stone-50 rounded-xl p-4">
                  <h4 className="font-bold text-lg text-stone-800 mb-3">
                    {selectedActivity.project?.title}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">Unit Pemohon</p>
                        <p className="text-sm font-medium">{selectedActivity.project?.requesterUnit || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">Lokasi</p>
                        <p className="text-sm font-medium">{selectedActivity.project?.location || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">Waktu Pelaksanaan</p>
                        <p className="text-sm font-medium">{formatExecutionTime(selectedActivity.project?.executionTime || '')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">PIC Lokasi</p>
                        <p className="text-sm font-medium">{selectedActivity.project?.picName || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">WhatsApp PIC</p>
                        <p className="text-sm font-medium">{selectedActivity.project?.picWhatsApp || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-stone-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-stone-500">Manager Proyek</p>
                        <p className="text-sm font-medium">{selectedActivity.project?.manager?.name || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Info */}
                <div className="bg-violet-50 rounded-xl p-4">
                  <h5 className="text-sm font-bold text-violet-800 mb-3">Detail Penugasan</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-violet-600">Peran</p>
                      <p className="text-sm font-semibold text-violet-900">{selectedActivity.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-violet-600">Tahap</p>
                      <p className="text-sm font-semibold text-violet-900">Tahap {selectedActivity.stage}: {STAGES[selectedActivity.stage]}</p>
                    </div>
                  </div>
                  
                  {selectedActivity.project?.activityTypes && selectedActivity.project.activityTypes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-violet-600 mb-1">Jenis Kegiatan</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedActivity.project.activityTypes.map((type, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedActivity.project?.outputNeeds && selectedActivity.project.outputNeeds.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-violet-600 mb-1">Kebutuhan Output</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedActivity.project.outputNeeds.map((need, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{need}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedActivity.project?.description && (
                  <div>
                    <h5 className="text-sm font-bold text-stone-700 mb-2">Deskripsi & Instruksi</h5>
                    <div className="bg-white border border-stone-200 rounded-lg p-4 text-sm text-stone-600 whitespace-pre-wrap">
                      {selectedActivity.project.description}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex justify-end">
                  <Button
                    className="gap-2 bg-violet-600 hover:bg-violet-700"
                    onClick={() => handleGoToProject(selectedActivity.projectId)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Proyek</span>
                  </Button>
                </div>

                <p className="text-xs text-center text-stone-400">
                  Kegiatan ditugaskan pada {formatDate(selectedActivity.createdAt)}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
