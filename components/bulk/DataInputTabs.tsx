/**
 * Data Input Tabs Component
 * Provides tabbed interface for CSV upload and Google Sheets import
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { Upload, FileSpreadsheet, FolderOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CSVUploadTab } from './CSVUploadTab'
import { GoogleSheetsUrlTab } from './GoogleSheetsUrlTab'
import { ContextFilesTab } from './ContextFilesTab'
import type { ParsedCSV } from '@/lib/types'

interface DataInputTabsProps {
  csvData: ParsedCSV | null
  fileName?: string
  isUploading: boolean
  isParsing?: boolean
  onFileUpload: (file: File) => void
  onGoogleSheetsDataLoaded: (data: ParsedCSV) => void
  onClearData?: () => void
  selectedInputColumns?: string[]
  onInputColumnsChange?: (columns: string[]) => void
}

export const DataInputTabs = memo(function DataInputTabs({
  csvData,
  fileName,
  isUploading,
  isParsing = false,
  onFileUpload,
  onGoogleSheetsDataLoaded,
  onClearData,
  selectedInputColumns,
  onInputColumnsChange
}: DataInputTabsProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'sheets' | 'context'>('csv')

  // Determine which tab should show data based on source
  // Show preview in the active tab if data exists and has rows
  const showCSVPreview = csvData && csvData.rows.length > 0 && !isUploading && !isParsing && activeTab === 'csv'
  const showSheetsPreview = csvData && csvData.rows.length > 0 && !isUploading && !isParsing && activeTab === 'sheets'
  
  // Track data source to determine which tab should be active when data loads
  const [dataSource, setDataSource] = useState<'csv' | 'sheets' | null>(null)
  
  // Auto-switch to appropriate tab when data loads
  useEffect(() => {
    if (csvData && !dataSource) {
      // Infer source from filename or default to CSV
      if (fileName?.includes('google-sheet') || fileName?.includes('sheet')) {
        setDataSource('sheets')
        setActiveTab('sheets')
      } else {
        setDataSource('csv')
        setActiveTab('csv')
      }
    }
  }, [csvData, fileName, dataSource])

  const handleContextFileSelected = useCallback((data: ParsedCSV, fileName: string) => {
    // Treat it like Google Sheets data load - sets CSV data
    // The fileName will be preserved in the data object
    onGoogleSheetsDataLoaded({
      ...data,
      filename: fileName,
    })
    setDataSource('context')
    setActiveTab('context')
  }, [onGoogleSheetsDataLoaded])

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'csv' | 'sheets' | 'context')} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="csv" className="flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" />
          CSV Upload
        </TabsTrigger>
        <TabsTrigger value="sheets" className="flex items-center gap-2">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Google Sheets
        </TabsTrigger>
        <TabsTrigger value="context" className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5" />
          From Context
        </TabsTrigger>
      </TabsList>

      <TabsContent value="csv" className="mt-3">
        <CSVUploadTab
          csvData={showCSVPreview ? csvData : null}
          fileName={activeTab === 'csv' ? fileName : undefined}
          isUploading={(isUploading || isParsing) && activeTab === 'csv'}
          onFileUpload={onFileUpload}
          selectedInputColumns={selectedInputColumns}
          onInputColumnsChange={onInputColumnsChange}
        />
      </TabsContent>

      <TabsContent value="sheets" className="mt-3">
        <GoogleSheetsUrlTab
          csvData={showSheetsPreview ? csvData : null}
          fileName={activeTab === 'sheets' ? fileName : undefined}
          isUploading={isUploading && activeTab === 'sheets'}
          onDataLoaded={onGoogleSheetsDataLoaded}
          onClearData={onClearData}
          selectedInputColumns={selectedInputColumns}
          onInputColumnsChange={onInputColumnsChange}
        />
      </TabsContent>

      <TabsContent value="context" className="mt-3">
        <ContextFilesTab
          csvData={csvData && activeTab === 'context' ? csvData : null}
          fileName={activeTab === 'context' ? fileName : undefined}
          isUploading={isUploading && activeTab === 'context'}
          onFileSelected={handleContextFileSelected}
          selectedInputColumns={selectedInputColumns}
          onInputColumnsChange={onInputColumnsChange}
        />
      </TabsContent>
    </Tabs>
  )
})


