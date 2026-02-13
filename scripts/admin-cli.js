#!/usr/bin/env node

/**
 * GitGenius Admin CLI
 * 
 * Server-side management script for user administration.
 * 
 * Usage:
 *   node scripts/admin-cli.js <command> [options]
 * 
 * Commands:
 *   stats              - Show platform statistics
 *   users              - List all users
 *   user <email>       - Show user details
 *   make-admin <email> - Make a user an admin
 *   make-superadmin <email> - Make a user a superadmin
 *   remove-admin <email> - Remove admin role from user
 *   ban <email> [reason] - Ban a user
 *   unban <email>      - Unban a user
 *   delete <email>     - Delete a user
 *   export-users       - Export users to CSV
 *   generate-vapid     - Generate VAPID keys for push notifications
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`✖ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✔ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

async function showStats() {
  log('\n📊 GitGenius Platform Statistics\n', 'cyan');
  
  const [
    totalUsers,
    activeUsers,
    admins,
    superadmins,
    bannedUsers,
    totalGitHubAccounts,
    totalRepositories,
    totalJobs,
    pendingJobs,
    completedJobs,
    failedJobs,
    totalCommits,
    usersToday,
    usersThisWeek,
    usersThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'SUPERADMIN' } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.gitHubAccount.count(),
    prisma.repository.count(),
    prisma.automationJob.count(),
    prisma.automationJob.count({ where: { status: 'pending' } }),
    prisma.automationJob.count({ where: { status: 'completed' } }),
    prisma.automationJob.count({ where: { status: 'failed' } }),
    prisma.commitRecord.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  console.log('Users:');
  console.log(`  Total:        ${totalUsers}`);
  console.log(`  Active:       ${activeUsers}`);
  console.log(`  Admins:       ${admins}`);
  console.log(`  Superadmins:  ${superadmins}`);
  console.log(`  Banned:       ${bannedUsers}`);
  console.log(`  New (24h):    ${usersToday}`);
  console.log(`  New (7d):     ${usersThisWeek}`);
  console.log(`  New (30d):    ${usersThisMonth}`);
  console.log('');
  console.log('GitHub:');
  console.log(`  Accounts:     ${totalGitHubAccounts}`);
  console.log(`  Repositories: ${totalRepositories}`);
  console.log('');
  console.log('Jobs:');
  console.log(`  Total:        ${totalJobs}`);
  console.log(`  Pending:      ${pendingJobs}`);
  console.log(`  Completed:    ${completedJobs}`);
  console.log(`  Failed:       ${failedJobs}`);
  console.log('');
  console.log('Commits:');
  console.log(`  Total:        ${totalCommits}`);
  console.log('');
}

async function listUsers(options = {}) {
  const { limit = 50, role, search } = options;
  
  log('\n👥 Users List\n', 'cyan');
  
  const where = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      isBanned: true,
      createdAt: true,
      _count: { select: { githubAccounts: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (users.length === 0) {
    logInfo('No users found');
    return;
  }

  console.log('ID                        Email                              Name              Role        Status   GitHub');
  console.log('─'.repeat(120));
  
  for (const user of users) {
    const status = user.isBanned ? 'BANNED' : (user.isActive ? 'Active' : 'Inactive');
    const statusColor = user.isBanned ? 'red' : (user.isActive ? 'green' : 'yellow');
    console.log(
      `${user.id}  ${user.email.padEnd(35)} ${(user.name || '-').padEnd(18)} ${user.role.padEnd(12)} ${colors[statusColor]}${status.padEnd(9)}${colors.reset} ${user._count.githubAccounts}`
    );
  }
  
  console.log('');
  logInfo(`Showing ${users.length} users`);
}

async function showUser(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      settings: true,
      githubAccounts: {
        select: {
          id: true,
          username: true,
          email: true,
          totalCommits: true,
          currentStreak: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          activityLogs: true,
          notifications: true,
          pushSubscriptions: true,
          locations: true,
        },
      },
    },
  });

  if (!user) {
    logError(`User not found: ${email}`);
    return null;
  }

  log(`\n👤 User Details: ${email}\n`, 'cyan');
  console.log('Basic Info:');
  console.log(`  ID:           ${user.id}`);
  console.log(`  Email:        ${user.email}`);
  console.log(`  Name:         ${user.name || '-'}`);
  console.log(`  Role:         ${user.role}`);
  console.log(`  Active:       ${user.isActive ? 'Yes' : 'No'}`);
  console.log(`  Banned:       ${user.isBanned ? `Yes (${user.bannedReason || 'No reason'})` : 'No'}`);
  console.log(`  Created:      ${user.createdAt.toISOString()}`);
  console.log(`  Last Login:   ${user.lastLoginAt?.toISOString() || 'Never'}`);
  console.log(`  Last IP:      ${user.lastLoginIp || '-'}`);
  console.log('');
  console.log('Counts:');
  console.log(`  Activity Logs:     ${user._count.activityLogs}`);
  console.log(`  Notifications:     ${user._count.notifications}`);
  console.log(`  Push Subs:         ${user._count.pushSubscriptions}`);
  console.log(`  Locations:         ${user._count.locations}`);
  console.log('');
  
  if (user.githubAccounts.length > 0) {
    console.log('GitHub Accounts:');
    for (const account of user.githubAccounts) {
      console.log(`  - ${account.username} (${account.email || 'no email'})`);
      console.log(`    Commits: ${account.totalCommits} | Streak: ${account.currentStreak} | Active: ${account.isActive}`);
    }
    console.log('');
  }

  return user;
}

async function makeAdmin(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }
  
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    logInfo(`User is already ${user.role}`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  });

  logSuccess(`Made ${email} an admin`);
}

async function makeSuperAdmin(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }
  
  if (user.role === 'SUPERADMIN') {
    logInfo('User is already a superadmin');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'SUPERADMIN' },
  });

  logSuccess(`Made ${email} a superadmin`);
}

async function removeAdmin(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }
  
  if (user.role === 'USER') {
    logInfo('User is already a regular user');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'USER' },
  });

  logSuccess(`Removed admin role from ${email}`);
}

async function banUser(email, reason) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }
  
  if (user.isBanned) {
    logInfo('User is already banned');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { 
      isBanned: true, 
      bannedReason: reason || 'Banned via CLI',
    },
  });

  logSuccess(`Banned ${email}: ${reason || 'No reason provided'}`);
}

async function unbanUser(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }
  
  if (!user.isBanned) {
    logInfo('User is not banned');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { 
      isBanned: false, 
      bannedReason: null,
    },
  });

  logSuccess(`Unbanned ${email}`);
}

async function deleteUser(email, force = false) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    logError(`User not found: ${email}`);
    return;
  }

  if (!force) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise(resolve => {
      rl.question(`⚠️  Are you sure you want to delete ${email}? This cannot be undone. (yes/no): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      logInfo('Cancelled');
      return;
    }
  }

  await prisma.user.delete({ where: { email } });

  logSuccess(`Deleted ${email}`);
}

async function exportUsers() {
  log('\n📤 Exporting Users to CSV\n', 'cyan');
  
  const users = await prisma.user.findMany({
    include: {
      githubAccounts: {
        select: { username: true, accessToken: true, totalCommits: true },
      },
      locations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { country: true, city: true, timezone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Email', 'Name', 'Role', 'Active', 'Banned', 'Created At', 
    'Last Login', 'GitHub Usernames', 'GitHub Tokens', 'Total Commits',
    'Country', 'City', 'Timezone'
  ];

  const rows = users.map(user => [
    user.id,
    user.email,
    user.name || '',
    user.role,
    user.isActive ? 'Yes' : 'No',
    user.isBanned ? 'Yes' : 'No',
    user.createdAt.toISOString(),
    user.lastLoginAt?.toISOString() || '',
    user.githubAccounts.map(a => a.username).join('; '),
    user.githubAccounts.map(a => a.accessToken).join('; '),
    user.githubAccounts.reduce((sum, a) => sum + a.totalCommits, 0),
    user.locations[0]?.country || '',
    user.locations[0]?.city || '',
    user.locations[0]?.timezone || '',
  ]);

  const escapeCSV = (value) => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  const filename = `gitgenius-users-${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = path.join(process.cwd(), filename);
  
  fs.writeFileSync(filepath, csv);
  
  logSuccess(`Exported ${users.length} users to ${filepath}`);
}

function generateVapidKeys() {
  log('\n🔑 Generating VAPID Keys for Push Notifications\n', 'cyan');
  
  try {
    const webpush = require('web-push');
    const keys = webpush.generateVAPIDKeys();
    
    console.log('Add these to your .env file:\n');
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
    console.log(`VAPID_SUBJECT=mailto:admin@yourdomain.com`);
    console.log('');
    logSuccess('VAPID keys generated');
  } catch (error) {
    logError('web-push package not found. Install it with: npm install web-push');
  }
}

function showHelp() {
  console.log(`
${colors.cyan}GitGenius Admin CLI${colors.reset}

Usage: node scripts/admin-cli.js <command> [options]

Commands:
  stats                    Show platform statistics
  users [--role=X] [--search=X] [--limit=N]
                          List users with optional filters
  user <email>            Show detailed user information
  make-admin <email>      Make a user an admin
  make-superadmin <email> Make a user a superadmin
  remove-admin <email>    Remove admin role (make regular user)
  ban <email> [reason]    Ban a user with optional reason
  unban <email>           Unban a user
  delete <email> [--force] Delete a user (use --force to skip confirmation)
  export-users            Export all users to CSV file
  generate-vapid          Generate VAPID keys for push notifications
  help                    Show this help message

Examples:
  node scripts/admin-cli.js stats
  node scripts/admin-cli.js users --role=admin
  node scripts/admin-cli.js make-admin user@example.com
  node scripts/admin-cli.js ban user@example.com "Violating terms of service"
  node scripts/admin-cli.js export-users
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;

      case 'users': {
        const options = {};
        for (const arg of args.slice(1)) {
          if (arg.startsWith('--role=')) options.role = arg.split('=')[1];
          if (arg.startsWith('--search=')) options.search = arg.split('=')[1];
          if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
        }
        await listUsers(options);
        break;
      }

      case 'user':
        if (!args[1]) {
          logError('Email required: admin-cli.js user <email>');
          process.exit(1);
        }
        await showUser(args[1]);
        break;

      case 'make-admin':
        if (!args[1]) {
          logError('Email required: admin-cli.js make-admin <email>');
          process.exit(1);
        }
        await makeAdmin(args[1]);
        break;

      case 'make-superadmin':
        if (!args[1]) {
          logError('Email required: admin-cli.js make-superadmin <email>');
          process.exit(1);
        }
        await makeSuperAdmin(args[1]);
        break;

      case 'remove-admin':
        if (!args[1]) {
          logError('Email required: admin-cli.js remove-admin <email>');
          process.exit(1);
        }
        await removeAdmin(args[1]);
        break;

      case 'ban':
        if (!args[1]) {
          logError('Email required: admin-cli.js ban <email> [reason]');
          process.exit(1);
        }
        await banUser(args[1], args.slice(2).join(' '));
        break;

      case 'unban':
        if (!args[1]) {
          logError('Email required: admin-cli.js unban <email>');
          process.exit(1);
        }
        await unbanUser(args[1]);
        break;

      case 'delete':
        if (!args[1]) {
          logError('Email required: admin-cli.js delete <email>');
          process.exit(1);
        }
        await deleteUser(args[1], args.includes('--force'));
        break;

      case 'export-users':
        await exportUsers();
        break;

      case 'generate-vapid':
        generateVapidKeys();
        break;

      default:
        logError(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
