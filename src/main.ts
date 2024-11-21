import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/allExceptions.filter';
import { RedisConsumerService } from './redis/redis-consumer.service';

async function bootstrap() {
  const port = 3037;
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3035',
      'http://localhost:3036',
      'http://154.26.133.248:3000',
      'https://beta.nrogame.me',
      'https://www.nrogame.me',
      'https://nrogame.me',
      'http://www.nrogame.me',
      'http://nrogame.me',
    ],
  });
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  // Apply the global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Bắt đầu consumer xử lý hàng đợi
  const redisConsumer = app.get(RedisConsumerService);
  // Danh sách hàng chờ
  const queues = [
    'cancelPlaceBetQueue',
    'processOrderQueue',
    'sendNotificationQueue',
  ];

  // Khởi động xử lý nhiều hàng chờ
  await redisConsumer.processAllQueues(queues);
  await app.listen(port);
}
bootstrap();
