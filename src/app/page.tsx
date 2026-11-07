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
  Stat,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputClass,
} from '@/components/ui'
import { requestJson, type Author } from '@/lib/types'

type FormState = {
  name: string
  email: string
  nationality: string
  birthYear: string
  bio: string
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  nationality: '',
  birthYear: '',
  bio: '',
}

export default function AuthorsDashboardPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // `editingId` distingue el alta de la edición: con valor, el formulario
  // envía un PUT a /api/authors/[id]; sin él, un POST a /api/authors.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  // El borrado se confirma dentro de la tarjeta en lugar de con `confirm()`:
  // un diálogo nativo bloquea la página y además no se puede estilizar.
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // El estado se actualiza dentro de los callbacks de la promesa, no en el
  // cuerpo del efecto: la regla react-hooks/set-state-in-effect prohíbe
  // llamar a setState de forma síncrona al montar el componente.
  const loadAuthors = useCallback(
    () =>
      requestJson<Author[]>('/api/authors')
        .then((data) => {
          setAuthors(data)
          setError(null)
        })
        .catch((err: unknown) =>
          setError(
            err instanceof Error ? err.message : 'Error al cargar autores'
          )
        )
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    void loadAuthors()
  }, [loadAuthors])

  // Estadísticas generales calculadas sobre la respuesta de /api/authors,
  // que ya incluye _count.books, así que no hace falta otra petición.
  const stats = useMemo(() => {
    const totalBooks = authors.reduce(
      (sum, author) => sum + (author._count?.books ?? 0),
      0
    )
    const genres = new Set<string>()
    for (const author of authors) {
      for (const book of author.books ?? []) {
        if (book.genre) genres.add(book.genre)
      }
    }
    const nationalities = new Set(
      authors.map((a) => a.nationality).filter(Boolean)
    )
    const topAuthor = [...authors].sort(
      (a, b) => (b._count?.books ?? 0) - (a._count?.books ?? 0)
    )[0]

    return {
      totalAuthors: authors.length,
      totalBooks,
      genres: genres.size,
      nationalities: nationalities.size,
      average: authors.length
        ? (totalBooks / authors.length).toFixed(1)
        : '0.0',
      topAuthor,
    }
  }, [authors])

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const startEdit = (author: Author) => {
    setEditingId(author.id)
    setForm({
      name: author.name,
      email: author.email,
      nationality: author.nationality ?? '',
      birthYear: author.birthYear ? String(author.birthYear) : '',
      bio: author.bio ?? '',
    })
    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.name.trim() || !form.email.trim()) {
      setError('Nombre y email son requeridos.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        nationality: form.nationality.trim() || null,
        birthYear: form.birthYear.trim() || null,
        bio: form.bio.trim() || null,
      }

      await requestJson<Author>(
        editingId ? `/api/authors/${editingId}` : '/api/authors',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      setSuccess(editingId ? 'Autor actualizado.' : 'Autor creado.')
      resetForm()
      await loadAuthors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar autor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (author: Author) => {
    setDeletingId(author.id)
    setError(null)
    setSuccess(null)
    try {
      await requestJson(`/api/authors/${author.id}`, { method: 'DELETE' })
      setSuccess('Autor eliminado.')
      if (editingId === author.id) resetForm()
      await loadAuthors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar autor')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard de autores
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Alta, edición y baja de autores consumiendo las API Routes de
          Next.js.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Autores" value={stats.totalAuthors} />
        <Stat label="Libros" value={stats.totalBooks} />
        <Stat
          label="Promedio de libros"
          value={stats.average}
          hint="por autor"
        />
        <Stat
          label="Géneros distintos"
          value={stats.genres}
          hint={`${stats.nationalities} nacionalidad(es)`}
        />
      </div>

      {stats.topAuthor && (stats.topAuthor._count?.books ?? 0) > 0 && (
        <p className="text-sm text-slate-500">
          Autor con más obras registradas:{' '}
          <span className="font-medium text-slate-800">
            {stats.topAuthor.name}
          </span>{' '}
          ({stats.topAuthor._count?.books} libros)
        </p>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          {editingId ? 'Editar autor' : 'Nuevo autor'}
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          {editingId
            ? 'Se enviará un PUT a /api/authors/[id].'
            : 'Se enviará un POST a /api/authors.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre *" htmlFor="name">
              <input
                id="name"
                className={inputClass}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Gabriel García Márquez"
              />
            </Field>

            <Field label="Email *" htmlFor="email">
              <input
                id="email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="gabo@example.com"
              />
            </Field>

            <Field label="Nacionalidad" htmlFor="nationality">
              <input
                id="nationality"
                className={inputClass}
                value={form.nationality}
                onChange={(e) => update('nationality', e.target.value)}
                placeholder="Colombia"
              />
            </Field>

            <Field label="Año de nacimiento" htmlFor="birthYear">
              <input
                id="birthYear"
                type="number"
                className={inputClass}
                value={form.birthYear}
                onChange={(e) => update('birthYear', e.target.value)}
                placeholder="1927"
              />
            </Field>
          </div>

          <Field label="Biografía" htmlFor="bio">
            <textarea
              id="bio"
              rows={3}
              className={inputClass}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder="Premio Nobel de Literatura 1982"
            />
          </Field>

          {error && <Message kind="error">{error}</Message>}
          {success && <Message kind="success">{success}</Message>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving && <Spinner />}
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Crear autor'}
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Autores registrados
          </h2>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setLoading(true)
              void loadAuthors()
            }}
            disabled={loading}
          >
            {loading && <Spinner />}
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
            <Spinner className="size-5 text-indigo-600" />
            Cargando autores...
          </div>
        ) : authors.length === 0 ? (
          <EmptyState>
            Todavía no hay autores. Crea el primero con el formulario de
            arriba.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {authors.map((author) => (
              <li
                key={author.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {author.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {author.email}
                    </p>
                  </div>
                  <Badge>{author._count?.books ?? 0} libros</Badge>
                </div>

                <p className="text-sm text-slate-500">
                  {[author.nationality, author.birthYear]
                    .filter(Boolean)
                    .join(' · ') || 'Sin datos adicionales'}
                </p>

                {author.bio && (
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {author.bio}
                  </p>
                )}

                {confirmId === author.id ? (
                  <div className="mt-auto rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">
                      ¿Eliminar a {author.name}?
                      {(author._count?.books ?? 0) > 0 &&
                        ` Se borrarán también sus ${author._count?.books} libro(s).`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void handleDelete(author)}
                        disabled={deletingId === author.id}
                      >
                        {deletingId === author.id && <Spinner />}
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => setConfirmId(null)}
                        disabled={deletingId === author.id}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`/authors/${author.id}`} className={btnGhost}>
                      Ver libros
                    </Link>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => startEdit(author)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => setConfirmId(author.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
