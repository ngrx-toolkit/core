import { EventCreator, event } from '@ngrx/signals/events';
import { currentActionNames } from './internal/current-action-names';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackedEvent<Type extends string>(
  type: Type,
): EventCreator<Type, void>;

export function trackedEvent<Type extends string, Payload>(
  type: Type,
  payload: Payload,
): EventCreator<Type, Payload>;
export function trackedEvent(type: string): EventCreator<string, any> {
  const originalEvent = event(type);
  const proxiedCreator = new Proxy(originalEvent, {
    apply(target, thisArg, argArray) {
      currentActionNames.add(type);
      return Reflect.apply(target, thisArg, argArray);
    },
  });

  (proxiedCreator as any).type = type;

  return proxiedCreator;
}
