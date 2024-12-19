import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { QueuesService } from './queues.service';
import { RedisService } from 'src/redis/redis.service';

@Controller('queues')
export class QueuesController {
  // constructor(
  //   private readonly queuesService: QueuesService,
  //   private readonly producerService: RedisService,
  // ) {}
  // @Post('add')
  // async addToQueue(
  //   @Body('queueName') queueName: string,
  //   @Body('data') data: any,
  // ): Promise<string> {
  //   console.log(data, queueName);
  //   await this.producerService.addToQueue(queueName, data);
  //   return `Added to queue ${queueName}`;
  // }
}
