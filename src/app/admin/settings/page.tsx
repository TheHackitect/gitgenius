'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Bell,
  Shield,
  Save,
  Key,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AppSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxJobsPerUser: number;
  maxGitHubAccountsPerUser: number;
  pushNotificationsEnabled: boolean;
  locationTrackingEnabled: boolean;
  vapidConfigured: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: false,
    maxJobsPerUser: 100,
    maxGitHubAccountsPerUser: 5,
    pushNotificationsEnabled: true,
    locationTrackingEnabled: true,
    vapidConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Application settings have been updated successfully.',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold">App Settings</h1>
          <p className="text-muted-foreground">Configure application-wide settings</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Core application configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Disable access for non-admin users
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to sign up
                </p>
              </div>
              <Switch
                checked={settings.allowRegistration}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, allowRegistration: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Users must verify email before access
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, requireEmailVerification: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Resource Limits
            </CardTitle>
            <CardDescription>Control user resource allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxJobs">Max Jobs Per User</Label>
              <Input
                id="maxJobs"
                type="number"
                value={settings.maxJobsPerUser}
                onChange={(e) => 
                  setSettings({ ...settings, maxJobsPerUser: parseInt(e.target.value) || 100 })
                }
                min={1}
                max={1000}
              />
              <p className="text-sm text-muted-foreground">
                Maximum scheduled jobs allowed per user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAccounts">Max GitHub Accounts Per User</Label>
              <Input
                id="maxAccounts"
                type="number"
                value={settings.maxGitHubAccountsPerUser}
                onChange={(e) => 
                  setSettings({ ...settings, maxGitHubAccountsPerUser: parseInt(e.target.value) || 5 })
                }
                min={1}
                max={20}
              />
              <p className="text-sm text-muted-foreground">
                Maximum GitHub accounts per user
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>Configure push notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Allow push notifications to users
                </p>
              </div>
              <Switch
                checked={settings.pushNotificationsEnabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, pushNotificationsEnabled: checked })
                }
              />
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4" />
                <span className="font-medium text-sm">VAPID Keys Status</span>
              </div>
              {settings.vapidConfigured ? (
                <div className="flex items-center gap-2 text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Configured</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Not configured</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Run <code className="bg-background px-1 py-0.5 rounded">node scripts/admin-cli.js generate-vapid</code> to generate keys
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Location Tracking
            </CardTitle>
            <CardDescription>User location collection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Location Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Collect user location data
                </p>
              </div>
              <Switch
                checked={settings.locationTrackingEnabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, locationTrackingEnabled: checked })
                }
              />
            </div>

            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-500">Privacy Notice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ensure your Privacy Policy and Terms of Service reflect location data collection practices. Users must consent before tracking.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
