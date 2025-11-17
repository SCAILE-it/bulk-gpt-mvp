/**
 * GTM Classification Form Component
 * Allows users to set GTM playbook and product type with AI assistance
 */

'use client';

import { useState, useEffect } from 'react';
import { GTM_PLAYBOOKS, PRODUCT_TYPES, getGTMProfileDisplay } from '@/lib/config/gtm-config';
import { GTMPlaybook, ProductType, BusinessContext, getConfidenceLevel } from '@/lib/types/business-context';
import { Info, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface GTMClassificationFormProps {
  initialContext?: BusinessContext;
  onUpdate: (playbook: GTMPlaybook | null, productType: string | null) => void;
  icp?: string;
  products?: string[];
  countries?: string[];
}

export function GTMClassificationForm({
  initialContext,
  onUpdate,
  icp,
  products,
  countries
}: GTMClassificationFormProps) {
  const [playbook, setPlaybook] = useState<GTMPlaybook | null>(
    (initialContext?.gtm_playbook as GTMPlaybook) || null
  );
  const [productType, setProductType] = useState<string | null>(
    initialContext?.product_type || null
  );
  
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<{
    gtm_playbook?: { value: GTMPlaybook | null; confidence: number; reasoning: string };
    product_type?: { value: string | null; confidence: number; reasoning: string };
  }>({});
  
  const [showReasoning, setShowReasoning] = useState<{
    playbook: boolean;
    productType: boolean;
  }>({ playbook: false, productType: false });

  // Auto-update when initialContext changes (e.g., from AI auto-classification)
  useEffect(() => {
    if (initialContext?.gtm_playbook !== undefined) {
      setPlaybook(initialContext.gtm_playbook as GTMPlaybook | null);
    }
    if (initialContext?.product_type !== undefined) {
      setProductType(initialContext.product_type || null);
    }
  }, [initialContext?.gtm_playbook, initialContext?.product_type]);

  const handleClassifyWithAI = async () => {
    setIsClassifying(true);
    try {
      const response = await fetch('/api/business-context/classify-gtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp: icp || '',
          products: products || [],
          countries: countries || []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to classify');
      }

      const { classification: result } = await response.json();
      setClassification(result);
      
      // Pre-select if high confidence
      const playbookConfidence = getConfidenceLevel(result.gtm_playbook?.confidence);
      const productTypeConfidence = getConfidenceLevel(result.product_type?.confidence);
      
      if (playbookConfidence.preselected && result.gtm_playbook?.value) {
        setPlaybook(result.gtm_playbook.value);
        handlePlaybookChange(result.gtm_playbook.value);
      }
      
      if (productTypeConfidence.preselected && result.product_type?.value) {
        setProductType(result.product_type.value);
        handleProductTypeChange(result.product_type.value);
      }
      
    } catch (error) {
      console.error('Failed to classify:', error);
      alert(error instanceof Error ? error.message : 'Failed to classify. Please select manually.');
    } finally {
      setIsClassifying(false);
    }
  };

  const handlePlaybookChange = (value: string) => {
    const validated = value === '' ? null : (value as GTMPlaybook);
    setPlaybook(validated);
    onUpdate(validated, productType);
  };

  const handleProductTypeChange = (value: string) => {
    const validated = value === '' ? null : value;
    setProductType(validated);
    onUpdate(playbook, validated);
  };

  const getPlaybookConfidenceBadge = () => {
    if (!classification.gtm_playbook) return null;
    
    const level = getConfidenceLevel(classification.gtm_playbook.confidence);
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        level.color === 'green' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' :
        level.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20' :
        'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
      }`}>
        {level.color === 'green' && <CheckCircle2 className="w-3 h-3" />}
        {level.color === 'yellow' && <AlertCircle className="w-3 h-3" />}
        {level.color === 'red' && <AlertCircle className="w-3 h-3" />}
        {level.badge}
      </div>
    );
  };

  const getProductTypeConfidenceBadge = () => {
    if (!classification.product_type) return null;
    
    const level = getConfidenceLevel(classification.product_type.confidence);
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        level.color === 'green' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' :
        level.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20' :
        'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
      }`}>
        {level.color === 'green' && <CheckCircle2 className="w-3 h-3" />}
        {level.color === 'yellow' && <AlertCircle className="w-3 h-3" />}
        {level.color === 'red' && <AlertCircle className="w-3 h-3" />}
        {level.badge}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* GTM Playbook */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="gtm-playbook" className="text-xs">
            GTM Playbook
          </Label>
          <button
            type="button"
            onClick={handleClassifyWithAI}
            disabled={isClassifying || (!icp && (!products || products.length === 0))}
            className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            {isClassifying ? 'Classifying...' : 'Classify with AI'}
          </button>
        </div>
        
        <select
          id="gtm-playbook"
          value={playbook || ''}
          onChange={(e) => handlePlaybookChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
        >
          <option value="">Select GTM Playbook</option>
          {Object.values(GTM_PLAYBOOKS).map((pb) => (
            <option key={pb.id} value={pb.id}>
              {pb.name} - {pb.description}
            </option>
          ))}
        </select>
        
        {classification.gtm_playbook && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              {getPlaybookConfidenceBadge()}
              <button
                type="button"
                onClick={() => setShowReasoning({ ...showReasoning, playbook: !showReasoning.playbook })}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" />
                Why?
              </button>
            </div>
            {showReasoning.playbook && (
              <div className="mt-1 p-3 bg-primary/10 rounded-md text-xs text-foreground border border-primary/20">
                {classification.gtm_playbook.reasoning}
              </div>
            )}
          </div>
        )}
        
        {initialContext?.gtm_playbook_manually_overridden && 
         initialContext?.gtm_playbook_ai_suggestion &&
         playbook !== initialContext.gtm_playbook_ai_suggestion && (
          <div className="mt-2 text-xs text-muted-foreground italic">
            You manually selected this. AI suggested: {GTM_PLAYBOOKS[initialContext.gtm_playbook_ai_suggestion]?.name}
          </div>
        )}
      </div>

      {/* Product Type */}
      <div className="space-y-2">
        <Label htmlFor="product-type" className="text-xs">
          Product Type
        </Label>
        
        <select
          id="product-type"
          value={productType || ''}
          onChange={(e) => handleProductTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
        >
          <option value="">Select Product Type</option>
          {Object.values(PRODUCT_TYPES).map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name}
            </option>
          ))}
        </select>
        
        {classification.product_type && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              {getProductTypeConfidenceBadge()}
              <button
                type="button"
                onClick={() => setShowReasoning({ ...showReasoning, productType: !showReasoning.productType })}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" />
                Why?
              </button>
            </div>
            {showReasoning.productType && (
              <div className="mt-1 p-3 bg-primary/10 rounded-md text-xs text-foreground border border-primary/20">
                {classification.product_type.reasoning}
              </div>
            )}
          </div>
        )}
        
        {initialContext?.product_type_manually_overridden && 
         initialContext?.product_type_ai_suggestion &&
         productType !== initialContext.product_type_ai_suggestion && (
          <div className="mt-2 text-xs text-muted-foreground italic">
            You manually selected this. AI suggested: {initialContext.product_type_ai_suggestion}
          </div>
        )}
      </div>

      {playbook && productType && (
        <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
          <p className="text-sm font-medium text-foreground">
            Your GTM Profile: {getGTMProfileDisplay(playbook, productType)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This combination will determine which KPIs and data sources are prioritized for your account.
          </p>
        </div>
      )}
      
      {(!icp || (!products || products.length === 0)) && (
        <div className="p-3 bg-warning/10 rounded-md border border-warning/20">
          <p className="text-xs text-warning">
            Fill in your ICP and products to get AI classification suggestions.
          </p>
        </div>
      )}
    </div>
  );
}

