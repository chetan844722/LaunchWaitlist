import { Button } from "@/components/ui/button";
import { Wallet, Transaction } from "@shared/schema";
import { Plus, ArrowRight, Wallet as WalletIcon } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WalletCardProps {
  wallet: Wallet;
  transactions: Transaction[];
}

export function WalletCard({ wallet, transactions }: WalletCardProps) {
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("POST", "/api/transactions", {
        walletId: wallet.id,
        amount,
        type: "deposit",
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setAddAmount("");
      setAddDialogOpen(false);
      toast({
        title: "Deposit successful",
        description: `₹${addAmount} has been added to your wallet.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("POST", "/api/transactions", {
        walletId: wallet.id,
        amount,
        type: "withdrawal",
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setWithdrawAmount("");
      setWithdrawDialogOpen(false);
      toast({
        title: "Withdrawal successful",
        description: `₹${withdrawAmount} has been withdrawn from your wallet.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddMoney = () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(addAmount);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    if (parseFloat(withdrawAmount) > parseFloat(wallet.balance.toString())) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough balance",
        variant: "destructive",
      });
      return;
    }
    
    withdrawMutation.mutate(withdrawAmount);
  };

  // Get recent transactions (last 3)
  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl bg-opacity-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500 rounded-full filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-gaming font-bold">Gaming Wallet</h3>
          <p className="text-gray-300 text-sm">Manage and track your funds</p>
        </div>
        <div className="p-2 bg-gaming-highlight rounded-lg">
          <WalletIcon className="text-white h-5 w-5" />
        </div>
      </div>
      
      <div className="mb-8">
        <p className="text-sm text-gray-400">Available Balance</p>
        <div className="flex items-baseline">
          <span className="text-3xl font-gaming font-bold">₹{parseFloat(wallet.balance.toString()).toFixed(2)}</span>
          {transactions.length > 0 && transactions[0].type === "deposit" && (
            <span className="ml-2 text-green-400 text-sm">
              +₹{parseFloat(transactions[0].amount.toString()).toFixed(2)} today
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Money
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gaming-card text-white">
            <DialogHeader>
              <DialogTitle>Add Money to Wallet</DialogTitle>
              <DialogDescription className="text-gray-300">
                Enter the amount you want to add to your wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="bg-gaming-dark"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleAddMoney} 
                className="bg-accent hover:bg-accent/90"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? "Processing..." : "Add Money"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-white">
              <ArrowRight className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gaming-card text-white">
            <DialogHeader>
              <DialogTitle>Withdraw Money</DialogTitle>
              <DialogDescription className="text-gray-300">
                Enter the amount you want to withdraw.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="withdraw-amount">Amount (₹)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-gaming-dark"
                  max={parseFloat(wallet.balance.toString())}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleWithdraw} 
                className="bg-accent hover:bg-accent/90"
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? "Processing..." : "Withdraw"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {recentTransactions.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-accent mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            Recent Transactions
          </h4>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return (
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </div>
        );
      case "withdrawal":
        return (
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 10l7-7m0 0l7 7m-7-7v18" 
              />
            </svg>
          </div>
        );
      case "game_entry":
        return (
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        );
      case "game_winning":
        return (
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        );
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case "deposit":
        return "Deposit via UPI";
      case "withdrawal":
        return "Withdrawal";
      case "game_entry":
        return "Game Entry Fee";
      case "game_winning":
        return "Game Winnings";
      case "commission":
        return "Commission";
      default:
        return "Transaction";
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) + " • " + d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-gaming-dark">
      <div className="flex items-center">
        {getTransactionIcon(transaction.type)}
        <div className="ml-3">
          <p className="font-medium text-sm">{getTransactionTitle(transaction.type)}</p>
          <p className="text-gray-400 text-xs">{formatDate(transaction.createdAt)}</p>
        </div>
      </div>
      <span 
        className={`font-medium ${
          transaction.type === "deposit" || transaction.type === "game_winning" 
            ? "text-green-500" 
            : "text-red-500"
        }`}
      >
        {transaction.type === "deposit" || transaction.type === "game_winning" ? "+" : "-"}
        ₹{parseFloat(transaction.amount.toString()).toFixed(2)}
      </span>
    </div>
  );
}
