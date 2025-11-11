/**
 * ABOUTME: Prompt template definitions and categories for bulk processing
 * ABOUTME: Centralized configuration for reuse across components
 */

import { FileEdit, Database, Sparkles, type LucideIcon } from 'lucide-react'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  prompt: string
  exampleVariables: string[]
  category: 'content' | 'data' | 'analysis'
}

export interface TemplateCategory {
  id: 'all' | 'content' | 'data' | 'analysis'
  label: string
  icon: LucideIcon | null
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'write-bio',
    name: 'Professional Bio',
    description: 'Generate professional bios for team members, speakers, or clients',
    prompt: 'Write a professional bio (2-3 sentences) for {{name}} who works as {{title}} at {{company}}. {{name}} specializes in {{expertise}}. Keep it engaging and suitable for a conference website.',
    exampleVariables: ['name', 'title', 'company', 'expertise'],
    category: 'content'
  },
  {
    id: 'summarize-content',
    name: 'Content Summarizer',
    description: 'Summarize long text into concise bullet points',
    prompt: 'Summarize the following text into 3-5 key bullet points. Focus on the main ideas and actionable insights:\n\n{{text}}',
    exampleVariables: ['text'],
    category: 'analysis'
  },
  {
    id: 'extract-data',
    name: 'Data Extractor',
    description: 'Extract structured information from unstructured text',
    prompt: 'Extract the following information from this text and return as JSON:\n- Company name\n- Industry\n- Location\n- Key products/services\n\nText: {{description}}',
    exampleVariables: ['description'],
    category: 'data'
  }
]

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'content', label: 'Content', icon: FileEdit },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'analysis', label: 'Analysis', icon: Sparkles },
]
