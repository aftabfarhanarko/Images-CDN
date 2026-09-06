import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Ensure uploads directory exists
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    console.log(`Creating uploads directory at: ${uploadsPath}`);
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Parse CORS origins from environment variable if provided
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://rajseba.in',
    'https://household-services-frontend-lc2h.vercel.app',
    'https://ai-power-admin-console.vercel.app',
    'https://squadlog.up.railway.app',
    'https://squadlog-console.up.railway.app',
    'https://squadcart-console.up.railway.app',
    'https://karigoriongon-console.up.railway.app',
    'https://karigoriongon-frontend.up.railway.app',
    'https://karigoriongon.com',
    'https://console.karigoriongon.com',
    'https://karigoriongon.com/sojibdotdev',
    'https://console.squadcart.app',
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean)
    : [];

  const allowedOrigins = Array.from(
    new Set([...defaultOrigins.map((o) => o.replace(/\/$/, '')), ...envOrigins]),
  );

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      const cleanOrigin = origin ? origin.replace(/\/$/, '') : null;
      // Allow requests with no origin (like mobile apps, curl, postman) or if explicitly allowed
      if (!cleanOrigin || allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true); // Permissive CORS for public CDN asset API
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
  });

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Serve static files from uploads directory with aggressive browser caching
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  const port = process.env.PORT ?? 8000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SquadLog CDN is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
}
bootstrap();
