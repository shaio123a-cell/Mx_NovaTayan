import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Simple config loader for Worker (no NestJS ConfigModule)
const loadConfig = () => {
    const configPath = process.env.CONFIG_FILE || path.join(process.cwd(), 'config.yaml');
    try {
        if (fs.existsSync(configPath)) {
            const fileContents = fs.readFileSync(configPath, 'utf8');
            return yaml.load(fileContents) as Record<string, any>;
        }
    } catch (e) {
        // console.error(`Failed to load config from ${configPath}`, e);
    }
    return {};
};

export class StepLogger {
    private logger: winston.Logger;

    constructor(context?: string) {
        const config = loadConfig();
        // Since worker runs in apps/worker, handle paths relative to root or CWD
        // If run from root via 'npm run dev -w apps/worker', CWD is root.

        const logConfig = config['logging'] || {};

        const logDir = logConfig.dir || process.env.LOG_DIR || path.join(process.cwd(), 'logs');
        const logLevel = logConfig.level || process.env.LOG_LEVEL || 'debug';

        this.logger = winston.createLogger({
            level: logLevel,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            ),
            defaultMeta: { service: 'worker', context },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                            return `${timestamp} [${level}]${context ? ` [${context}]` : ''} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                        })
                    ),
                }),
                new winston.transports.DailyRotateFile({
                    filename: path.join(logDir, 'worker-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: logConfig.maxSize || '5m',
                    maxFiles: logConfig.maxFiles || '5d',
                }),
            ],
        });
    }

    info(message: any, ...meta: any[]) {
        this.logger.info(message, ...meta);
    }

    error(message: any, ...meta: any[]) {
        this.logger.error(message, ...meta);
    }

    warn(message: any, ...meta: any[]) {
        this.logger.warn(message, ...meta);
    }

    debug(message: any, ...meta: any[]) {
        this.logger.debug(message, ...meta);
    }
}

export const logger = new StepLogger('System');
