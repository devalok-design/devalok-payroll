import { NextResponse } from 'next/server'
import { Session } from 'next-auth'

/**
 * Role-Based Access Control utilities
 */

export type UserRole = 'ADMIN' | 'VIEWER' | 'LOKWASI'

export interface RBACError {
  error: string
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
}

/**
 * Check if a user has a specific role
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
  if (!session || !session.user) {
    return false
  }
  return session.user.role === role
}

/**
 * Check if a user has admin role
 */
export function isAdmin(session: Session | null): boolean {
  return hasRole(session, 'ADMIN')
}

/**
 * Check if a user has viewer role
 */
export function isViewer(session: Session | null): boolean {
  return hasRole(session, 'VIEWER')
}

/**
 * Check if a user has lokwasi (team member) role
 */
export function isLokwasi(session: Session | null): boolean {
  return hasRole(session, 'LOKWASI')
}

/**
 * Check if a user is staff (admin or viewer — excludes lokwasi)
 */
export function isStaff(session: Session | null): boolean {
  return isAdmin(session) || isViewer(session)
}

/**
 * Require authenticated user
 * Returns error response if not authenticated, null otherwise
 */
export function requireAuth(session: Session | null): NextResponse<RBACError> | null {
  if (!session || !session.user) {
    return NextResponse.json<RBACError>(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }
  return null
}

/**
 * Require admin role
 * Returns error response if not admin, null otherwise
 */
export function requireAdmin(session: Session | null): NextResponse<RBACError> | null {
  const authError = requireAuth(session)
  if (authError) {
    return authError
  }

  if (!isAdmin(session)) {
    return NextResponse.json<RBACError>(
      {
        error: 'Forbidden: Admin role required',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Require staff role (admin or viewer — excludes lokwasi)
 * Returns error response if not staff, null otherwise
 */
export function requireStaff(session: Session | null): NextResponse<RBACError> | null {
  const authError = requireAuth(session)
  if (authError) {
    return authError
  }

  if (!isStaff(session)) {
    return NextResponse.json<RBACError>(
      {
        error: 'Forbidden: Staff access required',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Require either admin or viewer role (any authenticated staff user)
 * Returns error response if not authenticated, null otherwise
 */
export function requireViewer(session: Session | null): NextResponse<RBACError> | null {
  return requireStaff(session)
}

/**
 * Require lokwasi role with a linked lokwasi record
 * Returns error response if not lokwasi, null otherwise
 */
export function requireLokwasi(session: Session | null): NextResponse<RBACError> | null {
  const authError = requireAuth(session)
  if (authError) {
    return authError
  }

  if (!isLokwasi(session)) {
    return NextResponse.json<RBACError>(
      {
        error: 'Forbidden: Portal access required',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }

  if (!session!.user.lokwasiId) {
    return NextResponse.json<RBACError>(
      {
        error: 'Forbidden: No linked team member account',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Extract lokwasiId from session (for portal data scoping)
 */
export function getLokwasiId(session: Session): string | null {
  return session.user.lokwasiId || null
}
