import { useState, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { getContract } from 'viem';
import { DEFAULT_CONTRACT_ADDRESS, PREDICTION_MARKET_ABI } from '@/constants/config';

export interface UserReward {
  eventId: number;
  pendingAmount: bigint;
  claimed: boolean;
}

export const useRewards = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const getPendingReward = useCallback(async (eventId: number): Promise<bigint> => {
    if (!publicClient || !address) {
      throw new Error('No public client or wallet not connected');
    }

    try {
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      const reward = await contract.read.getPendingReward([BigInt(eventId), address]) as bigint;
      return reward;
    } catch (err: any) {
      console.error('Error fetching pending reward:', err);
      throw new Error(err.message || 'Failed to fetch pending reward');
    }
  }, [publicClient, address]);

  const hasClaimedReward = useCallback(async (eventId: number): Promise<boolean> => {
    if (!publicClient || !address) {
      throw new Error('No public client or wallet not connected');
    }

    try {
      const contract = getContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: PREDICTION_MARKET_ABI,
        client: { public: publicClient }
      });

      const claimed = await contract.read.hasClaimedReward([BigInt(eventId), address]) as boolean;
      return claimed;
    } catch (err: any) {
      console.error('Error checking claim status:', err);
      throw new Error(err.message || 'Failed to check claim status');
    }
  }, [publicClient, address]);

  const getUserRewardForEvent = useCallback(async (eventId: number): Promise<UserReward> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError('');

    try {
      const [pendingAmount, claimed] = await Promise.all([
        getPendingReward(eventId),
        hasClaimedReward(eventId)
      ]);

      return {
        eventId,
        pendingAmount,
        claimed
      };
    } catch (err: any) {
      console.error('Error fetching user reward:', err);
      const errorMessage = err.message || 'Failed to fetch user reward';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getPendingReward, hasClaimedReward, address]);

  const getUserRewardsForEvents = useCallback(async (eventIds: number[]): Promise<UserReward[]> => {
    if (!address || eventIds.length === 0) {
      return [];
    }

    setIsLoading(true);
    setError('');

    try {
      const rewardPromises = eventIds.map(eventId => getUserRewardForEvent(eventId));
      const rewards = await Promise.all(rewardPromises);
      return rewards.filter(reward => reward.pendingAmount > 0n);
    } catch (err: any) {
      console.error('Error fetching user rewards:', err);
      const errorMessage = err.message || 'Failed to fetch user rewards';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getUserRewardForEvent, address]);

  return {
    getPendingReward,
    hasClaimedReward,
    getUserRewardForEvent,
    getUserRewardsForEvents,
    isLoading,
    error
  };
};