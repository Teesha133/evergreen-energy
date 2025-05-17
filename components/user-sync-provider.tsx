'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

export default function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseDetails, setResponseDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Define the sync function as a callback to ensure it doesn't change on re-renders
  const syncUserToDatabase = useCallback(async () => {
    if (!userId) {
      console.error('USER SYNC: Cannot sync without a user ID');
      return { success: false, error: 'No user ID available' };
    }

    try {
      console.log('USER SYNC: Starting direct API sync for user:', userId);
      
      // Get user email and name if available from Clerk
      const email = user?.primaryEmailAddress?.emailAddress || 'pending@example.com';
      const name = user?.fullName || '';
      
      console.log('USER SYNC: User details to sync:', { userId, email, name });
      
      // Call our direct API endpoint
      console.log('USER SYNC: Making fetch request to /api/direct-user-sync');
      const response = await fetch('/api/direct-user-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email, name })
      });
      
      console.log('USER SYNC: Received response with status:', response.status);
      
      // Try to parse response body regardless of status code
      let responseBody;
      try {
        responseBody = await response.json();
        console.log('USER SYNC: Response body:', responseBody);
        return { 
          success: response.ok, 
          data: responseBody,
          error: !response.ok ? (responseBody?.error || 'Unknown error') : null,
          status: response.status
        };
      } catch (parseError) {
        console.error('USER SYNC: Error parsing response body:', parseError);
        return { 
          success: false, 
          error: 'Failed to parse server response',
          status: response.status
        };
      }
    } catch (error) {
      console.error('USER SYNC: Error during sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorObject: error
      };
    }
  }, [userId, user]);

  // Retry mechanism with exponential backoff
  const retryWithBackoff = useCallback(() => {
    const maxRetries = 5;
    if (retryCount >= maxRetries) {
      console.log(`USER SYNC: Reached maximum retry count (${maxRetries}). Giving up.`);
      return;
    }
    
    const delay = Math.min(30000, 1000 * Math.pow(2, retryCount)); // Exponential backoff up to 30 seconds
    console.log(`USER SYNC: Scheduling retry ${retryCount + 1} in ${delay/1000} seconds`);
    
    setTimeout(() => {
      console.log(`USER SYNC: Executing retry ${retryCount + 1}`);
      setSyncStatus('idle'); // This will trigger the useEffect to run again
      setRetryCount(prevCount => prevCount + 1);
    }, delay);
  }, [retryCount]);

  // Manual retry function for the button
  const manualRetry = useCallback(() => {
    console.log('USER SYNC: Manual retry triggered');
    setSyncStatus('idle');
  }, []);

  useEffect(() => {
    const runSync = async () => {
      // Only run when auth is loaded, user is signed in, and we're in idle state
      if (isLoaded && isSignedIn && userId && syncStatus === 'idle') {
        // Start sync
        setSyncStatus('syncing');
        setErrorMessage(null);
        
        console.log('USER SYNC: User info available:', {
          userId,
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName,
        });

        // Call the sync function
        const result = await syncUserToDatabase();
        
        if (result.success) {
          console.log('USER SYNC: User was successfully synced');
          setSyncStatus('success');
          setErrorMessage(null);
          setResponseDetails(JSON.stringify(result.data, null, 2));
        } else {
          console.error('USER SYNC: Failed to sync user:', result.error);
          setSyncStatus('error');
          setErrorMessage(result.error || 'Unknown error');
          setResponseDetails(JSON.stringify(result, null, 2));
          
          // Auto-retry with backoff
          retryWithBackoff();
        }
      }
    };

    runSync();
  }, [isLoaded, isSignedIn, userId, user, syncStatus, syncUserToDatabase, retryWithBackoff]);

  // Development UI for debugging
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        {children}
        {isLoaded && userId && (
          <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: syncStatus === 'success' ? 'rgba(0, 255, 0, 0.2)' : 
                          syncStatus === 'error' ? 'rgba(255, 0, 0, 0.2)' :
                          syncStatus === 'syncing' ? 'rgba(255, 255, 0, 0.2)' :
                          'rgba(200, 200, 200, 0.2)',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '400px',
            maxHeight: '300px',
            overflow: 'auto',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>User Sync Status</div>
            <div>User ID: <code style={{ fontSize: '10px' }}>{userId || 'Not signed in'}</code></div>
            <div>Email: {user?.primaryEmailAddress?.emailAddress || 'N/A'}</div>
            <div>Status: <strong>{syncStatus}</strong> {retryCount > 0 && `(Retry: ${retryCount})`}</div>
            {errorMessage && (
              <div style={{ color: 'red', marginTop: '5px' }}>Error: {errorMessage}</div>
            )}
            {responseDetails && (
              <details style={{ marginTop: '8px', fontSize: '11px' }}>
                <summary>Response Details</summary>
                <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap', maxWidth: '380px', overflow: 'auto' }}>{responseDetails}</pre>
              </details>
            )}
            <button 
              onClick={manualRetry} 
              style={{
                marginTop: '8px',
                padding: '3px 8px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Retry Now
            </button>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
} 