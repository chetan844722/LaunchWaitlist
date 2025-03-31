import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Send, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  id: string;
  sender: string;
  content: string;
  senderName: string;
  timestamp: Date;
  roomId: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'global' | 'game' | 'private';
  participants?: string[];
}

export function ChatSystem({ gameId, matchId }: { gameId?: number; matchId?: number }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string>('global');
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to the socket server
  useEffect(() => {
    const newSocket = io('', {
      path: '/api/socket',
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Initialize rooms and listen for messages
  useEffect(() => {
    if (!socket || !user) return;

    // Initialize with global chat
    const initialRooms: ChatRoom[] = [
      { id: 'global', name: 'Global Chat', type: 'global' }
    ];
    
    // Add game room if in a game
    if (gameId && matchId) {
      initialRooms.push({ 
        id: `game-${matchId}`, 
        name: 'Game Chat', 
        type: 'game'
      });
      // Auto-join game room when in a game
      setCurrentRoom(`game-${matchId}`);
    }
    
    setChatRooms(initialRooms);

    // Join user to the appropriate rooms
    socket.emit('joinRoom', { 
      userId: user.id, 
      username: user.username, 
      roomId: gameId && matchId ? `game-${matchId}` : 'global' 
    });

    // Listen for messages
    socket.on('message', (newMessage: Message) => {
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => scrollToBottom(), 100);
    });

    // Listen for online users count
    socket.on('userCount', (count: number) => {
      setOnlineUsers(count);
    });

    // Listen for private chat invitations
    socket.on('privateRoomCreated', (room: ChatRoom) => {
      setChatRooms(prev => [...prev, room]);
    });

    // Message history
    socket.on('messageHistory', (history: Message[]) => {
      setMessages(history);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => {
      socket.off('message');
      socket.off('userCount');
      socket.off('privateRoomCreated');
      socket.off('messageHistory');
    };
  }, [socket, user, gameId, matchId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!socket || !message.trim() || !user) return;

    const newMessage = {
      content: message,
      sender: user.id.toString(),
      senderName: user.username,
      roomId: currentRoom
    };

    socket.emit('sendMessage', newMessage);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const switchRoom = (roomId: string) => {
    if (!socket || !user) return;
    
    // Leave current room
    socket.emit('leaveRoom', { userId: user.id, roomId: currentRoom });
    
    // Join new room
    socket.emit('joinRoom', { userId: user.id, username: user.username, roomId });
    
    setCurrentRoom(roomId);
    // Request message history for the new room
    socket.emit('getMessageHistory', roomId);
  };

  const startPrivateChat = (otherUserId: string, otherUsername: string) => {
    if (!socket || !user) return;
    
    // Create a unique room ID for private chat
    const roomId = [user.id, otherUserId].sort().join('-');
    
    socket.emit('createPrivateRoom', { 
      userId: user.id, 
      username: user.username,
      otherUserId,
      otherUsername,
      roomId
    });
    
    // Add room locally if it doesn't exist
    if (!chatRooms.some(room => room.id === roomId)) {
      setChatRooms(prev => [
        ...prev, 
        { 
          id: roomId, 
          name: `Chat with ${otherUsername}`, 
          type: 'private',
          participants: [user.id.toString(), otherUserId]
        }
      ]);
    }
    
    // Switch to the private room
    switchRoom(roomId);
  };

  const filteredMessages = messages.filter(msg => msg.roomId === currentRoom);
  const currentRoomData = chatRooms.find(room => room.id === currentRoom);

  return (
    <Card className="w-full h-[500px] flex flex-col">
      <CardHeader className="p-3 pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">
            {currentRoomData?.name || 'Chat'}
          </CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span>{onlineUsers} online</span>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue={currentRoom} onValueChange={switchRoom} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mb-1">
          {chatRooms.map(room => (
            <TabsTrigger 
              key={room.id} 
              value={room.id}
              className="text-xs py-1 px-2"
            >
              {room.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {chatRooms.map(room => (
          <TabsContent 
            key={room.id} 
            value={room.id} 
            className="flex-1 flex flex-col m-0 data-[state=active]:flex data-[state=inactive]:hidden"
          >
            <CardContent className="flex-1 p-3 overflow-hidden">
              <ScrollArea className="h-[350px] pr-3">
                {filteredMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex ${msg.sender === (user?.id.toString() || '') ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[80%] ${msg.sender === (user?.id.toString() || '') ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className={`rounded-lg py-2 px-3 ${
                              msg.sender === (user?.id.toString() || '') 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              {msg.content}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <span>{msg.senderName}</span>
                              <span>•</span>
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="p-3 pt-0">
              <div className="flex w-full gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button onClick={sendMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}