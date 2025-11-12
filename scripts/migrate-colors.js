#!/usr/bin/env node
/**
 * Migration script to replace hardcoded zinc colors with design tokens
 * Usage: node scripts/migrate-colors.js [file-path]
 */

const fs = require('fs')
const path = require('path')

const colorMappings = {
  // Backgrounds
  'bg-zinc-950': 'bg-background',
  'bg-zinc-950/95': 'bg-background/95',
  'bg-zinc-950/60': 'bg-background/60',
  'bg-zinc-900': 'bg-secondary',
  'bg-zinc-900/40': 'bg-card',
  'bg-zinc-900/30': 'bg-card',
  'bg-zinc-900/70': 'bg-muted',
  'bg-zinc-900/50': 'bg-card',
  'bg-zinc-800': 'bg-accent',
  'bg-zinc-800/70': 'bg-accent/70',
  'bg-zinc-700': 'bg-accent',
  'bg-zinc-600': 'bg-muted-foreground',
  
  // Text colors
  'text-zinc-100': 'text-foreground',
  'text-zinc-200': 'text-foreground',
  'text-zinc-300': 'text-foreground',
  'text-zinc-400': 'text-muted-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'text-zinc-600': 'text-muted-foreground',
  'text-zinc-700': 'text-muted-foreground',
  
  // Borders
  'border-white/5': 'border-border',
  'border-white/10': 'border-border',
  'border-white/20': 'border-border',
  'border-zinc-800': 'border-border',
  'border-zinc-700': 'border-border',
  'border-zinc-900': 'border-border',
  
  // Placeholders
  'placeholder:text-zinc-600': 'placeholder:text-muted-foreground',
  'placeholder:text-zinc-500': 'placeholder:text-muted-foreground',
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false
  
  for (const [oldColor, newColor] of Object.entries(colorMappings)) {
    const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    if (content.includes(oldColor)) {
      content = content.replace(regex, newColor)
      changed = true
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Migrated: ${filePath}`)
    return true
  }
  return false
}

function findTsxFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.next')) {
      files.push(...findTsxFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }
  
  return files
}

// Main execution
const targetPath = process.argv[2] || path.join(__dirname, '..')
const files = targetPath.endsWith('.tsx') 
  ? [targetPath] 
  : findTsxFiles(targetPath)

let migratedCount = 0
for (const file of files) {
  if (migrateFile(file)) {
    migratedCount++
  }
}

console.log(`\n✨ Migration complete: ${migratedCount} files updated`)

