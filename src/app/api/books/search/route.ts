import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Campos por los que se permite ordenar. Se valida contra esta lista para que
// un valor arbitrario en la URL no llegue nunca al `orderBy` de Prisma.
const SORTABLE_FIELDS = ['title', 'publishedYear', 'createdAt'] as const
type SortableField = (typeof SORTABLE_FIELDS)[number]

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

function parseSortBy(value: string | null): SortableField {
  return SORTABLE_FIELDS.includes(value as SortableField)
    ? (value as SortableField)
    : 'createdAt'
}

function parseOrder(value: string | null): Prisma.SortOrder {
  return value === 'asc' ? 'asc' : 'desc'
}

/**
 * Convierte el parámetro a entero y lo deja dentro de [min, max].
 * Si no es un número válido devuelve el valor por defecto, de modo que
 * `?page=abc` no rompe la consulta.
 */
function parseIntInRange(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

// GET - Buscar libros con filtros, ordenamiento y paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')?.trim()
    const genre = searchParams.get('genre')?.trim()
    const authorName = searchParams.get('authorName')?.trim()

    const page = parseIntInRange(searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER)
    const limit = parseIntInRange(
      searchParams.get('limit'),
      DEFAULT_LIMIT,
      1,
      MAX_LIMIT
    )
    const sortBy = parseSortBy(searchParams.get('sortBy'))
    const order = parseOrder(searchParams.get('order'))

    const where: Prisma.BookWhereInput = {
      // Búsqueda parcial por título, sin distinguir mayúsculas.
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
      // El género se filtra por coincidencia exacta, tal como pide el enunciado.
      ...(genre && { genre }),
      // Búsqueda parcial por nombre del autor a través de la relación.
      ...(authorName && {
        author: {
          name: { contains: authorName, mode: 'insensitive' },
        },
      }),
    }

    // El total se cuenta con el mismo `where` para que la paginación sea
    // coherente con el filtro aplicado.
    const total = await prisma.book.count({ where })
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

    // Si piden una página más allá del final se devuelve la última con datos,
    // en lugar de una lista vacía sin explicación.
    const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages)

    const data = await prisma.book.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            nationality: true,
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip: (currentPage - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      data,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
      filters: {
        search: search ?? null,
        genre: genre ?? null,
        authorName: authorName ?? null,
        sortBy,
        order,
      },
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al buscar libros' },
      { status: 500 }
    )
  }
}
