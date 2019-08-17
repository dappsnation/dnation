import { FormGroup, AbstractControl, ValidatorFn, AbstractControlOptions, AsyncValidatorFn } from '@angular/forms';
import { UpdateOptions } from './type';

type RecordControl<E> = Partial<{
  [key in Extract<keyof E, string>]: AbstractControl;
}>;

export class EntityControl<E = any> extends FormGroup {
  private _onCollectionChange: () => void;
  controls: RecordControl<E>;

  constructor(
    private factory: RecordControl<E>,
    validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
    asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null
  ) {
    super(factory, validatorOrOpts, asyncValidator);
  }

  patchValue(entity: Partial<E>, options?: UpdateOptions) {
    Object.keys(entity).forEach((key: Extract<Partial<keyof E>, string>) => {
      this.contains(key)
        ? this.get(key).patchValue(entity[key])
        : this.controls[key] = this.factory[key]
    });
    this.updateValueAndValidity(options);
  }

  get<K extends Extract<keyof E, string>>(key: K): AbstractControl {
    return super.get(key);
  }

  setValue(value: E, options: object) {
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
