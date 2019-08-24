import { Injectable, Inject } from '@angular/core';
import { BaseProvider } from '@ethersproject/providers';
import { NETWORK } from '../tokens';


@Injectable({ providedIn: 'root' })
export class Provider extends BaseProvider {
  constructor(@Inject(NETWORK) ethNetwork: string) {
    super(ethNetwork);
  }
}
