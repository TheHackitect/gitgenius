'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Globe,
  Clock,
  Users,
  Search,
  RefreshCw,
} from 'lucide-react';

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
  updatedAt: string;
}

interface LocationStats {
  totalLocations: number;
  countriesCount: number;
  topCountries: { country: string; count: number }[];
  topCities: { city: string; count: number }[];
  recentUpdates: number;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      loc.user.name?.toLowerCase().includes(searchLower) ||
      loc.user.email.toLowerCase().includes(searchLower) ||
      loc.city?.toLowerCase().includes(searchLower) ||
      loc.country?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Locations</h1>
          <p className="text-muted-foreground">Track user geographic distribution</p>
        </div>
        <Button onClick={fetchLocations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLocations || 0}</div>
            <p className="text-xs text-muted-foreground">users with location</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.countriesCount || 0}</div>
            <p className="text-xs text-muted-foreground">unique countries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentUpdates || 0}</div>
            <p className="text-xs text-muted-foreground">in last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Country</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {stats?.topCountries?.[0]?.country || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.topCountries?.[0]?.count || 0} users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>User distribution by country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topCountries?.slice(0, 10).map((item, index) => (
                <div key={item.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-4">{index + 1}.</span>
                    <span>{item.country}</span>
                  </div>
                  <span className="text-sm font-mono">{item.count}</span>
                </div>
              )) || (
                <p className="text-muted-foreground text-sm">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
            <CardDescription>User distribution by city</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats?.topCities?.slice(0, 10).map((item, index) => (
                <div key={item.city} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-4">{index + 1}.</span>
                    <span className="truncate">{item.city}</span>
                  </div>
                  <span className="text-sm font-mono ml-2">{item.count}</span>
                </div>
              )) || (
                <p className="text-muted-foreground text-sm col-span-2">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All User Locations</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, city, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">User</th>
                  <th className="text-left py-2 px-2">Location</th>
                  <th className="text-left py-2 px-2">Timezone</th>
                  <th className="text-left py-2 px-2">Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No locations found
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id} className="border-b hover:bg-secondary/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{loc.user.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{loc.user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {[loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Unknown'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          {loc.accuracy && ` (±${Math.round(loc.accuracy)}m)`}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm">{loc.timezone || 'Unknown'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(loc.updatedAt).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
