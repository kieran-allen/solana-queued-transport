import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueuedTransportFromClusterUrl } from "../transport";

// Mock transport
const mockTransport = vi.fn(async (args) => {
  const { payload } = args;
  if (payload.method === "getBalance") {
    return { result: 100 };
  }
  if (payload.method === "getAccountInfo") {
    return { result: { data: "test-data" } };
  }
  return { result: "success" };
});

// Mock dependencies
vi.mock("@solana/kit", () => {
  return {
    createDefaultRpcTransport: vi.fn(() => mockTransport),
    isJsonRpcPayload: vi.fn((payload) => {
      return payload && typeof payload === "object" && "jsonrpc" in payload;
    }),
  };
});

describe("Integration tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle multiple queued RPC requests", async () => {
    const clusterUrl = "https://api.mainnet-beta.solana.com" as any;
    const transport = createQueuedTransportFromClusterUrl(clusterUrl, { concurrency: 2 });

    const requests = [
      transport({ payload: { id: 1, jsonrpc: "2.0", method: "getBalance", params: ["address1"] } }),
      transport({ payload: { id: 2, jsonrpc: "2.0", method: "getAccountInfo", params: ["address2"] } }),
      transport({ payload: { id: 3, jsonrpc: "2.0", method: "getSlot", params: [] } }),
    ];

    const results = await Promise.all(requests);

    expect(results).toEqual([
      { result: 100 },
      { result: { data: "test-data" } },
      { result: "success" },
    ]);

    expect(mockTransport).toHaveBeenCalledTimes(3);
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should correctly batch requests according to concurrency settings", async () => {
      // Create a queue with concurrency of 1 to test sequential execution
      const clusterUrl = "https://api.mainnet-beta.solana.com" as any;
      const transport = createQueuedTransportFromClusterUrl(clusterUrl, { concurrency: 1 });

      const executionOrder: number[] = [];

      // Reset the mock implementation
      mockTransport.mockReset();

      // Create a new mock implementation with delays to test concurrency
      mockTransport.mockImplementation(async (args) => {
        const { payload } = args;

        // Add a delay using setTimeout
        await new Promise(resolve => globalThis.setTimeout(resolve, 10));

        // Record the execution order
        executionOrder.push(payload.id);

        return { result: "success" };
      });

      // Start the requests
      const requests = [
        transport({ payload: { id: 1, jsonrpc: "2.0", method: "getBalance", params: ["address1"] } }),
        transport({ payload: { id: 2, jsonrpc: "2.0", method: "getAccountInfo", params: ["address2"] } }),
        transport({ payload: { id: 3, jsonrpc: "2.0", method: "getSlot", params: [] } }),
      ];

      // Advance time for first request
      vi.advanceTimersByTime(10);
      await vi.runOnlyPendingTimersAsync();

      // Advance time for second request
      vi.advanceTimersByTime(10);
      await vi.runOnlyPendingTimersAsync();

      // Advance time for third request
      vi.advanceTimersByTime(10);
      await vi.runOnlyPendingTimersAsync();

      // Complete all promises
      await Promise.all(requests);

      // With concurrency of 1, requests should be processed in order
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  it("should not queue non-JSON-RPC requests", async () => {
    const clusterUrl = "https://api.mainnet-beta.solana.com" as any;
    const transport = createQueuedTransportFromClusterUrl(clusterUrl);

    // Reset the mock implementation
    mockTransport.mockReset();
    mockTransport.mockImplementation(async () => {
      return { result: "success" };
    });

    // Non-JSON-RPC request
    await transport({ payload: { foo: "bar" } });

    // JSON-RPC request
    await transport({ payload: { id: 1, jsonrpc: "2.0", method: "getBalance", params: [] } });

    // The non-JSON-RPC request should bypass the queue
    expect(mockTransport).toHaveBeenCalledTimes(2);
  });
});
