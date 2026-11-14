export { withDisabledNameIndices } from './lib/devtools/features/with-disabled-name-indicies';
export { withGlitchTracking } from './lib/devtools/features/with-glitch-tracking';
export { withMapper } from './lib/devtools/features/with-mapper';
export {
  ReduxDevtoolsConfig,
  provideDevtoolsConfig,
} from './lib/devtools/provide-devtools-config';
export { renameDevtoolsName } from './lib/devtools/rename-devtools-name';
export { trackedEvent } from './lib/devtools/tracked-event';
export { trackedEventGroup } from './lib/devtools/tracked-event-group';
export { patchState, updateState } from './lib/devtools/update-state';
export { withDevToolsStub } from './lib/devtools/with-dev-tools-stub';
export { DevtoolsFeature, withDevtools } from './lib/devtools/with-devtools';
export { withTrackedReducer } from './lib/devtools/with-tracked-reducer';
export {
  createEffects,
  createReducer,
  noPayload,
  payload,
  withRedux,
} from './lib/with-redux';

export { clearUndoRedo } from './lib/undo-redo/clear-undo-redo';
export * from './lib/undo-redo/with-undo-redo';

export * from './lib/with-call-state';
export * from './lib/with-data-service';
export * from './lib/with-pagination';
export { setResetState, withReset } from './lib/with-reset';

export { withImmutableState } from './lib/immutable-state/with-immutable-state';
export { withIndexedDB } from './lib/storage-sync/features/with-indexed-db';

/**
 * @deprecated Use {@link withIndexedDB} instead.
 */
export { withIndexedDB as withIndexeddb } from './lib/storage-sync/features/with-indexed-db';
export {
  withLocalStorage,
  withSessionStorage,
} from './lib/storage-sync/features/with-local-storage';
export {
  SyncConfig,
  withStorageSync,
} from './lib/storage-sync/with-storage-sync';
export { emptyFeature, withConditional } from './lib/with-conditional';
export { withFeatureFactory } from './lib/with-feature-factory';

export * from './lib/mutation/rx-mutation';
export * from './lib/with-entity-resources';
export * from './lib/with-mutations';
export { mapToResource, withResource } from './lib/with-resource';

export {
  concatOp,
  exhaustOp,
  mergeOp,
  switchOp,
} from './lib/flattening-operator';

export * from './lib/mutation/http-mutation';
export { rxMutation } from './lib/mutation/rx-mutation';

export * from './lib/mutation/mutation';
