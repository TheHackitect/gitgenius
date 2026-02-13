'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  permission: PermissionState | 'unknown';
  lastUpdated: Date | null;
}

export function useLocation() {
  const { data: session } = useSession();
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    country: null,
    city: null,
    timezone: null,
    isLoading: false,
    error: null,
    isSupported: false,
    permission: 'unknown',
    lastUpdated: null,
  });

  // Check if geolocation is supported
  useEffect(() => {
    const isSupported = 'geolocation' in navigator;
    setState(prev => ({ ...prev, isSupported }));

    if (isSupported && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setState(prev => ({ ...prev, permission: result.state }));
        
        result.addEventListener('change', () => {
          setState(prev => ({ ...prev, permission: result.state }));
        });
      });
    }
  }, []);

  // Save location to server
  const saveLocation = useCallback(async (position: GeolocationPosition) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          source: 'gps',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          country: data.location?.country || null,
          city: data.location?.city || null,
          timezone: data.location?.timezone || null,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  }, [session]);

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !session?.user) {
      setState(prev => ({ ...prev, error: 'Location not supported or not logged in' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            isLoading: false,
            error: null,
            permission: 'granted',
          }));
          
          saveLocation(position);
          resolve(true);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
            permission: error.code === error.PERMISSION_DENIED ? 'denied' : prev.permission,
          }));
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [state.isSupported, session, saveLocation]);

  // Watch location (continuous tracking)
  const watchLocation = useCallback(() => {
    if (!state.isSupported) return null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          error: null,
          permission: 'granted',
        }));
        
        saveLocation(position);
      },
      (error) => {
        console.error('Watch location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    return watchId;
  }, [state.isSupported, saveLocation]);

  // Stop watching location
  const stopWatching = useCallback((watchId: number) => {
    navigator.geolocation.clearWatch(watchId);
  }, []);

  return {
    ...state,
    getCurrentLocation,
    watchLocation,
    stopWatching,
  };
}
