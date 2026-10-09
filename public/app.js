const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function verify(){
  const btn=$('verify');btn.disabled=true;btn.textContent='Comprobando PostgreSQL…';
  try{
    const r=await fetch('/api/status',{cache:'no-store'});
    if(!r.ok)throw new Error((await r.json()).error||'Error de conexión');
    const data=await r.json();
    $('connection').textContent='● PostgreSQL conectado';
    $('score').textContent=data.score;
    $('bar').style.width=(data.score/data.maxScore*100)+'%';
    $('done').textContent=data.missions.filter(m=>m.complete).length+' de '+data.missions.length+' misiones completadas';
    $('lastcheck').textContent='Última comprobación: '+new Date(data.checkedAt).toLocaleTimeString('es-CL');
    $('missions').innerHTML=data.missions.map(m=>`<article class="mission ${m.complete?'complete':''}"><div class="missionhead"><span class="number">${m.complete?'✓':String(m.id).padStart(2,'0')}</span><h3>${escapeHTML(m.name)}</h3><span class="xp">${m.points} XP</span></div><p>${escapeHTML(m.intro)}</p><ul class="checks">${m.checks.map(c=>`<li><span class="${c.ok?'pass':'fail'}">${c.ok?'✓':'○'}</span>${escapeHTML(c.label)}</li>`).join('')}</ul><details class="hint"><summary>Ver pista SQL</summary><p>${escapeHTML(m.hint)}</p></details></article>`).join('');
  }catch(e){$('connection').textContent='● Sin conexión';$('missions').innerHTML='<div class="error">'+escapeHTML(e.message)+'</div>';}
  finally{btn.disabled=false;btn.textContent='↻ Verificar todas las misiones';}
}
$('verify').addEventListener('click',verify);verify();
