import { NextResponse } from 'next/server'
import { Session } from 'next-auth'

/**
 * Role-Based Access Control utilities
 */

export type UserRole = 'ADMIN' | 'VIEWER'

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
  // First check authentication
  const authError = requireAuth(session)
  if (authError) {
    return authError
  }

  // Check admin role
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
 * Require either admin or viewer role (any authenticated user)
 * Returns error response if not authenticated, null otherwise
 */
export function requireViewer(session: Session | null): NextResponse<RBACError> | null {
  return requireAuth(session)
}
