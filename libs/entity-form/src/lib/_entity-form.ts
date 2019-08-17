import { FormControl, FormGroup, FormArray, AbstractControl } from '@angular/forms';
import { Validator, AsyncValidator } from './types';
import { Observable } from 'rxjs';

/////////////
// HELPERS //
/////////////

interface TypedForm<T> extends AbstractControl {
  setControls(value: Partial<T>): void;
  upsertControls(value: Partial<T>): void;
}



////////////
// ENTITY //
////////////
type ControlEntity<T> = {
  [K in keyof Partial<T>]: ControlField<T[K]>
};

type ControlEntityFactory<T> = {
  [K in keyof Partial<T>]: (state: T[K]) => ControlField<T[K]>
}

type toControlEntity<T, Factory extends ControlEntityFactory<T>> = {
  [K in keyof Factory]: ReturnType<Factory[K]>
}

function createEntityControls<T>(control: ControlEntityFactory<T>, value: T): ControlEntity<T> {
  return Object.keys(value).reduce((acc, key) => ({
    ...acc,
    [key]: control[key] ? control[key](value[key]) : createFieldControl(value[key])
  }), {} as ControlEntity<T>);
}


/** Generic FormGroup for Entity */
export class FormEntity<E, Control extends Record<Extract<keyof E, string>, AbstractControl> = ControlEntity<E>>
  extends FormGroup
  implements TypedForm<E> {
  value: E;
  valueChanges: Observable<E>

  controlFactory: ControlEntityFactory<E> = {} as any;
  createControls: (entity: E) => Control;

  constructor(controls: Partial<Control>, validators?: Validator, asyncValidators?: AsyncValidator) {
    super(controls, validators, asyncValidators);
    this.createControls = createEntityControls.bind(this, {});
  }

  static factory<E>(
    entity: Partial<E>,
    entityFactory?: ControlEntityFactory<E>
  ): FormEntity<E, toControlEntity<E, typeof entityFactory>> {
    const form = new FormEntity<E, toControlEntity<E, typeof entityFactory>>({});
    if (entityFactory) {
      form['controlFactory'] = entityFactory;
      form['createControls'] = createEntityControls.bind(form, entityFactory);
    }
    form.setControls(entity);
    return form;
  }

  /**
   * Set the controls with the value, and remove controls that are not in param
   */
  setControls(entity: Partial<E>) {
    this.upsertControls(entity);
    // Remove
    Object.keys(this.controls).forEach((key: Extract<keyof E, string>) => {
      if (!(key in entity)) {
        this.removeControl(key);
      }
    });
  }

  /**
   * Create or update controls based on the value
   */
  upsertControls(entity: Partial<E>) {
    Object.keys(entity).forEach((key: Extract<keyof E, string>) => {
      const value = entity[key];
      if (this.get(key)) {
        const control = this.get(key);
        if ('setControls' in control) {
          control['setControls'](value as any);
        } else {
          control.setValue(value as any);
        }
      } else {
        if (this.controlFactory[key]) {
          this.addControl(key, this.controlFactory[key](value) as any)
        } else {
          this.addControl(key, createFieldControl(value) as any);
        }
      }
    });
  }

  get<K extends Extract<keyof E, string>>(path: K): Control[K] {
    return super.get(path) as Control[K];
  }

  addControl<K extends Extract<keyof E, string>>(name: Extract<K, string>, control: Control[K]) {
    super.addControl(name, control);
  }

  removeControl(name: Extract<keyof E, string>) {
    super.removeControl(name);
  }

  setControl<K extends Extract<keyof E, string>>(name: K, control: Control[K]) {
    super.setControl(name, control);
  }

  setValue(value: Partial<E>, options?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.setValue(value, options);
  }

  patchValue(entity: Partial<E>, options?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.patchValue(entity, options);
  }
}

//////////
// LIST //
//////////
type ControlList<T> = (ControlField<T>)[];

function createListControls<T>(value: T[]): ControlList<T> {
  return value.map(item => createFieldControl(item));
}

/** A list of FormField */
export class FormList<T, Control extends AbstractControl = AbstractControl>
  extends FormArray
  implements TypedForm<T[]> {

  createControl: (value: T) => Control;
  controls: Control[];

  constructor(controls: Control[], validators?: Validator, asyncValidators?: AsyncValidator) {
    super(controls, validators, asyncValidators);
    this.createControl = createFieldControl.bind(this);
  }

  static factory<T, Control extends ControlField<T>>(value: T[], createControl?: (value: T) => Control) {
    const form = new FormList<T, Control>([]);
    if (createControl) {
      form['createControl'] = createControl.bind(form);
    }
    form.setControls(value);
    return form;
  }

  /** Set the controls with the value, and remove controls that are not in param */
  setControls(value: T[]) {
    this.upsertControls(value);
    // If there is more value than form controls, remove it.
    if (this.length > value.length) {
      for (let i = value.length + 1; i++; i < this.length) {
        this.removeAt(i);
      }
    }
  }

  /** Create or update controls based on the value */
  upsertControls(value: T[]) {
    value.forEach((newValue, index) => {
      if (this.at(index)) {
        // If there is a form already patch it
        const control = this.at(index);
        if ('setControls' in control) {
          control['setControls'](value as any);
        } else {
          control.setValue(value as any);
        }
      } else {
        this.setControl(index, this.createControl(newValue));
      }
    });
  }

  at(index: number): Control {
    return super.at(index) as Control;
  }

  push(control: Control) {
    super.push(control);
  }

  insert(index: number, control: Control) {
    super.insert(index, control);
  }

  setControl(index: number, control: Control) {
    super.setControl(index, control);
  }

  setValue(
    value: T[],
    options?: {
      onlySelf?: boolean;
      emitEvent?: boolean;
    }
  ) {
    super.setValue(value, options);
  }

  patchValue(
    value: T[],
    options: {
      onlySelf?: boolean;
      emitEvent?: boolean;
    } = {}
  ) {
    super.patchValue(value, options);
  }
}

///////////
// FIELD //
///////////

// TODO : create a ControlList that deals with second generic
type ControlField<T> =
  (T extends (infer I)[] ? FormList<I>
  : T extends object ? FormEntity<T>
  : FormField<T>);


function createFieldControl<T>(value: T): ControlField<T> {
  if (Array.isArray(value)) {
    return FormList.factory<T, any>(value) as ControlField<T>;
  }
  if (typeof value === 'object') {
    return FormEntity.factory<T>(value) as ControlField<T>;
  }
  return new FormField(value) as ControlField<T>;
}

export class FormField<T> extends FormControl implements TypedForm<T> {
  constructor(state: T, validators?: Validator, asyncValidators?: AsyncValidator) {
    super(state, validators, asyncValidators);
  }

  setControls(value: T) {
    this.setValue(value);
  }

  upsertControls(value: T) {
    this.patchValue(value);
  }

  setValue(value: T, options?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
    emitModelToViewChange?: boolean;
    emitViewToModelChange?: boolean;
  }) {
    super.setValue(value, options);
  }

  patchValue(value: T, options?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
    emitModelToViewChange?: boolean;
    emitViewToModelChange?: boolean;
  }) {
    super.patchValue(value, options);
  }
}


interface Movie {
  main: MovieMain;
}

interface MovieMain {
  name: string;
  date: Date;
  rating: number;
  countries: MovieCountry[];
}

interface MovieCountry {
  name: string;
  code: number;
}

class MovieCountryForm extends FormEntity<MovieCountry> {}

const movieFactory: ControlEntityFactory<Movie> = {
  main: (value: MovieMain) => FormEntity.factory(value, {
    countries: () => FormList.factory([], (_: MovieCountry) => new MovieCountryForm({}))
  })
}

const forms = FormEntity.factory({} as Movie, movieFactory);
const controller = forms.get('main').get('countries').at(2)
