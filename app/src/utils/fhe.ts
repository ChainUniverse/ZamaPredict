import { useState, useEffect } from 'react';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';

let fheInstance: FhevmInstance | null = null;

export const initializeFHE = async (): Promise<FhevmInstance> => {
  if (fheInstance) {
    return fheInstance;
  }

  try {
    // Initialize the FHE SDKc
    await initSDK();

    // Create FHE instance with Sepolia config
    const config = {
      ...SepoliaConfig,
      network: window.ethereum, // Use MetaMask provider
    };

    fheInstance = await createInstance(config);

    console.log('FHE initialized successfully');
    return fheInstance;
  } catch (error) {
    console.error('Failed to initialize FHE:', error);
    throw new Error('Failed to initialize FHE encryption');
  }
};

export const getFHEInstance = (): FhevmInstance => {
  if (!fheInstance) {
    throw new Error('FHE not initialized. Call initializeFHE() first.');
  }
  return fheInstance;
};

export const createEncryptedBet = async (
  contractAddress: string,
  userAddress: string,
  shares: number,
  isYesBet: boolean
) => {
  const instance = getFHEInstance();

  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add32(shares);    // Add shares as euint32
  input.addBool(isYesBet); // Add direction as ebool

  const encryptedInput = await input.encrypt();

  return {
    encryptedShares: encryptedInput.handles[0],
    encryptedDirection: encryptedInput.handles[1],
    inputProof: encryptedInput.inputProof
  };
};

export const decryptUserData = async (
  encryptedHandle: string,
  _dataType: 'euint32' | 'euint64' | 'ebool',
  contractAddress: string,
  signer: any
): Promise<any> => {
  const instance = getFHEInstance();

  try {
    const keypair = instance.generateKeypair();
    const handleContractPairs = [{
      handle: encryptedHandle,
      contractAddress
    }];
    
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message
    );

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      signer.address,
      startTimeStamp,
      durationDays
    );

    return result[encryptedHandle];
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error('Failed to decrypt encrypted data');
  }
};

export const userDecryptEbool = async (
  encryptedHandle: string,
  contractAddress: string,
  signer: any
): Promise<boolean> => {
  const result = await decryptUserData(encryptedHandle, 'ebool', contractAddress, signer);
  return Boolean(result);
};

export const userDecryptEuint32 = async (
  encryptedHandle: string,
  contractAddress: string,
  signer: any
): Promise<number> => {
  const result = await decryptUserData(encryptedHandle, 'euint32', contractAddress, signer);
  return Number(result);
};

export const userDecryptEuint64 = async (
  encryptedHandle: string,
  contractAddress: string,
  signer: any
): Promise<bigint> => {
  const result = await decryptUserData(encryptedHandle, 'euint64', contractAddress, signer);
  return BigInt(result);
};

export const createUserDecryptionRequest = async (
  contractAddress: string,
  handles: string[],
  signer: any
) => {
  const instance = getFHEInstance();

  try {
    const keypair = instance.generateKeypair();
    const handleContractPairs = handles.map(handle => ({
      handle,
      contractAddress
    }));

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message
    );

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      signer.address,
      startTimeStamp,
      durationDays
    );

    return result;
  } catch (error) {
    console.error('Failed to create user decryption request:', error);
    throw new Error('Failed to decrypt user data');
  }
};

export const formatEncryptedValue = (value: any, type: 'amount' | 'shares' | 'direction'): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (type) {
    case 'amount':
      return `${Number(value) / 1e18} ETH`;
    case 'shares':
      return value.toString();
    case 'direction':
      return value ? 'YES' : 'NO';
    default:
      return value.toString();
  }
};

// React hook for FHE operations
export const useFHE = () => {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');

  const initialize = async () => {
    if (instance) return instance;
    
    try {
      const fheInstance = await initializeFHE();
      setInstance(fheInstance);
      setIsInitialized(true);
      return fheInstance;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize FHE';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const createEncryptedInput = (contractAddress: string, userAddress: string) => {
    if (!instance) {
      throw new Error('FHE not initialized');
    }
    return instance.createEncryptedInput(contractAddress, userAddress);
  };

  useEffect(() => {
    initialize();
  }, []);

  return {
    instance,
    isInitialized,
    error,
    initialize,
    createEncryptedInput
  };
};