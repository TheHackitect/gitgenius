import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const pages = await prisma.legalPage.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  
  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: LegalPageProps) {
  const { slug } = await params;
  
  const page = await prisma.legalPage.findUnique({
    where: { slug, isPublished: true },
    select: { title: true },
  });

  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: `${page.title} - GitGenius`,
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  
  const page = await prisma.legalPage.findUnique({
    where: { slug, isPublished: true },
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: {page.updatedAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {page.version > 1 && ` (Version ${page.version})`}
          </div>

          {/* Render markdown content */}
          <div 
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
          />
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GitGenius. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Simple markdown renderer (basic implementation)
function renderMarkdown(content: string): string {
  let html = content;
  
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
  
  // Lists
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-6 my-4">$&</ul>');
  
  // Numbered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="my-4">');
  html = '<p class="my-4">' + html + '</p>';
  
  // Fix empty paragraphs
  html = html.replace(/<p class="my-4"><\/p>/g, '');
  
  return html;
}
