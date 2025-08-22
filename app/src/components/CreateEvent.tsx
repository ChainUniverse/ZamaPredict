import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Calendar, DollarSign, Shield } from 'lucide-react';

interface CreateEventProps {
  onEventCreated: () => void;
}

const CreateEvent: React.FC<CreateEventProps> = ({ onEventCreated }) => {
  const { isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    
    setIsLoading(true);
    // TODO: Implement event creation logic
    setTimeout(() => {
      setIsLoading(false);
      onEventCreated();
    }, 2000);
  };

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <Shield className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-white/60">
          Please connect your wallet to create prediction events.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Create Prediction Event</h2>
        <p className="text-white/80">
          Create a new prediction market with encrypted betting.
        </p>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Event Description</label>
            <textarea
              className="input h-24 resize-none"
              placeholder="e.g., Will Bitcoin reach $100K by end of 2024?"
              required
            />
            <p className="text-sm text-white/60 mt-1">
              Be specific and clear about the prediction criteria.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  className="input pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">End Time</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  className="input pl-10"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">YES Bet Price (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.00001"
                  min="0.0001"
                  className="input pl-10"
                  placeholder="0.1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">NO Bet Price (ETH)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.00001"
                  min="0.0001"
                  className="input pl-10"
                  placeholder="0.1"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-200 mb-1">Privacy Features</h4>
                <ul className="text-sm text-blue-100/80 space-y-1">
                  <li>• Bet amounts are encrypted using Zama FHE</li>
                  <li>• Bet directions (YES/NO) remain private</li>
                  <li>• Only final outcomes are publicly revealed</li>
                </ul>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner" />
                <span>Creating Event...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-white/60 text-sm">
        <p>Event creation requires owner permissions. Make sure you're connected with the correct wallet.</p>
      </div>
    </div>
  );
};

export default CreateEvent;