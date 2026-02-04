import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export const loadConfig = () => {
    const configPath = process.env.CONFIG_FILE || path.join(process.cwd(), 'config.yaml');
    try {
        if (fs.existsSync(configPath)) {
            const fileContents = fs.readFileSync(configPath, 'utf8');
            return yaml.load(fileContents) as Record<string, any>;
        }
    } catch (e) {
        console.error(`Failed to load config from ${configPath}`, e);
    }
    return {};
};
