import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch user's onboarding profile
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: user.preferences || null,
      // Note: onboardingComplete field will be available after migration
      onboardingComplete: (user.preferences as Record<string, unknown>)?.onboardingComplete ?? false,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save onboarding profile (create or update)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      livingSituation,
      experienceLevel,
      hasChildren,
      hasOtherPets,
      otherPetTypes,
      activityLevel,
      preferredSpecies,
    } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upsert the user preferences
    // Note: New onboarding fields require schema migration to be applied
    const updateData: Record<string, unknown> = {
      livingSituation,
      experienceLevel,
      hasChildren,
      hasOtherPets,
      otherPetTypes,
      activityLevel,
      preferredSpecies,
      onboardingComplete: true,
      updatedAt: new Date(),
    };
    
    const createData: Record<string, unknown> = {
      userId: user.id,
      livingSituation,
      experienceLevel,
      hasChildren,
      hasOtherPets,
      otherPetTypes,
      activityLevel,
      preferredSpecies,
      onboardingComplete: true,
    };

    const preferences = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: updateData as Parameters<typeof prisma.userPreference.update>[0]['data'],
      create: createData as Parameters<typeof prisma.userPreference.create>[0]['data'],
    });

    return NextResponse.json({
      success: true,
      profile: preferences,
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update specific profile fields
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if preferences exist
    const existing = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Profile not found. Use POST to create.' }, { status: 404 });
    }

    // Update only the provided fields
    const preferences = await prisma.userPreference.update({
      where: { userId: user.id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      profile: preferences,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
