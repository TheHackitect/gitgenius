'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { data: session } = useSession();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      // Check current permission
      const permission = Notification.permission;
      
      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          permission,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission,
          isLoading: false,
          error: 'Failed to check subscription status',
        }));
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (deviceName?: string): Promise<boolean> => {
    if (!session?.user) {
      setState(prev => ({ ...prev, error: 'Must be logged in' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          permission, 
          isLoading: false,
          error: 'Notification permission denied' 
        }));
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service worker registration failed');
      }

      // Get VAPID public key
      const vapidResponse = await fetch('/api/push/subscribe');
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error('Push notifications not configured on server');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, [session, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
