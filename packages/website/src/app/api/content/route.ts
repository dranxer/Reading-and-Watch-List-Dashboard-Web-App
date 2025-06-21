import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { url, title, content, summary, type } = body;

    if (!url || !title || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save the new content item to the database
    const newItem = await prisma.contentItem.create({
      data: { url, title, content, summary, type, userId },
    });

    return NextResponse.json(newItem);

  } catch (error) {
    console.error('Error in /api/content:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 