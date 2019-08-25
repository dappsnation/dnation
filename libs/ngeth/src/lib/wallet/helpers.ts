
import { HDNode, entropyToMnemonic } from "@ethersproject/hdnode";
import { isKeystoreWallet } from '@ethersproject/json-wallets/inspect';
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
  return isKeystoreWallet(text); // ! WARNING ethers perform check only on the version parameters of the keystore
}

/** check if the input string is any 32 bytes hex string */
export function isPrivateKey(text: string) {
  try {
    entropyToMnemonic(text);
    return true;
  } catch(err) {
    return false;
  }
}
