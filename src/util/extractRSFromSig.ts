import { p256 } from '@noble/curves/p256';
import { bytesToBigInt, hexToBytes } from 'viem';

// adapted from Daimo
export function extractRSFromSig(base64Signature: string): {
  r: bigint;
  s: bigint;
} {
  // Create an ECDSA instance with the secp256r1 curve

  // Decode the signature from Base64
  const signatureDER = Buffer.from(base64Signature, 'base64');
  const parsedSignature = p256.Signature.fromDER(signatureDER);
  const bSig = hexToBytes(`0x${parsedSignature.toCompactHex()}`);
  // assert(bSig.length === 64, "signature is not 64 bytes");
  const bR = bSig.slice(0, 32);
  const bS = bSig.slice(32);

  // Avoid malleability. Ensure low S (<= N/2 where N is the curve order)
  const r = bytesToBigInt(bR);
  let s = bytesToBigInt(bS);
  const n = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');
  if (s > n / 2n) {
    s = n - s;
  }
  return { r, s };
}
