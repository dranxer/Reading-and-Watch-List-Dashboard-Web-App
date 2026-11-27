import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Extension auth check received');
    
    const { userId } = await auth();
    console.log('🔐 User ID from auth:', userId);
    
    // Add CORS headers for extension
    const response = NextResponse.json(
      userId ? { 
        authenticated: true, 
        userId,
        user: { id: userId }
      } : { 
        authenticated: false,
        message: 'Not authenticated - please sign in to the dashboard first'
      }
    );
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    console.log('🔐 Sending response:', { authenticated: !!userId });
    return response;
  } catch (error) {
    console.error('Auth check error:', error);
    const response = NextResponse.json({ 
      authenticated: false,
      error: 'Server error during authentication check'
    });
    
    // Add CORS headers even for errors
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
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