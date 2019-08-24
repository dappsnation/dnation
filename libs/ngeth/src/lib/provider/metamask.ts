import { Injectable } from '@angular/core';
import { Web3Provider } from '@ethersproject/providers';
import { BehaviorSubject } from 'rxjs';

export const enum NetworkID {
  mainnet = '1',
  morden = '2',
  ropsten = '3',
  rinkeby = '4',
  goerli = '5',
  kovan = '42',
  xDai = '100',
}

@Injectable({ providedIn: 'root' })
export class MetaMaskProvider extends Web3Provider {
  readonly _web3Provider: any;
  private _enabled = new BehaviorSubject<boolean>(false);
  public enabled$ = this._enabled.asObservable();

  constructor() {
    super((window as any).ethereum);
  }

  get enabled() {
    return this._enabled.getValue();
  }
  set enabled(isEnabled: boolean) {
    this._enabled.next(isEnabled);
  }

  /** Ask permission to use MetaMask's Provider */
  async enable() {
    if (!this.enabled) {
      const [address] = await this._web3Provider.enable();
      this.enabled = !!address;
    }
  }

  get isMetaMask(): boolean {
    return this._web3Provider.isMetaMask;
  }

  get isConnected(): boolean {
    return this._web3Provider.isConnected();
  }

  /** Network ID : Ropsten -> "3", Goerli -> "5", etc... */
  get networkVersion(): NetworkID | string {
    return this._web3Provider.networkVersion;
  }

  get selectedAddress(): string | undefined{
    return this._web3Provider.selectedAddress();
  }
}
