import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In production, create a new PrismaClient for each request
// In development, reuse the same client
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Helper to ensure database connection
export async function ensureDbConnection() {
  try {
    await db.$connect()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
// Pushakin Flows v1.0 - Production
