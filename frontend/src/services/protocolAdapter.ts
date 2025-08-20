import { ethers } from 'ethers';

const ABI = [{"inputs":[{"internalType":"contract RiscZeroVerifierRouter","name":"riscZeroVerifierRouter","type":"address"},{"internalType":"uint8","name":"commitmentTreeDepth","type":"uint8"},{"internalType":"uint8","name":"actionTagTreeDepth","type":"uint8"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"CalldataCarrierAppDataMismatch","type":"error"},{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"CalldataCarrierCommitmentNotFound","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"CalldataCarrierKindMismatch","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"CalldataCarrierLabelMismatch","type":"error"},{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"CommitmentDuplicated","type":"error"},{"inputs":[{"internalType":"uint256","name":"current","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"}],"name":"CommitmentIndexOutOfBounds","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"CommitmentMismatch","type":"error"},{"inputs":[{"internalType":"address","name":"expected","type":"address"},{"internalType":"address","name":"actual","type":"address"}],"name":"DeltaMismatch","type":"error"},{"inputs":[],"name":"ECDSAInvalidSignature","type":"error"},{"inputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"name":"ECDSAInvalidSignatureLength","type":"error"},{"inputs":[{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"ECDSAInvalidSignatureS","type":"error"},{"inputs":[],"name":"EmptyCommitment","type":"error"},{"inputs":[{"internalType":"bytes","name":"expected","type":"bytes"},{"internalType":"bytes","name":"actual","type":"bytes"}],"name":"ForwarderCallOutputMismatch","type":"error"},{"inputs":[{"internalType":"uint256","name":"expected","type":"uint256"},{"internalType":"uint256","name":"actual","type":"uint256"}],"name":"InvalidPathLength","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"InvalidRoot","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"LogicRefMismatch","type":"error"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"NonExistentLeafIndex","type":"error"},{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"NonExistingCommitment","type":"error"},{"inputs":[{"internalType":"bytes32","name":"root","type":"bytes32"}],"name":"NonExistingRoot","type":"error"},{"inputs":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"}],"name":"NullifierDuplicated","type":"error"},{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"PreExistingCommitment","type":"error"},{"inputs":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"}],"name":"PreExistingNullifier","type":"error"},{"inputs":[{"internalType":"bytes32","name":"root","type":"bytes32"}],"name":"PreExistingRoot","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"uint256","name":"expected","type":"uint256"},{"internalType":"uint256","name":"actual","type":"uint256"}],"name":"ResourceCountMismatch","type":"error"},{"inputs":[{"internalType":"bool","name":"expected","type":"bool"}],"name":"ResourceLifecycleMismatch","type":"error"},{"inputs":[],"name":"RiscZeroVerifierStopped","type":"error"},{"inputs":[{"internalType":"bytes32","name":"expected","type":"bytes32"},{"internalType":"bytes32","name":"actual","type":"bytes32"}],"name":"RootMismatch","type":"error"},{"inputs":[{"internalType":"bytes32","name":"tag","type":"bytes32"}],"name":"TagNotFound","type":"error"},{"inputs":[],"name":"TreeCapacityExceeded","type":"error"},{"inputs":[],"name":"ZeroNotAllowed","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"untrustedForwarder","type":"address"},{"indexed":false,"internalType":"bytes","name":"input","type":"bytes"},{"indexed":false,"internalType":"bytes","name":"output","type":"bytes"}],"name":"ForwarderCallExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"nullifier","type":"bytes32"},{"indexed":true,"internalType":"uint256","name":"index","type":"uint256"}],"name":"NullifierAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"components":[{"components":[{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"internalType":"bytes32","name":"tag","type":"bytes32"},{"internalType":"bool","name":"isConsumed","type":"bool"},{"internalType":"bytes32","name":"actionTreeRoot","type":"bytes32"},{"internalType":"bytes","name":"ciphertext","type":"bytes"},{"components":[{"internalType":"enum Logic.DeletionCriterion","name":"deletionCriterion","type":"uint8"},{"internalType":"bytes","name":"blob","type":"bytes"}],"internalType":"struct Logic.ExpirableBlob[]","name":"appData","type":"tuple[]"}],"internalType":"struct Logic.Instance","name":"instance","type":"tuple"},{"internalType":"bytes32","name":"verifyingKey","type":"bytes32"}],"internalType":"struct Logic.VerifierInput[]","name":"logicVerifierInputs","type":"tuple[]"},{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"components":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"},{"internalType":"bytes32","name":"commitmentTreeRoot","type":"bytes32"}],"internalType":"struct Compliance.ConsumedRefs","name":"consumed","type":"tuple"},{"components":[{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"}],"internalType":"struct Compliance.CreatedRefs","name":"created","type":"tuple"},{"internalType":"bytes32","name":"unitDeltaX","type":"bytes32"},{"internalType":"bytes32","name":"unitDeltaY","type":"bytes32"}],"internalType":"struct Compliance.Instance","name":"instance","type":"tuple"}],"internalType":"struct Compliance.VerifierInput[]","name":"complianceVerifierInputs","type":"tuple[]"}],"internalType":"struct Action[]","name":"actions","type":"tuple[]"},{"internalType":"bytes","name":"deltaProof","type":"bytes"}],"indexed":false,"internalType":"struct Transaction","name":"transaction","type":"tuple"},{"indexed":false,"internalType":"bytes32","name":"newRoot","type":"bytes32"}],"name":"TransactionExecuted","type":"event"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"atIndex","outputs":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"}],"name":"contains","outputs":[{"internalType":"bool","name":"isContained","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"root","type":"bytes32"}],"name":"containsRoot","outputs":[{"internalType":"bool","name":"isContained","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"internalType":"bytes32","name":"tag","type":"bytes32"},{"internalType":"bool","name":"isConsumed","type":"bool"},{"internalType":"bytes32","name":"actionTreeRoot","type":"bytes32"},{"internalType":"bytes","name":"ciphertext","type":"bytes"},{"components":[{"internalType":"enum Logic.DeletionCriterion","name":"deletionCriterion","type":"uint8"},{"internalType":"bytes","name":"blob","type":"bytes"}],"internalType":"struct Logic.ExpirableBlob[]","name":"appData","type":"tuple[]"}],"internalType":"struct Logic.Instance","name":"instance","type":"tuple"},{"internalType":"bytes32","name":"verifyingKey","type":"bytes32"}],"internalType":"struct Logic.VerifierInput[]","name":"logicVerifierInputs","type":"tuple[]"},{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"components":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"},{"internalType":"bytes32","name":"commitmentTreeRoot","type":"bytes32"}],"internalType":"struct Compliance.ConsumedRefs","name":"consumed","type":"tuple"},{"components":[{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"}],"internalType":"struct Compliance.CreatedRefs","name":"created","type":"tuple"},{"internalType":"bytes32","name":"unitDeltaX","type":"bytes32"},{"internalType":"bytes32","name":"unitDeltaY","type":"bytes32"}],"internalType":"struct Compliance.Instance","name":"instance","type":"tuple"}],"internalType":"struct Compliance.VerifierInput[]","name":"complianceVerifierInputs","type":"tuple[]"}],"internalType":"struct Action[]","name":"actions","type":"tuple[]"},{"internalType":"bytes","name":"deltaProof","type":"bytes"}],"internalType":"struct Transaction","name":"transaction","type":"tuple"}],"name":"execute","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getRiscZeroVerifierSelector","outputs":[{"internalType":"bytes4","name":"verifierSelector","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"isEmergencyStopped","outputs":[{"internalType":"bool","name":"isStopped","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestRoot","outputs":[{"internalType":"bytes32","name":"root","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"length","outputs":[{"internalType":"uint256","name":"len","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"commitment","type":"bytes32"}],"name":"merkleProof","outputs":[{"internalType":"bytes32[]","name":"siblings","type":"bytes32[]"},{"internalType":"uint256","name":"directionBits","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"internalType":"bytes32","name":"tag","type":"bytes32"},{"internalType":"bool","name":"isConsumed","type":"bool"},{"internalType":"bytes32","name":"actionTreeRoot","type":"bytes32"},{"internalType":"bytes","name":"ciphertext","type":"bytes"},{"components":[{"internalType":"enum Logic.DeletionCriterion","name":"deletionCriterion","type":"uint8"},{"internalType":"bytes","name":"blob","type":"bytes"}],"internalType":"struct Logic.ExpirableBlob[]","name":"appData","type":"tuple[]"}],"internalType":"struct Logic.Instance","name":"instance","type":"tuple"},{"internalType":"bytes32","name":"verifyingKey","type":"bytes32"}],"internalType":"struct Logic.VerifierInput[]","name":"logicVerifierInputs","type":"tuple[]"},{"components":[{"internalType":"bytes","name":"proof","type":"bytes"},{"components":[{"components":[{"internalType":"bytes32","name":"nullifier","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"},{"internalType":"bytes32","name":"commitmentTreeRoot","type":"bytes32"}],"internalType":"struct Compliance.ConsumedRefs","name":"consumed","type":"tuple"},{"components":[{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"bytes32","name":"logicRef","type":"bytes32"}],"internalType":"struct Compliance.CreatedRefs","name":"created","type":"tuple"},{"internalType":"bytes32","name":"unitDeltaX","type":"bytes32"},{"internalType":"bytes32","name":"unitDeltaY","type":"bytes32"}],"internalType":"struct Compliance.Instance","name":"instance","type":"tuple"}],"internalType":"struct Compliance.VerifierInput[]","name":"complianceVerifierInputs","type":"tuple[]"}],"internalType":"struct Action[]","name":"actions","type":"tuple[]"},{"internalType":"bytes","name":"deltaProof","type":"bytes"}],"internalType":"struct Transaction","name":"transaction","type":"tuple"}],"name":"verify","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"root","type":"bytes32"},{"internalType":"bytes32","name":"commitment","type":"bytes32"},{"internalType":"bytes32[]","name":"path","type":"bytes32[]"},{"internalType":"uint256","name":"directionBits","type":"uint256"}],"name":"verifyMerkleProof","outputs":[],"stateMutability":"view","type":"function"}];

const PROTOCOL_ADAPTER_ADDRESS = "0xFE29D4D43aB82544A32BbF3045Edc4689829Ec59";

export class ProtocolAdapterService {
  /**
   * Execute ARM transaction using ethers.js (same as Etherscan)
   */
  static async executeTransaction(signer: ethers.Signer): Promise<string> {
    try {
      console.log('Executing ARM transaction with ethers.js...');
      
      console.log('Submitting transaction to Protocol Adapter...');
      
      const hardcodedTransactionData = {
        actions: [
          {
            logicVerifierInputs: [
              {
                proof: "0xbb001d441180d22565f9ef5b2936543dd3db4933cf81bc11544f85f1d9b6bf6165267551119d9ff3b5fbbaf8e1fbb697dda7d161c06d3833a0b7d1fe9d2eededc7613740266b9d9933503801208dedfbd3d2f28ada393ac52691d5bcdc37fe621c3840fc057dd54a27bce5c1acdc9a6cdf48d88a00b41e2bafc7f09e098448811c3ce4e72f74b34b8a778ed50b7b102ecf5482e4f61b2c4a8f48fd9d759e7a26b5028abb1a7812d56029cf9b7bbc2360893bbdea37f7f952e89a07939e70cc35d478b3570f8d372c642baf065d0afa3b62d92b10044ceb91c9eb7b4e98df335086972cf425afff190d3c47b7f8716104a54457eae1253575857b63af3fc64c34a7d28f98",
                verifyingKey: "0x1dbb40278643cdc153a2e7363de04d42de23cdc49434f51f81b5a9a1a71f5714",
                instance: {
                  tag: "0xbb79ec1b154339891be629161fea387f6201bbe19403e602b4c7a40db383f533",
                  isConsumed: true,
                  actionTreeRoot: "0xee3598b9ac97e1b7d01ce3b19f41c4c1aab2c407c6d7bd166361bcfd35038a88",
                  ciphertext: "0x3f0000007f000000bf000000ff000000",
                  appData: [
                    {
                      deletionCriterion: 0,
                      blob: "0x1f0000003f0000005f0000007f000000"
                    },
                    {
                      deletionCriterion: 1,
                      blob: "0x9f000000bf000000df000000ff000000"
                    }
                  ]
                }
              },
              {
                proof: "0xbb001d442fe46a111e5609cd74ef5748d74f740495a0efbbe7b683b84233750ef0adc2b21006062e2bd35d9c0dd052fb20084d60046a2d48c04711d85d1f712cc6de7b95117b41b0a2f7500ae2ad7d6630ee1eab9e1b9f9739522004408961c3cfaa374f01d09c9afeeb981371a1a37d99c7fb2fa3fe1ddd0f5fe28abc200dfd84c9ae03023af4c3ba40775768ed9433ca8275c34d13c2c23e3cd6dd5f2ce67cf68972a70bd1391b70faf111bfc48b88bcd50e028eb4206920e23bd9eab31460fbdb9dfd1edaceedaf8d628b47dbc047b5b85ed7e28c67df0b100fc2d9b26d3f4bb136332c4ef0885db68658f933a16c7d46ec04ed6d936fe9deb092b131362a6fdc6d30",
                verifyingKey: "0x1dbb40278643cdc153a2e7363de04d42de23cdc49434f51f81b5a9a1a71f5714",
                instance: {
                  tag: "0xe81b10b442d47cd20406599ea93b648e78412abf6b2c73f457e61dcd27d5bc8d",
                  isConsumed: false,
                  actionTreeRoot: "0xee3598b9ac97e1b7d01ce3b19f41c4c1aab2c407c6d7bd166361bcfd35038a88",
                  ciphertext: "0x3f0000007f000000bf000000ff000000",
                  appData: [
                    {
                      deletionCriterion: 0,
                      blob: "0x1f0000003f0000005f0000007f000000"
                    },
                    {
                      deletionCriterion: 1,
                      blob: "0x9f000000bf000000df000000ff000000"
                    }
                  ]
                }
              }
            ],
            complianceVerifierInputs: [
              {
                proof: "0xbb001d442e1936cbe1ed65e5a9fe49d4415ee69d08214786d0d25f9e538876e400b0259c11b2fd53b46d7c1d7fba037dfa45019b3a52b58eeb7233db6a8c73006c0c2dc30592fcc1104ad2bf634f67b2984840c2b77e45d82b5b69bf1c7c9c705916dc3e184f55c87ab32069be899f7f2de86fe61d77fbc378f1c8d97c58b5bc4d72d6e529d14fb61390ee7e57fa1e0765203137df744675d378e5f1e32f1843a2833d750eec0183ebe74dadbfcd526fdfca658fd31a7b15d98d638363e9036fc1d6cd46283d7f0477111efc466a61c5e37c1b0af4849f9720e584172192376ac5f74d5a11f579ea3f083748d4bf8786ee64b4dcb9fb18c633c83fd0e2f3afcb4fe23b79",
                instance: {
                  consumed: {
                    nullifier: "0xbb79ec1b154339891be629161fea387f6201bbe19403e602b4c7a40db383f533",
                    logicRef: "0x1dbb40278643cdc153a2e7363de04d42de23cdc49434f51f81b5a9a1a71f5714",
                    commitmentTreeRoot: "0x7e70786b1d52fc0412d75203ef2ac22de13d9596ace8a5a1ed5324c3ed7f31c3"
                  },
                  created: {
                    commitment: "0xe81b10b442d47cd20406599ea93b648e78412abf6b2c73f457e61dcd27d5bc8d",
                    logicRef: "0x1dbb40278643cdc153a2e7363de04d42de23cdc49434f51f81b5a9a1a71f5714"
                  },
                  unitDeltaX: "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                  unitDeltaY: "0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
                }
              }
            ]
          }
        ],
        deltaProof: "0x34a23a788b6b20cc2ae5c40fd5c4b25bde9a1fed077d9ac3163a1e4feeccfa2d389e8c50a54caaedaa5ac433774da8bb72dc2bc51105d9bca67c743db90bae451b"
      };
      
      // Create contract instance
      const contract = new ethers.Contract(
        PROTOCOL_ADAPTER_ADDRESS,
        ABI,
        signer
      );
        
      const overrides = {
        gasLimit: 3000000 
      };
  
      console.log("Sending transaction... Please confirm in your wallet.");
      
      // Pass the overrides object as the last argument
      const txResponse = await contract.execute(hardcodedTransactionData, overrides);
      
      console.log(`Transaction sent! Waiting for confirmation... Hash: ${txResponse.hash}`)
      console.log("Transaction Hash:", txResponse.hash);
  
      const receipt = await txResponse.wait();
      console.log(`Transaction confirmed! Block: ${receipt.blockNumber}`);
      console.log("Transaction Receipt:", receipt);

      return(receipt);

      
    } catch (error: any) {
      console.error('Protocol Adapter execution failed:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Transaction failed';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Get ethers.js signer from MetaMask
   */
  static async getSigner(): Promise<ethers.Signer> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // ⭐ CRITICAL: Request accounts first (like in working minimal example)
    await provider.send("eth_requestAccounts", []);
    
    return await provider.getSigner();
  }
}
