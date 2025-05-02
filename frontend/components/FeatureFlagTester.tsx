'use client';

import React, { useState, useEffect } from 'react';
import { FeatureFlagService } from '@/utils/api/feature-flag-service';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Switch } from './ui/switch';

interface FeatureFlagTesterProps {
  flagKey: string;
  defaultValue?: boolean;
}

export default function FeatureFlagTester({ flagKey, defaultValue = false }: FeatureFlagTesterProps) {
  const [flagValue, setFlagValue] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCache, setUseCache] = useState(true);

  const fetchFlag = async () => {
    setLoading(true);
    setError(null);
    try {
      const value = await FeatureFlagService.getFeatureFlagValue(flagKey, defaultValue, !useCache);
      setFlagValue(value);
    } catch (err) {
      setError('Failed to fetch feature flag value');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Feature Flag Tester</CardTitle>
        <CardDescription>
          Testing feature flag: <code>{flagKey}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Current Value:</p>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <p className={`text-lg font-bold ${flagValue ? 'text-green-600' : 'text-red-600'}`}>
                {flagValue === null ? 'Unknown' : flagValue ? 'Enabled' : 'Disabled'}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="cache-switch" checked={useCache} onCheckedChange={setUseCache} />
            <label htmlFor="cache-switch">Use Cache</label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={fetchFlag} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Value'}
        </Button>
        
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </CardFooter>
    </Card>
  );
} 