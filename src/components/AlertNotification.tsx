import React, { useState, useEffect } from 'react';
import { AlertService, type AlertData } from '@/services/alertsService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface AlertNotificationProps {
  className?: string;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({ className }) => {
  const [alerts, setAlerts] = useState<(AlertData & { id: string })[]>([]);

  useEffect(() => {
    const alertService = AlertService.getInstance();
    
    const handleAlert = (alert: AlertData) => {
      const alertWithId = { ...alert, id: Date.now().toString() };
      setAlerts(prev => [...prev, alertWithId]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alertWithId.id));
      }, 5000);
    };

    alertService.addAlertListener(handleAlert);
    
    return () => {
      alertService.removeAlertListener(handleAlert);
    };
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitch':
        return 'bg-purple-500';
      case 'youtube':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'sub':
        return '⭐';
      case 'gift':
        return '🎁';
      case 'redemption':
        return '💎';
      case 'live':
        return '🔴';
      default:
        return '🔔';
    }
  };

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'sub':
        return 'bg-green-100 text-green-800';
      case 'gift':
        return 'bg-purple-100 text-purple-800';
      case 'redemption':
        return 'bg-blue-100 text-blue-800';
      case 'live':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 ${className}`}>
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className="w-80 p-4 shadow-lg border-l-4 animate-in slide-in-from-right"
          style={{ borderLeftColor: getPlatformColor(alert.platform).replace('bg-', '#').replace('500', '500') }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-2xl">
                {getAlertIcon(alert.alert_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={getPlatformColor(alert.platform)}>
                    {alert.platform.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={getAlertTypeColor(alert.alert_type)}>
                    {alert.alert_type.toUpperCase()}
                  </Badge>
                </div>
                <p className="font-medium text-sm">
                  {alert.user_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {alert.message}
                </p>
                {alert.amount && (
                  <p className="text-sm font-semibold text-green-600 mt-1">
                    {alert.amount} {alert.currency}
                  </p>
                )}
                {alert.count && (
                  <p className="text-sm font-semibold text-purple-600 mt-1">
                    {alert.count} items
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AlertNotification;