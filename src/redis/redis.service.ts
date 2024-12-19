import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  // constructor(@Inject('REDIS') private readonly redisClient: Redis) {
  //   this.redisClient.on('connect', () => {
  //     console.log('Connected to Redis');
  //   });
  //   this.redisClient.on('error', (err) => {
  //     console.error('Redis connection error:', err);
  //   });
  // }
  // async addToQueue(queueName: string, data: any): Promise<void> {
  //   await this.redisClient.lpush(queueName, JSON.stringify(data));
  //   console.log(`Added to queue ${queueName}:`, data);
  // }
}
