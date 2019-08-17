import {
  AbstractControl,
  ValidatorFn,
  AbstractControlOptions,
  AsyncValidatorFn,
} from '@angular/forms';
import { startWith, map, distinctUntilChanged } from 'rxjs/operators';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { coerceToValidator, coerceToAsyncValidator, isOptionsObj } from './utils';
import { EntityControl } from './entity.control';
import { UpdateOptions } from './type';
import { EventEmitter } from '@angular/core';


type getEntity<C> = C extends EntityControl<infer E> ? E : never;

export abstract class EntityForm<
  C extends EntityControl,
  E = Partial<getEntity<C>>
> extends AbstractControl {
  protected idKey = 'id';
  protected controls: Record<string, C> = {};
  private _onCollectionChange: () => void;
  private _updateOn: AbstractControlOptions['updateOn'];
  pristine: boolean;
  touched: boolean;

  // State
  public valueChanges = new EventEmitter<Record<string, E>>();
  public statusChanges = new EventEmitter();
  public valueChanges$: Observable<Record<string, E>>;
  public active$ = new BehaviorSubject<string>(null);

  public value: Record<string, E>;

  // ABSTRACT
  /** Factory that create an entity control */
  abstract createControl(entity: E): C;
  /** Method used to create an id for new entity control */
  abstract createId(): string;

  constructor(
    entities: E[] | Record<string, E>,
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null
  ) {
    super(
      coerceToValidator(validatorOrOpts),
      coerceToAsyncValidator(asyncValidator, validatorOrOpts)
    );
    if (validatorOrOpts && 'updateOn' in validatorOrOpts) {
      this._updateOn = validatorOrOpts.updateOn;
    }
    this.updateValueAndValidity({onlySelf: true, emitEvent: false});
    this.setValue(entities);

    this.valueChanges$ = this.valueChanges.pipe(startWith(this.value));
  }


  /** HELPER to add a new control */
  private registerControl(entity: E): C {
    const id = entity[this.idKey];
    if (this.controls[id]) {
      return this.controls[id];
    }
    const control = this.createControl(entity);
    this.controls[id] = control;
    control.setParent(this as any);
    control._registerOnCollectionChange(this._onCollectionChange);
    return control;
  }

  /** HELPER to add or update an control */
  private upsertControl(id: string, entity: E, options: UpdateOptions) {
    const value = { ...entity, [this.idKey]: id }
    return this.contains(id)
      ? this.get(id).patchValue(value, options)
      : this.registerControl(value);
  }

  /** HELPER to remove a control */
  private deleteControl(id: string) {
    if (this.contains(id)) {
      this.controls[id]._registerOnCollectionChange(() => {});
      delete this.controls[id];
    }
  }


  // READ
  contains(id: string) {
    return !!this.controls[id];
  }

  selectAll(): Observable<E[]> {
    return this.valueChanges$.pipe(
      map(entities => Object.keys(entities).map(key => entities[key]))
    );
  }

  selectActive(): Observable<E> {
    return combineLatest([this.valueChanges$, this.active$]).pipe(
      map(([entities, active]) => entities[active]),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  selectActiveControl(): Observable<C> {
    return this.active$.pipe(map(active => this.get(active)));
  }

  getAll(): E[] {
    return Object.keys(this.value).map(key => this.value[key]);
  }

  getEntity(id: string): E {
    return this.value[id];
  }

  getCount(): number {
    return Object.keys(this.value).length;
  }

  // WRITE
  /** Set the controlers */
  setValue(
    entities: Record<string, E> | E[],
    options?: UpdateOptions
  ): void {
    const value: Record<string, E> = (Array.isArray(entities))
      ? entities.reduce((acc, entity) => ({ ...acc, [entity[this.idKey]]: entity}), {})
      : entities;
    const ids = Object.keys(value);
    const controlIds = Object.keys(this.controls);

    // Remove
    controlIds.forEach(id => this.deleteControl(id));

    // Upsert
    ids.forEach(id => this.upsertControl(id, value[id], options));
    this.updateValueAndValidity(options);
  }

  /** Upsert several entities */
  patchValue(
    entities: Record<string, E> | E[],
    options?: UpdateOptions
  ): void {
    const value: Record<string, E> = (Array.isArray(entities))
      ? entities.reduce((acc, entity) => ({ ...acc, [entity[this.idKey]]: entity}), {})
      : entities;
    Object.keys(value).forEach(id => this.upsertControl(id, value[id], options));
    this.updateValueAndValidity(options);
  }

  reset(entities?: Record<string, E>, options?: UpdateOptions): void {
    Object.keys(this.controls).forEach(id => {
      this.controls[id].reset(entities[id], {
        onlySelf: true,
        emitEvent: options.emitEvent
      });
    });
    this._updatePristine(options);
    this._updateTouched(options);
    this.updateValueAndValidity(options);
  }

  get(key: string): C {
    return this.controls[key];
  }

  setActive(id: string) {
    this.active$.next(id);
  }

  /** Erase a control and add the new one */
  set(id: string, entity: E) {
    // Remove
    this.deleteControl(id);
    // Add
    this.registerControl(entity);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /** Add a new control */
  add(entity: E) {
    this.registerControl(entity);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /** Update the value of one control */
  update(id: string, entity: E) {
    this.get(id).patchValue(entity);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /** Create a control or update its value */
  upsert(entity: E);
  upsert(id: string, entity: E);
  upsert(idOrEntity: E | string, entity?: E) {
    let id: string;
    if (typeof idOrEntity === 'string') {
      id = idOrEntity;
    } else {
      id = idOrEntity[this.idKey] || this.createId();
      entity = idOrEntity;
    }

    this.controls[id]
      ? this.update(id, entity)
      : this.add(entity);
  }

  /** Remove a control */
  remove(id: string) {
    this.deleteControl(id);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }



  //////////////////////
  // REQUIRED METHODS //
  //////////////////////

   /** @internal */
   private _updateValue(): void {
    this.value = this._reduceValue();
  }

  /** @internal */
  private _forEachChild(cb: (control: C, id: string) => void): void {
    Object.keys(this.controls).forEach(k => cb(this.controls[k], k));
  }

  /** @internal */
  private _anyControls(condition: (control: C) => boolean): boolean {
    for (const key in this.controls) {
      if (condition(this.controls[key])) {
        return true
      }
    }
    return false;
  }

  /** @internal */
  private _allControlsDisabled(): boolean {
    for (const controlName of Object.keys(this.controls)) {
      if (this.controls[controlName].enabled) {
        return false;
      }
    }
    return Object.keys(this.controls).length > 0 || this.disabled;
  }

  /** @internal */
  private _syncPendingControls(): boolean {
    const subtreeUpdated = this._reduceChildren(false, (updated: boolean, child: C) => {
      return child._syncPendingControls() ? true : updated;
    });
    if (subtreeUpdated) this.updateValueAndValidity({onlySelf: true});
    return subtreeUpdated;
  }


  /** @internal */
  private _reduceValue() {
    return this._reduceChildren({}, (acc: Record<string, C>, control: C, id: string) => {
      if (control.enabled || this.disabled) {
        acc[id] = control.value;
      }
      return acc;
    });
  }

  /** @internal */
  private _reduceChildren(initValue: any, fn: Function) {
    let res = initValue;
    this._forEachChild((control: C, name: string) => {
      res = fn(res, control, name);
    });
    return res;
  }


  /** @internal */
  private _checkAllValuesPresent(value: any): void {
    this._forEachChild((control: C, name: string) => {
      if (value[name] === undefined) {
        throw new Error(`Must supply a value for form control with name: '${name}'.`);
      }
    });
  }

  /** @internal */
  private _updatePristine(opts: {onlySelf?: boolean} = {}): void {
    this.pristine = !this._anyControls(control => control.pristine);
    if ('_parent' in this) {
      this['_parent']._updatePristine(opts);
    }
  }

  /** @internal */
  private _updateTouched(opts: {onlySelf?: boolean} = {}): void {
    this.touched = !this._anyControls(control => control.touched);
    if ('_parent' in this) {
      this['_parent']._updateTouched(opts);
    }
  }
}

