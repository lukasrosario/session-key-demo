import { useAccount, useConnect, useWalletClient } from "wagmi";
import { useState } from "react";
import {
  encodeFunctionData,
  Hex,
  parseEther,
  parseUnits,
  toFunctionSelector,
} from "viem";
import { truncateMiddle } from "./util/truncateMiddle";
import {
  useCallsStatus,
  useGrantPermissions,
  useSendCalls,
} from "wagmi/experimental";
import { clickAbi } from "./abi/Click";
import { createCredential } from "webauthn-p256";
import { P256Credential } from "webauthn-p256";

const clickAddress = "0x8Af2FA0c32891F1b32A75422eD3c9a8B22951f2F";
const clickData = encodeFunctionData({
  abi: clickAbi,
  functionName: "click",
  args: [],
});

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { data: walletClient } = useWalletClient({ chainId: 84532 });
  const [submitted, setSubmitted] = useState(false);
  const [callsId, setCallsId] = useState<string>();
  const { data: callsStatus } = useCallsStatus({
    id: callsId as string,
    query: {
      enabled: !!callsId,
      refetchInterval: (data) =>
        data.state.data?.status === "PENDING" ? 200 : false,
    },
  });
  const [permissionsContext, setPermissionsContext] = useState<
    Hex | undefined
  >();
  const { grantPermissionsAsync } = useGrantPermissions();
  const [credential, setCredential] = useState<
    undefined | P256Credential<"cryptokey">
  >();
  const { sendCallsAsync } = useSendCalls();

  async function grantPermissions() {
    if (account.address) {
      const newCredential = await createCredential({ type: "cryptoKey" });
      const response = await grantPermissionsAsync({
        permissions: [
          {
            address: account.address,
            chainId: 84532,
            expiry: 17218875770,
            signer: {
              type: "p256",
              data: {
                publicKey: newCredential.publicKey,
              },
            },
            permissions: [
              {
                type: "native-token-recurring-allowance",
                data: {
                  allowance: parseEther("3"),
                  start: Math.floor(Date.now() / 1000),
                  period: 86400,
                },
              },
              {
                type: "allowed-contract-selector",
                data: {
                  contract: clickAddress,
                  selector: toFunctionSelector(
                    "permissionedCall(bytes calldata call)",
                  ),
                },
              },
            ],
          },
        ],
      });
      const context = response[0].context as Hex;
      setPermissionsContext(context);
      setCredential(newCredential);
    }
  }

  const login = async () => {
    connect({ connector: connectors[0] });
  };

  const buy = async () => {
    if (account.address && permissionsContext && credential && walletClient) {
      setSubmitted(true);
      setCallsId(undefined);
      try {
        const callsId = await sendCallsAsync({
          calls: [
            {
              to: clickAddress,
              value: parseUnits("0", 18),
              data: clickData,
            },
          ],
          capabilities: {
            permissions: {
              context: permissionsContext,
            },
          },
          prepareAndSign: true,
          sign: credential.sign,
          signatureData: {
            type: "permissions",
            values: {
              context: permissionsContext,
            },
          },
        });
        setCallsId(callsId);
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
            {!permissionsContext ? (
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
                  disabled={
                    submitted ||
                    (!!callsId && !(callsStatus?.status === "CONFIRMED"))
                  }
                >
                  Buy
                </button>
              </>
            )}
          </>
        )}
        {/* {!account.address && <h2 className="text-xl">Session key demo</h2>} */}
        {callsStatus && callsStatus.status === "CONFIRMED" && (
          <a
            href={`https://base-sepolia.blockscout.com/tx/${callsStatus.receipts?.[0].transactionHash}`}
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
