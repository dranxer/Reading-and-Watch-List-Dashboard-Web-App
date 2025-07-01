import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "API is working perfectly!",
    timestamp: new Date().toISOString(),
    method: "GET"
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 POST request received to /api/test');
    console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
    
    let body;
    let parseError = null;
    let rawBody = '';
    
    // Try to parse JSON
    try {
      rawBody = await request.text();
      console.log('📄 Raw body length:', rawBody.length);
      console.log('📄 Raw body content:', JSON.stringify(rawBody));
      
      if (!rawBody || rawBody.trim() === '') {
        body = {};
        console.log('✅ Empty body, using empty object');
      } else {
        console.log('🔍 Attempting JSON.parse on:', rawBody);
        body = JSON.parse(rawBody);
        console.log('✅ Successfully parsed JSON:', body);
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Unknown parse error';
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Failed to parse this raw body:', JSON.stringify(rawBody));
      
      // Return the error immediately so we can see what's wrong
      return NextResponse.json({
        success: false,
        error: "JSON parsing failed",
        details: {
          parseError: parseError,
          rawBody: rawBody,
          bodyLength: rawBody?.length || 0,
          contentType: request.headers.get('content-type'),
          headers: Object.fromEntries(request.headers.entries())
        }
      }, { status: 400 });
    }
    
    const response = {
      success: true,
      message: "POST request received successfully!",
      timestamp: new Date().toISOString(),
      method: "POST",
      receivedData: body,
      debug: {
        contentType: request.headers.get('content-type'),
        hasBody: body !== null,
        parseError: parseError
      }
    };
    
    console.log('📤 Sending response:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 POST endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to process POST request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    return NextResponse.json({
      success: true,
      message: "PUT request received successfully!",
      timestamp: new Date().toISOString(),
      method: "PUT",
      receivedData: body
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to process PUT request"
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    success: true,
    message: "DELETE request received successfully!",
    timestamp: new Date().toISOString(),
    method: "DELETE"
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 