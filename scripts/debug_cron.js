
const cronParser = require('cron-parser');
console.log('Testing CronExpressionParser.parse...');
try {
    const interval = cronParser.CronExpressionParser.parse('5 * * * *');
    console.log('SUCCESS: next fire at', interval.next().toDate());
} catch (e) {
    console.log('FAILED:', e.message);
}
