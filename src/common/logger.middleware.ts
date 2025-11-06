import { Injectable, NestMiddleware } from '@nestjs/common';
import pinoHttp from 'pino-http';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = pinoHttp({
    autoLogging: true,
    genReqId: (req) => req.id,
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true },
          }
        : undefined,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    customProps: (req, res) => ({ reqId: req.id }),
  });

  use(req: any, res: any, next: () => void) {
    this.logger(req, res);
    next();
  }
}
