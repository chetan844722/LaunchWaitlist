import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GameCard } from "@/components/ui/game-card";
import { useQuery } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { Loader2, Search, Bot, Users } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function GamesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });
  
  // Filter games based on search query
  const filteredGames = games?.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Games</h1>
          <p className="text-muted-foreground">
            Choose from a variety of games to play with real money. Win big and withdraw instantly!
          </p>
        </div>
        
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredGames && filteredGames.length > 0 ? (
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Games
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Play vs AI
                <Badge variant="secondary" className="ml-1 bg-primary/20">Instant Play</Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game, index) => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    featured={index === 0 && searchQuery === ""}
                    aiMode={false}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="mt-0">
              <div className="bg-primary/5 rounded-lg p-4 mb-6 border border-primary/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                  <Bot className="h-5 w-5 text-primary" />
                  AI Opponent Mode
                </h3>
                <p className="text-muted-foreground">
                  Play instantly against our AI opponents! No waiting for other players - create a game and an AI player 
                  will automatically join your match. Games start automatically and you'll receive your winnings right away!
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => (
                  <GameCard 
                    key={`ai-${game.id}`} 
                    game={game} 
                    aiMode={true}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">No games found</h3>
            <p className="text-muted-foreground">Try a different search term or check back later for new games.</p>
          </div>
        )}
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
