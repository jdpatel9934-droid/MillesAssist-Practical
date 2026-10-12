import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 4000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Response Compression
  // app.use(compression());

  // Set Global Route Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable graceful process termination
  app.enableShutdownHooks();

  // Swagger / OpenAPI Specification
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AdminHub REST API')
    .setDescription(
      'Production-Grade Backend REST API for AdminHub, built with NestJS, TypeORM, PostgreSQL, Redis, and JWT Authentication.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT Bearer token obtained from POST /api/v1/auth/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Administrator login and profile endpoints')
    .addTag('Dashboard', 'KPI statistics cards, time-series charts, and alerts')
    .addTag('Users', 'User management, filtering, and role administration')
    .addTag('Transactions', 'Financial ledger, invoice details, and status updates')
    .addTag('Bookings', 'Service reservations, scheduling, and lifecycle tracking')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'AdminHub API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(port);

  logger.log(`==================================================================`);
  logger.log(`🚀 AdminHub REST API is running in [${nodeEnv}] mode`);
  logger.log(`🌐 Base URL:          http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger OpenAPI:   http://localhost:${port}/docs`);
  logger.log(`🔑 Seeded Admin:      admin@adminhub.com / AdminPassword123!`);
  logger.log(`==================================================================`);
}

bootstrap();
