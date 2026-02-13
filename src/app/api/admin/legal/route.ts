import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

// GET /api/admin/legal - Get all legal pages (admin)
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await prisma.legalPage.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Failed to fetch legal pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legal pages' },
      { status: 500 }
    );
  }
}

// POST /api/admin/legal - Create or update a legal page
export async function POST(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, title, content, isPublished } = body;

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: 'Slug, title, and content are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    // Check if page exists
    const existing = await prisma.legalPage.findUnique({
      where: { slug },
    });

    let page;
    
    if (existing) {
      // Update existing page, increment version
      page = await prisma.legalPage.update({
        where: { slug },
        data: {
          title,
          content,
          isPublished: isPublished ?? existing.isPublished,
          publishedAt: isPublished ? new Date() : existing.publishedAt,
          version: existing.version + 1,
          updatedBy: adminSession.user.id,
        },
      });
    } else {
      // Create new page
      page = await prisma.legalPage.create({
        data: {
          slug,
          title,
          content,
          isPublished: isPublished ?? true,
          publishedAt: isPublished ? new Date() : null,
          updatedBy: adminSession.user.id,
        },
      });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Failed to save legal page:', error);
    return NextResponse.json(
      { error: 'Failed to save legal page' },
      { status: 500 }
    );
  }
}
