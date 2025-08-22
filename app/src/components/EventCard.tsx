import React from 'react';
import { Calendar, Clock, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { formatEther } from 'viem';
import { PredictionEvent } from '@/hooks/useEvents';
import { getEventStatus, isEventActive } from '@/constants/config';

interface EventCardProps {
  event: PredictionEvent;
  onBet?: (eventId: number) => void;
  onResolve?: (eventId: number) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onBet, onResolve }) => {
  const status = getEventStatus(event.startTime, event.endTime, event.resolved);
  const canBet = isEventActive(event.startTime, event.endTime, event.resolved);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'upcoming': return 'text-blue-400 bg-blue-400/10';
      case 'ended': return 'text-yellow-400 bg-yellow-400/10';
      case 'resolved': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      case 'ended': return <XCircle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="card hover:border-white/20 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {event.description}
          </h3>
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            <span className="capitalize">{status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Start Time</span>
          </div>
          <div className="text-white">{formatDate(event.startTime)}</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <Clock className="w-4 h-4" />
            <span>End Time</span>
          </div>
          <div className="text-white">{formatDate(event.endTime)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span>YES Price</span>
          </div>
          <div className="text-white">{formatEther(event.priceYes)} ETH</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span>NO Price</span>
          </div>
          <div className="text-white">{formatEther(event.priceNo)} ETH</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span className="text-yellow-400">🔒</span>
            <span>YES Total</span>
          </div>
          <div className="text-yellow-400 font-semibold">***</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-white/60 mb-1">
            <span className="text-yellow-400">🔒</span>
            <span>NO Total</span>
          </div>
          <div className="text-yellow-400 font-semibold">***</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-white/60 mb-4">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>Total Pool: {formatEther(event.totalEth)} ETH</span>
        </div>
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-4 h-4" />
          <span>Event #{event.id}</span>
        </div>
      </div>

      {event.resolved && (
        <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-purple-400" />
            <span className="text-purple-200 font-medium">
              Resolved: {event.outcome ? 'YES' : 'NO'} won
            </span>
          </div>
          {event.decryptionDone && (
            <div className="mt-2 text-sm text-purple-100/80">
              YES Total: {event.decryptedYes} • NO Total: {event.decryptedNo}
            </div>
          )}
        </div>
      )}

      {canBet && onBet && (
        <button
          onClick={() => onBet(event.id)}
          className="btn btn-primary w-full"
        >
          Place Bet
        </button>
      )}

      {status === 'upcoming' && (
        <div className="text-center text-white/60 text-sm">
          Betting opens {formatDate(event.startTime)}
        </div>
      )}

      {status === 'ended' && !event.resolved && (
        <div className="space-y-2">
          <div className="text-center text-yellow-200 text-sm">
            Waiting for resolution...
          </div>
          {onResolve && (
            <button
              onClick={() => onResolve(event.id)}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Resolve Event</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;