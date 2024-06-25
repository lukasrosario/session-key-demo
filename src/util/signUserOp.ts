import { startAuthentication } from "@simplewebauthn/browser";
import { Address, toHex } from "viem";
import { extractRSFromSig } from "./extractRSFromSig";
import { buildWebAuthnSignature } from "./buildUserWebAuthnSignature";
import { publicClient } from "./getUserOpHashForMint";
import { accountAbi } from "../abi/account";

export async function signUserOp(options: any, address: Address) {
  const { response } = await startAuthentication(options);
  const ownerIndex = await publicClient.readContract({abi: accountAbi, functionName: 'ownerCount', address})

  const authenticatorData = toHex(
    Buffer.from(response.authenticatorData, "base64")
  );

  const { r, s } = extractRSFromSig(response.signature);

  const signature = buildWebAuthnSignature({
    r,
    s,
    ownerIndex: ownerIndex - 1n,
    authenticatorData,
    clientDataJSON: response.clientDataJSON,
  });

  return signature
}
