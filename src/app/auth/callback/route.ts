import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  let response = NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', request.url))

  if (!code) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set(
      'error',
      'Inicio de sesión cancelado o falta el código OAuth. Revisa Redirect URLs en Supabase y la URL de callback en Google Cloud.'
    )
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.redirect(
          new URL(next.startsWith('/') ? next : '/', request.url)
        )
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(loginUrl)
  }
  return response
}

