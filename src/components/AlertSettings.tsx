import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertService, type AlertSettings } from '@/services/alertsService';

interface AlertSettingsProps {
  className?: string;
}

const AlertSettings: React.FC<AlertSettingsProps> = ({ className }) => {
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    twitchSubs: true,
    twitchGifts: true,
    twitchRedemptions: true,
    youtubeLive: true,
    volume: 0.8,
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const alertService = AlertService.getInstance();
    setSettings(alertService.getSettings());
  }, []);

  const handleSettingChange = (key: keyof AlertSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setIsSaved(false);
  };

  const saveSettings = () => {
    const alertService = AlertService.getInstance();
    alertService.updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      enabled: true,
      twitchSubs: true,
      twitchGifts: true,
      twitchRedemptions: true,
      youtubeLive: true,
      volume: 0.8,
    };
    setSettings(defaultSettings);
    setIsSaved(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Integration Alerts</span>
          <Badge variant={settings.enabled ? "default" : "secondary"}>
            {settings.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure alerts for Twitch subscriptions, donations, and YouTube events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="alerts-enabled">Enable Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Turn all integration alerts on or off
              </p>
            </div>
            <Switch
              id="alerts-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>

          {settings.enabled && (
            <>
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Twitch Alerts</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="twitch-subs">New Subscriptions</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when someone subscribes to the channel
                    </p>
                  </div>
                  <Switch
                    id="twitch-subs"
                    checked={settings.twitchSubs}
                    onCheckedChange={(checked) => handleSettingChange('twitchSubs', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="twitch-gifts">Gifted Subscriptions</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when someone gifts subscriptions
                    </p>
                  </div>
                  <Switch
                    id="twitch-gifts"
                    checked={settings.twitchGifts}
                    onCheckedChange={(checked) => handleSettingChange('twitchGifts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="twitch-redemptions">Channel Point Redemptions</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when viewers redeem channel points
                    </p>
                  </div>
                  <Switch
                    id="twitch-redemptions"
                    checked={settings.twitchRedemptions}
                    onCheckedChange={(checked) => handleSettingChange('twitchRedemptions', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">YouTube Alerts</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="youtube-live">Live Stream Started</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when a new video or stream goes live
                    </p>
                  </div>
                  <Switch
                    id="youtube-live"
                    checked={settings.youtubeLive}
                    onCheckedChange={(checked) => handleSettingChange('youtubeLive', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Alert Settings</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="alert-volume">
                    Alert Volume: {Math.round(settings.volume * 100)}%
                  </Label>
                  <Slider
                    id="alert-volume"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[settings.volume]}
                    onValueChange={([value]) => handleSettingChange('volume', value)}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={isSaved}
          >
            {isSaved ? "Saved!" : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertSettings;