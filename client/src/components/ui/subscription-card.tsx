import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Check, Gift, Calendar, TrendingUp, BadgePercent } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  rewards: number;
  duration: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export function SubscriptionCard() {
  const plans: SubscriptionPlan[] = [
    {
      id: "basic",
      name: "Basic Subscription",
      price: 1000,
      rewards: 6000,
      duration: 7,
      description: "Perfect for casual players",
      features: [
        "Receive ₹857 daily for 7 days (₹6,000 total)",
        "25% lower commission on winnings",
        "Priority customer support",
        "Exclusive promotions",
      ]
    },
    {
      id: "standard",
      name: "Standard Subscription",
      price: 2000,
      rewards: 12000,
      duration: 7,
      description: "Our most popular package",
      features: [
        "Receive ₹1,714 daily for 7 days (₹12,000 total)",
        "25% lower commission on winnings",
        "Priority customer support",
        "Exclusive promotions and special events",
      ],
      popular: true
    },
    {
      id: "premium",
      name: "Premium Subscription",
      price: 10000,
      rewards: 80000,
      duration: 7,
      description: "Best value for serious players",
      features: [
        "Receive ₹11,428 daily for 7 days (₹80,000 total)",
        "25% lower commission on winnings",
        "VIP customer support",
        "All exclusive promotions and special events",
        "Early access to new features and games"
      ]
    }
  ];

  const purchaseMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      const response = await apiRequest("POST", "/api/subscriptions", {
        name: plan.name,
        amount: plan.price.toString(),
        rewardAmount: plan.rewards.toString(),
        duration: plan.duration
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to purchase subscription");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/active"] });
      
      toast({
        title: "Purchase successful",
        description: "Your subscription has been purchased successfully. You'll start receiving daily rewards!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handlePurchase = (plan: SubscriptionPlan) => {
    if (confirm(`Are you sure you want to purchase the ${plan.name} for ₹${plan.price}? You'll receive ₹${plan.rewards} over ${plan.duration} days.`)) {
      purchaseMutation.mutate(plan);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Gift className="w-5 h-5 mr-2 text-primary" />
          Game Subscription Packages
        </CardTitle>
        <CardDescription>
          Purchase a subscription package and earn daily rewards!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`border ${plan.popular ? 'border-primary shadow-lg relative overflow-hidden' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -right-8 top-4 bg-primary text-primary-foreground py-1 px-10 transform rotate-45 text-xs font-bold">
                  POPULAR
                </div>
              )}
              <CardHeader className={`pb-3 ${plan.popular ? 'bg-primary/5' : ''}`}>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-1 flex flex-col">
                  <span className="text-3xl font-bold">₹{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.description}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex items-center mb-3 text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  <span>{plan.duration} days subscription</span>
                </div>
                <div className="flex items-center mb-4 text-sm">
                  <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    Get back ₹{plan.rewards} (₹{Math.round(plan.rewards/plan.duration)} daily)
                  </span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex text-sm">
                      <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(plan)}
                  disabled={purchaseMutation.isPending}
                >
                  {purchaseMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BadgePercent className="mr-2 h-4 w-4" />
                  )}
                  Buy Package
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </CardContent>
      <CardFooter className="bg-amber-50 dark:bg-amber-950/20 flex flex-col items-start px-6 py-4 border-t">
        <p className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-400">💰 Subscription Benefits:</p>
        <ul className="text-xs text-amber-700 dark:text-amber-500 list-disc pl-4 space-y-1">
          <li>Daily rewards are credited to your wallet automatically</li>
          <li>Enjoy reduced commission fees on all game winnings</li>
          <li>Rewards can be withdrawn after 10 days from purchase</li>
          <li>Subscriptions are non-refundable once purchased</li>
        </ul>
      </CardFooter>
    </Card>
  );
}