import { ExternallyOwnedAccount, Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/abstract-provider';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { SigningKey } from "@ethersproject/signing-key";
import { defaultPath, HDNode, entropyToMnemonic } from "@ethersproject/hdnode";
import { BytesLike, joinSignature } from "@ethersproject/bytes";
import { Wordlist } from "@ethersproject/wordlists/wordlist";
import { decryptJsonWallet, ProgressCallback, encryptKeystore, EncryptOptions } from '@ethersproject/json-wallets';
import { randomBytes } from "@ethersproject/random";
import { keccak256 } from "@ethersproject/keccak256";
import { hashMessage } from "@ethersproject/hash";
import { computeAddress, recoverAddress, serialize } from "@ethersproject/transactions";
import { KeystoreAccount } from '@ethersproject/json-wallets/keystore';
import { getAddress } from "@ethersproject/address";
import { defineReadOnly, resolveProperties } from "@ethersproject/properties";
import { isJsonKeyStore, isMnemonic, isPrivateKey } from './helpers';
import { Vault } from './vault/vault';
import { BehaviorSubject } from 'rxjs';
import { WalletAction, WalletMsg, walletMsg, WalletManager } from './wallet-manager';

interface HDNodeOption {
  locale: Wordlist;
  path: string;
}


export abstract class MultiAccountsWallet extends Signer implements ExternallyOwnedAccount {
  private _signingKey: () => SigningKey;
  private _mnemonic: () => string;

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
    public manager: WalletManager,
    public provider?: Provider
  ) {
    super();
  }

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
      return this._mnemonic();
    }
  }

  /** Is the signing key stored in memory */
  get hasSigningKey(): boolean {
    return !!this._signingKey;
  }

  /////////////
  // REQUIRE //
  /////////////
  /** Be sure that the address is settled */
  private async requireAddress() {
    if (!this.address) {
      const address = await this.manager.requestAddress();
      this.setAddress(address);
    }
  }

  /** Be sure that the signing key is settled */
  private async requireSigningKey() {
    if (!this.hasSigningKey) {
      await this.requireAddress();
      this.activate(this.address);
    }
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
   * @param msg A wallet message to display UI content
   */
  async fromEncryptedJson(json: string, msg: WalletMsg): Promise<ExternallyOwnedAccount> {
    const password = await this.manager.requestPassword(msg);
    const account = decryptJsonWallet(json, password, (percent) => this._encrypting.next(percent));
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
      const msg = walletMsg(WalletAction.add, account.address);
      const password = await this.manager.requestPassword(msg);
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
    defineReadOnly(this, '_signingKey', () => new SigningKey(account.privateKey));
    defineReadOnly(this, '_mnemonic', () => account.mnemonic);
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
    const msg = walletMsg(WalletAction.activate, address);
    const signingKey = await this.fromEncryptedJson(json, msg);
    this.setSigningKey(signingKey);
    this.setAddress(address);
  }

  /** Select the address to be the one used by the Signer */
  async setAddress(address: string) {
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
    const msg = walletMsg(WalletAction.privateKey, address);
    const keystore = await this.fromEncryptedJson(json, msg);
    return keystore.privateKey;
  }

  /** Get the mnemonic linked to an address */
  async getMnemonic(address: string = this.address) {
    if (address === this.address && this.hasSigningKey) {
      return this.mnemonic;
    }
    const json = await this.getEncryptedJson(address);
    const msg = walletMsg(WalletAction.mnemonic, address);
    const keystore = await this.fromEncryptedJson(json, msg);
    return keystore.mnemonic;
  }

  /** Get the current address selected */
  getAddress(): Promise<string> {
    return this.address$.toPromise();
  }

  ////////////
  // CRYPTO //
  ////////////
  /**
   * Sign a message with the current private key
   * @param message
   */
  async signMessage(message: string | ArrayLike<number>): Promise<string> {
    await this.requireAddress();
    await this.requireSigningKey();
    const signature = this._signingKey().signDigest(hashMessage(message));
    return joinSignature(signature);
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    const tx = await resolveProperties(transaction);
    if (tx.from !== null) {
      if (getAddress(tx.from) !== this.address) {
        throw new Error("transaction from address mismatch");
      }
      delete tx.from;
    }
    const hash = keccak256(serialize(tx))
    const signature = this._signingKey().signDigest(hash);
    return serialize(tx, signature);
  }

  connect(provider: Provider): Signer {
    this.provider = provider;
    return this;
  }
}
