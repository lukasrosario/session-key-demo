import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { encodeAbiParameters, Hex, stringToHex } from 'viem';

type BuildUserOperationParams = {
  ownerIndex: bigint;
  authenticatorData: string;
  clientDataJSON: string;
  r: bigint;
  s: bigint;
};

const WebAuthnAuthStruct = {
  components: [
    {
      name: 'authenticatorData',
      type: 'bytes',
    },
    { name: 'clientDataJSON', type: 'bytes' },
    { name: 'challengeIndex', type: 'uint256' },
    { name: 'typeIndex', type: 'uint256' },
    {
      name: 'r',
      type: 'uint256',
    },
    {
      name: 's',
      type: 'uint256',
    },
  ],
  name: 'WebAuthnAuth',
  type: 'tuple',
};

const SignatureWrapperStruct = {
  components: [
    {
      name: 'ownerIndex',
      type: 'uint256',
    },
    {
      name: 'signatureData',
      type: 'bytes',
    },
  ],
  name: 'SignatureWrapper',
  type: 'tuple',
};

export function buildWebAuthnSignature({
  ownerIndex,
  authenticatorData,
  clientDataJSON,
  r,
  s,
}: BuildUserOperationParams): Hex {
  const jsonClientDataUtf8 = isoBase64URL.toUTF8String(clientDataJSON);
  const challengeIndex = jsonClientDataUtf8.indexOf('"challenge":');
  const typeIndex = jsonClientDataUtf8.indexOf('"type":');

  const webAuthnAuthBytes = encodeAbiParameters(
    [WebAuthnAuthStruct],
    [
      {
        authenticatorData,
        clientDataJSON: stringToHex(jsonClientDataUtf8),
        challengeIndex,
        typeIndex,
        r,
        s,
      },
    ],
  );

  return encodeAbiParameters(
    [SignatureWrapperStruct],
    [
      {
        ownerIndex,
        signatureData: webAuthnAuthBytes,
      },
    ],
  );
}