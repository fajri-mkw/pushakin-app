'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import {
  Megaphone,
  FileText,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  User,
  ImageIcon,
  FileImage,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SOPItem {
  id: string
  title: string
  content: string
  type: 'SOP' | 'Pengumuman' | 'Panduan'
  displayMode: 'text' | 'static' | 'slideshow' | 'pdf'
  files: string | null
  slideshowSpeed: number
  published: boolean
  order: number
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function AnnouncementView() {
  const { currentUser, showAlert } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<SOPItem[]>([])
  const [activeTab, setActiveTab] = useState<'Pengumuman' | 'SOP' | 'Panduan'>('Pengumuman')
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'pdf' | 'image' } | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)

  const isAdmin = currentUser?.role === 'Admin'

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SOPItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'Pengumuman' as 'SOP' | 'Pengumuman' | 'Panduan',
    displayMode: 'text' as 'text' | 'static' | 'slideshow' | 'pdf',
    files: [] as string[],
    slideshowSpeed: 5000,
    published: false,
    order: 0
  })

  // Fetch items — non-Admin only sees published items
  const fetchItems = async () => {
    try {
      const params = new URLSearchParams({ type: activeTab })
      if (!isAdmin) {
        params.set('published', 'true')
      }
      const response = await fetch(`/api/sop?${params}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [activeTab])

  // Reset form
  const resetForm = () => {
    // Pengumuman default published=true agar langsung terlihat semua user
    // SOP & Panduan default published=false (perlu review dulu)
    const defaultPublished = activeTab === 'Pengumuman'
    setFormData({
      title: '',
      content: '',
      type: activeTab,
      displayMode: 'text',
      files: [],
      slideshowSpeed: 5000,
      published: defaultPublished,
      order: 0
    })
    setEditingItem(null)
  }

  // Open create dialog
  const openCreateDialog = () => {
    resetForm()
    setFormData(prev => ({ ...prev, type: activeTab }))
    setIsDialogOpen(true)
  }

  // Open edit dialog
  const openEditDialog = (item: SOPItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      displayMode: item.displayMode,
      files: item.files ? JSON.parse(item.files) : [],
      slideshowSpeed: item.slideshowSpeed,
      published: item.published,
      order: item.order
    })
    setIsDialogOpen(true)
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, base64]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove file
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  // Save item
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showAlert('Judul dan konten wajib diisi')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        authorId: currentUser?.id,
        files: formData.files.length > 0 ? formData.files : null
      }

      let response
      if (editingItem) {
        response = await fetch('/api/sop', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload })
        })
      } else {
        response = await fetch('/api/sop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        showAlert(editingItem ? 'Berhasil diperbarui!' : 'Berhasil dibuat!')
        setIsDialogOpen(false)
        resetForm()
        fetchItems()
      } else {
        const data = await response.json()
        showAlert(data.error || 'Gagal menyimpan')
      }
    } catch (error) {
      console.error('Error saving:', error)
      showAlert('Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus item ini?')) return

    try {
      const response = await fetch(`/api/sop?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showAlert('Berhasil dihapus!')
        fetchItems()
      } else {
        showAlert('Gagal menghapus')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showAlert('Terjadi kesalahan')
    }
  }

  // Toggle publish status
  const togglePublish = async (item: SOPItem) => {
    try {
      const response = await fetch('/api/sop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          published: !item.published
        })
      })

      if (response.ok) {
        showAlert(item.published ? 'Dipindahkan ke draft!' : 'Dipublikasikan!')
        fetchItems()
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  // Move order
  const moveOrder = async (item: SOPItem, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex(i => i.id === item.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= items.length) return

    const targetItem = items[targetIndex]

    try {
      await Promise.all([
        fetch('/api/sop', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, order: targetItem.order })
        }),
        fetch('/api/sop', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetItem.id, order: item.order })
        })
      ])

      fetchItems()
    } catch (error) {
      console.error('Error moving order:', error)
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'Pengumuman': return <Megaphone className="w-4 h-4" />
      case 'SOP': return <FileText className="w-4 h-4" />
      case 'Panduan': return <BookOpen className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  // Render the items list
  const renderItems = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
              activeTab === 'Pengumuman' ? 'bg-orange-100' :
              activeTab === 'SOP' ? 'bg-blue-100' : 'bg-green-100'
            )}>
              {getTabIcon(activeTab)}
            </div>
            <h3 className="text-lg font-semibold text-stone-800">
              {isAdmin ? `Belum ada ${activeTab}` : 'Belum ada pengumuman'}
            </h3>
            <p className="text-stone-500 mt-2 mb-4">
              {isAdmin
                ? `Klik tombol "Buat Baru" untuk membuat ${activeTab.toLowerCase()} pertama`
                : 'Belum ada pengumuman yang dipublikasikan oleh Admin.'}
            </p>
            {isAdmin && (
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Buat {activeTab}
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={item.id} className={cn(
            "transition-all",
            item.published ? "border-l-4 border-l-green-500" : "border-l-4 border-l-stone-300"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    {item.published ? (
                      <Badge variant="default" className="bg-green-600">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.author.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {item.displayMode !== 'text' && (
                      <Badge variant="outline" className="text-xs">
                        {item.displayMode === 'slideshow' ? 'Slideshow' :
                         item.displayMode === 'static' ? 'Gambar' : 'PDF'}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                {/* Admin action buttons */}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveOrder(item, 'up')} disabled={index === 0} className="h-8 w-8">
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveOrder(item, 'down')} disabled={index === items.length - 1} className="h-8 w-8">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => togglePublish(item)} className={cn("h-8 w-8", item.published ? "text-green-600" : "text-stone-400")}>
                      {item.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-stone-600 text-sm whitespace-pre-line">
                {item.content}
              </p>
              {item.files && (() => {
                const fileList = JSON.parse(item.files)
                const visibleFiles = fileList.slice(0, 4)
                const extraCount = fileList.length - 4
                return (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {visibleFiles.map((file: string, i: number) => {
                      const isPdf = file.startsWith('data:application/pdf')
                      return (
                        <div
                          key={i}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border bg-stone-100 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-500 hover:shadow-md transition-all group"
                          onClick={() => {
                            if (isPdf) {
                              // Open PDF in new tab
                              const link = window.document.createElement('a')
                              link.href = file
                              link.target = '_blank'
                              link.rel = 'noopener noreferrer'
                              link.click()
                            } else {
                              // Open image in preview dialog
                              setPreviewIndex(i)
                              setPreviewFile({ url: file, type: 'image' })
                            }
                          }}
                          title={isPdf ? 'Klik untuk buka PDF' : 'Klik untuk preview gambar'}
                        >
                          {isPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                              <FileText className="w-8 h-8 text-red-500" />
                              <span className="text-[8px] text-red-400 mt-0.5 font-medium">PDF</span>
                            </div>
                          ) : (
                            <>
                              <img src={file} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                              </div>
                            </>
                          )}
                          {extraCount > 0 && i === 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                              +{fileList.length - 4}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className={cn(
            "w-6 h-6",
            activeTab === 'Pengumuman' ? "text-orange-500" :
            activeTab === 'SOP' ? "text-blue-500" : "text-green-500"
          )} />
          <div>
            <h1 className="text-2xl font-bold text-stone-800">
              {isAdmin ? 'Manajemen Konten' : 'Pengumuman'}
            </h1>
            <p className="text-stone-500 text-sm">
              {isAdmin ? 'Kelola Pengumuman, SOP, dan Panduan' : 'Informasi dan pengumuman terbaru dari Admin'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buat Baru
          </Button>
        )}
      </div>

      {/* Tabs - only show for Admin */}
      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="Pengumuman" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Pengumuman
            </TabsTrigger>
            <TabsTrigger value="SOP" className="gap-2">
              <FileText className="w-4 h-4" />
              SOP
            </TabsTrigger>
            <TabsTrigger value="Panduan" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Panduan
            </TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-6">
            {renderItems()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          {renderItems()}
        </div>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Preview File</DialogTitle>
            <DialogDescription>
              {previewFile?.type === 'pdf' ? 'Preview dokumen PDF' : 'Preview gambar'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {previewFile?.type === 'image' && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={previewFile.url}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              </div>
            )}
            {previewFile?.type === 'pdf' && (
              <div className="rounded-lg overflow-hidden border bg-stone-50">
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh]"
                  title="PDF Preview"
                />
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button
              variant="outline"
              onClick={() => {
                if (previewFile) {
                  const link = window.document.createElement('a')
                  link.href = previewFile.url
                  link.download = previewFile.type === 'pdf' ? 'document.pdf' : 'image.png'
                  link.click()
                }
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setPreviewFile(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog - Admin only */}
      {isAdmin && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? `Edit ${activeTab}` : `Buat ${activeTab} Baru`}
              </DialogTitle>
              <DialogDescription>
                Isi form di bawah untuk {editingItem ? 'memperbarui' : 'membuat'} {activeTab.toLowerCase()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={`Judul ${activeTab}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Konten</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={`Tulis isi ${activeTab.toLowerCase()} di sini...`}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Mode Tampilan</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'text', label: 'Teks', icon: FileText },
                    { value: 'static', label: 'Gambar Statis', icon: ImageIcon },
                    { value: 'slideshow', label: 'Slideshow', icon: FileImage },
                    { value: 'pdf', label: 'PDF', icon: FileText }
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={formData.displayMode === mode.value ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        displayMode: mode.value as typeof formData.displayMode
                      }))}
                    >
                      <mode.icon className="w-4 h-4 mr-2" />
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              {(formData.displayMode === 'static' || formData.displayMode === 'slideshow' || formData.displayMode === 'pdf') && (
                <div className="space-y-2">
                  <Label>Upload File (PDF/JPG/PNG)</Label>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-violet-600" />
                      </div>
                      <span className="text-sm text-stone-600">Klik untuk upload atau drag & drop</span>
                      <span className="text-xs text-stone-400">PDF, JPG, PNG (maks. 5MB per file)</span>
                    </label>
                  </div>

                  {formData.files.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {formData.files.map((file, i) => (
                        <div key={i} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border bg-stone-100">
                            {file.startsWith('data:application/pdf') ? (
                              <div className="w-full h-full flex items-center justify-center bg-red-50">
                                <FileText className="w-8 h-8 text-red-500" />
                              </div>
                            ) : (
                              <img src={file} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formData.displayMode === 'slideshow' && (
                <div className="space-y-2">
                  <Label htmlFor="speed">Kecepatan Slideshow (detik)</Label>
                  <Input
                    id="speed"
                    type="number"
                    value={formData.slideshowSpeed / 1000}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slideshowSpeed: (parseInt(e.target.value) || 5) * 1000
                    }))}
                    min={1}
                    max={30}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50">
                <div>
                  <Label className="font-semibold">Publikasikan</Label>
                  <p className="text-sm text-stone-500">
                    {formData.published
                      ? 'Akan terlihat oleh semua user'
                      : 'Disimpan sebagai draft'}
                  </p>
                </div>
                <Switch
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.title.trim() || !formData.content.trim()}
                className="bg-gradient-to-r from-violet-600 to-purple-600"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  editingItem ? 'Perbarui' : 'Simpan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
