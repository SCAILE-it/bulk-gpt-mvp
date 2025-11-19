# Admin Features Archive

This directory contains admin functionality that was removed as **YAGNI** (You Aren't Gonna Need It).

## Rationale
- Admin dashboard features were premature and not part of the current product roadmap
- User types (admin/self_service) are not needed for MVP
- Database schema included admin-specific tables that created unnecessary complexity
- Navigation and user profile logic were cluttered with admin checks

## What Was Removed

### Routes
- `routes/admin-page/` - Admin dashboard page at `/admin`
- `routes/admin-api/` - Admin API endpoints:
  - `/api/admin/clients` - Client management
  - `/api/admin/packages` - Package management
  - `/api/admin/onboarding-links` - Onboarding link generation

### Components
- `components/ClientManager.tsx` - Client CRUD interface
- `components/PackageManager.tsx` - Package CRUD interface

### Database Migrations
- `migrations/20251118000000_add_admin_user_type.sql` - Added `user_type` column to `profiles` table

### Code Cleanup
- Removed `userType` state from `components/layout/nav.tsx`
- Removed admin link from navigation
- Removed admin prefetch logic from navigation hover handlers
- Removed `/api/user/profile` call that was only for fetching `user_type`

## Archived Type Definitions
Package management types remain in `lib/types/packages.ts` but are not used:
- `AdminPackage`
- `AdminPackageCreate`
- `AdminPackageUpdate`
- `ClientPackageAssignment`

These can be removed if package billing features are never implemented.

## If Admin Features Are Needed Later

1. Restore files from this archive
2. Re-apply the database migration
3. Restore nav.tsx changes from git history
4. Ensure type definitions are properly imported

## Notes
- No data migrations needed - the migration simply adds a column, removing it just leaves an unused column
- If the unused `user_type` column becomes a problem, create a new migration to drop it
