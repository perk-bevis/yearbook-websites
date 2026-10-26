---
name: Psycopg SQL patterns
description: Handling percent-based SQL patterns in psycopg queries that also use bound parameters.
---

In parameterized psycopg SQL strings, write literal percent characters as `%%`, including the percent wildcards in `LIKE` patterns.

**Why:** An unescaped percent in a query that also has `%s` placeholders can be interpreted by the driver as another placeholder, causing a tuple-index error before the database runs the query.

**How to apply:** When editing a psycopg query that receives a parameter tuple, escape percent signs that belong to SQL string literals; keep runtime values such as `LIKE` patterns in bound parameters.
