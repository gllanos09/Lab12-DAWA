'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Message,
  Spinner,
  Stat,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputClass,
} from '@/components/ui'
import {
  requestJson,
  type Author,
  type AuthorStats,
  type Book,
} from '@/lib/types'

type AuthorForm = {
  name: string
  email: string
  nationality: string
  birthYear: string
  bio: string
}

type BookForm = {
  title: string
  genre: string
  publishedYear: string
  pages: string
  isbn: string
  description: string
}

const EMPTY_BOOK: BookForm = {
  title: '',
  genre: '',
  publishedYear: '',
  pages: '',
  isbn: '',
  description: '',
}

export default function AuthorDetailPage({
  params,
}: {
  // En Next.js 16 los params del componente también llegan como promesa;
  // `use()` la resuelve dentro de un componente de cliente.
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [author, setAuthor] = useState<Author | null>(null)
  const [stats, setStats] = useState<AuthorStats | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [authorForm, setAuthorForm] = useState<AuthorForm | null>(null)
  const [savingAuthor, setSavingAuthor] = useState(false)

  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK)
  const [showBookForm, setShowBookForm] = useState(false)
  const [savingBook, setSavingBook] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Las tres peticiones son independientes, así que se lanzan a la vez.
  // El estado se actualiza dentro de los callbacks de la promesa porque
  // react-hooks/set-state-in-effect prohíbe hacerlo en el cuerpo del efecto.
  const load = useCallback(
    () =>
      Promise.all([
        requestJson<Author>(`/api/authors/${id}`),
        requestJson<AuthorStats>(`/api/authors/${id}/stats`),
        requestJson<{ books: Book[] }>(`/api/authors/${id}/books`),
      ])
        .then(([authorData, statsData, booksData]) => {
          setAuthor(authorData)
          setStats(statsData)
          setBooks(booksData.books)
          setAuthorForm({
            name: authorData.name,
            email: authorData.email,
            nationality: authorData.nationality ?? '',
            birthYear: authorData.birthYear
              ? String(authorData.birthYear)
              : '',
            bio: authorData.bio ?? '',
          })
          setError(null)
        })
        .catch((err: unknown) =>
          setError(
            err instanceof Error ? err.message : 'Error al cargar el autor'
          )
        )
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    void load()
  }, [load])

  const handleSaveAuthor = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!authorForm) return
    setError(null)
    setSuccess(null)
    setSavingAuthor(true)
    try {
      await requestJson<Author>(`/api/authors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authorForm.name.trim(),
          email: authorForm.email.trim(),
          nationality: authorForm.nationality.trim() || null,
          birthYear: authorForm.birthYear.trim() || null,
          bio: authorForm.bio.trim() || null,
        }),
      })
      setSuccess('Datos del autor actualizados.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setSavingAuthor(false)
    }
  }

  const handleAddBook = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!bookForm.title.trim()) {
      setError('El título es requerido.')
      return
    }

    setSavingBook(true)
    try {
      await requestJson<Book>('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookForm.title.trim(),
          authorId: id,
          genre: bookForm.genre.trim() || null,
          publishedYear: bookForm.publishedYear.trim() || null,
          pages: bookForm.pages.trim() || null,
          isbn: bookForm.isbn.trim() || null,
          description: bookForm.description.trim() || null,
        }),
      })
      setSuccess('Libro agregado al autor.')
      setBookForm(EMPTY_BOOK)
      setShowBookForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el libro')
    } finally {
      setSavingBook(false)
    }
  }

  const handleDeleteBook = async (book: Book) => {
    setDeletingId(book.id)
    setError(null)
    setSuccess(null)
    try {
      await requestJson(`/api/books/${book.id}`, { method: 'DELETE' })
      setSuccess('Libro eliminado.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
        <Spinner className="size-5 text-indigo-600" />
        Cargando información del autor...
      </div>
    )
  }

  if (!author || !authorForm) {
    return (
      <div className="space-y-4">
        <Message kind="error">{error ?? 'Autor no encontrado.'}</Message>
        <Link href="/" className={btnGhost}>
          Volver al dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Volver a autores
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {author.name}
          </h1>
          <p className="text-sm text-slate-500">
            {[author.email, author.nationality, author.birthYear]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setShowBookForm((value) => !value)}
        >
          {showBookForm ? 'Cerrar formulario' : '+ Agregar libro'}
        </button>
      </div>

      {author.bio && (
        <Card>
          <h2 className="text-sm font-medium text-slate-500">Biografía</h2>
          <p className="mt-1 text-slate-700">{author.bio}</p>
        </Card>
      )}

      {error && <Message kind="error">{error}</Message>}
      {success && <Message kind="success">{success}</Message>}

      {showBookForm && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Nuevo libro de {author.name}
          </h2>
          <form onSubmit={handleAddBook} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Título *" htmlFor="book-title">
                <input
                  id="book-title"
                  className={inputClass}
                  value={bookForm.title}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Field>
              <Field label="Género" htmlFor="book-genre">
                <input
                  id="book-genre"
                  className={inputClass}
                  value={bookForm.genre}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, genre: e.target.value }))
                  }
                />
              </Field>
              <Field label="Año" htmlFor="book-year">
                <input
                  id="book-year"
                  type="number"
                  className={inputClass}
                  value={bookForm.publishedYear}
                  onChange={(e) =>
                    setBookForm((f) => ({
                      ...f,
                      publishedYear: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Páginas" htmlFor="book-pages">
                <input
                  id="book-pages"
                  type="number"
                  className={inputClass}
                  value={bookForm.pages}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, pages: e.target.value }))
                  }
                />
              </Field>
              <Field label="ISBN" htmlFor="book-isbn">
                <input
                  id="book-isbn"
                  className={inputClass}
                  value={bookForm.isbn}
                  onChange={(e) =>
                    setBookForm((f) => ({ ...f, isbn: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Descripción" htmlFor="book-description">
              <textarea
                id="book-description"
                rows={2}
                className={inputClass}
                value={bookForm.description}
                onChange={(e) =>
                  setBookForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </Field>
            <button type="submit" className={btnPrimary} disabled={savingBook}>
              {savingBook && <Spinner />}
              {savingBook ? 'Guardando...' : 'Agregar libro'}
            </button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Estadísticas
        </h2>
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Libros publicados" value={stats.totalBooks} />
            <Stat
              label="Promedio de páginas"
              value={stats.averagePages ?? '—'}
            />
            <Stat
              label="Primer libro"
              value={stats.firstBook?.year ?? '—'}
              hint={stats.firstBook?.title}
            />
            <Stat
              label="Último libro"
              value={stats.latestBook?.year ?? '—'}
              hint={stats.latestBook?.title}
            />
            <Stat
              label="Libro más largo"
              value={stats.longestBook ? `${stats.longestBook.pages} p.` : '—'}
              hint={stats.longestBook?.title}
            />
            <Stat
              label="Libro más corto"
              value={
                stats.shortestBook ? `${stats.shortestBook.pages} p.` : '—'
              }
              hint={stats.shortestBook?.title}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
              <p className="text-sm text-slate-500">Géneros</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.genres.length > 0 ? (
                  stats.genres.map((g) => <Badge key={g}>{g}</Badge>)
                ) : (
                  <span className="text-sm text-slate-400">
                    Sin géneros registrados
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Editar información del autor
        </h2>
        <form onSubmit={handleSaveAuthor} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="edit-name">
              <input
                id="edit-name"
                className={inputClass}
                value={authorForm.name}
                onChange={(e) =>
                  setAuthorForm((f) => f && { ...f, name: e.target.value })
                }
              />
            </Field>
            <Field label="Email" htmlFor="edit-email">
              <input
                id="edit-email"
                type="email"
                className={inputClass}
                value={authorForm.email}
                onChange={(e) =>
                  setAuthorForm((f) => f && { ...f, email: e.target.value })
                }
              />
            </Field>
            <Field label="Nacionalidad" htmlFor="edit-nationality">
              <input
                id="edit-nationality"
                className={inputClass}
                value={authorForm.nationality}
                onChange={(e) =>
                  setAuthorForm(
                    (f) => f && { ...f, nationality: e.target.value }
                  )
                }
              />
            </Field>
            <Field label="Año de nacimiento" htmlFor="edit-birthYear">
              <input
                id="edit-birthYear"
                type="number"
                className={inputClass}
                value={authorForm.birthYear}
                onChange={(e) =>
                  setAuthorForm((f) => f && { ...f, birthYear: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Biografía" htmlFor="edit-bio">
            <textarea
              id="edit-bio"
              rows={3}
              className={inputClass}
              value={authorForm.bio}
              onChange={(e) =>
                setAuthorForm((f) => f && { ...f, bio: e.target.value })
              }
            />
          </Field>
          <button type="submit" className={btnPrimary} disabled={savingAuthor}>
            {savingAuthor && <Spinner />}
            {savingAuthor ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Libros de {author.name} ({books.length})
        </h2>

        {books.length === 0 ? (
          <EmptyState>
            Este autor todavía no tiene libros registrados.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {books.map((book) => (
              <article
                key={book.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {[
                        book.publishedYear,
                        book.pages && `${book.pages} págs.`,
                        book.isbn && `ISBN ${book.isbn}`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sin datos adicionales'}
                    </p>
                  </div>
                  {book.genre && <Badge>{book.genre}</Badge>}
                </div>

                {book.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {book.description}
                  </p>
                )}

                {confirmId === book.id ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">
                      ¿Eliminar «{book.title}»?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void handleDeleteBook(book)}
                        disabled={deletingId === book.id}
                      >
                        {deletingId === book.id && <Spinner />}
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === book.id}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/books" className={btnGhost}>
                      Editar en catálogo
                    </Link>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => setConfirmId(book.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
