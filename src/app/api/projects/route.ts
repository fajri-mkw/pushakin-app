import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET all projects with relations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')
    
    const projects = await db.project.findMany({
      include: {
        tasks: {
          include: {
            assignee: true
          }
        },
        driveFolders: true,
        manager: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Filter projects based on user role
    let filteredProjects = projects
    if (userId && role && !['Admin', 'Manager'].includes(role)) {
      filteredProjects = projects.filter(p => 
        p.tasks.some(t => t.assignedTo === userId)
      )
    }
    
    // Transform to match frontend format
    const transformedProjects = filteredProjects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      requesterUnit: p.requesterUnit,
      location: p.location || '',
      executionTime: p.executionTime || '',
      picName: p.picName || '',
      picWhatsApp: p.picWhatsApp || '',
      activityTypes: JSON.parse(p.activityTypes || '[]'),
      customActivity: p.customActivity || '',
      outputNeeds: JSON.parse(p.outputNeeds || '[]'),
      customOutput: p.customOutput || '',
      currentStage: p.currentStage,
      managerId: p.managerId,
      createdAt: p.createdAt.toISOString(),
      tasks: p.tasks.map(t => ({
        id: t.id,
        role: t.role,
        stage: t.stage,
        status: t.status,
        assignedTo: t.assignedTo,
        data: t.data ? JSON.parse(t.data) : {}
      })),
      driveFolders: p.driveFolders.map(f => ({
        id: f.id,
        folderId: f.folderId,
        name: f.name,
        desc: f.description || '',
        color: f.color || '',
        bg: f.bgColor || '',
        border: f.borderColor || '',
        link: f.link || '',
        assignedRoles: JSON.parse(f.assignedRoles || '[]')
      }))
    }))
    
    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, description, requesterUnit, location, executionTime,
      picName, picWhatsApp, activityTypes, customActivity,
      outputNeeds, customOutput, managerId, tasks, driveFolders
    } = body
    
    const project = await db.project.create({
      data: {
        title,
        description,
        requesterUnit,
        location: location || null,
        executionTime: executionTime || null,
        picName: picName || null,
        picWhatsApp: picWhatsApp || null,
        activityTypes: JSON.stringify(activityTypes),
        customActivity: customActivity || null,
        outputNeeds: JSON.stringify(outputNeeds),
        customOutput: customOutput || null,
        currentStage: 1,
        managerId,
        tasks: {
          create: tasks.map((t: { role: string; stage: number; assignedTo: string }) => ({
            role: t.role,
            stage: t.stage,
            status: 'pending',
            assignedTo: t.assignedTo,
            data: '{}'
          }))
        },
        driveFolders: {
          create: driveFolders.map((f: { folderId: string; name: string; desc: string; color: string; bg: string; border: string; link: string; assignedRoles: string[]; parentFolderId?: string }) => ({
            folderId: f.folderId,
            name: f.name,
            description: f.desc,
            color: f.color,
            bgColor: f.bg,
            borderColor: f.border,
            link: f.link,
            assignedRoles: JSON.stringify(f.assignedRoles),
            parentFolderId: f.parentFolderId || null
          }))
        }
      },
      include: {
        tasks: true,
        driveFolders: true
      }
    })
    
    // Create notifications for stage 1 tasks
    const stage1Tasks = project.tasks.filter(t => t.stage === 1)
    for (const task of stage1Tasks) {
      await db.notification.create({
        data: {
          userId: task.assignedTo,
          message: `Tugas baru dialokasikan untuk proyek ${title}`,
          projectId: project.id,
          targetView: 'project_detail',
          read: false
        }
      })
    }
    
    return NextResponse.json({
      id: project.id,
      title: project.title,
      description: project.description,
      requesterUnit: project.requesterUnit,
      location: project.location || '',
      executionTime: project.executionTime || '',
      picName: project.picName || '',
      picWhatsApp: project.picWhatsApp || '',
      activityTypes: JSON.parse(project.activityTypes || '[]'),
      customActivity: project.customActivity || '',
      outputNeeds: JSON.parse(project.outputNeeds || '[]'),
      customOutput: project.customOutput || '',
      currentStage: project.currentStage,
      managerId: project.managerId,
      createdAt: project.createdAt.toISOString(),
      tasks: project.tasks.map(t => ({
        id: t.id,
        role: t.role,
        stage: t.stage,
        status: t.status,
        assignedTo: t.assignedTo,
        data: {}
      })),
      driveFolders: project.driveFolders.map(f => ({
        id: f.id,
        folderId: f.folderId,
        name: f.name,
        desc: f.description || '',
        color: f.color || '',
        bg: f.bgColor || '',
        border: f.borderColor || '',
        link: f.link || '',
        assignedRoles: JSON.parse(f.assignedRoles || '[]')
      }))
    })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

// PUT update project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    
    const project = await db.project.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        requesterUnit: data.requesterUnit,
        location: data.location,
        executionTime: data.executionTime,
        picName: data.picName,
        picWhatsApp: data.picWhatsApp
      }
    })
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// DELETE project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }
    
    await db.project.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
