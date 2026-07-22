import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  patchState,
  signalStore,
  signalStoreFeature,
  type,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  Dispatcher,
  eventGroup,
  Events,
  on,
  withEventHandlers,
} from '@ngrx/signals/events';
import { delay, tap } from 'rxjs';
import { withDisabledNameIndices } from '../features/with-disabled-name-indicies';
import { withGlitchTracking } from '../features/with-glitch-tracking';
import { updateState } from '../update-state';
import { withDevToolsStub } from '../with-dev-tools-stub';
import { withDevtools } from '../with-devtools';
import { withTrackedReducer } from '../with-tracked-reducer';
import { setupExtensions } from './helpers.spec';

const testEvents = eventGroup({
  source: 'Spec Store',
  events: {
    bump: type<void>(),
    bookSelected: type<{ bookId: string }>(),
  },
});

describe('withTrackedReducer', () => {
  it('should send a glitched update on event', async () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withTrackedReducer(
        on(testEvents.bump, (_, state) => ({ count: state.count + 1 })),
      ),
    );
    TestBed.inject(Store);

    dispatchBumpEvent();

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: '[Spec Store] bump' },
      { store: { count: 1 } },
    );
  });

  it('should emit two glitched updates when two stores react to the same event', async () => {
    const { sendSpy, withBasicStore } = setup();
    const StoreA = signalStore(
      { providedIn: 'root' },
      withBasicStore('store-a'),
      withTrackedReducer(
        on(testEvents.bump, (_, state) => ({ count: state.count + 1 })),
      ),
    );
    const StoreB = signalStore(
      { providedIn: 'root' },
      withBasicStore('store-b'),
      withTrackedReducer(
        on(testEvents.bump, (_, state) => ({ count: state.count + 1 })),
      ),
    );
    TestBed.inject(StoreA);
    TestBed.inject(StoreB);

    dispatchBumpEvent();

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: '[Spec Store] bump' },
      { 'store-a': { count: 1 }, 'store-b': { count: 1 } },
    );
  });

  it('should send event payload to devtools when using tracked reducer', () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withTrackedReducer(
        on(testEvents.bookSelected, ({ payload }) => ({
          count: Number(payload.bookId),
        })),
      ),
    );

    TestBed.inject(Store);

    dispatchBookSelectedEvent('42');

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: '[Spec Store] bookSelected', payload: { bookId: '42' } },
      { store: { count: 42 } },
    );
  });

  it('should distinguish between two synchronous state changes in reducer and normal patchState', () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withTrackedReducer(
        on(testEvents.bump, (_, state) => ({ count: state.count + 1 })),
      ),
      withMethods((store) => ({
        bump: () => patchState(store, (state) => ({ count: state.count + 1 })),
      })),
    );
    const store = TestBed.inject(Store);

    dispatchBumpEvent();
    store.bump();

    const [lastButOneCall, lastCall] = sendSpy.mock.calls.slice(-2);
    expect(lastButOneCall).toEqual([
      { type: '[Spec Store] bump' },
      { store: { count: 1 } },
    ]);
    expect(lastCall).toEqual([
      { type: 'Store Update' },
      { store: { count: 2 } },
    ]);
  });

  // This could be more common than we think
  it('should not use action name if no reducer is used', () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withMethods((store) => ({
        bump: () => patchState(store, (state) => ({ count: state.count + 1 })),
      })),
    );

    const store = TestBed.inject(Store);
    dispatchBumpEvent();
    store.bump();

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: 'Store Update' },
      { store: { count: 1 } },
    );
  });

  it('should not label a synchronous patch in an event handler (event tracking only on reducer level)', async () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withState({ count: 0 }),
      withEventHandlers((store, events = inject(Events)) => [
        events
          .on(testEvents.bump)
          .pipe(
            tap(() =>
              patchState(store, (state) => ({ count: state.count + 1 })),
            ),
          ),
      ]),
    );

    TestBed.inject(Store);
    dispatchBumpEvent();

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: 'Store Update' },
      { store: { count: 1 } },
    );
  });

  it('should not label an async patch in the event handler', async () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withEventHandlers((store, events = inject(Events)) => [
        events.on(testEvents.bump).pipe(
          delay(0),
          tap(() => patchState(store, (state) => ({ count: state.count + 1 }))),
        ),
      ]),
    );

    TestBed.inject(Store);
    dispatchBumpEvent();
    await new Promise((resolve) => setTimeout(resolve));

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: 'Store Update' },
      { store: { count: 1 } },
    );
  });

  it('should use updateState action name in event handler if used', () => {
    const { sendSpy, withBasicStore } = setup();

    const Store = signalStore(
      { providedIn: 'root' },
      withBasicStore('store'),
      withEventHandlers((store, events = inject(Events)) => [
        events
          .on(testEvents.bump)
          .pipe(tap(() => updateState(store, 'Bump', { count: 1 }))),
      ]),
    );

    TestBed.inject(Store);
    dispatchBumpEvent();

    expect(sendSpy).toHaveBeenLastCalledWith(
      { type: 'Bump' },
      { store: { count: 1 } },
    );
  });

  describe('devtools checks', () => {
    it('should fail if `withDevtools` is not used', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withState({ count: 0 }),
        withTrackedReducer(),
      );
      expect(() => TestBed.inject(Store)).toThrow(
        `In order to use withTrackedReducer, you must first enable the devtools feature via withDevtools('[your store name]', withGlitchTracking())`,
      );
    });

    it('should fail during runtime if `withDevtools` is missing glitched tracking', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withDevtools('store'),
        withTrackedReducer(),
      );
      expect(() => TestBed.inject(Store)).toThrow(
        `In order to use withTrackedReducer, you must first enable the glitch tracking devtools feature via withDevtools('[your store name]', withGlitchTracking())`,
      );
    });

    it('should succeed if `withDevtools` is used with glitched tracking', () => {
      // In order to have a type-safe test
      const Store = signalStore(
        { providedIn: 'root' },
        withDevtools('store', withGlitchTracking()),
        withTrackedReducer(),
      );
      expect(() => TestBed.inject(Store)).not.toThrow();
    });

    it('should also work with multiple devtools features', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withDevtools('store', withGlitchTracking(), withDisabledNameIndices()),
        withTrackedReducer(),
      );
      expect(() => TestBed.inject(Store)).not.toThrow();
    });

    it('should not throw with stubbed devtools', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withDevToolsStub('store'),
        withTrackedReducer(),
      );
      expect(() => TestBed.inject(Store)).not.toThrow();
    });
  });
});

function dispatchBumpEvent() {
  TestBed.inject(Dispatcher).dispatch(testEvents.bump());
}

function dispatchBookSelectedEvent(bookId: string) {
  TestBed.inject(Dispatcher).dispatch(testEvents.bookSelected({ bookId }));
}

function setup() {
  const { sendSpy } = setupExtensions();

  function withBasicStore(name: string) {
    return signalStoreFeature(
      withDevtools(name, withGlitchTracking(), withDisabledNameIndices()),
      withState({ count: 0 }),
    );
  }
  return { sendSpy, withBasicStore };
}
