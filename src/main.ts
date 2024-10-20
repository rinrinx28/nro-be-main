import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/allExceptions.filter';

async function bootstrap() {
  const port = 3037;
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3035',
      'http://localhost:3036',
      'https://beta.nrogame.me',
    ],
  });
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  // Apply the global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(port);
}
bootstrap();
