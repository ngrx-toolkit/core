import { ResourceStatus } from '@angular/core';
import { Address } from './fixtures';

export type ResourceTestAdapter = {
  addressResolver: { resolve: jest.Mock };
  setId: (id: number) => void;
  setValue: (value: Address) => void;
  getValue: () => Address | undefined;
  getMetadata: () => {
    status: ResourceStatus;
    error: Error | undefined;
    isLoading: boolean;
    hasValue: boolean;
  };
};

export type ReloadableResourceTestAdapter = ResourceTestAdapter & {
  reload: () => void;
};
