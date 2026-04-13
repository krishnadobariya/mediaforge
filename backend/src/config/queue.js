/**
 * Simple In-Memory Queue Fallback
 */
class MockQueue {
  constructor(name) {
    this.name = name;
    this.processCallback = null;
  }
  
  setProcessor(callback) {
    this.processCallback = callback;
  }

  async add(jobName, data) {
    console.log(`[DEV-QUEUE] Added job '${jobName}' to '${this.name}'`, data);
    
    setTimeout(async () => {
      if (this.processCallback) {
        try {
          await this.processCallback(data);
        } catch (err) {
          console.error('[DEV-QUEUE] Mock processing failed:', err.message);
        }
      } else {
        console.warn('[DEV-QUEUE] No processor set for MockQueue');
      }
    }, 100);

    return { id: `mock-${Date.now()}` };
  }
}

const { Queue } = require('bullmq');
const Redis = require('ioredis');

let mediaQueue;
let connection;

const useMock = process.env.USE_MOCK_REDIS === 'true';

if (useMock) {
  console.warn('⚠️ Starting in DEV-MODE with In-Memory Mock Queue (No Redis required).');
  mediaQueue = new MockQueue('media-processing');
  connection = null;
} else {
  try {
    const redisOptions = process.env.REDIS_URL 
      ? process.env.REDIS_URL 
      : {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          maxRetriesPerRequest: null,
        };
    
    connection = new Redis(redisOptions, {
      maxRetriesPerRequest: null,
    });
    
    connection.on('error', (err) => console.error('Redis Error:', err.message));
    mediaQueue = new Queue('media-processing', { connection });
  } catch (err) {
    console.error('Redis initialization failed, switching to Mock...', err.message);
    mediaQueue = new MockQueue('media-processing');
  }
}

module.exports = { mediaQueue, connection };
