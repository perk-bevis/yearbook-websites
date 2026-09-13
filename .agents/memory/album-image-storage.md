---
name: Album image storage
description: The durable storage decision for yearbook album uploads.
---

Album image files use Replit App Storage; PostgreSQL stores only the serving object path and photo metadata.

**Why:** Album images are user-uploaded media and should remain durable without inflating database rows with base64 data.

**How to apply:** Class leaders request a short-lived upload URL, upload directly from the browser, then create the gallery metadata record with the returned object path.