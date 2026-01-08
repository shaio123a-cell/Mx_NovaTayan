import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
    private logger: winston.Logger;

    constructor(context?: string, configService?: ConfigService) {
        // If instantiated manually (outside DI), fallback to defaults
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
            defaultMeta: { service: 'api', context },
            transports: [
                // Console transport
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                            return `${timestamp} [${level}]${context ? ` [${context}]` : ''} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                        })
                    ),
                }),
                // Daily rotate file transport
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

    log(message: any, ...optionalParams: any[]) {
        this.logger.info(message, ...optionalParams);
    }

    error(message: any, ...optionalParams: any[]) {
        this.logger.error(message, ...optionalParams);
    }

    warn(message: any, ...optionalParams: any[]) {
        this.logger.warn(message, ...optionalParams);
    }

    debug?(message: any, ...optionalParams: any[]) {
        this.logger.debug(message, ...optionalParams);
    }

    verbose?(message: any, ...optionalParams: any[]) {
        this.logger.verbose(message, ...optionalParams);
    }
}
