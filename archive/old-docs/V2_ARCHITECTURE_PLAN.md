# 🏗️ V2 ARCHITECTURE PLAN

**Status:** Ready to start parallel development  
**Timeline:** 4 weeks (while v1 serves users)  
**Goal:** Refactor to 9.2/10 code quality

---

## 🎯 V2 Architecture Overview

```
Current (v1):                      Target (v2):
BulkProcessor.tsx                  /components
  (621 lines)                        BulkProcessor.tsx (50 lines)
  - Everything                       FileUploadZone.tsx
                                     PromptConfigurator.tsx
                                     ResultsTable.tsx
                                     BatchProgress.tsx
                                   
                                   /hooks
                                     useFileUpload.ts
                                     useCSVParser.ts
                                     useBatchProcessor.ts
                                     useKeyboardShortcuts.ts
                                   
                                   /services
                                     api.service.ts
                                     batch.service.ts
                                     csv.service.ts
                                     export.service.ts
                                   
                                   /store
                                     batchStore.ts
                                     uiStore.ts
                                     resultStore.ts
```

---

## 📋 Week-by-Week Breakdown

### Week 1: Service Extraction
**Branch:** `feat/v2-services`

#### Day 1-2: File Upload Service
```typescript
// hooks/useFileUpload.ts
export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const upload = useCallback(async (file: File) => {
    // All upload logic extracted
  }, [])
  
  return { file, error, isUploading, upload }
}
```

#### Day 3-4: CSV Parser Service
```typescript
// services/csv.service.ts
export class CSVService {
  async parse(file: File): Promise<ParsedCSV> {
    // Web Worker implementation
    // Streaming for large files
    // Auto-detect delimiter
  }
  
  async validate(data: ParsedCSV): Promise<ValidationResult> {
    // Column validation
    // Data type detection
  }
}
```

#### Day 5: API Service Layer
```typescript
// services/api.service.ts
export class APIService {
  private client: AxiosInstance
  
  async createBatch(data: CreateBatchDTO): Promise<Batch> {
    // Retry logic
    // Error handling
    // Rate limit handling
  }
  
  async streamResults(batchId: string): EventSource {
    // Streaming abstraction
  }
}
```

---

### Week 2: State Management
**Branch:** `feat/v2-state`

#### Zustand Stores
```typescript
// store/batchStore.ts
interface BatchState {
  batches: Map<string, Batch>
  currentBatchId: string | null
  
  createBatch: (data: CreateBatchData) => Promise<void>
  updateBatchStatus: (id: string, status: BatchStatus) => void
  addResult: (batchId: string, result: Result) => void
}

export const useBatchStore = create<BatchState>((set, get) => ({
  // Implementation
}))
```

---

### Week 3: UI Components
**Branch:** `feat/v2-components`

#### Component Breakdown
```typescript
// components/bulk/FileUploadZone.tsx
export function FileUploadZone() {
  const { upload, file, error } = useFileUpload()
  const { parse } = useCSVParser()
  
  // Just UI, no business logic
}

// components/bulk/ResultsTable.tsx
export function ResultsTable() {
  const results = useBatchStore(state => state.currentResults)
  const { exportCSV } = useExport()
  
  // Pure presentation
}
```

---

### Week 4: Testing & Migration
**Branch:** `feat/v2-testing`

#### Test Coverage Goals
- Unit tests: 80% coverage
- Integration tests: Critical paths
- E2E tests: Main user flows

---

## 🔄 Migration Strategy

### Phase 1: Shadow Mode (Week 1-2)
```typescript
// Feature flag both implementations
if (features.useNewFileUpload) {
  const result = await newUploadService.upload(file)
  // Also run old code and compare results
  const oldResult = await oldUpload(file)
  logDifference(result, oldResult)
}
```

### Phase 2: Gradual Rollout (Week 3)
```typescript
// 10% of users get new architecture
if (isFeatureEnabledForUser('useServiceLayer', userId, 10)) {
  return <BulkProcessorV2 />
}
```

### Phase 3: Full Migration (Week 4)
- Monitor metrics
- Increase rollout percentage
- Full switch at 0 errors

---

## 📊 Success Metrics

### Code Quality
- [ ] BulkProcessor.tsx < 100 lines
- [ ] No component > 200 lines
- [ ] All SOLID principles followed
- [ ] 80% test coverage

### Performance
- [ ] Initial load < 1s
- [ ] CSV parse < 100ms/MB
- [ ] Zero memory leaks
- [ ] Smooth 60fps scrolling

### Maintainability
- [ ] New developer onboarding < 1 hour
- [ ] Add new feature < 2 hours
- [ ] Fix bug < 30 minutes
- [ ] Deploy confidence > 95%

---

## 🛠️ Technical Decisions

### Why Zustand over Redux?
- Simpler API
- Less boilerplate
- Better TypeScript support
- Smaller bundle size

### Why Services over Direct API?
- Testability
- Reusability
- Error handling
- Caching layer ready

### Why Feature Flags?
- Safe rollout
- Quick rollback
- A/B testing ready
- User-specific features

---

## 🚀 Getting Started

### Tomorrow (Day 1):
```bash
# Create v2 branch
git checkout -b feat/v2-architecture

# Create folder structure
mkdir -p hooks services store components/bulk/v2

# Start with useFileUpload
touch hooks/useFileUpload.ts
touch hooks/__tests__/useFileUpload.test.ts
```

### First PR Goal:
- Extract file upload logic
- Full test coverage
- Feature flag integration
- Side-by-side comparison

---

## 📈 Rollout Timeline

**Week 1:** Internal testing only  
**Week 2:** 5% of beta users  
**Week 3:** 25% of users  
**Week 4:** 100% migration  

---

## ✅ Definition of Done

Each refactored component must:
1. Have 80% test coverage
2. Follow SOLID principles
3. Be under 200 lines
4. Have proper TypeScript types
5. Include usage documentation
6. Pass performance benchmarks

---

## 🎯 End Goal

Transform this:
```
"Spaghetti code that works"
```

Into this:
```
"Architecture that scales"
```

While keeping users happy with zero downtime. 🚀



