import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Clock, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState<boolean>(!!user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date());
  const [daysRemaining, setDaysRemaining] = useState<number>(() => {
    if (!user?.subscriptionEndDate) return 0;
    
    const endDate = new Date(user.subscriptionEndDate);
    const today = new Date();
    
    if (endDate > today) {
      const diffTime = endDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return 0;
  });

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/purchase", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({
        title: "Subscription purchased!",
        description: "Your 30-day premium subscription has been activated.",
      });
      setIsActive(true);
      setDaysRemaining(30);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase subscription",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-primary/20 overflow-hidden">
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/30"></div>
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Premium Subscription</CardTitle>
          {isActive && (
            <Badge className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600">
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          Unlock exclusive benefits and enhanced gameplay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isActive ? (
          <div className="bg-primary/5 rounded-lg p-4 flex items-center space-x-4">
            <Clock className="h-10 w-10 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Subscription Active</h3>
              <p className="text-muted-foreground">
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-primary/5 rounded-lg p-4 flex items-center space-x-4">
            <Star className="h-10 w-10 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Upgrade Your Experience</h3>
              <p className="text-muted-foreground">30-day premium access for ₹300</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Reduced Commission Fees</h4>
              <p className="text-sm text-muted-foreground">
                Pay lower commission on all game winnings
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Award className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Priority Matchmaking</h4>
              <p className="text-sm text-muted-foreground">
                Get matched with other players faster
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Star className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Premium Badge</h4>
              <p className="text-sm text-muted-foreground">
                Show off your premium status to other players
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {isActive ? (
          <Button
            disabled
            className="w-full bg-gradient-to-r from-primary/70 to-primary/70"
          >
            Currently Active
          </Button>
        ) : (
          <Button
            onClick={() => subscriptionMutation.mutate()}
            disabled={subscriptionMutation.isPending}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {subscriptionMutation.isPending ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </span>
            ) : (
              "Subscribe for ₹300"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}