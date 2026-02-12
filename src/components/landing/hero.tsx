'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Github, Zap, Shield, BarChart3 } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent" />
      
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Smart GitHub Automation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Keep Your{' '}
            <span className="gradient-text">GitHub Green</span>
            <br />
            Every Single Day
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Automate your GitHub contributions with intelligent scheduling. 
            Manage multiple accounts, track analytics, and maintain your 
            coding streak effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" variant="gradient" className="group">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
                <Github className="mr-2 w-4 h-4" />
                Sign in with GitHub
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Secure OAuth</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span>Smart Scheduling</span>
            </div>
          </div>
        </motion.div>

        {/* Contribution grid preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-20"
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="p-8 rounded-xl bg-gray-900/50 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" />
                <div>
                  <div className="font-semibold">Your GitHub Profile</div>
                  <div className="text-sm text-gray-400">Contributions in the last year</div>
                </div>
              </div>
              
              {/* Simulated contribution grid */}
              <div className="overflow-x-auto">
                <div className="github-contribution-grid" style={{ minWidth: '700px' }}>
                  {Array.from({ length: 364 }).map((_, i) => {
                    const level = Math.floor(Math.random() * 5);
                    return (
                      <div
                        key={i}
                        className={`contribution-cell contribution-level-${level}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                <span>Learn how we count contributions</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-sm contribution-level-${level}`}
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
