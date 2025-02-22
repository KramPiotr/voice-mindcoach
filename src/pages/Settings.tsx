
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from 'next-themes';

const colorSchemes = [
  { name: 'Default', value: 'default' },
  { name: 'Ocean Blue', value: 'ocean' },
  { name: 'Forest Green', value: 'forest' },
  { name: 'Royal Purple', value: 'royal' },
  { name: 'Sunset Orange', value: 'sunset' }
];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { theme: 'light', color_scheme: 'default', show_realtime_transcript: true };
    },
    enabled: !!user,
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: async (newSettings: {
      theme?: string;
      color_scheme?: string;
      show_realtime_transcript?: boolean;
    }) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          ...settings,
          ...newSettings,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: "There was a problem saving your preferences. Please try again.",
        variant: "destructive"
      });
      console.error('Error updating settings:', error);
    },
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  const handleColorSchemeChange = (newScheme: string) => {
    updateSettings({ color_scheme: newScheme });
  };

  const handleTranscriptToggle = (checked: boolean) => {
    updateSettings({ show_realtime_transcript: checked });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings?.theme || theme}
              onValueChange={handleThemeChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="colorScheme">Color Scheme</Label>
            <Select
              value={settings?.color_scheme || 'default'}
              onValueChange={handleColorSchemeChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select color scheme" />
              </SelectTrigger>
              <SelectContent>
                {colorSchemes.map(scheme => (
                  <SelectItem key={scheme.value} value={scheme.value}>
                    {scheme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="transcript">Show Realtime Transcript</Label>
            <Switch
              id="transcript"
              checked={settings?.show_realtime_transcript}
              onCheckedChange={handleTranscriptToggle}
              disabled={isPending}
            />
          </div>

          {isPending && (
            <div className="text-sm text-muted-foreground">
              Saving changes...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
