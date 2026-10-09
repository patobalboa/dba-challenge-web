'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'db_challenge',
  user: process.env.PGUSER || 'dc_verificador',
  password: process.env.PGPASSWORD,
  max: 5,
  connectionTimeoutMillis: 3000,
  statement_timeout: 3000,
  idle_in_transaction_session_timeout: 5000
});
const missions = [
  { id:1, name:'Identidades corporativas', points:10, intro:'Crea un rol agrupador sin LOGIN y asigna el analista a ese grupo.', hint:'CREATE ROLE dc_lectura NOLOGIN; luego GRANT dc_lectura TO dc_analista.', checks:[
    {label:'Existe el rol dc_lectura y no puede iniciar sesión', kind:'role', role:'dc_lectura', login:false},
    {label:'dc_analista pertenece a dc_lectura', kind:'member', role:'dc_analista', parent:'dc_lectura'}
  ]},
  { id:2, name:'El analista de ventas', points:15, intro:'El analista debe consultar clientes y ventas, pero no datos de sueldos ni modificar ventas.', hint:'GRANT CONNECT ON DATABASE db_challenge; GRANT USAGE ON SCHEMA public; GRANT SELECT ON public.clientes, public.ventas TO dc_lectura.', checks:[
    {label:'Puede consultar clientes',kind:'query',role:'dc_analista',sql:'SELECT count(*) FROM public.clientes',expect:true},
    {label:'Puede consultar ventas',kind:'query',role:'dc_analista',sql:'SELECT count(*) FROM public.ventas',expect:true},
    {label:'No puede consultar sueldos',kind:'query',role:'dc_analista',sql:'SELECT count(*) FROM public.empleados',expect:false},
    {label:'No puede eliminar ventas',kind:'query',role:'dc_analista',sql:'DELETE FROM public.ventas WHERE id=-999',expect:false}
  ]},
  { id:3, name:'La aplicación de ventas', points:15, intro:'La aplicación registra ventas y consulta productos, sin consultar sueldos ni borrar clientes.', hint:'GRANT USAGE ON SCHEMA public; GRANT SELECT ON public.productos; GRANT INSERT ON public.ventas; GRANT USAGE ON SEQUENCE public.ventas_id_seq.', checks:[
    {label:'Consulta productos',kind:'query',role:'dc_aplicacion',sql:'SELECT count(*) FROM public.productos',expect:true},
    {label:'Registra ventas (prueba revertida)',kind:'query',role:'dc_aplicacion',sql:'INSERT INTO public.ventas(cliente_id,producto_id,cantidad) VALUES (1,1,1)',expect:true},
    {label:'No consulta sueldos',kind:'query',role:'dc_aplicacion',sql:'SELECT count(*) FROM public.empleados',expect:false},
    {label:'No elimina clientes',kind:'query',role:'dc_aplicacion',sql:'DELETE FROM public.clientes WHERE id=-999',expect:false}
  ]},
  { id:4, name:'Auditor externo', points:10, intro:'El auditor puede consultar las cuatro tablas, pero no modificar empleados.', hint:'Crea un rol de solo lectura, o concede SELECT sobre las cuatro tablas a dc_auditor; recuerda USAGE del esquema.', checks:[
    ...['clientes','productos','ventas','empleados'].map(t=>({label:'Consulta '+t,kind:'query',role:'dc_auditor',sql:'SELECT count(*) FROM public.'+t,expect:true})),
    {label:'No modifica sueldos',kind:'query',role:'dc_auditor',sql:'UPDATE public.empleados SET sueldo=sueldo WHERE id=-999',expect:false}
  ]},
  { id:5, name:'Incidente: exdesarrollador', points:10, intro:'La cuenta dc_exdev sigue activa y conserva privilegios excesivos. Bloquea nuevos inicios de sesión y revoca su acceso a los datos.', hint:'ALTER ROLE dc_exdev NOLOGIN; REVOKE ALL ON ALL TABLES IN SCHEMA public FROM dc_exdev; revisa también esquemas y secuencias.', checks:[
    {label:'Cuenta bloqueada para nuevos logins',kind:'role',role:'dc_exdev',login:false},
    {label:'Sin lectura de clientes',kind:'query',role:'dc_exdev',sql:'SELECT count(*) FROM public.clientes',expect:false},
    {label:'Sin modificación de ventas',kind:'query',role:'dc_exdev',sql:'UPDATE public.ventas SET cantidad=cantidad WHERE id=-999',expect:false},
    {label:'Sin acceso a secuencia de ventas',kind:'priv',role:'dc_exdev',object:'public.ventas_id_seq',privilege:'USAGE',objectType:'sequence',expect:false}
  ]}
];
const allowedRoles = new Set(['dc_analista','dc_aplicacion','dc_auditor','dc_exdev']);
async function probe(c) {
  if (c.kind === 'role') {
    const r = await pool.query('SELECT rolcanlogin FROM pg_roles WHERE rolname=$1',[c.role]);
    return r.rowCount===1 && r.rows[0].rolcanlogin===c.login;
  }
  if (c.kind === 'member') {
    const r=await pool.query('SELECT pg_has_role($1,$2,\'MEMBER\') AS ok',[c.role,c.parent]);
    return r.rows[0].ok===true;
  }
  if (c.kind === 'priv') {
    const r=await pool.query('SELECT has_sequence_privilege($1,$2,$3) AS ok',[c.role,c.object,c.privilege]);
    return r.rows[0].ok===c.expect;
  }
  if (c.kind === 'query' && allowedRoles.has(c.role)) {
    const client=await pool.connect();
    let passed=false;
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE '+c.role);
      try {
        await client.query(c.sql);
        passed=c.expect===true;
      } catch(err) {
        passed=c.expect===false && err.code==='42501';
      }
    } finally {
      try { await client.query('ROLLBACK'); } finally {client.release();}
    }
    return passed;
  }
  return false;
}
async function status() {
  const results=[];
  for (const m of missions) {
    const checks=[];
    for (const c of m.checks) {
      let ok=false;
      try {ok=await probe(c);} catch(e) {if (process.env.DEBUG==='1') console.error(c.label,e.message);}
      checks.push({label:c.label,ok});
    }
    results.push({id:m.id,name:m.name,points:m.points,intro:m.intro,hint:m.hint,checks,complete:checks.every(c=>c.ok)});
  }
  return {missions:results,score:results.reduce((s,m)=>s+(m.complete?m.points:0),0),maxScore:60,checkedAt:new Date().toISOString()};
}
const assets = {'/':'index.html','/style.css':'style.css','/app.js':'app.js'};
const mime={'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8'};
const server=http.createServer(async (req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET' && req.url==='/api/status') {
    try {const data=await status();res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
    catch(e) {res.writeHead(503,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'No se pudo consultar PostgreSQL. Revisa .env y el servicio.'}));}
    return;
  }
  const asset=assets[req.url];
  if(req.method!=='GET'||!asset) {res.writeHead(404);res.end('No encontrado');return;}
  const ext=asset.split('.').pop();
  res.writeHead(200,{'Content-Type':mime[ext]});
  fs.createReadStream(path.join(__dirname,'public',asset)).pipe(res);
});
server.listen(PORT,HOST,()=>console.log(`DBA Challenge: http://${HOST}:${PORT}`));
