import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, XCircle, FileText, Users, Shield } from "lucide-react";
import { format } from "date-fns";

// No more admin password verification constants - using user ID 1 as admin

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // User ID 1 is the admin - no need for password verification anymore
  const isAdmin = !!user && user.id === 1;
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Admin verification is now done via user ID check
  
  const { data: allTransactions, isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: async () => {
      // Use our new admin endpoint to get all transactions
      const response = await apiRequest("GET", "/api/admin/transactions");
      return await response.json();
    },
    enabled: isAdmin,
  });
  
  // Filter to just show pending deposits
  const pendingTransactions = allTransactions?.filter(
    t => t.status === "pending" && t.type === "deposit"
  ) || [];
  
  const { data: allUsers, isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      // Use our new admin endpoint to get all users
      const response = await apiRequest("GET", "/api/admin/users");
      return await response.json();
    },
    enabled: isAdmin,
  });
  
  const approveDepositMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await apiRequest(
        "POST", 
        `/api/wallet/approve-deposit/${transactionId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit approved",
        description: "The deposit has been approved and funds added to user's wallet.",
        variant: "default",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      
      setSelectedTransaction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error approving deposit",
        description: error.message || "There was an error approving the deposit",
        variant: "destructive",
      });
    },
  });
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const handleApproveDeposit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };
  
  const confirmApproveDeposit = () => {
    if (selectedTransaction) {
      approveDepositMutation.mutate(selectedTransaction.id);
    }
  };
  
  const formatAmount = (amount: string) => {
    const parsedAmount = parseFloat(amount);
    return `₹${parsedAmount.toFixed(2)}`;
  };
  
  // Admin protected route component handles access control logic

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Admin Panel
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900 dark:text-green-100">
              Admin Verified
            </span>
          </h1>
          <p className="text-muted-foreground">
            Manage the gaming platform, approve transactions, and view user information.
          </p>
        </div>
        
        <Tabs defaultValue="pending-deposits" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="pending-deposits" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pending Deposits
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending-deposits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Deposits</CardTitle>
                <CardDescription>
                  Review and approve deposit requests from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTransactionsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pendingTransactions && pendingTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTransactions.map(transaction => (
                      <Card key={transaction.id} className="bg-muted/30 border-amber-200 dark:border-amber-800/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">Deposit Request</h3>
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-xs">
                                  Pending
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                User ID: {transaction.userId}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Amount: <span className="font-medium text-green-600">{formatAmount(transaction.amount)}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Date: {format(new Date(transaction.createdAt), "MMM dd, yyyy HH:mm")}
                              </p>
                              <p className="text-sm mt-2">
                                {transaction.description}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproveDeposit(transaction)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Deposit</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to approve this deposit of {formatAmount(selectedTransaction?.amount || "0")}?
                                    <br /><br />
                                    Make sure you have received the payment via UPI before approving.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={confirmApproveDeposit}
                                    disabled={approveDepositMutation.isPending}
                                  >
                                    {approveDepositMutation.isPending ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                      </>
                                    ) : (
                                      "Approve"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">No pending deposits</h3>
                    <p className="text-muted-foreground">There are no pending deposit requests at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage users on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUsersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : allUsers && allUsers.length > 0 ? (
                  <div className="space-y-4">
                    {allUsers.map(user => (
                      <Card key={user.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{user.username}</h3>
                              <p className="text-sm text-muted-foreground">
                                User ID: {user.id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Email: {user.email || "N/A"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Joined: {format(new Date(user.createdAt), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm mt-2">
                                Subscription: {user.subscriptionExpiryDate ? (
                                  <span className="text-green-600">
                                    Active until {format(new Date(user.subscriptionExpiryDate), "MMM dd, yyyy")}
                                  </span>
                                ) : (
                                  <span className="text-amber-600">None</span>
                                )}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                    <p className="text-muted-foreground">There are no users registered on the platform yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}