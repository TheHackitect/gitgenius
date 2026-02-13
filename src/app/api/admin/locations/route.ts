import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

interface UserLocation {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  latitude: number;
  longitude: number;
  accuracy: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  updatedAt: Date;
}

// GET /api/admin/locations - Get all user locations
export async function GET(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all locations with user data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const locations: UserLocation[] = prismaAny.userLocation ? 
      await prismaAny.userLocation.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }).catch(() => []) : [];

    // Calculate stats
    const totalLocations = locations.length;
    
    // Countries count
    const countries = new Set<string>();
    const countryCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    
    locations.forEach((loc: UserLocation) => {
      if (loc.country) {
        countries.add(loc.country);
        countryCount.set(loc.country, (countryCount.get(loc.country) || 0) + 1);
      }
      if (loc.city) {
        cityCount.set(loc.city, (cityCount.get(loc.city) || 0) + 1);
      }
    });

    // Top countries
    const topCountries = Array.from(countryCount.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top cities
    const topCities = Array.from(cityCount.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent updates (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdates = locations.filter(
      (loc: UserLocation) => new Date(loc.updatedAt) > oneDayAgo
    ).length;

    return NextResponse.json({
      locations,
      stats: {
        totalLocations,
        countriesCount: countries.size,
        topCountries,
        topCities,
        recentUpdates,
      },
    });
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
