import {
  patchState as originalPatchState,
  PartialStateUpdater,
  WritableStateSource,
} from '@ngrx/signals';
import { currentActionNames } from './internal/current-action-names';
import { Action } from './internal/models';

type PatchFn = typeof originalPatchState extends (
  arg1: infer First,
  ...args: infer Rest
) => infer Returner
  ? (state: First, action: string, ...rest: Rest) => Returner
  : never;

/**
 * @deprecated Has been renamed to `updateState`
 */
export const patchState: PatchFn = (state, action, ...rest) => {
  updateState(state, action, ...rest);
};

/**
 * Casts an object with a `type` property to an {@link Action}.
 * Use this when you need to pass a structured action object to {@link updateState}.
 */
export function asAction<T extends { type: string }>(value: T): Action {
  return value as unknown as Action;
}

/**
 * Wrapper of `patchState` for DevTools integration. Next to updating the state,
 * it also sends the action to the DevTools.
 * @param stateSource state of Signal Store
 * @param action name of action how it will show in DevTools
 * @param updaters updater functions or objects
 */
export function updateState<State extends object>(
  stateSource: WritableStateSource<State>,
  action: string | Action,
  ...updaters: Array<
    Partial<NoInfer<State>> | PartialStateUpdater<NoInfer<State>>
  >
): void {
  currentActionNames.add(action);
  return originalPatchState(stateSource, ...updaters);
}
