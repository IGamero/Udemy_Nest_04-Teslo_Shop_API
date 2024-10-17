import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExcludeFieldsInterceptor } from './common/interceptors/exclude-fields.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(process.env.API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina automáticamente los campos que no están definidos en el DTO
      forbidNonWhitelisted: true, // Lanza un error si se envían campos que no están definidos en el DTO
      // transformOptions: { enableImplicitConversion: true }, // Lo vamos a transformar directamtente en los dtos
    }),
  );

  app.useGlobalInterceptors(
    // new ExcludeFieldsInterceptor(['status', 'invalid_field']), // En caso de tener un campo que no existe se ignora
    new ExcludeFieldsInterceptor(['status']),
  );

  await app.listen(process.env.SERVER_PORT);
  console.log(`Listen at port ${process.env.SERVER_PORT}`);
}
bootstrap();
