import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './events';

interface TestEvents {
  message: string;
  count: number;
  empty: void;
}

describe('EventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const handler = vi.fn();
    emitter.on('message', handler);
    emitter.trigger('message', 'hello');

    expect(handler).toHaveBeenCalledWith('hello');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    emitter.on('message', handler1);
    emitter.on('message', handler2);
    emitter.trigger('message', 'test');

    expect(handler1).toHaveBeenCalledWith('test');
    expect(handler2).toHaveBeenCalledWith('test');
  });

  it('should unsubscribe with off()', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const handler = vi.fn();
    emitter.on('message', handler);
    emitter.trigger('message', 'first');
    
    emitter.off('message', handler);
    emitter.trigger('message', 'second');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('first');
  });

  it('should support once()', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const handler = vi.fn();
    emitter.once('count', handler);
    
    emitter.trigger('count', 1);
    emitter.trigger('count', 2);
    emitter.trigger('count', 3);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('should return this for chaining', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler = vi.fn();

    const result = emitter.on('message', handler).on('count', handler);
    expect(result).toBe(emitter);
  });

  it('should handle errors in handlers gracefully', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const normalHandler = vi.fn();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    emitter.on('message', errorHandler);
    emitter.on('message', normalHandler);
    emitter.trigger('message', 'test');

    // Both handlers should be called despite the error
    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should removeAllListeners for specific event', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const messageHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on('message', messageHandler);
    emitter.on('count', countHandler);
    
    emitter.removeAllListeners('message');
    
    emitter.trigger('message', 'test');
    emitter.trigger('count', 42);

    expect(messageHandler).not.toHaveBeenCalled();
    expect(countHandler).toHaveBeenCalledWith(42);
  });

  it('should removeAllListeners for all events', () => {
    const emitter = new (class extends EventEmitter<TestEvents> {
      trigger<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
        this.emit(event, data);
      }
    })();

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('message', handler1);
    emitter.on('count', handler2);
    
    emitter.removeAllListeners();
    
    emitter.trigger('message', 'test');
    emitter.trigger('count', 42);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should return correct listenerCount', () => {
    const emitter = new EventEmitter<TestEvents>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    expect(emitter.listenerCount('message')).toBe(0);
    
    emitter.on('message', handler1);
    expect(emitter.listenerCount('message')).toBe(1);
    
    emitter.on('message', handler2);
    expect(emitter.listenerCount('message')).toBe(2);
    
    emitter.off('message', handler1);
    expect(emitter.listenerCount('message')).toBe(1);
  });
});
