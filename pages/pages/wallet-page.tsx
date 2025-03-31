import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BalanceCard } from "@/components/ui/balance-card";
import { TransactionCard } from "@/components/ui/transaction-card";
import { SubscriptionCard } from "@/components/ui/subscription-card";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Transaction, Subscription, SubscriptionReward } from "@shared/schema";
import { Loader2, Shield, ChartLine, Zap, Gift, QrCode, Copy, ExternalLink, Calendar } from "lucide-react";
import { generateUpiPaymentUrl, getUpiDetails } from "@/lib/utils/upi-payment";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { trackUserAction } from "@/lib/utils/analytics";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { upiId: platformUpiId } = getUpiDetails();
  
  const { data: wallet, isLoading: isWalletLoading } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });
  
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: activeSubscriptions, isLoading: isSubscriptionsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions/active"],
  });
  
  const { data: subscriptionRewards, isLoading: isRewardsLoading } = useQuery<SubscriptionReward[]>({
    queryKey: ["/api/subscription-rewards"],
  });
  
  // Copy UPI ID to clipboard
  const copyUpiId = () => {
    navigator.clipboard.writeText(platformUpiId);
    toast({
      title: "UPI ID copied",
      description: "UPI ID has been copied to clipboard.",
    });
    trackUserAction("copy-upi-id", "click");
  };
  
  // Generate UPI payment URL for predefined amounts
  const getUpiPaymentUrl = (amount: number) => {
    if (!user) return '#';
    const transactionNote = `Wallet deposit for ${user.username || 'user'} (ID: ${user.id})`;
    return generateUpiPaymentUrl(amount, transactionNote);
  };
  
  // Handle UPI payment click
  const handleUpiPaymentClick = (amount: number) => {
    trackUserAction("upi-payment", `amount-${amount}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your funds, track transactions, and view your gaming history.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {isWalletLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : wallet ? (
              <>
                <BalanceCard balance={wallet.balance.toString()} />
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-6">Wallet Features</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded-lg shrink-0">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">Secure Transactions</h4>
                          <p className="text-muted-foreground">All transactions are encrypted and protected by bank-level security.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded-lg shrink-0">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">Instant Withdrawals</h4>
                          <p className="text-muted-foreground">Withdraw your winnings instantly to your bank account or UPI ID.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded-lg shrink-0">
                          <ChartLine className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">Transaction History</h4>
                          <p className="text-muted-foreground">View detailed history of all your deposits, withdrawals, and game transactions.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded-lg shrink-0">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">Bonuses & Rewards</h4>
                          <p className="text-muted-foreground">Earn bonuses for referrals, daily logins, and special promotions.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Add Money</CardTitle>
                    <CardDescription>
                      Add funds to your wallet by paying via UPI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5 shadow-sm">
                        <h3 className="text-center font-semibold text-base mb-3">Pay to this UPI ID</h3>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm font-medium">UPI ID</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            onClick={copyUpiId}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded border-2 border-primary/20">
                          <code className="text-base font-mono font-bold">{platformUpiId}</code>
                          <QrCode className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                        <h3 className="font-semibold mb-2">How to add money:</h3>
                        <ol className="text-sm space-y-2 pl-5 list-decimal">
                          <li>Open your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                          <li>Send money to the UPI ID shown above: <span className="font-semibold">{platformUpiId}</span></li>
                          <li>Take a screenshot of your successful payment</li>
                          <li>Send the screenshot to admin with your username</li>
                          <li>Your wallet will be updated within 10-30 minutes</li>
                        </ol>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Label className="text-sm font-medium">Quick Pay Options</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[200, 500, 1000].map(amount => (
                            <Button 
                              key={amount}
                              variant={amount === 200 ? "default" : "outline"}
                              className={amount === 200 ? "w-full bg-gradient-to-r from-primary to-primary/80" : "w-full"}
                              onClick={() => {
                                // Open UPI payment app/webpage
                                window.open(getUpiPaymentUrl(amount), '_blank');
                                handleUpiPaymentClick(amount);
                                
                                // Also create a pending transaction record
                                apiRequest("POST", "/api/wallet/deposit", { 
                                  amount: amount.toString(),
                                  paymentReference: `Quick UPI payment of ₹${amount}`
                                })
                                .then(() => {
                                  toast({
                                    title: "Payment initiated",
                                    description: "Complete the payment in your UPI app. After payment, contact admin with screenshot.",
                                  });
                                })
                                .catch(err => {
                                  console.error("Error creating deposit record:", err);
                                });
                              }}
                            >
                              ₹{amount}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Custom Amount</Label>
                        <div className="flex gap-2 mt-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input id="custom-amount" type="number" className="pl-8" placeholder="Enter amount" min="100" />
                          </div>
                          <Button 
                            variant="default"
                            onClick={() => {
                              const input = document.getElementById('custom-amount') as HTMLInputElement;
                              const amount = parseInt(input.value);
                              if (amount >= 100) {
                                // Open UPI payment app/webpage
                                window.open(getUpiPaymentUrl(amount), '_blank');
                                handleUpiPaymentClick(amount);
                                
                                // Also create a pending transaction record
                                apiRequest("POST", "/api/wallet/deposit", { 
                                  amount: amount.toString(),
                                  paymentReference: `Manual UPI payment of ₹${amount}`
                                })
                                .then(() => {
                                  toast({
                                    title: "Payment initiated",
                                    description: "Complete the payment in your UPI app. After payment, contact admin with screenshot for wallet update.",
                                  });
                                })
                                .catch(err => {
                                  console.error("Error creating deposit record:", err);
                                  toast({
                                    title: "Payment initiated",
                                    description: "Complete the payment in your UPI app. After payment, contact admin with screenshot.",
                                  });
                                });
                              } else {
                                toast({
                                  title: "Invalid amount",
                                  description: "Minimum deposit amount is ₹100",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-amber-50 dark:bg-amber-950/20 flex flex-col items-start px-6 py-4 border-t">
                    <p className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-400">⚠️ Important Note:</p>
                    <ol className="text-xs text-amber-700 dark:text-amber-500 list-decimal pl-4 space-y-1">
                      <li>Funds will NOT be added automatically - admin verification is required</li>
                      <li>Always include your username in the payment description</li>
                      <li>Save payment receipt/screenshot as proof of payment</li>
                      <li>Any issues? Contact admin with payment details</li>
                    </ol>
                  </CardFooter>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-foreground mb-2">Wallet not found</h3>
                <p className="text-muted-foreground">There was an error retrieving your wallet information.</p>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Game Subscription Packages */}
            <SubscriptionCard />
            
            {/* Active Subscriptions */}
            {isSubscriptionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activeSubscriptions && activeSubscriptions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    Active Subscriptions
                  </CardTitle>
                  <CardDescription>
                    Your active subscription packages and rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeSubscriptions.map(subscription => {
                      const now = new Date();
                      const endDate = new Date(subscription.endDate);
                      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const progress = Math.round(((subscription.duration - daysLeft) / subscription.duration) * 100);
                      
                      return (
                        <Card key={subscription.id} className="border border-primary/30">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold">{subscription.name}</h4>
                              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                                {subscription.status}
                              </span>
                            </div>
                            
                            <div className="text-sm mb-3">
                              <div className="flex justify-between mb-1">
                                <span className="text-muted-foreground">Daily Reward:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">₹{parseFloat(subscription.rewardAmount)/subscription.duration}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Time Remaining:</span>
                                <span className="font-medium">{daysLeft} of {subscription.duration} days</span>
                              </div>
                            </div>
                            
                            <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Purchased: {new Date(subscription.startDate).toLocaleDateString()}</span>
                              <span>Ends: {new Date(subscription.endDate).toLocaleDateString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}
            
            {/* Subscription Rewards */}
            {isRewardsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : subscriptionRewards && subscriptionRewards.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="w-5 h-5 mr-2 text-primary" />
                    Subscription Rewards
                  </CardTitle>
                  <CardDescription>
                    Your subscription reward history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subscriptionRewards.map(reward => (
                      <div key={reward.id} className="flex justify-between items-center border-b border-border py-2">
                        <div>
                          <div className="font-medium">Day {reward.day} Reward</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(reward.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`font-bold mr-2 ${reward.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            ₹{reward.amount}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full 
                            ${reward.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {reward.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
  
            {/* Recent Transactions Card */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">Recent Transactions</h3>
                  <p className="text-muted-foreground">Your recent activity and transaction history.</p>
                </div>
                
                {isTransactionsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map(transaction => (
                      <TransactionCard 
                        key={transaction.id} 
                        transaction={transaction} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">Your transaction history will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
