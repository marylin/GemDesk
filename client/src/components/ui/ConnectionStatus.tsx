import React from 'react';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react';
import { ConnectionStatus } from '@/lib/socketManager';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

export function ConnectionStatusIndicator({ status, onReconnect }: ConnectionStatusProps) {
  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          className: 'text-green-400',
          showReconnect: false
        };
      case 'connecting':
        return {
          icon: <RotateCcw className="w-4 h-4 animate-spin" />,
          text: 'Connecting...',
          className: 'text-yellow-400',
          showReconnect: false
        };
      case 'reconnecting':
        return {
          icon: <RotateCcw className="w-4 h-4 animate-spin" />,
          text: 'Reconnecting...',
          className: 'text-yellow-400',
          showReconnect: true
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Connection Error',
          className: 'text-red-400',
          showReconnect: true
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected',
          className: 'text-gray-400',
          showReconnect: true
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg">
      <div className={`flex items-center gap-2 ${config.className}`}>
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
      
      {config.showReconnect && onReconnect && (
        <Button
          onClick={onReconnect}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

export default ConnectionStatusIndicator;