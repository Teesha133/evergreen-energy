import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/proposals/view/:id',
  '/api/email',
  '/api/sms',
  '/api/proposals/view/:id', 
  '/favicon.ico',
  '/admin/login',
  '/sign-in',
  '/sign-up'
];

// Admin routes pattern
const ADMIN_ROUTE_PATTERN = /^\/admin(?:\/.*)?$/;

// Check if the path is a public route
function isPublicRoute(path: string): boolean {
  return publicRoutes.some(
    (publicRoute) => 
      path === publicRoute || 
      (publicRoute.endsWith('/:id') && path.startsWith(publicRoute.replace('/:id', '/')))
  );
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const path = nextUrl.pathname;
  
  // Allow public routes
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }
  
  // Check if it's an admin route
  const isAdminRoute = ADMIN_ROUTE_PATTERN.test(path);
  
  // Check if user is authenticated by looking for session cookie
  // Note: The actual cookie name may vary depending on your Clerk configuration
  const hasAuthCookie = request.cookies.has('__session') || 
                        request.cookies.has('__clerk_db_jwt');
  
  if (!hasAuthCookie) {
    // If not authenticated
    if (isAdminRoute) {
      // For admin routes, redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    } else {
      // For other protected routes, redirect to sign-in
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }
  
  // For admin routes, we'd ideally check the user role here
  // Since that's complex in middleware, we'll rely on the 
  // admin guard component for client-side protection
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/'
  ],
};