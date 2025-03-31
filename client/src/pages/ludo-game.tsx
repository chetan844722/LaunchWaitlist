import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { GameMatch, PlayerMatch, Game } from "@shared/schema";
import { Loader2, Trophy, Clock, Users, ArrowLeft, MessageCircle } from "lucide-react";
import { ChatSystem } from "@/components/ui/chat-system";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateGameCommission } from "@/lib/utils/commission";

export default function LudoGame() {
  const { id } = useParams();
  const matchId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting");
  const [diceValue, setDiceValue] = useState<number>(1);
  const [playerPositions, setPlayerPositions] = useState<{ [key: number]: number }>({});
  const [winner, setWinner] = useState<number | null>(null);
  const [showWinDialog, setShowWinDialog] = useState(false);
  // No countdown needed as we use explicit Start Game button instead of automatic countdown
  const playerColors = ["#f05252", "#25c26e", "#7b5bf2", "#f7b955"];

  // Fetch match details
  const { data: match, isLoading: isMatchLoading } = useQuery<GameMatch>({
    queryKey: [`/api/matches/${matchId}`],
    refetchInterval: gameState === "waiting" ? 3000 : false,
  });

  // Fetch match players
  const { data: players, isLoading: isPlayersLoading } = useQuery<PlayerMatch[]>({
    queryKey: [`/api/matches/${matchId}/players`],
    refetchInterval: gameState === "waiting" ? 3000 : false,
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

  // Complete match mutation
  const completeMatchMutation = useMutation({
    mutationFn: async (winnerId: number) => {
      return await apiRequest("POST", `/api/matches/${matchId}/complete`, { winnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Match completed",
        description: "The match has been completed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete match",
        variant: "destructive",
      });
    },
  });

  // Check if the current user is in the match
  const isPlayerInMatch = players?.some(player => player.userId === user?.id);

  // Initialize the game
  useEffect(() => {
    if (match?.status === "waiting") {
      setGameState("waiting");
    } else if (match?.status === "in_progress") {
      setGameState("playing");
      // Initialize player positions
      const positions: { [key: number]: number } = {};
      players?.forEach(player => {
        positions[player.userId] = 0;
      });
      setPlayerPositions(positions);
    } else if (match?.status === "completed") {
      setGameState("finished");
      setWinner(match.winnerId || null);
    }
  }, [match, players]);

  // We no longer need the automatic countdown timer since we use a manual start button
  // This keeps the game from auto-starting

  // Roll dice function
  const rollDice = () => {
    if (gameState !== "playing") return;
    
    const newDiceValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(newDiceValue);
    
    // Move the player
    if (user?.id) {
      const currentPosition = playerPositions[user.id] || 0;
      let newPosition = currentPosition + newDiceValue;
      
      // Handle winning condition
      if (newPosition >= 100) {
        newPosition = 100;
        setWinner(user.id);
        setGameState("finished");
        completeMatchMutation.mutate(user.id);
        setShowWinDialog(true);
      }
      
      setPlayerPositions({
        ...playerPositions,
        [user.id]: newPosition
      });
    }
  };

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
    if (!match || !game || !players) return { prize: 0, commission: 0 };
    
    const entryAmount = parseFloat(match.entryAmount.toString());
    const totalPrize = entryAmount * players.length;
    const commissionPercentage = parseFloat(game.commissionPercentage.toString());
    const commission = calculateGameCommission(totalPrize, commissionPercentage);
    const prize = totalPrize - commission;
    
    return { prize, commission };
  };

  // Get player name function
  const getPlayerName = (userId: number) => {
    if (userId === user?.id) return "You";
    return `Player ${players?.findIndex(p => p.userId === userId) ?? 0 + 1}`;
  };

  // Get player color
  const getPlayerColor = (index: number) => {
    return playerColors[index % playerColors.length];
  };

  // Render ludo board
  const renderLudoBoard = () => {
    return (
      <div className="w-full max-w-lg mx-auto aspect-square relative bg-gray-800 rounded-xl overflow-hidden">
        {/* Board grid */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
          {Array(100).fill(0).map((_, index) => {
            const isHome = index === 99;
            const isStart = index === 0;
            return (
              <div 
                key={index} 
                className={`border border-gray-700 flex items-center justify-center
                  ${isHome ? 'bg-primary/20' : ''}
                  ${isStart ? 'bg-secondary/20' : ''}
                  ${index % 2 ? 'bg-gray-800' : 'bg-gray-700'}
                `}
              >
                {isHome && <Trophy className="h-6 w-6 text-primary" />}
                {isStart && <div className="text-xs text-white font-bold">START</div>}
                {!isHome && !isStart && (100 - index)}
              </div>
            );
          })}
        </div>
        
        {/* Player tokens */}
        {players?.map((player, index) => {
          const position = playerPositions[player.userId] || 0;
          if (position === 0) return null;
          
          // Calculate grid position (0-99)
          const gridPosition = 99 - position;
          const row = Math.floor(gridPosition / 10);
          const col = row % 2 === 0 ? gridPosition % 10 : 9 - (gridPosition % 10);
          
          const color = getPlayerColor(index);
          
          return (
            <div 
              key={player.userId}
              className="absolute w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{
                backgroundColor: color,
                top: `${(Math.floor(gridPosition / 10) * 10) + 5}%`,
                left: `${(col * 10) + 5}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
    );
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
            <h1 className="text-3xl font-bold text-foreground">Ludo Game</h1>
            <p className="text-muted-foreground">
              Match #{matchId} • Entry: ₹{parseFloat(match.entryAmount.toString()).toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                {gameState === "waiting" ? (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Waiting for Players</h2>
                    <p className="text-muted-foreground mb-6">
                      {isPlayerInMatch 
                        ? "Waiting for more players to join..." 
                        : "Join this match to play Ludo with other players."}
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
                ) : (
                  <>
                    {renderLudoBoard()}
                    
                    {/* Dice and Controls */}
                    {gameState === "playing" && (
                      <div className="mt-6 flex flex-col items-center">
                        <div className="w-16 h-16 bg-card border border-border rounded-xl flex items-center justify-center text-3xl font-bold mb-4">
                          {diceValue}
                        </div>
                        <Button 
                          className="bg-primary hover:bg-primary/90 text-white" 
                          onClick={rollDice}
                        >
                          Roll Dice
                        </Button>
                      </div>
                    )}
                    
                    {/* Game Finished */}
                    {gameState === "finished" && (
                      <div className="mt-6 text-center">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {winner === user?.id ? "You Won!" : "Game Ended"}
                        </h3>
                        <p className="text-muted-foreground">
                          {winner === user?.id 
                            ? `Congratulations! You've won ₹${calculatePrize().prize.toFixed(2)}`
                            : `The winner is ${getPlayerName(winner || 0)}`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Game Info */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
                <CardDescription>Match details and players</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {match.status === "waiting" && "Waiting for players"}
                      {match.status === "in_progress" && "In progress"}
                      {match.status === "completed" && "Completed"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Entry Amount</span>
                    <span className="font-medium">₹{parseFloat(match.entryAmount.toString()).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Prize Pool</span>
                    <span className="font-medium text-primary">
                      ₹{(parseFloat(match.entryAmount.toString()) * (players?.length || 0)).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Winner Gets</span>
                    <span className="font-medium text-green-500">₹{calculatePrize().prize.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Game Commission</span>
                    <span className="font-medium">{game?.commissionPercentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Players ({players?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players && players.length > 0 ? (
                  <div className="space-y-3">
                    {players.map((player, index) => (
                      <div 
                        key={player.userId}
                        className="flex items-center p-3 rounded-lg bg-card/70 border border-border"
                      >
                        <div 
                          className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: getPlayerColor(index) }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {player.userId === user?.id ? "You" : `Player ${index + 1}`}
                            {player.status === "won" && (
                              <span className="ml-2 text-green-500 text-sm">(Winner)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">Status: {player.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No players have joined yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Game Chat */}
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  Game Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChatSystem gameId={match.gameId} matchId={matchId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Win Dialog */}
      <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Congratulations!</DialogTitle>
            <DialogDescription className="text-center">
              You've won the match and earned ₹{calculatePrize().prize.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => navigate("/wallet")}>
              Go to Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MobileNav />
    </div>
  );
}
