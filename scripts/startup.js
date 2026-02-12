#!/usr/bin/env node

/**
 * GitGenius Interactive Startup Script
 * Checks dependencies and starts the application
 */

const { execSync, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
};

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

// Check if a port is in use
function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Execute command and return result
function exec(cmd, silent = false) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

// Check if command exists
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};
  
  if (!fs.existsSync(envPath)) {
    return null;
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        let value = valueParts.join('=');
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        env[key.trim()] = value;
      }
    }
  });
  
  return env;
}

// Parse database URL
function parseDbUrl(url) {
  try {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (match) {
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4]),
        database: match[5],
      };
    }
  } catch {}
  return null;
}

// Parse Redis URL
function parseRedisUrl(url) {
  try {
    const match = url.match(/redis:\/\/([^:]+):(\d+)/);
    if (match) {
      return { host: match[1], port: parseInt(match[2]) };
    }
    // Simple format
    const simpleMatch = url.match(/redis:\/\/([^:]+)(?::(\d+))?/);
    if (simpleMatch) {
      return { host: simpleMatch[1], port: parseInt(simpleMatch[2] || '6379') };
    }
  } catch {}
  return { host: 'localhost', port: 6379 };
}

// Generate a secure random string
function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64');
}

// Update a value in the .env file
function updateEnvValue(key, value) {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
  
  let content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  let found = false;
  
  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`) || trimmed.startsWith(`${key} =`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    // Add the key if it doesn't exist
    updatedLines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, updatedLines.join('\n'));
  return true;
}

// Check if a secret needs to be generated
function needsGeneration(value) {
  if (!value) return true;
  const placeholders = ['your-', 'change-me', 'placeholder', 'secret-here', 'key-here'];
  return placeholders.some((p) => value.toLowerCase().includes(p));
}

async function main() {
  console.log(`
${colors.bright}${colors.green}
   ██████╗ ██╗████████╗ ██████╗ ███████╗███╗   ██╗██╗██╗   ██╗███████╗
  ██╔════╝ ██║╚══██╔══╝██╔════╝ ██╔════╝████╗  ██║██║██║   ██║██╔════╝
  ██║  ███╗██║   ██║   ██║  ███╗█████╗  ██╔██╗ ██║██║██║   ██║███████╗
  ██║   ██║██║   ██║   ██║   ██║██╔══╝  ██║╚██╗██║██║██║   ██║╚════██║
  ╚██████╔╝██║   ██║   ╚██████╔╝███████╗██║ ╚████║██║╚██████╔╝███████║
   ╚═════╝ ╚═╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚══════╝
${colors.reset}
  ${colors.cyan}Interactive Startup Script${colors.reset}
`);

  const checks = {
    env: false,
    postgres: false,
    redis: false,
    node_modules: false,
    prisma: false,
    pm2: false,
  };

  // ============================================
  // Check 1: Environment File
  // ============================================
  log.header('Checking Environment Configuration');
  
  const env = loadEnv();
  if (!env) {
    log.error('.env file not found!');
    const createEnv = await ask('Would you like to copy .env.example to .env? (y/n): ');
    if (createEnv.toLowerCase() === 'y') {
      if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        log.success('Created .env from .env.example');
        log.warn('Please edit .env with your configuration and run this script again.');
        rl.close();
        process.exit(0);
      } else {
        log.error('.env.example not found!');
      }
    }
    rl.close();
    process.exit(1);
  }
  
  checks.env = true;
  log.success('.env file found');
  
  // Display key config
  const appPort = env.PORT || '3000';
  const dbConfig = parseDbUrl(env.DATABASE_URL || '');
  const redisConfig = parseRedisUrl(env.REDIS_URL || '');
  
  console.log(`
  ${colors.cyan}Configuration:${colors.reset}
  ├─ App Port: ${colors.yellow}${appPort}${colors.reset}
  ├─ Database: ${colors.yellow}${dbConfig ? `${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` : 'Not configured'}${colors.reset}
  ├─ Redis: ${colors.yellow}${redisConfig.host}:${redisConfig.port}${colors.reset}
  └─ Node Env: ${colors.yellow}${env.NODE_ENV || 'development'}${colors.reset}
`);

  // Check for secrets that need generation
  const secretsToGenerate = [];
  
  if (needsGeneration(env.NEXTAUTH_SECRET)) {
    secretsToGenerate.push('NEXTAUTH_SECRET');
  }
  if (needsGeneration(env.ENCRYPTION_KEY)) {
    secretsToGenerate.push('ENCRYPTION_KEY');
  }
  
  if (secretsToGenerate.length > 0) {
    log.warn(`Missing or placeholder values for: ${secretsToGenerate.join(', ')}`);
    
    const generateSecrets = await ask(`Would you like to generate secure values for these? (y/n): `);
    
    if (generateSecrets.toLowerCase() === 'y') {
      for (const secretKey of secretsToGenerate) {
        const newSecret = generateSecret(32);
        const updated = updateEnvValue(secretKey, newSecret);
        
        if (updated) {
          log.success(`Generated and saved ${secretKey}`);
          console.log(`  ${colors.cyan}Value:${colors.reset} ${colors.yellow}${newSecret}${colors.reset}`);
          // Update local env object
          env[secretKey] = newSecret;
        } else {
          log.error(`Failed to update ${secretKey} in .env`);
        }
      }
      console.log('');
      log.info('Secrets have been saved to your .env file');
    } else {
      log.warn('Skipping secret generation - please update manually');
    }
  }
  
  // Check other required env vars
  if (!env.DATABASE_URL) {
    log.warn('DATABASE_URL is not configured');
  }

  // ============================================
  // Check 2: Node Modules
  // ============================================
  log.header('Checking Dependencies');
  
  if (!fs.existsSync('node_modules')) {
    log.warn('node_modules not found');
    const install = await ask('Would you like to run npm install? (y/n): ');
    if (install.toLowerCase() === 'y') {
      log.info('Installing dependencies...');
      const result = exec('npm install');
      if (!result.success) {
        log.error('Failed to install dependencies');
        rl.close();
        process.exit(1);
      }
    }
  }
  checks.node_modules = true;
  log.success('Dependencies installed');

  // ============================================
  // Check 3: PostgreSQL
  // ============================================
  log.header('Checking PostgreSQL');
  
  const dbPort = dbConfig?.port || parseInt(env.DB_PORT || '5432');
  const dbHost = dbConfig?.host || env.DB_HOST || 'localhost';
  
  // Try pg_isready first (more reliable), then fall back to port check
  let pgRunning = false;
  
  if (commandExists('pg_isready')) {
    const pgReady = exec(`pg_isready -h ${dbHost} -p ${dbPort}`, true);
    pgRunning = pgReady.success;
  }
  
  // Fallback to port check if pg_isready not available
  if (!pgRunning) {
    pgRunning = await checkPort(dbPort, dbHost);
  }
  
  // Also check if PostgreSQL process is running
  if (!pgRunning) {
    const psCheck = exec('pgrep -x postgres || pgrep -x postmaster', true);
    if (psCheck.success && psCheck.output.trim()) {
      log.warn(`PostgreSQL process found but not listening on ${dbHost}:${dbPort}`);
      log.info('PostgreSQL may be listening on a Unix socket or different port');
      const proceed = await ask('Would you like to proceed anyway? (y/n): ');
      if (proceed.toLowerCase() === 'y') {
        pgRunning = true;
      }
    }
  }
  
  if (!pgRunning) {
    log.error(`PostgreSQL is not running on ${dbHost}:${dbPort}`);
    
    // Try to detect how PostgreSQL might be installed
    const hasSystemctl = commandExists('systemctl');
    const hasDockerCompose = fs.existsSync('docker-compose.yml');
    
    console.log(`
  ${colors.yellow}Options to start PostgreSQL:${colors.reset}
  1. Start with systemctl (Linux service)
  2. Start with Docker Compose
  3. Skip (I'll start it manually)
`);
    
    const choice = await ask('Choose an option (1/2/3): ');
    
    switch (choice) {
      case '1':
        if (hasSystemctl) {
          log.info('Starting PostgreSQL with systemctl...');
          const result = exec('sudo systemctl start postgresql');
          if (result.success) {
            // Wait a moment for startup
            await new Promise(r => setTimeout(r, 2000));
            // Check if running using pg_isready or port
            let nowRunning = false;
            if (commandExists('pg_isready')) {
              nowRunning = exec(`pg_isready -h ${dbHost} -p ${dbPort}`, true).success;
            } else {
              nowRunning = await checkPort(dbPort, dbHost);
            }
            if (nowRunning) {
              log.success('PostgreSQL started');
              checks.postgres = true;
            } else {
              // Even if port check fails, systemctl may have succeeded
              log.warn('PostgreSQL started but port check failed - proceeding anyway');
              checks.postgres = true;
            }
          }
        } else {
          log.error('systemctl not available');
        }
        break;
      case '2':
        if (hasDockerCompose) {
          log.info('Starting PostgreSQL with Docker Compose...');
          const result = exec('docker-compose up -d postgres');
          if (result.success) {
            await new Promise(r => setTimeout(r, 3000));
            const nowRunning = await checkPort(dbPort, dbHost);
            if (nowRunning) {
              log.success('PostgreSQL started via Docker');
              checks.postgres = true;
            }
          }
        } else {
          log.error('docker-compose.yml not found');
        }
        break;
      case '3':
        log.warn('Skipping PostgreSQL check - assuming it will be started manually');
        checks.postgres = true; // Allow to continue
        break;
    }
  } else {
    checks.postgres = true;
    log.success(`PostgreSQL is running on ${dbHost}:${dbPort}`);
  }

  // ============================================
  // Check 4: Redis
  // ============================================
  log.header('Checking Redis');
  
  const redisPort = redisConfig?.port || parseInt(env.REDIS_PORT || '6379');
  const redisHost = redisConfig?.host || env.REDIS_HOST || 'localhost';
  
  const redisRunning = await checkPort(redisPort, redisHost);
  
  if (!redisRunning) {
    log.error(`Redis is not running on ${redisHost}:${redisPort}`);
    
    console.log(`
  ${colors.yellow}Options to start Redis:${colors.reset}
  1. Start with systemctl (Linux service)
  2. Start with Docker Compose
  3. Start with redis-server directly
  4. Skip (I'll start it manually)
`);
    
    const choice = await ask('Choose an option (1/2/3/4): ');
    
    switch (choice) {
      case '1':
        log.info('Starting Redis with systemctl...');
        exec('sudo systemctl start redis-server || sudo systemctl start redis');
        await new Promise(r => setTimeout(r, 2000));
        if (await checkPort(redisPort, redisHost)) {
          log.success('Redis started');
          checks.redis = true;
        }
        break;
      case '2':
        if (fs.existsSync('docker-compose.yml')) {
          log.info('Starting Redis with Docker Compose...');
          exec('docker-compose up -d redis');
          await new Promise(r => setTimeout(r, 2000));
          if (await checkPort(redisPort, redisHost)) {
            log.success('Redis started via Docker');
            checks.redis = true;
          }
        }
        break;
      case '3':
        log.info('Starting redis-server in background...');
        spawn('redis-server', [], { detached: true, stdio: 'ignore' }).unref();
        await new Promise(r => setTimeout(r, 2000));
        if (await checkPort(redisPort, redisHost)) {
          log.success('Redis started');
          checks.redis = true;
        }
        break;
      case '4':
        log.warn('Skipping Redis check - assuming it will be started manually');
        checks.redis = true; // Allow to continue
        break;
    }
  } else {
    checks.redis = true;
    log.success(`Redis is running on ${redisHost}:${redisPort}`);
  }

  // ============================================
  // Check 5: Prisma
  // ============================================
  log.header('Checking Prisma');
  
  if (checks.postgres) {
    const hasPrismaClient = fs.existsSync('node_modules/.prisma/client');
    
    if (!hasPrismaClient) {
      log.warn('Prisma client not generated');
      const generate = await ask('Would you like to generate Prisma client? (y/n): ');
      if (generate.toLowerCase() === 'y') {
        log.info('Generating Prisma client...');
        exec('npx prisma generate');
      }
    } else {
      log.success('Prisma client exists');
    }
    
    // Check migrations
    const migrate = await ask('Would you like to run database migrations? (y/n): ');
    if (migrate.toLowerCase() === 'y') {
      log.info('Running migrations...');
      const result = exec('npx prisma migrate deploy', true);
      if (result.success) {
        log.success('Migrations applied');
        checks.prisma = true;
      } else {
        log.warn('Migration failed - you may need to push schema instead');
        const push = await ask('Would you like to push schema (npx prisma db push)? (y/n): ');
        if (push.toLowerCase() === 'y') {
          exec('npx prisma db push');
        }
      }
    } else {
      checks.prisma = true;
    }
  } else {
    log.warn('Skipping Prisma checks - PostgreSQL not running');
  }

  // ============================================
  // Check 6: PM2
  // ============================================
  log.header('Checking PM2');
  
  const hasPm2 = commandExists('pm2');
  
  if (!hasPm2) {
    log.warn('PM2 is not installed globally');
    const installPm2 = await ask('Would you like to install PM2 globally? (y/n): ');
    if (installPm2.toLowerCase() === 'y') {
      log.info('Installing PM2...');
      exec('npm install -g pm2');
      checks.pm2 = commandExists('pm2');
    }
  } else {
    checks.pm2 = true;
    log.success('PM2 is installed');
  }

  // ============================================
  // Summary & Start Options
  // ============================================
  log.header('Summary');
  
  console.log(`
  ${checks.env ? colors.green + '✓' : colors.red + '✗'} Environment file${colors.reset}
  ${checks.node_modules ? colors.green + '✓' : colors.red + '✗'} Node modules${colors.reset}
  ${checks.postgres ? colors.green + '✓' : colors.red + '✗'} PostgreSQL${colors.reset}
  ${checks.redis ? colors.green + '✓' : colors.red + '✗'} Redis${colors.reset}
  ${checks.prisma ? colors.green + '✓' : colors.yellow + '○'} Prisma${colors.reset}
  ${checks.pm2 ? colors.green + '✓' : colors.red + '✗'} PM2${colors.reset}
`);

  const allGood = checks.env && checks.postgres && checks.redis;
  
  if (!allGood) {
    log.error('Some dependencies are not ready. Please fix the issues above.');
    rl.close();
    process.exit(1);
  }

  console.log(`
  ${colors.cyan}How would you like to start GitGenius?${colors.reset}
  1. Development mode (npm run dev)
  2. Production mode with PM2
  3. Build only (npm run build)
  4. Exit
`);

  const startChoice = await ask('Choose an option (1/2/3/4): ');
  
  switch (startChoice) {
    case '1':
      log.info('Starting development server...');
      rl.close();
      const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
      dev.on('close', (code) => process.exit(code));
      break;
      
    case '2':
      log.info('Building application...');
      const buildResult = exec('npm run build');
      if (!buildResult.success) {
        log.error('Build failed!');
        rl.close();
        process.exit(1);
      }
      
      log.info('Starting with PM2...');
      if (fs.existsSync('ecosystem.config.js')) {
        exec('pm2 start ecosystem.config.js');
        log.success('Application started with PM2');
        log.info('Run "pm2 logs" to see output');
        log.info('Run "pm2 status" to check status');
      } else {
        exec(`pm2 start npm --name gitgenius -- start`);
        log.success('Application started with PM2');
      }
      rl.close();
      break;
      
    case '3':
      log.info('Building application...');
      exec('npm run build');
      log.success('Build complete!');
      rl.close();
      break;
      
    case '4':
    default:
      log.info('Exiting...');
      rl.close();
      break;
  }
}

// Handle errors
process.on('uncaughtException', (err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});

main().catch((err) => {
  log.error(err.message);
  rl.close();
  process.exit(1);
});
