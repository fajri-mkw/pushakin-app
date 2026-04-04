import { create } from 'zustand'

// Types
export type Role = 
  | 'Admin' 
  | 'Manager' 
  | 'Reporter' 
  | 'Photographer & Audio' 
  | 'Videographer & Audio'
  | 'Editor (Media)' 
  | 'Editor (Web Article & Social Media)' 
  | 'Graphic Designer'
  | 'Streaming Operator' 
  | 'Podcast Operator' 
  | 'Reviewer' 
  | 'Publisher Web' 
  | 'Publisher Social Media'

export interface User {
  id: string
  name: string
  email: string
  whatsapp: string
  avatar: string
  role: Role
}

export interface PublishLink {
  id: string
  platform: string
  url: string
}

export interface TaskData {
  link?: string
  notes?: string
  publishLinks?: PublishLink[]
}

export interface Task {
  id: string
  role: string
  stage: number
  status: 'pending' | 'completed'
  assignedTo: string | null
  data: TaskData
}

export interface DriveFolder {
  id: string
  folderId: string
  name: string
  desc: string
  color: string
  bg: string
  border: string
  link: string
  assignedRoles: string[]
  parentFolderId?: string | null
}

export interface Project {
  id: string
  title: string
  description: string
  requesterUnit: string
  location: string
  executionTime: string
  picName: string
  picWhatsApp: string
  activityTypes: string[]
  customActivity: string
  outputNeeds: string[]
  customOutput: string
  currentStage: number
  managerId: string
  createdAt: string
  driveFolders: DriveFolder[]
  tasks: Task[]
}

export interface Notification {
  id: string
  userId: string
  message: string
  projectId: string
  targetView: string
  read: boolean
  createdAt: Date
}

export interface SuratTugas {
  id: string
  nomorSurat: string
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
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

export type ViewType = 
  | 'login' 
  | 'dashboard' 
  | 'create' 
  | 'project_detail' 
  | 'users' 
  | 'reports' 
  | 'profile' 
  | 'overview'
  | 'settings'
  | 'inbox'
  | 'announcements'

export interface DialogState {
  isOpen: boolean
  type: 'alert' | 'confirm'
  message: string
  onConfirm: (() => void) | null
}

// Constants
export const STAGES: Record<number, string> = {
  0: 'Perencanaan',
  1: 'Produksi',
  2: 'Pasca Produksi',
  3: 'Review',
  4: 'Publikasi',
  5: 'Selesai'
}

export const ROLES: Role[] = [
  'Admin', 'Manager', 'Reporter', 'Photographer & Audio', 'Videographer & Audio',
  'Editor (Media)', 'Editor (Web Article & Social Media)', 'Graphic Designer',
  'Streaming Operator', 'Podcast Operator', 'Reviewer', 'Publisher Web', 'Publisher Social Media'
]

export const ROLE_CONFIG: Record<string, { stage: number; type: string; icon: string }> = {
  'Reporter': { stage: 1, type: 'upload', icon: 'FileText' },
  'Photographer & Audio': { stage: 1, type: 'upload', icon: 'FileImage' },
  'Videographer & Audio': { stage: 1, type: 'upload', icon: 'FileVideo' },
  'Graphic Designer': { stage: 1, type: 'upload', icon: 'FileImage' },
  
  'Editor (Media)': { stage: 2, type: 'download_upload', icon: 'FileVideo' },
  'Editor (Web Article & Social Media)': { stage: 2, type: 'download_upload', icon: 'FileText' },
  'Streaming Operator': { stage: 2, type: 'paste_streaming', icon: 'PlayCircle' },
  'Podcast Operator': { stage: 2, type: 'paste_youtube', icon: 'FileAudio' },
  
  'Reviewer': { stage: 3, type: 'review', icon: 'AlertCircle' },
  
  'Publisher Web': { stage: 4, type: 'download_link', icon: 'Link' },
  'Publisher Social Media': { stage: 4, type: 'download_link', icon: 'Link' },
}

export const FOLDER_OPTIONS = [
  { id: 'raw', title: '1. FOLDER', name: 'RAW FOLDER (Hasil Mentah)', desc: 'Untuk upload mentahan: Reporter, Fotografer, Videografer, Desain Grafis.', color: 'text-stone-600', bg: 'bg-stone-100', border: 'border-stone-200' },
  { id: 'revised', title: '2. FOLDER', name: 'REVISED FOLDER (Draft & Editing)', desc: 'Untuk Editor, Reviewer, dan Publisher. Direview oleh QC.', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'final', title: '3. FOLDER', name: 'FINAL PRODUCT (Siap Publish)', desc: 'Hasil akhir yang siap didownload Publisher Web/Sosmed.', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { id: 'desain', title: '4. FOLDER', name: 'DESAIN FOLDER (Aset Visual)', desc: 'Khusus untuk penyimpanan file project desain.', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'lainnya', title: '5. FOLDER', name: 'LAINNYA (Folder Tambahan)', desc: 'Folder kustom tambahan untuk keperluan logistik.', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
]

// Store Interface
interface AppState {
  // Data
  users: User[]
  currentUser: User | null
  realAdminUser: User | null // Stores the actual admin when impersonating
  projects: Project[]
  notifications: Notification[]
  suratTugas: SuratTugas[]
  
  // UI State
  activeView: ViewType
  selectedProjectId: string | null
  isCreatingProject: boolean
  isEditProjectModalOpen: boolean
  editProjectData: Project | null
  
  // Dialog
  dialog: DialogState
  
  // Actions - Users
  setUsers: (users: User[]) => void
  setCurrentUser: (user: User | null) => void
  updateUser: (user: User) => void
  addUser: (user: User) => void
  deleteUser: (userId: string) => void
  impersonateUser: (user: User) => void
  stopImpersonating: () => void
  
  // Actions - Projects
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  deleteProject: (projectId: string) => void
  
  // Actions - Tasks
  completeTask: (projectId: string, taskId: string, taskData: TaskData) => void
  rejectReview: (projectId: string) => void
  
  // Actions - Notifications
  addNotification: (notification: Notification) => void
  markNotifRead: (id: string) => void
  setNotifications: (notifications: Notification[]) => void
  
  // Actions - Surat Tugas
  setSuratTugas: (suratTugas: SuratTugas[]) => void
  addSuratTugas: (surat: SuratTugas) => void
  markSuratRead: (id: string) => void
  
  // Actions - UI
  setActiveView: (view: ViewType) => void
  setSelectedProjectId: (id: string | null) => void
  setIsCreatingProject: (value: boolean) => void
  setIsEditProjectModalOpen: (value: boolean) => void
  setEditProjectData: (data: Project | null) => void
  
  // Actions - Dialog
  showAlert: (message: string) => void
  showConfirm: (message: string, onConfirm: () => void) => void
  closeDialog: () => void
  
  // Derived
  getMyNotifications: () => Notification[]
  getUnreadCount: () => number
  getVisibleProjects: () => Project[]
  getCompletedProjects: () => Project[]
  getMySuratTugas: () => SuratTugas[]
  getUnreadSuratCount: () => number
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  users: [],
  currentUser: null,
  realAdminUser: null,
  projects: [],
  notifications: [],
  suratTugas: [],
  
  activeView: 'login',
  selectedProjectId: null,
  isCreatingProject: false,
  isEditProjectModalOpen: false,
  editProjectData: null,
  
  dialog: { isOpen: false, type: 'alert', message: '', onConfirm: null },
  
  // User Actions
  setUsers: (users) => set({ users }),
  setCurrentUser: (user) => set({ currentUser: user, realAdminUser: null, activeView: user ? 'dashboard' : 'login' }),
  updateUser: (user) => set((state) => {
    const updatedUsers = state.users.map(u => u.id === user.id ? user : u)
    const updatedCurrentUser = state.currentUser?.id === user.id ? user : state.currentUser
    return { users: updatedUsers, currentUser: updatedCurrentUser }
  }),
  addUser: (user) => set((state) => ({ users: [user, ...state.users] })),
  deleteUser: (userId) => set((state) => ({ users: state.users.filter(u => u.id !== userId) })),
  impersonateUser: (user) => set((state) => ({
    realAdminUser: state.currentUser,
    currentUser: user,
    activeView: 'dashboard'
  })),
  stopImpersonating: () => set((state) => {
    const admin = state.realAdminUser
    if (!admin) return {}
    return { currentUser: admin, realAdminUser: null, activeView: 'dashboard' }
  }),
  
  // Project Actions
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (project) => set((state) => ({
    projects: state.projects.map(p => p.id === project.id ? project : p)
  })),
  deleteProject: (projectId) => set((state) => {
    const newSelectedId = state.selectedProjectId === projectId ? null : state.selectedProjectId
    const newActiveView = state.selectedProjectId === projectId ? 'dashboard' : state.activeView
    return { 
      projects: state.projects.filter(p => p.id !== projectId),
      selectedProjectId: newSelectedId,
      activeView: newActiveView
    }
  }),
  
  // Task Actions
  completeTask: (projectId, taskId, taskData) => set((state) => {
    const updatedProjects = state.projects.map(p => {
      if (p.id !== projectId) return p
      
      const updatedTasks = p.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, data: taskData } : t
      )
      
      const currentStageTasks = updatedTasks.filter(t => t.stage === p.currentStage)
      const allCurrentDone = currentStageTasks.length > 0 && currentStageTasks.every(t => t.status === 'completed')
      
      let nextStage = p.currentStage
      if (allCurrentDone) {
        nextStage = p.currentStage + 1
      }
      
      return { ...p, tasks: updatedTasks, currentStage: nextStage }
    })
    
    return { projects: updatedProjects }
  }),
  
  rejectReview: (projectId) => set((state) => {
    const updatedProjects = state.projects.map(p => {
      if (p.id !== projectId) return p
      
      const updatedTasks = p.tasks.map(t => {
        if (t.stage === 2 || t.stage === 3) return { ...t, status: 'pending' as const, data: {} }
        return t
      })
      
      return { ...p, tasks: updatedTasks, currentStage: 2 }
    })
    
    return { projects: updatedProjects }
  }),
  
  // Notification Actions
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  markNotifRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  setNotifications: (notifications) => set({ notifications }),
  
  // Surat Tugas Actions
  setSuratTugas: (suratTugas) => set({ suratTugas }),
  addSuratTugas: (surat) => set((state) => ({
    suratTugas: [surat, ...state.suratTugas]
  })),
  markSuratRead: (id) => set((state) => ({
    suratTugas: state.suratTugas.map(s => s.id === id ? { ...s, read: true } : s)
  })),
  
  // UI Actions
  setActiveView: (view) => set({ activeView: view }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setIsCreatingProject: (value) => set({ isCreatingProject: value }),
  setIsEditProjectModalOpen: (value) => set({ isEditProjectModalOpen: value }),
  setEditProjectData: (data) => set({ editProjectData: data }),
  
  // Dialog Actions
  showAlert: (message) => set({ dialog: { isOpen: true, type: 'alert', message, onConfirm: null } }),
  showConfirm: (message, onConfirm) => set({ dialog: { isOpen: true, type: 'confirm', message, onConfirm } }),
  closeDialog: () => set({ dialog: { isOpen: false, type: 'alert', message: '', onConfirm: null } }),
  
  // Derived Getters
  getMyNotifications: () => {
    const state = get()
    return state.currentUser ? state.notifications.filter(n => n.userId === state.currentUser!.id) : []
  },
  getUnreadCount: () => {
    const state = get()
    return state.currentUser ? state.notifications.filter(n => n.userId === state.currentUser!.id && !n.read).length : 0
  },
  getVisibleProjects: () => {
    const state = get()
    if (!state.currentUser) return []
    if (['Admin', 'Manager'].includes(state.currentUser.role)) return state.projects
    return state.projects.filter(p => p.tasks.some(t => t.assignedTo === state.currentUser!.id))
  },
  getCompletedProjects: () => {
    const state = get()
    return state.projects.filter(p => p.currentStage === 5)
  },
  getMySuratTugas: () => {
    const state = get()
    return state.currentUser ? state.suratTugas.filter(s => s.userId === state.currentUser!.id) : []
  },
  getUnreadSuratCount: () => {
    const state = get()
    return state.currentUser ? state.suratTugas.filter(s => s.userId === state.currentUser!.id && !s.read).length : 0
  }
}))
