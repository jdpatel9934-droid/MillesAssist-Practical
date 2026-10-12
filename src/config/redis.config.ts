import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS || '60', 10),
  enabled: process.env.REDIS_ENABLED !== 'false',
  keyPrefix: 'admin_hub:',
}));
