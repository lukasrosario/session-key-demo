import {
    AbiParameters,
    Base64,
    Hash,
    Hex,
    PublicKey,
    Signature,
    WebCryptoP256,
  } from 'ox';
  import { Account, Address, hashMessage, hashTypedData, LocalAccount, zeroAddress } from 'viem';
  
  export type ToServerAccountParameters = {
    address: Address
    endpoint: string
  };
  
  export function toServerAccount(
    parameters: ToServerAccountParameters
  ): Account {
    const { address, endpoint } = parameters;
  
    const sign = async (hash: Hex.Hex) => {
        const signature = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify({
                method: "wallet_sign",
                params: [
                    {
                        hash,
                    }
                ],
                id: "f423c4a5-3774-4b5b-80cb-95b6fa18d27d", 
                jsonrpc: "2.0"
            }
        )})
        const data = await signature.json()

        return data.signature as Hex.Hex
    };
  
    return {
      address,
      async sign({ hash }) {
        return sign(hash);
      },
      async signMessage({ message }) {
        return sign(hashMessage(message));
      },
      async signTypedData(parameters) {
        return sign(hashTypedData(parameters));
      },
      type: 'local',
    };
  }