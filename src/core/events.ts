/**
 * Minimal typed event emitter for browser environments
 */

type EventHandler<T = unknown> = (data: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<Events extends Record<string, any> = Record<string, unknown>> {
  private handlers: Map<keyof Events, Set<EventHandler<unknown>>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
    return this;
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call)
   */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    const onceHandler: EventHandler<Events[K]> = (data) => {
      this.off(event, onceHandler);
      handler(data);
    };
    return this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler<unknown>);
    }
    return this;
  }

  /**
   * Emit an event to all subscribers
   */
  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for "${String(event)}":`, err);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners(event?: keyof Events): this {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: keyof Events): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
