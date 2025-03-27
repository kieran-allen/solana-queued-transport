import { ClusterUrl } from "@solana/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as queueModule from "../queue";
import {
  createQueuedTransport,
  createQueuedTransportFromClusterUrl,
} from "../transport";

// Mock dependencies
vi.mock("@solana/kit", () => {
  return {
    createDefaultRpcTransport: vi.fn(() => mockTransport),
    isJsonRpcPayload: vi.fn((payload) => {
      return payload && typeof payload === "object" && "jsonrpc" in payload;
    }),
  };
});

// Create a mock transport
const mockTransport = vi.fn(async () => ({ result: "success" }));

// Create a mock queue
const mockQueue = {
  add: vi.fn(fn => fn()),
};

describe("createQueuedTransport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queueModule, "createQueue").mockReturnValue(mockQueue as any);
  });

  it("should create a proxied transport", () => {
    const transport = createQueuedTransport({
      transport: mockTransport as any,
    });
    expect(typeof transport).toBe("function");
  });

  it("should call createQueue with provided options", () => {
    const queueOptions = { concurrency: 5 };
    createQueuedTransport({
      queueOptions,
      transport: mockTransport as any,
    });

    expect(queueModule.createQueue).toHaveBeenCalledWith(queueOptions);
  });

  it("should queue JSON-RPC requests", async () => {
    const transport = createQueuedTransport({
      transport: mockTransport as any,
    });
    const jsonRpcPayload = {
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "test",
        params: [],
      },
    };

    await transport(jsonRpcPayload as any);

    expect(mockQueue.add).toHaveBeenCalled();
    expect(mockTransport).toHaveBeenCalledWith(jsonRpcPayload);
  });

  it("should not queue non-JSON-RPC requests", async () => {
    const transport = createQueuedTransport({
      transport: mockTransport as any,
    });
    const nonJsonRpcPayload = { payload: { foo: "bar" } };

    await transport(nonJsonRpcPayload as any);

    expect(mockQueue.add).not.toHaveBeenCalled();
    expect(mockTransport).toHaveBeenCalledWith(nonJsonRpcPayload);
  });
});

describe("createQueuedFromClusterUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queueModule, "createQueue").mockReturnValue(mockQueue as any);
  });

  it("should create a queued transport from a cluster URL", () => {
    const clusterUrl = "https://api.mainnet-beta.solana.com" as ClusterUrl;
    const queueOptions = { concurrency: 3 };

    const transport = createQueuedTransportFromClusterUrl(clusterUrl, queueOptions);

    expect(typeof transport).toBe("function");
  });
});
