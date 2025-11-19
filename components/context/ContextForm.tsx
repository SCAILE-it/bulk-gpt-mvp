'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, AlertTriangle, Trash2, CheckCircle, HelpCircle, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useContextStorage } from '@/hooks/useContextStorage'
import { toast } from 'sonner'

/**
 * ABOUTME: Context Form Component
 * ABOUTME: Allows users to set company business context manually or via website analysis
 * ABOUTME: Includes "Analyze Website" button that calls Gemini API to extract context
 */

export function ContextForm() {
  const { context, businessContext, updateContext, updateBusinessContext, clearContext, hasContext, isLoading } = useContextStorage()
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [showSavedIndicator, setShowSavedIndicator] = useState(false)
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false)
  
  // Load analyzed URL from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bulk-gpt-analyzed-url')
      if (stored && hasContext) {
        setAnalyzedUrl(stored)
      }
    }
  }, [hasContext])
  
  // Array field inputs
  const [newCountry, setNewCountry] = useState('')
  const [newProduct, setNewProduct] = useState('')
  const [newMarketingGoal, setNewMarketingGoal] = useState('')
  const [newTargetKeyword, setNewTargetKeyword] = useState('')
  const [newCompetitorKeyword, setNewCompetitorKeyword] = useState('')

  // Show saved indicator briefly after user makes changes
  useEffect(() => {
    if (hasUserMadeChanges && hasContext) {
      setShowSavedIndicator(true)
      const timer = setTimeout(() => setShowSavedIndicator(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [context, hasContext, hasUserMadeChanges])

  // Track when user makes manual changes (not from website analysis)
  const handleManualUpdate = useCallback((updates: Parameters<typeof updateContext>[0]) => {
    setHasUserMadeChanges(true)
    updateContext(updates)
  }, [updateContext])

  const handleBusinessContextUpdate = useCallback((updates: Parameters<typeof updateBusinessContext>[0]) => {
    setHasUserMadeChanges(true)
    updateBusinessContext(updates)
  }, [updateBusinessContext])

  // Array field handlers
  const addCountry = useCallback(() => {
    if (newCountry.trim()) {
      handleBusinessContextUpdate({
        countries: [...(businessContext.countries || []), newCountry.trim()]
      })
      setNewCountry('')
    }
  }, [newCountry, businessContext.countries, handleBusinessContextUpdate])

  const removeCountry = useCallback((index: number) => {
    handleBusinessContextUpdate({
      countries: businessContext.countries?.filter((_, i) => i !== index) || []
    })
  }, [businessContext.countries, handleBusinessContextUpdate])

  const addProduct = useCallback(() => {
    if (newProduct.trim()) {
      handleBusinessContextUpdate({
        products: [...(businessContext.products || []), newProduct.trim()]
      })
      setNewProduct('')
    }
  }, [newProduct, businessContext.products, handleBusinessContextUpdate])

  const removeProduct = useCallback((index: number) => {
    handleBusinessContextUpdate({
      products: businessContext.products?.filter((_, i) => i !== index) || []
    })
  }, [businessContext.products, handleBusinessContextUpdate])

  const addMarketingGoal = useCallback(() => {
    if (newMarketingGoal.trim()) {
      handleBusinessContextUpdate({
        marketingGoals: [...(businessContext.marketingGoals || []), newMarketingGoal.trim()]
      })
      setNewMarketingGoal('')
    }
  }, [newMarketingGoal, businessContext.marketingGoals, handleBusinessContextUpdate])

  const removeMarketingGoal = useCallback((index: number) => {
    handleBusinessContextUpdate({
      marketingGoals: businessContext.marketingGoals?.filter((_, i) => i !== index) || []
    })
  }, [businessContext.marketingGoals, handleBusinessContextUpdate])

  const addTargetKeyword = useCallback(() => {
    if (newTargetKeyword.trim()) {
      handleBusinessContextUpdate({
        targetKeywords: [...(businessContext.targetKeywords || []), newTargetKeyword.trim()]
      })
      setNewTargetKeyword('')
    }
  }, [newTargetKeyword, businessContext.targetKeywords, handleBusinessContextUpdate])

  const removeTargetKeyword = useCallback((index: number) => {
    handleBusinessContextUpdate({
      targetKeywords: businessContext.targetKeywords?.filter((_, i) => i !== index) || []
    })
  }, [businessContext.targetKeywords, handleBusinessContextUpdate])

  const addCompetitorKeyword = useCallback(() => {
    if (newCompetitorKeyword.trim()) {
      handleBusinessContextUpdate({
        competitorKeywords: [...(businessContext.competitorKeywords || []), newCompetitorKeyword.trim()]
      })
      setNewCompetitorKeyword('')
    }
  }, [newCompetitorKeyword, businessContext.competitorKeywords, handleBusinessContextUpdate])

  const removeCompetitorKeyword = useCallback((index: number) => {
    handleBusinessContextUpdate({
      competitorKeywords: businessContext.competitorKeywords?.filter((_, i) => i !== index) || []
    })
  }, [businessContext.competitorKeywords, handleBusinessContextUpdate])

  const handleAnalyzeWebsite = useCallback(async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyse-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to analyze website' }))
        throw new Error(error.message || error.error || 'Failed to analyze website')
      }

      const data = await response.json()

      // Update business context with extracted data
      const contextUpdates: Parameters<typeof updateContext>[0] = {}
      if (data.tone) contextUpdates.tone = data.tone
      if (data.targetCountries) contextUpdates.targetCountries = data.targetCountries
      if (data.productDescription) contextUpdates.productDescription = data.productDescription
      if (data.competitors) contextUpdates.competitors = data.competitors
      if (data.targetIndustries) contextUpdates.targetIndustries = data.targetIndustries
      if (data.complianceFlags) contextUpdates.complianceFlags = data.complianceFlags

      // Update business context with extracted data
      const businessUpdates: Parameters<typeof updateBusinessContext>[0] = {}
      if (data.icp) businessUpdates.icp = data.icp
      if (data.countries && Array.isArray(data.countries)) businessUpdates.countries = data.countries
      if (data.products && Array.isArray(data.products)) businessUpdates.products = data.products
      if (data.targetKeywords && Array.isArray(data.targetKeywords)) businessUpdates.targetKeywords = data.targetKeywords
      if (data.competitorKeywords && Array.isArray(data.competitorKeywords)) businessUpdates.competitorKeywords = data.competitorKeywords

      setHasUserMadeChanges(true)
      
      // Update both context types
      if (Object.keys(contextUpdates).length > 0) {
        updateContext(contextUpdates)
      }
      if (Object.keys(businessUpdates).length > 0) {
        updateBusinessContext(businessUpdates)
      }

      // Store the analyzed URL
      const normalizedUrl = websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`
      setAnalyzedUrl(normalizedUrl)
      if (typeof window !== 'undefined') {
        localStorage.setItem('bulk-gpt-analyzed-url', normalizedUrl)
      }

      toast.success('Website analyzed successfully')
      // Keep URL visible - don't clear it so user can see what was analyzed
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze website')
    } finally {
      setIsAnalyzing(false)
    }
  }, [websiteUrl, updateContext, updateBusinessContext])

  const handleClearAll = useCallback(() => {
    clearContext()
    setAnalyzedUrl(null)
    setHasUserMadeChanges(false)
    setShowClearConfirmation(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bulk-gpt-analyzed-url')
    }
    toast.success('Context cleared')
  }, [clearContext])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
      {/* Website Analysis Section */}
      <div className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <Label htmlFor="website-url" className="text-sm font-semibold text-foreground">
            Analyze Website
          </Label>
        </div>
        
        {/* Show analyzed URL if data exists */}
        {analyzedUrl && hasContext && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-primary/20 rounded-md">
            <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Data from:</span>
            <a 
              href={analyzedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-medium truncate flex-1"
            >
              {analyzedUrl}
            </a>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            id="website-url"
            type="text"
            placeholder="yourcompany.com or https://yourcompany.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isAnalyzing && websiteUrl.trim()) {
                handleAnalyzeWebsite()
              }
            }}
            disabled={isAnalyzing}
            className="text-xs flex-1"
          />
          <Button
            onClick={handleAnalyzeWebsite}
            disabled={!websiteUrl.trim() || isAnalyzing}
            size="sm"
            className="text-xs font-medium"
          >
            {isAnalyzing ? (
              <>
                <div className="h-3.5 w-3.5 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a website URL to automatically extract company context using AI
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Manual Context Fields */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Business Context</Label>
            {showSavedIndicator && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 animate-in fade-in-0 duration-300">
                <CheckCircle className="h-3 w-3" />
                <span>Auto-saved</span>
              </div>
            )}
            {!showSavedIndicator && hasContext && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                <span>All changes saved automatically</span>
              </div>
            )}
          </div>
          {hasContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirmation(true)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          )}
        </div>

        {/* Tone */}
        <div className={`space-y-2 ${context.tone ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="tone" className="text-xs">
              Tone
            </Label>
            {context.tone && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about tone"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Tone</p>
                  <p className="text-muted-foreground">
                    The writing style and voice for AI-generated content. Use this in prompts with <code className="text-xs bg-secondary px-1 rounded">context.tone</code>.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="tone"
            type="text"
            placeholder="e.g., Professional, Friendly, Technical"
            value={context.tone || ''}
            onChange={(e) => handleManualUpdate({ tone: e.target.value })}
            className={`text-xs ${context.tone ? 'bg-background' : ''}`}
          />
        </div>

        {/* ICP */}
        <div className={`space-y-2 ${businessContext.icp ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="icp" className="text-xs">
              Ideal Customer Profile (ICP)
            </Label>
            {businessContext.icp && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about ICP"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Ideal Customer Profile</p>
                  <p className="text-muted-foreground">
                    Describe your ideal customer: industry, company size, pain points, etc. Used for AI classification and content generation.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="icp"
            placeholder="Describe your ideal customer: industry, company size, pain points, etc."
            value={businessContext.icp || ''}
            onChange={(e) => handleBusinessContextUpdate({ icp: e.target.value })}
            rows={4}
            className={`text-xs resize-none ${businessContext.icp ? 'bg-background' : ''}`}
          />
        </div>

        {/* Value Proposition */}
        <div className={`space-y-2 ${businessContext.valueProposition ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="value-proposition" className="text-xs">
              Value Proposition
            </Label>
            {businessContext.valueProposition && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about value proposition"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Value Proposition</p>
                  <p className="text-muted-foreground">
                    A clear statement that explains how your product solves customers&apos; problems, delivers specific benefits, and why customers should choose you over competitors.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="value-proposition"
            placeholder="We replace inconsistent, manual outreach with a scalable, data-driven, and automated AI sales engine..."
            value={businessContext.valueProposition || ''}
            onChange={(e) => handleBusinessContextUpdate({ valueProposition: e.target.value })}
            rows={3}
            className={`text-xs resize-none ${businessContext.valueProposition ? 'bg-background' : ''}`}
          />
        </div>

        {/* Marketing Goals */}
        <div className={`space-y-2 ${businessContext.marketingGoals && businessContext.marketingGoals.length > 0 ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Marketing Goals</Label>
            {businessContext.marketingGoals && businessContext.marketingGoals.length > 0 && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about marketing goals"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Marketing Goals</p>
                  <p className="text-muted-foreground">
                    Define your marketing objectives. Examples: Generate qualified leads, Build thought leadership, Dominate search results.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add marketing goal (e.g., Generate qualified leads)"
              value={newMarketingGoal}
              onChange={(e) => setNewMarketingGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMarketingGoal()
                }
              }}
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={addMarketingGoal}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {businessContext.marketingGoals && businessContext.marketingGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessContext.marketingGoals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs"
                >
                  {goal}
                  <button
                    type="button"
                    onClick={() => removeMarketingGoal(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Countries */}
        <div className={`space-y-2 ${businessContext.countries && businessContext.countries.length > 0 ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Target Countries</Label>
            {businessContext.countries && businessContext.countries.length > 0 && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about target countries"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Target Countries</p>
                  <p className="text-muted-foreground">
                    Geographic markets for your business. Used for AI classification and content generation.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add country (e.g., United States)"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCountry()
                }
              }}
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={addCountry}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {businessContext.countries && businessContext.countries.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessContext.countries.map((country, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs"
                >
                  {country}
                  <button
                    type="button"
                    onClick={() => removeCountry(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <div className={`space-y-2 ${businessContext.products && businessContext.products.length > 0 ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Products</Label>
            {businessContext.products && businessContext.products.length > 0 && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about products"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Products</p>
                  <p className="text-muted-foreground">
                    Your product or service offerings. Used for AI classification and content generation.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add product name"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addProduct()
                }
              }}
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={addProduct}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {businessContext.products && businessContext.products.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessContext.products.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs"
                >
                  {product}
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Description */}
        <div className={`space-y-2 ${context.productDescription ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="productDescription" className="text-xs">
              Product Description
            </Label>
            {context.productDescription && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about product description"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Product Description</p>
                  <p className="text-muted-foreground">
                    Brief overview of your product or service. Use in prompts with <code className="text-xs bg-secondary px-1 rounded">context.productDescription</code>.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="productDescription"
            placeholder="Brief description of your product or service"
            value={context.productDescription || ''}
            onChange={(e) => handleManualUpdate({ productDescription: e.target.value })}
            rows={3}
            className={`text-xs resize-none ${context.productDescription ? 'bg-background' : ''}`}
          />
        </div>

        {/* Competitors */}
        <div className={`space-y-2 ${context.competitors ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="competitors" className="text-xs">
              Competitors
            </Label>
            {context.competitors && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about competitors"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Competitors</p>
                  <p className="text-muted-foreground">
                    Main competitors to reference in content. Use in prompts with <code className="text-xs bg-secondary px-1 rounded">context.competitors</code>.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="competitors"
            type="text"
            placeholder="e.g., Salesforce, HubSpot"
            value={context.competitors || ''}
            onChange={(e) => handleManualUpdate({ competitors: e.target.value })}
            className={`text-xs ${context.competitors ? 'bg-background' : ''}`}
          />
        </div>

        {/* Target Industries */}
        <div className={`space-y-2 ${context.targetIndustries ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="targetIndustries" className="text-xs">
              Target Industries
            </Label>
            {context.targetIndustries && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about target industries"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Target Industries</p>
                  <p className="text-muted-foreground">
                    Industries your content targets. Use in prompts with <code className="text-xs bg-secondary px-1 rounded">context.targetIndustries</code>.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="targetIndustries"
            type="text"
            placeholder="e.g., SaaS, Technology, Healthcare"
            value={context.targetIndustries || ''}
            onChange={(e) => handleManualUpdate({ targetIndustries: e.target.value })}
            className={`text-xs ${context.targetIndustries ? 'bg-background' : ''}`}
          />
        </div>

        {/* Compliance Flags */}
        <div className={`space-y-2 ${context.complianceFlags ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="complianceFlags" className="text-xs">
              Compliance Flags
            </Label>
            {context.complianceFlags && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about compliance flags"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Compliance Flags</p>
                  <p className="text-muted-foreground">
                    Compliance standards to mention in content. Use in prompts with <code className="text-xs bg-secondary px-1 rounded">context.complianceFlags</code>.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="complianceFlags"
            type="text"
            placeholder="e.g., SOC2, GDPR, HIPAA"
            value={context.complianceFlags || ''}
            onChange={(e) => handleManualUpdate({ complianceFlags: e.target.value })}
            className={`text-xs ${context.complianceFlags ? 'bg-background' : ''}`}
          />
        </div>

        {/* Target Keywords */}
        <div className={`space-y-2 ${businessContext.targetKeywords && businessContext.targetKeywords.length > 0 ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Target Keywords</Label>
            {businessContext.targetKeywords && businessContext.targetKeywords.length > 0 && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about target keywords"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Target Keywords</p>
                  <p className="text-muted-foreground">
                    Keywords to target in your content and campaigns.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add target keyword"
              value={newTargetKeyword}
              onChange={(e) => setNewTargetKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTargetKeyword()
                }
              }}
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={addTargetKeyword}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {businessContext.targetKeywords && businessContext.targetKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessContext.targetKeywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeTargetKeyword(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitor Keywords */}
        <div className={`space-y-2 ${businessContext.competitorKeywords && businessContext.competitorKeywords.length > 0 ? 'bg-primary/5 border-l-2 border-l-primary pl-3 -ml-3 pr-3 rounded-r-md' : ''}`}>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Competitor Keywords</Label>
            {businessContext.competitorKeywords && businessContext.competitorKeywords.length > 0 && <CheckCircle className="h-3 w-3 text-primary" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Learn about competitor keywords"
                >
                  <HelpCircle className="h-3 w-3 cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Competitor Keywords</p>
                  <p className="text-muted-foreground">
                    Keywords to track for competitor monitoring.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add competitor keyword to track"
              value={newCompetitorKeyword}
              onChange={(e) => setNewCompetitorKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCompetitorKeyword()
                }
              }}
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={addCompetitorKeyword}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {businessContext.competitorKeywords && businessContext.competitorKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessContext.competitorKeywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border rounded text-xs"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeCompetitorKeyword(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        title="Clear all context?"
        titleIcon={AlertTriangle}
        titleIconColor="text-yellow-500"
        size="sm"
        ariaLabelledBy="clear-context-title"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirmation(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          This will clear all business context. This action cannot be undone.
        </p>
      </Modal>
      </div>
    </TooltipProvider>
  )
}
