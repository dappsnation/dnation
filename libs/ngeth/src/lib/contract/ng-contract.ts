import { inject } from '@angular/core';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { NETWORK, PROVIDER } from '../tokens';
import { Observable, fromEvent } from 'rxjs';
import { MetaMaskProvider } from '../provider/metamask';

interface IContract {
  methods?: {
    [name: string]: (...args: any[]) => Promise<any>
  }
  events?: {
    [name: string]: (...arg: any[]) => void
  }
}

type MethodName<T extends IContract> = Extract<keyof T['methods'], string>
type EventName<T extends IContract> = Extract<keyof T['events'], string>
type EventParams<T extends IContract, K extends EventName<T>> = Parameters<T['events'][K]>

export class NgContract<T extends IContract = any> extends Contract {

  functions: {
    [key in MethodName<T>]: T['methods'][key]
  };

  constructor(
    addresses: Record<string, string>,
    abi: ContractInterface,
    provider?: Provider | Signer
  ) {
    // Get provider
    if (!provider) {
      provider = inject<Provider>(PROVIDER);
    }
    // Get network
    const network = provider instanceof MetaMaskProvider
      ? provider.networkVersion
      : inject<string>(NETWORK);
    if (!network) {
      throw new Error('No network provided');
    }
    // Get address
    const address = addresses[network];
    if (!address) {
      throw new Error(`No address found for contract on network ${network}`);
    }
    super(addresses[network], abi, provider);
  }

  event<K extends EventName<T>>(name: K): Observable<EventParams<T, K>> {
    return fromEvent(this, name);
  }
}
