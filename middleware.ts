import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isPublicPath(pathname: string) {
  if (pathname === '/login' || pathname === '/register') return true
  if (pathname.startsWith('/auth/callback')) return true
  if (pathname.startsWith('/api/')) return true
  return false
}

function isStaticAsset(pathname: string) {
  if (pathname.startsWith('/_next/')) return true
  if (pathname === '/favicon.ico') return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/sitemap.xml') return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env is not configured, don't block the app in dev.
  if (!url || !key) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`
    return NextResponse.redirect(loginUrl)
  }

  // If already logged in, keep users out of auth pages.
  if (user && (pathname === '/login' || pathname === '/register')) {
    const next = request.nextUrl.searchParams.get('next') || '/'
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = next.startsWith('/') ? next : '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}

