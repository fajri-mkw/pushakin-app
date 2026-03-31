import { db, ensureDbConnection } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET all users
export async function GET() {
  try {
    // Ensure database connection
    const isConnected = await ensureDbConnection()
    if (!isConnected) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        users: [] 
      }, { status: 500 })
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    // Transform role to display format
    const ROLE_DISPLAY_NAMES: Record<string, string> = {
      'Admin': 'Admin',
      'Manager': 'Manager',
      'Reporter': 'Reporter',
      'PhotographerAudio': 'Photographer & Audio',
      'VideographerAudio': 'Videographer & Audio',
      'EditorMedia': 'Editor (Media)',
      'EditorWebSocialMedia': 'Editor (Web Article & Social Media)',
      'GraphicDesigner': 'Graphic Designer',
      'StreamingOperator': 'Streaming Operator',
      'PodcastOperator': 'Podcast Operator',
      'Reviewer': 'Reviewer',
      'PublisherWeb': 'Publisher Web',
      'PublisherSocialMedia': 'Publisher Social Media'
    }
    
    const transformedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp || '',
      avatar: u.avatar || '',
      role: ROLE_DISPLAY_NAMES[u.role] || u.role
    }))
    
    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
      users: []
    }, { status: 500 })
  }
}

// POST create user
export async function POST(request: NextRequest) {
  try {
    const isConnected = await ensureDbConnection()
    if (!isConnected) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { name, email, whatsapp, avatar, role, password } = body
    
    // Convert display role to enum
    const ROLE_ENUM_MAP: Record<string, string> = {
      'Admin': 'Admin',
      'Manager': 'Manager',
      'Reporter': 'Reporter',
      'Photographer & Audio': 'PhotographerAudio',
      'Videographer & Audio': 'VideographerAudio',
      'Editor (Media)': 'EditorMedia',
      'Editor (Web Article & Social Media)': 'EditorWebSocialMedia',
      'Graphic Designer': 'GraphicDesigner',
      'Streaming Operator': 'StreamingOperator',
      'Podcast Operator': 'PodcastOperator',
      'Reviewer': 'Reviewer',
      'Publisher Web': 'PublisherWeb',
      'Publisher Social Media': 'PublisherSocialMedia'
    }
    
    // Hash password or use default
    const hashedPassword = password 
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('pushakin123', 10)
    
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        whatsapp: whatsapp || '',
        avatar: avatar || `https://i.pravatar.cc/150?u=${Date.now()}`,
        role: ROLE_ENUM_MAP[role] || 'Reporter'
      }
    })
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp || '',
      avatar: user.avatar || '',
      role: role,
      defaultPassword: password ? null : 'pushakin123'
    })
  } catch (error) {
    console.error('Create user error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Email sudah digunakan pengguna lain' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create user', details: msg }, { status: 500 })
  }
}

// PUT update user
export async function PUT(request: NextRequest) {
  try {
    const isConnected = await ensureDbConnection()
    if (!isConnected) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { id, name, email, whatsapp, avatar, role } = body
    
    // Convert display role to enum
    const ROLE_ENUM_MAP: Record<string, string> = {
      'Admin': 'Admin',
      'Manager': 'Manager',
      'Reporter': 'Reporter',
      'Photographer & Audio': 'PhotographerAudio',
      'Videographer & Audio': 'VideographerAudio',
      'Editor (Media)': 'EditorMedia',
      'Editor (Web Article & Social Media)': 'EditorWebSocialMedia',
      'Graphic Designer': 'GraphicDesigner',
      'Streaming Operator': 'StreamingOperator',
      'Podcast Operator': 'PodcastOperator',
      'Reviewer': 'Reviewer',
      'Publisher Web': 'PublisherWeb',
      'Publisher Social Media': 'PublisherSocialMedia'
    }
    
    const user = await db.user.update({
      where: { id },
      data: {
        name,
        email,
        whatsapp,
        avatar,
        role: ROLE_ENUM_MAP[role] || 'Reporter'
      }
    })
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp || '',
      avatar: user.avatar || '',
      role: role
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE user
export async function DELETE(request: NextRequest) {
  try {
    const isConnected = await ensureDbConnection()
    if (!isConnected) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    await db.user.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
