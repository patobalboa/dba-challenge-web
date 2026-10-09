-- Incidente inicial: exdesarrollador conserva acceso excesivo.
GRANT CONNECT ON DATABASE db_challenge TO dc_exdev;
GRANT USAGE ON SCHEMA public TO dc_exdev;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dc_exdev;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dc_exdev;
