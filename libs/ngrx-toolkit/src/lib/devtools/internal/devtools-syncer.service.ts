import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { StateSource } from '@ngrx/signals';
import { REDUX_DEVTOOLS_CONFIG } from '../provide-devtools-config';
import { currentActionNames } from './current-action-names';
import { DevtoolsInnerOptions } from './devtools-feature';
import { Action, Connection, StoreRegistry, Tracker } from './models';

const dummyConnection: Connection = {
  send: () => void true,
};

function toDevtoolsAction(actions: (string | Action)[]): Action {
  if (!actions.length) {
    return { type: 'Store Update' } as Action;
  }

  const objects = actions.filter((a): a is Action => typeof a === 'object');
  const type = [
    ...new Set(actions.map((a) => (typeof a === 'string' ? a : a.type))),
  ].join(', ');

  return objects.length
    ? ({ ...objects[0], type } as Action)
    : ({ type } as Action);
}

/**
 * A service provided by the root injector is
 * required because the synchronization runs
 * globally.
 *
 * The SignalStore could be provided in a component.
 * If the effect starts in the injection
 * context of the SignalStore, the complete sync
 * process would shut down once the component gets
 * destroyed.
 */
@Injectable({ providedIn: 'root' })
export class DevtoolsSyncer implements OnDestroy {
  /**
   * Stores all SignalStores that are connected to the
   * DevTools along their options, names and id.
   */
  #stores: StoreRegistry = {};
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #trackers = [] as Tracker[];
  readonly #devtoolsConfig = {
    name: 'NgRx SignalStore',
    ...inject(REDUX_DEVTOOLS_CONFIG, { optional: true }),
  };

  /**
   * Maintains the current states of all stores to avoid conflicts
   * between glitch-free and glitched trackers when used simultaneously.
   *
   * The challenge lies in ensuring that glitched trackers do not
   * interfere with the synchronization process of glitch-free trackers.
   * Specifically, glitched trackers could cause the synchronization to
   * read the current state of stores managed by glitch-free trackers.
   *
   * Therefore, the synchronization process doesn't read the state from
   * each store, but relies on #currentState.
   *
   * Please note, that here the key is the name and not the id.
   */
  #currentState: Record<string, object> = {};
  #currentId = 1;

  readonly #connection: Connection = inject(NgZone).runOutsideAngular(() =>
    this.#isBrowser
      ? window.__REDUX_DEVTOOLS_EXTENSION__
        ? window.__REDUX_DEVTOOLS_EXTENSION__.connect(this.#devtoolsConfig)
        : dummyConnection
      : dummyConnection,
  );

  constructor() {
    if (!this.#isBrowser) {
      return;
    }
  }

  ngOnDestroy(): void {
    currentActionNames.clear();
  }

  syncToDevTools(changedStatePerId: Record<string, object>) {
    const mappedChangedStatePerName = Object.entries(changedStatePerId).reduce(
      (acc, [id, store]) => {
        const { options, name } = this.#stores[id];
        acc[name] = options.map(store);
        return acc;
      },
      {} as Record<string, object>,
    );
    this.#currentState = {
      ...this.#currentState,
      ...mappedChangedStatePerName,
    };

    const actions = Array.from(currentActionNames);
    const action = toDevtoolsAction(actions);
    currentActionNames.clear();

    this.#connection.send(action, this.#currentState);
  }

  getNextId() {
    return String(this.#currentId++);
  }

  /**
   * Consumer provides the id. That is because we can only start
   * tracking the store in the init hook.
   * Unfortunately, methods for renaming having the final id
   * need to be defined already before.
   * That's why `withDevtools` requests first the id and
   * then registers itself later.
   */
  addStore(
    id: string,
    name: string,
    store: StateSource<object>,
    options: DevtoolsInnerOptions,
  ) {
    let storeName = name;
    const names = Object.values(this.#stores).map((store) => store.name);

    if (names.includes(storeName)) {
      // const { options } = throwIfNull(
      //   Object.values(this.#stores).find((store) => store.name === storeName)
      // );
      if (!options.indexNames) {
        throw new Error(`An instance of the store ${storeName} already exists. \
Enable automatic indexing via withDevTools('${storeName}', { indexNames: true }), or rename it upon instantiation.`);
      }
    }

    for (let i = 1; names.includes(storeName); i++) {
      storeName = `${name}-${i}`;
    }
    this.#stores[id] = { name: storeName, options };

    const tracker = options.tracker;
    if (!this.#trackers.includes(tracker)) {
      this.#trackers.push(tracker);
    }

    tracker.onChange((changedState) => this.syncToDevTools(changedState));
    tracker.track(id, store);
  }

  removeStore(id: string) {
    const name = this.#stores[id].name;
    this.#stores = Object.entries(this.#stores).reduce(
      (newStore, [storeId, value]) => {
        if (storeId !== id) {
          newStore[storeId] = value;
        }
        return newStore;
      },
      {} as StoreRegistry,
    );

    this.#currentState = Object.entries(this.#currentState).reduce(
      (newState, [storeName, state]) => {
        if (storeName !== name) {
          newState[storeName] = state;
        }
        return newState;
      },
      {} as Record<string, object>,
    );

    for (const tracker of this.#trackers) {
      tracker.removeStore(id);
    }
  }

  /**
   * Renames a store identified by its internal id. If the store has already
   * been removed (e.g. due to component destruction), this is a no-op.
   */
  renameStore(id: string, newName: string) {
    const storeEntry = this.#stores[id];
    if (!storeEntry) {
      return;
    }
    const oldName = storeEntry.name;

    if (oldName === newName) {
      return;
    }

    const otherStoreNames = Object.entries(this.#stores)
      .filter(([entryId]) => entryId !== id)
      .map(([, s]) => s.name);
    if (otherStoreNames.includes(newName)) {
      throw new Error(
        `NgRx Toolkit/DevTools: cannot rename from ${oldName} to ${newName}. ${newName} is already assigned to another SignalStore instance.`,
      );
    }

    this.#stores = Object.entries(this.#stores).reduce(
      (newStore, [entryId, value]) => {
        if (entryId === id) {
          newStore[entryId] = { ...value, name: newName };
        } else {
          newStore[entryId] = value;
        }
        return newStore;
      },
      {} as StoreRegistry,
    );

    // we don't rename in #currentState but wait for tracker to notify
    // us with a changed state that contains that name.
    this.#currentState = Object.entries(this.#currentState).reduce(
      (newState, [storeName, state]) => {
        if (storeName !== oldName) {
          newState[storeName] = state;
        }
        return newState;
      },
      {} as Record<string, object>,
    );

    this.#trackers.forEach((tracker) => tracker.notifyRenamedStore(id));
  }
}
