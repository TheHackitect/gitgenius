import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/location - Save user location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      latitude, 
      longitude, 
      accuracy, 
      altitude, 
      altitudeAccuracy, 
      heading, 
      speed,
      source = 'gps',
    } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || undefined;

    // Reverse geocode using free service (optional)
    let geoData: {
      country?: string;
      countryCode?: string;
      region?: string;
      city?: string;
      postalCode?: string;
      timezone?: string;
    } = {};

    try {
      const geoResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (geoResponse.ok) {
        const geoJson = await geoResponse.json();
        geoData = {
          country: geoJson.countryName,
          countryCode: geoJson.countryCode,
          region: geoJson.principalSubdivision,
          city: geoJson.city || geoJson.locality,
          postalCode: geoJson.postcode,
        };
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }

    // Try to get timezone from coordinates
    try {
      const tzResponse = await fetch(
        `https://api.bigdatacloud.net/data/timezone-by-location?latitude=${latitude}&longitude=${longitude}&key=`
      );
      
      if (tzResponse.ok) {
        const tzJson = await tzResponse.json();
        geoData.timezone = tzJson.timezone;
      }
    } catch {
      // Ignore timezone errors
    }

    const location = await prisma.userLocation.create({
      data: {
        userId: session.user.id,
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed,
        source,
        ipAddress,
        ...geoData,
      },
    });

    // Update user's timezone in settings if we got it
    if (geoData.timezone) {
      await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: { timezone: geoData.timezone },
        create: { 
          userId: session.user.id,
          timezone: geoData.timezone,
        },
      });
    }

    return NextResponse.json({ 
      success: true,
      location: {
        id: location.id,
        ...geoData,
      },
    });
  } catch (error) {
    console.error('Failed to save location:', error);
    return NextResponse.json(
      { error: 'Failed to save location' },
      { status: 500 }
    );
  }
}

// GET /api/location - Get user's latest location
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const location = await prisma.userLocation.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}
