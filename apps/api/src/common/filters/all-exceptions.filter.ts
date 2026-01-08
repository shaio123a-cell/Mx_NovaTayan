import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof Error ? exception.message : 'Internal server error';

        // LOG THE FULL ERROR TO CONSOLE
        console.error('--- EXCEPTION CAUGHT ---');
        console.error(`Status: ${status}`);
        console.error(`Path: ${request.url}`);
        console.error(`Message: ${message}`);
        if (exception instanceof Error && exception.stack) {
            console.error(`Stack: ${exception.stack}`);
        }
        console.error('------------------------');

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: message,
            // Include stack trace only in dev if you want, but logging it to console is safer
        });
    }
}
