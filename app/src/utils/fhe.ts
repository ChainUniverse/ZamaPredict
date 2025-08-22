import { SEPOLIA_CONFIG } from '@/constants/config';
import type { FHEInstance } from '@/types';

let fheInstance: FHEInstance | null = null;

declare global {
  interface Window {
    fhevm: {
      initSDK: () => Promise<void>;
      createInstance: (config: any) => Promise<FHEInstance>;
    };
  }
}

export const initializeFHE = async (): Promise<FHEInstance> => {
  if (fheInstance) {
    return fheInstance;
  }

  try {
    // Initialize the FHE SDK
    await window.fhevm.initSDK();
    
    // Create FHE instance with Sepolia config
    const config = {
      ...SEPOLIA_CONFIG,
      network: window.ethereum, // Use MetaMask provider
    };
    
    fheInstance = await window.fhevm.createInstance(config);
    
    console.log('FHE initialized successfully');
    return fheInstance;
  } catch (error) {
    console.error('Failed to initialize FHE:', error);
    throw new Error('Failed to initialize FHE encryption');
  }
};

export const getFHEInstance = (): FHEInstance => {
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
  dataType: 'euint32' | 'euint64' | 'ebool',
  contractAddress: string,
  signer: any
) => {
  const instance = getFHEInstance();
  
  try {
    let decryptedValue;
    
    if (dataType === 'ebool') {
      decryptedValue = await instance.userDecryptEbool(
        encryptedHandle,
        contractAddress,
        signer
      );
    } else {
      decryptedValue = await instance.userDecryptEuint(
        dataType,
        encryptedHandle,
        contractAddress,
        signer
      );
    }
    
    return decryptedValue;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error('Failed to decrypt encrypted data');
  }
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