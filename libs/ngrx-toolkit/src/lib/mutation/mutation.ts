import { Signal } from '@angular/core';

export type MutationResult<Result, Err = unknown> =
  | {
      status: 'success';
      value: Result;
    }
  | {
      status: 'error';
      error: Err;
    }
  | {
      status: 'aborted';
    };

export type MutationStatus = 'idle' | 'pending' | 'error' | 'success';

export type Mutation<Parameter, Result, Err = unknown> = {
  (params: Parameter): Promise<MutationResult<Result, Err>>;
  status: Signal<MutationStatus>;
  value: Signal<Result | undefined>;
  isPending: Signal<boolean>;
  isSuccess: Signal<boolean>;
  error: Signal<Err | undefined>;
  hasValue(): this is Mutation<Exclude<Parameter, undefined>, Result, Err>;
};
