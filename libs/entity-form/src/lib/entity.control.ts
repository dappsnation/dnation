import { FormGroup, AbstractControl, ValidatorFn, AbstractControlOptions, AsyncValidatorFn, FormControl, FormArray } from '@angular/forms';
import { UpdateOptions } from './type';

export type RecordControl<E> = Partial<{
  [key in Extract<keyof E, string>]: AbstractControl;
}>;

export class EntityControl<E = any, C extends RecordControl<E> = RecordControl<E>> extends FormGroup {
  private _onCollectionChange: () => void;
  readonly value: Partial<E>;
  controls: C;

  constructor(
    controls: C,
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null
  ) {
    super(controls, validatorOrOpts, asyncValidator);
  }

  get<K extends Extract<keyof C, string>>(key: K): C[K] {
    return super.get(key) as C[K];
  }

  /** Get the value without the null */
  getPrunedValue(): Partial<E> {
    const isNull = (value: any) => (typeof value === 'object' && value !== null)
      ? Object.keys(value).every(key => isNull(value[key]))
      : value === null;

    function pruneObj(value) {
      return Object.keys(value).reduce((acc, key) => {
        return isNull(value[key]) ? acc : { ...acc, [key]: prune(value[key]) };
      }, {});
    }

    function prune(value: any) {
      return (typeof value === 'object' && value !== null) ? pruneObj(value) : value;
    }
    return prune(this.value);
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
