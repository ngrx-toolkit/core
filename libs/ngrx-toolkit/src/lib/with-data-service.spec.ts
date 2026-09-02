import { Injectable } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signalStore, type } from '@ngrx/signals';
import { EntityId, withEntities } from '@ngrx/signals/entities';
import { delay, firstValueFrom, Observable, of } from 'rxjs';
import { withCallState } from './with-call-state';
import { DataService, withDataService } from './with-data-service';

// Since the resulting shape of entities in the store is a matter of the implementing services of `dataServiceType`,
//     these tests are more so about verifying that each resulting method exists, with or without named collections.
// The expectations on the resulting shape of the data in the store following these tests merely asserts
//     that the store was patched in the right generic shape and with respective call states.

describe('withDataService', () => {
  it('should load from a service and set entities in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();
      expect(store.entities().length).toBe(0);

      store.load();
      tick();

      expect(store.entities().length).toBe(1);
    });
  }));
  it('should load from a service and set entities in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();
      expect(store.flightEntities().length).toBe(0);

      store.loadFlightEntities();
      tick();

      expect(store.flightEntities().length).toBe(1);
    });
  }));
  it('should load from a service and set entities in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();
      expect(store.entities().length).toBe(0);

      store.load();
      tick();

      expect(store.entities().length).toBe(1);
    });
  }));
  it('should load by ID from a service and set entities in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      store.loadById(2);

      tick();

      expect(store.current()).toEqual(createFlight({ id: 2 }));
    });
  }));
  it('should load by ID from a service and set entities in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      store.loadFlightById(2);

      tick();

      expect(store.currentFlight()).toEqual(createFlight({ id: 2 }));
    });
  }));
  it('should load by ID from a service and set entities in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      store.loadById(2);

      tick();

      expect(store.current()).toEqual(
        createFlightWithCustomId({ flightId: '2' })
      );
    });
  }));
  it('should create from a service and set an entity in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlight({ id: 3 }));

      tick();

      expect(store.entities().length).toBe(1);
      expect(store.current()).toEqual(createFlight({ id: 3 }));
    });
  }));
  it('should create from a service and set an entity in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      expect(store.flightEntities().length).toBe(0);

      store.createFlight(createFlight({ id: 3 }));

      tick();

      expect(store.flightEntities().length).toBe(1);
      expect(store.currentFlight()).toEqual(createFlight({ id: 3 }));
    });
  }));
  it('should create from a service and set an entity in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlightWithCustomId({ flightId: '3' }));

      tick();

      expect(store.entities().length).toBe(1);
      expect(store.current()).toEqual(
        createFlightWithCustomId({ flightId: '3' })
      );
    });
  }));
  it('should update from a service and update an entity in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlight({ id: 3, from: 'Wadena MN' }));
      tick();
      store.update(createFlight({ id: 3 }));
      tick();

      expect(store.current()).toEqual(createFlight({ id: 3 }));
    });
  }));
  it('should update from a service and update an entity in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      expect(store.flightEntities().length).toBe(0);

      store.createFlight(createFlight({ id: 3, from: 'Wadena MN' }));
      tick();
      store.updateFlight(createFlight({ id: 3 }));
      tick();

      expect(store.currentFlight()).toEqual(createFlight({ id: 3 }));
    });
  }));
  it('should update from a service and update an entity in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(
        createFlightWithCustomId({ flightId: '3', from: 'Wadena MN' })
      );
      tick();
      store.update(createFlightWithCustomId({ flightId: '3' }));
      tick();

      expect(store.current()).toEqual(
        createFlightWithCustomId({ flightId: '3' })
      );
    });
  }));
  it('should update all from a service and update all entities in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlight({ id: 3, from: 'Wadena MN' }));
      store.create(createFlight({ id: 4, from: 'Wadena MN' }));
      tick();
      store.updateAll([createFlight({ id: 3 }), createFlight({ id: 4 })]);
      tick();
      expect(store.entities().length).toBe(2);
      expect(store.entities().at(0)).toEqual(createFlight({ id: 3 }));
      expect(store.entities().at(1)).toEqual(createFlight({ id: 4 }));
    });
  }));
  it('should update all from a service and update all entities in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      expect(store.flightEntities().length).toBe(0);

      store.createFlight(createFlight({ id: 3, from: 'Wadena MN' }));
      store.createFlight(createFlight({ id: 4, from: 'Wadena MN' }));
      tick();
      store.updateAllFlight([createFlight({ id: 3 }), createFlight({ id: 4 })]);
      tick();
      expect(store.flightEntities().length).toBe(2);
      expect(store.flightEntities().at(0)).toEqual(createFlight({ id: 3 }));
      expect(store.flightEntities().at(1)).toEqual(createFlight({ id: 4 }));
    });
  }));
  it('should update all from a service and update all entities in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(
        createFlightWithCustomId({ flightId: '3', from: 'Wadena MN' })
      );
      store.create(
        createFlightWithCustomId({ flightId: '4', from: 'Wadena MN' })
      );
      tick();
      store.updateAll([
        createFlightWithCustomId({ flightId: '3' }),
        createFlightWithCustomId({ flightId: '4' }),
      ]);
      tick();
      expect(store.entities().length).toBe(2);
      expect(store.entities().at(0)).toEqual(
        createFlightWithCustomId({ flightId: '3' })
      );
      expect(store.entities().at(1)).toEqual(
        createFlightWithCustomId({ flightId: '4' })
      );
    });
  }));
  it('should delete from a service and update that entity in the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlight({ id: 3 }));
      tick();
      expect(store.entities().length).toBe(1);
      expect(store.entities().at(0)).toEqual(createFlight({ id: 3 }));
      store.delete(createFlight({ id: 3 }));
      tick();
      expect(store.entities().length).toBe(0);
    });
  }));
  it('should delete from a service and update that entity in the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      expect(store.flightEntities().length).toBe(0);

      store.createFlight(createFlight({ id: 3 }));
      tick();
      expect(store.flightEntities().length).toBe(1);
      expect(store.flightEntities().at(0)).toEqual(createFlight({ id: 3 }));
      store.deleteFlight(createFlight({ id: 3 }));
      tick();
      expect(store.flightEntities().length).toBe(0);
    });
  }));
  it('should delete from a service and update that entity in the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      expect(store.entities().length).toBe(0);

      store.create(createFlightWithCustomId({ flightId: '3' }));
      tick();
      expect(store.entities().length).toBe(1);
      expect(store.entities().at(0)).toEqual(
        createFlightWithCustomId({ flightId: '3' })
      );
      store.delete(createFlightWithCustomId({ flightId: '3' }));
      tick();
      expect(store.entities().length).toBe(0);
    });
  }));
  it('should update the selected flight of the store', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      store.create(createFlight({ id: 3 }));
      expect(store.selectedEntities().length).toBe(0);

      store.updateSelected(3, true);

      tick();

      expect(store.selectedEntities().length).toBe(1);
      expect(store.selectedEntities()).toContainEqual(createFlight({ id: 3 }));
    });
  }));
  it('should update selected flight of the store (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      store.createFlight(createFlight({ id: 3 }));
      expect(store.selectedFlightEntities().length).toBe(0);

      store.updateSelectedFlightEntities(3, true);

      tick();

      expect(store.selectedFlightEntities().length).toBe(1);
      expect(store.selectedFlightEntities()).toContainEqual(
        createFlight({ id: 3 }),
      );
    });
  }));
  it('should update selected flight of the store (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      store.create(createFlightWithCustomId({ flightId: '3' }));
      expect(store.selectedEntities().length).toBe(0);

      store.updateSelected('3', true);

      tick();

      expect(store.selectedEntities().length).toBe(1);
      expect(store.selectedEntities()).toContainEqual(
        createFlightWithCustomId({ flightId: '3' })
      );
    });
  }));
  it('should update the filter of the service', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();

      tick();

      expect(store.filter()).toEqual({ from: 'Paris', to: 'New York' });

      store.updateFilter({ from: 'Wadena MN', to: 'New York' });

      tick();

      expect(store.filter()).toEqual({ from: 'Wadena MN', to: 'New York' });
    });
  }));
  it('should update the filter of the service (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();

      tick();

      expect(store.flightFilter()).toEqual({ from: 'Paris', to: 'New York' });

      store.updateFlightFilter({ from: 'Wadena MN', to: 'New York' });

      tick();

      expect(store.flightFilter()).toEqual({
        from: 'Wadena MN',
        to: 'New York',
      });
    });
  }));
  it('should update the filter of the service (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();

      tick();

      expect(store.filter()).toEqual({ from: 'Paris', to: 'New York' });

      store.updateFilter({ from: 'Wadena MN', to: 'New York' });

      tick();

      expect(store.filter()).toEqual({ from: 'Wadena MN', to: 'New York' });
    });
  }));
  it('should set the current entity', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new Store();
      tick();

      store.create(createFlight({ id: 3 }));

      store.setCurrent(createFlight({ id: 4 }));

      expect(store.current()).toEqual(createFlight({ id: 4 }));
    });
  }));
  it('should set the current entity (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollection();
      tick();

      store.createFlight(createFlight({ id: 3 }));

      store.setCurrentFlight(createFlight({ id: 4 }));

      expect(store.currentFlight()).toEqual(createFlight({ id: 4 }));
    });
  }));
  it('should set the current entity (with named selectId)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithSelectId();
      tick();

      store.create(createFlightWithCustomId({ flightId: '3' }));

      store.setCurrent(createFlightWithCustomId({ flightId: '4' }));

      expect(store.current()).toEqual(
        createFlightWithCustomId({ flightId: '4' })
      );
    });
  }));

  it('handles loading state', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreForLoading();
      tick();

      expect(store.loading()).toBe(false);

      store.create(createFlight({ id: 3 }));
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);

      store.load();
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);

      store.loadById(3);
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);

      store.update(createFlight({ id: 3 }));
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);

      store.updateAll([createFlight({ id: 3 }), createFlight({ id: 4 })]);
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);

      store.delete(createFlight({ id: 3 }));
      tick();
      expect(store.loading()).toBe(true);
      tick(3);
      expect(store.loading()).toBe(false);
    });
  }));

  it('handles loading state (with named collection)', fakeAsync(() => {
    TestBed.runInInjectionContext(() => {
      const store = new StoreWithNamedCollectionForLoading();
      tick();

      expect(store.flightLoading()).toBe(false);

      store.createFlight(createFlight({ id: 3 }));
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);

      store.loadFlightEntities();
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);

      store.loadFlightById(3);
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);

      store.updateFlight(createFlight({ id: 3 }));
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);

      store.updateAllFlight([createFlight({ id: 3 }), createFlight({ id: 4 })]);
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);

      store.deleteFlight(createFlight({ id: 3 }));
      tick();
      expect(store.flightLoading()).toBe(true);
      tick(3);
      expect(store.flightLoading()).toBe(false);
    });
  }));

  it('should ensure that collection name is provided in callState ', () => {
    // @ts-expect-error should not allow `withCallState` without collection name if `withDataService` has it
    signalStore(
      withCallState(),
      withEntities({
        entity: type<Flight>(),
        collection: 'flight',
      }),
      withDataService({
        dataServiceType: MockFlightService,
        filter: { from: 'Paris', to: 'New York' },
        collection: 'flight',
      }),
    );
  });

  // TODO 3A: setting error state (without named collection)
  // TODO 3B: setting error state (with named collection)
});

// Test helpers
let currentFlightId = 0;
const createFlight = (flight: Partial<Flight> = {}) => ({
  ...{
    id: ++currentFlightId,
    from: 'Paris',
    to: 'New York',
    date: new Date().toDateString(),
    delayed: false,
  },
  ...flight,
});

let currentCustomFlightId = 0;
const createFlightWithCustomId = (
  flight: Partial<FlightWithCustomId> = {}
): FlightWithCustomId => ({
  flightId: `${++currentCustomFlightId}`,
  from: 'Paris',
  to: 'New York',
  date: new Date().toDateString(),
  delayed: false,
  ...flight,
});

type Flight = {
  id: number;
  from: string;
  to: string;
  date: string;
  delayed: boolean;
};

type FlightWithCustomId = Omit<Flight, 'id'> & { flightId: string };

type FlightFilter = {
  from: string;
  to: string;
};

@Injectable({
  providedIn: 'root',
})
class MockFlightService implements DataService<Flight, FlightFilter> {
  loadById(id: EntityId): Promise<Flight> {
    return firstValueFrom(this.findById('' + id));
  }

  create(entity: Flight): Promise<Flight> {
    return firstValueFrom(this.save(entity));
  }

  update(entity: Flight): Promise<Flight> {
    return firstValueFrom(this.save(entity));
  }

  updateAll(entity: Flight[]): Promise<Flight[]> {
    return firstValueFrom(of(entity));
  }

  delete(entity: Flight): Promise<void> {
    return firstValueFrom(this.remove(entity));
  }

  load(filter: FlightFilter): Promise<Flight[]> {
    return firstValueFrom(this.find(filter.from, filter.to));
  }

  private find(_from: string, _to: string): Observable<Flight[]> {
    return of([createFlight()]);
  }

  private findById(id: string): Observable<Flight> {
    return of(createFlight({ id: Number(id) }));
  }

  private save(flight: Flight): Observable<Flight> {
    return of(flight);
  }

  private remove(_flight: Flight): Observable<void> {
    return of(undefined);
  }
}

@Injectable({
  providedIn: 'root',
})
class MockFlightWithSelectIdService
  implements DataService<FlightWithCustomId, FlightFilter>
{
  loadById(id: EntityId): Promise<FlightWithCustomId> {
    return firstValueFrom(this.findById('' + id));
  }

  create(entity: FlightWithCustomId): Promise<FlightWithCustomId> {
    return firstValueFrom(this.save(entity));
  }

  update(entity: FlightWithCustomId): Promise<FlightWithCustomId> {
    return firstValueFrom(this.save(entity));
  }

  updateAll(entity: FlightWithCustomId[]): Promise<FlightWithCustomId[]> {
    return firstValueFrom(of(entity));
  }

  delete(entity: FlightWithCustomId): Promise<void> {
    return firstValueFrom(this.remove(entity));
  }

  load(filter: FlightFilter): Promise<FlightWithCustomId[]> {
    return firstValueFrom(this.find(filter.from, filter.to));
  }

  private find(_from: string, _to: string): Observable<FlightWithCustomId[]> {
    return of([createFlightWithCustomId()]);
  }

  private findById(id: string): Observable<FlightWithCustomId> {
    return of(createFlightWithCustomId({ flightId: id }));
  }

  private save(flight: FlightWithCustomId): Observable<FlightWithCustomId> {
    return of(flight);
  }

  private remove(_flight: FlightWithCustomId): Observable<void> {
    return of(undefined);
  }
}

@Injectable({
  providedIn: 'root',
})
class MockFlightServiceForLoading implements DataService<Flight, FlightFilter> {
  loadById(id: EntityId): Promise<Flight> {
    return firstValueFrom(this.findById('' + id));
  }

  create(entity: Flight): Promise<Flight> {
    return firstValueFrom(this.save(entity));
  }

  update(entity: Flight): Promise<Flight> {
    return firstValueFrom(this.save(entity));
  }

  updateAll(entity: Flight[]): Promise<Flight[]> {
    return firstValueFrom(of(entity).pipe(delay(3)));
  }

  delete(entity: Flight): Promise<void> {
    return firstValueFrom(this.remove(entity));
  }

  load(filter: FlightFilter): Promise<Flight[]> {
    return firstValueFrom(this.find(filter.from, filter.to));
  }

  private find(_from: string, _to: string): Observable<Flight[]> {
    return of([createFlight({ id: 1 })]).pipe(delay(3));
  }

  private findById(id: string): Observable<Flight> {
    return of(createFlight({ id: Number(id) })).pipe(delay(3));
  }

  private save(flight: Flight): Observable<Flight> {
    return of(createFlight(flight)).pipe(delay(3));
  }

  private remove(_flight: Flight): Observable<void> {
    return of(undefined).pipe(delay(3));
  }
}

const Store = signalStore(
  withCallState(),
  withEntities<Flight>(),
  withDataService({
    dataServiceType: MockFlightService,
    filter: { from: 'Paris', to: 'New York' },
  }),
);
const StoreWithNamedCollection = signalStore(
  withCallState({
    collection: 'flight',
  }),
  withEntities({
    entity: type<Flight>(),
    collection: 'flight',
  }),
  withDataService({
    dataServiceType: MockFlightService,
    filter: { from: 'Paris', to: 'New York' },
    collection: 'flight',
  }),
);

const StoreForLoading = signalStore(
  withCallState(),
  withEntities<Flight>(),
  withDataService({
    dataServiceType: MockFlightServiceForLoading,
    filter: { from: 'Paris', to: 'New York' },
  }),
);
const StoreWithNamedCollectionForLoading = signalStore(
  withCallState({
    collection: 'flight',
  }),
  withEntities({
    entity: type<Flight>(),
    collection: 'flight',
  }),
  withDataService({
    dataServiceType: MockFlightServiceForLoading,
    filter: { from: 'Paris', to: 'New York' },
    collection: 'flight',
  }),
);

const StoreWithSelectId = signalStore(
  withCallState(),
  withEntities({
    entity: type<FlightWithCustomId>(),
  }),
  withDataService({
    dataServiceType: MockFlightWithSelectIdService,
    filter: { from: 'Paris', to: 'New York' },
    selectId: (flight: FlightWithCustomId) => flight.flightId,
  })
);
