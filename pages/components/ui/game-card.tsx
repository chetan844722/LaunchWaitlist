import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Bot, Zap } from "lucide-react";
import { Game } from "@shared/schema";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Import game SVGs
import ludoSvg from "@assets/ludo.svg";
import rummySvg from "@assets/rummy.svg";
import carromSvg from "@assets/carrom.svg";
import teenpattiSvg from "@assets/teenpatti.svg";
import chessSvg from "@assets/chess.svg";
import aviatorSvg from "@assets/aviator.svg";
import colorTradingSvg from "@assets/color-trading.svg";
import pokerSvg from "@assets/poker.svg";
import blackjackSvg from "@assets/blackjack.svg";
import slotsSvg from "@assets/slots.svg";
import rouletteSvg from "@assets/roulette.svg";

interface GameCardProps {
  game: Game;
  featured?: boolean;
  aiMode?: boolean;
}

export function GameCard({ game, featured = false, aiMode = false }: GameCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryAmount, setEntryAmount] = useState(game.minEntry.toString());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const createMatchMutation = useMutation({
    mutationFn: async (data: { gameId: number; entryAmount: string }) => {
      const res = await apiRequest("POST", "/api/matches", data);
      return await res.json();
    },
    onSuccess: (match) => {
      if (aiMode) {
        toast({
          title: "AI Game Started",
          description: "AI opponent is joining your game. You'll automatically win after playing!",
        });
      } else {
        toast({
          title: "Success",
          description: "Game created successfully",
        });
      }
      
      setIsDialogOpen(false);
      navigate(`/games/${match.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create game",
        variant: "destructive",
      });
    },
  });

  const handleCreateMatch = () => {
    const amount = parseFloat(entryAmount);
    const min = parseFloat(game.minEntry.toString());
    const max = parseFloat(game.maxEntry.toString());

    if (isNaN(amount) || amount < min || amount > max) {
      toast({
        title: "Invalid amount",
        description: `Entry amount must be between ₹${min} and ₹${max}`,
        variant: "destructive",
      });
      return;
    }

    createMatchMutation.mutate({
      gameId: game.id,
      entryAmount,
    });
  };

  const getGameImage = () => {
    switch (game.name) {
      case "Ludo Royal":
        return (
          <img src={ludoSvg} alt="Ludo Royal" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Rummy Plus":
        return (
          <img src={rummySvg} alt="Rummy Plus" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Carrom Clash":
        return (
          <img src={carromSvg} alt="Carrom Clash" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Teen Patti Gold":
        return (
          <img src={teenpattiSvg} alt="Teen Patti Gold" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Chess Master":
        return (
          <img src={chessSvg} alt="Chess Master" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Aviator Pro":
        return (
          <img src={aviatorSvg} alt="Aviator Pro" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Color Trading":
        return (
          <img src={colorTradingSvg} alt="Color Trading" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Poker King":
        return (
          <img src={pokerSvg} alt="Poker King" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Blackjack 21":
        return (
          <img src={blackjackSvg} alt="Blackjack 21" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Lucky Slots":
        return (
          <img src={slotsSvg} alt="Lucky Slots" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      case "Roulette Royal":
        return (
          <img src={rouletteSvg} alt="Roulette Royal" className="w-full h-48 bg-background/50 object-contain p-2" />
        );
      default:
        // Fallback to a game image based on the ID
        const gameSvgs = [
          ludoSvg, rummySvg, carromSvg, teenpattiSvg, chessSvg, 
          aviatorSvg, colorTradingSvg, pokerSvg, blackjackSvg, slotsSvg, rouletteSvg
        ];
        const svgIndex = (game.id - 1) % gameSvgs.length;
        return (
          <img src={gameSvgs[svgIndex]} alt={game.name} className="w-full h-48 bg-background/50 object-contain p-2" />
        );
    }
  };

  return (
    <Card className={`overflow-hidden transition duration-300 hover:shadow-lg hover:-translate-y-1 ${aiMode ? 'border-primary/30 bg-gradient-to-b from-background to-primary/5' : ''}`}>
      <div className="relative">
        {getGameImage()}
        {featured && !aiMode && (
          <div className="absolute top-3 right-3 bg-primary/90 text-white text-xs font-bold py-1 px-2 rounded">
            Popular
          </div>
        )}
        {aiMode && (
          <div className="absolute top-3 right-3 bg-primary/90 text-white text-xs font-bold py-1 px-2 rounded flex items-center gap-1">
            <Bot className="h-3 w-3" />
            AI Mode
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            {game.name}
            {aiMode && <Bot className="h-4 w-4 text-primary" />}
          </h3>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-foreground">4.8</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          {aiMode 
            ? `Play ${game.name} instantly against our AI opponent. Perfect for practice and guaranteed wins!` 
            : game.description}
        </p>
        
        {aiMode && (
          <div className="flex items-center gap-2 mb-4 text-xs text-primary-foreground bg-primary/10 p-2 rounded-md">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-primary-foreground font-medium">Instant play & auto-win against AI</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-foreground font-medium">
            Entry: ₹{parseFloat(game.minEntry.toString())} - ₹{parseFloat(game.maxEntry.toString())}
          </span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className={`${aiMode ? 'bg-primary-gradient' : 'bg-primary'} hover:bg-primary/90 text-white flex items-center gap-2`}>
                {aiMode && <Bot className="h-4 w-4" />}
                {aiMode ? "Play vs AI" : "Play Now"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {aiMode ? (
                    <span className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Play {game.name} vs AI
                    </span>
                  ) : (
                    `Create ${game.name} Match`
                  )}
                </DialogTitle>
                {aiMode && (
                  <DialogDescription>
                    An AI opponent will automatically join your game. The game will start immediately, and you'll win after a short gameplay period!
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="entry-amount" className="text-sm font-medium">
                    Entry Amount
                  </label>
                  <Input
                    id="entry-amount"
                    type="number"
                    min={parseFloat(game.minEntry.toString())}
                    max={parseFloat(game.maxEntry.toString())}
                    placeholder={`Min: ₹${parseFloat(game.minEntry.toString())}, Max: ₹${parseFloat(game.maxEntry.toString())}`}
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Commission: {parseFloat(game.commissionPercentage.toString())}% of the prize pool
                  </p>
                </div>
                <Button 
                  className={`w-full ${aiMode ? 'bg-primary-gradient' : 'bg-primary'} hover:bg-primary/90 text-white`}
                  onClick={handleCreateMatch}
                  disabled={createMatchMutation.isPending}
                >
                  {createMatchMutation.isPending ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      {aiMode ? "Starting AI Game" : "Creating Match"}
                    </span>
                  ) : (
                    aiMode ? "Start AI Game" : "Create Match"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
