import { analytics } from "@/lib/firebase";
import { logEvent as firebaseLogEvent } from "firebase/analytics";

// Event types
export type EventType = 
  | 'login'
  | 'register'
  | 'game_start'
  | 'game_end'
  | 'wallet_deposit'
  | 'wallet_withdraw'
  | 'match_join'
  | 'match_win'
  | 'page_view'
  | 'button_click'
  | 'error'
  | 'referral';

// Common event parameters
export interface EventParams {
  [key: string]: string | number | boolean;
}

/**
 * Log event to Firebase Analytics
 * 
 * @param eventName The name of the event to log
 * @param params Additional parameters to log with the event
 */
export const logEvent = (eventName: EventType, params?: EventParams): void => {
  if (analytics) {
    try {
      firebaseLogEvent(analytics, eventName, {
        timestamp: new Date().toISOString(),
        ...params,
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }
};

/**
 * Track page views with Firebase Analytics
 * 
 * @param pageName The name of the page being viewed
 */
export const trackPageView = (pageName: string): void => {
  logEvent('page_view', { page_name: pageName });
};

/**
 * Track user actions like button clicks
 * 
 * @param elementId The ID or descriptor of the element that was interacted with
 * @param action The action that was performed
 */
export const trackUserAction = (elementId: string, action: string): void => {
  logEvent('button_click', {
    element_id: elementId,
    action: action,
  });
};

/**
 * Track game-related events
 * 
 * @param gameId The ID of the game
 * @param eventType The type of game event
 * @param additionalParams Additional parameters to log with the event
 */
export const trackGameEvent = (
  gameId: number,
  eventType: 'game_start' | 'game_end' | 'match_join' | 'match_win',
  additionalParams?: EventParams
): void => {
  logEvent(eventType, {
    game_id: gameId,
    ...additionalParams,
  });
};

/**
 * Track wallet transactions
 * 
 * @param userId The ID of the user
 * @param amount The amount being transacted
 * @param transactionType The type of transaction
 */
export const trackWalletTransaction = (
  userId: number,
  amount: string,
  transactionType: 'wallet_deposit' | 'wallet_withdraw'
): void => {
  logEvent(transactionType, {
    user_id: userId,
    amount: parseFloat(amount),
    currency: 'INR',
  });
};

/**
 * Track errors that occur in the application
 * 
 * @param errorCode An error code or identifier
 * @param errorMessage The error message
 * @param additionalInfo Additional information about the error
 */
export const trackError = (
  errorCode: string,
  errorMessage: string,
  additionalInfo?: Record<string, unknown>
): void => {
  logEvent('error', {
    error_code: errorCode,
    error_message: errorMessage,
    ...additionalInfo,
  });
};

/**
 * Track referrals
 * 
 * @param referrerId ID of the user who made the referral
 * @param referredUserId ID of the user who was referred
 */
export const trackReferral = (
  referrerId: number,
  referredUserId: number
): void => {
  logEvent('referral', {
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    timestamp: Date.now(),
  });
};