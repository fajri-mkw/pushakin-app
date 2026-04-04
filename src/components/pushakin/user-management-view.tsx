'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAppStore, ROLES } from '@/lib/store'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  UploadCloud,
  Users,
  LogIn,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef } from 'react'
import type { User } from '@/lib/store'

export function UserManagementView() {
  const { users, currentUser, originalAdminUser, showAlert, showConfirm, updateUser, addUser, deleteUser, loginAsUser, restoreAdmin } = useAppStore()
  const [loginAsTarget, setLoginAsTarget] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>({
    id: '',
    name: '',
    role: ROLES[0],
    avatar: '',
    email: '',
    whatsapp: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenAdd = () => {
    setFormData({
      id: '',
      name: '',
      role: ROLES[0],
      avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      email: '',
      whatsapp: ''
    })
    setEditMode(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user: User) => {
    setFormData(user)
    setEditMode(true)
    setIsModalOpen(true)
  }

  const handleDelete = (userId: string, userName: string) => {
    showConfirm(`Yakin ingin menghapus pengguna: ${userName}?`, async () => {
      try {
        await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
        deleteUser(userId)
      } catch {
        showAlert('Gagal menghapus pengguna')
      }
    })
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Don't send the fake client-side id when creating new user
      const payload = editMode ? formData : {
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        avatar: formData.avatar,
        role: formData.role
      }

      if (editMode && formData.id) {
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (response.ok) {
          const text = await response.text()
          if (text) {
            const user = JSON.parse(text)
            updateUser(user as User)
          }
        } else {
          const err = await response.json().catch(() => ({}))
          showAlert(err.error || 'Gagal menyimpan pengguna')
          return
        }
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (response.ok) {
          const text = await response.text()
          if (text) {
            const user = JSON.parse(text)
            addUser(user as User)
          }
        } else {
          const err = await response.json().catch(() => ({}))
          showAlert(err.error || 'Gagal menyimpan pengguna')
          return
        }
      }
      setIsModalOpen(false)
    } catch {
      showAlert('Gagal menyimpan pengguna')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <Input
              placeholder="Cari nama atau peran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-stone-50"
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-5 h-5" />
            <span>Tambah User Baru</span>
          </Button>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50">
              <TableHead className="font-semibold">Profil Pengguna</TableHead>
              <TableHead className="font-semibold">Kontak</TableHead>
              <TableHead className="font-semibold">Peran (Role)</TableHead>
              <TableHead className="font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-stone-50/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-stone-200">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-stone-800">{user.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-stone-700">{user.email}</div>
                  <div className="text-xs text-stone-500">{user.whatsapp}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {currentUser?.role === 'Admin' && user.role !== 'Admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLoginAsTarget(user)}
                        className="text-stone-400 hover:text-green-600 hover:bg-green-50"
                        title="Login sebagai user ini"
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(user)}
                      className="text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id, user.name)}
                      disabled={user.id === currentUser?.id}
                      className={cn(
                        user.id === currentUser?.id
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-400 hover:text-red-600 hover:bg-red-50"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-stone-500">
            Tidak ada pengguna yang ditemukan.
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="h-24 w-24 border-4 border-stone-100 shadow-sm group-hover:opacity-80 transition-all">
                  <AvatarImage src={formData.avatar || ''} />
                  <AvatarFallback>{formData.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UploadCloud className="w-8 h-8 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2 font-medium">
                Klik foto untuk mengunggah
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nama Lengkap</Label>
                <Input
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Peran Sistem (Role)</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value as User['role']})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  placeholder="email@contoh.com"
                  value={formData.email || ''}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>No WhatsApp</Label>
                <Input
                  value={formData.whatsapp || ''}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-6 mt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Simpan Data
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Login As Confirmation Dialog */}
      <Dialog open={!!loginAsTarget} onOpenChange={() => setLoginAsTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-green-600" />
              Login Sebagai User
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Anda akan masuk sebagai <strong>{loginAsTarget?.name}</strong> ({loginAsTarget?.role}). Semua tindakan akan dilakukan atas nama user tersebut.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoginAsTarget(null)}>Batal</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (loginAsTarget) {
                  loginAsUser(loginAsTarget)
                  showAlert(`Berhasil login sebagai ${loginAsTarget.name}`)
                  setLoginAsTarget(null)
                }
              }}
            >
              Login Sebagai {loginAsTarget?.name?.split(' ')[0]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
