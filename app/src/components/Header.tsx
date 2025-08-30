import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Zap, AlertCircle } from 'lucide-react';
import { useFHE } from '@/utils/fhe';

const Header: React.FC = () => {
  const { isInitialized, isInitializing, error, initialize } = useFHE();
  
  const handleInitializeFHE = async () => {
    try {
      await initialize();
    } catch (err) {
      console.error('Failed to initialize FHE:', err);
    }
  };
  
  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ZamaPredict</h1>
              <p className="text-sm text-white/60">Private Prediction Market</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-1">
                {error ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">FHE Error</span>
                  </>
                ) : isInitialized ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400">FHE Ready</span>
                  </>
                ) : isInitializing ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-yellow-400">FHE Loading...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400">FHE Not Ready</span>
                  </>
                )}
              </div>
              
              {!isInitialized && !isInitializing && (
                <button
                  onClick={handleInitializeFHE}
                  className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  Initialize FHE
                </button>
              )}
              
              {error && !isInitializing && (
                <button
                  onClick={handleInitializeFHE}
                  className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                >
                  Retry Init
                </button>
              )}
            </div>
            
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;