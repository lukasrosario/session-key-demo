import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { PASSKEY_RP_ID } from "./startPasskeyRegistration";

export async function getAuthOptions(hash: string, credentialId: string) {
  const options = await generateAuthenticationOptions({
    rpID: PASSKEY_RP_ID,
    challenge: hash,
    allowCredentials: [
      {
        id: credentialId,
      },
    ],
    userVerification: "preferred",
  });
  options.challenge = hash;
  return options
}
