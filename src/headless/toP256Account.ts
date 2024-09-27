import {
  AbiParameters,
  Base64,
  Hash,
  Hex,
  PublicKey,
  Signature,
  WebCryptoP256,
} from 'ox';
import { hashMessage, hashTypedData } from 'viem';
import type { WebAuthnAccount } from 'viem/account-abstraction';

const authenticatorData =
  '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000' as const;

export async function toP256Account(): Promise<WebAuthnAccount> {

  const keypair = await WebCryptoP256.createKeyPair({ extractable: false });
  const { privateKey, publicKey } = keypair;

  // TODO manage IndexedDB storage for CryptoKey

  const sign = async (payload: Hex.Hex) => {
    const challengeBase64 = Base64.fromHex(payload, { url: true, pad: false });
    const clientDataJSON = `{"type":"webauthn.get","challenge":"${challengeBase64}","origin":"https://keys.coinbase.com"}`;
    const challengeIndex = clientDataJSON.indexOf('"challenge":');
    const typeIndex = clientDataJSON.indexOf('"type":');
    const clientDataJSONHash = Hash.sha256(Hex.fromString(clientDataJSON));
    const message = AbiParameters.encodePacked(
      ['bytes', 'bytes32'],
      [authenticatorData, clientDataJSONHash]
    );
    const signature = await WebCryptoP256.sign({
      payload: message,
      privateKey,
    });
    return {
      signature: Signature.serialize(signature),
      webauthn: {
        authenticatorData,
        challengeIndex,
        clientDataJSON,
        typeIndex,
        userVerificationRequired: false,
      },
    };
  };

  return {
    publicKey: Hex.slice(PublicKey.serialize(publicKey), 1),
    async sign({ hash }) {
      return sign(hash);
    },
    async signMessage({ message }) {
      return sign(hashMessage(message));
    },
    async signTypedData(parameters) {
      return sign(hashTypedData(parameters));
    },
    type: 'webAuthn',
  };
}