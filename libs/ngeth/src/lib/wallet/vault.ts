export type KeyVault = 'accounts' | 'default' | string;

export abstract class Vault {
  abstract get(accounts: 'accounts'): Promise<string[]>;
  abstract get(address: 'default'): Promise<string>;
  // tslint:disable-next-line: unified-signatures
  abstract get(address: string): Promise<string>;
  abstract get(key: KeyVault): Promise<string | string[]>;

  abstract set(key: 'accounts', accounts: string[]): Promise<any>;
  abstract set(key: 'default', address: string): Promise<any>;
  // tslint:disable-next-line: unified-signatures
  abstract set(address: string, json: string): Promise<any>;
  abstract set(key: KeyVault, payload: string | string[]): Promise<any>;
}
