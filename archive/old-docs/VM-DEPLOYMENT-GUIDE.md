# Bulk GPT App - VM Deployment Guide

## ✅ Deployment Status: SUCCESSFUL

The bulk-gpt-app project has been deployed to your GCP VM at **34.78.185.56** and is running successfully.

---

## 📋 Deployment Summary

**VM Details:**
- IP Address: `34.78.185.56`
- Port: `3010`
- User: `federicodeponte`
- Project Path: `/home/federicodeponte/bulk-gpt-app`

**Server Status:**
- ✅ Code synced to VM
- ✅ Dependencies installed
- ✅ `.env.local` configured
- ✅ Dev server running on port 3010
- ✅ Server responding correctly (HTTP 307 redirect to /auth)

**Logs Location:**
```bash
/tmp/bulk-gpt-dev-3010.log
```

---

##  🌐 Access Methods

### Option 1: SSH Tunnel (Recommended - Works Now)

Create an SSH tunnel to access the app on your local machine:

```bash
# Open SSH tunnel
ssh -i ~/.ssh/google_compute_engine -L 3010:localhost:3010 federicodeponte@34.78.185.56

# Keep this terminal open, then access:
# http://localhost:3010
```

**Access URLs via tunnel:**
- Main app: http://localhost:3010
- Auth page: http://localhost:3010/auth
- Wizard: http://localhost:3010/wizard

---

### Option 2: Direct External Access (Requires Firewall Configuration)

**Current Status:** ❌ Blocked by GCP firewall

**To enable direct external access:**

1. **Via GCP Console (Web UI):**
   - Go to: https://console.cloud.google.com/networking/firewalls
   - Click "CREATE FIREWALL RULE"
   - Name: `allow-bulk-gpt-3010`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances in the network
   - Source IP ranges: `0.0.0.0/0` (or restrict to your IP)
   - Protocols and ports: `tcp:3010`
   - Click "CREATE"

2. **Via gcloud CLI** (if Compute API is enabled):
   ```bash
   gcloud compute firewall-rules create allow-bulk-gpt-3010 \
     --allow tcp:3010 \
     --source-ranges 0.0.0.0/0 \
     --description "Allow access to Bulk GPT app on port 3010"
   ```

**Once configured, access directly at:**
- http://34.78.185.56:3010

---

## 🔧 Management Commands

### View Server Logs
```bash
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "tail -f /tmp/bulk-gpt-dev-3010.log"
```

### Restart Server
```bash
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "lsof -ti:3010 | xargs kill -9; cd /home/federicodeponte/bulk-gpt-app && nohup npm run dev -- -p 3010 > /tmp/bulk-gpt-dev-3010.log 2>&1 &"
```

### Check Server Status
```bash
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "curl -I http://localhost:3010"
```

### Update Code on VM
```bash
# From your local machine, run the deployment script:
/tmp/deploy-bulk-gpt-to-vm.sh
```

### SSH into VM
```bash
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56
```

---

## 📁 Project Structure on VM

```
/home/federicodeponte/bulk-gpt-app/
├── app/                    # Next.js pages (wizard, auth)
├── components/             # React components
├── modal-processor/        # Python backend (Modal.com)
├── .env.local             # Environment variables
├── package.json           # Dependencies
├── node_modules/          # Installed packages
└── .next/                 # Build cache
```

---

## 🔑 Credentials & Configuration

**Demo Credentials:**
- Email: `test@example.com`
- Password: `password`

**Environment Variables:**
All configuration from local `.env.local` has been synced to VM.

---

## 🚀 Testing the Deployment

### 1. Via SSH Tunnel (Quick Test)
```bash
# Terminal 1: Open tunnel
ssh -i ~/.ssh/google_compute_engine -L 3010:localhost:3010 federicodeponte@34.78.185.56

# Terminal 2: Test access
curl -I http://localhost:3010
# Should return: HTTP/1.1 307 Temporary Redirect

# Browser: Open http://localhost:3010
```

### 2. Full Wizard Flow Test
```bash
# Run the complete flow test (already created)
node test-complete-flow.js
```

---

## 📊 Backend Integration Status

**✅ Fully Integrated and Working:**

1. **Gemini 2.5 Flash Model**
   - Updated from experimental model
   - 1000 requests/min quota (100x improvement)
   - Deployed to Modal.com

2. **Supabase Database**
   - Live production database
   - Real batch processing data
   - Tables: `batches`, `batch_results`

3. **Modal Processor**
   - URL: https://scaile--bulk-gpt-processor-mvp-fastapi-app.modal.run
   - Processing batches successfully
   - Recent batch: 19/19 rows processed with 100% success rate

---

## 🎯 What Works Right Now

✅ Complete wizard flow (Upload → Configure → Results)
✅ Auth redirect and sign-in
✅ CSV file upload and preview
✅ Prompt configuration
✅ Test mode (5 rows) and Full mode
✅ Batch processing with Gemini 2.5 Flash
✅ Real-time progress monitoring
✅ Results table with filtering
✅ CSV export functionality
✅ Supabase database integration
✅ Modal.com processor integration

---

## 🐛 Troubleshooting

### Server not responding
```bash
# Check if process is running
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "lsof -i:3010"

# Check logs
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "tail -50 /tmp/bulk-gpt-dev-3010.log"

# Restart server
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "pkill -f 'next dev'; cd /home/federicodeponte/bulk-gpt-app && npm run dev -- -p 3010 > /tmp/bulk-gpt-dev-3010.log 2>&1 &"
```

### Port already in use
```bash
# Kill process on port 3010
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "lsof -ti:3010 | xargs kill -9"
```

### Code changes not reflecting
```bash
# Sync latest code
rsync -avz --progress \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  -e "ssh -i ~/.ssh/google_compute_engine" \
  /Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/ \
  federicodeponte@34.78.185.56:/home/federicodeponte/bulk-gpt-app/

# Then restart server (see above)
```

---

## 📸 Screenshot Documentation

Screenshots from the complete wizard flow have been captured in:
```
/Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/test-screenshots-20251019-161605/
```

---

## ✅ Next Steps

1. **Enable external access** (optional):
   - Configure GCP firewall rule for port 3010
   - Or continue using SSH tunnel

2. **Production deployment** (when ready):
   - Set up production build (`npm run build`)
   - Use PM2 for process management
   - Configure nginx reverse proxy
   - Set up domain name
   - Enable HTTPS with Let's Encrypt

3. **Monitoring** (optional):
   - Set up logging aggregation
   - Configure uptime monitoring
   - Add error tracking (e.g., Sentry)

---

## 📞 Support

**View server logs:**
```bash
ssh -i ~/.ssh/google_compute_engine federicodeponte@34.78.185.56 "tail -f /tmp/bulk-gpt-dev-3010.log"
```

**Check this guide:**
```bash
cat /Users/federicodeponte/Downloads/local-coder/bulk-gpt-app/VM-DEPLOYMENT-GUIDE.md
```

**Quick access via SSH tunnel:**
```bash
ssh -i ~/.ssh/google_compute_engine -L 3010:localhost:3010 federicodeponte@34.78.185.56
# Then open http://localhost:3010 in browser
```

---

## 🎉 Deployment Complete!

Your bulk-gpt-app is now running on the VM at 34.78.185.56:3010.

**Access it now via SSH tunnel:**
```bash
ssh -i ~/.ssh/google_compute_engine -L 3010:localhost:3010 federicodeponte@34.78.185.56
```

Then open **http://localhost:3010** in your browser.
