import { ArgumentsHost, Catch, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WebSocketExceptionFilter implements WsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const error = exception.getError();
    const errorMessage =
      typeof error === 'string'
        ? error
        : (error as any)?.message || 'An error occurred';

    // Emit the error message to the client
    client.emit('error', { status: 'error', message: errorMessage });
  }
}
