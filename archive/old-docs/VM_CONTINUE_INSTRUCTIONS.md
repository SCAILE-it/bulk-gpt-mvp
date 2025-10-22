# 🚀 VM SETUP INSTRUCTIONS - CONTINUE V2 WORK

**Status:** ✅ Code pushed to GitHub  
**Branch:** `feat/v2-file-upload-hook`  
**Next:** SSH to VM and continue V2 extraction

---

## 📦 What's Ready on GitHub

**Commit:** `92b7ab1`  
**Branch:** `feat/v2-file-upload-hook`  
**URL:** https://github.com/SCAILE-it/bulk-gpt-mvp/tree/feat/v2-file-upload-hook

### Phase 1 Complete (Deployed):
- ✅ Rate limiting middleware
- ✅ Error boundaries  
- ✅ Analytics foundation
- ✅ Beta banner
- ✅ Feature flags

### V2 WIP (Need to finish):
- ✅ `hooks/useFileUpload.ts` created
- ✅ `hooks/__tests__/useFileUpload.test.ts` created
- ⏳ Need to test on VM
- ⏳ Need to integrate into BulkProcessor
- ⏳ Need to verify with feature flag

---

## 🔧 VM SETUP (3 Steps)

### Step 1: SSH to VM
```bash
ssh federicodeponte@34.78.185.56
```

### Step 2: Clone or Pull Project
```bash
# If project doesn't exist on VM:
cd ~/projects
git clone https://github.com/SCAILE-it/bulk-gpt-mvp.git bulk-gpt-app
cd bulk-gpt-app

# If project exists:
cd ~/projects/bulk-gpt-app
git fetch origin
git checkout feat/v2-file-upload-hook
git pull origin feat/v2-file-upload-hook
```

### Step 3: Install Dependencies
```bash
npm install
```

---

## ✅ VERIFY SETUP

```bash
# Check branch
git branch --show-current
# Should show: feat/v2-file-upload-hook

# Check files exist
ls hooks/useFileUpload.ts
ls hooks/__tests__/useFileUpload.test.ts

# Check Node version
node --version
# Should be: v20.x or higher
```

---

## 🎯 CONTINUE V2 WORK (On VM)

### Task 1: Run Tests
```bash
npm test hooks/__tests__/useFileUpload.test.ts
```

Expected: Tests should pass (or show what needs fixing)

### Task 2: Type Check
```bash
npm run type-check 2>&1 | grep "hooks/"
```

Expected: No errors in hooks/ folder

### Task 3: Integrate Hook
Edit `components/bulk/BulkProcessor.tsx` to use the new hook

### Task 4: Feature Flag
Verify feature flag system works

### Task 5: Test Integration
Run dev server and test file upload

---

## 🚀 ONCE ON VM, SAY:

**"I'm on VM, ready to continue"**

And I'll guide you through:
1. Testing the hook
2. Fixing any issues
3. Integrating into BulkProcessor
4. Completing V2 extraction #1

---

## 📊 V2 PROGRESS TRACKER

```
Week 1: Hooks Extraction
├─ Day 1: useFileUpload ⏳ 60% (on VM now)
├─ Day 2: useCSVParser ⏳ 0%
├─ Day 3: useBatchProcessor ⏳ 0%
├─ Day 4: useStreamingResults ⏳ 0%
└─ Day 5: Review & testing ⏳ 0%

Current: Continuing Day 1 on VM
```

---

## 🎬 READY TO GO!

1. **You:** SSH to VM
2. **You:** Pull the code
3. **You:** Say "I'm on VM"
4. **Me:** Continue V2 extraction

**VM is the new home. Let's ship v2!** 🚀

