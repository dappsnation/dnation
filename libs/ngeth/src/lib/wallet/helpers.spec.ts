import { isMnemonic, isJsonKeyStore, isPrivateKey } from "./helpers";

describe('helpers', () => {
  describe('isMnemonic', () => {
    test('valid 12', () => {
      expect(isMnemonic('actor hen spy symptom smoke early home team vapor evil coconut attract')).toBeTruthy();
    });
    test('valid 24', () => {
      expect(isMnemonic('poet cube boy foam diet observe absorb renew south panda awful police search carpet defense crazy bread pear gossip shock raccoon coffee object kiwi')).toBeTruthy();
    });
    test('wrong length', () => {
      expect(isMnemonic('actor hen spy symptom smoke early home team vapor coconut attract')).toBeFalsy();
    });
    test('wrong word', () => {
      expect(isMnemonic('actor hen spy smyptom smoke early home team vapor evil coconut attract')).toBeFalsy();
    });
  });
  describe('isJsonKeyStore', () =>{
    test('valid', () => {
      const keyStore = "{\"address\":\"3efd05074df4a1c3d666c763becdd2ae321a4ffa\",\"id\":\"4e685554-21c3-4179-82d5-589421c6965d\",\"version\":3,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"c65d2e7fdfb6d5cec3ff3c4f1aabea52\"},\"ciphertext\":\"8381ed11a2ec9f373810ef60c46aae1d785e13677895ab4623c921226cb94a9b\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"db0267ae7847d5b9c21270b9d657b382544f72100a979320a7eff6d98a4b08c9\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"b420a0fde9a07c596ba1ce0c6bd2b88e7d08a5bf77c1eef9d444ad05eaac1351\"},\"x-ethers\":{\"client\":\"ethers.js\",\"gethFilename\":\"UTC--2019-08-25T13-49-13.0Z--3efd05074df4a1c3d666c763becdd2ae321a4ffa\",\"mnemonicCounter\":\"28b341f6558d9d26a5dc44d38b9450e5\",\"mnemonicCiphertext\":\"dddb416470cc5b8749463abe1b56bdf9\",\"path\":\"m/44'/60'/0'/0/0\",\"version\":\"0.1\"}}";
      expect(isJsonKeyStore(keyStore)).toBeTruthy();
    });
    test('invalid', () => {
      const keyStore = "{\"address\":\"3efd05074df4a1c3d666c763becdd2ae321a4ffa\",\"id\":\"4e685554-21c3-4179-82d5-589421c6965d\",\"version\":2,\"Crypto\":{\"cipher\":\"aes-128-ctr\",\"cipherparams\":{\"iv\":\"c65d2e7fdfb6d5cec3ff3c4f1aabea52\"},\"ciphertext\":\"8381ed11a2ec9f373810ef60c46aae1d785e13677895ab4623c921226cb94a9b\",\"kdf\":\"scrypt\",\"kdfparams\":{\"salt\":\"db0267ae7847d5b9c21270b9d657b382544f72100a979320a7eff6d98a4b08c9\",\"n\":131072,\"dklen\":32,\"p\":1,\"r\":8},\"mac\":\"b420a0fde9a07c596ba1ce0c6bd2b88e7d08a5bf77c1eef9d444ad05eaac1351\"},\"x-ethers\":{\"client\":\"ethers.js\",\"gethFilename\":\"UTC--2019-08-25T13-49-13.0Z--3efd05074df4a1c3d666c763becdd2ae321a4ffa\",\"mnemonicCounter\":\"28b341f6558d9d26a5dc44d38b9450e5\",\"mnemonicCiphertext\":\"dddb416470cc5b8749463abe1b56bdf9\",\"path\":\"m/44'/60'/0'/0/0\",\"version\":\"0.1\"}}";
      expect(isJsonKeyStore(keyStore)).toBeFalsy();
    });
  });
  describe('isPrivateKey', () => {
    test('valid', () => {
      expect(isPrivateKey('0xa726ac6aad03db30c035b1d033ec42d3dc20458e59961b744193e32b045a6603')).toBeTruthy();
    });
    test('invalid', () => {
      expect(isPrivateKey('0xa726ac6aad03db30c035b1d033ec42d3dc20458e59961b744193e32b045a66')).toBeFalsy();
    });
  });
});
