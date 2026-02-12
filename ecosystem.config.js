module.exports = {
  apps: [
    {
      name: 'gitgenius-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p ${PORT:-3000}',
      cwd: process.env.GITGENIUS_DIR || '/opt/gitgenius',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'gitgenius-worker',
      script: 'dist/workers/automation-worker.js',
      cwd: process.env.GITGENIUS_DIR || '/opt/gitgenius',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Cron restart at midnight to ensure fresh state
      cron_restart: '0 0 * * *',
    },
  ],

  // Optional: PM2 deploy configuration
  // Update 'host' and 'repo' with your values
  deploy: {
    production: {
      user: 'gitgenius',
      host: ['YOUR_SERVER_IP'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/gitgenius.git',
      path: '/opt/gitgenius',
      'post-deploy':
        'npm ci && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
