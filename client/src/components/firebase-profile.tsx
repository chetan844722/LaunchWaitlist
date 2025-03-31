import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useAuth } from "@/hooks/use-auth";
import { getUserDocument, createUserDocument, updateUserDocument } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Check, Shield, LogOut } from "lucide-react";

export function FirebaseProfileManagement() {
  const { currentUser, sendVerificationEmail, resetPassword, logOut } = useFirebaseAuth();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isProfileSynced, setIsProfileSynced] = useState(false);
  const [isProfileSyncing, setIsProfileSyncing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Load profile data from Firebase
  useEffect(() => {
    const loadProfileData = async () => {
      if (user && currentUser) {
        setIsEmailVerified(currentUser.emailVerified);
        
        // Fetch profile from Firestore
        const firebaseProfile = await getUserDocument(user.id);
        
        if (firebaseProfile) {
          setProfileData(firebaseProfile);
          setIsProfileSynced(true);
          setNotificationsEnabled(firebaseProfile.notificationsEnabled || false);
        } else {
          setProfileData(null);
          setIsProfileSynced(false);
        }
        
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [user, currentUser]);

  // Send verification email
  const handleSendVerificationEmail = async () => {
    try {
      await sendVerificationEmail();
      setEmailVerificationSent(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!user) return;
    
    try {
      await resetPassword(user.email);
      setIsResetPasswordDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Sync profile with Firebase
  const handleSyncProfile = async () => {
    if (!user) return;
    
    setIsProfileSyncing(true);
    
    try {
      const profileData = {
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        upiId: user.upiId,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        dateOfBirth: user.dateOfBirth,
        socialLinks: user.socialLinks || [],
        theme: user.theme || "system",
        notificationsEnabled: user.notificationsEnabled !== undefined ? user.notificationsEnabled : true,
        privacySettings: user.privacySettings || "public",
        preferredGames: user.preferredGames || [],
        createdAt: new Date(),
      };
      
      const success = await createUserDocument(user.id, profileData);
      
      if (success) {
        setIsProfileSynced(true);
        setProfileData(profileData);
        setNotificationsEnabled(true);
        
        toast({
          title: "Profile Synced",
          description: "Your profile has been synced with Firebase successfully.",
        });
      } else {
        throw new Error("Failed to sync profile");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync profile with Firebase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProfileSyncing(false);
    }
  };

  // Toggle notifications
  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    
    try {
      const success = await updateUserDocument(user.id, {
        notificationsEnabled: enabled,
      });
      
      if (success) {
        setNotificationsEnabled(enabled);
        
        toast({
          title: enabled ? "Notifications Enabled" : "Notifications Disabled",
          description: enabled 
            ? "You will now receive notifications for game invites and updates." 
            : "You will no longer receive notifications.",
        });
      } else {
        throw new Error("Failed to update notification settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Sign out from Firebase
  const handleFirebaseSignOut = async () => {
    try {
      await logOut();
      toast({
        title: "Signed Out",
        description: "Successfully signed out from Firebase.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firebase Integration</CardTitle>
        <CardDescription>
          Manage your Firebase account and security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Firebase Account Status</Label>
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Account {isProfileSynced ? "Synced" : "Not Synced"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isProfileSynced 
                        ? "Your account is synced with Firebase" 
                        : "Sync your account with Firebase for enhanced features"}
                    </p>
                  </div>
                  {isProfileSynced ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={isProfileSyncing}
                      onClick={handleSyncProfile}
                    >
                      {isProfileSyncing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing
                        </>
                      ) : (
                        "Sync Now"
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {isProfileSynced && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input 
                      value={currentUser?.displayName || user?.username || ""} 
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                      value={currentUser?.email || user?.email || ""} 
                      disabled
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email Verification</Label>
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {isEmailVerified ? "Email Verified" : "Email Not Verified"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isEmailVerified 
                        ? "Your email has been verified" 
                        : "Verify your email for added security"}
                    </p>
                  </div>
                  {isEmailVerified ? (
                    <Shield className="h-5 w-5 text-green-500" />
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={emailVerificationSent}
                      onClick={handleSendVerificationEmail}
                    >
                      {emailVerificationSent ? "Email Sent" : "Verify Email"}
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Password Management</Label>
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Reset Password
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send a password reset email to change your password
                    </p>
                  </div>
                  <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Reset
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby="reset-password-dialog">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription id="reset-password-dialog">
                          A password reset link will be sent to your email address.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          Click the button below to send a password reset email to:
                          <br />
                          <span className="font-medium text-foreground">{user?.email}</span>
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleResetPassword}>
                          Send Reset Email
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Account Sign Out</Label>
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Sign Out from Firebase
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sign out from the Firebase authentication service
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleFirebaseSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Push Notifications</Label>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                    disabled={!isProfileSynced}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for game invites, match results, and wallet transactions
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-updates">Email Updates</Label>
                  <Switch
                    id="email-updates"
                    checked={isProfileSynced && profileData?.emailUpdates}
                    onCheckedChange={(checked) => {
                      if (user) {
                        updateUserDocument(user.id, { emailUpdates: checked });
                        setProfileData({...profileData, emailUpdates: checked});
                      }
                    }}
                    disabled={!isProfileSynced}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about new games, tournaments and platform news
                </p>
              </div>
              
              {!isProfileSynced && (
                <div className="rounded-md bg-muted p-4">
                  <div className="flex">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">Sync Required</h3>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>
                          You need to sync your account with Firebase to manage notification settings.
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleSyncProfile}
                          disabled={isProfileSyncing}
                        >
                          {isProfileSyncing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Syncing
                            </>
                          ) : (
                            "Sync Profile"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}