"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Plus, Trash, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FeatureFlag, FeatureFlagService, CreateFeatureFlagDto } from "@/utils/api/feature-flag-service";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminSettings() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreatingFlag, setIsCreatingFlag] = useState(false);
  const [newFlag, setNewFlag] = useState<CreateFeatureFlagDto>({
    key: '',
    name: '',
    description: '',
    enabled: false,
    defaultValue: false
  });
  const [liveFlagChecks, setLiveFlagChecks] = useState<Record<string, { value: boolean, loading: boolean, error: boolean }>>({}); 
  const [bypassCache, setBypassCache] = useState(true);
  const { userData } = useAuth();

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const flags = await FeatureFlagService.getAllFeatureFlags();
      setFeatureFlags(flags);
    } catch (err) {
      console.error('Error fetching feature flags:', err);
      setError('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchFeatureFlags();
    } else {
      setError("You don't have permission to access this page");
      setLoading(false);
    }
  }, [userData]);

  const handleSwitchChange = async (key: string, newValue: boolean) => {
    try {
      setFeatureFlags(flags => 
        flags.map(flag => 
          flag.key === key ? { ...flag, enabled: newValue } : flag
        )
      );

      await FeatureFlagService.updateFeatureFlag(key, { enabled: newValue });
      
      setSuccessMessage(`Successfully updated "${key}" flag`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(`Error updating feature flag ${key}:`, err);
      setError(`Failed to update feature flag: ${key}`);
      
      // Revert the UI change
      setFeatureFlags(flags => 
        flags.map(flag => 
          flag.key === key ? { ...flag, enabled: !newValue } : flag
        )
      );
      
      setTimeout(() => setError(null), 5000);
    }
  };

  const checkLiveFlagValue = async (key: string) => {
    // Start with loading state
    setLiveFlagChecks(prev => ({ 
      ...prev, 
      [key]: { ...prev[key], loading: true, error: false } 
    }));
    
    try {
      const value = await FeatureFlagService.getFeatureFlagValue(key, false, bypassCache);
      setLiveFlagChecks(prev => ({ 
        ...prev, 
        [key]: { value, loading: false, error: false } 
      }));
    } catch (err) {
      console.error(`Error checking live value for ${key}:`, err);
      setLiveFlagChecks(prev => ({ 
        ...prev, 
        [key]: { value: false, loading: false, error: true } 
      }));
    }
  };

  const handleCreateFlag = async () => {
    try {
      // Validate inputs
      if (!newFlag.key || !newFlag.name) {
        setError('Key and name are required');
        return;
      }

      // Format key to be lowercase and use underscores
      const formattedKey = newFlag.key.toLowerCase().replace(/\s+/g, '_');
      const flagToCreate = { ...newFlag, key: formattedKey };
      
      // Create the flag
      const createdFlag = await FeatureFlagService.createFeatureFlag(flagToCreate);
      
      // Update the state
      setFeatureFlags(prev => [...prev, createdFlag]);
      
      // Reset the form
      setNewFlag({
        key: '',
        name: '',
        description: '',
        enabled: false,
        defaultValue: false
      });
      
      // Close the dialog
      setIsCreatingFlag(false);
      
      // Show success message
      setSuccessMessage(`Successfully created "${createdFlag.name}" flag`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error creating feature flag:', err);
      setError('Failed to create feature flag. It might already exist.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteFlag = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the "${key}" feature flag? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await FeatureFlagService.deleteFeatureFlag(key);
      
      // Update the state
      setFeatureFlags(prev => prev.filter(flag => flag.key !== key));
      
      // Show success message
      setSuccessMessage(`Successfully deleted "${key}" flag`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(`Error deleting feature flag ${key}:`, err);
      setError(`Failed to delete feature flag: ${key}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  if (error && !featureFlags.length) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Admin Settings</h1>
        
        <Dialog open={isCreatingFlag} onOpenChange={setIsCreatingFlag}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Feature Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feature Flag</DialogTitle>
              <DialogDescription>
                Create a new feature flag to toggle functionality in the application.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="key" className="text-right">
                  Key
                </Label>
                <Input
                  id="key"
                  placeholder="disable_auto_redirect"
                  className="col-span-3"
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Disable Auto Redirect"
                  className="col-span-3"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Controls whether users are automatically redirected to new sessions"
                  className="col-span-3"
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="enabled" className="text-right">
                  Enabled
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="enabled"
                    checked={newFlag.enabled}
                    onCheckedChange={(checked) => setNewFlag({ ...newFlag, enabled: checked })}
                  />
                  <span>{newFlag.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="defaultValue" className="text-right">
                  Default Value
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="defaultValue"
                    checked={newFlag.defaultValue}
                    onCheckedChange={(checked) => setNewFlag({ ...newFlag, defaultValue: checked })}
                  />
                  <span>{newFlag.defaultValue ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingFlag(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFlag}>
                Create Feature Flag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="feature-flags">
        <TabsList>
          <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="feature-flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Toggle features on and off without deploying new code.
              </CardDescription>
              <div className="flex flex-col space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch id="bypass-cache" checked={bypassCache} onCheckedChange={setBypassCache} />
                  <Label htmlFor="bypass-cache">Bypass cache when testing values</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          The frontend caches feature flag values for 60 seconds. 
                          Enable this to always get fresh values directly from the server when checking.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>About Live Values:</strong> &quot;Check Live Value&quot; shows exactly what users will see when they request this flag from the server. This helps you confirm your changes are working correctly.</p>
                  <p><strong>About Stored Values:</strong> &quot;Stored value&quot; is the value set in the database as displayed in the admin panel. After toggling a flag, the stored value changes immediately, but users may see the old value until their cache expires.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {featureFlags && featureFlags.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No feature flags found. Create your first one with the &quot;Add Feature Flag&quot; button.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureFlags && featureFlags.map((flag) => (
                    <div key={flag.key} className="flex flex-col space-y-2 p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{flag.name}</h3>
                          <p className="text-sm text-gray-500">Key: {flag.key}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={flag.enabled} 
                            onCheckedChange={(checked) => handleSwitchChange(flag.key, checked)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteFlag(flag.key)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{flag.description}</p>
                      
                      {/* Live Check Status */}
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="text-sm flex items-center space-x-2">
                          <span>Stored value:</span>
                          <Badge variant={flag.enabled ? "success" : "secondary"}>
                            {flag.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        {liveFlagChecks[flag.key] && (
                          <div className="text-sm flex items-center space-x-2 ml-4">
                            <span>Live check:</span>
                            {liveFlagChecks[flag.key].loading ? (
                              <Badge variant="outline" className="animate-pulse">Checking...</Badge>
                            ) : liveFlagChecks[flag.key].error ? (
                              <Badge variant="destructive">Error</Badge>
                            ) : (
                              <Badge variant={liveFlagChecks[flag.key].value ? "success" : "secondary"}>
                                {liveFlagChecks[flag.key].value ? 'Enabled' : 'Disabled'}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2 ml-2"
                          onClick={() => checkLiveFlagValue(flag.key)}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${liveFlagChecks[flag.key]?.loading ? 'animate-spin' : ''}`} />
                          Check Live Value
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Default: {flag.defaultValue ? 'Enabled' : 'Disabled'} | 
                        Created: {flag.createdAt ? new Date(flag.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                System-wide configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-gray-500">
                General settings will be implemented in future updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 