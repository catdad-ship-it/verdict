import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /share and /api/health never depend on auth state — skip the getUser()
  // network round-trip entirely instead of paying it just to fall through
  // as public. The health check in particular needs to stay fast and cheap
  // since Fly hits it on every machine.
  if (pathname.startsWith('/share') || pathname === '/api/health') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Auth routes are reachable without a session, but a logged-in user
  // visiting them (e.g. a stale /login tab) gets bounced to '/' — except
  // the password-recovery confirm page, which needs the session a recovery
  // link creates.
  const authPrefixes = ['/login', '/signup', '/reset-password']
  const isAuthRoute = authPrefixes.some(p => pathname.startsWith(p))

  if (!user && !isAuthRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute && pathname !== '/reset-password/confirm') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
