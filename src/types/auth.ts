// I need to find a way to extract this automatically.
export interface Session {
  id: string
  userId: string
  expiresAt: string | Date
  createdAt?: string | Date
  updatedAt?: string | Date
  [key: string]: unknown
}
