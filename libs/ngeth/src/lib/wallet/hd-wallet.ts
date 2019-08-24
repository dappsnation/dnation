import { ExternallyOwnedAccount, Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/abstract-provider';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { SigningKey } from "@ethersproject/signing-key";
import { defaultPath, HDNode, entropyToMnemonic } from "@ethersproject/hdnode";
import { Bytes, BytesLike } from "@ethersproject/bytes";
import { Wordlist } from "@ethersproject/wordlists/wordlist";
import { decryptJsonWallet, ProgressCallback  } from '@ethersproject/json-wallets';
import { randomBytes } from "@ethersproject/random";
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { Vault } from './vault';
import { isJsonKeyStore, isMnemonic, isPrivateKey } from './helpers';

interface HDNodeOption {
  locale: Wordlist;
  path: string;
}

export class HDWallet extends Signer implements ExternallyOwnedAccount {
  private _signingKey: () => SigningKey;

  private _address = new BehaviorSubject<string>(null);
  private _accounts = new BehaviorSubject<string[]>([]);
  public address$ = this._address.asObservable();
  public accounts$ = this._accounts.asObservable();

  privateKey: string;
  mnemonic?: string;
  path = defaultPath;

  constructor(
    public vault?: Vault,
    public provider?: Provider
  ) {
    super();
  }

  /** List of accounts */
  get accounts(): string[] {
    return this._accounts.getValue();
  }

  set accounts(accounts: string[]) {
    this._accounts.next(accounts);
  }

  /** Current address selected */
  get address(): string {
    return this._address.getValue();
  }

  //////////////
  // GENERATE //
  //////////////
  fromRandom(length: 16 | 20 | 24 | 28 | 32 = 16, options?: Partial<HDNodeOption>) {
    const entropy: Uint8Array = randomBytes(16);
    const mnemonic = entropyToMnemonic(entropy, options.locale);
    return this.fromMnemonic(mnemonic, options.path, options.locale);
  }

  /**
   * Generate an HDNode from memonic and add it to the list of accounts
   * @param mnemonic
   * @param path
   * @param wordlist
   */
  fromMnemonic(mnemonic: string, path: string  = this.path, wordlist?: Wordlist): HDNode {
    return HDNode.fromMnemonic(mnemonic, null, wordlist).derivePath(path);
  }

  fromEncryptedJson(json: string, password: Bytes | string, progress?: ProgressCallback): Promise<HDNode> {
    return decryptJsonWallet(json, password, progress)
  }

  fromPrivateKey(privateKey: string | BytesLike) {
    return new SigningKey(privateKey);
  }

  ////////////////////
  // MANAGE ACCOUNT //
  ////////////////////
  async add(password: string, key?: string) {
    let account: HDNode;
    if(key) {
      if (isJsonKeyStore(key)) {
        account = await this.fromEncryptedJson(key, password);
      } else if (isMnemonic(key)) {
        account = this.fromMnemonic(key);
      } else if (isPrivateKey(key)) {
        account = this.fromPrivateKey(key); // TODO convert to HD node
      } else {
        throw new Error(`Unkown key type ! Please provide a json keystore, a private key, or a valid mnemonic.`);
      }
    } else { // no key -> create random
      account = this.fromRandom();
    }
  }

  setAccounts() {

  }

  setActive(address: string) {
    this.vault.get(address);
  }

  /////////////////
  // GET ACCOUNT //
  /////////////////
  getEncryptedJson(address: string = this.address): Promise<string> {
    return this.vault.get(address);
  }

  async getPrivateKey(password: string, address: string = this.address) {
    const json = await this.getEncryptedJson(address);
    const keystore = await decryptJsonWallet(json, password);
    return keystore.privateKey;
  }

  async getMnemonic(password: string, address: string = this.address) {
    const json = await this.getEncryptedJson(address);
    const keystore = await decryptJsonWallet(json, password);
    return keystore.mnemonic;
  }

  /** Get the current address selected */
  getAddress(): Promise<string> {
    return this.address$.toPromise();
  }

  signMessage(message: string | ArrayLike<number>): Promise<string> {
    return this.signMessage(message);
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    throw new Error('Method not implemented.');
  }

  connect(provider: Provider): Signer {
    this.provider = provider;
    return this;
  }
}
