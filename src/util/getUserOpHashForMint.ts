import {
  Address,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  hexToBytes,
  http,
  padHex,
  parseAbiParameter,
  parseAbiParameters,
  parseEther,
} from "viem";
import { base } from "viem/chains";
import { entrypointAbi, entrypointAddress } from "../abi/entrypoint";
import { UserOperation, createBundlerClient } from "permissionless";
import { nftAbi, nftAddress } from "../abi/nft";
import { accountAbi } from "../abi/account";
import { base64urlnopad } from "@scure/base";

const DUMMY_SIGNATURE =  '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001949fc7c88032b9fcb5f6efc7a7b8c63668eae9871b765e23123bb473ff57aa831a7c0d9276168ebcc29f2875a0239cffdf2a9cd1c2007c5c77c071db9264df1d000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2273496a396e6164474850596759334b7156384f7a4a666c726275504b474f716d59576f4d57516869467773222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000'
export const publicClient = createPublicClient({ chain: base, transport: http() });
export const bundlerClient = createBundlerClient({
  chain: base,
  transport: http(
    "https://api.developer.coinbase.com/rpc/v1/base/CJKtQvtsFVrIj5zB-AcXWaHJbhXp7KAg"
  ),
  entryPoint: entrypointAddress,
});

export async function getUserOpHashForMint(sender: Address) {
  const maxFeePerGas = await publicClient.getGasPrice();
  const maxPriorityFeePerGas =
    await publicClient.estimateMaxPriorityFeePerGas();
  const nonce = await publicClient.readContract({
    address: entrypointAddress,
    abi: entrypointAbi,
    functionName: "getNonce",
    args: [sender, 0n],
  });
  const mintCallData = encodeFunctionData({
    abi: nftAbi,
    functionName: "mintWithRewards",
    args: [
      "0x04E2516A2c207E84a1839755675dfd8eF6302F0a",
      1n,
      1n,
      padHex(sender, {dir: 'left', size: 32}),
      "0x0000000000000000000000000000000000000000",
    ],
  });
  const encodedCallData = encodeFunctionData({
    abi: accountAbi,
    functionName: "executeBatch",
    args: [[{ target: nftAddress, data: mintCallData, value: parseEther('0.000777') }]],
  });
  const gasEstimates = await bundlerClient.estimateUserOperationGas({
    userOperation: {
      sender,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
      callData: encodedCallData,
      initCode: "0x",
      signature: DUMMY_SIGNATURE,
      paymasterAndData: "0x"
    },
  });
  const userOpToSign: UserOperation<'v0.6'> = {
    sender,
    nonce,
    maxFeePerGas: maxFeePerGas * 2n,
    maxPriorityFeePerGas: maxPriorityFeePerGas * 2n,
    callData: encodedCallData,
    initCode: "0x",
    paymasterAndData: "0x",
    preVerificationGas: gasEstimates.preVerificationGas * 5n,
    verificationGasLimit: gasEstimates.verificationGasLimit * 10n,
    callGasLimit: gasEstimates.callGasLimit * 5n,
    signature: DUMMY_SIGNATURE,
  };
  const userOpHash = await publicClient.readContract({
    address: entrypointAddress,
    abi: entrypointAbi,
    functionName: 'getUserOpHash',
    args: [{...userOpToSign}]
  })
  const base64UserOpHash = base64urlnopad.encode(hexToBytes(userOpHash));
  return {hash: base64UserOpHash, userOp: userOpToSign};
}
