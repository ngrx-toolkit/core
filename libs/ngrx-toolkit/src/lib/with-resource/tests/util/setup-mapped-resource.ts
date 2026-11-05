import {
  ErrorHandling,
  mapToResource,
  ResourceNames,
} from '../../../with-resource';
import { ResourceTestAdapter } from './resource-test-adapter';
import { setupNamedResource } from './setup-named-resource';

export function setupMappedResource(
  errorHandling: ErrorHandling,
): ResourceTestAdapter {
  const { addressResolver, setId, setValue, store } =
    setupNamedResource(errorHandling);

  const resource = mapToResource(
    store,
    'address' as ResourceNames<Record<string, unknown>>,
  );

  return {
    addressResolver,
    setId,
    setValue,
    getValue: () => resource.value(),
    getMetadata: () => ({
      status: resource.status(),
      error: resource.error(),
      isLoading: resource.isLoading(),
      hasValue: resource.hasValue(),
    }),
  };
}
