import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { extensionId, version, timestamp } = body;
    
    console.log('🎉 Extension installation confirmed:', {
      extensionId,
      version,
      timestamp: new Date(timestamp).toISOString()
    });
    
    // Log successful installation
    // In a production app, you might want to store this in a database
    
    return NextResponse.json({
      success: true,
      message: 'Extension installation confirmed',
      data: {
        extensionId,
        version,
        confirmedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error confirming extension installation:', error);
    return NextResponse.json(
      { error: 'Failed to confirm installation' },
      { status: 500 }
    );
  }
} 