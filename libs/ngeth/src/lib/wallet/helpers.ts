
import { HDNode } from "@ethersproject/hdnode";
import { KeystoreAccount } from '@ethersproject/json-wallets/keystore';
import { SigningKey } from '@ethersproject/signing-key';

export function isMnemonic(text: string) {
  try {
    HDNode.fromMnemonic(text);
    return true;
  } catch(e) {
    return false;
  }
}

export function isJsonKeyStore(text: string) {
  try {
    const json = JSON.parse(text);
    return json instanceof KeystoreAccount;
  } catch(e) {
    return false;
  }
}

// isSigningKey https://github.com/ethers-io/ethers.js/blob/ethers-v5-beta/packages/wallet/src.ts/index.ts#L67
export function isPrivateKey(text: string) {
  return SigningKey.isSigningKey(text);
}
