import { useAccount, useConnect, useWalletClient } from "wagmi";
import { useState } from "react";
import {
  WalletClient,
  toHex,
  encodeFunctionData,
  decodeAbiParameters,
  Hex,
  parseEther,
} from "viem";
import { truncateMiddle } from "./util/truncateMiddle";
import { sendCalls } from "viem/experimental";
import { baseSepolia } from "viem/chains";
import { GrantedPermission } from "./types";
import { friendTechAbi } from "./abi/friendTech";
import { useActivePermissions } from "wagmi/experimental";

const friendTechAddress = "0x1c09162287f31C6a05cfD9494c23Ef86cafbcDC4";
const friendTechBuySharesCallData = encodeFunctionData({
  abi: friendTechAbi,
  functionName: "buyShares",
  args: [BigInt(1), BigInt(10)],
});

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { data: walletClient } = useWalletClient({ chainId: 84532 });
  const [submitted, setSubmitted] = useState(false);
  const [userOpHash, setUserOpHash] = useState<string>();
  const { data: permissions } = useActivePermissions(account);

  async function grantPermissions() {
    if (account.address) {
      (await walletClient?.request({
        method: "wallet_grantPermissions",
        params: {
          // @ts-ignore
          permissions: [
            {
              account: account.address,
              chainId: toHex(84532),
              expiry: 17218875770,
              signer: {
                type: "provider",
              },
              permission: {
                type: "native-token-rolling-spend-limit",
                data: {
                  spendLimit: toHex(parseEther("3")), // hex for uint256
                  rollingPeriod: 60 * 60, // unix seconds
                  allowedContract: friendTechAddress, // only allowed to spend on this contract
                },
              },
              policies: [],
            },
          ],
        },
      })) as GrantedPermission[];
    }
  }

  const login = async () => {
    connect({ connector: connectors[0] });
  };

  const buy = async () => {
    // @ts-expect-error
    if (account.address && permissions?.[0]?.context) {
      setSubmitted(true);
      setUserOpHash(undefined);
      try {
        const callsId = await sendCalls(walletClient as WalletClient, {
          account: account.address,
          chain: baseSepolia,
          calls: [
            {
              to: friendTechAddress,
              value: 0n,
              data: friendTechBuySharesCallData,
            },
          ],
          capabilities: {
            permissions: {
              context: permissions.context,
            },
          },
        });
        if (callsId) {
          const [userOpHash] = decodeAbiParameters(
            [
              { name: "userOpHash", type: "bytes32" },
              { name: "chainId", type: "uint256" },
            ],
            callsId as Hex,
          );
          setUserOpHash(userOpHash);
        }
      } catch (e: any) {
        console.error(e);
      }
      setSubmitted(false);
    }
  };

  return (
    <div className="bg-blue-700 h-screen w-screen flex flex-col items-center justify-center text-white relative">
      <div className="absolute top-4 right-4">
        {account.address && (
          <span className="text-lg">{truncateMiddle(account.address)}</span>
        )}
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
          <h2 className="text-xl">Permissions demo</h2>
        ) : (
          <>
            {
              // @ts-expect-error
              !permissions?.[0]?.context ? (
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
              )
            }
          </>
        )}
        {/* {!account.address && <h2 className="text-xl">Session key demo</h2>} */}
        {userOpHash && (
          <a
            href={`https://base-sepolia.blockscout.com/op/${userOpHash}`}
            target="_blank"
            className="absolute top-8 hover:underline"
          >
            View transaction
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
