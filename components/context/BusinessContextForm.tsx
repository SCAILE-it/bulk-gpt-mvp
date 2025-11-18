/**
 * Business Context Form - Manage ICP, countries, products, keywords
 * Part of GTM Engine transformation
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { GTMClassificationForm } from '@/components/context/GTMClassificationForm'
import type { BusinessContext as BusinessContextType } from '@/lib/types/business-context'

interface BusinessContext {
  icp?: string
  countries?: string[]
  products?: string[]
  target_keywords?: string[]
  competitor_keywords?: string[]
}

export function BusinessContextForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<BusinessContext>({
    icp: '',
    countries: [],
    products: [],
    target_keywords: [],
    competitor_keywords: [],
  })
  const [newCountry, setNewCountry] = useState('')
  const [newProduct, setNewProduct] = useState('')
  const [newTargetKeyword, setNewTargetKeyword] = useState('')
  const [newCompetitorKeyword, setNewCompetitorKeyword] = useState('')
  const [gtmContext, setGtmContext] = useState<BusinessContextType | null>(null)

  useEffect(() => {
    fetchBusinessContext()
    fetchGTMProfile()
  }, [])

  const fetchGTMProfile = async () => {
    try {
      const response = await fetch('/api/business-context/business-context')
      if (response.ok) {
        const { gtmProfile } = await response.json()
        setGtmContext({
          gtm_playbook: gtmProfile?.gtmPlaybook,
          product_type: gtmProfile?.productType,
          gtm_playbook_confidence: gtmProfile?.gtmPlaybookConfidence,
          product_type_confidence: gtmProfile?.productTypeConfidence,
          gtm_playbook_ai_suggested: gtmProfile?.gtmPlaybookAISuggested,
          product_type_ai_suggested: gtmProfile?.productTypeAISuggested,
          gtm_playbook_manually_overridden: gtmProfile?.gtmPlaybookManuallyOverridden,
          product_type_manually_overridden: gtmProfile?.productTypeManuallyOverridden,
          gtm_playbook_ai_suggestion: gtmProfile?.gtmPlaybookAISuggestion,
          product_type_ai_suggestion: gtmProfile?.productTypeAISuggestion,
        } as BusinessContextType)
      }
    } catch (error) {
      console.debug('Error fetching GTM profile:', error)
    }
  }

  const fetchBusinessContext = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/business-context')
      if (!response.ok) {
        if (response.status === 404) {
          // No business context yet - start with empty form
          return
        }
        throw new Error('Failed to fetch business context')
      }
      
      const data = await response.json()
      setFormData({
        icp: data.context?.icp || '',
        countries: data.context?.countries || [],
        products: data.context?.products || [],
        target_keywords: data.context?.target_keywords || [],
        competitor_keywords: data.context?.competitor_keywords || [],
      })
    } catch (error) {
      console.error('Error fetching business context:', error)
      toast.error('Failed to load business context')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/business-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save business context')

      toast.success('Business context saved')
    } catch (error) {
      console.error('Error saving business context:', error)
      toast.error('Failed to save business context')
    } finally {
      setIsSaving(false)
    }
  }

  const addCountry = () => {
    if (newCountry.trim()) {
      setFormData({
        ...formData,
        countries: [...(formData.countries || []), newCountry.trim()],
      })
      setNewCountry('')
    }
  }

  const removeCountry = (index: number) => {
    setFormData({
      ...formData,
      countries: formData.countries?.filter((_, i) => i !== index) || [],
    })
  }

  const addProduct = () => {
    if (newProduct.trim()) {
      setFormData({
        ...formData,
        products: [...(formData.products || []), newProduct.trim()],
      })
      setNewProduct('')
    }
  }

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products?.filter((_, i) => i !== index) || [],
    })
  }

  const addTargetKeyword = () => {
    if (newTargetKeyword.trim()) {
      setFormData({
        ...formData,
        target_keywords: [...(formData.target_keywords || []), newTargetKeyword.trim()],
      })
      setNewTargetKeyword('')
    }
  }

  const removeTargetKeyword = (index: number) => {
    setFormData({
      ...formData,
      target_keywords: formData.target_keywords?.filter((_, i) => i !== index) || [],
    })
  }

  const addCompetitorKeyword = () => {
    if (newCompetitorKeyword.trim()) {
      setFormData({
        ...formData,
        competitor_keywords: [...(formData.competitor_keywords || []), newCompetitorKeyword.trim()],
      })
      setNewCompetitorKeyword('')
    }
  }

  const removeCompetitorKeyword = (index: number) => {
    setFormData({
      ...formData,
      competitor_keywords: formData.competitor_keywords?.filter((_, i) => i !== index) || [],
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-secondary/50 rounded animate-pulse" />
        <div className="h-32 bg-secondary/50 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Business Context</h2>
        <p className="text-xs text-muted-foreground">
          Define your ideal customer profile, target markets, and products to help agents generate better results
        </p>
      </div>

      {/* ICP */}
      <div className="space-y-2">
        <Label htmlFor="icp" className="text-xs">
          Ideal Customer Profile (ICP)
        </Label>
        <Textarea
          id="icp"
          placeholder="Describe your ideal customer: industry, company size, pain points, etc."
          value={formData.icp || ''}
          onChange={(e) => setFormData({ ...formData, icp: e.target.value })}
          className="min-h-[100px] text-xs"
        />
      </div>

      {/* Countries */}
      <div className="space-y-2">
        <Label className="text-xs">Target Countries</Label>
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
        {formData.countries && formData.countries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.countries.map((country, index) => (
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
      <div className="space-y-2">
        <Label className="text-xs">Products</Label>
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
        {formData.products && formData.products.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.products.map((product, index) => (
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

      {/* Target Keywords */}
      <div className="space-y-2">
        <Label className="text-xs">Target Keywords</Label>
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
        {formData.target_keywords && formData.target_keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.target_keywords.map((keyword, index) => (
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
      <div className="space-y-2">
        <Label className="text-xs">Competitor Keywords</Label>
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
        {formData.competitor_keywords && formData.competitor_keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.competitor_keywords.map((keyword, index) => (
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

      {/* GTM Classification */}
      <div className="border-t pt-6 mt-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-1">GTM Classification</h3>
          <p className="text-xs text-muted-foreground">
            Classify your go-to-market strategy and product type. This helps agents generate more relevant content.
          </p>
        </div>
        
        <GTMClassificationForm
          initialContext={gtmContext || undefined}
          onUpdate={async (playbook, productType) => {
            try {
              const response = await fetch('/api/business-context/business-context', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  gtmPlaybook: playbook,
                  productType: productType,
                })
              })
              
              if (response.ok) {
                const { gtmProfile } = await response.json()
                setGtmContext({
                  ...gtmContext,
                  gtm_playbook: gtmProfile?.gtmPlaybook,
                  product_type: gtmProfile?.productType,
                } as BusinessContextType)
                toast.success('GTM profile updated')
              } else {
                throw new Error('Failed to update GTM profile')
              }
            } catch (error) {
              console.error('Error updating GTM profile:', error)
              toast.error('Failed to update GTM profile')
            }
          }}
        />
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        <Save className="h-3.5 w-3.5 mr-2" />
        {isSaving ? 'Saving...' : 'Save Business Context'}
      </Button>
    </div>
  )
}


