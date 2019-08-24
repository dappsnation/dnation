import { Injectable } from '@angular/core';
import { Web3Provider, BaseProvider } from '@ethersproject/providers';
import { BehaviorSubject } from 'rxjs';
import { getDefaultProvider } from 'ethers';
import { RPCMethods } from './rpic-methods';

export const enum NetworkID {
  mainnet = '1',
  morden = '2',
  ropsten = '3',
  rinkeby = '4',
  goerli = '5',
  kovan = '42',
  xDai = '100',
}

const requireSigner: RPCMethods[] = [
  'eth_getBalance',
  'eth_getStorageAt',
  'eth_getCode',
  'eth_sendTransaction',
  'eth_sendRawTransaction'
];
const optionalSigner: RPCMethods[] = [
  'eth_call',
  'eth_estimateGas'
];

@Injectable({ providedIn: 'root' })
export class MetaMaskProvider extends Web3Provider {
  readonly _web3Provider: any;
  private fallbackProvider: BaseProvider;
  private _enabled = new BehaviorSubject<boolean>(false);
  public enabled$ = this._enabled.asObservable();

  constructor() {
    super((window as any).ethereum);
    // TODO : map networkVersion to Ethers network.
    this.fallbackProvider = getDefaultProvider(this._web3Provider.networkVersion);
  }

  get enabled() {
    return this._enabled.getValue();
  }
  set enabled(isEnabled: boolean) {
    this._enabled.next(isEnabled);
  }

  async send(method: RPCMethods, params: any): Promise<any> {
    if (this.enabled) {
      return super.send(method, params);
    } else if (requireSigner.includes(method)) {
      await this.enable();
      return super.send(method, params);
    } else {
      if (optionalSigner.includes(method) && params['from']) {
        await this.enable();
        return super.send(method, params);
      }
      switch (method) {
        case 'eth_network': return this.fallbackProvider.getNetwork();
        // TODO: add other methods
      }
    }
  }

  /** Ask permission to use MetaMask's Provider */
  async enable() {
    if (!this.enabled) {
      const [address] = await this._web3Provider.enable();
      this.enabled = !!address;
      delete this.fallbackProvider;
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
