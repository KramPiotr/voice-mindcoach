import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Feedback = () => {
  const { user } = useAuth();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading feedback..." />;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback && feedback.length > 0 ? (
            <ul>
              {feedback.map((item) => (
                <li key={item.id} className="mb-4 p-4 border rounded-md">
                  <p>Rating: {item.rating}</p>
                  <p>Comment: {item.comment}</p>
                  <p className="text-sm text-gray-500">
                    Submitted at:{' '}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No feedback available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Feedback;
