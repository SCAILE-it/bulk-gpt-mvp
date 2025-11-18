/**
 * GTM Classification Form Component
 * Standardized fields matching the pattern of other business context fields
 */

'use client';

import { useState, useEffect } from 'react';
import { GTM_PLAYBOOKS, PRODUCT_TYPES } from '@/lib/config/gtm-config';
import { GTMPlaybook, BusinessContext } from '@/lib/types/business-context';
import { HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GTMClassificationFormProps {
  initialContext?: BusinessContext;
  onUpdate: (playbook: GTMPlaybook | null, productType: string | null) => void;
}

export function GTMClassificationForm({
  initialContext,
  onUpdate
}: GTMClassificationFormProps) {
  const [playbook, setPlaybook] = useState<GTMPlaybook | null>(
    (initialContext?.gtm_playbook as GTMPlaybook) || null
  );
  const [productType, setProductType] = useState<string | null>(
    initialContext?.product_type || null
  );

  // Auto-update when initialContext changes
  useEffect(() => {
    if (initialContext?.gtm_playbook !== undefined) {
      setPlaybook(initialContext.gtm_playbook as GTMPlaybook | null);
    }
    if (initialContext?.product_type !== undefined) {
      setProductType(initialContext.product_type || null);
    }
  }, [initialContext?.gtm_playbook, initialContext?.product_type]);

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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* GTM Playbook */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="gtm-playbook" className="text-xs">
              GTM Playbook
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about GTM Playbook"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">GTM Playbook</p>
                  <p className="text-muted-foreground">
                    Your go-to-market strategy model. Examples: Sales-led, Product-led growth (PLG), Hybrid, Channel-led, Enterprise infrastructure.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <select
            id="gtm-playbook"
            value={playbook || ''}
            onChange={(e) => handlePlaybookChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
          >
            <option value="">Select GTM Playbook</option>
            {Object.values(GTM_PLAYBOOKS).map((pb) => (
              <option key={pb.id} value={pb.id}>
                {pb.name} - {pb.description}
              </option>
            ))}
          </select>
        </div>

        {/* Product Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="product-type" className="text-xs">
              Product Type
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about Product Type"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Product Type</p>
                  <p className="text-muted-foreground">
                    Category of your product or service. Examples: Developer tools, Sales & Marketing, Fintech, HR, Customer Experience, Security.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <select
            id="product-type"
            value={productType || ''}
            onChange={(e) => handleProductTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
          >
            <option value="">Select Product Type</option>
            {Object.values(PRODUCT_TYPES).map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </TooltipProvider>
  );
}

