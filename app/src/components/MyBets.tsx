import React from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { TrendingUp, TrendingDown, Clock, CheckCircle, ExternalLink, Wallet, AlertCircle } from 'lucide-react';
import { useUserBets } from '@/hooks/useUserBets';
import { useContractWrite } from '@/hooks/useContract';
import LoadingSpinner from './LoadingSpinner';

const MyBets: React.FC = () => {
  const { isConnected } = useAccount();
  const { bets, isLoading, error, refetch } = useUserBets();
  const { claimWinnings, isLoading: isClaimingRewards } = useContractWrite();

  const handleClaimRewards = async (eventId: number) => {
    try {
      await claimWinnings(eventId);
      // Refresh bets after claiming
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  const getBetStatus = (bet: any) => {
    if (!bet.event) return { status: 'unknown', color: 'gray', text: 'Unknown Event' };
    
    if (!bet.event.resolved) {
      if (bet.event.endTime * 1000 > Date.now()) {
        return { status: 'active', color: 'blue', text: 'Active' };
      } else {
        return { status: 'pending', color: 'yellow', text: 'Pending Resolution' };
      }
    }
    
    // Event is resolved but we can't determine win/loss without decrypting user's bet
    // User needs to claim to find out the result
    if (!bet.claimed) {
      return { status: 'resolved-unclaimed', color: 'blue', text: 'Resolved - Check Result' };
    } else {
      return { status: 'resolved-claimed', color: 'gray', text: 'Resolved - Claimed' };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Remove this function as we no longer show the direction

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved-unclaimed':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'resolved-claimed':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Wallet className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-white/60">
            Please connect your wallet to view your betting history.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <LoadingSpinner />
          <p className="text-white/60 mt-4">Loading your bets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Error Loading Bets</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Bets</h1>
        <p className="text-white/60">
          View all your predictions and their outcomes
        </p>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">No Bets Yet</h2>
          <p className="text-white/60 mb-6">
            You haven't placed any bets yet. Start by browsing available prediction events.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bets.map((bet) => {
            const betStatus = getBetStatus(bet);
            
            return (
              <div
                key={`${bet.eventId}-${bet.txHash}`}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 break-words">
                      {bet.event?.description || `Event #${bet.eventId}`}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                      <span>Event #{bet.eventId}</span>
                      <span>•</span>
                      <span>{formatDate(bet.timestamp)}</span>
                      {bet.txHash && bet.txHash !== '0x' && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 hover:text-white transition-colors"
                          >
                            <span>View Transaction</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {getStatusIcon(betStatus.status)}
                    <span className={`text-sm font-medium whitespace-nowrap text-${betStatus.color}-400`}>
                      {betStatus.text}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-yellow-400">🔒</span>
                      <span className="text-sm font-medium text-white">
                        Your Prediction
                      </span>
                    </div>
                    <div className="font-semibold text-yellow-400">
                      ***
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-1">Amount Bet</div>
                    <div className="font-semibold text-white truncate">
                      {Number(formatEther(bet.amount)).toFixed(4)} ETH
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-yellow-400">🔒</span>
                      <span className="text-sm text-white/60">Shares</span>
                    </div>
                    <div className="font-semibold text-yellow-400 truncate">
                      ***
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    {bet.event?.resolved && (
                      <>
                        <div className="text-sm text-white/60 mb-1">Outcome</div>
                        <div className={`font-semibold flex items-center space-x-1 ${
                          bet.event.outcome ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {bet.event.outcome ? (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              <span>YES</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              <span>NO</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {betStatus.status === 'resolved-unclaimed' && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleClaimRewards(bet.eventId)}
                      disabled={isClaimingRewards}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      {isClaimingRewards ? (
                        <>
                          <LoadingSpinner />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Check Result & Claim</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBets;