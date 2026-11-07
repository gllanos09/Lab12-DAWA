/** Tipos que comparten las páginas que consumen las API Routes. */

export type Book = {
  id: string
  title: string
  description: string | null
  isbn: string | null
  publishedYear: number | null
  genre: string | null
  pages: number | null
  authorId: string
  createdAt: string
  updatedAt: string
  author?: Pick<Author, 'id' | 'name' | 'email'> & { nationality?: string | null }
}

export type Author = {
  id: string
  name: string
  email: string
  bio: string | null
  nationality: string | null
  birthYear: number | null
  createdAt: string
  updatedAt: string
  books?: Book[]
  _count?: { books: number }
}

export type AuthorStats = {
  authorId: string
  authorName: string
  totalBooks: number
  firstBook: { title: string; year: number } | null
  latestBook: { title: string; year: number } | null
  averagePages: number | null
  genres: string[]
  longestBook: { title: string; pages: number } | null
  shortestBook: { title: string; pages: number } | null
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type SearchResponse = {
  data: Book[]
  pagination: Pagination
}

/**
 * Lanza el mensaje que devuelve la API en vez de un "500" genérico, para que
 * las páginas puedan mostrar el error real (email duplicado, ISBN repetido…).
 */
export async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Error ${response.status}`
    throw new Error(message)
  }

  return payload as T
}
