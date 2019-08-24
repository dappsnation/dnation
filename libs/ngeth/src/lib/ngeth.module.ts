import { NgModule, ModuleWithProviders } from '@angular/core';
import { NETWORK, PROVIDER } from './tokens';
import { getDefaultProvider } from 'ethers';

@NgModule()
export class NgEthModule {

  static forRoot(network: string): ModuleWithProviders {
    return  {
      ngModule: NgEthModule,
      providers: [
        { provide: NETWORK, useValue: network},
        {
          provide: PROVIDER,
          useFactory: getDefaultProvider,
          deps: [NETWORK]
        }
      ]
    }
  }
}
