import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gaming-wallet-platform-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, fullName, phone, upiId, referralCode } = req.body;
      
      // Check if user already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if referral code is valid
      let referrerId = null;
      if (referralCode) {
        const allUsers = await storage.getAllUsers();
        const referrer = allUsers.find(
          user => user.referralCode === referralCode
        );
        
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        phone,
        upiId,
        referredBy: referrerId,
        rewardPoints: 25 // Bonus points for new users
      });

      // Create wallet for the user
      await storage.createWallet({ userId: user.id, balance: "0" });
      
      // If user was referred, reward the referrer
      if (referrerId) {
        // Add reward points to referrer (100 points per referral)
        await storage.addRewardPoints(referrerId, 100);
        
        // Award referral bonus to both parties (₹10 each)
        await storage.updateWalletBalance(referrerId, 10);
        await storage.updateWalletBalance(user.id, 10);
        
        // Record transactions
        await storage.createTransaction({
          userId: referrerId,
          amount: "10",
          type: "referral_bonus",
          status: "completed",
          description: `Referral bonus for inviting ${username}`,
          commissionAmount: "0"
        });
        
        await storage.createTransaction({
          userId: user.id,
          amount: "10",
          type: "referral_bonus",
          status: "completed",
          description: "Welcome bonus for using a referral code",
          commissionAmount: "0"
        });
      }
      
      // Generate referral code for new user
      await storage.generateReferralCode(user.id);

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        const safeUser = { ...user };
        delete safeUser.password;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Update last login date and daily streak
      await storage.updateLastLogin(userId);
      
      // Fetch updated user
      const updatedUser = await storage.getUser(userId);
      
      // Calculate and award login points based on streak
      const streak = updatedUser?.dailyStreak || 1;
      let pointsAwarded = 10; // Base points for login
      
      // Bonus points for streaks
      if (streak >= 7) {
        pointsAwarded += 50; // Weekly streak bonus
      } else if (streak >= 3) {
        pointsAwarded += 20; // 3-day streak bonus
      }
      
      // Add reward points
      await storage.addRewardPoints(userId, pointsAwarded);
      
      const safeUser = { ...updatedUser };
      if (safeUser) {
        delete (safeUser as any).password;
      }
      
      res.status(200).json({
        user: safeUser,
        loginReward: {
          pointsAwarded,
          currentStreak: streak
        }
      });
    } catch (error) {
      console.error("Error processing login rewards:", error);
      // Still return the user even if reward processing fails
      const safeUser = { ...req.user };
      delete (safeUser as any).password;
      res.status(200).json({ user: safeUser });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const safeUser = { ...req.user };
    delete (safeUser as any).password;
    res.json(safeUser);
  });
}
