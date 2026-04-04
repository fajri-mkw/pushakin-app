import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Interface for folder creation result
interface CreatedFolder {
  id: string
  name: string
  webViewLink: string
  folderId: string
}

// Interface for assigned users
interface AssignedUser {
  role: string
  userName: string
  userId: string
  stage: number
}

// Stage-role mapping
const STAGE1_ROLES = ['Reporter', 'Photographer & Audio', 'Videographer & Audio', 'Graphic Designer']
const STAGE2_ROLES = ['Editor (Media)', 'Editor (Web Article & Social Media)', 'Streaming Operator', 'Podcast Operator']
const REVIEWER_ROLES = ['Reviewer']
// Roles for LAINNYA subfolders (assigned production staff)
const LAINNYA_ROLES = ['Reporter', 'Photographer & Audio', 'Videographer & Audio']

// Create Google Drive client from service account
function getDriveClient(serviceAccountKey: string) {
  const credentials = JSON.parse(serviceAccountKey)
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  
  return google.drive({ version: 'v3', auth })
}

// Create a folder in Google Drive (supports Shared Drives)
async function createFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string | null,
  sharedDriveId?: string | null
): Promise<CreatedFolder> {
  const fileMetadata: {
    name: string
    mimeType: string
    parents?: string[]
    driveId?: string
  } = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  }
  
  // If we have a shared drive, use it
  if (sharedDriveId) {
    fileMetadata.driveId = sharedDriveId
    if (parentId) {
      fileMetadata.parents = [parentId]
    } else {
      // If no parent, create in root of shared drive
      fileMetadata.parents = [sharedDriveId]
    }
  } else if (parentId) {
    fileMetadata.parents = [parentId]
  }
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true // Required for Shared Drives
  })
  
  return {
    id: response.data.id!,
    name: response.data.name!,
    webViewLink: response.data.webViewLink!,
    folderId: response.data.id!
  }
}

// Share folder with anyone who has the link
// This allows access WITHOUT requiring a Google account
async function shareWithLink(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  role: 'reader' | 'writer' = 'writer'
): Promise<boolean> {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'anyone',
        role: role,
        allowFileDiscovery: false
      },
      supportsAllDrives: true
    })
    console.log('[DRIVE] Successfully shared folder with link:', folderId)
    return true
  } catch (error) {
    console.error('[DRIVE] Failed to share with link:', error)
    return false
  }
}

// Generate user code from name (e.g., "Ahmad Fauzi" -> "AF")
function generateUserCode(userName: string): string {
  const nameParts = userName.split(' ')
  return nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : userName.substring(0, 2).toUpperCase()
}

// Create user subfolders inside a parent folder
async function createUserSubfolders(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  parentFolderType: string,
  users: AssignedUser[],
  sharedDriveId: string,
  createdFolders: CreatedFolder[]
): Promise<void> {
  for (const user of users) {
    const userCode = generateUserCode(user.userName)
    const subfolderName = `${userCode}_${user.userName.replace(/\s+/g, '_')}_${user.role.replace(/\s*&\s*/g, '_')}`
    
    const userSubfolder = await createFolder(
      drive,
      subfolderName,
      parentFolderId,
      sharedDriveId
    )
    
    createdFolders.push({
      ...userSubfolder,
      folderId: `${parentFolderType}-${user.role.toLowerCase().replace(/\s*&\s*/g, '-')}-${user.userId}`
    })
    
    console.log(`[DRIVE] Created user subfolder "${subfolderName}" inside ${parentFolderType} for ${user.userName} (${user.role})`)
  }
}

// POST - Create folders for a project with link sharing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectTitle, folderTypes, assignedUsers } = body as {
      projectTitle: string
      folderTypes: string[]
      assignedUsers?: AssignedUser[] // ALL assigned users with stage info
    }
    
    // Get settings
    const settings = await db.settings.findUnique({
      where: { id: 'main' }
    })
    
    if (!settings?.driveAutoCreate) {
      return NextResponse.json({ 
        error: 'Google Drive auto-create is disabled',
        mockMode: true
      }, { status: 400 })
    }
    
    if (!settings.driveServiceAccountKey) {
      return NextResponse.json({ 
        error: 'Google Service Account not configured',
        mockMode: true
      }, { status: 400 })
    }
    
    // Check for Shared Drive ID (required for Service Accounts without storage quota)
    if (!settings.driveSharedDriveId) {
      return NextResponse.json({ 
        error: 'Shared Drive ID is required. Service Accounts do not have storage quota. Please configure a Shared Drive ID in settings.',
        details: 'Service Accounts do not have storage quota. Use a Shared Drive instead.'
      }, { status: 400 })
    }
    
    const drive = getDriveClient(settings.driveServiceAccountKey)
    
    // Create main project folder in Shared Drive
    const mainFolder = await createFolder(
      drive,
      projectTitle,
      settings.driveParentFolderId || null,
      settings.driveSharedDriveId
    )
    
    console.log('[DRIVE] Created main folder:', mainFolder.id, 'in Shared Drive:', settings.driveSharedDriveId)
    
    // Share main folder with anyone who has the link (no Google account required)
    console.log('[DRIVE] Sharing folder with link (anyone with link can edit)...')
    const linkShared = await shareWithLink(drive, mainFolder.id, 'writer')
    console.log('[DRIVE] Link sharing result:', linkShared)
    
    // Create subfolders
    const folderNames: Record<string, string> = {
      raw: '1. RAW FOLDER (Hasil Mentah)',
      revised: '2. REVISED FOLDER (Draft & Editing)',
      final: '3. FINAL PRODUCT (Siap Publish)',
      desain: '4. DESAIN FOLDER (Aset Visual)',
      lainnya: '5. LAINNYA (Folder Tambahan)'
    }
    
    const createdFolders: CreatedFolder[] = []
    const folderIdMap: Record<string, string> = {} // folderType -> Drive folder ID
    
    for (const folderType of folderTypes) {
      if (folderNames[folderType]) {
        const subFolder = await createFolder(
          drive,
          folderNames[folderType],
          mainFolder.id,
          settings.driveSharedDriveId
        )
        createdFolders.push({
          ...subFolder,
          folderId: folderType
        })
        folderIdMap[folderType] = subFolder.id
        // Subfolders inherit permissions from parent, no need to share individually
      }
    }
    
    // Filter users by stage for subfolder creation
    const allUsers = assignedUsers || []
    
    // RAW folder → Subfolders for Stage 1: Reporter, Photographer & Audio, Videographer & Audio, Graphic Designer
    const stage1Users = allUsers.filter(u => STAGE1_ROLES.includes(u.role))
    if (folderIdMap['raw'] && stage1Users.length > 0) {
      console.log('[DRIVE] Creating Stage 1 user subfolders in RAW:', stage1Users.map(u => u.userName).join(', '))
      await createUserSubfolders(drive, folderIdMap['raw'], 'raw', stage1Users, settings.driveSharedDriveId, createdFolders)
    }
    
    // REVISED folder → Subfolders for Stage 2: Editor (Media), Editor (Web Article & Social Media), Streaming Operator, Podcast Operator
    const stage2Users = allUsers.filter(u => STAGE2_ROLES.includes(u.role))
    if (folderIdMap['revised'] && stage2Users.length > 0) {
      console.log('[DRIVE] Creating Stage 2 user subfolders in REVISED:', stage2Users.map(u => u.userName).join(', '))
      await createUserSubfolders(drive, folderIdMap['revised'], 'revised', stage2Users, settings.driveSharedDriveId, createdFolders)
    }
    
    // DESAIN folder → Subfolders for Graphic Designer (Stage 1 only)
    const graphicDesignerUsers = allUsers.filter(u => u.role === 'Graphic Designer')
    if (folderIdMap['desain'] && graphicDesignerUsers.length > 0) {
      console.log('[DRIVE] Creating Graphic Designer subfolders in DESAIN:', graphicDesignerUsers.map(u => u.userName).join(', '))
      await createUserSubfolders(drive, folderIdMap['desain'], 'desain', graphicDesignerUsers, settings.driveSharedDriveId, createdFolders)
    }
    
    // FINAL PRODUCT → Subfolders for Reviewer (for revision uploads)
    const reviewerUsers = allUsers.filter(u => REVIEWER_ROLES.includes(u.role))
    if (folderIdMap['final'] && reviewerUsers.length > 0) {
      console.log('[DRIVE] Creating Reviewer subfolders in FINAL PRODUCT:', reviewerUsers.map(u => u.userName).join(', '))
      await createUserSubfolders(drive, folderIdMap['final'], 'final', reviewerUsers, settings.driveSharedDriveId, createdFolders)
    }

    // LAINNYA → Subfolders for Stage 1 assigned staff (Reporter, Photographer & Audio, Videographer & Audio)
    const lainnyaUsers = allUsers.filter(u => LAINNYA_ROLES.includes(u.role))
    if (folderIdMap['lainnya'] && lainnyaUsers.length > 0) {
      console.log('[DRIVE] Creating Stage 1 staff subfolders in LAINNYA:', lainnyaUsers.map(u => u.userName).join(', '))
      await createUserSubfolders(drive, folderIdMap['lainnya'], 'lainnya', lainnyaUsers, settings.driveSharedDriveId, createdFolders)
    }
    
    return NextResponse.json({
      success: true,
      mainFolder: mainFolder.webViewLink,
      mainFolderId: mainFolder.id,
      folders: createdFolders,
      linkShared: linkShared,
      sharedDriveId: settings.driveSharedDriveId,
      note: linkShared 
        ? 'Folder dapat diakses oleh siapa saja yang memiliki link. Tidak perlu akun Google.'
        : 'Link sharing gagal. Cek permission Service Account.'
    })
  } catch (error) {
    console.error('Create Drive folders error:', error)
    return NextResponse.json({ 
      error: 'Failed to create folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Enable link sharing for existing folder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { folderId, role } = body as {
      folderId: string
      role?: 'reader' | 'writer'
    }
    
    const settings = await db.settings.findUnique({
      where: { id: 'main' }
    })
    
    if (!settings?.driveServiceAccountKey) {
      return NextResponse.json({ 
        error: 'Service Account not configured'
      }, { status: 400 })
    }
    
    const drive = getDriveClient(settings.driveServiceAccountKey)
    
    // Enable link sharing (works for non-Google accounts too)
    const linkShared = await shareWithLink(drive, folderId, role || 'writer')
    
    return NextResponse.json({
      success: true,
      linkShared,
      note: linkShared 
        ? 'Folder dapat diakses oleh siapa saja yang memiliki link.'
        : 'Link sharing gagal.'
    })
  } catch (error) {
    console.error('Share folder error:', error)
    return NextResponse.json({ 
      error: 'Failed to share folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Test Google Drive connection
export async function GET() {
  try {
    const settings = await db.settings.findUnique({
      where: { id: 'main' }
    })
    
    if (!settings?.driveServiceAccountKey) {
      return NextResponse.json({ 
        connected: false,
        message: 'Service Account belum dikonfigurasi'
      })
    }
    
    if (!settings.driveSharedDriveId) {
      return NextResponse.json({ 
        connected: false,
        message: 'Shared Drive ID belum dikonfigurasi. Service Account memerlukan Shared Drive untuk penyimpanan.'
      })
    }
    
    const drive = getDriveClient(settings.driveServiceAccountKey)
    
    // Test by checking the shared drive
    try {
      await drive.drives.get({
        driveId: settings.driveSharedDriveId
      })
      
      return NextResponse.json({ 
        connected: true,
        message: 'Koneksi Google Drive berhasil. Shared Drive terdeteksi.'
      })
    } catch {
      // Try listing files if drives.get fails
      await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
        corpora: 'drive',
        driveId: settings.driveSharedDriveId,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })
      
      return NextResponse.json({ 
        connected: true,
        message: 'Koneksi Google Drive berhasil'
      })
    }
  } catch (error) {
    console.error('Test Drive connection error:', error)
    return NextResponse.json({ 
      connected: false,
      message: 'Koneksi gagal: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}
