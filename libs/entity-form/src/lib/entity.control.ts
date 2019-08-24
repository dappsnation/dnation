import { FormGroup, AbstractControl, ValidatorFn, AbstractControlOptions, AsyncValidatorFn, FormControl, FormArray } from '@angular/forms';
import { UpdateOptions } from './type';

type RecordControl<E> = Partial<{
  [key in Extract<keyof E, string>]: AbstractControl;
}>;

function entityFactory<E>(entity: Partial<E>): RecordControl<E> {
  return Object.keys(entity)
  .reduce((acc, key) => {
    const value = entity[key];
    if (typeof value === 'undefined' || value === null) {
      return acc;
    }
    if (Array.isArray(value)) {
      return { ...acc, [key]: new FormArray(listFactory(value)) };
    } else if (typeof value === 'object') {
      return { ...acc, [key]: new FormGroup(entityFactory(value)) };
    } else {
      return { ...acc, [key]: new FormControl(entity[key]) };
    }
  }, {} as RecordControl<E>)
}

function listFactory<E>(values: Partial<E>[]) {
  return values.map(value => entityFactory(value));
}

export class EntityControl<E = any> extends FormGroup {
  private _onCollectionChange: () => void;
  controls: RecordControl<E>;
  factory = entityFactory;

  constructor(
    controls: RecordControl<E>,
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null
  ) {
    super(controls, validatorOrOpts, asyncValidator);
    if (!this.factory) {
      this.factory = entityFactory;
    }
  }

  patchValue(entity: Partial<E>, options?: UpdateOptions) {
    Object.keys(entity).forEach((key: Extract<Partial<keyof E>, string>) => {
      this.contains(key)
        ? this.get(key).patchValue(entity[key])
        : this.controls[key] = this.factory({ [key]: key })
    });
    this.updateValueAndValidity(options);
  }

  get<K extends Extract<keyof E, string>>(key: K): AbstractControl {
    return super.get(key);
  }

  setValue(value: Partial<E>, options: object) {
    return super.setValue(value, options);
  }

  /** @internal */
  _registerOnCollectionChange(fn: () => void): void {
    this._onCollectionChange = fn;
  }

  /** @internal */
  _syncPendingControls(): boolean {
    return super['_syncPendingControls']();
  }

}
