import { JsonPipe } from '@angular/common';
import { httpResource, HttpResourceRef } from '@angular/common/http';
import {
  Component,
  effect,
  inject,
  Resource,
  ResourceStatus,
  Signal,
} from '@angular/core';
import { withResource } from '@ngrx-toolkit/core';
import { signalStore, withState } from '@ngrx/signals';
import { Flight } from '../shared/flight';

const url = 'https://demo.angulararchitects.io/api/flight?from=Paris&to=';

export const FlightStore = signalStore(
  withState({ flightTo: 'New York' }),
  withResource(({ flightTo }) =>
    httpResource<Flight[]>(() => `${url}${flightTo()}`),
  ),
  withResource(
    ({ flightTo }) => ({
      list: httpResource<Flight[]>(() => `${url}${flightTo()}`, {
        defaultValue: [],
      }),
    }),
    { errorHandling: 'native' },
  ),
);

@Component({
  selector: 'demo-with-resource',
  imports: [JsonPipe],
  templateUrl: './with-resource.component.html',
  providers: [FlightStore],
})
export class WithResourceComponent {
  store = inject(FlightStore);

  constructor() {
    effect(() => {
      // Four things
      // 1 - The largest benefit/requirement: declarative, simple to understand resource prop that can only patch the value state (can still reload if present)
      // 2 - Modest enhancement followup: type a bit less verbose than at this current point
      // 3 - PROPOSAL - stable NgRx `withResource` does not retain derived state other than the value
      // 4 - PROPOSAL - drop errorHandling from stable NgRx `withResource` in favor of `extendResource`
      //
      // (1) What is possible / practical now - direct resource prop that must patch value (can still reload if present)
      //     Can jump directly to the resource :) since there is more than the derived values. This is HUGE.
      //     In this current moment, we still preserve the derived values. IMO for the Toolkit,
      //     it makes sense to keep them. But for NgRx itself, IMO only keep derived, patchable value.
      //
      //     Now in this branch we have a normal, familiar resource experience while the value patching
      //     is still only possible in the store from the derived value.
      //     Not only is only having access to every single derived piece of state a bit too abstract and not as intuitive,
      //     it is also frustrating to not be able to jump to the definition. I have heard this from
      //     teammates and other users. And people who are not used to resources have added friction,
      //     as the full experience of drilling into a resource and its type is lost with the derived values.
      //     When I instead did a step inbetween the current `withResource` and this branch, aka I made a following
      //     block with a `withProps` that did `return {listResource: mapToResource(store, 'list')`}`, my
      //     teammates found that so much more understandable and easier to get to the definition of the resource.
      //
      //     Overall:
      //     (a) More declarative to go back to the definition
      //     (b) Less noise and indirection from derived values
      //     (c) Transferable to normal resource experience BUT
      //     (d) Still can only update the value w/the derived value by `patchState`
      //     (e) Reload is still exposed if it was apart of the existing resource
      //     (f) Outstanding question: what about unnamed resources?
      const listResourceAccess: Omit<
        HttpResourceRef<Flight[]>,
        'value' | 'set' | 'update'
      > &
        Resource<Flight[]> = this.store.list;
      //
      // Direct value access from resoruce prop
      const value: Signal<Flight[]> = listResourceAccess.value;
      //
      // The one derived type left
      const valueDerived: Signal<Flight[]> = this.store.listValue;
      //
      // (2) Proposal for less verbose type
      //     I imagine we could make a custom type to be less verbose...
      //     WithResource<HttpResourceRef<Flight[]>>?
      //     While the `Ref` of `HttpResoruceRef` may make `value/set/update` seem tangible
      //     to use, I think if we clearly explain that `WithResource` would stip those away from
      //     the access to the resource prop, then this would be as straight forward as possible IMO.
      const listResourceType: Omit<
        HttpResourceRef<Flight[]>,
        'value' | 'set' | 'update'
      > &
        Resource<Flight[]> = this.store.list;
      //
      // (3) PROPOSAL Drop all derived values other than the `namedValue()` for NgRx's stable implementation. Only left in for Toolkit legacy.
      // The derived types add a ton of noise to the store's state, and creates a branch away from the better way to access values directly from
      // the resource that is derived as a prop. Deriving the `namedValue()` still makes sense as it is a special patchable state for the store.
      // This also would save maintaining complexity.
      const listResourceDerived = this.store.list;
      //
      // PROPOSED - Goes away for stable NgRx `withResource`, left for Toolkit legacy
      // @ts-\expect-\error Would not work
      const listResourceDerivedStatusDerivedStatus: Signal<ResourceStatus> =
        this.store.listStatus;
      // Kept :) for stable NgRx `withResource`
      const listResourceDerivedStatusPropsStatus: Signal<ResourceStatus> =
        listResourceDerived.status;
      //
      // Applies to all other derived values except the value.
      // ??? Maybe go as far as make the derived value private to the store ???
      //
      // (4) PROPOSAL - drop error handling for the stable NgRx `withResource` in favor of `extendResource`
      // `extendResource` is great and handles the error behavior well, for all resources or on case by case basis.
      // The Toolkit error handling is fine to keep it for legacy reasons.
      // But the typing gets much harder and unintuitive with the error handling and extended resources.
      // Toolkit users with extended resources would have to opt into native error handling, but I say for stable it is
      // just dropped and if a user wants it they use extended resource wrapper.
      // This also would save maintaining complexity.
    });
  }
}
