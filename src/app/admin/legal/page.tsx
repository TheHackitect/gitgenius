'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Save,
  Eye,
  Edit,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  version: number;
  updatedAt: string;
}

const defaultPages = [
  { slug: 'terms', title: 'Terms of Service' },
  { slug: 'privacy', title: 'Privacy Policy' },
];

export default function AdminLegalPage() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<{
    slug: string;
    title: string;
    content: string;
    isPublished: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchPages = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/legal');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPages(data.pages);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load legal pages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleSave = async () => {
    if (!editingPage) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPage),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      toast({
        title: 'Success',
        description: 'Legal page saved successfully',
      });

      setEditingPage(null);
      fetchPages();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (page?: LegalPage) => {
    if (page) {
      setEditingPage({
        slug: page.slug,
        title: page.title,
        content: page.content,
        isPublished: page.isPublished,
      });
    } else {
      setEditingPage({
        slug: '',
        title: '',
        content: '',
        isPublished: true,
      });
    }
  };

  const startEditingDefault = (defaultPage: { slug: string; title: string }) => {
    const existing = pages.find(p => p.slug === defaultPage.slug);
    if (existing) {
      startEditing(existing);
    } else {
      setEditingPage({
        slug: defaultPage.slug,
        title: defaultPage.title,
        content: getDefaultContent(defaultPage.slug),
        isPublished: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Pages</h1>
          <p className="text-muted-foreground">
            Manage Terms of Service, Privacy Policy, and other legal documents
          </p>
        </div>
        
        <Button onClick={() => startEditing()}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Default Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Required Pages</CardTitle>
          <CardDescription>
            These pages are typically required for compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {defaultPages.map((defaultPage) => {
            const existing = pages.find(p => p.slug === defaultPage.slug);
            return (
              <div
                key={defaultPage.slug}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{defaultPage.title}</div>
                    <div className="text-sm text-muted-foreground">
                      /legal/{defaultPage.slug}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {existing ? (
                    <>
                      <Badge className={existing.isPublished ? 'bg-green-500' : ''}>
                        {existing.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      <a
                        href={`/legal/${defaultPage.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </>
                  ) : (
                    <Badge variant="secondary">Not Created</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditingDefault(defaultPage)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {existing ? 'Edit' : 'Create'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* All Pages */}
      <Card>
        <CardHeader>
          <CardTitle>All Legal Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No legal pages created yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{page.title}</div>
                    <div className="text-sm text-muted-foreground">
                      /legal/{page.slug} • Version {page.version} • Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={page.isPublished ? 'bg-green-500' : ''}>
                      {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <a
                      href={`/legal/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(page)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage?.slug ? `Edit ${editingPage.title}` : 'Create Legal Page'}
            </DialogTitle>
            <DialogDescription>
              Use Markdown syntax for formatting
            </DialogDescription>
          </DialogHeader>
          
          {editingPage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={editingPage.slug}
                    onChange={(e) => setEditingPage(prev => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : null)}
                    placeholder="privacy-policy"
                    disabled={pages.some(p => p.slug === editingPage.slug)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Privacy Policy"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <textarea
                  id="content"
                  value={editingPage.content}
                  onChange={(e) => setEditingPage(prev => prev ? { ...prev, content: e.target.value } : null)}
                  className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder="# Privacy Policy

This privacy policy describes..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={editingPage.isPublished}
                  onChange={(e) => setEditingPage(prev => prev ? { ...prev, isPublished: e.target.checked } : null)}
                  className="rounded"
                />
                <Label htmlFor="isPublished" className="cursor-pointer">
                  Publish immediately
                </Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPage(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDefaultContent(slug: string): string {
  if (slug === 'terms') {
    return `# Terms of Service

**Last Updated: ${new Date().toLocaleDateString()}**

## 1. Acceptance of Terms

By accessing and using GitGenius ("the Service"), you agree to be bound by these Terms of Service.

## 2. Description of Service

GitGenius is a GitHub automation platform that helps you maintain your contribution streak and manage multiple GitHub accounts.

## 3. User Accounts

- You must be 18 years or older to use this Service
- You are responsible for maintaining the security of your account
- You must provide accurate information when creating an account

## 4. Acceptable Use

You agree not to:
- Violate any laws or regulations
- Abuse or exploit the Service
- Interfere with other users' access to the Service
- Use the Service for any illegal or unauthorized purpose

## 5. GitHub Integration

- You authorize us to access your GitHub account as necessary to provide the Service
- You remain responsible for your GitHub account activity
- We do not store your GitHub password

## 6. Limitation of Liability

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

## 7. Changes to Terms

We reserve the right to modify these terms at any time.

## 8. Contact

For questions about these Terms, contact us at admin@gitgenius.app`;
  }
  
  if (slug === 'privacy') {
    return `# Privacy Policy

**Last Updated: ${new Date().toLocaleDateString()}**

## 1. Information We Collect

### Personal Information
- Email address
- Name
- Profile picture

### GitHub Data
- GitHub username
- Repository information
- Contribution history

### Location Data
- Geographic location (with your consent)
- Timezone

### Usage Data
- IP address
- Browser type
- Access times

## 2. How We Use Your Information

- To provide and maintain the Service
- To personalize your experience
- To improve our Service
- To send notifications

## 3. Data Storage

Your data is securely stored on our servers. GitHub OAuth tokens are encrypted.

## 4. Data Sharing

We do not sell your personal information. We may share data with:
- Service providers who assist in operations
- Law enforcement when required by law

## 5. Your Rights

You have the right to:
- Access your data
- Correct inaccurate data
- Delete your account and data
- Export your data

## 6. Cookies

We use cookies to maintain session state and improve your experience.

## 7. Security

We implement industry-standard security measures to protect your data.

## 8. Children's Privacy

The Service is not intended for users under 18 years of age.

## 9. Changes to Privacy Policy

We will notify you of any changes by posting the new Privacy Policy on this page.

## 10. Contact

For questions about this Privacy Policy, contact us at privacy@gitgenius.app`;
  }
  
  return '';
}
