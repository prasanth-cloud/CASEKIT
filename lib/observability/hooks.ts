import type { SafeErrorEvent, SafeProductEvent } from "./privacy";

export type ObservabilityHooks = {
  captureError: (event: SafeErrorEvent) => void;
  track: (event: SafeProductEvent) => void;
};

const noop = () => undefined;

export function createObservabilityHooks(overrides: Partial<ObservabilityHooks> = {}): ObservabilityHooks {
  return {
    captureError: overrides.captureError ?? noop,
    track: overrides.track ?? noop,
  };
}

export const disabledObservabilityHooks = createObservabilityHooks();
