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
  FileText
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const OPSI_KEGIATAN = ['Peliputan', 'Pemberitaan', 'Live Streaming', 'Podcast', 'Desain', 'Lainnya']
const OPSI_OUTPUT = ['Teks', 'Foto', 'Video', 'Audio', 'Streaming', 'Desain', 'Podcast', 'Lainnya']

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
  const [folderRoles, setFolderRoles] = useState<Record<string, string[]>>({})
  const [jenisKegiatan, setJenisKegiatan] = useState<string[]>([])
  const [kebutuhanOutput, setKebutuhanOutput] = useState<string[]>([])
  const [kegiatanLainnya, setKegiatanLainnya] = useState('')
  const [outputLainnya, setOutputLainnya] = useState('')
  const [driveAutoCreate, setDriveAutoCreate] = useState(false)
  const [driveCreatingStatus, setDriveCreatingStatus] = useState<string | null>(null)

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

  const toggleRoleForFolder = (folderId: string, role: string) => {
    setFolderRoles(prev => {
      const currentRoles = prev[folderId] || []
      if (currentRoles.includes(role)) {
        return { ...prev, [folderId]: currentRoles.filter(r => r !== role) }
      } else {
        return { ...prev, [folderId]: [...currentRoles, role] }
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

      // Stage 1 roles that upload to RAW folder
      const stage1Roles = ['Reporter', 'Photographer & Audio', 'Videographer & Audio', 'Graphic Designer']
      // Stage 2 roles that upload to REVISED folder
      const stage2Roles = ['Editor (Media)', 'Editor (Web Article & Social Media)', 'Streaming Operator', 'Podcast Operator']
      const stage1Tasks = tasks.filter(t => stage1Roles.includes(t.role))

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

          const driveResponse = await fetch('/api/drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectTitle: title,
              folderTypes: selectedFolders,
              assignedUsers: assignedUsersData
            })
          })
          
          if (driveResponse.ok) {
            const driveData = await driveResponse.json()
            if (driveData.success) {
              // Map real Google Drive folders
              generatedFolders = driveData.folders.map((f: { folderId: string; name: string; webViewLink: string }) => {
                const optionInfo = FOLDER_OPTIONS.find(opt => opt.id === f.folderId)
                const assignedToFolder = (folderRoles[f.folderId] || []).filter((r: string) => rolesToAssign.includes(r))
                return {
                  folderId: f.folderId,
                  name: f.name,
                  desc: optionInfo?.desc || '',
                  color: optionInfo?.color || 'text-stone-600',
                  bg: optionInfo?.bg || 'bg-stone-100',
                  border: optionInfo?.border || 'border-stone-200',
                  link: f.webViewLink,
                  assignedRoles: assignedToFolder
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

  // Helper function to create mock folders with user-specific subfolders for RAW, REVISED, and DESAIN
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
    
    // Stage 1 roles that upload to RAW
    const stage1Roles = ['Reporter', 'Photographer & Audio', 'Videographer & Audio', 'Graphic Designer']
    // Stage 2 roles that upload to REVISED
    const stage2Roles = ['Editor (Media)', 'Editor (Web Article & Social Media)', 'Streaming Operator', 'Podcast Operator']
    
    const stage1Tasks = tasksData.filter(t => stage1Roles.includes(t.role))
    const stage2Tasks = tasksData.filter(t => stage2Roles.includes(t.role))
    const graphicDesignerTasks = tasksData.filter(t => t.role === 'Graphic Designer')
    const reviewerTasks = tasksData.filter(t => t.role === 'Reviewer')
    // Roles for LAINNYA subfolders (assigned production staff)
    const lainnyaRoles = ['Reporter', 'Photographer & Audio', 'Videographer & Audio']
    const lainnyaTasks = tasksData.filter(t => lainnyaRoles.includes(t.role))
    
    // Helper to generate user subfolders for a given parent
    const generateSubfolders = (parentFolderId: string, parentFolderName: string, taskList: Array<{ role: string; assignedTo: string }>, parentTs: number) => {
      taskList.forEach((task, idx) => {
        const assignedUser = users.find(u => u.id === task.assignedTo)
        if (assignedUser) {
          const nameParts = assignedUser.name.split(' ')
          const userCode = nameParts.length >= 2 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : assignedUser.name.substring(0, 2).toUpperCase()
          
          const subfolderName = `${userCode}_${assignedUser.name.replace(/\s+/g, '_')}_${task.role.replace(/\s*&\s*/g, '_')}`
          
          folders.push({
            folderId: `${parentFolderId}-${task.role.toLowerCase().replace(/\s*&\s*/g, '-')}-${idx}`,
            name: subfolderName,
            desc: `Subfolder untuk ${assignedUser.name} (${task.role})`,
            color: 'text-stone-500',
            bg: 'bg-stone-50',
            border: 'border-stone-200',
            link: `https://drive.google.com/drive/folders/mock-${parentFolderId}-${task.role.toLowerCase()}-${idx}-${Date.now()}`,
            assignedRoles: [task.role],
            parentFolderId: parentFolderId
          })
        }
      })
    }
    
    folderIds.forEach(folderId => {
      const optionInfo = FOLDER_OPTIONS.find(opt => opt.id === folderId)
      const assignedToFolder = (folderRoles[folderId] || []).filter(r => rolesToAssign.includes(r))
      const nowTs = Date.now()
      
      if (folderId === 'raw' && stage1Tasks.length > 0) {
        // Create main RAW folder
        folders.push({
          folderId: 'raw',
          name: optionInfo?.name || 'RAW FOLDER',
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-stone-600',
          bg: optionInfo?.bg || 'bg-stone-100',
          border: optionInfo?.border || 'border-stone-200',
          link: `https://drive.google.com/drive/folders/mock-raw-main-${nowTs}`,
          assignedRoles: []
        })
        // Create Stage 1 user-specific subfolders inside RAW
        generateSubfolders('raw', 'RAW', stage1Tasks, nowTs)
      } else if (folderId === 'revised' && stage2Tasks.length > 0) {
        // Create main REVISED folder
        folders.push({
          folderId: 'revised',
          name: optionInfo?.name || 'REVISED FOLDER',
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-orange-600',
          bg: optionInfo?.bg || 'bg-orange-50',
          border: optionInfo?.border || 'border-orange-200',
          link: `https://drive.google.com/drive/folders/mock-revised-main-${nowTs}`,
          assignedRoles: []
        })
        // Create Stage 2 user-specific subfolders inside REVISED
        generateSubfolders('revised', 'REVISED', stage2Tasks, nowTs)
      } else if (folderId === 'desain' && graphicDesignerTasks.length > 0) {
        // Create main DESAIN folder
        folders.push({
          folderId: 'desain',
          name: optionInfo?.name || 'DESAIN FOLDER',
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-blue-600',
          bg: optionInfo?.bg || 'bg-blue-50',
          border: optionInfo?.border || 'border-blue-200',
          link: `https://drive.google.com/drive/folders/mock-desain-main-${nowTs}`,
          assignedRoles: []
        })
        // Create Graphic Designer subfolders inside DESAIN
        generateSubfolders('desain', 'DESAIN', graphicDesignerTasks, nowTs)
      } else if (folderId === 'final') {
        // FINAL PRODUCT - create main folder
        folders.push({
          folderId: 'final',
          name: optionInfo?.name || 'FINAL PRODUCT',
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-green-600',
          bg: optionInfo?.bg || 'bg-green-50',
          border: optionInfo?.border || 'border-green-200',
          link: `https://drive.google.com/drive/folders/mock-final-main-${nowTs}`,
          assignedRoles: []
        })
        // Create Reviewer subfolders inside FINAL (for revision uploads)
        if (reviewerTasks.length > 0) {
          generateSubfolders('final', 'FINAL', reviewerTasks, nowTs)
        }
      } else if (folderId === 'lainnya' && lainnyaTasks.length > 0) {
        // LAINNYA - create main folder
        folders.push({
          folderId: 'lainnya',
          name: optionInfo?.name || 'LAINNYA',
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-purple-600',
          bg: optionInfo?.bg || 'bg-purple-50',
          border: optionInfo?.border || 'border-purple-200',
          link: `https://drive.google.com/drive/folders/mock-lainnya-main-${nowTs}`,
          assignedRoles: []
        })
        // Create Stage 1 staff subfolders inside LAINNYA
        generateSubfolders('lainnya', 'LAINNYA', lainnyaTasks, nowTs)
      } else {
        // Other folders stay as-is with no subfolders
        folders.push({
          folderId,
          name: optionInfo?.name || `Folder ${folderId}`,
          desc: optionInfo?.desc || '',
          color: optionInfo?.color || 'text-stone-600',
          bg: optionInfo?.bg || 'bg-stone-100',
          border: optionInfo?.border || 'border-stone-200',
          link: `https://drive.google.com/drive/folders/mock-${folderId}-${nowTs}`,
          assignedRoles: assignedToFolder
        })
      }
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
              <Label htmlFor="desc">Detail & Instruksi Permohonan</Label>
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

          {/* Folder Selection */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-indigo-900">
              <Checkbox checked={driveAutoCreate} disabled />
              <div className="font-bold flex items-center gap-2">
                <Folder className="w-5 h-5" />
                <span>Otomatis Generate Folder Workspace (Google Drive)</span>
                {driveAutoCreate ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AKTIF</span>
                ) : (
                  <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">MOCK MODE</span>
                )}
              </div>
            </div>
            {!driveAutoCreate && (
              <p className="text-sm text-amber-700 mb-4 ml-8">
                ⚠️ Mode mock aktif. Folder tidak akan dibuat di Google Drive sebenarnya. 
                <span className="font-medium"> Aktifkan di menu Pengaturan.</span>
              </p>
            )}
            <p className="text-sm text-indigo-700/80 mb-4 ml-8">
              Pilih struktur folder dan tentukan user mana saja yang memiliki akses:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
              {FOLDER_OPTIONS.map(folder => {
                const isSelected = selectedFolders.includes(folder.id)
                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex flex-col p-4 rounded-xl border-2 transition-all",
                      isSelected 
                        ? "bg-white border-indigo-500 shadow-sm" 
                        : "bg-stone-50/50 border-transparent hover:border-indigo-200"
                    )}
                  >
                    <label className="flex items-start gap-3 cursor-pointer w-full">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFolder(folder.id)}
                      />
                      <div className="flex-1">
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          {folder.title}
                        </div>
                        <div className="text-sm font-bold text-stone-800">{folder.name}</div>
                        <div className="text-xs text-stone-500 mt-1">{folder.desc}</div>
                      </div>
                    </label>

                    {isSelected && activeRolesForAssignment.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-100 w-full ml-7 pl-0.5">
                        <p className="text-[10px] font-bold text-indigo-600/70 mb-2 uppercase tracking-wider">
                          Akses Untuk:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeRolesForAssignment.map(role => {
                            const isRoleAssigned = (folderRoles[folder.id] || []).includes(role)
                            return (
                              <Button
                                key={role}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-auto px-2 py-1 text-[10px]",
                                  isRoleAssigned 
                                    ? "bg-indigo-600 text-white shadow-sm" 
                                    : "bg-stone-100 text-stone-500 border border-stone-200"
                                )}
                                onClick={(e) => { e.preventDefault(); toggleRoleForFolder(folder.id, role); }}
                              >
                                {role}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
