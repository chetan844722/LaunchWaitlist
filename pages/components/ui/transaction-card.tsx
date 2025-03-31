import { Card } from "@/components/ui/card";
import { type Transaction } from "@shared/schema";
import { Trophy, Plus, ArrowRight, Clock, Check } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const getIcon = () => {
    switch (transaction.type) {
      case "game_win":
        return (
          <div className="w-9 h-9 bg-green-600/20 flex items-center justify-center rounded-full shrink-0">
            <Trophy className="h-4 w-4 text-green-600" />
          </div>
        );
      case "deposit":
        return (
          <div className="w-9 h-9 bg-primary/20 flex items-center justify-center rounded-full shrink-0">
            <Plus className="h-4 w-4 text-primary" />
          </div>
        );
      case "withdrawal":
      case "game_entry":
        return (
          <div className="w-9 h-9 bg-red-600/20 flex items-center justify-center rounded-full shrink-0">
            <ArrowRight className="h-4 w-4 text-red-600" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 bg-muted flex items-center justify-center rounded-full shrink-0">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (transaction.type) {
      case "game_win":
        return "Game Winnings";
      case "deposit":
        return "Added Money";
      case "withdrawal":
        return "Withdrawal";
      case "game_entry":
        return "Game Entry";
      default:
        return "Transaction";
    }
  };

  const getAmountColor = () => {
    const amount = parseFloat(transaction.amount);
    if (amount > 0) return "text-green-600 font-medium";
    return "text-red-600 font-medium";
  };

  // Determine if transaction is pending
  const isPending = transaction.status === "pending";
  
  return (
    <Card className={`bg-muted/30 rounded-lg p-3 flex justify-between items-center ${isPending ? 'border-amber-300 dark:border-amber-700/50' : ''}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-foreground font-medium">{getTitle()}</p>
            {isPending ? (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 text-[10px] h-5 px-1.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            ) : transaction.status === "completed" ? (
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700/50 text-[10px] h-5 px-1.5 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Completed
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{transaction.description}</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end">
        <p className={`${getAmountColor()} ${isPending ? 'opacity-70' : ''}`}>
          {parseFloat(transaction.amount) > 0 ? "+" : ""}
          ₹{parseFloat(transaction.amount).toFixed(2)}
        </p>
        <p className="text-muted-foreground text-xs">
          {format(new Date(transaction.createdAt), "MMM dd, yyyy")}
        </p>
        {isPending && (
          <p className="text-amber-600 dark:text-amber-400 text-[10px] mt-1">
            Awaiting admin approval
          </p>
        )}
      </div>
    </Card>
  );
}
