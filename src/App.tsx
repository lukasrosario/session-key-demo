import { useAccount, useConnect, useWalletClient } from "wagmi";
import { useState } from "react";
import { WalletClient, parseUnits, toHex, encodeAbiParameters, encodeFunctionData } from "viem";
import { truncateMiddle } from "./util/truncateMiddle";
import { sendCalls } from "viem/experimental";
import { baseSepolia } from "viem/chains";
import { GrantedPermission } from "./types";
import { createCredential } from "webauthn-p256"
import { friendTechAbi } from "./abi/friendTech";

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const [permissionsContext, setPermissionsContext] = useState('')
  const { data: walletClient } = useWalletClient({chainId: 84532});
  const [submitted, setSubmitted] = useState(false);
  const [userOpHash, setUserOpHash] = useState<string>()
  const [lastCredentialId, setLastCredentialId] = useState<string>("")

  const friendTechAddress = '0x1c09162287f31C6a05cfD9494c23Ef86cafbcDC4'
  const friendTechPermissionArgs = encodeAbiParameters(
    [
      { name: 'maxBuyAmount', type: 'uint256' },
      { name: 'maxSellyAmount', type: 'uint256' },
    ],
    [parseUnits("100", 18), parseUnits("100", 18)]
  )
  const friendTechBuySharesCallData = encodeFunctionData({abi: friendTechAbi, functionName: "buyShares", args: [BigInt(1), BigInt(10)]})

  async function grantPermissions() {
    const credential = await createCredential({name: "Demo App"})
    setLastCredentialId(credential.id)
    const encodedPublicKey = encodeAbiParameters(
      [
        { name: "x", type: "uint256" },
        { name: "y", type: "uint256" },
      ],
      [credential.publicKey.x, credential.publicKey.y]
    );
    console.log("encodedPublicKey", encodedPublicKey);
    const grantedPermissions = await walletClient?.request({method: "wallet_grantPermissions", params: {
      permissions: [
        {
          account: account.address,
          chainId: toHex(84532),
          expiry: 95778400000,
          signer: {
            type: "passkey",
            data: {
              publicKey: encodedPublicKey,
              credentialId: credential.id
            }
          },
          permission: {
            type: "call-with-permission",
            data: {
              allowedContract: friendTechAddress,
              permissionArgs: friendTechPermissionArgs
            },
          },
          policies: [
              {
                  type: "native-token-spend-limit",
                  data: {
                      allowance: toHex(parseUnits("1", 18)),
                  },
              }
          ]
        }, 
      ]
    }}) as GrantedPermission[]
    setPermissionsContext(grantedPermissions?.[0]?.context ?? "")
  }

  const login = async () => {
    await connect({ connector: connectors[0] })
  };

  const buy = async () => {
    if (account.address) {
      setSubmitted(true)
      setUserOpHash(undefined)
      try {
        const userOpHash = await sendCalls(walletClient as WalletClient, {
          account: account.address,
          chain: baseSepolia,
          calls:[{
            to: friendTechAddress,
            value: 0n,
            data: friendTechBuySharesCallData
          }],
          capabilities: {
            permissions: {
              context: permissionsContext,
              credentialId: lastCredentialId
            }
          }
        })
        if (userOpHash) {
          setUserOpHash(userOpHash)
        }
      } catch (e: any) {
        console.error(e)
      }
      setSubmitted(false)
    }
  };

  return (
    <div className="bg-blue-700 h-screen w-screen flex flex-col items-center justify-center text-white relative">
      <div className="absolute top-4 right-4">
        {account.address && <span className="text-lg">{truncateMiddle(account.address)}</span>}
        {!account.address && (
          <button
            className="bg-white text-black p-2 rounded-lg w-36 text-lg"
            onClick={login}
            type="button"
          >
            Log in
          </button>
        )}
      </div>

      <div className="div flex flex-col items-center justify-center space-y-8 relative">
        {!account.address ? (
          <h2 className="text-xl">Session key demo</h2>
        ) : (
          <>
          {permissionsContext == "" ? (
            <>
              <button
                className="bg-white text-black p-2 rounded-lg w-fit text-lg disabled:bg-gray-400"
                type="button"
                onClick={grantPermissions}
                disabled={submitted}
                >
                Grant Permission
              </button>
                </>
          ) : (
            <>
              <button
                className="bg-white text-black p-2 rounded-lg w-36 text-lg disabled:bg-gray-400"
                type="button"
                onClick={buy}
                disabled={submitted}
                >
                Buy
              </button>
                </>
          )}
          </>
        )}
        {/* {!account.address && <h2 className="text-xl">Session key demo</h2>} */}
        {userOpHash && (
          <a href={`https://base-sepolia.blockscout.com/op/${userOpHash}`} target="_blank" className="absolute top-8 hover:underline">View transaction</a>
        )}
      </div>
    </div>
  );
}

export default App;
