import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/legal/[slug] - Get a public legal page
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const page = await prisma.legalPage.findUnique({
      where: { 
        slug,
        isPublished: true,
      },
      select: {
        slug: true,
        title: true,
        content: true,
        publishedAt: true,
        version: true,
        updatedAt: true,
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Failed to fetch legal page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal page' },
      { status: 500 }
    );
  }
}
