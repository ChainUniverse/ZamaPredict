import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { fhevm } from "hardhat";

task("prediction:create-event")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("description", "Event description")
  .addParam("starttime", "Start time (Unix timestamp)")
  .addParam("endtime", "End time (Unix timestamp)")
  .addParam("priceyes", "Price for YES bets in wei")
  .addParam("priceno", "Price for NO bets in wei")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, description, starttime, endtime, priceyes, priceno } = taskArguments;
    
    const signers = await ethers.getSigners();
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    console.log("Creating prediction event...");
    console.log("Description:", description);
    console.log("Start time:", new Date(parseInt(starttime) * 1000).toISOString());
    console.log("End time:", new Date(parseInt(endtime) * 1000).toISOString());
    console.log("YES price:", priceyes, "wei");
    console.log("NO price:", priceno, "wei");
    
    const tx = await predictionMarket.createPredictionEvent(
      description,
      starttime,
      endtime,
      priceyes,
      priceno
    );
    
    await tx.wait();
    console.log("Event created successfully!");
    console.log("Transaction hash:", tx.hash);
    
    const eventCount = await predictionMarket.getEventCount();
    console.log("Event ID:", (eventCount - 1n).toString());
  });

task("prediction:place-bet")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("eventid", "Event ID")
  .addParam("shares", "Number of shares to buy")
  .addParam("direction", "Bet direction: 'yes' or 'no'")
  .addParam("payment", "Payment amount in wei")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, eventid, shares, direction, payment } = taskArguments;
    
    const signers = await ethers.getSigners();
    const signer = signers[0];
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    console.log("Placing encrypted bet...");
    console.log("Event ID:", eventid);
    console.log("Shares:", shares);
    console.log("Direction:", direction);
    console.log("Payment:", payment, "wei");
    
    // Create encrypted inputs
    const input = fhevm.createEncryptedInput(contract, signer.address);
    input.add32(parseInt(shares));  // encrypted shares
    input.addBool(direction.toLowerCase() === "yes");  // encrypted direction
    const encryptedInput = await input.encrypt();
    
    const tx = await predictionMarket.placeBet(
      eventid,
      encryptedInput.handles[0],  // encrypted shares
      encryptedInput.handles[1],  // encrypted direction
      encryptedInput.inputProof,
      { value: payment }
    );
    
    await tx.wait();
    console.log("Bet placed successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:resolve-event")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("eventid", "Event ID")
  .addParam("outcome", "Event outcome: 'yes' or 'no'")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, eventid, outcome } = taskArguments;
    
    const signers = await ethers.getSigners();
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    console.log("Resolving event...");
    console.log("Event ID:", eventid);
    console.log("Outcome:", outcome);
    
    const tx = await predictionMarket.resolveEvent(
      eventid,
      outcome.toLowerCase() === "yes"
    );
    
    await tx.wait();
    console.log("Event resolved successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:claim-rewards")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("eventid", "Event ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, eventid } = taskArguments;
    
    const signers = await ethers.getSigners();
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    console.log("Claiming rewards for event:", eventid);
    
    const tx = await predictionMarket.claimRewards(eventid);
    await tx.wait();
    
    console.log("Rewards claimed successfully!");
    console.log("Transaction hash:", tx.hash);
  });

task("prediction:get-event")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("eventid", "Event ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, eventid } = taskArguments;
    
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    const event = await predictionMarket.getPredictionEvent(eventid);
    
    console.log("Event Details:");
    console.log("ID:", event.id.toString());
    console.log("Description:", event.description);
    console.log("Start time:", new Date(Number(event.startTime) * 1000).toISOString());
    console.log("End time:", new Date(Number(event.endTime) * 1000).toISOString());
    console.log("YES price:", event.priceYes.toString(), "wei");
    console.log("NO price:", event.priceNo.toString(), "wei");
    console.log("Is resolved:", event.isResolved);
    console.log("Outcome:", event.outcome ? "YES" : "NO");
    console.log("Total YES shares:", event.totalYesShares.toString());
    console.log("Total NO shares:", event.totalNoShares.toString());
    console.log("Total pool ETH:", event.totalPoolEth.toString(), "wei");
  });

task("prediction:get-user-bet")
  .addParam("contract", "The PredictionMarket contract address")
  .addParam("eventid", "Event ID")
  .addParam("user", "User address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract, eventid, user } = taskArguments;
    
    const signers = await ethers.getSigners();
    const signer = signers[0];
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    const bet = await predictionMarket.getUserBet(eventid, user);
    
    console.log("User Bet Details:");
    console.log("Has placed bet:", bet.hasPlacedBet);
    
    if (bet.hasPlacedBet) {
      // Decrypt the encrypted values for the user
      try {
        const decryptedAmount = await fhevm.userDecryptEuint(
          "euint64",
          bet.encryptedAmount,
          contract,
          signer
        );
        console.log("Bet amount:", decryptedAmount.toString(), "wei");
        
        const decryptedShares = await fhevm.userDecryptEuint(
          "euint32", 
          bet.encryptedShares,
          contract,
          signer
        );
        console.log("Shares:", decryptedShares.toString());
        
        const decryptedDirection = await fhevm.userDecryptEbool(
          bet.isYesBet,
          contract,
          signer
        );
        console.log("Direction:", decryptedDirection ? "YES" : "NO");
      } catch (error) {
        console.log("Note: Could not decrypt values (may not have permission)");
        console.log("Encrypted amount handle:", bet.encryptedAmount);
        console.log("Encrypted shares handle:", bet.encryptedShares);
        console.log("Encrypted direction handle:", bet.isYesBet);
      }
    }
  });

task("prediction:list-events")
  .addParam("contract", "The PredictionMarket contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const { contract } = taskArguments;
    
    const predictionMarket = await ethers.getContractAt("PredictionMarket", contract);
    
    const eventCount = await predictionMarket.getEventCount();
    console.log("Total events:", eventCount.toString());
    console.log("");
    
    for (let i = 0; i < eventCount; i++) {
      try {
        const event = await predictionMarket.getPredictionEvent(i);
        
        console.log(`Event ${i}:`);
        console.log("  Description:", event.description);
        console.log("  Start:", new Date(Number(event.startTime) * 1000).toISOString());
        console.log("  End:", new Date(Number(event.endTime) * 1000).toISOString());
        console.log("  Resolved:", event.isResolved);
        if (event.isResolved) {
          console.log("  Outcome:", event.outcome ? "YES" : "NO");
        }
        console.log("  YES shares:", event.totalYesShares.toString());
        console.log("  NO shares:", event.totalNoShares.toString());
        console.log("  Pool ETH:", event.totalPoolEth.toString(), "wei");
        console.log("");
      } catch (error) {
        console.log(`  Error fetching event ${i}:`, error);
      }
    }
  });