import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const validationPipe = new ValidationPipe({ whitelist: true });
  app.useGlobalPipes(validationPipe);
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
