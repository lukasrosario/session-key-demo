import { useState } from "react";
import { WebCryptoP256 } from "ox";
import { toP256Account } from "./toP256Account";
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';
import {client} from "./clients"
import {SmartAccount} from "viem/account-abstraction"
import {Address, Hex, createPublicClient, createWalletClient, http, toHex} from "viem"
import { useConnectors } from "wagmi";
import { prepareCalls } from "viem/experimental";
import { sendPreparedCalls } from "viem/experimental";
import { baseSepolia } from "viem/chains";

const TRANSPORT = http(`https://api.developer.coinbase.com/rpc/v1/base-sepolia/mRNmU6kEyMh8nS5sm0ZxokXMAyeRx__5`)

const client = createPublicClient({
    chain: baseSepolia,
    transport: TRANSPORT
})

export type LocalAccount = SmartAccount & {
    initialization: {
        owners: Hex[]
        salt: Hex
    }
}


export function useLocalAccount() {
    const connectors = useConnectors()

    const [localAccount, setLocalAccount] = useState<LocalAccount>()

    async function createLocalAccount(linkedAccount: Address): Promise<{ address: Address }> {
        if (localAccount) throw Error("Local account already exists")

        const keypair = await WebCryptoP256.createKeyPair({ extractable: false });
        const localOwner = toP256Account(keypair);
    
        const smartAccount = await toCoinbaseSmartAccount({
          client,
          owners: [localOwner, { address: linkedAccount } as any],
        });

        const account = {...smartAccount, initialization: {owners: [localOwner.publicKey, linkedAccount], salt: toHex(0)}}

        setLocalAccount(account)
     
        return account;
    }

    return {
        createLocalAccount,
        localAccount,
        localWalletClient: !localAccount ? undefined : createWalletClient({account: localAccount, chain: client.chain, transport: TRANSPORT})
    }
}