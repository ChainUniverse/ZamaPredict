import { useState } from 'react';
import { useWriteContract, useWalletClient, useAccount } from 'wagmi';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';
import { useFHE } from '@/utils/fhe';

export const useContractWrite = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { createEncryptedInput, instance } = useFHE();

  const convertHandle = (handle: any): string => {
    let formattedHandle: string;
    if (typeof handle === 'string') {
      formattedHandle = handle.startsWith('0x') ? handle : `0x${handle}`;
    } else if (handle instanceof Uint8Array) {
      formattedHandle = `0x${Array.from(handle).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    } else {
      formattedHandle = `0x${handle.toString()}`;
    }
    return formattedHandle
  };

  const placeBet = async (
    eventId: number,
    shares: bigint,
    isYes: boolean,
    betAmount: bigint
  ) => {
    if (!walletClient || !address || !instance) {
      throw new Error('Wallet not connected or FHE not initialized');
    }
    console.log('Placing bet with encrypted input:', {
      eventId,
      shares: shares.toString(),
      isYes,
      betAmount: betAmount.toString()
    });
    setIsLoading(true);
    setError('');

    try {
      // Create encrypted input for the bet
      const input = createEncryptedInput(DEFAULT_CONTRACT_ADDRESS, address);

      // Add encrypted values - shares (as 32-bit) and direction
      input.add32(Number(shares));
      input.addBool(isYes);

      // Encrypt the input
      const encryptedInput = await input.encrypt();

      console.log('Placing bet with encrypted input:', {
        eventId,
        shares: shares.toString(),
        isYes,
        betAmount: betAmount.toString(),
        handles: encryptedInput.handles
      });

      // Call the smart contract function
      const hash = await writeContractAsync({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [
          BigInt(eventId),
          convertHandle(encryptedInput.handles[0]) as `0x${string}`, // encrypted shares
          convertHandle(encryptedInput.handles[1]) as `0x${string}`, // encrypted direction
          convertHandle(encryptedInput.inputProof) as `0x${string}`
        ],
        value: betAmount, // Send ETH with the transaction
      });

      console.log('Bet placed successfully, tx hash:', hash);
      return hash;

    } catch (err: any) {
      console.error('Error placing bet:', err);
      const errorMessage = err.message || 'Failed to place bet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveBet = async (eventId: number, outcome: boolean) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError('');

    try {
      const hash = await writeContractAsync({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'resolveEvent',
        args: [BigInt(eventId), outcome],
      });

      console.log('Event resolved successfully, tx hash:', hash);
      return hash;

    } catch (err: any) {
      console.error('Error resolving event:', err);
      const errorMessage = err.message || 'Failed to resolve event';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const claimWinnings = async (eventId: number) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError('');

    try {
      const hash = await writeContractAsync({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimReward',
        args: [BigInt(eventId)],
      });

      console.log('Winnings claimed successfully, tx hash:', hash);
      return hash;

    } catch (err: any) {
      console.error('Error claiming winnings:', err);
      const errorMessage = err.message || 'Failed to claim winnings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    placeBet,
    resolveBet,
    claimWinnings,
    isLoading,
    error
  };
};