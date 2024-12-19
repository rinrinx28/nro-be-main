import { forwardRef, Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { RedisConsumerService } from './redis-consumer.service';
import { MiniGameModule } from 'src/mini-game/mini-game.module';

@Global()
@Module({})
// @Module({
//   imports: [MiniGameModule],
//   providers: [
//     {
//       provide: 'REDIS',
//       useFactory: () => {
//         return new Redis({
//           host: '154.26.133.248',
//           port: 6379,
//           // password: process.env.REDIS_PWD,
//         });
//       },
//     },
//     RedisService,
//     RedisConsumerService,
//   ],
//   exports: ['REDIS', RedisService, RedisConsumerService],
// })
export class RedisModule {}
