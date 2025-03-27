import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as queueModule from "../queue";
import { createQueuedTransport } from "../transport";

// Mock dependencies
vi.mock("@solana/kit", () => {
  return {
    isJsonRpcPayload: vi.fn((payload) => {
      return payload && typeof payload === "object" && "jsonrpc" in payload;
    }),
  };
});

describe("Edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle transport errors", async () => {
    // Create a transport that always throws
    const errorTransport = vi.fn().mockImplementation(() => {
      throw new Error("Transport error");
    });

    // Create a mock queue that executes the function directly
    const mockQueue = {
      add: vi.fn(fn => fn()),
    };

    vi.spyOn(queueModule, "createQueue").mockReturnValue(mockQueue as any);

    const transport = createQueuedTransport({ transport: errorTransport as any });

    // We expect the transport error to be thrown through the queue
    await expect(async () => {
      await transport({
        payload: { id: 1, jsonrpc: "2.0", method: "test" },
      } as any);
    }).rejects.toThrow("Transport error");

    expect(mockQueue.add).toHaveBeenCalled();
  });

  it("should handle queue errors", async () => {
    // Create a transport that returns successfully
    const successTransport = vi.fn(() => Promise.resolve({ result: "success" }));

    // Create a mock queue that throws when add is called
    const mockQueue = {
      add: vi.fn().mockImplementation(() => {
        throw new Error("Queue error");
      }),
    };

    vi.spyOn(queueModule, "createQueue").mockReturnValue(mockQueue as any);

    const transport = createQueuedTransport({ transport: successTransport as any });

    // We expect the queue error to be thrown
    await expect(async () => {
      await transport({
        payload: { id: 1, jsonrpc: "2.0", method: "test" },
      } as any);
    }).rejects.toThrow("Queue error");

    expect(mockQueue.add).toHaveBeenCalled();
    // The transport should not be called because the queue threw an error
    expect(successTransport).not.toHaveBeenCalled();
  });

  it("should handle invalid queue options", () => {
    // Try to create a queue with invalid concurrency
    expect(() => {
      queueModule.createQueue({ concurrency: -1 });
    }).not.toThrow();

    // Create a queued transport with invalid options (should default to valid ones)
    const transport = createQueuedTransport({
      queueOptions: { concurrency: 0 }, // Invalid concurrency
      transport: vi.fn() as any,
    });

    expect(transport).toBeDefined();
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should handle concurrent queue operations", async () => {
      // Use real queue implementation for this test
      vi.restoreAllMocks();

      let completedCount = 0;
      let processingCount = 0;

      // Create a transport that takes some time to complete
      const delayedTransport = vi.fn(async () => {
        processingCount++;
        await new Promise(resolve => globalThis.setTimeout(resolve, 50));
        completedCount++;
        processingCount--;
        return { result: "success" };
      });

      const transport = createQueuedTransport({
        queueOptions: { concurrency: 2 },
        transport: delayedTransport as any,
      });

      // Create the requests but don't wait for them yet
      const requests = [
        transport({ payload: { id: 1, jsonrpc: "2.0", method: "test" } } as any),
        transport({ payload: { id: 2, jsonrpc: "2.0", method: "test" } } as any),
        transport({ payload: { id: 3, jsonrpc: "2.0", method: "test" } } as any),
        transport({ payload: { id: 4, jsonrpc: "2.0", method: "test" } } as any),
      ];

      // Queue should immediately start processing the first 2 requests
      // But not finish them until the timer advances
      expect(processingCount).toBeLessThanOrEqual(2);
      expect(completedCount).toBe(0);

      // Advance time by 10ms to ensure first set is processing
      await vi.advanceTimersByTimeAsync(10);
      // Two requests should be in progress
      expect(processingCount).toBeLessThanOrEqual(2);

      // Advance time by 100ms to complete the first set and start the second set
      await vi.advanceTimersByTimeAsync(100);

      // Now all requests should be complete
      expect(completedCount).toBe(4);

      // Complete all promises
      await Promise.all(requests);

      // All transports should have been called
      expect(delayedTransport).toHaveBeenCalledTimes(4);
    });
  });
});
