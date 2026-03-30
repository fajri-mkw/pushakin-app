'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore, STAGES } from '@/lib/store'
import { 
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  FolderKanban
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface PublicTask {
  id: string
  role: string
  stage: number
  status: string
  data: string | null
  assignee: {
    id: string
    name: string
    avatar: string | null
    role: string
  }
}

interface PublicProject {
  id: string
  title: string
  description: string
  requesterUnit: string
  location: string | null
  executionTime: string | null
  picName: string | null
  picWhatsApp: string | null
  currentStage: number
  publicToken: string | null
  createdAt: string
  tasks: PublicTask[]
  manager: {
    id: string
    name: string
    avatar: string | null
  }
}

interface PublicTrackerViewProps {
  onBack: () => void
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'day', label: 'Hari Ini' },
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' }
]

const STAGE_COLORS: Record<number, { bg: string; border: string }> = {
  1: { bg: 'bg-violet-600', border: 'border-violet-400' },
  2: { bg: 'bg-orange-500', border: 'border-orange-400' },
  3: { bg: 'bg-blue-600', border: 'border-blue-400' },
  4: { bg: 'bg-purple-600', border: 'border-purple-400' },
}

export function PublicTrackerView({ onBack }: PublicTrackerViewProps) {
  const { showAlert } = useAppStore()
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Projects per page (3 for better fit)
  const PROJECTS_PER_PAGE = 3
  const AUTO_PLAY_INTERVAL = 10000 // 10 seconds

  const fetchProjects = async (filter: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/public-tracker?filter=${filter}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to load data')
        return
      }
      
      setProjects(data.projects)
      setStats(data.stats)
      setCurrentPage(0)
    } catch (err) {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects(timeFilter)
  }, [timeFilter])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto pagination
  useEffect(() => {
    if (projects.length <= PROJECTS_PER_PAGE) return
    
    const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE)
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages)
    }, AUTO_PLAY_INTERVAL)
    
    return () => clearInterval(timer)
  }, [projects.length])

  const getTaskProgress = (project: PublicProject) => {
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(t => t.status === 'completed').length
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    const stageProgress: Record<number, { total: number; completed: number }> = {}
    for (let stage = 1; stage <= 4; stage++) {
      const stageTasks = project.tasks.filter(t => t.stage === stage)
      stageProgress[stage] = {
        total: stageTasks.length,
        completed: stageTasks.filter(t => t.status === 'completed').length
      }
    }
    
    const teamByStage: Record<number, Array<{ name: string; status: string; avatar: string | null }>> = {}
    for (let stage = 1; stage <= 4; stage++) {
      teamByStage[stage] = project.tasks
        .filter(t => t.stage === stage)
        .map(t => ({
          name: t.assignee.name,
          status: t.status,
          avatar: t.assignee.avatar
        }))
    }
    
    return { percentage, stageProgress, teamByStage }
  }

  const currentProjects = projects.slice(
    currentPage * PROJECTS_PER_PAGE,
    (currentPage + 1) * PROJECTS_PER_PAGE
  )

  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-violet-400 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-xl mb-4">{error}</p>
          <button onClick={onBack} className="text-violet-400 hover:text-violet-300">
            Kembali ke Aplikasi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden">
      {/* 16:9 Container */}
      <div className="w-full h-full flex flex-col">
        
        {/* Header - Fixed Height */}
        <div className="h-[8%] bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-700 px-6 flex items-center justify-between shrink-0">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-lg">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">PUSHAKIN FLOWS</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-violet-400">Sistem Manajemen Produksi</span>
                <span className="text-slate-500">|</span>
                <span className="text-[10px] text-slate-400">Tim Pusat Hubungan Masyarakat dan Keterbukaan Informasi</span>
              </div>
            </div>
          </div>
          
          {/* Center - Time */}
          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono tracking-wider">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-slate-400">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Right - Filter */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeFilter(opt.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-all",
                  timeFilter === opt.id 
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Fills remaining space */}
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          
          {/* Stats Row - Fixed Height */}
          <div className="h-[18%] grid grid-cols-3 gap-4 shrink-0">
            {/* Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-slate-400 uppercase tracking-wider">Total Proyek</div>
              </div>
            </div>

            {/* Active */}
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">{stats.active}</div>
                <div className="text-sm text-orange-100 uppercase tracking-wider">Sedang Berjalan</div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">{stats.completed}</div>
                <div className="text-sm text-violet-100 uppercase tracking-wider">Telah Selesai</div>
              </div>
            </div>
          </div>

          {/* Projects - Fills remaining */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {projects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <FolderKanban className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">Tidak ada proyek untuk ditampilkan</p>
                </div>
              </div>
            ) : (
              <>
                {/* Project Cards */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {currentProjects.map(project => {
                    const { percentage, stageProgress, teamByStage } = getTaskProgress(project)
                    const isCompleted = project.currentStage === 5

                    return (
                      <div
                        key={project.id}
                        className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col"
                      >
                        {/* Project Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-2.5 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge className={cn(
                              "shrink-0 text-[10px] font-bold uppercase",
                              isCompleted ? "bg-green-500" : "bg-orange-500"
                            )}>
                              {isCompleted ? 'Selesai' : 'Aktif'}
                            </Badge>
                            <h3 className="text-base font-bold text-white truncate">{project.title}</h3>
                          </div>
                          <div className="text-2xl font-bold text-white shrink-0 ml-2">{percentage}%</div>
                        </div>

                        {/* Step Flow */}
                        <div className="bg-slate-900/50 px-3 py-2 border-b border-slate-700 shrink-0">
                          <div className="flex items-center justify-between gap-1">
                            {[1, 2, 3, 4].map((stage, idx) => {
                              const colors = STAGE_COLORS[stage]
                              const isStageCompleted = stage < project.currentStage
                              const isCurrent = stage === project.currentStage
                              const progress = stageProgress[stage]
                              const stagePercent = progress.total > 0 
                                ? Math.round((progress.completed / progress.total) * 100) 
                                : 0
                              
                              return (
                                <div key={stage} className="flex items-center flex-1 min-w-0">
                                  <div className="flex flex-col items-center flex-1">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
                                      isStageCompleted ? "bg-green-500 border-green-400 text-white" :
                                      isCurrent ? cn(colors.bg, "border-white/50 text-white shadow-lg") :
                                      "bg-slate-700 border-slate-600 text-slate-400"
                                    )}>
                                      {isStageCompleted ? <CheckCircle2 className="w-4 h-4" /> : stage}
                                    </div>
                                    <div className="text-[10px] font-semibold mt-0.5 text-slate-300 truncate w-full text-center">
                                      {STAGES[stage]}
                                    </div>
                                    <div className={cn(
                                      "text-xs font-bold",
                                      isStageCompleted ? "text-green-400" : isCurrent ? "text-white" : "text-slate-500"
                                    )}>
                                      {stagePercent}%
                                    </div>
                                  </div>
                                  
                                  {idx < 3 && (
                                    <div className={cn(
                                      "flex-1 h-0.5 mx-1 rounded-full",
                                      isStageCompleted ? "bg-green-500" : "bg-slate-700"
                                    )}></div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Team Grid */}
                        <div className="flex-1 p-3 overflow-hidden">
                          <div className="grid grid-cols-4 gap-2 h-full">
                            {[1, 2, 3, 4].map((stage) => {
                              const members = teamByStage[stage]
                              const progress = stageProgress[stage]
                              const colors = STAGE_COLORS[stage]
                              const isStageCompleted = stage < project.currentStage
                              const isCurrent = stage === project.currentStage
                              
                              return (
                                <div 
                                  key={stage}
                                  className={cn(
                                    "rounded-lg p-2 border flex flex-col",
                                    isStageCompleted ? "bg-green-900/30 border-green-700" :
                                    isCurrent ? cn(colors.bg, "/30", colors.border) :
                                    "bg-slate-700/30 border-slate-700"
                                  )}
                                >
                                  {/* Members */}
                                  <div className="flex-1 space-y-1 overflow-hidden">
                                    {members.length === 0 ? (
                                      <div className="text-[10px] text-slate-500 text-center py-2">-</div>
                                    ) : (
                                      members.slice(0, 4).map((member, idx) => {
                                        const isTaskCompleted = member.status === 'completed'
                                        
                                        return (
                                          <div key={idx} className="flex items-center gap-1">
                                            {member.avatar ? (
                                              <img 
                                                src={member.avatar} 
                                                alt={member.name}
                                                className="w-5 h-5 rounded-full object-cover border border-white/30"
                                              />
                                            ) : (
                                              <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                                                isTaskCompleted ? "bg-green-500" : "bg-slate-600"
                                              )}>
                                                {member.name.charAt(0)}
                                              </div>
                                            )}
                                            <span className="text-[10px] text-slate-300 truncate flex-1">
                                              {member.name}
                                            </span>
                                            {isTaskCompleted ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                            ) : (
                                              <XCircle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                            )}
                                          </div>
                                        )
                                      })
                                    )}
                                  </div>

                                  {/* Progress */}
                                  <Progress 
                                    value={progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0} 
                                    className="h-1 mt-1 bg-slate-700 [&>div]:bg-white/80" 
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Page Indicator */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-1 shrink-0">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          currentPage === i ? "bg-violet-500 w-6" : "bg-slate-600 w-2"
                        )}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer - Fixed Height */}
        <div className="h-[5%] bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Mode Tampilan Publik • Pushakin Flows
          </div>
          <div className="text-xs text-slate-500">
            Halaman {currentPage + 1} dari {totalPages || 1}
          </div>
        </div>
      </div>
    </div>
  )
}
