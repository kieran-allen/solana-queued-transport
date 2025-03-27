import PQueue from "p-queue";

export type QueueOptions = Partial<{
  autoStart: boolean
  carryoverConcurrencyCount: boolean
  concurrency: number
  interval: number
  intervalCap: number
}>;

export function createQueue({
  autoStart = true,
  carryoverConcurrencyCount = true,
  concurrency = 1,
  interval = 0,
  intervalCap = 1,
}: QueueOptions): PQueue {
  return new PQueue({
    autoStart,
    carryoverConcurrencyCount,
    concurrency,
    interval,
    intervalCap,
  });
}
