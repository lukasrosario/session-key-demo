import { useState } from "react";
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';
import {client} from "./clients"
import {SmartAccount} from "viem/account-abstraction"
import {Account, Address, Hex, createPublicClient, http, toHex} from "viem"
import { baseSepolia } from "viem/chains";
import type { WebAuthnAccount } from 'viem/account-abstraction';

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
    const [localAccount, setLocalAccount] = useState<LocalAccount>()

    async function createLocalAccount({linkedAccount, createLocalOwner}: {linkedAccount: Address, createLocalOwner: () => Promise<Account | WebAuthnAccount>}): Promise<{ address: Address }> {
        if (localAccount) throw Error("Local account already exists")

        const localOwner = await createLocalOwner()
        const smartAccount = await toCoinbaseSmartAccount({
          client,
          owners: [localOwner, { address: linkedAccount } as any],
        });

        const ownerBytes = localOwner.type === 'webAuthn' ? localOwner.publicKey : localOwner.address
        const account = {...smartAccount, initialization: {owners: [ownerBytes, linkedAccount], salt: toHex(0)}}

        setLocalAccount(account)
     
        return account;
    }

    return {
        createLocalAccount,
        localAccount
    }
}