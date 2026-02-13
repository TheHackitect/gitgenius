import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id] - Get single user details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        githubAccounts: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            isActive: true,
            totalRepos: true,
            totalCommits: true,
            currentStreak: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            activityLogs: true,
            notifications: true,
            pushSubscriptions: true,
            locations: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (role, ban, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, isActive, isBanned, bannedReason } = body;

    // Prevent modifying own superadmin status
    if (id === adminSession.user.id && role && role !== adminSession.user.role) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 400 }
      );
    }

    // Only superadmins can change roles
    if (role && adminSession.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Only superadmins can change user roles' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isBanned !== undefined) {
      updateData.isBanned = isBanned;
      updateData.bannedReason = isBanned ? bannedReason : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isBanned: true,
        bannedReason: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (superadmin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession || adminSession.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === adminSession.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
