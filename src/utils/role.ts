// Role helpers for better-auth's admin plugin.
// `user.role` is a text column: null means the default "user" role, and
// multiple roles may be stored comma-separated (e.g. "user,admin").

type UserWithRole = { role?: string | null } | null | undefined

export function getRoles(user: UserWithRole): string[] {
  if (!user) return []
  const roles = (user.role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  return roles.length > 0 ? roles : ['user']
}

export function hasRole(user: UserWithRole, role: string): boolean {
  return getRoles(user).includes(role)
}

export function isAdmin(user: UserWithRole): boolean {
  return hasRole(user, 'admin')
}
