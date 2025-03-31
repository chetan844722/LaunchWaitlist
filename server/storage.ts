import { 
  users, type User, type InsertUser,
  wallets, type Wallet, type InsertWallet,
  transactions, type Transaction, type InsertTransaction,
  games, type Game, type InsertGame,
  gameMatches, type GameMatch, type InsertGameMatch,
  playerMatches, type PlayerMatch, type InsertPlayerMatch,
  waitlist, type Waitlist, type InsertWaitlist,
  subscriptions, type Subscription, type InsertSubscription,
  subscriptionRewards, type SubscriptionReward, type InsertSubscriptionReward
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  addSubscription(userId: number, durationDays: number): Promise<User | undefined>;
  generateReferralCode(userId: number): Promise<User | undefined>;
  updateLastLogin(userId: number): Promise<User | undefined>;
  addRewardPoints(userId: number, points: number): Promise<User | undefined>;
  getReferrals(referrerId: number): Promise<User[]>;
  
  // Wallet methods
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: number, amount: number): Promise<Wallet | undefined>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransactionMetadata(id: number, metadata: any): Promise<Transaction | undefined>;
  
  // Game methods
  getAllGames(): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  
  // Game Match methods
  createGameMatch(match: InsertGameMatch): Promise<GameMatch>;
  getGameMatch(id: number): Promise<GameMatch | undefined>;
  updateGameMatch(id: number, match: Partial<InsertGameMatch>): Promise<GameMatch | undefined>;
  getActiveMatches(gameId: number): Promise<GameMatch[]>;
  
  // Player Match methods
  addPlayerToMatch(playerMatch: InsertPlayerMatch): Promise<PlayerMatch>;
  getMatchPlayers(matchId: number): Promise<PlayerMatch[]>;
  updatePlayerMatchStatus(id: number, status: string): Promise<PlayerMatch | undefined>;
  
  // Game Subscription methods
  createGameSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getUserSubscriptions(userId: number): Promise<Subscription[]>;
  getActiveUserSubscriptions(userId: number): Promise<Subscription[]>;
  getSubscriptionById(id: number): Promise<Subscription | undefined>;
  updateSubscriptionStatus(id: number, status: string): Promise<Subscription | undefined>;
  
  // Subscription Reward methods
  createSubscriptionRewards(rewards: InsertSubscriptionReward[]): Promise<void>;
  getUserSubscriptionRewards(userId: number): Promise<SubscriptionReward[]>;
  getPendingSubscriptionRewards(userId: number): Promise<SubscriptionReward[]>;
  getPendingRewardsByDate(date: Date): Promise<SubscriptionReward[]>;
  updateRewardStatus(id: number, status: string, paidAt?: Date): Promise<SubscriptionReward | undefined>;
  
  // Waitlist methods
  addToWaitlist(email: InsertWaitlist): Promise<Waitlist>;
  
  // Session store
  sessionStore: any; // Using any for session store type
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wallets: Map<number, Wallet>;
  private transactions: Map<number, Transaction>;
  private games: Map<number, Game>;
  private gameMatches: Map<number, GameMatch>;
  private playerMatches: Map<number, PlayerMatch>;
  private waitlistEmails: Map<number, Waitlist>;
  private subscriptions: Map<number, Subscription>;
  private subscriptionRewards: Map<number, SubscriptionReward>;
  
  sessionStore: any; // Using any for session.SessionStore to fix type issue
  
  private userIdCounter: number;
  private walletIdCounter: number;
  private transactionIdCounter: number;
  private gameIdCounter: number;
  private gameMatchIdCounter: number;
  private playerMatchIdCounter: number;
  private waitlistIdCounter: number;
  private subscriptionIdCounter: number;
  private subscriptionRewardIdCounter: number;

  constructor() {
    this.users = new Map();
    this.wallets = new Map();
    this.transactions = new Map();
    this.games = new Map();
    this.gameMatches = new Map();
    this.playerMatches = new Map();
    this.waitlistEmails = new Map();
    this.subscriptions = new Map();
    this.subscriptionRewards = new Map();
    
    this.userIdCounter = 1;
    this.walletIdCounter = 1;
    this.transactionIdCounter = 1;
    this.gameIdCounter = 1;
    this.gameMatchIdCounter = 1;
    this.playerMatchIdCounter = 1;
    this.waitlistIdCounter = 1;
    this.subscriptionIdCounter = 1;
    this.subscriptionRewardIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Add some initial games
    this.seedGames();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    // Create user with explicit null values for optional fields
    const user: User = {
      ...insertUser,
      id,
      createdAt: now,
      fullName: insertUser.fullName || null,
      phone: insertUser.phone || null,
      upiId: insertUser.upiId || null,
      referralCode: insertUser.referralCode || null,
      referredBy: insertUser.referredBy || null,
      hasSubscription: insertUser.hasSubscription || false,
      subscriptionExpiryDate: insertUser.subscriptionExpiryDate || null,
      rewardPoints: insertUser.rewardPoints || 0,
      lastLoginDate: insertUser.lastLoginDate || null,
      dailyStreak: insertUser.dailyStreak || 0
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async addSubscription(userId: number, durationDays: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const now = new Date();
    let expiryDate: Date;
    
    if (user.hasSubscription && user.subscriptionExpiryDate && user.subscriptionExpiryDate > now) {
      // If user already has an active subscription, extend it
      expiryDate = new Date(user.subscriptionExpiryDate);
      expiryDate.setDate(expiryDate.getDate() + durationDays);
    } else {
      // Create new subscription
      expiryDate = new Date();
      expiryDate.setDate(now.getDate() + durationDays);
    }
    
    const updatedUser = { 
      ...user, 
      hasSubscription: true,
      subscriptionExpiryDate: expiryDate 
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async generateReferralCode(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    if (user.referralCode) {
      return user; // User already has a referral code
    }
    
    // Generate a unique referral code based on username and random characters
    const usernamePrefix = user.username.slice(0, 4).toUpperCase();
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referralCode = `${usernamePrefix}-${randomChars}`;
    
    const updatedUser = {
      ...user,
      referralCode
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateLastLogin(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const now = new Date();
    const lastLoginDate = user.lastLoginDate;
    let dailyStreak = user.dailyStreak || 0;
    
    // Check if this is a daily consecutive login
    if (lastLoginDate) {
      const lastLoginDay = new Date(lastLoginDate);
      const dayDifference = Math.floor((now.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDifference === 1) {
        // Consecutive day login
        dailyStreak += 1;
      } else if (dayDifference > 1) {
        // Streak broken
        dailyStreak = 1;
      }
      // If same day login, keep streak the same
    } else {
      // First login
      dailyStreak = 1;
    }
    
    const updatedUser = {
      ...user,
      lastLoginDate: now,
      dailyStreak
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async addRewardPoints(userId: number, points: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const currentPoints = user.rewardPoints || 0;
    const updatedPoints = currentPoints + points;
    
    const updatedUser = {
      ...user,
      rewardPoints: updatedPoints
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getReferrals(referrerId: number): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.referredBy === referrerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // Wallet methods
  async getWallet(userId: number): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(
      (wallet) => wallet.userId === userId
    );
  }
  
  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const id = this.walletIdCounter++;
    const now = new Date();
    const wallet: Wallet = { 
      ...insertWallet, 
      id, 
      createdAt: now,
      balance: insertWallet.balance
    };
    this.wallets.set(id, wallet);
    return wallet;
  }
  
  async updateWalletBalance(userId: number, amount: number): Promise<Wallet | undefined> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return undefined;
    
    const currentBalance = parseFloat(wallet.balance.toString());
    const newBalance = currentBalance + amount;
    
    if (newBalance < 0) return undefined; // Prevent negative balance
    
    const updatedWallet = { 
      ...wallet, 
      balance: newBalance.toString() 
    };
    
    this.wallets.set(wallet.id, updatedWallet);
    return updatedWallet;
  }
  
  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    
    // Create transaction with explicit null values for optional fields
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt: now,
      description: insertTransaction.description || null,
      commissionAmount: insertTransaction.commissionAmount || null,
      metadata: insertTransaction.metadata || null
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async updateTransactionMetadata(id: number, metadata: any): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { 
      ...transaction, 
      metadata: { ...(transaction.metadata || {}), ...metadata } 
    };
    
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  // Game methods
  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.isActive)
      .sort((a, b) => a.id - b.id);
  }
  
  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }
  
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameIdCounter++;
    const now = new Date();
    const game: Game = { 
      ...insertGame, 
      id, 
      createdAt: now 
    };
    this.games.set(id, game);
    return game;
  }
  
  // Game Match methods
  async createGameMatch(insertMatch: InsertGameMatch): Promise<GameMatch> {
    const id = this.gameMatchIdCounter++;
    const now = new Date();
    const match: GameMatch = { 
      ...insertMatch, 
      id, 
      createdAt: now
    };
    this.gameMatches.set(id, match);
    return match;
  }
  
  async getGameMatch(id: number): Promise<GameMatch | undefined> {
    return this.gameMatches.get(id);
  }
  
  async updateGameMatch(id: number, matchData: Partial<InsertGameMatch>): Promise<GameMatch | undefined> {
    const match = this.gameMatches.get(id);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, ...matchData };
    this.gameMatches.set(id, updatedMatch);
    return updatedMatch;
  }
  
  async getActiveMatches(gameId: number): Promise<GameMatch[]> {
    return Array.from(this.gameMatches.values())
      .filter(match => match.gameId === gameId && 
        (match.status === 'waiting' || match.status === 'in_progress'))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // Player Match methods
  async addPlayerToMatch(insertPlayerMatch: InsertPlayerMatch): Promise<PlayerMatch> {
    const id = this.playerMatchIdCounter++;
    const now = new Date();
    const playerMatch: PlayerMatch = { 
      ...insertPlayerMatch, 
      id, 
      createdAt: now 
    };
    this.playerMatches.set(id, playerMatch);
    return playerMatch;
  }
  
  async getMatchPlayers(matchId: number): Promise<PlayerMatch[]> {
    return Array.from(this.playerMatches.values())
      .filter(playerMatch => playerMatch.matchId === matchId);
  }
  
  async updatePlayerMatchStatus(id: number, status: string): Promise<PlayerMatch | undefined> {
    const playerMatch = this.playerMatches.get(id);
    if (!playerMatch) return undefined;
    
    const updatedPlayerMatch = { ...playerMatch, status };
    this.playerMatches.set(id, updatedPlayerMatch);
    return updatedPlayerMatch;
  }
  
  // Waitlist methods
  async addToWaitlist(insertWaitlist: InsertWaitlist): Promise<Waitlist> {
    // Check if email already exists
    const existingEmail = Array.from(this.waitlistEmails.values()).find(
      (waitlistEntry) => waitlistEntry.email.toLowerCase() === insertWaitlist.email.toLowerCase()
    );
    
    if (existingEmail) {
      return existingEmail;
    }
    
    const id = this.waitlistIdCounter++;
    const now = new Date();
    const waitlistEntry: Waitlist = { 
      ...insertWaitlist, 
      id, 
      createdAt: now 
    };
    this.waitlistEmails.set(id, waitlistEntry);
    return waitlistEntry;
  }
  
  // Game Subscription methods
  async createGameSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionIdCounter++;
    const now = new Date();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      createdAt: now
    };
    this.subscriptions.set(id, subscription);
    
    // Create daily rewards
    const dailyRewardAmount = parseFloat(subscription.rewardAmount) / subscription.duration;
    const rewards: InsertSubscriptionReward[] = [];
    
    for (let day = 1; day <= subscription.duration; day++) {
      const rewardDate = new Date(subscription.startDate);
      rewardDate.setDate(rewardDate.getDate() + (day - 1));
      
      rewards.push({
        subscriptionId: id,
        userId: subscription.userId,
        amount: dailyRewardAmount.toFixed(2),
        day,
        status: "pending"
      });
    }
    
    // Add all the daily rewards
    await this.createSubscriptionRewards(rewards);
    
    return subscription;
  }
  
  async getUserSubscriptions(userId: number): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(subscription => subscription.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getActiveUserSubscriptions(userId: number): Promise<Subscription[]> {
    const now = new Date();
    return Array.from(this.subscriptions.values())
      .filter(subscription => 
        subscription.userId === userId && 
        subscription.status === "active" &&
        subscription.endDate > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getSubscriptionById(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }
  
  async updateSubscriptionStatus(id: number, status: string): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updatedSubscription = { ...subscription, status };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }
  
  // Subscription Reward methods
  async createSubscriptionRewards(rewards: InsertSubscriptionReward[]): Promise<void> {
    for (const insertReward of rewards) {
      const id = this.subscriptionRewardIdCounter++;
      const now = new Date();
      const reward: SubscriptionReward = {
        ...insertReward,
        id,
        createdAt: now
      };
      this.subscriptionRewards.set(id, reward);
    }
  }
  
  async getUserSubscriptionRewards(userId: number): Promise<SubscriptionReward[]> {
    return Array.from(this.subscriptionRewards.values())
      .filter(reward => reward.userId === userId)
      .sort((a, b) => a.day - b.day);
  }
  
  async getPendingSubscriptionRewards(userId: number): Promise<SubscriptionReward[]> {
    return Array.from(this.subscriptionRewards.values())
      .filter(reward => reward.userId === userId && reward.status === "pending")
      .sort((a, b) => a.day - b.day);
  }
  
  async getPendingRewardsByDate(date: Date): Promise<SubscriptionReward[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    return Array.from(this.subscriptionRewards.values())
      .filter(reward => {
        // Get subscription to check dates
        const subscription = this.subscriptions.get(reward.subscriptionId);
        if (!subscription) return false;
        
        // Calculate the reward date (subscription start date + (day - 1))
        const rewardDate = new Date(subscription.startDate);
        rewardDate.setDate(rewardDate.getDate() + (reward.day - 1));
        rewardDate.setHours(0, 0, 0, 0);
        
        // Check if reward should be given today
        return reward.status === "pending" && 
               rewardDate.getTime() === targetDate.getTime();
      });
  }
  
  async updateRewardStatus(id: number, status: string, paidAt?: Date): Promise<SubscriptionReward | undefined> {
    const reward = this.subscriptionRewards.get(id);
    if (!reward) return undefined;
    
    const updatedReward = { 
      ...reward, 
      status, 
      paidAt: paidAt || (status === "paid" ? new Date() : reward.paidAt) 
    };
    
    this.subscriptionRewards.set(id, updatedReward);
    return updatedReward;
  }
  
  // Seed initial game data
  private seedGames() {
    const games = [
      // Original games
      {
        name: "Ludo Royal",
        description: "Classic multiplayer board game with a modern twist. Play with up to 4 players. Win up to ₹500!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "10",
        image: "ludo.svg",
        isActive: true
      },
      {
        name: "Rummy Plus",
        description: "Strategic card game requiring skill. Form sets and sequences to win. Premium game with high rewards!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "rummy.svg",
        isActive: true
      },
      {
        name: "Carrom Clash",
        description: "Traditional board game with precise physics. Pocket all your pieces first! Multiplayer fun for everyone.",
        minEntry: "200",
        maxEntry: "1500",
        commissionPercentage: "12",
        image: "carrom.svg",
        isActive: true
      },
      {
        name: "Teen Patti Gold",
        description: "Classic Indian poker game with exciting variations. Bet, bluff, and win big! Play with friends or strangers.",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "15",
        image: "teenpatti.svg",
        isActive: true
      },
      {
        name: "Chess Master",
        description: "Classic strategy game with ranked matchmaking. Challenge players worldwide and climb the leaderboard!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "8",
        image: "chess.svg",
        isActive: true
      },
      
      // New featured games including Aviator and Color Trading
      {
        name: "Aviator Pro",
        description: "Watch the multiplier rise and cash out before the plane flies away! High-risk, high-reward excitement.",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "15",
        image: "aviator.svg",
        isActive: true
      },
      {
        name: "Color Trading",
        description: "Predict color patterns and earn big! Simple mechanics with deep strategy. Perfect for quick gameplay sessions.",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "12",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "Poker King",
        description: "The ultimate poker experience with Texas Hold'em and Omaha variants. Test your skills against top players!",
        minEntry: "200",
        maxEntry: "10000",
        commissionPercentage: "18",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Blackjack 21",
        description: "Classic casino card game. Get closer to 21 than the dealer without going over. Strategic and fast-paced!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "15",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Lucky Slots",
        description: "Virtual slot machine with progressive jackpots! Multiple paylines and bonus rounds for maximum excitement.",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "20",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Roulette Royal",
        description: "European roulette with premium features. Place bets on numbers, colors, or sections and watch the wheel spin!",
        minEntry: "200",
        maxEntry: "8000",
        commissionPercentage: "15",
        image: "roulette.svg",
        isActive: true
      },
      
      // More games to reach 50+
      {
        name: "Baccarat Plus",
        description: "Elegant card game with simple rules. Bet on Player, Banker, or Tie and experience the thrill of anticipation!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "15",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Crash Racer",
        description: "Watch the multiplier grow and cash out before the crash! Test your timing and nerve in this addictive game.",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "12",
        image: "aviator.svg",
        isActive: true
      },
      {
        name: "Andar Bahar Live",
        description: "Traditional Indian card game with simple rules. Guess which side the matching card will appear on!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "10",
        image: "teenpatti.svg",
        isActive: true
      },
      {
        name: "Dragon Tiger",
        description: "Fast-paced card game where you bet on which side will draw the higher card. Simple yet thrilling!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "12",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Jhandi Munda",
        description: "Traditional dice game with six symbols. Bet on which symbols will appear face up when the dice settle!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "10",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Call Break Pro",
        description: "Popular trick-taking card game. Bid on how many tricks you'll win and then try to meet your target!",
        minEntry: "200",
        maxEntry: "1500",
        commissionPercentage: "10",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "7 Up 7 Down",
        description: "Predict whether the sum of dice will be under 7, over 7, or exactly 7. Simple mechanics with big payouts!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Multiplier Madness",
        description: "Watch as the multiplier grows exponentially! Cash out at the right moment to maximize your winnings.",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "aviator.svg",
        isActive: true
      },
      {
        name: "Dice Duel",
        description: "Place bets on dice outcomes in this fast-paced game. Multiple betting options for varied gameplay!",
        minEntry: "200",
        maxEntry: "1500",
        commissionPercentage: "12",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Crypto Predictor",
        description: "Predict crypto price movements in short time frames. Up or down? Put your market intuition to the test!",
        minEntry: "200",
        maxEntry: "10000",
        commissionPercentage: "18",
        image: "aviator.svg",
        isActive: true
      },
      {
        name: "Number Ninja",
        description: "Guess the correct numbers in sequence. The fewer attempts you make, the bigger your reward!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "10",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "Pai Gow Poker",
        description: "Create two poker hands from seven cards. Both hands must beat the dealer's to win this strategic game!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "15",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Sic Bo Deluxe",
        description: "Ancient dice game with multiple betting options. Predict the outcome of three dice for big wins!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Caribbean Stud",
        description: "Poker variant played against the house. Make the best five-card hand to win the progressive jackpot!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "18",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Keno Blast",
        description: "Pick numbers and wait for the draw! The more matches you get, the bigger your prize in this lottery-style game.",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "25",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "Mines Explorer",
        description: "Grid-based game where you uncover cells to win prizes. Avoid the mines to keep your winnings!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "15",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "HiLo Extreme",
        description: "Predict if the next card will be higher or lower. Simple mechanics with increasing risk and reward!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "12",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Plinko Drop",
        description: "Drop the ball and watch it bounce through pegs to land in prize buckets. Physics-based fun with real rewards!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "18",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "Tower Builder",
        description: "Stack blocks perfectly to build the highest tower. Each successful placement increases your prize!",
        minEntry: "200",
        maxEntry: "1500",
        commissionPercentage: "15",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Virtual Sports",
        description: "Bet on simulated sports events with realistic graphics and fair odds. Football, cricket, basketball and more!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Snake & Ladder 3D",
        description: "Classic family game reimagined with 3D graphics. Race to the top with dice rolls and special power-ups!",
        minEntry: "200",
        maxEntry: "800",
        commissionPercentage: "10",
        image: "ludo.svg",
        isActive: true
      },
      {
        name: "Crazy Time",
        description: "Spin the wheel and unlock bonus games with massive multipliers. Live game show format with real-time action!",
        minEntry: "200",
        maxEntry: "10000",
        commissionPercentage: "25",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Monopoly Live",
        description: "Based on the classic board game, win prizes on the wheel and unlock the 3D bonus board for big wins!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "ludo.svg",
        isActive: true
      },
      {
        name: "Deal or No Deal",
        description: "Open briefcases to eliminate prizes, then decide whether to accept the banker's offer. Thrilling decision-making!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Lightning Dice",
        description: "Predict the total of three dice as they tumble down the lightning tower. Random multipliers boost your wins!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "18",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Mega Ball",
        description: "Lottery-style game with bingo cards. Match numbers as the balls are drawn and win with multipliers!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "color-trading.svg",
        isActive: true
      },
      {
        name: "Crazy Coins",
        description: "Flip the coin and predict the outcome. Simple yet addictive with streak bonuses for consecutive wins!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "10",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Lucky Wheel Spin",
        description: "Spin the wheel and win instant prizes. Segments with different values give varied winning opportunities!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Rapid Roulette",
        description: "Fast-paced roulette variant with 30-second rounds. Perfect for players who want quick action and results!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "12",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Video Poker Jacks+",
        description: "Classic video poker where pairs of Jacks or better win. Draw and hold cards to create winning combinations!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "10",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Football Studio",
        description: "Simple card game with football theme. Bet on Home, Away, or Draw as two cards are dealt. Fast-paced fun!",
        minEntry: "200",
        maxEntry: "1500",
        commissionPercentage: "15",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Megaways Slots",
        description: "Dynamic slot game with thousands of ways to win on every spin. Cascading reels increase your winning chances!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Triple Card Poker",
        description: "Play three poker hands simultaneously. More chances to win with strategic decisions on each hand!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "15",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Perfect Pairs",
        description: "Blackjack variant with side bets for matching cards. Get pairs for bonus payouts while playing 21!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "12",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Bonus Poker",
        description: "Video poker with enhanced payouts for four of a kind. Strategic gameplay with big reward potential!",
        minEntry: "200",
        maxEntry: "2500",
        commissionPercentage: "15",
        image: "poker.svg",
        isActive: true
      },
      {
        name: "Fast Patti",
        description: "Rapid version of Teen Patti with 30-second rounds. Quick action with all the thrills of the classic game!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "12",
        image: "teenpatti.svg",
        isActive: true
      },
      {
        name: "Speed Baccarat",
        description: "Accelerated version of the classic casino game. Rounds complete in just 27 seconds for non-stop action!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "15",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Diamond Rush",
        description: "Grid-based gem matching game with cash prizes. Create winning combinations to increase your multiplier!",
        minEntry: "200",
        maxEntry: "1000",
        commissionPercentage: "10",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Multiplier Roulette",
        description: "Enhanced roulette with randomly applied multipliers up to 500x! Standard bets with extraordinary potential!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "18",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Goal Scorer",
        description: "Predict goal outcomes in this football-themed game. Choose from various markets with different odds!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "15",
        image: "carrom.svg",
        isActive: true
      },
      {
        name: "Lightning Roulette",
        description: "Electrified roulette with lightning strikes that add multipliers up to 500x on lucky numbers!",
        minEntry: "200",
        maxEntry: "5000",
        commissionPercentage: "20",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Bonus Blackjack",
        description: "Blackjack with side bets for additional winning opportunities. Classic gameplay with extra excitement!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "15",
        image: "blackjack.svg",
        isActive: true
      },
      {
        name: "Double Ball Roulette",
        description: "Innovative roulette variant with two balls in play simultaneously. More winning chances with unique bets!",
        minEntry: "200",
        maxEntry: "3000",
        commissionPercentage: "18",
        image: "roulette.svg",
        isActive: true
      },
      {
        name: "Wheel of Fortune",
        description: "Spin the fortune wheel and win prizes based on where it stops. Special segments offer massive multipliers!",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "25",
        image: "slots.svg",
        isActive: true
      },
      {
        name: "Fantasy Cricket Premier",
        description: "Build your dream team of real cricket players and earn points based on their performance in live matches!",
        minEntry: "200",
        maxEntry: "10000",
        commissionPercentage: "20",
        image: "carrom.svg",
        isActive: true
      },
      {
        name: "Spin Wheel Deluxe",
        description: "Spin the wheel and win amazing prizes! Risk more for bigger rewards in this game of chance.",
        minEntry: "200",
        maxEntry: "2000",
        commissionPercentage: "25",
        image: "slots.svg",
        isActive: true
      }
    ];
    
    games.forEach(game => {
      this.createGame(game);
    });
  }
}

export const storage = new MemStorage();
