import { RetryHandler, isRetryableError } from '../src/RetryHandler.js';
import { CircuitBreaker, CircuitState } from '../src/CircuitBreaker.js';

// Test RetryHandler
console.log('Testing RetryHandler...');

const retryHandler = new RetryHandler({
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 1000,
  backoffMultiplier: 2,
});

let attemptCount = 0;
const failTwice = async () => {
  attemptCount++;
  if (attemptCount < 3) {
    throw new Error('Timeout error');
  }
  return 'Success!';
};

retryHandler.execute(failTwice, isRetryableError)
  .then(result => console.log('✅ Retry test passed:', result))
  .catch(err => console.error('❌ Retry test failed:', err));

// Test CircuitBreaker
console.log('\nTesting CircuitBreaker...');

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 1000,
});

let callCount = 0;
const failThreeTimes = async () => {
  callCount++;
  if (callCount <= 3) {
    throw new Error('Service unavailable');
  }
  return 'Success!';
};

// Should fail 3 times and open circuit
Promise.all([
  circuitBreaker.execute(failThreeTimes).catch(() => 'Failed 1'),
  circuitBreaker.execute(failThreeTimes).catch(() => 'Failed 2'),
  circuitBreaker.execute(failThreeTimes).catch(() => 'Failed 3'),
]).then(() => {
  console.log('Circuit state after failures:', circuitBreaker.getState());
  
  // Should reject immediately (circuit open)
  circuitBreaker.execute(failThreeTimes)
    .catch(err => {
      console.log('✅ Circuit breaker test passed:', err.message);
      console.log('Final circuit state:', circuitBreaker.getState());
    });
});

// Test isRetryableError
console.log('\nTesting isRetryableError...');
console.log('Timeout error:', isRetryableError(new Error('Request timeout')));
console.log('Rate limit error:', isRetryableError(new Error('429 Too Many Requests')));
console.log('Auth error:', isRetryableError(new Error('401 Unauthorized')));
