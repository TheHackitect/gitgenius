import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if email is already taken by another user
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            githubAccounts: true,
            activityLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all related data in order (respecting foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // Delete commit records for user's GitHub accounts
      await tx.commitRecord.deleteMany({
        where: {
          repository: {
            githubAccount: {
              userId: session.user.id,
            },
          },
        },
      });

      // Delete automation jobs
      await tx.automationJob.deleteMany({
        where: {
          githubAccount: {
            userId: session.user.id,
          },
        },
      });

      // Delete automation configs
      await tx.automationConfig.deleteMany({
        where: {
          githubAccount: {
            userId: session.user.id,
          },
        },
      });

      // Delete contribution days
      await tx.contributionDay.deleteMany({
        where: {
          githubAccount: {
            userId: session.user.id,
          },
        },
      });

      // Delete repositories
      await tx.repository.deleteMany({
        where: {
          githubAccount: {
            userId: session.user.id,
          },
        },
      });

      // Delete activity logs
      await tx.activityLog.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      // Delete GitHub accounts
      await tx.gitHubAccount.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      // Delete accounts (OAuth)
      await tx.account.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: {
          id: session.user.id,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
