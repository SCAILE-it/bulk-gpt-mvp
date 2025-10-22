# 🚀 BULK GPT - Model-Driven Build Orchestration

**Status:** 🟢 Ready to Build  
**Method:** HumanLayer Orchestration + Agent-Led Development  
**Philosophy:** I prompt → Models code → I review → Next task  

---

## 📊 Overall Plan

**9 Tasks** → **15 Hours of Model Time** → **Production App**

```
Infrastructure (✅ COMPLETE)
    ↓
Task 3: CSV Upload     (2 hrs - Qwen-32B)
    ↓
Task 4: Gemini API     (3 hrs - Parallel: DeepSeek-33B + Qwen-32B)
    ↓
Task 5: Batch Process  (3 hrs - Parallel: DeepSeek-33B + Qwen-32B)
    ↓
Task 6: Results Table  (2 hrs - Qwen-32B)
    ↓
Task 7: Download Exp.  (2 hrs - Qwen-32B)
    ↓
Task 8: Error Handle   (2 hrs - Qwen-32B)
    ↓
Task 9: Testing       (2 hrs - Qwen-32B)
    ↓
✅ DEPLOYED ON VERCEL
```

---

## 🎯 Current: TASK 3 - CSV Upload Component

**Status:** 📋 Prompt Ready (copy-paste to Continue.dev)  
**File:** `TASK_PROMPTS/TASK_3_CSV_UPLOAD.md`  
**Model:** Qwen-32B  
**Time:** 2 hours

### What Model Will Build
- `components/upload/csv-upload.tsx` (main component)
- `components/upload/csv-preview.tsx` (preview table)
- `components/upload/__tests__/csv-upload.test.tsx` (10 tests)

### How to Execute

**Option 1: Use Continue.dev (Recommended)**
```bash
# 1. Open VS Code
# 2. Press Cmd+L
# 3. Copy-paste entire content from TASK_PROMPTS/TASK_3_CSV_UPLOAD.md
# 4. Model generates code
# 5. Review and approve
```

**Option 2: Use Local Coding**
```bash
cd bulk-gpt-app
npm run dev

# Read TASK_PROMPTS/TASK_3_CSV_UPLOAD.md
# Implement components following TDD
# Run tests: npm test
```

### Review Criteria (After Task 3)
- ✅ All 10 tests passing
- ✅ 80%+ code coverage
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Components accessible
- ✅ Drag-drop works
- ✅ File validation works

---

## 🔄 How This Works

### The Cycle (Repeats for Each Task)

```
1. 📋 I Create Prompt
   └─ Detailed spec
   └─ Test file (TDD)
   └─ Requirements
   └─ Acceptance criteria

2. 🤖 Model Executes
   └─ Reads prompt
   └─ Writes tests first
   └─ Implements code
   └─ Runs validation

3. 👁️ I Review Output
   └─ Check tests pass
   └─ Check coverage
   └─ Check types
   └─ Check functionality

4. ✅ Approve & Commit
   └─ All good → next task
   └─ Issues → refine + retry

5. 🔁 Repeat for Tasks 4-9
```

---

## 📝 Task Prompts Created

| Task | File | Status | Model | Time |
|------|------|--------|-------|------|
| 3 | `TASK_3_CSV_UPLOAD.md` | 📋 Ready | Qwen-32B | 2h |
| 4 | `TASK_4_GEMINI.md` | ⏳ Next | DeepSeek+Qwen | 3h |
| 5 | `TASK_5_BATCH.md` | ⏳ Next | DeepSeek+Qwen | 3h |
| 6 | `TASK_6_RESULTS.md` | ⏳ Next | Qwen-32B | 2h |
| 7 | `TASK_7_EXPORT.md` | ⏳ Next | Qwen-32B | 2h |
| 8 | `TASK_8_ERRORS.md` | ⏳ Next | Qwen-32B | 2h |
| 9 | `TASK_9_TESTS.md` | ⏳ Next | Qwen-32B | 2h |

---

## 🚀 To Start Task 3

### Step 1: Copy Prompt
```bash
# Read the complete task prompt
cat TASK_PROMPTS/TASK_3_CSV_UPLOAD.md
```

### Step 2: Option A - Use Continue.dev
```
1. Open VS Code (bulk-gpt-app project)
2. Press Cmd+L
3. Paste entire TASK_3_CSV_UPLOAD.md content
4. Hit enter
5. Model will generate code
```

### Step 3: Option B - Manual Implementation
```bash
cd bulk-gpt-app
npm run dev

# Create test file as specified in prompt
# Create components to pass tests
# Run: npm test -- csv-upload.test.tsx
# When passing → ready for next task
```

### Step 4: Validate
```bash
npm test              # All tests pass?
npm run type-check    # Type errors?
npm run lint          # Lint errors?
```

### Step 5: When Complete
```bash
git add .
git commit -m "feat: csv upload component (task 3)"
```

---

## 💡 Key Principles

### 1. **TDD First**
- Model writes tests first
- Tests define the contract
- Implementation follows tests
- Ensures quality

### 2. **Reuse Infrastructure**
- `lib/csv-parser.ts` - already built
- `lib/supabase.ts` - already built
- `lib/types.ts` - already built
- Don't reinvent

### 3. **Use shadcn/ui**
- Don't build custom components
- Use existing button, card, alert
- Faster, tested, accessible

### 4. **Type Everything**
- TypeScript strict mode
- No `any` types
- Proper error handling
- Type-safe APIs

### 5. **Test Coverage 80%+**
- Every task must hit 80%
- Required for production
- Enforced by CI/CD

---

## 📊 Progress Tracking

### Current State
```
Infrastructure:   ✅ 100% (800+ LOC)
Documentation:    ✅ 100%
Orchestration:    ✅ 100%
Task 3 Prompt:    ✅ 100% Ready
```

### After Task 3
```
CSV Upload:       ✅ 100% (component built)
Tests:            ✅ 10/10 passing
Coverage:         ✅ 80%+ verified
Ready for Task 4: ✅ Yes
```

### After All 9 Tasks
```
Full App:         ✅ 100%
Tests:            ✅ 80%+ coverage
Types:            ✅ Strict mode
Ready for Deploy: ✅ Vercel
```

---

## 🔍 Quality Gates (Each Task)

✅ **Must Pass Before Next Task:**

1. **Tests Passing**
   ```bash
   npm test -- [task-component].test.tsx
   ```

2. **Type Safety**
   ```bash
   npm run type-check
   ```

3. **Code Quality**
   ```bash
   npm run lint
   ```

4. **Coverage > 80%**
   ```bash
   npm test -- --coverage
   ```

5. **No Console Warnings**
   - Check browser console
   - Check build warnings

---

## 🎯 Success Criteria

**For Each Task:**
- ✅ All tests passing
- ✅ Coverage >= 80%
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Functionality works
- ✅ Accessible (WCAG)
- ✅ Ready for next task

**For Full App:**
- ✅ 9/9 tasks complete
- ✅ 80%+ overall coverage
- ✅ All integrations work
- ✅ Can deploy to Vercel
- ✅ Production ready

---

## 📞 If Model Generates Issues

**Scenario 1: Tests failing**
```
→ Review the test requirements
→ Ask model to debug specific test
→ Rerun: npm test
```

**Scenario 2: TypeScript errors**
```
→ Run: npm run type-check
→ Share errors with model
→ Ask for fixes
```

**Scenario 3: Tests but no implementation**
```
→ Model only wrote tests, not code
→ Share specific test names failing
→ Ask model to implement
```

**Scenario 4: Code works locally, fails in CI**
```
→ Share exact error from CI
→ Ask model to fix
→ Rerun validation
```

---

## 🎬 Ready to Start?

### Next Steps

1. **Read the Task 3 Prompt**
   ```bash
   cat TASK_PROMPTS/TASK_3_CSV_UPLOAD.md
   ```

2. **Choose Execution Method**
   - Option A: Copy to Continue.dev
   - Option B: Manual implementation

3. **Let Model Build**
   - Generate code
   - Run tests
   - Pass validation

4. **Review Output**
   - Tests passing? ✅
   - Coverage > 80%? ✅
   - No errors? ✅

5. **Approve & Move Forward**
   - Commit to git
   - Proceed to Task 4

---

## 📈 Timeline

**Phase 1: Setup** (✅ COMPLETE)
- Infrastructure: 800+ LOC
- Configuration: Done
- Documentation: Done

**Phase 2: MVP Build** (🔄 IN PROGRESS - Task 3)
- Task 3-6: Frontend features (9 hours)
- Task 7-9: API + Testing (6 hours)

**Phase 3: Deploy** (⏳ NEXT)
- Configure Vercel
- Deploy app
- Test in production

**Total Time:** ~15 hours of model coding

---

## ✨ What You Get at The End

✅ Production-grade Bulk GPT app  
✅ Full type safety (TypeScript strict)  
✅ 80%+ test coverage  
✅ All features working  
✅ Deployed on Vercel  
✅ Ready for users  
✅ Cost: $0.80 per build (vs $3,000+ for Claude)  

---

**🚀 Ready to build? Start with Task 3!**

Next file: `TASK_PROMPTS/TASK_3_CSV_UPLOAD.md`


