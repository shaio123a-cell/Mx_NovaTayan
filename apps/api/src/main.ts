import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
    const logger = new LoggerService();
    logger.setContext('System');
    
    const app = await NestFactory.create(AppModule, {
        logger,
    });

    // Global filters
    app.useGlobalFilters(new AllExceptionsFilter());

    // Enable CORS for frontend
    app.enableCors({
        origin: 'http://localhost:5173',
        credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api');

    await app.listen(3000);
    console.log('🚀 RestMon API running on http://localhost:3000');
}

bootstrap();
