import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";

interface HeaderProps {
  user: UserType;
  isConnected: boolean;
}

export default function Header({ user, isConnected }: HeaderProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-white">Gemini CLI Desktop</h1>
        <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-2 hover:bg-gray-700">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar || undefined} alt={user.username} />
                  <AvatarFallback>
                    {user.username.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium">{user.username}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700">
            <DropdownMenuItem className="text-white hover:bg-gray-700">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-gray-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-400 hover:bg-gray-700 hover:text-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}