export const rpcMethods = [
  'eth_getBalance',
  'eth_getStorageAt',
  'eth_getCode',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'eth_call',
  'eth_estimateGas',
  'eth_network',
  // TODO : fill this with https://github.com/ethereum/wiki/wiki/JSON-RPC
] as const;

export type RPCMethods = (typeof rpcMethods)[number];
