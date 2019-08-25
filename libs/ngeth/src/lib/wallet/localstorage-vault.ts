import { Vault, KeyVault } from './vault';

export class LocalStorageVault extends Vault {

  private storage: Storage;

  constructor() {
    super();
    try {
      this.storage = (window as any).localStorage;
    } catch(err) {
      throw new Error('This environement doesn\'t support a Local Storage');
    }
  }

  get(accounts: 'accounts'): Promise<string[]>;
  get(address: 'default'): Promise<string>;
  // tslint:disable-next-line: unified-signatures
  get(address: string): Promise<string>;
  get(key: KeyVault): Promise<string | string[]> {
    return JSON.parse(this.storage.getItem(key));
  }

  set(key: 'accounts', accounts: string[]): Promise<any>;
  set(key: 'default', address: string): Promise<any>;
  // tslint:disable-next-line: unified-signatures
  set(address: string, json: string): Promise<any>;
  async set(key: string, payload: string | string[]): Promise<any> {
    if(key === 'accounts' && !Array.isArray(payload)) {
      throw new Error('When key is "accounts", payload must be a string[]');
    }
    if (key !== 'accounts' && Array.isArray(payload)) {
      throw new Error('When key is "default" or an address, payload must be a string');
    }

    this.storage.setItem(key, JSON.stringify(payload));
  }

  async delete(key: KeyVault): Promise<any> {
    this.storage.removeItem(key);
  }

  async clear(): Promise<any> {
    this.get('accounts').then(accounts =>
      accounts.forEach(account => this.delete(account))
    );
    this.delete('default');
    this.delete('accounts');
  }
}
