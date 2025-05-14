import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const publicRoutes = [
    '/',
    '/proposals/view/:id',
    '/api/email',
    '/api/sms',
    '/api/proposals/view/:id', 
    '/favicon.ico'
];

// Define admin-only routes
const adminRoutes = createRouteMatcher([
  '/admin(.*)'
]);

// Export the middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();
  const path = req.nextUrl.pathname;
  
  // Check if the path is a public route
  const isPublicRoute = publicRoutes.some(
    (publicRoute) => path === publicRoute || 
    (publicRoute.endsWith('/:id') && path.startsWith(publicRoute.replace('/:id', '/')))
  );
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return;
  }
  
  // If user is not signed in, redirect to sign-in
  if (!userId) {
    // This will redirect to the sign-in page
    return redirectToSignIn({ returnBackUrl: req.url });
  }
  
  // For admin routes, we can add additional permission checks
  // In a real implementation, we would check the user's role from the database
  // For now, we'll leave this basic implementation
  if (adminRoutes(req)) {
    // Check for admin role logic would go here
    // This is a placeholder for future implementation
  }
});

// Configure middleware to run on specific routes
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/'
  ],
};