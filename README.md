# Lab12-DAWA — API's Integradas

Laboratorio 12 del curso **Desarrollo de Aplicaciones Web Avanzado** (5 - C24, Sección A-B).

**Alumno:** Llanos Pacheco, Ángel Gabriel

Sistema de biblioteca construido con **API Routes de Next.js**, **Prisma ORM** y
**PostgreSQL en Supabase**. Incluye los 5 ejercicios del laboratorio y los
requerimientos de la tarea.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Prisma ORM 6 + PostgreSQL (Supabase)
- Tailwind CSS v4

## Modelo de datos

```
Author 1 ──── N Book        (onDelete: Cascade)
```

| Author | Book |
|---|---|
| `id`, `name`, `email` (único), `bio`, `nationality`, `birthYear` | `id`, `title`, `description`, `isbn` (único), `publishedYear`, `genre`, `pages`, `authorId` |

`Book` tiene índices en `authorId`, `genre` y `title`, que son las tres
columnas por las que filtra el endpoint de búsqueda.

## Ejecutar en local

```bash
npm install
cp .env.example .env     # y rellenar con la cadena de Supabase
npx prisma db push
npx prisma generate
npm run dev
```

La aplicación queda en <http://localhost:3000>.

## API Routes

### Laboratorio

| # | Método | Ruta | Descripción |
|---|---|---|---|
| 1 | `GET` | `/api/authors` | Lista los autores con sus libros y el conteo. |
| 1 | `POST` | `/api/authors` | Crea un autor. Valida nombre, email y formato de email. |
| 2 | `GET` | `/api/authors/[id]` | Un autor con sus libros ordenados por año. |
| 2 | `PUT` | `/api/authors/[id]` | Actualiza un autor. |
| 2 | `DELETE` | `/api/authors/[id]` | Elimina un autor (y en cascada sus libros). |
| 3 | `GET` | `/api/authors/[id]/books` | Libros de un autor concreto. |
| 4 | `GET` | `/api/books` | Lista los libros; admite `?genre=` y `?authorId=`. |
| 4 | `POST` | `/api/books` | Crea un libro. Verifica que el autor exista. |
| 5 | `GET` | `/api/books/[id]` | Un libro con su autor. |
| 5 | `PUT` | `/api/books/[id]` | Actualiza un libro. |
| 5 | `DELETE` | `/api/books/[id]` | Elimina un libro. |

### Tarea

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/books/search` | Búsqueda con filtros, ordenamiento y paginación. |
| `GET` | `/api/authors/[id]/stats` | Estadísticas completas del autor. |

**Parámetros de `/api/books/search`**

| Parámetro | Por defecto | Notas |
|---|---|---|
| `search` | — | Título, parcial y sin distinguir mayúsculas. |
| `genre` | — | Coincidencia exacta. |
| `authorName` | — | Nombre del autor, parcial y sin distinguir mayúsculas. |
| `page` | `1` | — |
| `limit` | `10` | Máximo 50. |
| `sortBy` | `createdAt` | `title`, `publishedYear` o `createdAt`. |
| `order` | `desc` | `asc` o `desc`. |

Respuesta:

```json
{
  "data": [],
  "pagination": {
    "page": 1, "limit": 10, "total": 45,
    "totalPages": 5, "hasNext": true, "hasPrev": false
  }
}
```

### Códigos de estado

| Código | Cuándo |
|---|---|
| `400` | Faltan campos requeridos o no pasan la validación. |
| `404` | El recurso (o el autor referenciado) no existe. |
| `409` | Email de autor o ISBN de libro duplicado (Prisma `P2002`). |
| `500` | Cualquier otro error. |

## Páginas

| Ruta | Contenido |
|---|---|
| `/` | Dashboard de autores: alta, edición, baja y métricas generales. |
| `/books` | Catálogo con búsqueda en tiempo real, filtros, ordenamiento y paginación. |
| `/authors/[id]` | Detalle del autor: estadísticas, sus libros y formularios de edición. |

## Decisiones que se apartan de la guía

- **`params` es una promesa.** La guía escribe `params.id` directamente, pero
  desde Next.js 15 los parámetros de ruta llegan como `Promise`, así que todos
  los handlers hacen `const { id } = await params`.
- **Cliente de Prisma cacheado en desarrollo, no en producción.** La guía
  guarda la instancia en `globalThis` cuando `NODE_ENV === 'production'`; es al
  revés: el caché existe para sobrevivir a las recargas en caliente de `next
  dev` y no agotar las conexiones. El archivo usa `!==`.
- **Sin `catch (error: any)`.** ESLint prohíbe `any`, así que el código de
  error de Prisma se comprueba con el type guard de `src/lib/prisma-errors.ts`.
- **`cacheComponents` desactivado** en `next.config.ts`: todas las rutas leen
  datos en tiempo de ejecución, así que no hay nada que prerenderizar.

## Capturas

En `docs/capturas/`.
