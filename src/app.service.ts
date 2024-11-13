import { Injectable } from '@nestjs/common';
import moment from 'moment';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Welcome to NRO api',
      author: 'rin',
      timestamp: moment().unix(),
    };
  }
}
