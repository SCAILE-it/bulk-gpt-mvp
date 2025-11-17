# Current Navigation Structure - Before & After Archive

## CURRENT NAVIGATION (Active)

```
App Root
├── / (Home/Dashboard)
│   ├── Analytics Tab          ← TO ARCHIVE (but keep Executions)
│   └── Executions Tab         ← KEEP
│
├── /context
│   └── Context Files Management
│
├── /agents
│   ├── Agents List
│   └── /[agentId] - Individual Agent
│
├── /resources              ← TO ARCHIVE (entire page)
│   ├── Leads Tab
│   ├── Keywords Tab
│   ├── Content Tab
│   └── Campaigns Tab
│
├── /billing (part of profile)
│   └── Invoices
│
├── /profile
│   ├── Account Tab
│   ├── API Keys Tab        ← TO ARCHIVE (but keep other tabs)
│   ├── Usage Tab           ← KEEP
│   └── Billing Tab         ← KEEP
│
├── /schedules
│   └── Scheduled Runs
│
├── /admin (conditional - admin users only)
│   └── Admin Dashboard
│
└── /auth
    ├── Login/Signup
    └── Reset Password
```

---

## NAVIGATION STRUCTURE - AFTER ARCHIVE

```
App Root
├── / (Home/Dashboard)
│   └── Executions Tab       [Analytics tab removed]
│
├── /context
│   └── Context Files Management
│
├── /agents
│   ├── Agents List
│   └── /[agentId] - Individual Agent
│
├── /billing (part of profile)
│   └── Invoices
│
├── /profile
│   ├── Account Tab
│   ├── Usage Tab           [API Keys tab removed]
│   └── Billing Tab
│
├── /schedules
│   └── Scheduled Runs
│
├── /admin (conditional - admin users only)
│   └── Admin Dashboard
│
└── /auth
    ├── Login/Signup
    └── Reset Password
```

---

## NAVIGATION LINKS IN CODE

### Header Navigation (components/layout/nav.tsx)

#### CURRENT:
```typescript
const navLinks = [
  { href: '/context', label: 'CONTEXT' },
  { href: '/agents', label: 'AGENTS' },
  { href: '/resources', label: 'RESOURCES' },    // ← REMOVE THIS LINE
  { href: '/analytics', label: 'ANALYTICS' },     // ← REMOVE THIS LINE (but note: /analytics is actually a tab, not separate page)
  ...(userType === 'admin' ? [{ href: '/admin', label: 'ADMIN' }] : []),
]
```

#### AFTER ARCHIVE:
```typescript
const navLinks = [
  { href: '/context', label: 'CONTEXT' },
  { href: '/agents', label: 'AGENTS' },
  // { href: '/resources', label: 'RESOURCES' },    ← REMOVED
  // Note: /analytics is actually a tab on home page, not a separate link
  ...(userType === 'admin' ? [{ href: '/admin', label: 'ADMIN' }] : []),
]
```

---

## PROFILE PAGE TABS

### CURRENT (app/(authenticated)/profile/page.tsx):
```typescript
tabs={[
  {
    value: 'account',
    label: 'Account',
    icon: <User className="h-3.5 w-3.5" />,
    content: accountContent,
  },
  {
    value: 'api-keys',        // ← REMOVE THIS TAB
    label: 'API Keys',
    icon: <Key className="h-3.5 w-3.5" />,
    content: apiKeysContent,
  },
  {
    value: 'usage',
    label: 'Usage',
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    content: usageContent,
  },
  {
    value: 'billing',
    label: 'Billing',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    content: billingContent,
  },
]}
```

### AFTER ARCHIVE:
```typescript
tabs={[
  {
    value: 'account',
    label: 'Account',
    icon: <User className="h-3.5 w-3.5" />,
    content: accountContent,
  },
  // Removed API Keys tab
  {
    value: 'usage',
    label: 'Usage',
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    content: usageContent,
  },
  {
    value: 'billing',
    label: 'Billing',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    content: billingContent,
  },
]}
```

---

## HOME/DASHBOARD PAGE TABS

### CURRENT (app/(authenticated)/home/page.tsx):
```typescript
return (
  <PageWithTabs
    defaultValue="analytics"
    tabs={[
      {
        value: 'analytics',       // ← REMOVE THIS TAB
        label: 'Analytics',
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        content: analyticsContent,
      },
      {
        value: 'executions',      // ← KEEP THIS TAB
        label: 'Executions',
        icon: <Activity className="h-3.5 w-3.5" />,
        content: executionsContent,
      },
    ]}
  />
)
```

### AFTER ARCHIVE:
```typescript
return (
  <PageWithTabs
    defaultValue="executions"    // ← CHANGE DEFAULT TAB
    tabs={[
      // Removed Analytics tab
      {
        value: 'executions',      // ← NOW THE ONLY TAB
        label: 'Executions',
        icon: <Activity className="h-3.5 w-3.5" />,
        content: executionsContent,
      },
    ]}
  />
)
```

---

## MOBILE NAVIGATION

The mobile navigation uses the same `navLinks` array as desktop navigation, so removing the Resources link from `navLinks` will automatically remove it from mobile menu as well.

---

## USER MENU (Dropdown in Nav)

### CURRENT:
```
MY ACCOUNT
├── PROFILE
├── THEME (Light/Dark/System)
└── SIGN OUT
```

No changes needed - API Keys are accessed via Profile page tab, not user menu.

---

## IMPACT SUMMARY

### Navigation Links Affected:
- Main nav: 2 links removed (Resources, Analytics)
- Profile page: 1 tab removed (API Keys)
- Home page: 1 tab removed (Analytics)
- Default tab changed: home page defaults to Executions instead of Analytics

### Pages to Remove:
- `/resources` - Entire page removed (no access via navigation)
- Analytics data no longer visible from main navigation

### Pages to Update:
- `/profile` - Shows 3 tabs instead of 4
- `/` (home) - Shows 1 tab instead of 2

### Still Accessible (if someone has direct URL):
- These will 404 after archive: `/resources`, `/analytics` (if it was a separate page)
- API Keys can only be accessed via `/profile?tab=api-keys` - will redirect since tab doesn't exist

---

## PREFETCH STRATEGY

Currently, nav.tsx prefetches data when hovering over links:

```typescript
const handleNavHover = (href: string) => {
  if (href === '/profile') {
    mutate('profile')
  } else if (href === '/analytics') {
    mutate('home-stats')
  } else if (href === '/resources') {
    mutate('/api/resources')  // ← REMOVE THIS
  }
  // ...
}
```

After archive, remove the `/resources` prefetch call.

