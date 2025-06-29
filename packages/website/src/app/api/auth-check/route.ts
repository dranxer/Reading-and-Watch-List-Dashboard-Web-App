import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Add CORS headers for extension
    const response = NextResponse.json(
      userId ? { 
        authenticated: true, 
        userId,
        user: { id: userId }
      } : { 
        authenticated: false 
      }
    );
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('Auth check error:', error);
    const response = NextResponse.json({ authenticated: false });
    
    // Add CORS headers even for errors
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle preflight requests
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    // For extension requests with Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing or invalid authorization header'
      }, { status: 401 });
    }

    // Extract token
    const token = authHeader.substring(7);
    
    // Verify the token using Clerk's auth
    const { userId } = await auth();
    
    if (!userId && token) {
      // If no userId from auth() but we have a token, try alternative validation
      try {
        // You could add additional token validation here if needed
        const user = await currentUser();
        if (user) {
          return NextResponse.json({
            authenticated: true,
            isSignedIn: true,
            userId: user.id,
            email: user.emailAddresses?.[0]?.emailAddress || null,
            valid: true
          });
        }
      } catch (validationError) {
        console.error('Token validation error:', validationError);
      }
    }

    if (userId) {
      const user = await currentUser();
      return NextResponse.json({
        authenticated: true,
        isSignedIn: true,
        userId: userId,
        email: user?.emailAddresses?.[0]?.emailAddress || null,
        valid: true
      });
    } else {
      return NextResponse.json({
        error: 'Invalid or expired token'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json({
      error: 'Token validation failed'
    }, { status: 401 });
  }
} 