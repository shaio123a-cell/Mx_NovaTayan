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

    // Increase payload size limit — worker tasks can return large API responses
    // (e.g. BMC BHOM event classes, Salesforce bulk data, etc.)
    // Default NestJS/Express limit is 100kb which is insufficient for real-world payloads.
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(require('express').json({ limit: '50mb' }));
    expressApp.use(require('express').urlencoded({ limit: '50mb', extended: true }));


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
