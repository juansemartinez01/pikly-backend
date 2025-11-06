import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { RequestIdMiddleware } from './common/request-id.middleware';
import pinoHttp from 'pino-http'; // 👈 usa pino directo

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Request-id primero
  app.use(new RequestIdMiddleware().use);

  // Logger HTTP con pino (SIN clase)
  app.use(
    pinoHttp({
      autoLogging: true,
      genReqId: (req) => req.id, // usa el request-id que pusimos antes
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { singleLine: true, colorize: true },
            }
          : undefined,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      customProps: (req) => ({ reqId: req.id }),
    }),
  );

  app.use(helmet());
  app.use(compression());

  const origins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Admin-Token',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/v1`);
}
bootstrap();
