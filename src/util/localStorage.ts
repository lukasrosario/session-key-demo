import { Address, Hex } from "viem";

export function setContextForAddress(address: Address, context: Hex) {
    localStorage.setItem(`context-${address}`, context);
}

export function getContextForAddress(address: Address): Hex | undefined {
    const context = localStorage.getItem(`context-${address}`);
    return context ? context as Hex : undefined;
}