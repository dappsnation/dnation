import {
  ValidatorFn,
  AbstractControlOptions,
  AsyncValidatorFn,
  AsyncValidator,
  Validators,
  AbstractControl,
  Validator
} from '@angular/forms';

/** Copy from https://github.com/angular/angular/blob/8.2.2/packages/forms/src/model.ts#L68 */
export function coerceToValidator(
  validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null
): ValidatorFn | null {
  const validator = (isOptionsObj(validatorOrOpts)
    ? (validatorOrOpts as AbstractControlOptions).validators
    : validatorOrOpts) as ValidatorFn | ValidatorFn[] | null;

  return Array.isArray(validator)
    ? composeValidators(validator)
    : validator || null;
}

/** Copy from https://github.com/angular/angular/blob/8.2.2/packages/forms/src/model.ts#L79 */
export function coerceToAsyncValidator(
  asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null,
  validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null
): AsyncValidatorFn | null {
  const origAsyncValidator = isOptionsObj(validatorOrOpts)
    ? (validatorOrOpts as AbstractControlOptions).asyncValidators
    : (asyncValidator as AsyncValidatorFn | AsyncValidatorFn | null);

  return Array.isArray(origAsyncValidator)
    ? composeAsyncValidators(origAsyncValidator)
    : origAsyncValidator || null;
}

/** Copy from https://github.com/angular/angular/blob/8.2.2/packages/forms/src/model.ts#L117 */
export function isOptionsObj(
  validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null
): boolean {
  return (
    validatorOrOpts != null &&
    !Array.isArray(validatorOrOpts) &&
    typeof validatorOrOpts === 'object'
  );
}

/** Copy from https://github.com/angular/angular/blob/033fc3e6e54372475245fbb93fabfdef61249106/packages/forms/src/directives/shared.ts#L143 */
export function composeValidators(validators: Array<Validator|ValidatorFn>): ValidatorFn|null {
  return validators != null ? Validators.compose(validators.map(normalizeValidator)) : null;
}

/** Copy from https://github.com/angular/angular/blob/033fc3e6e54372475245fbb93fabfdef61249106/packages/forms/src/directives/shared.ts#L147 */
export function composeAsyncValidators(
  validators: Array<AsyncValidator | AsyncValidatorFn>
): AsyncValidatorFn | null {
  return validators != null
    ? Validators.composeAsync(validators.map(normalizeAsyncValidator))
    : null;
}

/** Copy from https://github.com/angular/angular/blob/033fc3e6e54372475245fbb93fabfdef61249106/packages/forms/src/directives/normalize_validator.ts#L12 */
export function normalizeValidator(validator: ValidatorFn | Validator): ValidatorFn {
  if ((<Validator>validator).validate) {
    return (c: AbstractControl) => (<Validator>validator).validate(c);
  } else {
    return <ValidatorFn>validator;
  }
}

/** Copy from https://github.com/angular/angular/blob/033fc3e6e54372475245fbb93fabfdef61249106/packages/forms/src/directives/normalize_validator.ts#L20 */
export function normalizeAsyncValidator(
  validator: AsyncValidatorFn | AsyncValidator
): AsyncValidatorFn {
  if ((<AsyncValidator>validator).validate) {
    return (c: AbstractControl) => (<AsyncValidator>validator).validate(c);
  } else {
    return <AsyncValidatorFn>validator;
  }
}
