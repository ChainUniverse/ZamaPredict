import React from 'react';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';

const EventList: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Prediction Events</h2>
        <p className="text-white/80">
          Place encrypted bets on upcoming events. Your predictions remain private until resolution.
        </p>
      </div>
      
      {/* Placeholder for when no events exist */}
      <div className="card text-center py-12">
        <div className="flex justify-center mb-4">
          <TrendingUp className="w-16 h-16 text-white/40" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Events Available</h3>
        <p className="text-white/60 mb-6">
          There are no prediction events at the moment. Check back later or create your own event!
        </p>
        <div className="flex justify-center space-x-4 text-sm text-white/50">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>0 Active Bettors</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>0 Active Events</span>
          </div>
        </div>
      </div>
      
      {/* Coming soon features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h4 className="font-semibold text-white mb-2">Event Filtering</h4>
          <p className="text-white/60 text-sm">Filter events by status, category, and time</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h4 className="font-semibold text-white mb-2">Real-time Odds</h4>
          <p className="text-white/60 text-sm">Live odds calculation based on encrypted bets</p>
        </div>
        <div className="card text-center">
          <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h4 className="font-semibold text-white mb-2">Private Betting</h4>
          <p className="text-white/60 text-sm">Your bet amounts and directions stay encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default EventList;