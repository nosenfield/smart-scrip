/**
 * Cloud Logging Utility
 * 
 * Provides structured logging with Google Cloud Logging integration
 * for production and console logging for development.
 */

import { Logging } from '@google-cloud/logging';

/**
 * Note: NODE_ENV is evaluated at module load time.
 * This means the logger will use the environment value from when
 * the module was first imported. In production, NODE_ENV should
 * be set before the application starts and remain constant.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize Cloud Logging only in production
const logging = IS_PRODUCTION ? new Logging() : null;
const log = logging?.log('ndc-calculator');

/**
 * Log severity levels matching Google Cloud Logging standards
 */
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Metadata object for structured logging
 * 
 * Note: Callers are responsible for sanitizing sensitive data before logging.
 * Metadata values should be serializable (strings, numbers, booleans, objects, arrays).
 */
export interface LogMetadata {
	[key: string]: unknown;
}

/**
 * Internal function to write logs to appropriate destination
 * 
 * @param level - Log severity level
 * @param message - Log message
 * @param metadata - Optional structured metadata
 */
function writeLog(level: LogLevel, message: string, metadata?: LogMetadata): void {
	const logData = {
		severity: level,
		message,
		timestamp: new Date().toISOString(),
		...(metadata || {})
	};

	if (IS_PRODUCTION && log) {
		// Production: Use Cloud Logging
		const entry = log.entry({ severity: level }, logData);
		// Note: Fire-and-forget approach - logs are not awaited to avoid blocking.
		// This means logs may be lost if the process terminates before the write completes.
		// For critical logs, consider implementing buffering with graceful shutdown.
		log.write(entry).catch((error) => {
			// Fallback to console if Cloud Logging fails
			console.error(`[Cloud Logging Error] Failed to write log:`, error);
			console.error(`[${level}] ${message}`, metadata || '');
		});
	} else {
		// Development: Use console logging
		const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
		logFn(`[${level}] ${message}`, metadata || '');
	}
}

/**
 * Logger interface with structured logging methods
 * 
 * All methods accept a message string and optional metadata object.
 * In production, logs are sent to Google Cloud Logging.
 * In development, logs are written to console.
 */
export const logger = {
	/**
	 * Debug-level logging (development only)
	 * 
	 * @param message - Debug message
	 * @param metadata - Optional structured metadata
	 */
	debug: (message: string, metadata?: LogMetadata): void => {
		// Only log debug in development
		if (!IS_PRODUCTION) {
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
	}
};

