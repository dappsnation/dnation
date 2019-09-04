import { EntityControl, RecordControl } from "./entity.control";
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

class MovieStoryForm extends EntityControl<MovieStory> {
  constructor(story: Partial<MovieStory> = {}) {
    super({
      synopsis: new FormControl(story.synopsis),
      logline: new FormControl(story.logline)
    })
  }
}

const movieControl = (entity: Partial<Movie> = {}) => ({
  id: new FormControl(entity.id),
  title: new FormControl(entity.title),
  rating: new FormControl(entity.rating),
  story: new MovieStoryForm(entity.story)
});

type MovieControl = ReturnType<typeof movieControl>;


class MovieForm extends EntityControl<Movie, MovieControl> {

  constructor(entity: Movie) {
    const controls = movieControl(entity);
    super(controls);
  }
}

const MOVIE: Movie = {
  id: '123',
  title: 'Harry Potter 1',
  rating: 1
};

describe('MovieForm', () => {
  let control: MovieForm;

  beforeEach(() => {
    control = new MovieForm(MOVIE);
  })

  test('Created', () => {
    expect(control).toBeDefined();
  })

  test('getPrunedValue()', () => {
    const update = { title: 'Harry Potter 2', rating: 2 };
    control.patchValue(update);
    expect(control.getPrunedValue()).toEqual({ ...MOVIE, ...update });
  })
})
