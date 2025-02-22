
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<typeof settings>) => {
      const { error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', user?.id] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update settings');
      console.error('Error updating settings:', error);
    },
  });

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="theme">Dark Mode</Label>
            <p className="text-sm text-muted-foreground">
              Switch between light and dark mode
            </p>
          </div>
          <Switch
            id="theme"
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="colorScheme">Color Scheme</Label>
          <Select
            value={settings?.color_scheme}
            onValueChange={(value) => 
              updateSettings.mutate({ color_scheme: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select color scheme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="nature">Nature</SelectItem>
              <SelectItem value="ocean">Ocean</SelectItem>
              <SelectItem value="sunset">Sunset</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="realtime-transcript">Real-time Transcript</Label>
            <p className="text-sm text-muted-foreground">
              Show conversation transcript in real-time
            </p>
          </div>
          <Switch
            id="realtime-transcript"
            checked={settings?.show_realtime_transcript}
            onCheckedChange={(checked) => 
              updateSettings.mutate({ show_realtime_transcript: checked })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
