// GitGenius Automation Worker
// Run separately: npm run worker

import { createAutomationWorker, scheduleAutomationJobs } from '../lib/queue';
import * as cron from 'node-cron';

console.log('🚀 Starting GitGenius Automation Worker...');

// Create the worker
const worker = createAutomationWorker();

// Handle worker events
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Schedule jobs daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('📅 Scheduling daily automation jobs...');
  try {
    await scheduleAutomationJobs();
    console.log('✅ Daily jobs scheduled successfully');
  } catch (error) {
    console.error('❌ Failed to schedule daily jobs:', error);
  }
});

// Schedule jobs every 15 minutes to catch any missed ones
cron.schedule('*/15 * * * *', async () => {
  console.log('🔄 Running automation check...');
  try {
    await scheduleAutomationJobs();
  } catch (error) {
    console.error('❌ Automation check failed:', error);
  }
});

// Initial job scheduling
(async () => {
  try {
    await scheduleAutomationJobs();
    console.log('✅ Initial automation jobs scheduled');
  } catch (error) {
    console.error('❌ Failed initial job scheduling:', error);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down worker...');
  await worker.close();
  process.exit(0);
});

console.log('✨ Worker is running and waiting for jobs...');
