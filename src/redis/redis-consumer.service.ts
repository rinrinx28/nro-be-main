// src/redis/redis-consumer.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MiniGameService } from 'src/mini-game/mini-game.service';

@Injectable()
export class RedisConsumerService {
  // constructor(
  //   @Inject('REDIS') private readonly redisClient: Redis,
  //   private readonly minigameService: MiniGameService,
  // ) {}
  // async processQueue(queueName: string): Promise<void> {
  //   while (true) {
  //     try {
  //       const response = await this.redisClient.brpop(queueName, 0); // Blocking pop
  //       if (response) {
  //         const [, rawData] = response;
  //         const data = JSON.parse(rawData);
  //         console.log(`Processing from queue ${queueName}:`, data);
  //         // Phân loại xử lý dựa trên hàng chờ
  //         switch (queueName) {
  //           case 'cancelPlaceBetQueue':
  //             await this.minigameService.cancelPlaceBet(data);
  //             break;
  //           case 'processOrderQueue':
  //             console.log('Processing order:', data);
  //             break;
  //           case 'sendNotificationQueue':
  //             console.log('Sending notification:', data);
  //             break;
  //           default:
  //             console.warn(`Unknown queue: ${queueName}`);
  //         }
  //       }
  //     } catch (err) {
  //       console.error(`Error processing queue ${queueName}:`, err);
  //     }
  //   }
  // }
  // // Hàm khởi động tất cả hàng chờ
  // async processAllQueues(queueNames: string[]): Promise<void> {
  //   queueNames.forEach((queueName) => {
  //     this.processQueue(queueName); // Xử lý từng hàng chờ
  //   });
  // }
}
