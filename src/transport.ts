import {
  ClusterUrl,
  createDefaultRpcTransport,
  isJsonRpcPayload,
  RpcTransportFromClusterUrl,
} from "@solana/kit";

import { createQueue, QueueOptions } from "./queue";

type CreateQueuedTransportOptions<T extends ClusterUrl> = {
  queueOptions?: QueueOptions
  transport: RpcTransportFromClusterUrl<T>
};

export function createQueuedTransport<T extends ClusterUrl>({
  queueOptions = {},
  transport,
}: CreateQueuedTransportOptions<T>) {
  const q = createQueue(queueOptions);
  return new Proxy(transport, {
    apply(target, thisArg, argArray) {
      const maybeJsonArgs = argArray[0].payload;
      if (isJsonRpcPayload(maybeJsonArgs)) {
        return q.add(() => Reflect.apply(target, thisArg, argArray), {});
      }
      return Reflect.apply(target, thisArg, argArray);
    },
  });
}

export function createQueuedTransportFromClusterUrl<T extends ClusterUrl>(
  clusterUrl: T,
  queueOptions?: QueueOptions,
) {
  return createQueuedTransport({
    queueOptions,
    transport: createDefaultRpcTransport({ url: clusterUrl }),
  });
}
