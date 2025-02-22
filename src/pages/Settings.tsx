
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const colorSchemes = [
  { name: 'Default', value: 'default', description: 'Classic interface theme' },
  { name: 'Ocean Blue', value: 'ocean', description: 'Calming blue tones' },
  { name: 'Forest Green', value: 'forest', description: 'Natural green palette' },
  { name: 'Royal Purple', value: 'royal', description: 'Rich purple theme' },
  { name: 'Sunset Orange', value: 'sunset', description: 'Warm orange tones' }
];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { color_scheme: 'default', show_realtime_transcript: true };
    },
    enabled: !!user,
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: async (newSettings: {
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
            <Label htmlFor="colorScheme">Color Scheme</Label>
            <Select
              value={settings?.color_scheme || 'default'}
              onValueChange={handleColorSchemeChange}
            >
              <SelectTrigger id="colorScheme" className="w-full bg-background">
                <SelectValue placeholder="Select color scheme" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-input shadow-md">
                {colorSchemes.map(scheme => (
                  <SelectItem 
                    key={scheme.value} 
                    value={scheme.value}
                    className="hover:bg-accent hover:text-accent-foreground"
                  >
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
