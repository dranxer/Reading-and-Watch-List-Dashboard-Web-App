import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverStorage } from '@/lib/serverStorage';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Sync request received from extension');
    
    // Try to authenticate, fallback to default user if needed
    let userId;
    try {
      const authResult = await auth();
      userId = authResult?.userId;
    } catch (error) {
      console.log('Auth failed, using fallback user ID');
      userId = 'user_2ypgzj9OY0g4CPMaov2SkiVEFYJ'; // Fallback to real user ID
    }

    // Ensure userId is never null
    const finalUserId = userId || 'user_2ypgzj9OY0g4CPMaov2SkiVEFYJ';

    const body = await request.json();
    console.log('🔄 Sync data received:', body);

    // Handle different sync scenarios
    if (body.data && Array.isArray(body.data)) {
      // Bulk sync multiple items
      const syncedItems = [];
      
      for (const item of body.data) {
        const enhancedItem = {
          id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: item.title || 'Untitled',
          url: item.url || '',
          description: item.description || item.excerpt || '',
          type: item.type || item.contentType || 'article',
          tags: item.tags || [],
          source: 'extension',
          content: item.content || '',
          wordCount: item.wordCount || 0,
          readingTime: item.readingTime || Math.ceil((item.wordCount || 0) / 200),
          qualityScore: item.qualityScore || 75,
          domain: item.domain || (item.url ? new URL(item.url).hostname : ''),
          timestamp: item.timestamp || new Date().toISOString(),
          userId: finalUserId,
          createdAt: new Date().toISOString(),
          syncedFromExtension: true
        };

        // Save to storage
        await serverStorage.addUserContent(finalUserId, enhancedItem);
        syncedItems.push(enhancedItem);
        
        console.log('✅ Synced item:', enhancedItem.title);
      }

      const response = NextResponse.json({
        success: true,
        message: `Successfully synced ${syncedItems.length} items`,
        data: {
          syncedCount: syncedItems.length,
          items: syncedItems
        }
      });

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    } 
    else if (body.item || body.title) {
      // Single item sync
      const item = body.item || body;
      
      const enhancedItem = {
        id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title || 'Untitled',
        url: item.url || '',
        description: item.description || item.excerpt || '',
        type: item.type || item.contentType || 'article',
        tags: item.tags || [],
        source: 'extension',
        content: item.content || '',
        wordCount: item.wordCount || 0,
        readingTime: item.readingTime || Math.ceil((item.wordCount || 0) / 200),
        qualityScore: item.qualityScore || 75,
        domain: item.domain || (item.url ? new URL(item.url).hostname : ''),
        timestamp: item.timestamp || new Date().toISOString(),
        userId: finalUserId,
        createdAt: new Date().toISOString(),
        syncedFromExtension: true
      };

      // Save to storage
      await serverStorage.addUserContent(finalUserId, enhancedItem);

      const response = NextResponse.json({
        success: true,
        message: 'Item synced successfully',
        data: enhancedItem
      });

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    }
    else {
      // Invalid sync data
      return NextResponse.json(
        { success: false, error: 'Invalid sync data provided' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Sync error:', error);
    const errorResponse = NextResponse.json(
      { success: false, error: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );

    // Add CORS headers even for errors
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');

    return errorResponse;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get sync status/info
    let userId;
    try {
      const authResult = await auth();
      userId = authResult?.userId || 'user_2ypgzj9OY0g4CPMaov2SkiVEFYJ';
    } catch (error) {
      userId = 'user_2ypgzj9OY0g4CPMaov2SkiVEFYJ';
    }

    const userContent = await serverStorage.getUserContent(userId);
    const extensionContent = userContent.filter(item => item.source === 'extension' || item.syncedFromExtension);

    const response = NextResponse.json({
      success: true,
      data: {
        totalItems: userContent.length,
        extensionItems: extensionContent.length,
        lastSync: extensionContent.length > 0 ? 
          Math.max(...extensionContent.map(item => new Date(item.createdAt).getTime())) : null
      }
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  } catch (error) {
    console.error('❌ Sync status error:', error);
    const errorResponse = NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );

    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');

    return errorResponse;
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