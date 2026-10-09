CREATE ROLE dc_lectura NOLOGIN;
GRANT dc_lectura TO dc_analista;
GRANT CONNECT ON DATABASE db_challenge TO dc_lectura;
GRANT USAGE ON SCHEMA public TO dc_lectura;
GRANT SELECT ON public.clientes, public.ventas TO dc_lectura;

GRANT CONNECT ON DATABASE db_challenge TO dc_aplicacion;
GRANT USAGE ON SCHEMA public TO dc_aplicacion;
GRANT SELECT ON public.productos TO dc_aplicacion;
GRANT INSERT ON public.ventas TO dc_aplicacion;
GRANT USAGE ON SEQUENCE public.ventas_id_seq TO dc_aplicacion;

GRANT CONNECT ON DATABASE db_challenge TO dc_auditor;
GRANT USAGE ON SCHEMA public TO dc_auditor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dc_auditor;

ALTER ROLE dc_exdev NOLOGIN;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM dc_exdev;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM dc_exdev;
REVOKE USAGE ON SCHEMA public FROM dc_exdev;
REVOKE CONNECT ON DATABASE db_challenge FROM dc_exdev;
