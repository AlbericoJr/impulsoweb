'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

function loadEnv(file=path.join(__dirname,'.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file,'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g,'');
  }
}
loadEnv();
const HOST=process.env.HOST || '127.0.0.1';
const PORT=Number(process.env.PORT || 3000);
const PUBLIC=path.join(__dirname,'public');
const STORE=process.env.DATA_FILE || path.join(__dirname,'data','db.json');
const EMAIL=process.env.ADMIN_EMAIL || '';
const PASSWORD=process.env.ADMIN_PASSWORD || '';
const WHATSAPP=(process.env.WHATSAPP_NUMBER || '').replace(/\D/g,'');
const IS_PROD=process.env.NODE_ENV === 'production';
const sessions=new Map(), attempts=new Map();
const allowedStatuses=['Novo','Em contato','Proposta enviada','Fechado','Perdido'];
const allowedProjects=['Planejamento','Em desenvolvimento','Revisão','Concluído'];
const sizes={'/':'index.html','/index.html':'index.html','/admin.html':'admin.html','/style.css':'style.css','/app.js':'app.js','/admin.js':'admin.js'};
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function readDB(){try {const d=JSON.parse(fs.readFileSync(STORE,'utf8'));return {leads:Array.isArray(d.leads)?d.leads:[],tasks:Array.isArray(d.tasks)?d.tasks:[]};} catch(e){ if(e.code==='ENOENT')return {leads:[],tasks:[]};throw e;}}
function writeDB(db){fs.mkdirSync(path.dirname(STORE),{recursive:true});const tmp=STORE+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,STORE);}
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(c=>c.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x.length===2));}
function auth(req){const token=cookies(req).session;if(!token)return false;const s=sessions.get(token);if(!s)return false;if(Date.now()>s.expires){sessions.delete(token);return false;}return true;}
function originOK(req){const origin=req.headers.origin;if(!origin)return true;try {return new URL(origin).host===req.headers.host;} catch{return false;}}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>12000){reject(Object.assign(new Error('Requisição grande demais.'),{status:413}));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'));}catch{reject(Object.assign(new Error('JSON inválido'),{status:400}));}});req.on('error',reject);});}
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const validPhone=x=>x.replace(/\D/g,'').length>=10 && x.replace(/\D/g,'').length<=13;
function applyRate(key,limit,interval){const now=Date.now();const a=attempts.get(key)||[];const fresh=a.filter(t=>now-t<interval);fresh.push(now);attempts.set(key,fresh);return fresh.length<=limit;}
function sendStatic(req,res,pathname){let file=sizes[pathname];if(!file && pathname.startsWith('/assets/') && /^\/assets\/[\w.-]+\.(svg|png|webp|jpg)$/.test(pathname))file=pathname.slice(1);if(!file)return json(res,404,{error:'Recurso não encontrado'});if(pathname==='/admin.html' && !auth(req)){res.writeHead(302,{Location:'/index.html#entrar'});return res.end();}const full=path.join(PUBLIC,file);fs.readFile(full,(err,data)=>{if(err)return json(res,404,{error:'Arquivo não encontrado'});res.writeHead(200,{'Content-Type':contentTypes[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'"});res.end(data);});}
async function handler(req,res){try{
 const u=new URL(req.url,'http://localhost');const p=u.pathname;
 if(p==='/api/config' && req.method==='GET')return json(res,200,{whatsapp:WHATSAPP,plans:[{name:'Essencial',price:690},{name:'Profissional',price:1290},{name:'Personalizado',price:null}]});
 if(p==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
 if(req.method==='GET'&&!p.startsWith('/api/'))return sendStatic(req,res,p);
 if(['POST','PATCH','DELETE'].includes(req.method)&&!originOK(req))return json(res,403,{error:'Origem não autorizada'});
 if(p==='/api/leads'&&req.method==='POST'){
  const ip=req.socket.remoteAddress||'anonymous';if(!applyRate('lead:'+ip,8,60*60*1000))return json(res,429,{error:'Muitas solicitações. Tente novamente mais tarde.'});
  const b=await body(req);if(b.website)return json(res,201,{ok:true});
  const name=str(b.name,90),email=str(b.email,140).toLowerCase(),phone=str(b.phone,30),business=str(b.business,120),service=str(b.service,50),budget=str(b.budget,35),notes=str(b.notes,1200);
  if(name.length<2||!validEmail(email)||!validPhone(phone)||!business||!['Landing page','Site institucional','Portfólio','Outro'].includes(service)||b.consent!==true)return json(res,422,{error:'Confira os campos e aceite o aviso de privacidade.'});
  const d=readDB();const lead={id:crypto.randomUUID(),name,email,phone,business,service,budget,notes,status:'Novo',customer:false,projectStatus:'Planejamento',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};d.leads.unshift(lead);writeDB(d);return json(res,201,{ok:true,id:lead.id});
 }
 if(p==='/api/login'&&req.method==='POST'){
  const ip=req.socket.remoteAddress||'anonymous';if(!applyRate('login:'+ip,6,15*60*1000))return json(res,429,{error:'Muitas tentativas. Volte em 15 minutos.'});
  const b=await body(req);const email=str(b.email,140).toLowerCase(),pw=String(b.password||'');
  if(!EMAIL||!PASSWORD||PASSWORD.length<12)return json(res,503,{error:'Administrador não configurado. Consulte o README.'});
  const actual=crypto.createHash('sha256').update(email+'\0'+pw).digest();const expected=crypto.createHash('sha256').update(EMAIL.toLowerCase()+'\0'+PASSWORD).digest();
  if(!crypto.timingSafeEqual(actual,expected))return json(res,401,{error:'Credenciais inválidas.'});
  const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+8*60*60*1000});return json(res,200,{ok:true},{'Set-Cookie':`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${IS_PROD?'; Secure':''}`});
 }
 if(p==='/api/logout'&&req.method==='POST'){const token=cookies(req).session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':`session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${IS_PROD?'; Secure':''}`});}
 if(p==='/api/me'&&req.method==='GET')return json(res,200,{authenticated:auth(req)});
 if(p.startsWith('/api/admin/')){
  if(!auth(req))return json(res,401,{error:'Sessão expirada. Faça login novamente.'});
  const d=readDB();
  if(p==='/api/admin/overview'&&req.method==='GET')return json(res,200,{leads:d.leads,tasks:d.tasks});
  const leadMatch=p.match(/^\/api\/admin\/leads\/([0-9a-f-]{36})$/);
  if(leadMatch&&req.method==='PATCH'){
   const lead=d.leads.find(l=>l.id===leadMatch[1]);if(!lead)return json(res,404,{error:'Lead não encontrado'});
   const b=await body(req);if(b.status!==undefined){if(!allowedStatuses.includes(b.status))return json(res,422,{error:'Status inválido'});lead.status=b.status;}
   if(b.customer!==undefined){if(typeof b.customer!=='boolean')return json(res,422,{error:'Cliente inválido'});lead.customer=b.customer;}
   if(b.projectStatus!==undefined){if(!allowedProjects.includes(b.projectStatus))return json(res,422,{error:'Etapa inválida'});lead.projectStatus=b.projectStatus;}
   lead.updatedAt=new Date().toISOString();writeDB(d);return json(res,200,{lead});
  }
  if(leadMatch&&req.method==='DELETE'){const n=d.leads.length;d.leads=d.leads.filter(l=>l.id!==leadMatch[1]);if(d.leads.length===n)return json(res,404,{error:'Lead não encontrado'});writeDB(d);return json(res,200,{ok:true});}
  if(p==='/api/admin/tasks'&&req.method==='POST'){
   const b=await body(req),title=str(b.title,160),dueDate=str(b.dueDate,10);if(title.length<3||!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||Number.isNaN(Date.parse(dueDate+'T12:00:00Z')))return json(res,422,{error:'Informe título e data válidos.'});
   const task={id:crypto.randomUUID(),title,dueDate,done:false,createdAt:new Date().toISOString()};d.tasks.push(task);writeDB(d);return json(res,201,{task});
  }
  const taskMatch=p.match(/^\/api\/admin\/tasks\/([0-9a-f-]{36})$/);
  if(taskMatch&&req.method==='PATCH'){const t=d.tasks.find(t=>t.id===taskMatch[1]);if(!t)return json(res,404,{error:'Lembrete não encontrado'});const b=await body(req);if(typeof b.done!=='boolean')return json(res,422,{error:'Valor inválido'});t.done=b.done;writeDB(d);return json(res,200,{task:t});}
  if(taskMatch&&req.method==='DELETE'){d.tasks=d.tasks.filter(t=>t.id!==taskMatch[1]);writeDB(d);return json(res,200,{ok:true});}
 }
 return json(res,404,{error:'Rota não encontrada'});
 } catch(err){console.error(err);if(!res.headersSent)json(res,err.status||500,{error:err.status?err.message:'Erro interno do servidor.'});}}
const server=http.createServer(handler);
if(require.main===module){if(IS_PROD && (!EMAIL||PASSWORD.length<12)){console.error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres) no ambiente.');process.exit(1);}server.listen(PORT,HOST,()=>console.log(`ImpulsoWeb em http://${HOST}:${PORT}`));}
module.exports={server,readDB,writeDB};
