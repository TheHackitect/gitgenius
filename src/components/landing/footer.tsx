import Link from 'next/link';
import { Github, Twitter, Mail, Instagram, Linkedin, Youtube, Send } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.09.682-.218.682-.485 0-.236-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .269.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </div>
              <span className="font-bold text-xl">GitGenius</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Keep your GitHub contributions alive with intelligent automation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-white transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Developer</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="https://github.com/thehackitect" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Github className="w-4 h-4" /> @thehackitect
                </a>
              </li>
              <li>
                <a href="https://instagram.com/thehackitect.me" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> @thehackitect.me
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/in/thehackitect" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Linkedin className="w-4 h-4" /> thehackitect
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">More Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="https://twitter.com/thehackitect" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Twitter className="w-4 h-4" /> @thehackitect
                </a>
              </li>
              <li>
                <a href="https://t.me/thehackitect" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Send className="w-4 h-4" /> @thehackitect
                </a>
              </li>
              <li>
                <a href="https://youtube.com/@thehackitect" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                  <Youtube className="w-4 h-4" /> @thehackitect
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
          <div className="text-sm text-gray-400 text-center md:text-left">
            <p>© {new Date().getFullYear()} GitGenius. All rights reserved.</p>
            <p className="mt-1">Built with 💚 by <a href="https://github.com/thehackitect" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">The Hackitect</a></p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="https://github.com/thehackitect" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://instagram.com/thehackitect.me" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com/in/thehackitect" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://twitter.com/thehackitect" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-sky-400 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://t.me/thehackitect" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-300 transition-colors">
              <Send className="w-5 h-5" />
            </a>
            <a href="https://youtube.com/@thehackitect" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors">
              <Youtube className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
