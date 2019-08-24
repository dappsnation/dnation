import { Contract, ContractInterface } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { inject } from '@angular/core';
import { NETWORK, PROVIDER } from '../tokens';
import { Observable, fromEvent } from 'rxjs';

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
    provider?: Provider
  ) {
    // Get address
    const network = inject<string>(NETWORK);
    const address = addresses[network];
    if (!address) {
      throw new Error(`No address found for contract on network ${network}`);
    }
    // Get provider
    if (!provider) {
      provider = inject<Provider>(PROVIDER);
    }
    super(addresses[network], abi, provider);
  }

  event<K extends EventName<T>>(name: K): Observable<EventParams<T, K>> {
    return fromEvent(this, name);
  }
}
