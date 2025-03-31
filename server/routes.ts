import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTransactionSchema, insertWaitlistSchema, insertSubscriptionSchema, type InsertTransaction, type InsertSubscriptionReward, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { Server as SocketServer } from "socket.io";
import { randomUUID } from "crypto";

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is admin (user ID = 1)
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user!.id !== 1) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
};

// Calculate commission based on transaction amount, game percentage, and subscription status
const calculateCommission = (amount: number, percentage: number, hasSubscription: boolean = false): number => {
  if (amount <= 0 || percentage <= 0) return 0;
  
  // Apply subscription discount if user has active subscription
  let adjustedPercentage = percentage;
  if (hasSubscription) {
    // Reduce commission by 25% for subscribers
    adjustedPercentage = percentage * 0.75;
  }
  
  // Calculate commission
  return (amount * adjustedPercentage) / 100;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // User profile management routes
  
  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return a safe version without sensitive data
      const safeUser = { ...user };
      delete (safeUser as any).password;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });
  
  // Update user profile
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Ensure users can only update their own profile
      const userId = parseInt(req.params.id);
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      // Validate and filter the fields that are allowed to be updated
      const allowedFields = [
        "fullName", "phone", "upiId", "bio", "location", "avatarUrl", 
        "dateOfBirth", "socialLinks", "theme", "notificationsEnabled", 
        "privacySettings", "preferredGames"
      ];
      
      // Filter the request body to only include allowed fields
      const userData: Partial<InsertUser> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          userData[field as keyof InsertUser] = req.body[field];
        }
      }
      
      // Update the user profile
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Strip out sensitive information like password before returning
      const safeUser = { ...updatedUser };
      delete (safeUser as any).password;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Get all games
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Error fetching games" });
    }
  });

  // Get game by ID
  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Error fetching game" });
    }
  });

  // Get active matches for a game
  app.get("/api/games/:id/matches", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const activeMatches = await storage.getActiveMatches(gameId);
      
      // Get player information for each match
      const matchesWithPlayers = await Promise.all(
        activeMatches.map(async (match) => {
          const players = await storage.getMatchPlayers(match.id);
          return {
            ...match,
            players: players.length
          };
        })
      );
      
      res.json(matchesWithPlayers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching matches" });
    }
  });

  // Create a new game match
  app.post("/api/matches", requireAuth, async (req, res) => {
    try {
      const { gameId, entryAmount } = req.body;
      
      // Validate game exists
      const game = await storage.getGame(parseInt(gameId));
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Validate entry amount
      const minEntry = parseFloat(game.minEntry.toString());
      const maxEntry = parseFloat(game.maxEntry.toString());
      const amount = parseFloat(entryAmount);
      
      if (amount < minEntry || amount > maxEntry) {
        return res.status(400).json({ 
          message: `Entry amount must be between ${minEntry} and ${maxEntry}` 
        });
      }
      
      // Check user's wallet balance
      const userId = req.user!.id;
      const wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const walletBalance = parseFloat(wallet.balance.toString());
      
      // Ensure minimum wallet balance of ₹200 to play games
      if (walletBalance < 200) {
        return res.status(400).json({ 
          message: "You need a minimum wallet balance of ₹200 to play games. Please add funds to your wallet." 
        });
      }
      
      if (walletBalance < amount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      
      // Create game match
      const match = await storage.createGameMatch({
        gameId: parseInt(gameId),
        entryAmount: entryAmount.toString(),
        status: "waiting",
        startTime: null,
        endTime: null,
        winnerId: null
      });
      
      // Add player to match
      await storage.addPlayerToMatch({
        matchId: match.id,
        userId,
        status: "joined"
      });
      
      // AUTOMATICALLY ADD AN AI PLAYER for testing purposes
      // Create AI user if it doesn't exist
      let aiUser = await storage.getUserByUsername("AI_Player");
      
      if (!aiUser) {
        // Create AI player account
        aiUser = await storage.createUser({
          username: "AI_Player",
          password: "ai_password_hash", // This is just for testing
          email: "ai@example.com",
          fullName: "AI Player",
          phone: null,
          upiId: null,
          hasSubscription: false,
          subscriptionExpiryDate: null,
          avatarUrl: null,
          bio: "I am an AI opponent for testing",
          // No isVerified property in schema
          lastLoginDate: new Date(),
          dailyStreak: 0,
          rewardPoints: 0,
          referralCode: null,
          referredBy: null,
          rankPoints: 1000
        });
        
        // Create wallet for AI with sufficient funds
        await storage.createWallet({
          userId: aiUser.id,
          balance: "10000" // AI has plenty of money to play
        });
      }
      
      // Add AI player to the match automatically after a short delay
      setTimeout(async () => {
        try {
          await storage.addPlayerToMatch({
            matchId: match.id,
            userId: aiUser.id,
            status: "joined"
          });
          console.log(`AI Player has joined match ${match.id}`);
        } catch (error) {
          console.error("Error adding AI player to match:", error);
        }
      }, 2000); // 2 second delay to simulate real player joining
      
      res.status(201).json(match);
    } catch (error) {
      res.status(500).json({ message: "Error creating match" });
    }
  });

  // Join an existing match
  // Start a match (deduct money from players when the game actually starts)
  app.post("/api/matches/:id/start", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Validate match exists and is in waiting status
      const match = await storage.getGameMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      if (match.status !== "waiting") {
        return res.status(400).json({ message: "Match is not in waiting status" });
      }
      
      // Get all players in the match
      const players = await storage.getMatchPlayers(matchId);
      if (players.length < 2) {
        return res.status(400).json({ message: "Need at least 2 players to start the match" });
      }
      
      // Make sure requesting user is part of the match
      if (!players.some(player => player.userId === userId)) {
        return res.status(403).json({ message: "You are not part of this match" });
      }
      
      // Get game details
      const game = await storage.getGame(match.gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      const entryAmount = parseFloat(match.entryAmount.toString());
      
      // NOW deduct money from all players' wallets
      for (const player of players) {
        // Check if player has sufficient balance
        const wallet = await storage.getWallet(player.userId);
        if (!wallet) {
          return res.status(400).json({ message: `Player ${player.userId} doesn't have a wallet` });
        }
        
        const walletBalance = parseFloat(wallet.balance.toString());
        if (walletBalance < entryAmount) {
          return res.status(400).json({ 
            message: `Player ${player.userId} doesn't have enough balance. Required: ₹${entryAmount}` 
          });
        }
        
        // Deduct entry amount from wallet
        await storage.updateWalletBalance(player.userId, -entryAmount);
        
        // Create transaction record
        await storage.createTransaction({
          userId: player.userId,
          amount: (-entryAmount).toString(),
          type: "game_entry",
          status: "completed",
          description: `Entry fee for ${game.name} (Match #${matchId})`,
          commissionAmount: "0"
        });
      }
      
      // Update match to in_progress
      await storage.updateGameMatch(matchId, {
        status: "in_progress",
        startTime: new Date()
      });
      
      // Get updated match data
      const updatedMatch = await storage.getGameMatch(matchId);
      
      res.json({
        success: true,
        message: "Match started and entry fees deducted",
        match: updatedMatch
      });
    } catch (error) {
      res.status(500).json({ message: "Error starting match" });
    }
  });

  app.post("/api/matches/:id/join", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Validate match exists and is waiting
      const match = await storage.getGameMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      if (match.status !== "waiting") {
        return res.status(400).json({ message: "Match is no longer accepting players" });
      }
      
      // Check if user is already in the match
      const matchPlayers = await storage.getMatchPlayers(matchId);
      if (matchPlayers.some(player => player.userId === userId)) {
        return res.status(400).json({ message: "Already joined this match" });
      }
      
      // Check user's wallet balance
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const walletBalance = parseFloat(wallet.balance.toString());
      const entryAmount = parseFloat(match.entryAmount.toString());
      
      // Ensure minimum wallet balance of ₹200 to play games
      if (walletBalance < 200) {
        return res.status(400).json({ 
          message: "You need a minimum wallet balance of ₹200 to play games. Please add funds to your wallet." 
        });
      }
      
      if (walletBalance < entryAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      
      // Add player to match without deducting money yet
      await storage.addPlayerToMatch({
        matchId,
        userId,
        status: "joined"
      });
      
      // No automatic match starting now - users must explicitly start the match
      // which will trigger the payment deduction via the /matches/:id/start endpoint
      // This ensures users have explicitly agreed to start playing and will be charged
      
      // Get updated match
      const updatedMatch = await storage.getGameMatch(matchId);
      
      // Check if one of the players is the AI player
      const players = await storage.getMatchPlayers(matchId);
      const aiPlayer = await storage.getUserByUsername("AI_Player");
      
      // If AI is in this match, automatically start the match after a short delay
      if (aiPlayer && players.some(p => p.userId === aiPlayer.id) && players.length >= 2) {
        setTimeout(async () => {
          try {
            // Update match to in_progress
            await storage.updateGameMatch(matchId, {
              status: "in_progress",
              startTime: new Date()
            });
            
            // Get game details
            const game = await storage.getGame(match.gameId);
            const entryAmount = parseFloat(match.entryAmount.toString());
            
            // Deduct entry fee from all players
            for (const player of players) {
              // Deduct entry amount from wallet
              await storage.updateWalletBalance(player.userId, -entryAmount);
              
              // Create transaction record
              await storage.createTransaction({
                userId: player.userId,
                amount: (-entryAmount).toString(),
                type: "game_entry",
                status: "completed",
                description: `Entry fee for ${game?.name || 'game'} (Match #${matchId})`,
                commissionAmount: "0"
              });
            }
            
            console.log(`Match ${matchId} automatically started with AI player`);
            
            // After another delay, automatically complete the match with human player as winner
            setTimeout(async () => {
              try {
                // Always set the real user (not AI) as winner
                const winnerId = players.find(p => p.userId !== aiPlayer.id)?.userId;
                
                if (!winnerId) return;
                
                // Calculate prize pool and commission
                const totalPrize = entryAmount * players.length;
                const commissionPercentage = parseFloat(game?.commissionPercentage || "2.5");
                
                // Get winner user to check subscription status
                const winnerUser = await storage.getUser(winnerId);
                const hasSubscription = winnerUser?.subscriptionExpiryDate && 
                  new Date(winnerUser.subscriptionExpiryDate) > new Date();
                
                // Apply subscription discount if winner has active subscription
                const commission = calculateCommission(totalPrize, commissionPercentage, hasSubscription || false);
                const winnerPrize = totalPrize - commission;
                
                // Update match as completed
                await storage.updateGameMatch(matchId, {
                  status: "completed",
                  endTime: new Date(),
                  winnerId: winnerId
                });
                
                // Update player statuses
                for (const player of players) {
                  const newStatus = player.userId === winnerId ? "won" : "lost";
                  await storage.updatePlayerMatchStatus(player.id, newStatus);
                }
                
                // Add winnings to winner's wallet
                await storage.updateWalletBalance(winnerId, winnerPrize);
                
                // Create transaction for winner
                await storage.createTransaction({
                  userId: winnerId,
                  amount: winnerPrize.toString(),
                  type: "game_win",
                  status: "completed",
                  description: hasSubscription
                    ? `Prize for winning ${game?.name || 'game'} (with 25% subscription commission discount)`
                    : `Prize for winning ${game?.name || 'game'}`,
                  commissionAmount: commission.toString()
                });
                
                console.log(`Match ${matchId} automatically completed with player ${winnerId} as winner`);
              } catch (error) {
                console.error("Error auto-completing match:", error);
              }
            }, 5000); // Complete game after 5 seconds
          } catch (error) {
            console.error("Error auto-starting match:", error);
          }
        }, 3000); // Start game after 3 seconds
      }
      
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Error joining match" });
    }
  });

  // Complete a match (declare winner)
  app.post("/api/matches/:id/complete", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { winnerId } = req.body;
      
      // Validate match exists and is in progress
      const match = await storage.getGameMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      if (match.status !== "in_progress") {
        return res.status(400).json({ message: "Match is not in progress" });
      }
      
      // Get game details for commission calculation
      const game = await storage.getGame(match.gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Get all players in the match
      const players = await storage.getMatchPlayers(matchId);
      if (!players.some(player => player.userId === parseInt(winnerId))) {
        return res.status(400).json({ message: "Winner is not a player in this match" });
      }
      
      // Calculate prize pool and commission
      const entryAmount = parseFloat(match.entryAmount.toString());
      const totalPrize = entryAmount * players.length;
      const commissionPercentage = parseFloat(game.commissionPercentage.toString());
      
      // Get winner user to check subscription status
      const winnerUser = await storage.getUser(parseInt(winnerId));
      const hasSubscription = winnerUser?.subscriptionExpiryDate && new Date(winnerUser.subscriptionExpiryDate) > new Date();
      
      // Apply subscription discount if winner has active subscription
      const commission = calculateCommission(totalPrize, commissionPercentage, hasSubscription || false);
      const winnerPrize = totalPrize - commission;
      
      // Update match as completed
      await storage.updateGameMatch(matchId, {
        status: "completed",
        endTime: new Date(),
        winnerId: parseInt(winnerId)
      });
      
      // Update player statuses
      for (const player of players) {
        const newStatus = player.userId === parseInt(winnerId) ? "won" : "lost";
        await storage.updatePlayerMatchStatus(player.id, newStatus);
      }
      
      // Add winnings to winner's wallet
      await storage.updateWalletBalance(parseInt(winnerId), winnerPrize);
      
      // Create transaction for winner with subscription benefits info
      await storage.createTransaction({
        userId: parseInt(winnerId),
        amount: winnerPrize.toString(),
        type: "game_win",
        status: "completed",
        description: hasSubscription
          ? `Prize for winning ${game.name} (with 25% subscription commission discount)`
          : `Prize for winning ${game.name}`,
        commissionAmount: commission.toString()
      });
      
      // Get updated match
      const updatedMatch = await storage.getGameMatch(matchId);
      res.json(updatedMatch);
    } catch (error) {
      res.status(500).json({ message: "Error completing match" });
    }
  });

  // Get user's wallet
  app.get("/api/wallet", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Error fetching wallet" });
    }
  });

  // Get user's transactions
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });
  
  // Admin endpoint to get all transactions - restricted to admin (user ID = 1)
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching all transactions" });
    }
  });
  
  // Admin endpoint to get all users - restricted to admin (user ID = 1)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Return only safe user data (no passwords)
      const safeUsers = users.map(user => {
        const safeUser = { ...user };
        delete (safeUser as any).password;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching all users" });
    }
  });

  // Request to add money to wallet - creates pending transaction
  app.post("/api/wallet/deposit", requireAuth, async (req, res) => {
    try {
      const schema = insertTransactionSchema.pick({
        amount: true,
      }).extend({
        paymentScreenshotUrl: z.string().optional(),
        paymentReference: z.string().optional(),
        upiId: z.string().default("8447228346@ptsbi") // Default UPI ID for payments
      });
      
      const { amount, paymentScreenshotUrl, paymentReference, upiId } = schema.parse(req.body);
      const userId = req.user!.id;
      
      // Validate amount
      const parsedAmount = parseFloat(amount.toString());
      if (parsedAmount < 100) {
        return res.status(400).json({ message: "Minimum deposit amount is ₹100" });
      }
      
      // Create pending transaction - money NOT added to wallet until admin approves
      const transaction = await storage.createTransaction({
        userId,
        amount: amount.toString(),
        type: "deposit",
        status: "pending", // Mark as pending until admin approves
        description: `Deposit request via UPI payment to ${upiId}${paymentReference ? ` (Ref: ${paymentReference})` : ''}${paymentScreenshotUrl ? ' (Screenshot uploaded)' : ''}`,
        commissionAmount: "0"
      });
      
      // If screenshot was provided, store it in transaction metadata
      if (paymentScreenshotUrl) {
        await storage.updateTransactionMetadata(transaction.id, {
          paymentScreenshotUrl,
          upiId
        });
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Deposit request registered. Please make payment to 8447228346@ptsbi. An admin will approve your deposit soon.",
        paymentInfo: {
          upiId: "8447228346@ptsbi",
          amount: parsedAmount
        },
        transaction 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error processing deposit request" });
    }
  });
  
  // Admin endpoint to approve pending deposits - restricted to admin (user ID = 1)
  app.post("/api/wallet/approve-deposit/:transactionId", requireAdmin, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const userId = req.user!.id;
      
      // Admin verification is now handled by the requireAdmin middleware
      
      // Get the pending transaction (all transactions, not just user's)
      const allTransactions = await storage.getAllTransactions();
      const transaction = allTransactions.find(t => t.id === transactionId && t.type === "deposit" && t.status === "pending");
      
      if (!transaction) {
        return res.status(404).json({ message: "Pending deposit transaction not found" });
      }
      
      // Get deposit amount
      const depositAmount = parseFloat(transaction.amount.toString());
      
      // Update the user's wallet balance (the one who made the deposit, not the admin)
      const transactionUserId = transaction.userId;
      const updatedWallet = await storage.updateWalletBalance(transactionUserId, depositAmount);
      if (!updatedWallet) {
        return res.status(500).json({ message: "Error updating wallet" });
      }
      
      // Update transaction status to completed
      // In a real app, you'd have a storage method to update transaction status
      // For this demo, we'll create a new "approved" transaction
      const approvedTransaction = await storage.createTransaction({
        userId: transactionUserId,
        amount: depositAmount.toString(),
        type: "deposit",
        status: "completed",
        description: "Deposit approved by admin",
        commissionAmount: "0"
      });
      
      res.status(200).json({ 
        success: true, 
        message: "Deposit approved and funds added to wallet",
        wallet: updatedWallet,
        transaction: approvedTransaction
      });
    } catch (error) {
      res.status(500).json({ message: "Error approving deposit" });
    }
  });

  // Withdraw money from wallet
  app.post("/api/wallet/withdraw", requireAuth, async (req, res) => {
    try {
      const schema = insertTransactionSchema.pick({
        amount: true,
      });
      
      const { amount } = schema.parse(req.body);
      const userId = req.user!.id;
      
      // Check wallet balance
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const parsedAmount = parseFloat(amount.toString());
      if (parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      
      if (parseFloat(wallet.balance.toString()) < parsedAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      
      // Withdraw amount from wallet
      const updatedWallet = await storage.updateWalletBalance(userId, -parsedAmount);
      if (!updatedWallet) {
        return res.status(500).json({ message: "Error updating wallet" });
      }
      
      // Create transaction
      const transaction = await storage.createTransaction({
        userId,
        amount: (-parsedAmount).toString(),
        type: "withdrawal",
        status: "completed",
        description: "Withdrew money from wallet",
        commissionAmount: "0"
      });
      
      res.status(201).json({ wallet: updatedWallet, transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error withdrawing money from wallet" });
    }
  });

  // Add to waitlist
  // Get user's subscriptions
  app.get("/api/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const subscriptions = await storage.getUserSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching subscriptions" });
    }
  });

  // Get user's active subscriptions
  app.get("/api/subscriptions/active", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const subscriptions = await storage.getActiveUserSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active subscriptions" });
    }
  });

  // Get user's subscription rewards
  app.get("/api/subscription-rewards", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const rewards = await storage.getUserSubscriptionRewards(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Error fetching subscription rewards" });
    }
  });

  // Get user's pending subscription rewards
  app.get("/api/subscription-rewards/pending", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const rewards = await storage.getPendingSubscriptionRewards(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending subscription rewards" });
    }
  });

  // Purchase a subscription
  app.post("/api/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, amount, rewardAmount, duration } = req.body;
      
      // Validate subscription amount
      const parsedAmount = parseFloat(amount);
      const parsedRewardAmount = parseFloat(rewardAmount);
      const parsedDuration = parseInt(duration);
      
      if (parsedAmount <= 0) {
        return res.status(400).json({ message: "Invalid subscription amount" });
      }
      
      if (parsedRewardAmount <= 0) {
        return res.status(400).json({ message: "Invalid reward amount" });
      }
      
      if (parsedDuration <= 0) {
        return res.status(400).json({ message: "Invalid subscription duration" });
      }
      
      // Check user's wallet
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const walletBalance = parseFloat(wallet.balance.toString());
      if (walletBalance < parsedAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }
      
      // Deduct subscription amount from wallet
      await storage.updateWalletBalance(userId, -parsedAmount);
      
      // Determine rewards based on subscription tier
      let dailyReward = "857";
      let totalReward = "6,000";
      
      if (parsedAmount === 2000) {
        dailyReward = "1,714";
        totalReward = "12,000";
      } else if (parsedAmount === 10000) {
        dailyReward = "11,428";
        totalReward = "80,000";
      }
      
      // Create transaction for subscription purchase
      await storage.createTransaction({
        userId,
        amount: (-parsedAmount).toString(),
        type: "subscription_purchase",
        status: "completed",
        description: `Purchased ${name} subscription for ${duration} days (₹${dailyReward} daily rewards, ₹${totalReward} total)`,
        commissionAmount: "0"
      });
      
      // Create dates for subscription
      const now = new Date();
      const startDate = now;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + parsedDuration);
      
      // Create subscription
      const subscription = await storage.createGameSubscription({
        userId,
        name,
        amount: amount.toString(),
        rewardAmount: rewardAmount.toString(),
        duration: parsedDuration,
        startDate,
        endDate,
        status: "active"
      });
      
      // Add subscription status to user
      await storage.addSubscription(userId, parsedDuration);
      
      // Create rewards for each day of the subscription
      // Create an array to hold all rewards
      const rewards: InsertSubscriptionReward[] = [];
      
      // Calculate daily reward amount based on subscription tier
      let dailyRewardAmount: number;
      if (parsedAmount === 2000) {
        dailyRewardAmount = 1714; // Standard tier: ₹12,000 / 7 days
      } else if (parsedAmount === 10000) {
        dailyRewardAmount = 11428; // Premium tier: ₹80,000 / 7 days
      } else {
        dailyRewardAmount = 857; // Basic tier: ₹6,000 / 7 days
      }
      
      // Create reward for each day
      for (let day = 1; day <= parsedDuration; day++) {
        const rewardDate = new Date(startDate);
        rewardDate.setDate(rewardDate.getDate() + (day - 1));
        
        rewards.push({
          userId,
          subscriptionId: subscription.id,
          amount: dailyRewardAmount.toString(),
          day,
          status: "pending"
        });
      }
      
      // Save all rewards to database
      await storage.createSubscriptionRewards(rewards);
      
      // Recalculate display values for message
      let displayReward = "857";
      let displayTotal = "6,000";
      
      if (parsedAmount === 2000) {
        displayReward = "1,714";
        displayTotal = "12,000";
      } else if (parsedAmount === 10000) {
        displayReward = "11,428";
        displayTotal = "80,000";
      }
      
      res.status(201).json({ 
        success: true, 
        message: `Successfully purchased ${name} subscription. You will receive ₹${displayReward} daily for 7 days (₹${displayTotal} total).`,
        subscription 
      });
    } catch (error) {
      res.status(500).json({ message: "Error purchasing subscription" });
    }
  });

  // Admin endpoint to process pending rewards for a specific date (default: today)
  app.post("/api/admin/process-subscription-rewards", requireAdmin, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Admin verification is now handled by the requireAdmin middleware
      
      // Get date to process (default: today)
      const dateStr = req.body.date;
      const date = dateStr ? new Date(dateStr) : new Date();
      
      // Get all pending rewards for this date
      const pendingRewards = await storage.getPendingRewardsByDate(date);
      
      if (pendingRewards.length === 0) {
        return res.json({ message: "No pending rewards found for this date", processed: 0 });
      }
      
      // Process each reward
      let processedCount = 0;
      for (const reward of pendingRewards) {
        // Update wallet balance
        const rewardAmount = parseFloat(reward.amount);
        await storage.updateWalletBalance(reward.userId, rewardAmount);
        
        // Create transaction
        await storage.createTransaction({
          userId: reward.userId,
          amount: rewardAmount.toString(),
          type: "subscription_reward",
          status: "completed",
          description: `Day ${reward.day} subscription reward`,
          commissionAmount: "0"
        });
        
        // Mark reward as paid
        await storage.updateRewardStatus(reward.id, "paid");
        
        processedCount++;
      }
      
      res.json({
        success: true,
        message: `Processed ${processedCount} subscription rewards for ${date.toDateString()}`,
        processed: processedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Error processing subscription rewards" });
    }
  });

  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = insertWaitlistSchema.parse(req.body);
      
      const waitlist = await storage.addToWaitlist({ email });
      res.status(201).json(waitlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error adding to waitlist" });
    }
  });
  
  // Purchase subscription
  app.post("/api/subscription/purchase", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const wallet = await storage.getWallet(userId);
      
      // Check if user has enough balance (subscription costs 300)
      if (!wallet || parseFloat(wallet.balance.toString()) < 300) {
        return res.status(400).json({ message: 'Insufficient wallet balance for subscription. Minimum balance required is ₹300.' });
      }
      
      // Deduct subscription cost from wallet
      const updatedWallet = await storage.updateWalletBalance(userId, -300);
      
      // Add subscription (30 days)
      const user = await storage.addSubscription(userId, 30);
      
      // Record transaction
      await storage.createTransaction({
        userId,
        amount: "-300",
        type: "subscription",
        status: "completed",
        description: "Monthly Subscription Purchase",
        commissionAmount: "0"
      });
      
      res.json({ success: true, user, wallet: updatedWallet });
    } catch (error) {
      res.status(500).json({ message: 'Error purchasing subscription' });
    }
  });

  // REFERRAL SYSTEM ROUTES
  
  // Generate referral code for current user
  app.post("/api/generate-referral-code", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updatedUser = await storage.generateReferralCode(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        success: true, 
        referralCode: updatedUser.referralCode 
      });
    } catch (error) {
      res.status(500).json({ message: "Error generating referral code" });
    }
  });
  
  // Apply referral code during registration (modify auth.ts registration endpoint)
  // This endpoint allows users to check if a referral code is valid
  app.get("/api/check-referral/:code", async (req, res) => {
    try {
      const referralCode = req.params.code;
      
      // Get all users and filter by referral code
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.referralCode === referralCode);
      
      if (!user) {
        return res.status(404).json({ valid: false, message: "Invalid referral code" });
      }
      
      res.json({ 
        valid: true, 
        message: "Valid referral code",
        referrerId: user.id
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking referral code" });
    }
  });
  
  // Get referrals for current user
  app.get("/api/my-referrals", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const referrals = await storage.getReferrals(userId);
      
      // Return only necessary user information, not passwords
      const safeReferrals = referrals.map(user => ({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }));
      
      res.json(safeReferrals);
    } catch (error) {
      res.status(500).json({ message: "Error fetching referrals" });
    }
  });
  
  // LOYALTY SYSTEM ROUTES
  
  // Record user login and update streak
  app.post("/api/record-login", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updatedUser = await storage.updateLastLogin(userId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Award points based on streak
      const streak = updatedUser.dailyStreak || 1;
      let pointsAwarded = 10; // Base points for login
      
      // Bonus points for streaks
      if (streak >= 7) {
        pointsAwarded += 50; // Weekly streak bonus
      } else if (streak >= 3) {
        pointsAwarded += 20; // 3-day streak bonus
      }
      
      // Add reward points
      const userWithPoints = await storage.addRewardPoints(userId, pointsAwarded);
      
      res.json({
        success: true,
        dailyStreak: userWithPoints?.dailyStreak,
        pointsAwarded,
        totalPoints: userWithPoints?.rewardPoints
      });
    } catch (error) {
      res.status(500).json({ message: "Error recording login" });
    }
  });
  
  // Get user loyalty profile
  app.get("/api/loyalty-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Calculate reward tiers based on points
      const points = user.rewardPoints || 0;
      let tier = "Bronze";
      
      if (points >= 1000) {
        tier = "Platinum";
      } else if (points >= 500) {
        tier = "Gold";
      } else if (points >= 200) {
        tier = "Silver";
      }
      
      res.json({
        rewardPoints: points,
        dailyStreak: user.dailyStreak || 0,
        lastLoginDate: user.lastLoginDate,
        tier,
        nextTier: tier === "Platinum" ? null : tier === "Gold" ? "Platinum" : tier === "Silver" ? "Gold" : "Silver",
        pointsToNextTier: tier === "Platinum" ? 0 : tier === "Gold" ? 1000 - points : tier === "Silver" ? 500 - points : 200 - points
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching loyalty profile" });
    }
  });
  
  // Redeem reward points
  app.post("/api/redeem-points", requireAuth, async (req, res) => {
    try {
      const { points } = req.body;
      const userId = req.user!.id;
      
      if (!points || points < 50) {
        return res.status(400).json({ message: "Minimum 50 points required for redemption" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userPoints = user.rewardPoints || 0;
      if (userPoints < points) {
        return res.status(400).json({ message: "Insufficient reward points" });
      }
      
      // Calculate wallet credit (1 point = ₹0.10)
      const walletCredit = (points * 0.1);
      
      // Deduct points
      await storage.addRewardPoints(userId, -points);
      
      // Add credit to wallet
      const updatedWallet = await storage.updateWalletBalance(userId, walletCredit);
      
      // Record transaction
      await storage.createTransaction({
        userId,
        amount: walletCredit.toString(),
        type: "reward_redemption",
        status: "completed",
        description: `Redeemed ${points} points for ₹${walletCredit.toFixed(2)}`,
        commissionAmount: "0"
      });
      
      res.json({
        success: true,
        pointsRedeemed: points,
        walletCredited: walletCredit,
        remainingPoints: userPoints - points,
        wallet: updatedWallet
      });
    } catch (error) {
      res.status(500).json({ message: "Error redeeming points" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Initialize Socket.IO server
  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Store active users and chat history
  const activeUsers = new Map();
  const chatRooms = new Map();
  const messageHistory = new Map();
  
  // Initialize global chat room
  if (!chatRooms.has('global')) {
    chatRooms.set('global', { id: 'global', name: 'Global Chat', type: 'global', participants: [] });
    messageHistory.set('global', []);
  }
  
  // Socket.IO event handling
  io.on('connection', (socket) => {
    console.log('Client connected: ', socket.id);
    
    // Join room
    socket.on('joinRoom', async (data) => {
      const { userId, username, roomId } = data;
      
      if (!roomId) return;
      
      // Add user to active users list
      activeUsers.set(socket.id, { userId, username, currentRoom: roomId });
      
      // Join socket to room
      socket.join(roomId);
      
      // Add user to room participants if not already there
      if (chatRooms.has(roomId)) {
        const room = chatRooms.get(roomId);
        if (!room.participants.includes(userId)) {
          room.participants.push(userId);
          chatRooms.set(roomId, room);
        }
      } else {
        // Create room if it doesn't exist (for game rooms)
        if (roomId.startsWith('game-')) {
          chatRooms.set(roomId, { 
            id: roomId, 
            name: `Game Room ${roomId.split('-')[1]}`, 
            type: 'game',
            participants: [userId]
          });
          messageHistory.set(roomId, []);
        }
      }
      
      // Send message history for the room
      if (messageHistory.has(roomId)) {
        socket.emit('messageHistory', messageHistory.get(roomId));
      } else {
        messageHistory.set(roomId, []);
        socket.emit('messageHistory', []);
      }
      
      // Emit user count to all clients in the room
      io.to(roomId).emit('userCount', 
        [...activeUsers.values()].filter(user => user.currentRoom === roomId).length
      );
      
      // Notify room about new user
      const joinMessage = {
        id: randomUUID(),
        sender: 'system',
        senderName: 'System',
        content: `${username} has joined the chat`,
        timestamp: new Date(),
        roomId: roomId
      };
      
      socket.to(roomId).emit('message', joinMessage);
    });
    
    // Leave room
    socket.on('leaveRoom', ({ userId, roomId }) => {
      if (!roomId) return;
      
      socket.leave(roomId);
      
      // Update user's current room
      if (activeUsers.has(socket.id)) {
        const userData = activeUsers.get(socket.id);
        activeUsers.set(socket.id, { ...userData, currentRoom: null });
      }
      
      // Remove user from room participants
      if (chatRooms.has(roomId)) {
        const room = chatRooms.get(roomId);
        room.participants = room.participants.filter(id => id !== userId);
        chatRooms.set(roomId, room);
        
        // Delete private room if empty and not global
        if (room.type === 'private' && room.participants.length === 0) {
          chatRooms.delete(roomId);
          messageHistory.delete(roomId);
        }
      }
      
      // Emit updated user count
      io.to(roomId).emit('userCount', 
        [...activeUsers.values()].filter(user => user.currentRoom === roomId).length
      );
    });
    
    // Get message history for a room
    socket.on('getMessageHistory', (roomId) => {
      if (messageHistory.has(roomId)) {
        socket.emit('messageHistory', messageHistory.get(roomId));
      } else {
        socket.emit('messageHistory', []);
      }
    });
    
    // Send message
    socket.on('sendMessage', (data) => {
      const { content, sender, senderName, roomId } = data;
      
      if (!content || !roomId) return;
      
      const message = {
        id: randomUUID(),
        sender,
        senderName,
        content,
        timestamp: new Date(),
        roomId
      };
      
      // Store message in history (keep only last 100 messages per room)
      if (messageHistory.has(roomId)) {
        const history = messageHistory.get(roomId);
        if (history.length >= 100) {
          history.shift(); // Remove oldest message
        }
        history.push(message);
        messageHistory.set(roomId, history);
      } else {
        messageHistory.set(roomId, [message]);
      }
      
      // Send to all clients in the room including sender
      io.to(roomId).emit('message', message);
    });
    
    // Create private chat room
    socket.on('createPrivateRoom', (data) => {
      const { userId, username, otherUserId, otherUsername, roomId } = data;
      
      if (!roomId || !userId || !otherUserId) return;
      
      // Create room if it doesn't exist
      if (!chatRooms.has(roomId)) {
        const room = {
          id: roomId,
          name: `Chat with ${otherUsername}`,
          type: 'private',
          participants: [userId, otherUserId]
        };
        
        chatRooms.set(roomId, room);
        messageHistory.set(roomId, []);
        
        // Notify the other user about the private chat room
        const otherSocketId = [...activeUsers.entries()]
          .find(([_, user]) => user.userId === otherUserId)?.[0];
          
        if (otherSocketId) {
          const otherSocket = io.sockets.sockets.get(otherSocketId);
          if (otherSocket) {
            const roomForOther = {
              ...room,
              name: `Chat with ${username}`
            };
            otherSocket.emit('privateRoomCreated', roomForOther);
          }
        }
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected: ', socket.id);
      
      if (activeUsers.has(socket.id)) {
        const userData = activeUsers.get(socket.id);
        const { currentRoom } = userData;
        
        // Leave current room
        if (currentRoom) {
          socket.leave(currentRoom);
          
          // Update room participants
          if (chatRooms.has(currentRoom)) {
            const room = chatRooms.get(currentRoom);
            room.participants = room.participants.filter(id => id !== userData.userId);
            chatRooms.set(currentRoom, room);
            
            // Emit updated user count
            io.to(currentRoom).emit('userCount', 
              [...activeUsers.values()].filter(user => user.currentRoom === currentRoom).length - 1
            );
          }
        }
        
        // Remove from active users
        activeUsers.delete(socket.id);
      }
    });
  });
  
  return httpServer;
}
