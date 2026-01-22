/**
 * Circuit breaker implementation for preventing cascade failures
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail immediately without trying
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerStatus {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  nextAttempt: number; // Timestamp when circuit can transition to HALF_OPEN
}

interface CircuitData {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttempt: number;
}

// Configuration constants
const FAILURE_THRESHOLD = 5; // Number of failures before opening circuit
const TIMEOUT_MS = 60000; // 60 seconds before attempting recovery
const HALF_OPEN_REQUESTS = 2; // Successful requests needed to close from half-open

// In-memory storage for circuit breaker state
const circuits = new Map<string, CircuitData>();

/**
 * Gets or initializes circuit data for a service
 */
function getCircuit(serviceName: string): CircuitData {
  let circuit = circuits.get(serviceName);

  if (!circuit) {
    circuit = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0
    };
    circuits.set(serviceName, circuit);
  }

  return circuit;
}

/**
 * Updates circuit state based on timeout
 * OPEN -> HALF_OPEN if timeout has elapsed
 */
function updateCircuitState(circuit: CircuitData, now: number): void {
  if (circuit.state === CircuitState.OPEN && now >= circuit.nextAttempt) {
    circuit.state = CircuitState.HALF_OPEN;
    circuit.successCount = 0;
    circuit.failureCount = 0;
  }
}

/**
 * Checks if a request can proceed through the circuit breaker
 *
 * @param serviceName - Unique identifier for the service/endpoint
 * @returns true if request should proceed, false if circuit is open
 */
export function canProceed(serviceName: string): boolean {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  // Update state based on timeout
  updateCircuitState(circuit, now);

  // Block requests if circuit is OPEN
  if (circuit.state === CircuitState.OPEN) {
    return false;
  }

  return true;
}

/**
 * Records a successful request
 * Updates circuit state: HALF_OPEN -> CLOSED after threshold successes
 *
 * @param serviceName - Unique identifier for the service/endpoint
 */
export function recordSuccess(serviceName: string): void {
  const circuit = getCircuit(serviceName);

  if (circuit.state === CircuitState.HALF_OPEN) {
    circuit.successCount++;

    // Close circuit if we have enough successful requests
    if (circuit.successCount >= HALF_OPEN_REQUESTS) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
    }
  } else if (circuit.state === CircuitState.CLOSED) {
    // Reset failure count on success in CLOSED state
    circuit.failureCount = 0;
  }
}

/**
 * Records a failed request
 * Updates circuit state: CLOSED -> OPEN after threshold failures
 *                        HALF_OPEN -> OPEN on any failure
 *
 * @param serviceName - Unique identifier for the service/endpoint
 */
export function recordFailure(serviceName: string): void {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  circuit.lastFailureTime = now;

  if (circuit.state === CircuitState.HALF_OPEN) {
    // Any failure in HALF_OPEN state opens the circuit again
    circuit.state = CircuitState.OPEN;
    circuit.nextAttempt = now + TIMEOUT_MS;
    circuit.failureCount = FAILURE_THRESHOLD; // Set to threshold to indicate open
    circuit.successCount = 0;
  } else if (circuit.state === CircuitState.CLOSED) {
    circuit.failureCount++;

    // Open circuit if failure threshold is reached
    if (circuit.failureCount >= FAILURE_THRESHOLD) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = now + TIMEOUT_MS;
    }
  }
}

/**
 * Gets the current status of a circuit breaker
 *
 * @param serviceName - Unique identifier for the service/endpoint
 * @returns Current circuit breaker status
 */
export function getCircuitStatus(serviceName: string): CircuitBreakerStatus {
  const circuit = getCircuit(serviceName);
  const now = Date.now();

  // Update state based on timeout (for accurate status reporting)
  updateCircuitState(circuit, now);

  return {
    state: circuit.state,
    failureCount: circuit.failureCount,
    successCount: circuit.successCount,
    nextAttempt: circuit.nextAttempt
  };
}

/**
 * Resets a circuit breaker to initial state
 * Useful for testing or manual recovery
 *
 * @param serviceName - Unique identifier for the service/endpoint
 */
export function resetCircuit(serviceName: string): void {
  circuits.delete(serviceName);
}

/**
 * Executes a function with circuit breaker protection
 *
 * @param serviceName - Unique identifier for the service/endpoint
 * @param fn - The async function to execute
 * @returns Promise resolving to the function result
 * @throws Error if circuit is open or function fails
 */
export async function executeWithCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request can proceed
  if (!canProceed(serviceName)) {
    const status = getCircuitStatus(serviceName);
    const timeUntilRetry = Math.ceil((status.nextAttempt - Date.now()) / 1000);
    throw new Error(
      `Circuit breaker is OPEN for ${serviceName}. Retry in ${timeUntilRetry} seconds.`
    );
  }

  try {
    const result = await fn();
    recordSuccess(serviceName);
    return result;
  } catch (error) {
    recordFailure(serviceName);
    throw error;
  }
}
