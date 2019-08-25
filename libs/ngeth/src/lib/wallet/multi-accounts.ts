import { ExternallyOwnedAccount, Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/abstract-provider';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { SigningKey } from "@ethersproject/signing-key";
import { defaultPath, HDNode, entropyToMnemonic } from "@ethersproject/hdnode";
import { BytesLike } from "@ethersproject/bytes";
import { Wordlist } from "@ethersproject/wordlists/wordlist";
import { decryptJsonWallet, ProgressCallback, encryptKeystore, EncryptOptions } from '@ethersproject/json-wallets';
import { randomBytes } from "@ethersproject/random";
import { computeAddress, recoverAddress, serialize } from "@ethersproject/transactions";
import { BehaviorSubject } from 'rxjs';
import { Vault } from './vault';
import { isJsonKeyStore, isMnemonic, isPrivateKey } from './helpers';
import { KeystoreAccount } from '@ethersproject/json-wallets/keystore';
import { defineReadOnly } from 'ethers/utils';

interface HDNodeOption {
  locale: Wordlist;
  path: string;
}


export abstract class MultiAccountsWallet extends Signer implements ExternallyOwnedAccount {
  private _signingKey: () => ExternallyOwnedAccount;

  private _address = new BehaviorSubject<string>(null);
  private _accounts = new BehaviorSubject<string[]>([]);
  private _encrypting = new BehaviorSubject<number>(null);
  private _hasSigningKey = new BehaviorSubject<boolean>(false);
  /** The current address selected */
  public address$ = this._address.asObservable();
  /** The list of the accounts managed by the wallet */
  public accounts$ = this._accounts.asObservable();
  /** When Encrypting, return the percentage */
  public encrypting$ = this._encrypting.asObservable();
  /** Is the signing Key accessible */
  public hasSigningKey$ = this._hasSigningKey.asObservable();

  // Can be overrided by inherited class
  public ttl = 15 * 60 * 1000;  // 15min
  public path = defaultPath;    //

  constructor(
    public vault: Vault,
    public provider?: Provider
  ) {
    super();
  }

  abstract requestPassword(): Promise<string>;

  /** List of accounts */
  get accounts(): string[] {
    return this._accounts.getValue();
  }

  /** Current address selected */
  get address(): string {
    return this._address.getValue();
  }

  /** The private of the current Account */
  get privateKey(): string {
    if (this.hasSigningKey) {
      return this._signingKey().privateKey;
    }
  }

  /** The mnemonic of the current Account */
  get mnemonic(): string {
    if (!this.hasSigningKey) {
      return this._signingKey().mnemonic;
    }
  }

  /** Is the signing key stored in memory */
  get hasSigningKey(): boolean {
    return !!this._signingKey;
  }

  //////////////
  // GENERATE //
  //////////////
  /** Generate a random mnemonic */
  generateMnemonic(length: 16 | 20 | 24 | 28 | 32 = 16, wordlist?: Wordlist) {
    const entropy: Uint8Array = randomBytes(length);
    return entropyToMnemonic(entropy, wordlist);
  }

  /** Create an account based on a random mnemonic */
  fromRandom(length: 16 | 20 | 24 | 28 | 32 = 16, options?: Partial<HDNodeOption>) {
    const mnemonic = this.generateMnemonic(length, options.locale);
    return this.fromMnemonic(mnemonic, options.path, options.locale);
  }

  /**
   * Generate an HDNode from memonic and add it to the list of accounts
   * @param mnemonic A list of words to create the account out of
   * @param path The derivation path of the HDTree
   * @param wordlist A set of word depending on the language
   */
  fromMnemonic(mnemonic: string, path: string  = this.path, wordlist?: Wordlist): HDNode {
    return HDNode.fromMnemonic(mnemonic, null, wordlist).derivePath(path);
  }

  /**
   * Create an account of the encrypted json
   * @param json A stringify version of the keystore
   * @param progress A callback function to display progress of encryption
   */
  async fromEncryptedJson(json: string, progress?: ProgressCallback): Promise<ExternallyOwnedAccount> {
    const password = await this.requestPassword();
    const account = decryptJsonWallet(json, password, (percent) => {
      if(progress) progress(percent);
      this._encrypting.next(percent);
    });
    this._encrypting.next(null);
    return account;
  }

  /**
   * Create an accunt out of a private key
   * @param privateKey The private key of the account
   */
  fromPrivateKey(privateKey: string | BytesLike): ExternallyOwnedAccount {
    const signingKey = new SigningKey(privateKey);
    return {
      address: computeAddress(signingKey.publicKey),
      privateKey: signingKey.privateKey,
    }
  }

  ////////////////////
  // MANAGE ACCOUNT //
  ////////////////////
  /** Add an account to the vault */
  private addAccount(address: string, json: string) {
    this.vault.set(address, json);
    const accounts = this.accounts;
    if (!accounts.includes(address)) {
      this.vault.set('accounts', [...accounts, address]);
      this._accounts.next([...accounts, address]);
    }
  }

  /**
   * Add a new account to the wallet
   * @param key Either the private key, an encrypted json or a mnemonic
   */
  async add(key?: string): Promise<string> {
    let json: string;
    let address: string;
    let account: ExternallyOwnedAccount;
    if (!key) {
      account = this.fromMnemonic(key);
    } else {
      if (isJsonKeyStore(key)) {
        const keystore = JSON.parse(key) as KeystoreAccount;
        address = keystore.address;
        json = key;
      } else if (isMnemonic(key)) {
        account = this.fromMnemonic(key);
      } else if (isPrivateKey(key)) {
        account = this.fromPrivateKey(key);
      } else {
        throw new Error(`Unkown key type ! Please provide a json keystore, a private key, or a valid mnemonic.`);
      }
    }
    if (account) {
      const password = await this.requestPassword();
      address = account.address;
      json = await encryptKeystore(account, password);
    }
    this.addAccount(address, json);
    return address;
  }

  //////////////
  // ACTIVATE //
  //////////////
  /** Set the signing key into memory for a time. Next transactions won't require a password */
  private async setSigningKey(account: ExternallyOwnedAccount, ttl: number = this.ttl) {
    defineReadOnly(this, '_signingKey', () => account);
    this._hasSigningKey.next(true);
    setTimeout(() => this.deleteSigningKey(), ttl); // Remove signing key after ttl
  }

  /** Remove the signing key from memory. Next transaction will require the password */
  async deleteSigningKey() {
    delete this._signingKey;
    this._hasSigningKey.next(false);
  }

  /** Set Signing key into memory and activate the address */
  async activate(address: string) {
    const json = await this.vault.get(address);
    const signingKey = await this.fromEncryptedJson(json);
    this.setSigningKey(signingKey);
    this.setActive(address);
  }

  /** Select the address to be the one used by the Signer */
  async setActive(address: string) {
    if (this.accounts.includes(address)) {
      throw new Error(`Address ${address} is part of the wallet accounts`);
    }
    this._address.next(address);
    this.vault.set('default', address);
  }

  /////////////////
  // GET ACCOUNT //
  /////////////////
  /** Get the encrypted json stored in the vault */
  getEncryptedJson(address: string = this.address): Promise<string> {
    return this.vault.get(address);
  }

  /** Get the private key linked to an address */
  async getPrivateKey(address: string = this.address) {
    if (address === this.address && this.hasSigningKey) {
      return this.privateKey;
    }
    const json = await this.getEncryptedJson(address);
    const keystore = await this.fromEncryptedJson(json);
    return keystore.privateKey;
  }

  /** Get the mnemonic linked to an address */
  async getMnemonic(address: string = this.address) {
    if (address === this.address && this.hasSigningKey) {
      return this.mnemonic;
    }
    const json = await this.getEncryptedJson(address);
    const keystore = await this.fromEncryptedJson(json);
    return keystore.mnemonic;
  }

  /** Get the current address selected */
  getAddress(): Promise<string> {
    return this.address$.toPromise();
  }

  ////////////
  // CRYPTO //
  ////////////
  signMessage(message: string | ArrayLike<number>): Promise<string> {
    return this.signMessage(message);
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    return this.signTransaction(transaction);
  }

  connect(provider: Provider): Signer {
    this.provider = provider;
    return this;
  }
}
