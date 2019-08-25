
export const enum WalletAction {
  add = 'Add Account',
  activate = 'Activate an Account',
  privateKey = 'Get Private Key',
  mnemonic = 'Get Mnemonic',
  sign = 'Sign Message',
  send = 'Send Transaction',
}

export interface WalletMsg {
  action: WalletAction;
  payload: any
}

export function walletMsg(action: WalletAction, payload: any) {
  return { action, payload };
}

export abstract class WalletManager {
  abstract requestPassword(message: WalletMsg): Promise<string>;
  abstract requestAddress(): Promise<string>;
}
