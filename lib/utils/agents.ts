/**
 * Agent utility functions
 * Helpers for agent operations and formatting
 */

import { AgentDefinition } from '@/lib/types/agents'

export function getAgentById(agents: AgentDefinition[], agentId: string): AgentDefinition | undefined {
  return agents.find(agent => agent.id === agentId)
}

export function formatInputType(inputType: string | null): string {
  if (!inputType) return 'None'
  
  switch (inputType) {
    case 'csv':
      return 'CSV File'
    case 'leads':
      return 'Leads'
    case 'keywords':
      return 'Keywords'
    case 'none':
      return 'None'
    default:
      return inputType
  }
}

export function formatOutputType(outputType: string | null): string {
  if (!outputType) return 'None'
  
  switch (outputType) {
    case 'leads':
      return 'Leads'
    case 'keywords':
      return 'Keywords'
    case 'content':
      return 'Content'
    case 'analytics':
      return 'Analytics'
    case 'campaign':
      return 'Campaign'
    default:
      return outputType
  }
}

export function validateAgentConfig(
  _agent: AgentDefinition,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // TODO: Implement validation based on agent.config_schema
  // For now, basic validation
  if (!config) {
    errors.push('Configuration is required')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export function getAgentCategoryLabel(category: string | null): string {
  if (!category) return 'Other'
  
  switch (category) {
    case 'data':
      return 'Data'
    case 'content':
      return 'Content'
    case 'analytics':
      return 'Analytics'
    case 'automation':
      return 'Automation'
    default:
      return category
  }
}

