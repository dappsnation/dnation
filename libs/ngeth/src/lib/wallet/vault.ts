export abstract class Vault {
  abstract get(key: string): string;
  abstract set(key: string, content: string);
}
