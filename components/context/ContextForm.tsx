/**
 * Context Form Component
 * Form for managing company context variables
 * Auto-populates fields when website URL is entered (like zola-aisdkv5)
 */

'use client'

import { Building2, Globe, Package, Users, Target, Shield, RotateCcw, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useContextStorage } from '@/hooks/useContextStorage'
import { toast } from 'sonner'
import { useCallback, useState } from 'react'

export function ContextForm() {
  const { context, updateContext, clearContext, hasContext } = useContextStorage()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Auto-save on change
  const handleFieldChange = useCallback((field: keyof typeof context, value: string) => {
    updateContext({ [field]: value || undefined })
  }, [updateContext])

  const handleClear = useCallback(() => {
    clearContext()
    setWebsiteUrl('')
    toast.success('Context cleared')
  }, [clearContext])

  const handleAnalyzeWebsite = useCallback(async () => {
    if (!websiteUrl || websiteUrl.trim().length === 0) {
      toast.error('Please enter a website URL')
      return
    }

    // Validate URL format
    let validUrl = websiteUrl.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    try {
      new URL(validUrl)
    } catch {
      toast.error('Invalid URL format')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyse-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: validUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || error.error || 'Failed to analyze website')
      }

      const extractedContext = await response.json()

      // Update context with extracted values
      updateContext(extractedContext)
      
      toast.success('Website analyzed! Fields updated.')
      setWebsiteUrl('') // Clear URL input after successful analysis
    } catch (error) {
      console.error('Website analysis error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze website')
    } finally {
      setIsAnalyzing(false)
    }
  }, [websiteUrl, updateContext])

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground mb-6">
        Set up your company context variables. These will be available as <span className="font-mono text-primary">{'{{context.variableName}}'}</span> in your prompts when using Bulk Agent.
      </div>

      {/* Website Analysis - Like zola pattern with Analyze button */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl" className="flex items-center gap-2 text-xs font-medium">
            Website URL (optional - auto-fills context)
          </Label>
          <div className="flex gap-2">
            <Input
              id="websiteUrl"
              type="text"
              placeholder="yourcompany.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAnalyzing && websiteUrl.trim()) {
                  handleAnalyzeWebsite()
                }
              }}
              className="text-sm flex-1"
              disabled={isAnalyzing}
            />
            <Button
              onClick={handleAnalyzeWebsite}
              disabled={!websiteUrl.trim() || isAnalyzing}
              size="sm"
              className="text-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full animate-pulse rounded-full" />
              </div>
              <p className="text-xs text-muted-foreground">
                Using AI to analyze your company, product, and context...
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Enter a website URL and click Analyze to automatically extract context, or fill fields manually below
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone" className="flex items-center gap-2 text-xs font-medium">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            Tone
          </Label>
          <Input
            id="tone"
            placeholder="e.g., Professional, Friendly, Technical"
            value={context.tone || ''}
            onChange={(e) => handleFieldChange('tone', e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Desired communication tone for outputs
          </p>
        </div>

        {/* Target Countries */}
        <div className="space-y-2">
          <Label htmlFor="targetCountries" className="flex items-center gap-2 text-xs font-medium">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Target Countries
          </Label>
          <Input
            id="targetCountries"
            placeholder="e.g., US, UK, Canada, Germany"
            value={context.targetCountries || ''}
            onChange={(e) => handleFieldChange('targetCountries', e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of target countries
          </p>
        </div>

        {/* Product Description */}
        <div className="space-y-2">
          <Label htmlFor="productDescription" className="flex items-center gap-2 text-xs font-medium">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Product Description
          </Label>
          <Textarea
            id="productDescription"
            placeholder="Describe your product or service..."
            value={context.productDescription || ''}
            onChange={(e) => handleFieldChange('productDescription', e.target.value)}
            className="text-sm min-h-[100px]"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Brief description of your product or service
          </p>
        </div>

        {/* Competitors */}
        <div className="space-y-2">
          <Label htmlFor="competitors" className="flex items-center gap-2 text-xs font-medium">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Competitors
          </Label>
          <Input
            id="competitors"
            placeholder="e.g., Company A, Company B, Company C"
            value={context.competitors || ''}
            onChange={(e) => handleFieldChange('competitors', e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Main competitors in your market
          </p>
        </div>

        {/* Target Industries */}
        <div className="space-y-2">
          <Label htmlFor="targetIndustries" className="flex items-center gap-2 text-xs font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Target Industries
          </Label>
          <Input
            id="targetIndustries"
            placeholder="e.g., SaaS, Healthcare, Finance"
            value={context.targetIndustries || ''}
            onChange={(e) => handleFieldChange('targetIndustries', e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Industries you primarily target
          </p>
        </div>

        {/* Compliance Flags */}
        <div className="space-y-2">
          <Label htmlFor="complianceFlags" className="flex items-center gap-2 text-xs font-medium">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            Compliance Flags
          </Label>
          <Input
            id="complianceFlags"
            placeholder="e.g., GDPR, HIPAA, SOC2"
            value={context.complianceFlags || ''}
            onChange={(e) => handleFieldChange('complianceFlags', e.target.value)}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Relevant compliance requirements
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {hasContext ? 'Context saved automatically' : 'No context variables set'}
        </div>
        {hasContext && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}
