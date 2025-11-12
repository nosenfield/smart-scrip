/**
 * Unit tests for logging utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, initializeLogger, flushLogs, sanitizeMetadata } from '$lib/server/utils/logger';

type SerializableObject = {
	[key: string]: unknown;
};

// Mock @google-cloud/logging
const mockLogWrite = vi.fn().mockResolvedValue(undefined);
const mockLogEntry = vi.fn((metadata, data) => ({ metadata, data }));
const mockLog = {
	write: mockLogWrite,
	entry: mockLogEntry
};

const mockLogMethod = vi.fn((_name?: string) => mockLog);

vi.mock('@google-cloud/logging', () => {
	class MockLogging {
		log(name: string) {
			// Capture the argument by calling mockLogMethod with it
			mockLogMethod(name);
			return mockLog;
		}
	}

	return {
		Logging: MockLogging
	};
});

describe('logger', () => {
	const originalEnv = process.env.NODE_ENV;
	const originalConsoleLog = console.log;
	const originalConsoleError = console.error;
	const originalConsoleWarn = console.warn;
	const originalProcessOn = process.on;

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		// Capture console output
		console.log = vi.fn();
		console.error = vi.fn();
		console.warn = vi.fn();
		// Mock process.on to avoid registering real handlers
		process.on = vi.fn();
	});

	afterEach(async () => {
		// Restore original console
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
		console.warn = originalConsoleWarn;
		process.on = originalProcessOn;
		// Restore environment
		process.env.NODE_ENV = originalEnv;
		// Note: Don't reset modules here as it breaks mocks
		// Logger state is reset via initializeLogger calls in tests
	});

	describe('development mode', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: false });
		});

		it('should log info messages to console', () => {
			logger.info('Test info message', { key: 'value' });

			expect(console.log).toHaveBeenCalledWith('[INFO] Test info message', { key: 'value' });
		});

		it('should log warn messages to console.warn', () => {
			logger.warn('Test warning', { warning: true });

			expect(console.warn).toHaveBeenCalledWith('[WARN] Test warning', { warning: true });
		});

		it('should log error messages to console.error', () => {
			logger.error('Test error', { error: 'details' });

			expect(console.error).toHaveBeenCalledWith('[ERROR] Test error', { error: 'details' });
		});

		it('should log debug messages in development', () => {
			logger.debug('Debug message', { debug: true });

			expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug message', { debug: true });
		});

		it('should handle logging without metadata', () => {
			logger.info('Simple message');

			expect(console.log).toHaveBeenCalledWith('[INFO] Simple message', '');
		});
	});

	describe('production mode', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: true });
		});

		it('should use Cloud Logging in production', async () => {
			logger.info('Production log', { data: 'test' });

			// Wait for async write
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Verify Cloud Logging was called
			expect(mockLogWrite).toHaveBeenCalled();
			expect(mockLogEntry).toHaveBeenCalledWith(
				{ severity: 'INFO' },
				expect.objectContaining({
					severity: 'INFO',
					message: 'Production log',
					data: 'test'
				})
			);
		});

		it('should not log debug messages in production', () => {
			logger.debug('Debug message', { debug: true });

			expect(mockLogWrite).not.toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
		});

		it('should buffer log writes for graceful shutdown', async () => {
			logger.info('Test 1');
			logger.warn('Test 2');
			logger.error('Test 3');

			// Writes should be buffered
			expect(mockLogWrite).toHaveBeenCalledTimes(3);

			// Flush should wait for all writes
			await flushLogs();

			// All writes should complete
			expect(mockLogWrite).toHaveBeenCalledTimes(3);
		});

		it('should handle Cloud Logging errors gracefully', async () => {
			mockLogWrite.mockRejectedValueOnce(new Error('Cloud Logging failed'));

			logger.error('Test error', { error: 'details' });

			// Wait for async error handling
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should not throw, error is caught internally
			expect(mockLogWrite).toHaveBeenCalled();
		});
	});

	describe('logger methods', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: false });
		});

		it('should have all required methods', () => {
			expect(typeof logger.debug).toBe('function');
			expect(typeof logger.info).toBe('function');
			expect(typeof logger.warn).toBe('function');
			expect(typeof logger.error).toBe('function');
			expect(typeof logger.flush).toBe('function');
		});

		it('should accept string messages', () => {
			expect(() => {
				logger.info('Test');
				logger.warn('Test');
				logger.error('Test');
				logger.debug('Test');
			}).not.toThrow();
		});

		it('should accept metadata objects', () => {
			const metadata = {
				userId: '123',
				action: 'test',
				nested: { data: 'value' }
			};

			expect(() => {
				logger.info('Test', metadata);
				logger.warn('Test', metadata);
				logger.error('Test', metadata);
				logger.debug('Test', metadata);
			}).not.toThrow();
		});

		it('should handle empty metadata', () => {
			expect(() => {
				logger.info('Test', {});
			}).not.toThrow();
		});

		it('should handle undefined metadata', () => {
			expect(() => {
				logger.info('Test', undefined);
			}).not.toThrow();
		});
	});

	describe('log format', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: false });
		});

		it('should format info logs correctly', () => {
			logger.info('Info message', { key: 'value' });

			expect(console.log).toHaveBeenCalledWith('[INFO] Info message', { key: 'value' });
		});

		it('should format warn logs correctly', () => {
			logger.warn('Warning message', { warning: true });

			expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message', { warning: true });
		});

		it('should format error logs correctly', () => {
			logger.error('Error message', { error: 'details' });

			expect(console.error).toHaveBeenCalledWith('[ERROR] Error message', { error: 'details' });
		});

		it('should format debug logs correctly', () => {
			logger.debug('Debug message', { debug: true });

			expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug message', { debug: true });
		});
	});

	describe('sanitizeMetadata', () => {
		it('should remove sensitive keys', () => {
			const metadata = {
				password: 'secret123',
				apiKey: 'key123',
				user: 'john',
				token: 'abc123'
			};

			const sanitized = sanitizeMetadata(metadata);

			expect(sanitized.password).toBe('[REDACTED]');
			expect(sanitized.apiKey).toBe('[REDACTED]');
			expect(sanitized.token).toBe('[REDACTED]');
			expect(sanitized.user).toBe('john');
		});

		it('should remove non-serializable values', () => {
			const metadata = {
				user: 'john',
				fn: () => {},
				symbol: Symbol('test'),
				undefined: undefined
			};

			const sanitized = sanitizeMetadata(metadata);

			expect(sanitized.user).toBe('john');
			expect('fn' in sanitized).toBe(false);
			expect('symbol' in sanitized).toBe(false);
			expect('undefined' in sanitized).toBe(false);
		});

		it('should preserve serializable values', () => {
			const metadata = {
				string: 'test',
				number: 123,
				boolean: true,
				null: null,
				array: [1, 2, 3],
				object: { nested: 'value' }
			};

			const sanitized = sanitizeMetadata(metadata);

			expect(sanitized.string).toBe('test');
			expect(sanitized.number).toBe(123);
			expect(sanitized.boolean).toBe(true);
			expect(sanitized.null).toBe(null);
			expect(sanitized.array).toEqual([1, 2, 3]);
			expect(sanitized.object).toEqual({ nested: 'value' });
		});

		it('should handle nested objects', () => {
			const metadata = {
				user: {
					name: 'john',
					password: 'secret',
					profile: {
						email: 'john@example.com',
						apiKey: 'key123'
					}
				}
			};

			const sanitized = sanitizeMetadata(metadata);
			const user = sanitized.user as SerializableObject;

			expect(user.name).toBe('john');
			expect(user.password).toBe('[REDACTED]');
			expect((user.profile as SerializableObject).email).toBe('john@example.com');
			expect((user.profile as SerializableObject).apiKey).toBe('[REDACTED]');
		});
	});

	describe('flushLogs', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: true });
		});

		it('should flush pending writes', async () => {
			logger.info('Test 1');
			logger.warn('Test 2');

			await flushLogs();

			expect(mockLogWrite).toHaveBeenCalledTimes(2);
		});

		it('should handle empty pending writes', async () => {
			await expect(flushLogs()).resolves.not.toThrow();
		});

		it('should handle flush errors gracefully', async () => {
			mockLogWrite.mockRejectedValueOnce(new Error('Write failed'));

			logger.error('Test error');

			await expect(flushLogs()).resolves.not.toThrow();
		});
	});

	describe('initializeLogger', () => {
		it('should initialize with production config', async () => {
			await initializeLogger({ isProduction: true });

			logger.info('Test');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockLogWrite).toHaveBeenCalled();
		});

		it('should initialize with development config', async () => {
			await initializeLogger({ isProduction: false });

			logger.info('Test');

			expect(console.log).toHaveBeenCalled();
			expect(mockLogWrite).not.toHaveBeenCalled();
		});

		it('should use custom log name', async () => {
			// Clear previous calls
			mockLogMethod.mockClear();
			
			await initializeLogger({ isProduction: true, logName: 'custom-log' });

			// Verify log method was called with custom name
			expect(mockLogMethod).toHaveBeenCalledWith('custom-log');
		});

		it('should default to NODE_ENV when config not provided', async () => {
			process.env.NODE_ENV = 'production';
			await initializeLogger();

			logger.info('Test');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockLogWrite).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		beforeEach(async () => {
			await initializeLogger({ isProduction: false });
		});

		it('should handle errors gracefully', () => {
			expect(() => {
				logger.error('Test error', { error: 'details' });
			}).not.toThrow();
		});

		it('should log errors with metadata', () => {
			logger.error('Error occurred', { error: 'details', code: 500 });

			expect(console.error).toHaveBeenCalledWith('[ERROR] Error occurred', {
				error: 'details',
				code: 500
			});
		});
	});
});
