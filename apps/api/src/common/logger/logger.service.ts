import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
    private logger: winston.Logger;
    private context: string = 'API';

    constructor(configService?: ConfigService) {
        const config = configService ? {
            dir: configService.get('logging.dir'),
            level: configService.get('logging.level'),
            maxSize: configService.get('logging.maxSize'),
            maxFiles: configService.get('logging.maxFiles'),
        } : {
            dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
            level: process.env.LOG_LEVEL || 'debug',
            maxSize: '5m',
            maxFiles: '5d'
        };

        const logDir = config.dir || 'logs';
        const logLevel = config.level || 'debug';

        this.logger = winston.createLogger({
            level: logLevel,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            ),
            defaultMeta: { service: 'api' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                            const ctx = context || this.context;
                            return `${timestamp} [${level}]${ctx ? ` [${ctx}]` : ''} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                        })
                    ),
                }),
                new winston.transports.DailyRotateFile({
                    filename: path.join(logDir, 'api-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: config.maxSize || '5m',
                    maxFiles: config.maxFiles || '5d',
                }),
            ],
        });
    }

    setContext(context: string) {
        this.context = context;
    }

    log(message: any, ...optionalParams: any[]) {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : this.context;
        this.logger.info(message, { context });
    }

    error(message: any, ...optionalParams: any[]) {
        const stack = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
        const context = typeof optionalParams[1] === 'string' ? optionalParams[1] : this.context;
        this.logger.error(message, { stack, context });
    }

    warn(message: any, ...optionalParams: any[]) {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : this.context;
        this.logger.warn(message, { context });
    }

    debug(message: any, ...optionalParams: any[]) {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : this.context;
        this.logger.debug(message, { context });
    }

    verbose(message: any, ...optionalParams: any[]) {
        const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : this.context;
        this.logger.verbose(message, { context });
    }
}
