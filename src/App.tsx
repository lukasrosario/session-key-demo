import { useAccount, useConfig, useConnect, useWalletClient } from "wagmi";
import { useState } from "react";
import { WalletClient, WalletGrantPermissionsReturnType, parseUnits, } from "viem";
import { truncateMiddle } from "./util/truncateMiddle";
import { sendCalls } from "viem/experimental";
import { baseSepolia } from "viem/chains";
import { connect } from "wagmi/actions";

function App() {
  const account = useAccount();
  const config = useConfig()
  const { connectors } = useConnect();
  const [permissionsContext, setPermissionsContext] = useState('')
  const { data: walletClient } = useWalletClient({chainId: 84532});
  const [submitted, setSubmitted] = useState(false);
  const [userOpHash, setUserOpHash] = useState<string>()

  const createSession = async () => {
    const response = await connect(config, {connector: connectors[0], requests: [
      // { message: "Sign in" },
      {
        permissions: {
          expiry: 95778400000,
          chainId: 84532,
          signer: {
            type: "wallet",
          },
          permissions: [
            {
                required: true,
                type: "session-call",
                data: {},
                policies: [
                    {
                        type: "native-token-spend-limit",
                        data: {
                            value: "0x100",
                        },
                    }
                ]
            }
        ]
        },
      },
    ] })
    const context = (response.requestResponses.find(((request) => {
      return request instanceof Object && 'permissionsContext' in request
    })) as WalletGrantPermissionsReturnType).permissionsContext
    setPermissionsContext(context)
  };

  const mint = async () => {
    if (account.address) {
      setSubmitted(true)
      setUserOpHash(undefined)
      try {
        const userOpHash = await sendCalls(walletClient as WalletClient, {
          account: account.address,
          chain: baseSepolia,
          calls:[{
            to: '0x416EDD85FA37A3bE56b9fE95B996359B539dA1A3',
            value: 0n,
            data: '0x7bc361a300000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000044beebc5da0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000'
          }],
          capabilities: {
            permissions: {
              context: permissionsContext
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
            onClick={createSession}
            type="button"
          >
            Log in
          </button>
        )}
      </div>

      <div className="div flex flex-col items-center justify-center space-y-8 relative">
        {!account.address && <h2 className="text-xl">Session key demo</h2>}
        {account.address && (
          <>
            <button
              className="bg-white text-black p-2 rounded-lg w-36 text-lg disabled:bg-gray-400"
              type="button"
              onClick={mint}
              disabled={submitted}
            >
              Buy
            </button>
          </>
        )}
        {userOpHash && (
          <a href={`https://base-sepolia.blockscout.com/op/${userOpHash}`} target="_blank" className="absolute top-8 hover:underline">View transaction</a>
        )}
      </div>
    </div>
  );
}

export default App;
