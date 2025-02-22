
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Settings = () => {
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Theme</span>
                <span className="font-medium">{settings.theme}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Show Realtime Transcript</span>
                <span className="font-medium">{settings.show_realtime_transcript ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Color Scheme</span>
                <span className="font-medium">{settings.color_scheme}</span>
              </div>
            </div>
          ) : (
            <p>No settings found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
