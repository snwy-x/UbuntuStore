-- =============================================
-- UbuntuStore - Docker Init Script
-- This file is executed automatically when the
-- PostgreSQL container is created for the first time.
-- =============================================

\i /docker-entrypoint-initdb.d/schema.sql
\i /docker-entrypoint-initdb.d/seed.sql
