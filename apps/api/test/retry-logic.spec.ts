
/**
 * Test Suite: Workflow Retry & Backoff Logic
 * Validates that mathematical backoff strategies (Constant, Linear, Exponential) 
 * behave exactly as specified in the World-Class design.
 */

interface RetryPolicy {
  maxAttempts: number;
  initialDelaySeconds: number;
  maxDelaySeconds: number;
  backoffType: 'constant' | 'linear' | 'exponential';
}

function calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
  let delay = 0;
  
  if (policy.backoffType === 'constant') {
    delay = policy.initialDelaySeconds;
  } else if (policy.backoffType === 'linear') {
    delay = policy.initialDelaySeconds * attempt;
  } else if (policy.backoffType === 'exponential') {
    delay = policy.initialDelaySeconds * Math.pow(2, attempt - 1);
  }

  // Ensure max cap is respected
  return Math.min(delay, policy.maxDelaySeconds);
}

describe('Workflow Retry Logic', () => {
  const basePolicy: RetryPolicy = {
    maxAttempts: 5,
    initialDelaySeconds: 10,
    maxDelaySeconds: 60,
    backoffType: 'constant'
  };

  test('Constant Backoff: Always returns initial delay', () => {
    expect(calculateRetryDelay(1, basePolicy)).toBe(10);
    expect(calculateRetryDelay(3, basePolicy)).toBe(10);
    expect(calculateRetryDelay(5, basePolicy)).toBe(10);
  });

  test('Linear Backoff: Increases by initial delay increment', () => {
    const policy = { ...basePolicy, backoffType: 'linear' as const };
    expect(calculateRetryDelay(1, policy)).toBe(10);
    expect(calculateRetryDelay(2, policy)).toBe(20);
    expect(calculateRetryDelay(3, policy)).toBe(30);
  });

  test('Exponential Backoff: Doubles each attempt', () => {
    const policy = { ...basePolicy, backoffType: 'exponential' as const };
    expect(calculateRetryDelay(1, policy)).toBe(10); // 10 * 2^0
    expect(calculateRetryDelay(2, policy)).toBe(20); // 10 * 2^1
    expect(calculateRetryDelay(3, policy)).toBe(40); // 10 * 2^2
  });

  test('Max Delay: Caps the calculation value', () => {
    const policy = { 
        ...basePolicy, 
        backoffType: 'exponential' as const, 
        maxDelaySeconds: 25 
    };
    expect(calculateRetryDelay(1, policy)).toBe(10);
    expect(calculateRetryDelay(2, policy)).toBe(20);
    expect(calculateRetryDelay(3, policy)).toBe(25); // Math would be 40, but check cap
  });

  test('Boundary: Handle 0 initial delay', () => {
    const policy = { ...basePolicy, initialDelaySeconds: 0 };
    expect(calculateRetryDelay(5, policy)).toBe(0);
  });
});
