import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './wagmi';
import { initializeFHE } from './utils/fhe';
import Header from './components/Header';
import EventList from './components/EventList';
import CreateEvent from './components/CreateEvent';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

const queryClient = new QueryClient();

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'create'>('events');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFHE();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize FHE:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize FHE');
      }
    };

    init();
  }, []);

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Initialization Error</h2>
          <p className="text-white/80 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <LoadingSpinner size="large" />
          <h2 className="text-xl font-bold text-white mt-4">Initializing ZamaPredict</h2>
          <p className="text-white/80 mt-2">Setting up encrypted prediction market...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              <Header />
              
              <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">
                      ZamaPredict
                    </h1>
                    <p className="text-xl text-white/80 mb-6">
                      Private prediction market powered by Zama FHE
                    </p>
                    
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => setActiveTab('events')}
                        className={`btn px-6 py-3 ${
                          activeTab === 'events' ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        Browse Events
                      </button>
                      <button
                        onClick={() => setActiveTab('create')}
                        className={`btn px-6 py-3 ${
                          activeTab === 'create' ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        Create Event
                      </button>
                    </div>
                  </div>
                  
                  <div className="animate-fade-in">
                    {activeTab === 'events' ? (
                      <EventList />
                    ) : (
                      <CreateEvent onEventCreated={() => setActiveTab('events')} />
                    )}
                  </div>
                </div>
              </main>
              
              <footer className="bg-black/20 backdrop-blur-sm mt-16">
                <div className="container mx-auto px-4 py-8">
                  <div className="text-center text-white/60">
                    <p>&copy; 2024 ZamaPredict. Powered by Zama FHE technology.</p>
                    <p className="text-sm mt-2">
                      Private predictions, public verification.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;