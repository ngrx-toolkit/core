import { EventCreator, eventGroup } from '@ngrx/signals/events';
import { Prettify } from '../shared/prettify';
import { currentActionNames } from './internal/current-action-names';

/* eslint-disable @typescript-eslint/no-explicit-any */
type EventType<
  Source extends string,
  EventName extends string,
> = `[${Source}] ${EventName}`;

type EventCreatorGroup<
  Source extends string,
  Events extends Record<string, any>,
> = {
  readonly [EventName in keyof Events]: EventName extends string
    ? EventCreator<EventType<Source, EventName>, Events[EventName]>
    : never;
};
export function trackedEventGroup<
  Source extends string,
  Events extends Record<string, unknown>,
>(config: {
  source: Source;
  events: Events;
}): Prettify<EventCreatorGroup<Source, Events>> {
  const group = eventGroup(config);

  return new Proxy<Prettify<EventCreatorGroup<Source, Events>>>(group, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        const returnFunc = (...args: unknown[]) => {
          const type = value.type as string;
          currentActionNames.add(type);
          return (value as any)(...args);
        };
        returnFunc.type = value.type;
        return returnFunc;
      }

      return value;
    },
  });
}
