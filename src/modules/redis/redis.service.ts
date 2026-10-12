import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly inMemoryFallback = new Map<string, CacheEntry<any>>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const enabled = this.configService.get<boolean>('redis.enabled', true);
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string | undefined>('redis.password');

    if (!enabled) {
      this.logger.log('ℹ️ Redis caching is explicitly disabled in config. Using resilient in-memory cache.');
      return;
    }

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`⚠️ Redis unreachable after ${times} attempts. Degrading gracefully to in-memory fallback.`);
            return null; // Stop retrying and fallback
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Connected to Redis cache service.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Redis connection error: ${err.message}. Operating in resilient fallback mode.`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Could not connect to Redis at ${host}:${port}: ${err.message}. Gracefully using resilient in-memory cache.`);
      });
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Redis initialization exception: ${(error as any).message}. Using in-memory cache.`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `admin_hub:${key}`;

    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(fullKey);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      } catch (err) {
        this.logger.warn(`Redis get error on key ${fullKey}: ${(err as any).message}`);
      }
    }

    // In-memory fallback
    const entry = this.inMemoryFallback.get(fullKey);
    if (entry) {
      if (Date.now() <= entry.expiresAt) {
        return entry.value as T;
      }
      this.inMemoryFallback.delete(fullKey);
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const fullKey = `admin_hub:${key}`;
    const ttl = ttlSeconds ?? this.configService.get<number>('redis.ttlSeconds', 60);

    if (this.isConnected && this.client) {
      try {
        await this.client.set(fullKey, JSON.stringify(value), 'EX', ttl);
        return;
      } catch (err) {
        this.logger.warn(`Redis set error on key ${fullKey}: ${(err as any).message}`);
      }
    }

    // In-memory fallback
    this.inMemoryFallback.set(fullKey, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    const fullKey = `admin_hub:${key}`;

    if (this.isConnected && this.client) {
      try {
        await this.client.del(fullKey);
      } catch (err) {
        this.logger.warn(`Redis del error on key ${fullKey}: ${(err as any).message}`);
      }
    }

    this.inMemoryFallback.delete(fullKey);
  }

  async delByPattern(pattern: string): Promise<void> {
    const fullPattern = `admin_hub:${pattern}`;

    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Redis delByPattern error: ${(err as any).message}`);
      }
    }

    // In-memory cleanup
    for (const key of this.inMemoryFallback.keys()) {
      if (key.startsWith(`admin_hub:${pattern.replace('*', '')}`)) {
        this.inMemoryFallback.delete(key);
      }
    }
  }

  async invalidateDashboard(): Promise<void> {
    await this.delByPattern('dashboard:*');
  }

  async invalidateTransactions(): Promise<void> {
    await this.delByPattern('transactions:*');
    await this.invalidateDashboard();
  }

  async invalidateBookings(): Promise<void> {
    await this.delByPattern('bookings:*');
    await this.invalidateDashboard();
  }

  async invalidateUsers(): Promise<void> {
    await this.delByPattern('users:*');
    await this.invalidateDashboard();
  }

  isHealthy(): { redisConnected: boolean; fallbackActive: boolean; inMemoryEntries: number } {
    return {
      redisConnected: this.isConnected,
      fallbackActive: !this.isConnected,
      inMemoryEntries: this.inMemoryFallback.size,
    };
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore on shutdown
      }
    }
  }
}
