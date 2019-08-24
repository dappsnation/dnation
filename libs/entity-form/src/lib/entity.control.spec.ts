import { EntityControl } from "./entity.control";
import { FormControl, FormGroup } from '@angular/forms';

interface MovieStory {
  synopsis: string;
  logline: string;
}

interface Movie {
  id: string;
  title: string;
  rating?: number;
  story?: MovieStory;
}

class MovieStory extends EntityControl<MovieStory> {
  constructor(story: Partial<MovieStory> = {}) {
    super({
      synopsis: new FormControl(story.synopsis),
      logline: new FormControl(story.logline)
    })
  }
}

class MovieControl extends EntityControl<Movie> {

  constructor(entity: Movie) {
    super({
      id: new FormControl(entity.id),
      title: new FormControl(entity.title),
      rating: new FormControl(entity.rating),
      story: new MovieStory(entity.story)
    });
  }
}

const MOVIE: Movie = {
  id: '123',
  title: 'Harry Potter 1',
  rating: 1
};

describe('MovieControl', () => {
  let control: MovieControl;

  beforeEach(() => {
    control = new MovieControl(MOVIE);
  })

  test('Created', () => {
    expect(control).toBeDefined();
  })

  test('patchValue()', () => {
    const update = { title: 'Harry Potter 2', rating: 2 };
    control.patchValue(update);
    expect(control.value).toEqual({ ...MOVIE, ...update });
  })
})
