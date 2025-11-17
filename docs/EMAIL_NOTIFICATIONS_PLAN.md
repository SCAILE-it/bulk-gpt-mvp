# Email Notification System Implementation Plan

## Overview
Implement email notifications using Resend to notify users about batch processing status, scheduled run results, and system events.

## Current State Analysis

### Existing Infrastructure
1. **Webhook Endpoint** (`/api/webhook/modal-callback`)
   - Receives batch completion callbacks from Modal
   - Updates batch status in database
   - Stores batch results
   - **No email notifications currently sent**

2. **Batch Status Endpoint** (`/api/batch/[batchId]-status/status`)
   - Returns batch status and results
   - Used by frontend for polling
   - **No email notifications**

3. **Scheduled Runs**
   - Execution endpoint (`/api/schedules/[id]/execute`)
   - Cron job execution (`/api/cron/execute-schedules`)
   - **No email notifications for scheduled runs**

### User Data Available
- User email from Supabase Auth (`auth.users.email`)
- Batch information (status, results, errors)
- Schedule information (name, cron, last run status)

## Implementation Plan

### Phase 1: Resend Setup & Infrastructure

#### 1.1 Install Dependencies
```bash
npm install resend
```

#### 1.2 Environment Variables
Add to `.env.local` and Vercel:
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Bulk GPT
```

#### 1.3 Resend Client Utility
Create `lib/email/resend.ts`:
- Initialize Resend client
- Helper functions for sending emails
- Error handling and logging

#### 1.4 Email Templates
Create React Email templates:
- `components/emails/BatchCompleteEmail.tsx`
- `components/emails/BatchFailedEmail.tsx`
- `components/emails/ScheduleRunCompleteEmail.tsx`
- `components/emails/ScheduleRunFailedEmail.tsx`
- `components/emails/WelcomeEmail.tsx` (optional)

### Phase 2: Notification Types

#### 2.1 Batch Processing Notifications
**Trigger Points:**
- Batch completed successfully
- Batch completed with errors
- Batch failed
- Batch processing started (optional)

**Email Content:**
- Batch name/filename
- Status (completed/failed/errors)
- Total rows processed
- Success/error count
- Link to view results in dashboard
- Download link for results (optional)

**Integration Points:**
- `/api/webhook/modal-callback` - Send email after batch completion
- `/api/process` - Send email when batch starts (optional)

#### 2.2 Scheduled Run Notifications
**Trigger Points:**
- Scheduled run completed successfully
- Scheduled run failed
- Scheduled run started (optional)

**Email Content:**
- Schedule name
- Execution time
- Status (success/failed)
- Batch ID (link to results)
- Error message (if failed)
- Next run time

**Integration Points:**
- `/api/schedules/[id]/execute` - Send email after execution

#### 2.3 System Notifications
**Trigger Points:**
- Usage limit reached
- Account limits warning
- API key expiration (if applicable)
- System maintenance (manual)

### Phase 3: User Preferences

#### 3.1 Database Schema
Create `user_notification_preferences` table:
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Batch notifications
  batch_completed BOOLEAN DEFAULT true,
  batch_failed BOOLEAN DEFAULT true,
  batch_started BOOLEAN DEFAULT false,
  
  -- Schedule notifications
  schedule_completed BOOLEAN DEFAULT true,
  schedule_failed BOOLEAN DEFAULT true,
  
  -- System notifications
  usage_limit_reached BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT true,
  
  -- Email frequency
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 3.2 UI for Preferences
- Settings page section for email preferences
- Toggle switches for each notification type
- Frequency selector (immediate/daily/weekly/never)

### Phase 4: Email Service Implementation

#### 4.1 Email Service Module
Create `lib/email/email-service.ts`:
- `sendBatchCompleteEmail(userId, batchId, status)`
- `sendBatchFailedEmail(userId, batchId, error)`
- `sendScheduleRunEmail(userId, scheduleId, status)`
- `sendUsageLimitEmail(userId, limitType)`
- `checkUserPreferences(userId, notificationType)` - Check if user wants this notification

#### 4.2 Email Template System
- Use React Email for templates
- Consistent branding
- Responsive design
- Dark mode support
- Action buttons (View Results, View Dashboard)

#### 4.3 Error Handling
- Retry logic for failed sends
- Logging to database (email_logs table)
- Fallback to in-app notifications if email fails
- Rate limiting to prevent spam

### Phase 5: Integration Points

#### 5.1 Webhook Integration
**File:** `app/api/webhook/modal-callback/route.ts`
- After batch status update
- Check user preferences
- Send appropriate email based on status

#### 5.2 Schedule Execution Integration
**File:** `app/api/schedules/[id]/execute/route.ts`
- After schedule execution completes
- Check user preferences
- Send email with results

#### 5.3 Usage Limits Integration
**File:** `lib/api-keys.ts` or `middleware/rateLimits.ts`
- When limit reached
- Send warning email
- Include reset time and upgrade options

### Phase 6: Email Logging & Analytics

#### 6.1 Email Logs Table
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  resend_message_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2 Analytics
- Track email open rates (via Resend webhooks)
- Track click rates
- Monitor delivery failures
- User engagement metrics

### Phase 7: Advanced Features (Future)

#### 7.1 Email Digest
- Daily/weekly summary of all batches
- Aggregated statistics
- Links to all batches

#### 7.2 Smart Notifications
- Only notify on significant events
- Suppress notifications for small batches
- Adaptive frequency based on user activity

#### 7.3 Email Templates Customization
- Allow users to customize email templates
- Brand colors/logos
- Custom footer

## Technical Implementation Details

### Resend Setup
1. Create Resend account
2. Verify sending domain
3. Get API key
4. Set up DNS records (SPF, DKIM, DMARC)

### React Email Setup
```bash
npm install @react-email/components @react-email/render
```

### Email Template Structure
```
components/emails/
  ├── layouts/
  │   ├── EmailLayout.tsx (base layout)
  │   └── EmailHeader.tsx
  ├── BatchCompleteEmail.tsx
  ├── BatchFailedEmail.tsx
  ├── ScheduleRunEmail.tsx
  └── UsageLimitEmail.tsx
```

### API Routes
- `/api/email/test` - Test email sending (dev only)
- `/api/email/preferences` - Get/update user preferences
- `/api/webhook/resend` - Resend webhook for tracking opens/clicks

## Security Considerations

1. **Rate Limiting**
   - Max emails per user per day
   - Max emails per hour
   - Prevent abuse

2. **Authentication**
   - Verify user owns the batch/schedule before sending
   - Validate email addresses
   - Sanitize email content

3. **Privacy**
   - Don't include sensitive data in emails
   - Use secure links with tokens
   - Respect user preferences

4. **Compliance**
   - Include unsubscribe link
   - GDPR compliance (opt-in/opt-out)
   - CAN-SPAM compliance

## Testing Strategy

1. **Unit Tests**
   - Email template rendering
   - Preference checking logic
   - Email service functions

2. **Integration Tests**
   - End-to-end email sending
   - Webhook integration
   - Preference updates

3. **Manual Testing**
   - Test all email templates
   - Verify links work
   - Check responsive design
   - Test unsubscribe flow

## Rollout Plan

### Phase 1: MVP (Week 1)
- ✅ Resend setup
- ✅ Basic email templates
- ✅ Batch completion emails
- ✅ Batch failure emails

### Phase 2: Scheduled Runs (Week 2)
- ✅ Schedule execution emails
- ✅ Schedule failure emails

### Phase 3: Preferences (Week 3)
- ✅ User preferences UI
- ✅ Preference checking logic
- ✅ Email frequency options

### Phase 4: Polish (Week 4)
- ✅ Email logging
- ✅ Error handling
- ✅ Analytics integration
- ✅ Documentation

## Success Metrics

1. **Delivery Rate**: > 95% emails delivered
2. **Open Rate**: Track via Resend analytics
3. **Click Rate**: Track link clicks
4. **User Satisfaction**: Low unsubscribe rate
5. **Error Rate**: < 1% email sending failures

## Dependencies

- `resend` - Email sending service
- `@react-email/components` - Email template components
- `@react-email/render` - Render React to HTML
- Resend account with verified domain

## Next Steps

1. Review and approve this plan
2. Set up Resend account and domain
3. Install dependencies
4. Create email templates
5. Implement email service
6. Integrate with existing endpoints
7. Add user preferences UI
8. Test thoroughly
9. Deploy and monitor

