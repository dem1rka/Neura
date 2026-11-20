-- Run ONCE as a PostgreSQL administrator in the neura database,
-- after 001_initial.sql. Set password separately using psql \password neura_app
BEGIN;
CREATE ROLE neura_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE ALL ON DATABASE neura FROM PUBLIC;
GRANT CONNECT ON DATABASE neura TO neura_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA neura TO neura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  neura.users, neura.sessions, neura.auth_tokens,
  neura.participants, neura.participant_access, neura.observations,
  neura.reports, neura.files, neura.consents TO neura_app;
GRANT INSERT ON neura.audit_events TO neura_app;
ALTER ROLE neura_app IN DATABASE neura SET search_path = neura, pg_catalog;
COMMIT;
