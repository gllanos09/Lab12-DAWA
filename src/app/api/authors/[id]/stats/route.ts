import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

// GET - Estadísticas completas de un autor
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const author = await prisma.author.findUnique({
      where: { id },
      include: { books: true },
    })

    if (!author) {
      return NextResponse.json(
        { error: 'Autor no encontrado' },
        { status: 404 }
      )
    }

    const books = author.books

    // Un autor recién creado no tiene libros: se responde igual, con los
    // campos en null y las listas vacías, para que la página de detalle no
    // tenga que tratar este caso como un error.
    if (books.length === 0) {
      return NextResponse.json({
        authorId: author.id,
        authorName: author.name,
        totalBooks: 0,
        firstBook: null,
        latestBook: null,
        averagePages: null,
        genres: [],
        longestBook: null,
        shortestBook: null,
      })
    }

    // Para el primero y el último solo cuentan los libros con año conocido.
    const withYear = books.filter(
      (book): book is typeof book & { publishedYear: number } =>
        book.publishedYear !== null
    )
    const byYear = [...withYear].sort(
      (a, b) => a.publishedYear - b.publishedYear
    )

    // Lo mismo con las páginas: un libro sin páginas no debe contar como 0,
    // porque hundiría el promedio y sería siempre "el más corto".
    const withPages = books.filter(
      (book): book is typeof book & { pages: number } => book.pages !== null
    )
    const byPages = [...withPages].sort((a, b) => a.pages - b.pages)

    const averagePages =
      withPages.length > 0
        ? Math.round(
            withPages.reduce((sum, book) => sum + book.pages, 0) /
              withPages.length
          )
        : null

    const genres = [
      ...new Set(
        books
          .map((book) => book.genre)
          .filter((genre): genre is string => Boolean(genre))
      ),
    ].sort()

    return NextResponse.json({
      authorId: author.id,
      authorName: author.name,
      totalBooks: books.length,
      firstBook: byYear.length
        ? { title: byYear[0].title, year: byYear[0].publishedYear }
        : null,
      latestBook: byYear.length
        ? {
            title: byYear[byYear.length - 1].title,
            year: byYear[byYear.length - 1].publishedYear,
          }
        : null,
      averagePages,
      genres,
      longestBook: byPages.length
        ? {
            title: byPages[byPages.length - 1].title,
            pages: byPages[byPages.length - 1].pages,
          }
        : null,
      shortestBook: byPages.length
        ? { title: byPages[0].title, pages: byPages[0].pages }
        : null,
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del autor' },
      { status: 500 }
    )
  }
}
