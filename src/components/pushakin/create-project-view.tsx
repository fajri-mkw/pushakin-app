'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore, ROLES, ROLE_CONFIG, FOLDER_OPTIONS, STAGES } from '@/lib/store'
import { 
  Rocket, 
  Users, 
  Folder, 
  Loader2,
  FileText,
  BookTemplate,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

const OPSI_KEGIATAN = ['Peliputan', 'Pemberitaan', 'Live Streaming', 'Podcast', 'Desain', 'Lainnya']
const OPSI_OUTPUT = ['Teks', 'Foto', 'Video', 'Audio', 'Streaming', 'Desain', 'Podcast', 'Lainnya']
const TEMPLATE_STORAGE_KEY = 'pushakin_desc_templates'

interface DescTemplate {
  id: string
  name: string
  content: string
  createdAt: number
}

export function CreateProjectView() {
  const { currentUser, users, showAlert, setActiveView, addProject, addNotification, addSuratTugas, isCreatingProject, setIsCreatingProject } = useAppStore()
  
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [unit, setUnit] = useState('')
  const [tempat, setTempat] = useState('')
  const [waktu, setWaktu] = useState('')
  const [picName, setPicName] = useState('')
  const [picWhatsApp, setPicWhatsApp] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({})
  const [selectedFolders, setSelectedFolders] = useState(['raw', 'revised', 'final'])
  const [folderAccess, setFolderAccess] = useState<Record<string, Record<string, { download: boolean; upload: boolean }>>>({})
  const [jenisKegiatan, setJenisKegiatan] = useState<string[]>([])
  const [kebutuhanOutput, setKebutuhanOutput] = useState<string[]>([])
  const [kegiatanLainnya, setKegiatanLainnya] = useState('')
  const [outputLainnya, setOutputLainnya] = useState('')
  const [driveAutoCreate, setDriveAutoCreate] = useState(false)
  const [driveCreatingStatus, setDriveCreatingStatus] = useState<string | null>(null)
  const [descTemplates, setDescTemplates] = useState<DescTemplate[]>([])
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false)

  // Load templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (saved) {
        setDescTemplates(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const saveTemplates = useCallback((templates: DescTemplate[]) => {
    setDescTemplates(templates)
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
    } catch {}
  }, [])

  const createTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return
    const template: DescTemplate = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      content: newTemplateContent.trim(),
      createdAt: Date.now()
    }
    saveTemplates([...descTemplates, template])
    setNewTemplateName('')
    setNewTemplateContent('')
    setShowNewTemplateForm(false)
  }

  const deleteTemplate = (id: string) => {
    saveTemplates(descTemplates.filter(t => t.id !== id))
  }

  const applyTemplate = (content: string) => {
    setDesc(content)
    setShowTemplatePanel(false)
  }

  const toggleItem = (setter: typeof setJenisKegiatan, currentItems: string[], item: string) => {
    if (currentItems.includes(item)) {
      setter(currentItems.filter(i => i !== item))
    } else {
      setter([...currentItems, item])
    }
  }

  const toggleFolder = (folderId: string) => {
    if (selectedFolders.includes(folderId)) {
      setSelectedFolders(selectedFolders.filter(id => id !== folderId))
    } else {
      setSelectedFolders([...selectedFolders, folderId])
    }
  }

  const autoApplyAccess = () => {
    const access: Record<string, Record<string, { download: boolean; upload: boolean }>> = {}
    
    activeRolesForAssignment.forEach(role => {
      const user = users.find(u => u.role === role)
      if (!user) return
      const userId = user.id
      const config = ROLE_CONFIG[role]
      
      if (config?.stage === 1) {
        selectedFolders.forEach(fid => {
          if (!access[fid]) access[fid] = {}
          access[fid][userId] = {
            download: ['revised', 'final', 'desain', 'lainnya'].includes(fid),
            upload: ['raw', 'desain', 'lainnya'].includes(fid)
          }
        })
      } else if (config?.stage === 2) {
        selectedFolders.forEach(fid => {
          if (!access[fid]) access[fid] = {}
          access[fid][userId] = {
            download: ['raw', 'final', 'revised', 'desain', 'lainnya'].includes(fid),
            upload: ['revised', 'desain', 'lainnya'].includes(fid)
          }
        })
      } else if (config?.stage === 3) {
        selectedFolders.forEach(fid => {
          if (!access[fid]) access[fid] = {}
          access[fid][userId] = {
            download: ['raw', 'revised', 'final', 'desain', 'lainnya'].includes(fid),
            upload: ['final', 'revised', 'lainnya'].includes(fid)
          }
        })
      } else if (config?.stage === 4) {
        selectedFolders.forEach(fid => {
          if (!access[fid]) access[fid] = {}
          access[fid][userId] = {
            download: ['final', 'lainnya'].includes(fid),
            upload: false
          }
        })
      }
    })
    
    setFolderAccess(access)
  }

  const toggleFolderAccess = (folderId: string, userId: string, type: 'download' | 'upload') => {
    setFolderAccess(prev => {
      const current = prev[folderId]?.[userId] || { download: false, upload: false }
      const newValue = !current[type]
      return {
        ...prev,
        [folderId]: {
          ...prev[folderId],
          [userId]: { ...current, [type]: newValue }
        }
      }
    })
  }

  // Fetch Drive settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setDriveAutoCreate(data.driveAutoCreate)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rolesToAssign = Object.keys(selectedRoles).filter(k => selectedRoles[k])
    if (rolesToAssign.length === 0) {
      showAlert('Pilih minimal satu peran/petugas untuk proyek ini.')
      return
    }

    setIsCreatingProject(true)

    try {
      const tasks = rolesToAssign.map(role => {
        const config = ROLE_CONFIG[role]
        const assignedUser = users.find(u => u.role === role)
        return {
          role,
          stage: config?.stage || 1,
          assignedTo: assignedUser?.id || ''
        }
      })

      // Generate folder data - either real or mock
      let generatedFolders: Array<{
        folderId: string
        name: string
        desc: string
        color: string
        bg: string
        border: string
        link: string
        assignedRoles: string[]
        parentFolderId?: string
      }> = []

      if (driveAutoCreate) {
        // Try to create real Google Drive folders
        setDriveCreatingStatus('Membuat folder di Google Drive...')
        try {
          // Prepare assignedUsers for ALL stages subfolder creation
          const assignedUsersData = tasks.map(t => {
            const user = users.find(u => u.id === t.assignedTo)
            return {
              role: t.role,
              userName: user?.name || 'Unknown',
              userId: t.assignedTo,
              stage: t.stage
            }
          }).filter(u => u.userId) // Only include if user is assigned

          // Build uploadFolders map: folderId -> array of userIds who have upload access
          const uploadFoldersMap: Record<string, string[]> = {}
          selectedFolders.forEach(fid => {
            const accessForFolder = folderAccess[fid] || {}
            const uploadUsers = Object.entries(accessForFolder)
              .filter(([_, access]) => access.upload)
              .map(([userId, _]) => userId)
            if (uploadUsers.length > 0) {
              uploadFoldersMap[fid] = uploadUsers
            }
          })

          const driveResponse = await fetch('/api/drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectTitle: title,
              folderTypes: selectedFolders,
              assignedUsers: assignedUsersData,
              uploadFolders: uploadFoldersMap
            })
          })
          
          if (driveResponse.ok) {
            const driveData = await driveResponse.json()
            if (driveData.success) {
              // Map real Google Drive folders
              generatedFolders = driveData.folders.map((f: { folderId: string; name: string; webViewLink: string; parentFolderId?: string }) => {
                const optionInfo = FOLDER_OPTIONS.find(opt => opt.id === f.folderId)
                const isSubfolder = !!f.parentFolderId
                const parentOptionInfo = isSubfolder ? FOLDER_OPTIONS.find(opt => opt.id === f.parentFolderId) : null
                // Build assignedRoles from folderAccess
                const accessForFolder = isSubfolder 
                  ? (folderAccess[f.parentFolderId || ''] || {})
                  : (folderAccess[f.folderId] || {})
                const rolesWithAccess = Object.keys(accessForFolder)
                  .filter(uid => {
                    const acc = accessForFolder[uid]
                    return acc && (acc.download || acc.upload)
                  })
                  .map(uid => {
                    const user = users.find(u => u.id === uid)
                    const task = tasks.find(t => t.assignedTo === uid)
                    return task?.role || user?.role || ''
                  }).filter(Boolean)
                return {
                  folderId: f.folderId,
                  name: f.name,
                  desc: isSubfolder 
                    ? `Subfolder untuk ${f.name}` 
                    : (optionInfo?.desc || ''),
                  color: parentOptionInfo?.color || optionInfo?.color || 'text-stone-600',
                  bg: parentOptionInfo?.bg || optionInfo?.bg || 'bg-stone-100',
                  border: parentOptionInfo?.border || optionInfo?.border || 'border-stone-200',
                  link: f.webViewLink,
                  assignedRoles: [...new Set(rolesWithAccess)],
                  parentFolderId: f.parentFolderId || undefined
                }
              })
              console.log('[DRIVE] Created folders:', driveData.mainFolder)
            } else {
              // Fallback to mock
              console.log('[DRIVE] Auto-create failed, using mock folders')
              generatedFolders = createMockFolders(selectedFolders, rolesToAssign, tasks)
            }
          } else {
            // Fallback to mock
            console.log('[DRIVE] API error, using mock folders')
            generatedFolders = createMockFolders(selectedFolders, rolesToAssign, tasks)
          }
        } catch (driveError) {
          console.error('[DRIVE] Error:', driveError)
          generatedFolders = createMockFolders(selectedFolders, rolesToAssign, tasks)
        }
      } else {
        // Use mock folders
        generatedFolders = createMockFolders(selectedFolders, rolesToAssign, tasks)
      }

      setDriveCreatingStatus(null)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: desc,
          requesterUnit: unit,
          location: tempat,
          executionTime: waktu,
          picName,
          picWhatsApp,
          activityTypes: jenisKegiatan,
          customActivity: jenisKegiatan.includes('Lainnya') ? kegiatanLainnya : '',
          outputNeeds: kebutuhanOutput,
          customOutput: kebutuhanOutput.includes('Lainnya') ? outputLainnya : '',
          managerId: currentUser?.id,
          tasks,
          driveFolders: generatedFolders
        })
      })

      if (response.ok) {
        const project = await response.json()
        addProject(project)
        
        // Add in-app notifications for stage 1 tasks
        project.tasks.filter((t: { stage: number }) => t.stage === 1).forEach((t: { assignedTo: string }) => {
          addNotification({
            id: Date.now().toString() + Math.random(),
            userId: t.assignedTo,
            message: `Tugas baru dialokasikan untuk proyek ${title}`,
            projectId: project.id,
            targetView: 'project_detail',
            read: false,
            createdAt: new Date()
          })
        })

        // Create task assignment for all assigned users
        for (const t of project.tasks) {
          try {
            const suratResponse = await fetch('/api/surat-tugas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: project.id,
                userId: t.assignedTo,
                role: t.role,
                stage: t.stage
              })
            })
            
            if (suratResponse.ok) {
              const suratData = await suratResponse.json()
              addSuratTugas(suratData)
              console.log(`[SURAT TUGAS] Created for user ${t.assignedTo}, role: ${t.role}`)
            }
          } catch (suratError) {
            console.error(`[SURAT TUGAS] Failed to create for ${t.assignedTo}:`, suratError)
          }
        }

        setActiveView('dashboard')
      } else {
        showAlert('Gagal membuat proyek. Silakan coba lagi.')
      }
    } catch {
      showAlert('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsCreatingProject(false)
    setDriveCreatingStatus(null)
    }
  }

  const createMockFolders = (folderIds: string[], rolesToAssign: string[], tasksData: Array<{ role: string; assignedTo: string; stage: number }>) => {
    const folders: Array<{
      folderId: string
      name: string
      desc: string
      color: string
      bg: string
      border: string
      link: string
      assignedRoles: string[]
      parentFolderId?: string
    }> = []
    
    const nowTs = Date.now()
    
    // Helper to generate user subfolders based on folderAccess (who has upload=true)
    const generateSubfolders = (parentFolderId: string, taskList: Array<{ role: string; assignedTo: string }>) => {
      taskList.forEach(task => {
        // Only create subfolder if this user has upload access to this folder
        const access = folderAccess[parentFolderId]?.[task.assignedTo]
        if (!access?.upload) return
        
        const assignedUser = users.find(u => u.id === task.assignedTo)
        if (!assignedUser) return
        
        const nameParts = assignedUser.name.split(' ')
        const userCode = nameParts.length >= 2 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : assignedUser.name.substring(0, 2).toUpperCase()
        
        const subfolderName = `${userCode}_${assignedUser.name.replace(/\s+/g, '_')}_${task.role.replace(/\s*&\s*/g, '_')}`
        
        folders.push({
          folderId: `${parentFolderId}-${task.role.toLowerCase().replace(/\s*&\s*/g, '-')}-${task.assignedTo}`,
          name: subfolderName,
          desc: `Subfolder untuk ${assignedUser.name} (${task.role})`,
          color: 'text-stone-500',
          bg: 'bg-stone-50',
          border: 'border-stone-200',
          link: `https://drive.google.com/drive/folders/mock-${parentFolderId}-${task.role.toLowerCase()}-${task.assignedTo}-${nowTs}`,
          assignedRoles: [task.role],
          parentFolderId: parentFolderId
        })
      })
    }
    
    folderIds.forEach(folderId => {
      const optionInfo = FOLDER_OPTIONS.find(opt => opt.id === folderId)
      
      // Build assignedRoles from folderAccess (users who have download OR upload)
      const accessForFolder = folderAccess[folderId] || {}
      const assignedRolesList: string[] = []
      tasksData.forEach(t => {
        const acc = accessForFolder[t.assignedTo]
        if (acc && (acc.download || acc.upload)) {
          if (!assignedRolesList.includes(t.role)) {
            assignedRolesList.push(t.role)
          }
        }
      })
      
      folders.push({
        folderId,
        name: optionInfo?.name || `Folder ${folderId}`,
        desc: optionInfo?.desc || '',
        color: optionInfo?.color || 'text-stone-600',
        bg: optionInfo?.bg || 'bg-stone-100',
        border: optionInfo?.border || 'border-stone-200',
        link: `https://drive.google.com/drive/folders/mock-${folderId}-main-${nowTs}`,
        assignedRoles: assignedRolesList
      })
      
      // Create subfolders for users who have upload access
      generateSubfolders(folderId, tasksData)
    })
    
    return folders
  }

  const activeRolesForAssignment = Object.keys(selectedRoles).filter(k => selectedRoles[k])

  return (
    <Card className="max-w-4xl mx-auto overflow-hidden">
      <CardHeader className="bg-stone-50/50 border-b border-stone-100">
        <CardTitle>Form Perencanaan Proyek</CardTitle>
        <p className="text-sm text-stone-500">Tahap 0 - Input detail dan tugaskan tim</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title">Judul Proyek / Liputan</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2 border-t border-stone-100 pt-6 mt-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                Informasi Tambahan Logistik
              </h3>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="unit">Unit Pemohon</Label>
              <Input
                id="unit"
                required
                value={unit}
                onChange={e => setUnit(e.target.value)}
                
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tempat">Tempat / Lokasi</Label>
              <Input
                id="tempat"
                required
                value={tempat}
                onChange={e => setTempat(e.target.value)}
                
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="waktu">Waktu Pelaksanaan</Label>
              <Input
                id="waktu"
                required
                type="datetime-local"
                value={waktu}
                onChange={e => setWaktu(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="picName">Nama PIC</Label>
              <Input
                id="picName"
                required
                value={picName}
                onChange={e => setPicName(e.target.value)}
                
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="picWhatsApp">No. WhatsApp PIC</Label>
              <Input
                id="picWhatsApp"
                required
                value={picWhatsApp}
                onChange={e => setPicWhatsApp(e.target.value)}
                
                className="mt-1"
              />
            </div>

            {/* Activity Types */}
            <div className="md:col-span-2 border-t border-stone-100 pt-6 mt-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                Detail Kebutuhan & Output
              </h3>
            </div>

            <div>
              <Label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Jenis Kegiatan
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {OPSI_KEGIATAN.map(kegiatan => (
                  <Button
                    key={kegiatan}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleItem(setJenisKegiatan, jenisKegiatan, kegiatan)}
                    className={cn(
                      "transition-colors",
                      jenisKegiatan.includes(kegiatan) 
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700" 
                        : "bg-white border-stone-200 text-stone-600"
                    )}
                  >
                    {kegiatan}
                  </Button>
                ))}
              </div>
              {jenisKegiatan.includes('Lainnya') && (
                <Input
                  
                  value={kegiatanLainnya}
                  onChange={e => setKegiatanLainnya(e.target.value)}
                  className="mt-3"
                  required
                />
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Kebutuhan Output
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {OPSI_OUTPUT.map(output => (
                  <Button
                    key={output}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleItem(setKebutuhanOutput, kebutuhanOutput, output)}
                    className={cn(
                      "transition-colors",
                      kebutuhanOutput.includes(output) 
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700" 
                        : "bg-white border-stone-200 text-stone-600"
                    )}
                  >
                    {output}
                  </Button>
                ))}
              </div>
              {kebutuhanOutput.includes('Lainnya') && (
                <Input
                  
                  value={outputLainnya}
                  onChange={e => setOutputLainnya(e.target.value)}
                  className="mt-3"
                  required
                />
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="desc">Detail & Instruksi Permohonan</Label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplatePanel(!showTemplatePanel)}
                    className="gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    <BookTemplate className="w-3.5 h-3.5" />
                    <span>Template</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplatePanel && "rotate-180")} />
                  </Button>

                  {showTemplatePanel && (
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl border border-stone-200 shadow-lg z-50 overflow-hidden">
                      <div className="p-3 bg-stone-50 border-b border-stone-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-700">Template Deskripsi</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewTemplateForm(!showNewTemplateForm)}
                            className="h-6 w-6 p-0 text-indigo-600 hover:bg-indigo-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {showNewTemplateForm && (
                          <div className="mt-2 space-y-2">
                            <Input
                              type="text"
                              placeholder="Nama template..."
                              value={newTemplateName}
                              onChange={e => setNewTemplateName(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Textarea
                              placeholder="Isi template deskripsi..."
                              value={newTemplateContent}
                              onChange={e => setNewTemplateContent(e.target.value)}
                              rows={4}
                              className="text-xs"
                            />
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={createTemplate}
                                disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                              >
                                Simpan
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => { setShowNewTemplateForm(false); setNewTemplateName(''); setNewTemplateContent('') }}
                                className="h-7 text-xs"
                              >
                                Batal
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {descTemplates.length === 0 && !showNewTemplateForm && (
                        <div className="p-4 text-center">
                          <p className="text-xs text-stone-400">Belum ada template.</p>
                          <p className="text-[10px] text-stone-300 mt-1">Klik + untuk membuat template baru.</p>
                        </div>
                      )}

                      {descTemplates.length > 0 && (
                        <div className="max-h-48 overflow-y-auto">
                          {descTemplates.map(tpl => (
                            <div
                              key={tpl.id}
                              className="flex items-start gap-2 p-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-0 group"
                            >
                              <button
                                type="button"
                                onClick={() => applyTemplate(tpl.content)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="text-xs font-semibold text-stone-700 truncate">{tpl.name}</div>
                                <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-2">{tpl.content}</div>
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTemplate(tpl.id)}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Textarea
                id="desc"
                required
                rows={5}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                
                className="mt-1"
              />
            </div>
          </div>

          {/* Team Assignment */}
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-stone-800">Pembagian Tim & Penugasan</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(stage => {
                const rolesInStage = Object.keys(ROLE_CONFIG).filter(r => ROLE_CONFIG[r].stage === stage)
                if (rolesInStage.length === 0) return null
                
                return (
                  <div key={stage} className="bg-stone-50/60 p-5 rounded-2xl border border-stone-200/60">
                    <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">
                      Tahap {stage}: {STAGES[stage]}
                    </h4>
                    <div className="space-y-3">
                      {rolesInStage.map(role => (
                        <label key={role} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-all group">
                          <Checkbox
                            checked={selectedRoles[role] || false}
                            onCheckedChange={(checked) => 
                              setSelectedRoles({...selectedRoles, [role]: !!checked})
                            }
                          />
                          <div>
                            <div className="text-sm font-bold text-stone-700 group-hover:text-indigo-700 transition-colors">
                              {role}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5">
                              <Folder className="w-3 h-3" /> <span>Drive</span>
                              <span className="mx-1">•</span>
                              <Users className="w-3 h-3" /> <span>Auto-Assign</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Folder Selection & Access Control */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-indigo-900">
                <Checkbox checked={driveAutoCreate} disabled />
                <div className="font-bold flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  <span>Otomatis Generate Folder Workspace</span>
                  {driveAutoCreate ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AKTIF</span>
                  ) : (
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">MOCK MODE</span>
                  )}
                </div>
              </div>
              {activeRolesForAssignment.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoApplyAccess}
                  className="gap-2 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                >
                  <FileText className="w-4 h-4" />
                  <span>Otomatis Sesuaikan Akses</span>
                </Button>
              )}
            </div>
            
            {!driveAutoCreate && (
              <p className="text-sm text-amber-700 mb-4 ml-8">
                ⚠️ Mode mock aktif. Folder tidak akan dibuat di Google Drive sebenarnya.
              </p>
            )}
            
            <p className="text-sm text-indigo-700/80 mb-4 ml-8">
              Pilih folder dan atur akses Download (biru) & Upload (hijau) per petugas:
            </p>
            
            {/* Folder checkboxes */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6 ml-8">
              {FOLDER_OPTIONS.map(folder => {
                const isSelected = selectedFolders.includes(folder.id)
                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all select-none",
                      isSelected 
                        ? "bg-white border-indigo-500 shadow-sm" 
                        : "bg-stone-50/50 border-transparent hover:border-indigo-200"
                    )}
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <Checkbox 
                      checked={isSelected} 
                      className="pointer-events-none"
                    />
                    <span className={cn("text-xs font-bold truncate", isSelected ? "text-indigo-700" : "text-stone-500")}>
                      {folder.name.split(' (')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* Access Table */}
            {selectedFolders.length > 0 && activeRolesForAssignment.length > 0 && (
              <div className="ml-8 overflow-x-auto">
                <div className="inline-block min-w-full">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-indigo-200">
                        <th className="text-left py-2 px-3 text-[10px] font-bold text-stone-500 uppercase tracking-wider sticky left-0 bg-indigo-50/40 min-w-[180px]">
                          Petugas
                        </th>
                        {selectedFolders.map(fid => {
                          const opt = FOLDER_OPTIONS.find(o => o.id === fid)
                          return (
                            <th key={fid} className="text-center py-2 px-2 min-w-[100px]">
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", opt?.color || 'text-stone-600')}>
                                {opt?.name.split(' (')[0] || fid}
                              </span>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRolesForAssignment.map(role => {
                        const user = users.find(u => u.role === role)
                        if (!user) return null
                        const config = ROLE_CONFIG[role]
                        const stageNum = config?.stage || 0
                        
                        return (
                          <tr key={role} className="border-b border-stone-100 hover:bg-white/50">
                            <td className="py-2 px-3 sticky left-0 bg-indigo-50/40">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-stone-800">{user.name}</span>
                                <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                                  S{stageNum}
                                </span>
                              </div>
                              <div className="text-[9px] text-stone-400 truncate max-w-[150px]">{role}</div>
                            </td>
                            {selectedFolders.map(fid => {
                              const access = folderAccess[fid]?.[user.id] || { download: false, upload: false }
                              const hasUpload = access.upload
                              return (
                                <td key={fid} className="py-2 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleFolderAccess(fid, user.id, 'download')}
                                      className={cn(
                                        "w-7 h-7 rounded-md text-[10px] font-bold border transition-all",
                                        access.download
                                          ? "bg-blue-500 text-white border-blue-600 shadow-sm"
                                          : "bg-stone-50 text-stone-400 border-stone-200 hover:border-blue-300"
                                      )}
                                      title="Download"
                                    >
                                      DL
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleFolderAccess(fid, user.id, 'upload')}
                                      className={cn(
                                        "w-7 h-7 rounded-md text-[10px] font-bold border transition-all",
                                        hasUpload
                                          ? "bg-green-500 text-white border-green-600 shadow-sm"
                                          : "bg-stone-50 text-stone-400 border-stone-200 hover:border-green-300"
                                      )}
                                      title="Upload"
                                    >
                                      UL
                                    </button>
                                    {hasUpload && (
                                      <span className="text-[8px] text-amber-600 font-bold" title="Subfolder otomatis dibuat">
                                        📁
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold">DL</span>
                    Download
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded bg-green-500 text-white text-[8px] flex items-center justify-center font-bold">UL</span>
                    Upload
                  </span>
                  <span className="flex items-center gap-1">
                    <span>📁</span> = Subfolder otomatis
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 mt-4 border-t border-stone-200">
            <div className="flex gap-4 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveView('dashboard')}
                disabled={isCreatingProject}
                className="flex-1 sm:flex-none"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isCreatingProject}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{driveCreatingStatus || 'Menginisiasi Proyek...'}</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Inisiasi Proyek</span>
                    {driveAutoCreate && (
                      <span className="text-xs opacity-75">(Google Drive Aktif)</span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-stone-400 mt-2">
            Detail kegiatan akan muncul di inbox setiap anggota tim yang ditugaskan
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
