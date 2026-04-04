import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

function bufferToStream(buffer: Buffer) {
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}

function getDriveClient(serviceAccountKey: string) {
  const credentials = JSON.parse(serviceAccountKey)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  return google.drive({ version: 'v3', auth })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string
    const projectId = formData.get('projectId') as string

    if (!file || !folderId) {
      return NextResponse.json({ error: 'File and folderId are required' }, { status: 400 })
    }

    const settings = await db.settings.findUnique({ where: { id: 'main' } })
    if (!settings?.driveServiceAccountKey) {
      return NextResponse.json({ error: 'Drive not configured' }, { status: 400 })
    }

    const drive = getDriveClient(settings.driveServiceAccountKey)
    const buffer = Buffer.from(await file.arrayBuffer())

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: [folderId]
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: bufferToStream(buffer)
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true
    })

    // Share with anyone
    try {
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: { type: 'anyone', role: 'writer', allowFileDiscovery: false },
        supportsAllDrives: true
      })
    } catch (shareError) {
      console.error('[UPLOAD] Failed to share file:', shareError)
    }

    return NextResponse.json({
      success: true,
      file: {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      }
    })
  } catch (error) {
    console.error('[UPLOAD] Error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
