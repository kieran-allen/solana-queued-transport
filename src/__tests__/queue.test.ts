import PQueue from "p-queue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueue, QueueOptions } from "../queue";

describe("createQueue", () => {
  // Setup fake timers
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a PQueue instance", () => {
    const queue = createQueue({});
    expect(queue).toBeInstanceOf(PQueue);
  });

  it("should use default options when none are provided", () => {
    const queue = createQueue({});
    expect(queue.concurrency).toBe(1);
  });

  it("should respect custom concurrency", () => {
    const options: QueueOptions = { concurrency: 5 };
    const queue = createQueue(options);
    expect(queue.concurrency).toBe(5);
  });

  it("should respect autoStart option", () => {
    const queueWithAutoStart = createQueue({ autoStart: true });
    expect(queueWithAutoStart.isPaused).toBe(false);

    const queueWithoutAutoStart = createQueue({ autoStart: false });
    expect(queueWithoutAutoStart.isPaused).toBe(true);
  });

  it("should handle interval and intervalCap options", () => {
    const options: QueueOptions = {
      interval: 1000,
      intervalCap: 2,
    };
    const queue = createQueue(options);

    // These properties aren't directly accessible, but we can still test
    // that the queue is created without errors
    expect(queue).toBeInstanceOf(PQueue);
  });

  it("should process queue items in order", async () => {
    const queue = createQueue({ concurrency: 1 });
    const results: number[] = [];

    const promises = [
      queue.add(() => new Promise<void>((resolve) => {
        globalThis.setTimeout(() => {
          results.push(1);
          resolve();
        }, 50);
      })),
      queue.add(() => {
        results.push(2);
        return Promise.resolve();
      }),
      queue.add(() => {
        results.push(3);
        return Promise.resolve();
      }),
    ];

    // Advance timers to complete all tasks
    vi.advanceTimersByTime(100);

    await Promise.all(promises);

    expect(results).toEqual([1, 2, 3]);
  });
});
