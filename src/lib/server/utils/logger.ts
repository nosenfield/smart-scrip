/**
 * Cloud Logging Utility
 * 
 * Provides structured logging with Google Cloud Logging integration
 * for production and console logging for development.
 * 
 * Features:
 * - Testable environment detection via factory pattern
 * - Graceful shutdown with log buffering
 * - Metadata sanitization utilities
 * - Type-safe serializable metadata
 */

import { Logging } from '@google-cloud/logging';

/**
 * Log severity levels matching Google Cloud Logging standards
 */
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Serializable metadata types for structured logging
 * 
 * Only these types are safe to serialize and send to Cloud Logging.
 * Functions, symbols, and other non-serializable types are excluded.
 */
type SerializableValue =
	| string
	| number
	| boolean
	| null
	| SerializableObject
	| SerializableArray;

type SerializableObject = {
	[key: string]: SerializableValue;
};

type SerializableArray = SerializableValue[];

/**
 * Metadata object for structured logging
 * 
 * All values must be serializable (strings, numbers, booleans, objects, arrays).
 * Use sanitizeMetadata() to ensure metadata is safe for logging.
 * 
 * Note: Accepts Record<string, unknown> for convenience, but values will be
 * sanitized before logging to ensure only serializable types are included.
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Configuration for logger initialization
 */
interface LoggerConfig {
	/**
	 * Whether to use production Cloud Logging (defaults to NODE_ENV === 'production')
	 */
	isProduction?: boolean;
	/**
	 * Log name for Cloud Logging (defaults to 'ndc-calculator')
	 */
	logName?: string;
}

/**
 * Internal logger state
 */
interface LoggerState {
	logging: Logging | null;
	log: ReturnType<Logging['log']> | null;
	isProduction: boolean;
	pendingWrites: Promise<void>[];
	shutdownHandler: (() => Promise<void>) | null;
}

// Global logger state
let loggerState: LoggerState | null = null;
// Track if shutdown handlers are registered to prevent duplicate registrations
let shutdownHandlersRegistered = false;

/**
 * Initialize logger with optional configuration
 * 
 * @param config - Logger configuration (optional)
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeLogger(config: LoggerConfig = {}): Promise<void> {
	const isProduction = config.isProduction ?? process.env.NODE_ENV === 'production';
	const logName = config.logName ?? 'ndc-calculator';

	// Clean up previous initialization if switching from production to development mode
	// This ensures handlers are properly removed when switching modes (e.g., in tests)
	if (loggerState && shutdownHandlersRegistered && !isProduction) {
		cleanupLogger();
	}

	let logging: Logging | null = null;
	let log: ReturnType<Logging['log']> | null = null;

	if (isProduction) {
		try {
			logging = new Logging();
			log = logging.log(logName);
			// Verify log was created (for testing)
			if (!log) {
				throw new Error('Failed to create log instance');
			}
		} catch (error) {
			// Fallback to console if Cloud Logging initialization fails
			console.error('[Logger] Failed to initialize Cloud Logging:', error);
			console.warn('[Logger] Falling back to console logging');
			logging = null;
			log = null;
		}
	}

	loggerState = {
		logging,
		log,
		isProduction,
		pendingWrites: [],
		shutdownHandler: null
	};

	// Set up graceful shutdown handler (only once)
	if (isProduction && log && !shutdownHandlersRegistered) {
		loggerState.shutdownHandler = async () => {
			await flushLogs();
		};

		// Register shutdown handlers using once() to prevent duplicate registrations
		// Note: once() ensures handlers are only called once, but we still track
		// registration state to prevent multiple registrations
		process.once('SIGTERM', handleShutdown);
		process.once('SIGINT', handleShutdown);
		process.once('beforeExit', handleShutdown);
		
		// Set flag AFTER registering handlers to ensure consistency
		shutdownHandlersRegistered = true;
	}
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown(): Promise<void> {
	if (loggerState?.shutdownHandler) {
		await loggerState.shutdownHandler();
	}
}

/**
 * Cleanup logger and remove event handlers
 * 
 * Useful for testing scenarios where logger is reinitialized.
 * In production, this should not be called as handlers persist for app lifetime.
 * 
 * Flushes pending logs before cleanup to ensure no logs are lost.
 */
export async function cleanupLogger(): Promise<void> {
	// Flush pending logs before cleanup
	await flushLogs();
	
	if (shutdownHandlersRegistered) {
		process.removeListener('SIGTERM', handleShutdown);
		process.removeListener('SIGINT', handleShutdown);
		process.removeListener('beforeExit', handleShutdown);
		shutdownHandlersRegistered = false;
	}
	loggerState = null;
}

/**
 * Flush all pending log writes
 * 
 * Call this before process termination to ensure all logs are written.
 * Automatically called during graceful shutdown.
 */
export async function flushLogs(): Promise<void> {
	if (!loggerState?.pendingWrites.length) {
		return;
	}

	try {
		await Promise.allSettled(loggerState.pendingWrites);
		loggerState.pendingWrites = [];
	} catch (error) {
		// Only log flush errors in development to avoid noise in production
		// Flush failures are non-critical - logs may be lost but app continues
		if (!loggerState?.isProduction) {
			console.error('[Logger] Error flushing logs:', error);
		}
	}
}

/**
 * Sanitize metadata to ensure it's safe for logging
 * 
 * Removes non-serializable values (functions, symbols, undefined) and
 * sanitizes sensitive data patterns.
 * 
 * @param metadata - Raw metadata object
 * @returns Sanitized metadata safe for logging
 * 
 * @example
 * ```typescript
 * const raw = { password: 'secret', user: 'john', fn: () => {} };
 * const safe = sanitizeMetadata(raw);
 * // Returns: { user: 'john' } (password and function removed)
 * ```
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): SerializableObject {
	const sanitized: SerializableObject = {};

	for (const [key, value] of Object.entries(metadata)) {
		// Skip sensitive keys (matches common sensitive patterns)
		const sensitivePatterns = /password|secret|token|auth.*key|api.*key/i;
		if (sensitivePatterns.test(key)) {
			sanitized[key] = '[REDACTED]';
			continue;
		}

		// Only include serializable values
		if (isSerializable(value)) {
			sanitized[key] = sanitizeValue(value);
		}
		// Skip undefined, functions, symbols, etc.
	}

	return sanitized;
}

/**
 * Check if a value is serializable
 */
function isSerializable(value: unknown): value is SerializableValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every(isSerializable);
	}

	if (typeof value === 'object' && value !== null) {
		return Object.values(value).every(isSerializable);
	}

	return false;
}

/**
 * Recursively sanitize a value, including nested objects
 */
function sanitizeValue(value: unknown): SerializableValue {
	if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		// Map and filter to ensure all elements are serializable
		// Note: sanitizeValue already returns SerializableValue, but filter provides extra safety
		return value.map(sanitizeValue).filter(isSerializable) as SerializableArray;
	}

	if (typeof value === 'object' && value !== null) {
		// Recursively sanitize nested objects using sanitizeMetadata
		// sanitizeMetadata returns SerializableObject with SerializableValue values
		return sanitizeMetadata(value as Record<string, unknown>);
	}

	// Fallback: convert to string
	return String(value);
}

/**
 * Internal function to write logs to appropriate destination
 * 
 * @param level - Log severity level
 * @param message - Log message
 * @param metadata - Optional structured metadata (will be sanitized)
 */
function writeLog(level: LogLevel, message: string, metadata?: LogMetadata): void {
	// Ensure logger is initialized
	if (!loggerState) {
		// Lazy initialization for backward compatibility
		// Note: This uses NODE_ENV at call time, not module load time
		// For testability, prefer calling initializeLogger() explicitly
		const isProduction = process.env.NODE_ENV === 'production';
		let logging: Logging | null = null;
		let log: ReturnType<Logging['log']> | null = null;

		if (isProduction) {
			try {
				logging = new Logging();
				log = logging.log('ndc-calculator');
			} catch (error) {
				// Fallback to console if Cloud Logging initialization fails
				console.error('[Logger] Failed to initialize Cloud Logging:', error);
				console.warn('[Logger] Falling back to console logging');
				logging = null;
				log = null;
			}
		}

		loggerState = {
			logging,
			log,
			isProduction,
			pendingWrites: [],
			shutdownHandler: null
		};
	}

	// Sanitize metadata - sanitizeMetadata returns SerializableObject
	// All values are guaranteed to be SerializableValue after sanitization
	const sanitizedMetadata: SerializableObject | undefined = metadata
		? sanitizeMetadata(metadata)
		: undefined;

	const logData = {
		severity: level,
		message,
		timestamp: new Date().toISOString(),
		...(sanitizedMetadata || {})
	};

	if (loggerState.isProduction && loggerState.log) {
		// Production: Use Cloud Logging with buffering
		const entry = loggerState.log.entry({ severity: level }, logData);
		
		// Buffer the write promise for graceful shutdown
		const writePromise = loggerState.log
			.write(entry)
			.catch((error) => {
				// In production, silently fail to avoid noise in Cloud Run logs
				// Cloud Logging failures are non-critical and shouldn't break the app
				// In development, log to console for debugging
				// Note: For production monitoring, consider tracking failure metrics externally
				if (loggerState && !loggerState.isProduction) {
					console.error(`[Cloud Logging Error] Failed to write log:`, error);
					console.error(`[${level}] ${message}`, sanitizedMetadata || '');
				}
			})
			.finally(() => {
				// Always clean up promise from buffer to prevent memory leak (success or failure)
				if (loggerState) {
					const index = loggerState.pendingWrites.indexOf(writePromise);
					if (index > -1) {
						loggerState.pendingWrites.splice(index, 1);
					}
				}
			})
			.then(() => undefined); // Ensure it returns Promise<void>

		loggerState.pendingWrites.push(writePromise);
	} else {
		// Development: Use console logging
		const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
		logFn(`[${level}] ${message}`, sanitizedMetadata || '');
	}
}

/**
 * Logger interface with structured logging methods
 * 
 * All methods accept a message string and optional metadata object.
 * In production, logs are sent to Google Cloud Logging with buffering.
 * In development, logs are written to console.
 * 
 * Metadata is automatically sanitized to remove sensitive data and
 * non-serializable values.
 */
export const logger = {
	/**
	 * Debug-level logging (development only)
	 * 
	 * @param message - Debug message
	 * @param metadata - Optional structured metadata
	 */
	debug: (message: string, metadata?: LogMetadata): void => {
		if (!loggerState?.isProduction) {
			writeLog('DEBUG', message, metadata);
		}
	},

	/**
	 * Info-level logging
	 * 
	 * @param message - Informational message
	 * @param metadata - Optional structured metadata
	 */
	info: (message: string, metadata?: LogMetadata): void => {
		writeLog('INFO', message, metadata);
	},

	/**
	 * Warning-level logging
	 * 
	 * @param message - Warning message
	 * @param metadata - Optional structured metadata
	 */
	warn: (message: string, metadata?: LogMetadata): void => {
		writeLog('WARN', message, metadata);
	},

	/**
	 * Error-level logging
	 * 
	 * @param message - Error message
	 * @param metadata - Optional structured metadata
	 */
	error: (message: string, metadata?: LogMetadata): void => {
		writeLog('ERROR', message, metadata);
	},

	/**
	 * Flush all pending log writes
	 * 
	 * Call this before process termination to ensure all logs are written.
	 */
	flush: flushLogs
};
