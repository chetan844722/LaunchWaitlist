import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, User, Mail, Phone, CreditCard, MapPin, Calendar, Link2, Image, FileText, Settings, Monitor } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Transaction } from "@shared/schema";
import { TransactionCard } from "@/components/ui/transaction-card";
import { FirebaseProfileManagement } from "@/components/firebase-profile";
import { SubscriptionCard } from "@/components/subscription-card";

// Profile update schema
const profileSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  upiId: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  socialLinks: z.array(z.string().url()).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notificationsEnabled: z.boolean().optional(),
  privacySettings: z.enum(['public', 'private', 'friends']).optional(),
  preferredGames: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Profile form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      upiId: user?.upiId || "",
      avatarUrl: user?.avatarUrl || "",
      bio: user?.bio || "",
      location: user?.location || "",
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
      socialLinks: user?.socialLinks || [],
      theme: (user?.theme as any) || "system",
      notificationsEnabled: user?.notificationsEnabled !== undefined ? user.notificationsEnabled : true,
      privacySettings: (user?.privacySettings as any) || "public",
      preferredGames: user?.preferredGames || [],
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PATCH", `/api/users/${user?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Get total games played
  const getTotalGamesPlayed = () => {
    if (!transactions) return 0;
    return transactions.filter(t => t.type === "game_entry").length;
  };

  // Get total winnings
  const getTotalWinnings = () => {
    if (!transactions) return 0;
    return transactions
      .filter(t => t.type === "game_win")
      .reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
  };

  // Get total spent
  const getTotalSpent = () => {
    if (!transactions) return 0;
    return transactions
      .filter(t => t.type === "game_entry")
      .reduce((sum, transaction) => sum + Math.abs(parseFloat(transaction.amount.toString())), 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and view your gaming statistics.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details and payment information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-10" placeholder="Your full name" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-10" placeholder="Your phone number" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="upiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UPI ID</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input className="pl-10" placeholder="Your UPI ID" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Used for withdrawals and winnings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating
                        </span>
                      ) : (
                        "Update Profile"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Stats & Transactions */}
          <div className="col-span-1 lg:col-span-2">
            <Tabs defaultValue="statistics">
              <TabsList className="mb-6">
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="firebase">Firebase</TabsTrigger>
              </TabsList>
              
              <TabsContent value="statistics">
                <Card>
                  <CardHeader>
                    <CardTitle>Gaming Statistics</CardTitle>
                    <CardDescription>
                      Your performance and earnings summary
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Current Balance</p>
                          <p className="text-2xl font-bold text-foreground">
                            ₹{wallet ? parseFloat(wallet.balance.toString()).toFixed(2) : "0.00"}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Total Winnings</p>
                          <p className="text-2xl font-bold text-green-500">
                            ₹{getTotalWinnings().toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-yellow-500/10 border-yellow-500/20">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Total Spent</p>
                          <p className="text-2xl font-bold text-yellow-500">
                            ₹{getTotalSpent().toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-medium text-foreground">{user?.username}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium text-foreground">{user?.email}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Games Played</span>
                        <span className="font-medium text-foreground">{getTotalGamesPlayed()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground">Member Since</span>
                        <span className="font-medium text-foreground">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your transaction history and game results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactions && transactions.length > 0 ? (
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
              </TabsContent>
              
              <TabsContent value="subscription">
                <SubscriptionCard />
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                      Customize your profile appearance and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="avatarUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Profile Picture URL</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input className="pl-10" placeholder="https://example.com/your-avatar.jpg" {...field} />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Enter a URL to an image for your profile picture
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Textarea 
                                    className="pl-10 min-h-[100px]" 
                                    placeholder="Write a short bio about yourself..." 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Maximum 500 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input className="pl-10" placeholder="Your city, country" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input className="pl-10" type="date" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="theme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Theme Preference</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <Monitor className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Select theme" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                  <SelectItem value="system">System Default</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Choose your preferred color theme
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="privacySettings"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Privacy Settings</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Select privacy level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="friends">Friends Only</SelectItem>
                                  <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Control who can see your profile information
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notificationsEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Notifications
                                </FormLabel>
                                <FormDescription>
                                  Receive game updates and important alerts
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="socialLinks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Social Media Links</FormLabel>
                              <div className="space-y-2">
                                {field.value?.map((link, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="relative flex-grow">
                                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        className="pl-10" 
                                        value={link}
                                        onChange={(e) => {
                                          const newLinks = [...field.value || []];
                                          newLinks[index] = e.target.value;
                                          field.onChange(newLinks);
                                        }}
                                        placeholder="https://example.com/profile" 
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newLinks = [...field.value || []];
                                        newLinks.splice(index, 1);
                                        field.onChange(newLinks);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    field.onChange([...(field.value || []), '']);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  Add Social Link
                                </Button>
                              </div>
                              <FormDescription>
                                Add links to your social media profiles
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="preferredGames"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Games</FormLabel>
                              <div className="space-y-2">
                                {field.value?.map((game, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="relative flex-grow">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        <path d="M9 12h6"></path>
                                        <path d="M12 9v6"></path>
                                      </svg>
                                      <Input 
                                        className="pl-10" 
                                        value={game}
                                        onChange={(e) => {
                                          const newGames = [...field.value || []];
                                          newGames[index] = e.target.value;
                                          field.onChange(newGames);
                                        }}
                                        placeholder="Game name" 
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newGames = [...field.value || []];
                                        newGames.splice(index, 1);
                                        field.onChange(newGames);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    field.onChange([...(field.value || []), '']);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  Add Preferred Game
                                </Button>
                              </div>
                              <FormDescription>
                                Add the games you prefer to play
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <span className="flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Settings
                            </span>
                          ) : (
                            "Save Settings"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="firebase">
                <FirebaseProfileManagement />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
