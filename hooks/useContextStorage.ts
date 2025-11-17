/**
 * Hook for managing business context variables with Supabase sync
 * Falls back to localStorage if Supabase unavailable
 * Migrates existing localStorage data to Supabase automatically
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'bulk-gpt-business-context';
const MIGRATION_FLAG_KEY = 'bulk-gpt-business-context-migrated';

export interface ContextVariables {
  tone?: string;
  targetCountries?: string;
  productDescription?: string;
  competitors?: string;
  targetIndustries?: string;
  complianceFlags?: string;
}

export interface BusinessContext {
  icp?: string;
  countries?: string[];
  products?: string[];
  valueProposition?: string;
  marketingGoals?: string[];
  targetKeywords?: string[];
  competitorKeywords?: string[];
}

export interface GTMProfile {
  gtmPlaybook?: string;
  productType?: string;
}

export interface UseContextStorageReturn {
  context: ContextVariables;
  businessContext: BusinessContext;
  gtmProfile: GTMProfile;
  updateContext: (updates: Partial<ContextVariables>) => void;
  updateBusinessContext: (updates: Partial<BusinessContext>) => void;
  updateGTMProfile: (updates: Partial<GTMProfile>) => void;
  clearContext: () => void;
  hasContext: boolean;
  isLoading: boolean;
  isSyncing: boolean;
}

const DEFAULT_CONTEXT: ContextVariables = {};
const DEFAULT_BUSINESS_CONTEXT: BusinessContext = {};

/**
 * Manages company business context variables with Supabase sync
 * Falls back to localStorage for offline support
 * 
 * @returns Business context management functions
 */
export function useContextStorage(): UseContextStorageReturn {
  const [context, setContext] = useState<ContextVariables>(DEFAULT_CONTEXT);
  const [businessContext, setBusinessContext] = useState<BusinessContext>(DEFAULT_BUSINESS_CONTEXT);
  const [gtmProfile, setGtmProfile] = useState<GTMProfile>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Supabase on mount, fallback to localStorage
  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    setIsLoading(true);
    try {
      // Try Supabase first
      const response = await fetch('/api/business-context/business-context');
      if (response.ok) {
        const { contextVariables, businessContext: loadedBusinessContext, gtmProfile: loadedGtmProfile } = await response.json();
        const loadedContext = contextVariables || {};
        const loadedBusiness = loadedBusinessContext || {};
        const loadedGTM = loadedGtmProfile || {};
        
        setContext(loadedContext);
        setBusinessContext(loadedBusiness);
        setGtmProfile(loadedGTM);
        
        // Cache in localStorage (context variables only, business context and GTM stay in Supabase)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedContext));
            localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          } catch (e) {
            console.debug('Failed to cache in localStorage:', e);
          }
        }
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.debug('Failed to load from Supabase, using localStorage:', error);
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ContextVariables;
          if (parsed && typeof parsed === 'object') {
            setContext(parsed);
            
            // Try to migrate to Supabase in background (non-blocking)
            migrateToSupabase(parsed).catch(err => {
              console.debug('Background migration failed:', err);
            });
          }
        }
      } catch (error) {
        console.debug('Failed to load from localStorage:', error);
      }
    }
    setIsLoading(false);
  };

  const migrateToSupabase = async (localData: ContextVariables) => {
    // Only migrate if not already migrated
    if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
      return;
    }

    // Only migrate if there's actual data
    const hasData = Object.keys(localData).some(
      (key) => localData[key as keyof ContextVariables] !== undefined && 
               localData[key as keyof ContextVariables] !== ''
    );

    if (!hasData) {
      return;
    }

    try {
      const response = await fetch('/api/business-context/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localData)
      });

      if (response.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        }
      }
    } catch (error) {
      console.debug('Failed to migrate to Supabase:', error);
    }
  };

  const updateContext = useCallback(async (updates: Partial<ContextVariables>) => {
    setIsSyncing(true);
    
    const updated = {
      ...context,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof ContextVariables] === undefined) {
        delete updated[key as keyof ContextVariables];
      }
    });

    setContext(updated);

    // Update Supabase (includes business context and GTM profile in same request)
    try {
      const response = await fetch('/api/business-context/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updated,
          ...businessContext,
          ...gtmProfile
        })
      });

      if (response.ok) {
        const { contextVariables: syncedContext, businessContext: syncedBusiness, gtmProfile: syncedGTM } = await response.json();
        if (syncedContext) setContext(syncedContext);
        if (syncedBusiness) setBusinessContext(syncedBusiness);
        if (syncedGTM) setGtmProfile(syncedGTM);
        
        // Cache in localStorage (context variables only)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedContext || updated));
          } catch (e) {
            console.debug('Failed to cache in localStorage:', e);
          }
        }
      } else {
        throw new Error('Failed to sync with Supabase');
      }
    } catch (error) {
      // Fallback: save to localStorage only
      console.debug('Failed to sync with Supabase, saving to localStorage:', error);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.debug('Failed to save to localStorage:', e);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [context, businessContext, gtmProfile]);

  const updateBusinessContext = useCallback(async (updates: Partial<BusinessContext>) => {
    setIsSyncing(true);
    
    const updated = {
      ...businessContext,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof BusinessContext] === undefined) {
        delete updated[key as keyof BusinessContext];
      }
    });

    setBusinessContext(updated);

    // Update Supabase (includes context variables and GTM profile in same request)
    try {
      const response = await fetch('/api/business-context/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          ...updated,
          ...gtmProfile
        })
      });

      if (response.ok) {
        const { contextVariables: syncedContext, businessContext: syncedBusiness, gtmProfile: syncedGTM } = await response.json();
        if (syncedContext) setContext(syncedContext);
        if (syncedBusiness) setBusinessContext(syncedBusiness);
        if (syncedGTM) setGtmProfile(syncedGTM);
      } else {
        throw new Error('Failed to sync with Supabase');
      }
    } catch (error) {
      console.debug('Failed to sync business context with Supabase:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [context, businessContext, gtmProfile]);

  const updateGTMProfile = useCallback(async (updates: Partial<GTMProfile>) => {
    setIsSyncing(true);
    
    const updated = {
      ...gtmProfile,
      ...updates,
    };

    // Remove undefined values
    Object.keys(updated).forEach((key) => {
      if (updated[key as keyof GTMProfile] === undefined) {
        delete updated[key as keyof GTMProfile];
      }
    });

    setGtmProfile(updated);

    // Update Supabase (includes context variables and business context in same request)
    try {
      const response = await fetch('/api/business-context/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          ...businessContext,
          ...updated
        })
      });

      if (response.ok) {
        const { contextVariables: syncedContext, businessContext: syncedBusiness, gtmProfile: syncedGTM } = await response.json();
        if (syncedContext) setContext(syncedContext);
        if (syncedBusiness) setBusinessContext(syncedBusiness);
        if (syncedGTM) setGtmProfile(syncedGTM);
      } else {
        throw new Error('Failed to sync with Supabase');
      }
    } catch (error) {
      console.debug('Failed to sync GTM profile with Supabase:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [context, businessContext, gtmProfile]);

  const clearContext = useCallback(async () => {
    setContext({});
    setBusinessContext({});
    // Note: GTM profile is NOT cleared by clearContext (use separate clearGTMProfile if needed)

    // Clear Supabase (context variables and business context only, GTM profile preserved)
    try {
      await fetch('/api/business-context/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gtmProfile // Preserve GTM profile
        })
      });
    } catch (error) {
      console.debug('Failed to clear Supabase:', error);
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(MIGRATION_FLAG_KEY);
      } catch (error) {
        console.debug('Failed to clear localStorage:', error);
      }
    }
  }, [gtmProfile]);

  const hasContext = Object.keys(context).some(
    (key) => context[key as keyof ContextVariables] !== undefined && 
             context[key as keyof ContextVariables] !== ''
  ) || Object.keys(businessContext).some(
    (key) => {
      const value = businessContext[key as keyof BusinessContext];
      return value !== undefined && 
             (Array.isArray(value) ? value.length > 0 : value !== '');
    }
  );

  return {
    context,
    businessContext,
    gtmProfile,
    updateContext,
    updateBusinessContext,
    updateGTMProfile,
    clearContext,
    hasContext,
    isLoading,
    isSyncing,
  };
}
