'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore, STAGES } from '@/lib/store'
import { 
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  FolderKanban,
  RefreshCw
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
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
  { id: 'active', label: 'Berjalan' },
  { id: 'day', label: 'Hari Ini' },
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' }
]

const STAGE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'bg-violet-600', border: 'border-violet-400', text: 'text-violet-400' },
  2: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-400' },
  3: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-400' },
  4: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-400' },
}

const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes
const AUTO_PLAY_INTERVAL = 8000 // 8 seconds between pages

export function PublicTrackerView({ onBack }: PublicTrackerViewProps) {
  const { showAlert } = useAppStore()
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [allProjects, setAllProjects] = useState<PublicProject[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState('active') // Default to active projects
  const [currentPage, setCurrentPage] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 10 projects per page in 5x2 grid
  const PROJECTS_PER_PAGE = 10

  const fetchProjects = useCallback(async (filter: string, silent = false) => {
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    try {
      const response = await fetch(`/api/public-tracker?filter=${filter}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to load data')
        return
      }
      
      setStats(data.stats)
      setAllProjects(data.projects)
      setLastUpdated(new Date())
      setCurrentPage(0)
    } catch (err) {
      if (!silent) setError('Failed to load projects')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Filter projects based on client-side filter
  useEffect(() => {
    let filtered = allProjects
    if (timeFilter === 'active') {
      filtered = allProjects.filter(p => p.currentStage < 5)
    }
    setProjects(filtered)
    setCurrentPage(0)
  }, [allProjects, timeFilter])

  // Initial fetch
  useEffect(() => {
    fetchProjects('all')
  }, [fetchProjects])

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      fetchProjects('all', true)
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchProjects])

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

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
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
      <div className="w-full h-full flex flex-col">
        
        {/* Header - Compact */}
        <div className="h-[7%] min-h-[48px] bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-700 px-4 flex items-center justify-between shrink-0">
          {/* Left */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-1.5 rounded-lg">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide leading-tight">PUSHAKIN FLOWS</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-violet-400">Sistem Manajemen Produksi</span>
                <span className="text-slate-500 text-[10px]">|</span>
                <span className="text-[9px] text-slate-400">Tim Pusat Hubungan Masyarakat dan Keterbukaan Informasi</span>
              </div>
            </div>
          </div>
          
          {/* Center - Time */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono tracking-wider leading-tight">
              {formatTime(currentTime)}
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Right - Filter + Refresh */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchProjects('all', true)}
              className={cn(
                "p-1.5 rounded-lg transition-all border",
                isRefreshing 
                  ? "border-violet-500 text-violet-400 animate-spin" 
                  : "border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              )}
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTimeFilter(opt.id)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium rounded transition-all",
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
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-hidden">
          
          {/* Stats Row - Compact */}
          <div className="h-[13%] min-h-[56px] grid grid-cols-3 gap-3 shrink-0">
            {/* Total */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-3 border border-slate-700 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white leading-tight">{stats.total}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Proyek</div>
              </div>
            </div>

            {/* Active */}
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-3 border border-orange-500/30 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white leading-tight">{stats.active}</div>
                <div className="text-[11px] text-orange-100 uppercase tracking-wider">Sedang Berjalan</div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg p-3 border border-violet-500/30 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white leading-tight">{stats.completed}</div>
                <div className="text-[11px] text-violet-100 uppercase tracking-wider">Telah Selesai</div>
              </div>
            </div>
          </div>

          {/* Projects Grid - 5x2 for 10 projects */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {projects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-base">Tidak ada proyek untuk ditampilkan</p>
                </div>
              </div>
            ) : (
              <>
                {/* Project Cards - 5 columns x 2 rows */}
                <div className="flex-1 grid grid-cols-5 grid-rows-2 gap-2.5">
                  {currentProjects.map(project => {
                    const { percentage, stageProgress, teamByStage } = getTaskProgress(project)
                    const isCompleted = project.currentStage === 5
                    const currentStage = Math.min(project.currentStage, 4)

                    return (
                      <div
                        key={project.id}
                        className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0"
                      >
                        {/* Project Header - Compact */}
                        <div className="bg-gradient-to-r from-slate-900/80 via-blue-950/50 to-slate-900/80 px-2.5 py-1.5 flex items-center justify-between shrink-0 border-b border-slate-700/50">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Badge className={cn(
                              "shrink-0 text-[8px] font-bold uppercase px-1.5 py-0",
                              isCompleted ? "bg-green-500/90" : "bg-orange-500/90"
                            )}>
                              {isCompleted ? 'Selesai' : 'Aktif'}
                            </Badge>
                            <h3 className="text-[11px] font-bold text-white truncate leading-tight">{project.title}</h3>
                          </div>
                          <div className={cn(
                            "text-sm font-bold shrink-0 ml-1.5",
                            isCompleted ? "text-green-400" : percentage === 100 ? "text-green-400" : "text-white"
                          )}>{percentage}%</div>
                        </div>

                        {/* Step Flow - Compact horizontal */}
                        <div className="px-2 py-1.5 border-b border-slate-700/50 shrink-0">
                          <div className="flex items-center justify-between gap-0">
                            {[1, 2, 3, 4].map((stage, idx) => {
                              const colors = STAGE_COLORS[stage]
                              const isStageCompleted = stage < project.currentStage
                              const isCurrent = stage === project.currentStage
                              const progress = stageProgress[stage]
                              const stagePercent = progress.total > 0 
                                ? Math.round((progress.completed / progress.total) * 100) 
                                : 0
                              const hasTasks = progress.total > 0
                              
                              return (
                                <div key={stage} className="flex items-center flex-1 min-w-0">
                                  <div className="flex items-center gap-0.5 flex-1">
                                    <div className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0",
                                      isStageCompleted ? "bg-green-500 border-green-400 text-white" :
                                      isCurrent ? cn(colors.bg, "border-white/40 text-white shadow-md") :
                                      !hasTasks ? "bg-slate-800 border-slate-700 text-slate-600" :
                                      "bg-slate-700 border-slate-600 text-slate-400"
                                    )}>
                                      {isStageCompleted ? <CheckCircle2 className="w-3 h-3" /> : stage}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className={cn(
                                        "text-[8px] font-semibold truncate leading-tight",
                                        isStageCompleted ? "text-green-400" : isCurrent ? "text-white" : "text-slate-500"
                                      )}>
                                        {STAGES[stage]}
                                      </div>
                                      <div className={cn(
                                        "text-[9px] font-bold leading-tight",
                                        isStageCompleted ? "text-green-400" : isCurrent ? "text-white" : "text-slate-600"
                                      )}>
                                        {hasTasks ? `${stagePercent}%` : '-'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {idx < 3 && (
                                    <div className={cn(
                                      "h-[2px] mx-0.5 rounded-full shrink-0",
                                      isStageCompleted ? "bg-green-500 w-2" : "bg-slate-700 w-2"
                                    )}></div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Team - Very compact */}
                        <div className="flex-1 px-2 py-1 overflow-hidden">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 h-full">
                            {[1, 2, 3, 4].map((stage) => {
                              const members = teamByStage[stage]
                              const progress = stageProgress[stage]
                              const isStageCompleted = stage < project.currentStage
                              const isCurrent = stage === project.currentStage
                              const hasTasks = progress.total > 0
                              
                              return (
                                <div 
                                  key={stage}
                                  className={cn(
                                    "rounded px-1 py-0.5 flex flex-col min-h-0 border",
                                    isStageCompleted ? "bg-green-900/20 border-green-800/50" :
                                    isCurrent ? cn(STAGE_COLORS[stage].bg, "/20 border", STAGE_COLORS[stage].border, "/40") :
                                    hasTasks ? "bg-slate-700/20 border-slate-700/50" :
                                    "bg-transparent border-transparent"
                                  )}
                                >
                                  <div className="flex-1 overflow-hidden">
                                    {members.length === 0 ? (
                                      <div className="text-[8px] text-slate-600 text-center">-</div>
                                    ) : (
                                      <div className="space-y-px">
                                        {members.slice(0, 3).map((member, idx) => {
                                          const isTaskCompleted = member.status === 'completed'
                                          return (
                                            <div key={idx} className="flex items-center gap-0.5 leading-tight">
                                              <div className={cn(
                                                "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0",
                                                isTaskCompleted ? "bg-green-500" : "bg-slate-600"
                                              )}>
                                                {member.name.charAt(0)}
                                              </div>
                                              <span className="text-[8px] text-slate-300 truncate flex-1">
                                                {member.name.split(' ').slice(0, 2).join(' ')}
                                              </span>
                                              {isTaskCompleted ? (
                                                <CheckCircle2 className="w-2.5 h-2.5 text-green-400 shrink-0" />
                                              ) : (
                                                <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                              )}
                                            </div>
                                          )
                                        })}
                                        {members.length > 3 && (
                                          <div className="text-[7px] text-slate-500 text-center">+{members.length - 3} lainnya</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {hasTasks && (
                                    <Progress 
                                      value={progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0} 
                                      className="h-[3px] mt-0.5 bg-slate-700 [&>div]:bg-white/70 shrink-0" 
                                    />
                                  )}
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
                  <div className="flex items-center justify-center gap-1.5 py-0.5 shrink-0">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 rounded-full transition-all cursor-pointer",
                          currentPage === i ? "bg-violet-500 w-5" : "bg-slate-600 w-1.5"
                        )}
                        onClick={() => setCurrentPage(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="h-[4%] min-h-[28px] bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span>Mode Tampilan Publik • Pushakin Flows</span>
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isRefreshing ? "bg-violet-400 animate-pulse" : "bg-green-500"
                )}></span>
                Update terakhir: {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {projects.length > PROJECTS_PER_PAGE && (
              <span>Halaman {currentPage + 1} dari {totalPages} • </span>
            )}
            Menampilkan {currentProjects.length} dari {projects.length} proyek
          </div>
        </div>
      </div>
    </div>
  )
}
