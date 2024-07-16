import { Hex } from "viem";

export type GrantPermission = {
    account: `0x${string}`;
    chainId: `0x${string}`; // hex-encoding of uint256
    expiry: number; // unix seconds
    signer: {
      type: string; // enum defined by ERC
      data?: any;
    };
    permission: {
      type: string; // enum defined by ERC
      data: any;
    };
    policies: {
      type: string; // enum defined by ERC
      data: any;
    }[];
  };

  // sample signer types, non-exhaustive
export type PasskeySigner = {
    type: "passkey";
    data: {
      publicKey: `0x${string}`; // total public key with x&y combined, expected length 64-bytes
      credentialId: string;
    };
  };
  
  export type AccountSigner = {
    type: "account";
    data: {
      address: `0x${string}`; // recall that chainId is defined in the parent GrantPermission object
    };
  };
  
  // sample permission types, non-exhaustive
  export type CallWithPermission = {
    type: "call-with-permission";
    data: {
      allowedContract: `0x${string}`; // single contract allowed to make calls with permission to
      permissionArgs: `0x${string}`; // encoded contract-specific arguments for the permission
    };
  };
  
  // sample policy types, non-exhaustive
  export type NativeTokenSpendLimitPolicy = {
    type: "native-token-spend-limit";
    data: {
      allowance: `0x${string}`; // hex-encoding of uint256 value
    };
  };

  export type GrantedPermission = GrantPermission & {
    // arbitrary context to identify a permission for revoking permissions or submitting userOps, can contain non-identifying data as well
    context: Hex;
    // 4337 account deployment
    accountMeta?: {
      factory: `0x${string}`;
      factoryData: `0x${string}`;
    };
    signerMeta?: {
      // 7679 userOp building
      userOpBuilder?: `0x${string}`;
      // 7710 delegation
      delegationManager?: `0x${string}`;
    };
  };