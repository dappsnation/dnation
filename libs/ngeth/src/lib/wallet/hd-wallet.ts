import { ExternallyOwnedAccount, Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/abstract-provider';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { SigningKey } from "@ethersproject/signing-key";
import { defaultPath, HDNode } from "@ethersproject/hdnode";
import { Bytes } from "@ethersproject/bytes";
import { Wordlist } from "@ethersproject/wordlists/wordlist";
import { BehaviorSubject, Observable } from 'rxjs';
import { Vault } from './vault';
import { decryptJsonWallet } from '@ethersproject/json-wallets';

export class HDWallet extends Signer implements ExternallyOwnedAccount {
  private _signingKey: () => SigningKey;

  private _address = new BehaviorSubject<string>(null);
  private _accounts = new BehaviorSubject<string[]>([]);
  public address$ = this._address.asObservable();
  public accounts$ = this._accounts.asObservable();

  privateKey: string;
  mnemonic?: string;
  path?: string;

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

  set address(address: string) {
    this._address.next(address);
  }

  //////////////
  // GENERATE //
  //////////////

  /**
   * Generate an HDNode from memonic and add it to the list of accounts
   * @param mnemonic
   * @param path
   * @param wordlist
   */
  fromMnemonic(mnemonic: string, path?: string, wordlist?: Wordlist) {
    const hdnode = HDNode
      .fromMnemonic(mnemonic, null, wordlist)
      .derivePath(path || defaultPath);

  }

  fromEncryptedJson(json: string, password: Bytes | string): Observable<number> {
    // TODO : get percentage from callback
    // decryptJsonWallet(json, password, )
    throw new Error('No implmemented');
  }

  /** Get the current address selected */
  getAddress(): Promise<string> {
    return this.address$.toPromise();
  }

  signMessage(message: string | ArrayLike<number>): Promise<string> {
    throw new Error('No implmemented');
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    throw new Error('Method not implemented.');
  }

  connect(provider: Provider): Signer {
    this.provider = provider;
    return this;
  }
}
