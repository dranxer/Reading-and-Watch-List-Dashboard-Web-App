import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function GET(request: NextRequest) {
  try {
    const extensionPath = path.join(process.cwd(), '../../packages/extension');
    
    // Check if extension directory exists
    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json({ error: 'Extension files not found' }, { status: 404 });
    }

    // Essential files to include in the download
    const essentialFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'popup.js',
      'popup.html',
      'icon.svg',
      'README.md'
    ];

    // Create a buffer to store the zip
    const chunks: Buffer[] = [];
    
    return new Promise<NextResponse>((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive events
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        
        const response = new NextResponse(zipBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="readwatch-tracker-extension.zip"',
            'Content-Length': zipBuffer.length.toString(),
          },
        });

        resolve(response);
      });

      archive.on('error', (err: Error) => {
        console.error('Archive error:', err);
        reject(new NextResponse(JSON.stringify({ error: 'Failed to create archive' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      });

      // Add files to archive
      essentialFiles.forEach(fileName => {
        const filePath = path.join(extensionPath, fileName);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: fileName });
        }
      });

      // Finalize the archive
      archive.finalize();
    });

  } catch (error) {
    console.error('Download extension error:', error);
    return NextResponse.json(
      { error: 'Failed to create extension download' }, 
      { status: 500 }
    );
  }
} 