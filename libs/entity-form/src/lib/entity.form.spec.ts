import { EntityForm } from "./entity.form";
import { EntityControl } from './entity.control';
import { FormControl } from '@angular/forms';
import { filter } from 'rxjs/operators';

interface Movie {
  id: string;
  title: string;
  rating?: number;
}

class MovieForm extends EntityForm<EntityControl<Movie>> {
  idKey = 'id';

  createControl(entity: Movie) {
    return new EntityControl<Movie>({
      id: new FormControl(entity.id),
      title: new FormControl(entity.title),
      rating: new FormControl(entity.rating), // For the sake of the test we put undefined
    });
  }

  createId() {
    return Math.random().toString();
  }
}


const MOVIES: Movie[] = [{
  id: '123',
  title: 'Harry Potter 1',
  rating: 1
},{
  id: '456',
  title: 'Harry Potter 2',
  rating: 2
}];


describe('Form Entity', () => {
  let form: MovieForm;
  beforeEach(() => {
    form = new MovieForm(MOVIES);
  })

  test('Created', () => {
    expect(form).toBeDefined();
  })

  test('getAll()', () => {
    const movies = form.getAll();
    expect(movies).toEqual(MOVIES);
  })

  test('getEntity()', () => {
    const movie = form.getEntity('123')
    const result = MOVIES.find(({ id }) => id === '123')
    expect(movie).toEqual(result);
  })

  test('add()', () => {
    const movie = { id: '789', title: 'Harry Potter 3', rating: 10 };
    form.add(movie);
    expect(form.contains('789')).toBeTruthy();
    expect(form.getCount()).toEqual(3);
  })

  test('update()', () => {
    form.update('456', { rating: 3 });
    expect(form.getCount()).toEqual(2);
    expect(form.getEntity('456').rating).toEqual(3);
  })

  test('upsert()', () => {
    form.upsert('456', { rating: 4 });
    form.upsert({ id: '789', title: 'Harry Potter 3', rating: 5 });
    expect(form.getCount()).toEqual(3);
    expect(form.getEntity('456').rating).toEqual(4);
    expect(form.getEntity('789').rating).toEqual(5);
  })

  test('remove()', () => {
    form.remove('123');
    expect(form.getCount()).toEqual(1);
    expect(form.contains('123')).toBeFalsy();
  })

  test('setActive()', (done) => {
    form.active$.pipe(
      filter(active => !!active),
    ).subscribe(active => {
      expect(active).toEqual('123');
      done();
    })
    form.setActive('123');
  })

  test('patchValue() with array', () => {
    form.patchValue([
      { id: '456', rating: 4 },
      { id: '789', title: 'Harry Potter 3', rating: 5 }
    ]);
    expect(form.getCount()).toEqual(3);
    expect(form.getEntity('456').rating).toEqual(4);
    expect(form.getEntity('789').rating).toEqual(5);
  })

  test('patchValue() with record', () => {
    form.patchValue({
      '456': { rating: 4 },
      '789': { title: 'Harry Potter 3', rating: 5 }
    });
    expect(form.getCount()).toEqual(3);
    expect(form.getEntity('456').rating).toEqual(4);
    expect(form.getEntity('789').rating).toEqual(5);
  })

  test('setValue()', () => {
    form.setValue([
      { id: '456', rating: 4 },
      { id: '789', title: 'Harry Potter 3', rating: 5 }
    ]);
    expect(form.getCount()).toEqual(2); // Remove first value
    expect(form.getEntity('456').rating).toEqual(4);
    expect(form.getEntity('789').rating).toEqual(5);
  })

  test('valueChanges$ (initial value)', (done) => {
    form.valueChanges$.subscribe(movies => {
      expect(movies).toEqual(form.value);
      done();
    })
  })

  test('valueChanges$ (update)', (done) => {
    form.valueChanges$.pipe(
      filter(movies => Object.keys(movies).length > 2)
    ).subscribe(movies => {
      expect(movies).toEqual(form.value);
      done();
    });
    form.add({ id: '789', rating: 5 });
  })

  test('selectAll()', (done) => {
    form.selectAll().subscribe(movies => {
      expect(movies).toEqual(MOVIES);
      done();
    })
  })

  test('selectActive()', (done) => {
    form.selectActive().pipe(
      filter(active => !!active),
    ).subscribe(active => {
      expect(active).toEqual(form.getEntity('123'));
      done();
    })
    form.setActive('123');
  })
});
