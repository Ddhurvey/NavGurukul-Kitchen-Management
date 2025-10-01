import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AuthUser {
  id: string
  name: string
  email: string
  workType: string
  status: string
  role: 'STUDENT' | 'FC' | 'TEAM_MEMBER'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      workType: user.workType
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function getUserRole(workType: string, status: string): 'STUDENT' | 'FC' | 'TEAM_MEMBER' {
  if (workType === 'TEAM') return 'TEAM_MEMBER'
  if (status === 'ACTIVE' && workType === 'KITCHEN') return 'STUDENT'
  return 'STUDENT'
}

export async function createStudentSession(studentId: string): Promise<string> {
  const token = generateToken({ 
    id: studentId, 
    name: '', 
    email: '', 
    workType: '', 
    status: '', 
    role: 'STUDENT' 
  })
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db.studentSession.create({
    data: {
      studentId,
      token,
      expiresAt
    }
  })

  return token
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  try {
    const session = await db.studentSession.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        student: true
      }
    })

    if (!session) return null

    const student = session.student
    const role = getUserRole(student.workType, student.status)

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      workType: student.workType,
      status: student.status,
      role
    }
  } catch (error) {
    return null
  }
}

export async function deleteSession(token: string): Promise<void> {
  await db.studentSession.deleteMany({
    where: { token }
  })
}