import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GameCard } from "@/components/ui/game-card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Game } from "@shared/schema";
import { Loader2, ArrowRight, Trophy, Shield, Wallet, Users, ChartLine, Gamepad, MessageCircle } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { ChatSystem } from "@/components/ui/chat-system";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function HomePage() {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const handleWaitlistSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const parsedData = waitlistSchema.parse({ email: waitlistEmail });
      setIsSubmitting(true);
      
      await apiRequest("POST", "/api/waitlist", parsedData);
      
      toast({
        title: "Success!",
        description: "You've been added to our waitlist.",
      });
      
      setWaitlistEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-6 md:px-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/30 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="lg:w-1/2 space-y-6">
              <span className="bg-primary/20 text-primary py-2 px-4 rounded-full text-sm font-medium inline-block">
                Coming Soon
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground font-sans leading-tight">
                Play Games. <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Win Big.</span> Cash Out Instantly.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Join the ultimate gaming platform where you can play, earn, and manage your money all in one place. Sign up for early access and get 500 bonus credits!
              </p>
              
              {/* Waitlist Form */}
              <div className="bg-card/70 backdrop-blur-sm p-6 rounded-xl space-y-4 max-w-lg mt-8 border border-border">
                <h3 className="text-xl font-bold text-foreground">Join the Waitlist</h3>
                <form onSubmit={handleWaitlistSignup} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Your email address"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white" 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                      </span>
                    ) : (
                      "Join Waitlist"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Get notified when we launch and receive exclusive bonuses!
                  </p>
                </form>
              </div>
            </div>
            
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="relative z-10">
                  <svg
                    className="w-full h-auto"
                    viewBox="0 0 500 400"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="50"
                      y="50"
                      width="400"
                      height="300"
                      rx="16"
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                      strokeWidth="2"
                    />
                    <rect
                      x="70"
                      y="80"
                      width="360"
                      height="50"
                      rx="8"
                      fill="hsl(var(--primary) / 0.1)"
                    />
                    <rect
                      x="85"
                      y="95"
                      width="20"
                      height="20"
                      rx="4"
                      fill="hsl(var(--primary))"
                    />
                    <rect
                      x="115"
                      y="95"
                      width="100"
                      height="10"
                      rx="2"
                      fill="hsl(var(--primary))"
                    />
                    <rect
                      x="115"
                      y="115"
                      width="60"
                      height="6"
                      rx="2"
                      fill="hsl(var(--muted-foreground))"
                    />
                    <rect
                      x="350"
                      y="95"
                      width="60"
                      height="20"
                      rx="4"
                      fill="hsl(var(--primary))"
                    />
                    
                    <rect
                      x="70"
                      y="150"
                      width="170"
                      height="170"
                      rx="8"
                      fill="hsl(var(--muted))"
                    />
                    <rect
                      x="260"
                      y="150"
                      width="170"
                      height="80"
                      rx="8"
                      fill="hsl(var(--muted))"
                    />
                    <rect
                      x="260"
                      y="240"
                      width="170"
                      height="80"
                      rx="8"
                      fill="hsl(var(--muted))"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 md:px-10 bg-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-sans mb-4">
              Everything You Need In One Platform
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines gaming, wallet management, and social features for a seamless experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <Gamepad className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Multiple Games</h3>
              <p className="text-muted-foreground">
                Access a variety of games including Ludo, Rummy, and more with multiplayer support.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Secure Wallet</h3>
              <p className="text-muted-foreground">
                Manage your funds, track transactions, and cash out instantly with our integrated wallet.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">
                UPI integration for fast and secure deposits and withdrawals with transparent fee structure.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Multiplayer Support</h3>
              <p className="text-muted-foreground">
                Play with friends or match with other players in real-time competitive gameplay.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <ChartLine className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Stats Tracking</h3>
              <p className="text-muted-foreground">
                Track your performance, win rates, and earnings with detailed statistics and insights.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition duration-300">
              <div className="w-14 h-14 bg-primary/20 flex items-center justify-center rounded-lg mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Tournaments</h3>
              <p className="text-muted-foreground">
                Participate in daily and weekly tournaments with bigger prize pools and competition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground font-sans">Featured Games</h2>
            <Link to="/games" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games?.slice(0, 3).map((game, index) => (
                <GameCard 
                  key={game.id} 
                  game={game} 
                  featured={index === 0}
                />
              ))}
            </div>
          )}
          
          <div className="mt-12 bg-card/70 rounded-xl p-6 md:p-8 border border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Ludo Tournament</h3>
                <p className="text-muted-foreground mb-4">Special weekend tournament with a prize pool of ₹100,000. Join now to secure your spot!</p>
                <div className="flex items-center gap-4">
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Join Tournament
                  </Button>
                  <Button variant="link" className="text-foreground hover:text-primary">
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <div className="bg-background p-4 rounded-lg border border-border">
                  <div className="text-center">
                    <span className="text-muted-foreground text-sm block mb-1">Tournament Starts In</span>
                    <div className="flex gap-2 justify-center">
                      <div className="bg-muted p-2 rounded w-14 text-center">
                        <span className="text-foreground text-xl font-bold block">02</span>
                        <span className="text-muted-foreground text-xs">Days</span>
                      </div>
                      <div className="bg-muted p-2 rounded w-14 text-center">
                        <span className="text-foreground text-xl font-bold block">14</span>
                        <span className="text-muted-foreground text-xs">Hours</span>
                      </div>
                      <div className="bg-muted p-2 rounded w-14 text-center">
                        <span className="text-foreground text-xl font-bold block">36</span>
                        <span className="text-muted-foreground text-xs">Mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 px-6 md:px-10 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-sans mb-6">
            Ready to Join GameWallet?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join GameWallet today and be among the first to experience the future of gaming and wallet management. Get 500 bonus credits at launch!
          </p>
          
          <div className="bg-card/70 backdrop-blur-sm p-6 rounded-xl max-w-md mx-auto mb-8 border border-border">
            <h3 className="text-xl font-bold text-foreground mb-4">Join the Waitlist</h3>
            <form onSubmit={handleWaitlistSignup} className="space-y-4">
              <Input
                type="email"
                placeholder="Your email address"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
              />
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                  </span>
                ) : (
                  "Get Early Access"
                )}
              </Button>
            </form>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-foreground">10,000+ Waitlist Members</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-foreground">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-foreground">Exclusive Launch Bonuses</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Global Chat Section */}
      <section className="py-12 px-6 md:px-10 bg-card/50 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Global Chat</h2>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4">
              <ChatSystem />
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
