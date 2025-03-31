import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GameMatch, PlayerMatch, Game } from "@shared/schema";
import { 
  Loader2, 
  Trophy, 
  Clock, 
  Users, 
  ArrowLeft, 
  Bot, 
  Swords,
  Sparkles,
  CheckCircle2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function GameMatchPage() {
  const { id } = useParams();
  const matchId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  type GameState = "waiting" | "playing" | "finished";
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [isAIMatch, setIsAIMatch] = useState(false);

  // Fetch match details
  const { data: match, isLoading: isMatchLoading } = useQuery<GameMatch>({
    queryKey: [`/api/matches/${matchId}`],
    refetchInterval: gameState === "waiting" ? 3000 : (gameState === "playing" ? 1000 : false),
  });

  // Fetch match players
  const { data: players, isLoading: isPlayersLoading } = useQuery<PlayerMatch[]>({
    queryKey: [`/api/matches/${matchId}/players`],
    refetchInterval: gameState === "waiting" ? 3000 : (gameState === "playing" ? 1000 : false),
  });

  // Fetch game details
  const { data: game } = useQuery<Game>({
    queryKey: [`/api/games/${match?.gameId}`],
    enabled: !!match?.gameId,
  });

  // Join match mutation
  const joinMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${matchId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/players`] });
      toast({
        title: "Joined match",
        description: "You have successfully joined the match.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join match",
        variant: "destructive",
      });
    },
  });

  // Start match mutation - deducts money from all players' wallets
  const startMatchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/matches/${matchId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Match started",
        description: "The match has been started and entry fee has been deducted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start match",
        variant: "destructive",
      });
    },
  });

  // Check if match has AI opponent
  useEffect(() => {
    if (players && players.length > 0 && match) {
      // Check for AI player based on other joined players
      const otherPlayers = players.filter(player => player.userId !== user?.id);
      
      // In this simplified version, we'll treat any match with other players as an AI match
      // when the match is in progress or completed
      if (match.status === "in_progress" || match.status === "completed") {
        setIsAIMatch(otherPlayers.length > 0);
      } else {
        // For waiting matches, don't set AI mode yet
        setIsAIMatch(false);
      }
    }
  }, [players, user?.id, match]);

  // Check if the current user is in the match
  const isPlayerInMatch = players?.some(player => player.userId === user?.id);

  // Initialize the game
  useEffect(() => {
    if (match?.status === "waiting") {
      setGameState("waiting");
    } else if (match?.status === "in_progress") {
      setGameState("playing");
      
      // Start progress for AI matches
      if (isAIMatch) {
        setProgressValue(0);
        const interval = setInterval(() => {
          setProgressValue(prev => {
            const newValue = prev + 2;
            if (newValue >= 100) {
              clearInterval(interval);
              return 100;
            }
            return newValue;
          });
        }, 200);
        
        return () => clearInterval(interval);
      }
    } else if (match?.status === "completed") {
      setGameState("finished");
      setProgressValue(100);
    }
  }, [match, isAIMatch]);

  // Handle joining the match
  const handleJoinMatch = () => {
    joinMatchMutation.mutate();
  };

  // Go back to games page
  const handleGoBack = () => {
    navigate("/games");
  };

  // Calculate prize and commission
  const calculatePrize = () => {
    if (!match || !game || !players) return { prize: 0, commission: 0, total: 0 };
    
    const entryAmount = parseFloat(match.entryAmount.toString());
    const totalPrize = entryAmount * players.length;
    const commissionPercentage = parseFloat(game.commissionPercentage.toString());
    const commission = totalPrize * (commissionPercentage / 100);
    const prize = totalPrize - commission;
    
    return { prize, commission, total: totalPrize };
  };

  // Get player status icon
  const getPlayerStatusIcon = (status: string) => {
    switch (status) {
      case "joined":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "won":
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case "lost":
        return <Swords className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Loading state
  if (isMatchLoading || isPlayersLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <MobileNav />
      </div>
    );
  }

  // Match not found
  if (!match) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container px-4 py-8 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Match Not Found</h1>
          <p className="text-muted-foreground mb-6">The match you're looking for doesn't exist or has been removed.</p>
          <Button onClick={handleGoBack}>Go Back to Games</Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <div className="mb-8 flex items-center">
          <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              {game?.name || "Game"}
              {isAIMatch && <Bot className="h-6 w-6 text-primary" />}
            </h1>
            <p className="text-muted-foreground">
              Match #{matchId} • Entry: ₹{parseFloat(match.entryAmount.toString()).toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="mb-6 overflow-hidden">
              {/* Match Status Bar - shown during in_progress for AI games */}
              {gameState === "playing" && isAIMatch && (
                <div className="px-6 pt-6 pb-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Playing against AI
                    </h3>
                    <Zap className="h-5 w-5 text-amber-500" />
                  </div>
                  <Progress value={progressValue} className="h-2 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Game in progress - you'll automatically win when gameplay completes
                  </p>
                </div>
              )}
              
              {/* Game Content */}
              <CardContent className="p-6">
                {gameState === "waiting" ? (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Waiting for Players</h2>
                    <p className="text-muted-foreground mb-6">
                      {isPlayerInMatch 
                        ? "Waiting for more players to join..." 
                        : "Join this match to play against other players."}
                    </p>
                    
                    {/* Players joined message */}
                    {players && players.length >= 2 && (
                      <div className="mb-6 flex flex-col items-center">
                        <Users className="h-12 w-12 text-primary mb-2" />
                        <p className="text-foreground text-center">
                          <span className="text-primary font-bold">{players.length}</span> players have joined. 
                          <br/>Ready to start the game?
                        </p>
                      </div>
                    )}
                    
                    {!isPlayerInMatch && (
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white" 
                        onClick={handleJoinMatch}
                        disabled={joinMatchMutation.isPending}
                      >
                        {joinMatchMutation.isPending ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining
                          </span>
                        ) : (
                          "Join Match"
                        )}
                      </Button>
                    )}
                    
                    {/* Start Game button for players */}
                    {isPlayerInMatch && players && players.length >= 2 && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white mt-4" 
                        onClick={() => startMatchMutation.mutate()}
                        disabled={startMatchMutation.isPending}
                      >
                        {startMatchMutation.isPending ? (
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting
                          </span>
                        ) : (
                          "Start Game (Pay ₹" + parseFloat(match.entryAmount.toString()).toFixed(2) + ")"
                        )}
                      </Button>
                    )}
                  </div>
                ) : gameState === "playing" ? (
                  <div className="py-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      {isAIMatch ? (
                        <>
                          <div className="relative w-32 h-32 p-2 bg-primary/5 rounded-full flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 animate-pulse"></div>
                            <Bot className="h-16 w-16 text-primary relative z-10" />
                          </div>
                          <h3 className="text-xl font-bold">Playing against AI</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            The game is in progress. You'll automatically win when the gameplay completes.
                          </p>
                        </>
                      ) : (
                        <>
                          <Swords className="h-20 w-20 text-primary animate-pulse" />
                          <h3 className="text-xl font-bold">Game in Progress</h3>
                          <p className="text-muted-foreground">
                            The game is currently being played. When the game is complete, the winner will be announced.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-50"></div>
                        <div className="relative bg-primary/10 p-6 rounded-full">
                          <Trophy className="h-20 w-20 text-primary" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        {match.winnerId === user?.id ? (
                          <span className="flex items-center gap-2">
                            You Won! <Sparkles className="h-5 w-5 text-yellow-400" />
                          </span>
                        ) : (
                          "Game Completed"
                        )}
                      </h2>
                      {match.winnerId === user?.id && (
                        <div className="text-center mt-2">
                          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary-gradient">
                            ₹{calculatePrize().prize.toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            (Commission: ₹{calculatePrize().commission.toFixed(2)})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Cards for winners/playing status */}
              {(gameState === "playing" || gameState === "finished") && (
                <CardFooter className="p-6 pt-0">
                  <div className="w-full border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3">Players:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {players?.map((player) => {
                        const isWinner = match.winnerId === player.userId;
                        const isCurrentUser = player.userId === user?.id;
                        // Check if this player is an AI opponent
                        const isAI = !isCurrentUser && isAIMatch;
                        
                        return (
                          <div 
                            key={player.id}
                            className={`
                              flex items-center p-3 rounded-lg
                              ${isWinner ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border'}
                            `}
                          >
                            <Avatar className="h-10 w-10 mr-3">
                              {isAI ? (
                                <Bot className="h-6 w-6 text-primary" />
                              ) : (
                                <>
                                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.userId}`} />
                                  <AvatarFallback>
                                    {isCurrentUser ? "You" : `P${player.userId}`}
                                  </AvatarFallback>
                                </>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {isCurrentUser ? "You" : (isAI ? "AI Player" : `Player ${player.userId}`)}
                                {isWinner && <Trophy className="h-4 w-4 text-amber-500" />}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {player.status === "joined" && (
                                  <>
                                    {gameState === "waiting" && "Ready to play"}
                                    {gameState === "playing" && "Playing"}
                                  </>
                                )}
                                {player.status === "won" && "Winner"}
                                {player.status === "lost" && "Lost"}
                              </div>
                            </div>
                            <div className="ml-auto">
                              {gameState === "finished" && (
                                <Badge variant={isWinner ? "default" : "outline"}>
                                  {isWinner ? "Winner" : "Lost"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
          
          {/* Game Info */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
                <CardDescription>Match details and prize pool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium flex items-center gap-1">
                      {match.status === "waiting" && "Waiting for players"}
                      {match.status === "in_progress" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                          In Progress
                        </span>
                      )}
                      {match.status === "completed" && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Completed
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Entry Amount</span>
                    <span className="font-medium">₹{parseFloat(match.entryAmount.toString()).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-medium">{players?.length || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Prize Pool</span>
                    <span className="font-medium">₹{calculatePrize().total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Commission</span>
                    <span className="font-medium">
                      {game?.commissionPercentage}% (₹{calculatePrize().commission.toFixed(2)})
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Winner Prize</span>
                    <span className="font-bold text-lg text-primary">₹{calculatePrize().prize.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Game controls */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleGoBack}
              >
                Back to Games
              </Button>
              
              {gameState === "finished" && (
                <Button
                  variant="default"
                  className="w-full bg-primary-gradient"
                  onClick={() => {
                    navigate("/games");
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}