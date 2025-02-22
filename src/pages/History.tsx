
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (isLoading) {
    return <div className="p-8">Loading session history...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Session History</h1>
      
      <div className="space-y-6">
        {sessions?.length === 0 ? (
          <p className="text-center text-muted-foreground">No sessions found</p>
        ) : (
          sessions?.map((session) => (
            <div
              key={session.id}
              className="bg-card p-6 rounded-lg shadow-sm border"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Started: {format(new Date(session.started_at), 'PPp')}
                  </p>
                  {session.ended_at && (
                    <p className="text-sm text-muted-foreground">
                      Ended: {format(new Date(session.ended_at), 'PPp')}
                    </p>
                  )}
                </div>
              </div>
              
              {session.transcript && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Transcript</h3>
                  <p className="text-sm whitespace-pre-line">{session.transcript}</p>
                </div>
              )}

              {session.ai_responses && session.ai_responses.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">AI Responses</h3>
                  <div className="space-y-2">
                    {session.ai_responses.map((response, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        {response}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
