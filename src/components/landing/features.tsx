'use client';

import { motion } from 'framer-motion';
import { 
  Users, 
  GitBranch, 
  Clock, 
  BarChart3, 
  Shield, 
  Zap,
  Settings,
  Bell
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Multi-Account Management',
    description: 'Connect and manage multiple GitHub accounts from a single dashboard. Perfect for work and personal profiles.',
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    description: 'Intelligent commit scheduling with human-like variability. Avoid detection with randomized timing.',
  },
  {
    icon: GitBranch,
    title: 'Repository Automation',
    description: 'Automatically manage repositories, create commits, and push updates without lifting a finger.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track your contribution patterns, streak statistics, and automation performance in real-time.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'End-to-end encryption for your tokens. Your credentials are never stored in plain text.',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Get started in minutes. Connect your GitHub account and let GitGenius handle the rest.',
  },
  {
    icon: Settings,
    title: 'Customizable Rules',
    description: 'Fine-tune commit frequency, preferred hours, message styles, and more to match your preferences.',
  },
  {
    icon: Bell,
    title: 'Notifications & Alerts',
    description: 'Stay informed with email notifications about your automation status and weekly reports.',
  },
];

export function LandingFeatures() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need to{' '}
            <span className="gradient-text">Stay Active</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Powerful features designed to keep your GitHub profile vibrant and your 
            contribution streak unbroken.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-xl bg-gray-900/50 border border-white/5 hover:border-green-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <feature.icon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
