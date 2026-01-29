import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('EUDI Wallet API')
    .setDescription('API для керування LEI та Verifiable Credentials організацій')
    .setVersion('1.0')
    .addBearerAuth() // тестування JWT в браузері
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

// 1. Глобальна валідація (щоб працювали DTO)
  app.useGlobalPipes(new ValidationPipe());

  // 2. Підключаємо наш фільтр виключень
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:3000/api`);
}
bootstrap();
