# 🔨 REFACTORING ROADMAP - FROM MVP TO PRODUCTION

**Goal:** Transform 621-line monolith into scalable, testable, production-grade architecture  
**Timeline:** 3 weeks (alongside feature development)  
**Approach:** Incremental refactoring without breaking functionality

---

## 📦 TARGET ARCHITECTURE

```
bulk-gpt-app/
├── components/
│   ├── bulk/
│   │   ├── BulkProcessor.tsx (< 100 lines - orchestrator only)
│   │   ├── FileUpload/
│   │   │   ├── FileDropzone.tsx
│   │   │   ├── RecentFiles.tsx
│   │   │   └── index.ts
│   │   ├── PromptEditor/
│   │   │   ├── PromptEditor.tsx
│   │   │   ├── VariableAutocomplete.tsx
│   │   │   └── index.ts
│   │   ├── ResultsTable/
│   │   │   ├── ResultsTable.tsx
│   │   │   ├── ResultRow.tsx
│   │   │   ├── VirtualScroller.tsx
│   │   │   └── index.ts
│   │   └── StatusBar/
│   │       ├── StatusBar.tsx
│   │       ├── MetricsDisplay.tsx
│   │       └── index.ts
│   ├── ui/ (existing)
│   └── providers/
│       ├── ErrorBoundary.tsx
│       └── QueryProvider.tsx
├── hooks/
│   ├── useFileUpload.ts
│   ├── useBatchProcessor.ts
│   ├── useEventStream.ts
│   ├── useKeyboardShortcuts.ts
│   └── useLocalStorage.ts
├── services/
│   ├── api/
│   │   ├── client.ts (axios instance)
│   │   ├── batch.service.ts
│   │   └── token.service.ts
│   ├── csv/
│   │   ├── parser.service.ts
│   │   └── exporter.service.ts
│   └── storage/
│       └── localStorage.service.ts
├── stores/
│   ├── processor.store.ts (Zustand)
│   └── ui.store.ts
├── types/
│   ├── api.types.ts
│   ├── csv.types.ts
│   └── processor.types.ts
├── utils/
│   ├── errors.ts
│   └── validators.ts
└── __tests__/
    ├── components/
    ├── hooks/
    ├── services/
    └── integration/
```

---

## 🔄 REFACTORING PHASES

### PHASE 1: FOUNDATIONS (Week 1)

#### Day 1-2: Type Safety First
```typescript
// types/api.types.ts
export interface CreateBatchRequest {
  prompt: string
  csvData: CsvData
  outputColumns: string[]
  webhookUrl?: string
}

export interface BatchResponse {
  batchId: string
  status: BatchStatus
  createdAt: string
}

export interface StreamEvent {
  type: 'result' | 'progress' | 'complete' | 'error'
  data: unknown
}

// Discriminated unions for events
export type BatchEvent = 
  | { type: 'result'; data: ResultData }
  | { type: 'progress'; data: ProgressData }
  | { type: 'complete'; data: CompleteData }
  | { type: 'error'; data: ErrorData }
```

#### Day 3-4: Service Layer
```typescript
// services/api/batch.service.ts
export class BatchService {
  private client: AxiosInstance

  constructor(client: AxiosInstance) {
    this.client = client
  }

  async createBatch(data: CreateBatchRequest): Promise<BatchResponse> {
    const response = await this.client.post<BatchResponse>('/api/batch', data)
    return response.data
  }

  streamResults(batchId: string): EventSource {
    return new EventSource(`/api/batch/${batchId}/stream`)
  }
}

// services/csv/parser.service.ts
export class CsvParserService {
  async parse(file: File, options?: ParseOptions): Promise<ParsedCsv> {
    // Web Worker for large files
    if (file.size > 5 * 1024 * 1024) {
      return this.parseInWorker(file, options)
    }
    return this.parseInMainThread(file, options)
  }

  private async parseInWorker(file: File, options?: ParseOptions): Promise<ParsedCsv> {
    // Offload to Web Worker
  }
}
```

#### Day 5: State Management
```typescript
// stores/processor.store.ts
interface ProcessorState {
  // State
  file: File | null
  csvData: ParsedCsv | null
  batch: Batch | null
  results: Result[]
  isProcessing: boolean
  error: AppError | null

  // Actions
  setFile: (file: File) => void
  startProcessing: () => Promise<void>
  updateResult: (index: number, result: Result) => void
  reset: () => void
}

export const useProcessorStore = create<ProcessorState>((set, get) => ({
  // State
  file: null,
  csvData: null,
  batch: null,
  results: [],
  isProcessing: false,
  error: null,

  // Actions
  setFile: (file) => set({ file }),
  
  startProcessing: async () => {
    const { file, csvData } = get()
    if (!file || !csvData) return

    set({ isProcessing: true, error: null })

    try {
      const batch = await batchService.createBatch({...})
      set({ batch })
      // Start streaming...
    } catch (error) {
      set({ error: AppError.from(error), isProcessing: false })
    }
  },

  updateResult: (index, result) =>
    set((state) => ({
      results: state.results.map((r, i) => (i === index ? result : r)),
    })),

  reset: () => set({ file: null, csvData: null, batch: null, results: [] }),
}))
```

---

### PHASE 2: DECOMPOSITION (Week 2)

#### Custom Hooks
```typescript
// hooks/useFileUpload.ts
export const useFileUpload = () => {
  const { setFile, setCsvData } = useProcessorStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const upload = useCallback(async (file: File) => {
    setError(null)
    setIsLoading(true)

    try {
      // Validation
      const validation = validateCsvFile(file)
      if (!validation.isValid) {
        throw new ValidationError(validation.error)
      }

      // Parse
      const parsed = await csvParser.parse(file)
      
      setFile(file)
      setCsvData(parsed)
      
      // Track in recent files
      recentFilesService.add(file, parsed)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [setFile, setCsvData])

  return { upload, error, isLoading }
}

// hooks/useEventStream.ts
export const useEventStream = (batchId: string | null) => {
  const { updateResult, setProcessing } = useProcessorStore()
  
  useEffect(() => {
    if (!batchId) return

    const eventSource = batchService.streamResults(batchId)
    
    const handleEvent = (event: BatchEvent) => {
      switch (event.type) {
        case 'result':
          updateResult(event.data.index, event.data.result)
          break
        case 'complete':
          setProcessing(false)
          break
        // ...
      }
    }

    eventSource.onmessage = (e) => {
      const event = parseStreamEvent(e.data)
      handleEvent(event)
    }

    return () => eventSource.close()
  }, [batchId, updateResult, setProcessing])
}
```

#### Component Breakdown
```tsx
// components/bulk/BulkProcessor.tsx (< 100 lines!)
export default function BulkProcessor() {
  const { file, isProcessing } = useProcessorStore()
  
  useKeyboardShortcuts()
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950">
        <Header />
        <main className="grid grid-cols-[320px_1fr]">
          <Sidebar>
            <FileUpload />
            <PromptEditor />
            <OutputConfig />
            <ActionButtons />
          </Sidebar>
          <ResultsArea>
            {file ? <ResultsTable /> : <EmptyState />}
          </ResultsArea>
        </main>
        <StatusBar />
      </div>
    </ErrorBoundary>
  )
}

// components/bulk/FileUpload/FileDropzone.tsx
export const FileDropzone: FC = () => {
  const { upload, error, isLoading } = useFileUpload()
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && upload(files[0]),
    accept: { 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
  })

  return (
    <div className="space-y-2">
      <SectionHeader title="Dataset" />
      <div
        {...getRootProps()}
        className={dropzoneStyles({ isDragActive, hasFile: !!file })}
      >
        <input {...getInputProps()} />
        <DropzoneContent isDragActive={isDragActive} file={file} />
      </div>
      {error && <ErrorMessage message={error} />}
    </div>
  )
}
```

---

### PHASE 3: QUALITY & SCALE (Week 3)

#### Testing Strategy
```typescript
// __tests__/services/csv/parser.service.test.ts
describe('CsvParserService', () => {
  let service: CsvParserService

  beforeEach(() => {
    service = new CsvParserService()
  })

  describe('parse', () => {
    it('should parse valid CSV', async () => {
      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv')
      const result = await service.parse(file)
      
      expect(result.columns).toEqual(['name', 'email'])
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual({ name: 'John', email: 'john@example.com' })
    })

    it('should handle large files in worker', async () => {
      const largeFile = createLargeFile() // 10MB
      const spy = jest.spyOn(service, 'parseInWorker')
      
      await service.parse(largeFile)
      
      expect(spy).toHaveBeenCalled()
    })
  })
})

// __tests__/hooks/useFileUpload.test.ts
describe('useFileUpload', () => {
  it('should validate file before parsing', async () => {
    const { result } = renderHook(() => useFileUpload())
    const invalidFile = new File([''], 'test.txt')
    
    await act(async () => {
      await result.current.upload(invalidFile)
    })
    
    expect(result.current.error).toBe('Only CSV files are accepted')
  })
})
```

#### Error Boundaries
```tsx
// components/providers/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to Sentry/DataDog
    errorReporter.log(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

#### Performance Optimizations
```tsx
// components/bulk/ResultsTable/VirtualScroller.tsx
export const VirtualScroller: FC<Props> = ({ items, rowHeight = 40 }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  
  // React-window for 100k+ rows
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={rowHeight}
      width="100%"
    >
      {({ index, style }) => (
        <ResultRow key={index} result={items[index]} style={style} />
      )}
    </FixedSizeList>
  )
}
```

---

## 📊 METRICS FOR SUCCESS

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Largest Component | 621 lines | 95 lines | < 100 |
| Test Coverage | 0% | 85% | > 80% |
| Bundle Size | ? | -30% | < 200KB |
| Load Time | ? | < 1s | < 1s |
| Type Coverage | 40% | 98% | > 95% |
| Lighthouse Score | ? | 95+ | > 90 |

---

## 🚀 MIGRATION STRATEGY

### Week 1: No User Impact
- Extract types and services
- Add tests in parallel
- Keep UI unchanged

### Week 2: Progressive Enhancement  
- Replace internals incrementally
- Feature flag new components
- A/B test performance

### Week 3: Full Migration
- Switch all users to new architecture  
- Remove old code
- Monitor metrics

---

## ✅ DEFINITION OF DONE

**The refactoring is complete when:**

- [ ] No component > 100 lines
- [ ] 85%+ test coverage
- [ ] All TypeScript strict mode
- [ ] Error boundaries on all routes
- [ ] Performance budget met
- [ ] Monitoring in place
- [ ] Documentation complete
- [ ] Team onboarded

---

**Timeline:** 3 weeks alongside feature development  
**Risk:** Low (incremental approach)  
**ROI:** 10x developer velocity after completion




