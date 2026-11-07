'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Message,
  Spinner,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputClass,
} from '@/components/ui'
import {
  requestJson,
  type Author,
  type Book,
  type Pagination,
  type SearchResponse,
} from '@/lib/types'

type FormState = {
  title: string
  authorId: string
  genre: string
  publishedYear: string
  pages: string
  isbn: string
  description: string
}

const EMPTY_FORM: FormState = {
  title: '',
  authorId: '',
  genre: '',
  publishedYear: '',
  pages: '',
  isbn: '',
  description: '',
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'title', label: 'Título' },
  { value: 'publishedYear', label: 'Año de publicación' },
]

const PAGE_SIZES = [5, 10, 20, 50]

export default function BooksPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [genres, setGenres] = useState<string[]>([])

  // --- Filtros -------------------------------------------------------------
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)

  // --- Resultados ----------------------------------------------------------
  const [books, setBooks] = useState<Book[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [searching, setSearching] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // --- Formulario ----------------------------------------------------------
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Búsqueda en tiempo real: se espera a que el usuario deje de escribir
  // 400 ms para no lanzar una petición por cada tecla.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(id)
  }, [search])

  /**
   * Aplica un cambio de filtro: marca la búsqueda como pendiente y vuelve a
   * la primera página. Se hace aquí, en el manejador del evento, y no en un
   * efecto, porque react-hooks/set-state-in-effect prohíbe lo segundo.
   */
  const changeFilter = (apply: () => void) => {
    setSearching(true)
    setPage(1)
    apply()
  }

  // Los catálogos son auxiliares (rellenan los desplegables): si fallan, la
  // búsqueda sigue funcionando y el error real se verá en el listado.
  const loadCatalogs = useCallback(
    () =>
      Promise.all([
        requestJson<Author[]>('/api/authors'),
        requestJson<Book[]>('/api/books'),
      ])
        .then(([authorList, bookList]) => {
          setAuthors(authorList)
          setGenres(
            [
              ...new Set(
                bookList
                  .map((book) => book.genre)
                  .filter((g): g is string => Boolean(g))
              ),
            ].sort()
          )
        })
        .catch(() => undefined),
    []
  )

  const runSearch = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    if (genre) params.set('genre', genre)
    if (authorName) params.set('authorName', authorName)
    params.set('page', String(page))
    params.set('limit', String(limit))
    params.set('sortBy', sortBy)
    params.set('order', order)

    return requestJson<SearchResponse>(
      `/api/books/search?${params.toString()}`
    )
      .then((result) => {
        setBooks(result.data)
        setPagination(result.pagination)
        setListError(null)
      })
      .catch((err: unknown) => {
        setListError(err instanceof Error ? err.message : 'Error al buscar')
        setBooks([])
        setPagination(null)
      })
      .finally(() => setSearching(false))
  }, [debouncedSearch, genre, authorName, page, limit, sortBy, order])

  useEffect(() => {
    void loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  const authorNames = useMemo(
    () => authors.map((author) => author.name).sort(),
    [authors]
  )

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const startEdit = (book: Book) => {
    setEditingId(book.id)
    setForm({
      title: book.title,
      authorId: book.authorId,
      genre: book.genre ?? '',
      publishedYear: book.publishedYear ? String(book.publishedYear) : '',
      pages: book.pages ? String(book.pages) : '',
      isbn: book.isbn ?? '',
      description: book.description ?? '',
    })
    setFormError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSuccess(null)

    if (!form.title.trim() || !form.authorId) {
      setFormError('Título y autor son requeridos.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        authorId: form.authorId,
        genre: form.genre.trim() || null,
        publishedYear: form.publishedYear.trim() || null,
        pages: form.pages.trim() || null,
        isbn: form.isbn.trim() || null,
        description: form.description.trim() || null,
      }

      await requestJson<Book>(
        editingId ? `/api/books/${editingId}` : '/api/books',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      setSuccess(editingId ? 'Libro actualizado.' : 'Libro creado.')
      resetForm()
      await Promise.all([runSearch(), loadCatalogs()])
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (book: Book) => {
    setDeletingId(book.id)
    setFormError(null)
    setSuccess(null)
    try {
      await requestJson(`/api/books/${book.id}`, { method: 'DELETE' })
      setSuccess('Libro eliminado.')
      if (editingId === book.id) resetForm()
      await Promise.all([runSearch(), loadCatalogs()])
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const clearFilters = () =>
    changeFilter(() => {
      setSearch('')
      setGenre('')
      setAuthorName('')
      setSortBy('createdAt')
      setOrder('desc')
    })

  const hasFilters = Boolean(search || genre || authorName)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Catálogo de libros
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Búsqueda, filtros y paginación sobre{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            /api/books/search
          </code>
          .
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          {editingId ? 'Editar libro' : 'Nuevo libro'}
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          {editingId
            ? 'Se enviará un PUT a /api/books/[id].'
            : 'Se enviará un POST a /api/books.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Título *" htmlFor="title">
              <input
                id="title"
                className={inputClass}
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Cien años de soledad"
              />
            </Field>

            <Field label="Autor *" htmlFor="authorId">
              <select
                id="authorId"
                className={inputClass}
                value={form.authorId}
                onChange={(e) => update('authorId', e.target.value)}
              >
                <option value="">Selecciona un autor</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Género" htmlFor="form-genre">
              <input
                id="form-genre"
                className={inputClass}
                value={form.genre}
                onChange={(e) => update('genre', e.target.value)}
                list="genre-options"
                placeholder="Novela"
              />
              <datalist id="genre-options">
                {genres.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>

            <Field label="Año de publicación" htmlFor="publishedYear">
              <input
                id="publishedYear"
                type="number"
                className={inputClass}
                value={form.publishedYear}
                onChange={(e) => update('publishedYear', e.target.value)}
                placeholder="1967"
              />
            </Field>

            <Field label="Páginas" htmlFor="pages">
              <input
                id="pages"
                type="number"
                className={inputClass}
                value={form.pages}
                onChange={(e) => update('pages', e.target.value)}
                placeholder="417"
              />
            </Field>

            <Field label="ISBN" htmlFor="isbn">
              <input
                id="isbn"
                className={inputClass}
                value={form.isbn}
                onChange={(e) => update('isbn', e.target.value)}
                placeholder="978-0307474728"
              />
            </Field>
          </div>

          <Field label="Descripción" htmlFor="description">
            <textarea
              id="description"
              rows={2}
              className={inputClass}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Obra maestra del realismo mágico"
            />
          </Field>

          {formError && <Message kind="error">{formError}</Message>}
          {success && <Message kind="success">{success}</Message>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving && <Spinner />}
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Crear libro'}
            </button>
            {editingId && (
              <button
                type="button"
                className={btnGhost}
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Field label="Buscar por título" htmlFor="search">
              <div className="relative">
                <input
                  id="search"
                  className={inputClass}
                  value={search}
                  onChange={(e) => changeFilter(() => setSearch(e.target.value))}
                  placeholder="Escribe para buscar..."
                />
                {searching && (
                  <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-indigo-600" />
                )}
              </div>
            </Field>
          </div>

          <Field label="Género" htmlFor="filter-genre">
            <select
              id="filter-genre"
              className={inputClass}
              value={genre}
              onChange={(e) => changeFilter(() => setGenre(e.target.value))}
            >
              <option value="">Todos los géneros</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Autor" htmlFor="filter-author">
            <select
              id="filter-author"
              className={inputClass}
              value={authorName}
              onChange={(e) => changeFilter(() => setAuthorName(e.target.value))}
            >
              <option value="">Todos los autores</option>
              {authorNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ordenar por" htmlFor="sortBy">
            <select
              id="sortBy"
              className={inputClass}
              value={sortBy}
              onChange={(e) => changeFilter(() => setSortBy(e.target.value))}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Orden" htmlFor="order">
            <select
              id="order"
              className={inputClass}
              value={order}
              onChange={(e) => changeFilter(() => setOrder(e.target.value))}
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </Field>

          <Field label="Por página" htmlFor="limit">
            <select
              id="limit"
              className={inputClass}
              value={limit}
              onChange={(e) => changeFilter(() => setLimit(Number(e.target.value)))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} resultados
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-end">
            <button
              type="button"
              className={btnGhost}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Resultados</h2>
          <p className="text-sm text-slate-500">
            {pagination
              ? `${pagination.total} libro(s) encontrado(s)` +
                (pagination.totalPages > 1
                  ? ` · página ${pagination.page} de ${pagination.totalPages}`
                  : '')
              : '—'}
          </p>
        </div>

        {listError && <Message kind="error">{listError}</Message>}

        {searching && books.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
            <Spinner className="size-5 text-indigo-600" />
            Buscando libros...
          </div>
        ) : books.length === 0 && !listError ? (
          <EmptyState>
            {hasFilters
              ? 'Ningún libro coincide con los filtros aplicados.'
              : 'Todavía no hay libros registrados.'}
          </EmptyState>
        ) : (
          <div
            className={`space-y-3 transition-opacity ${searching ? 'opacity-50' : ''}`}
          >
            {books.map((book) => (
              <article
                key={book.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {book.author ? (
                        <Link
                          href={`/authors/${book.authorId}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {book.author.name}
                        </Link>
                      ) : (
                        'Autor desconocido'
                      )}
                      {book.publishedYear && ` · ${book.publishedYear}`}
                      {book.pages && ` · ${book.pages} págs.`}
                    </p>
                  </div>
                  {book.genre && <Badge>{book.genre}</Badge>}
                </div>

                {book.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {book.description}
                  </p>
                )}

                {book.isbn && (
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    ISBN {book.isbn}
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
                        onClick={() => void handleDelete(book)}
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
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => startEdit(book)}
                    >
                      Editar
                    </button>
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

        {pagination && pagination.totalPages > 1 && (
          <nav
            aria-label="Paginación"
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              className={btnGhost}
              onClick={() => { setSearching(true); setPage((p) => Math.max(1, p - 1)) }}
              disabled={!pagination.hasPrev || searching}
            >
              Anterior
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => { setSearching(true); setPage(number) }}
                  aria-current={
                    number === pagination.page ? 'page' : undefined
                  }
                  className={
                    number === pagination.page
                      ? 'size-9 rounded-lg bg-indigo-600 text-sm font-medium text-white'
                      : 'size-9 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50'
                  }
                >
                  {number}
                </button>
              )
            )}

            <button
              type="button"
              className={btnGhost}
              onClick={() => { setSearching(true); setPage((p) => p + 1) }}
              disabled={!pagination.hasNext || searching}
            >
              Siguiente
            </button>
          </nav>
        )}
      </Card>
    </div>
  )
}
