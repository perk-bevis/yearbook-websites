---
name: Database schema compatibility
description: A durable constraint for extending the yearbook API schema safely.
---

When extending social features, verify the live `app_users` schema before relying on profile columns. The codebase and database may be out of sync after earlier migrations, so use idempotent compatibility migrations for required columns before adding new endpoints.

**Why:** A public-profile request exposed a missing-column error even though the frontend and API already expected those profile fields.

**How to apply:** Before deploying a new router that selects or updates existing profile fields, inspect the live table and apply `ADD COLUMN IF NOT EXISTS` migrations for any missing fields.