/**
 * Export filename generation utilities
 * DRY function - ensures consistent, user-oriented filenames across RUN and EXECUTIONS exports
 */

/**
 * Sanitize filename to be filesystem-safe
 * Removes or replaces special characters that could cause issues
 */
function sanitizeFilename(name: string): string {
  // Remove file extension if present
  const baseName = name.replace(/\.(csv|json)$/i, '')
  
  // Replace spaces and special chars with hyphens
  // Keep: letters, numbers, hyphens, underscores
  // Remove: everything else
  return baseName
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length to prevent filesystem issues
}

/**
 * Format timestamp for filename (sortable, filesystem-safe)
 * Format: YYYY-MM-DD-HHMMSS
 */
function formatTimestampForFilename(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`
}

/**
 * Generate export filename
 * Format: {original-filename-base}-results-{YYYY-MM-DD-HHMMSS}.{ext}
 * 
 * @param originalFilename - Original CSV filename (e.g., "employees.csv")
 * @param timestamp - Batch creation or export time
 * @param format - File format ('csv' or 'json')
 * @returns User-oriented, sortable filename
 * 
 * @example
 * generateExportFilename("employees.csv", new Date(), "csv")
 * // Returns: "employees-results-2024-11-13-143022.csv"
 */
export function generateExportFilename(
  originalFilename: string | null | undefined,
  timestamp: Date,
  format: 'csv' | 'json' = 'csv'
): string {
  // Sanitize original filename or use default
  const baseName = originalFilename
    ? sanitizeFilename(originalFilename)
    : 'bulk-gpt-export'
  
  // Format timestamp
  const timestampStr = formatTimestampForFilename(timestamp)
  
  // Combine: {base}-results-{timestamp}.{ext}
  return `${baseName}-results-${timestampStr}.${format}`
}

/**
 * Generate export filename from batch data
 * Convenience function that extracts needed data from batch object
 * 
 * @param batch - Batch object with csv_filename and created_at
 * @param format - File format ('csv' or 'json')
 * @returns User-oriented, sortable filename
 */
export function generateExportFilenameFromBatch(
  batch: {
    csv_filename?: string | null
    created_at?: string | Date | null
  },
  format: 'csv' | 'json' = 'csv'
): string {
  const originalFilename = batch.csv_filename || null
  const timestamp = batch.created_at
    ? new Date(batch.created_at)
    : new Date()
  
  return generateExportFilename(originalFilename, timestamp, format)
}

