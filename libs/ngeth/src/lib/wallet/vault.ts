export abstract class Vault {
  abstract get(address: string): Promise<string>;
  abstract set(address: string, json: string): Promise<any>;
}
