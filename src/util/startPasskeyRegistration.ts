import { startRegistration } from "@simplewebauthn/browser";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cose, decodeAttestationObject, decodeCredentialPublicKey, isoBase64URL, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { v4 as uuidv4 } from "uuid";
import { encodeAbiParameters, stringToBytes, toHex } from "viem";

export const PASSKEY_RP_ID = import.meta.env.PASSKEY_RP_ID as string;

export async function startPasskeyRegistration() {
  const options = await generateRegistrationOptions({
    challenge: "challenge",
    rpName: "Demo App",
    rpID: PASSKEY_RP_ID,
    userID: stringToBytes(uuidv4()),
    userName: `Demo App`,
    userDisplayName: `Demo App`,
    attestationType: "direct",
    supportedAlgorithmIDs: [cose.COSEALG.ES256],
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  const attestation = await startRegistration(options);
  if (!attestation) {
    throw new Error('Passkey registration failed');
  }

  const attestationObject = isoBase64URL.toBuffer(attestation.response.attestationObject);
  const decodedAttestationObject = decodeAttestationObject(attestationObject);

  // Extract public key from attestation object
  const authData = decodedAttestationObject.get('authData');
  const parsedAuthData = parseAuthenticatorData(authData);
  const credentialPublicKey = parsedAuthData.credentialPublicKey as Uint8Array;
  const decodedPublicKey = decodeCredentialPublicKey(credentialPublicKey) as cose.COSEPublicKeyEC2;
  const xCoordinate = decodedPublicKey.get(cose.COSEKEYS.x) as Uint8Array;
  const yCoordinate = decodedPublicKey.get(cose.COSEKEYS.y) as Uint8Array;
  const xHex = toHex(xCoordinate);
  const yHex = toHex(yCoordinate);
  const combinedPubKey = encodeAbiParameters(
    [
      { name: 'x', type: 'bytes32' },
      { name: 'y', type: 'bytes32' },
    ],
    [xHex, yHex],
  );

  return {
    publicKey: combinedPubKey,
    credentialID: attestation.rawId,
  };
}
