function adminEscape(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function adminAge(date){if(!date)return '—';const b=new Date(date+'T12:00:00'),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a}
function adminVideo(url,label){return url?`<a class="admin-media-link" href="${adminEscape(url)}" target="_blank" rel="noopener">▶ ${label}</a>`:''}
async function initAdminPanel(){
  const root=document.getElementById('adminPanel');if(!root)return;
  if(!RDA?.configured){root.innerHTML='<div class="notice">Primero configurá Supabase para activar Administración.</div>';return}
  const session=await RDA.session();if(!session){location.href='login.html';return}
  if(!(await RDA.isAdmin())){root.innerHTML='<div class="rejected-panel"><strong>ACCESO RESTRINGIDO</strong><p>Esta sección existe únicamente para administradores de Córdoba Casting.</p></div>';return}
  await renderAdminPanel('pending');
}
async function renderAdminPanel(tab='pending'){
  const root=document.getElementById('adminPanel');
  const all=await RDA.allProfiles();
  const pending=all.filter(p=>p.status==='pending');
  const rejected=all.filter(p=>p.status==='rejected');
  const published=all.filter(p=>p.status==='approved');
  const list=tab==='pending'?pending:tab==='approved'?published:rejected;
  root.innerHTML=`<div class="admin-head"><div><div class="eyebrow">Córdoba Casting</div><h1>Administración</h1><p class="muted">Revisá altas nuevas y administrá perfiles existentes.</p></div><a class="btn btn-secondary" href="index.html">Ver sitio</a></div>
  <div class="admin-tabs"><button data-tab="pending" class="${tab==='pending'?'active':''}">Pendientes <span>${pending.length}</span></button><button data-tab="approved" class="${tab==='approved'?'active':''}">Publicados <span>${published.length}</span></button><button data-tab="rejected" class="${tab==='rejected'?'active':''}">Rechazados <span>${rejected.length}</span></button></div>
  <div class="admin-list">${list.length?list.map(p=>adminCard(p,tab)).join(''):'<div class="admin-empty">No hay perfiles en esta sección.</div>'}</div>`;
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>renderAdminPanel(b.dataset.tab));
  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>handleAdminAction(b));
}
function adminCard(p,tab){
  const skills=(p.skills||[]).map(x=>`<span class="tag">${adminEscape(x)}</span>`).join('');
  return `<article class="admin-profile-card">
    <div class="admin-profile-photo">${p.photo_url?`<img src="${adminEscape(p.photo_url)}" alt="${adminEscape(p.display_name)}">`:'<div class="no-photo">Sin foto</div>'}</div>
    <div class="admin-profile-main"><div class="admin-profile-title"><div><h3>${adminEscape(p.display_name||'Perfil sin nombre')}</h3><p>${adminAge(p.birth_date)} años · ${adminEscape(p.city||'Sin localidad')}</p></div><span class="profile-state state-${p.status}">${p.status}</span></div>
      <div class="admin-flags"><span>${p.is_available?'● Disponible ahora':'○ No disponible'}</span>${p.accepts_student_work?'<span>🎓 Acepta estudiantiles</span>':''}${p.is_featured?'<span>★ Destacado</span>':''}</div>
      <p class="admin-bio">${adminEscape(p.bio||'')}</p><div class="tags">${skills}</div>
      <div class="admin-media">${adminVideo(p.presentation_url,'Presentación')}${adminVideo(p.reel_url,'Reel')}${adminVideo(p.monologue_url,'Monólogo / escena')}</div>
      ${p.status==='rejected'&&p.rejection_reason?`<div class="admin-reason"><strong>Motivo:</strong> ${adminEscape(p.rejection_reason)}</div>`:''}
    </div>
    <div class="admin-profile-actions">
      ${tab==='pending'?`<button class="btn btn-primary" data-action="approve" data-id="${p.id}">Aprobar</button><button class="btn btn-secondary" data-action="reject" data-id="${p.id}">Rechazar</button>`:''}
      ${tab==='approved'?`<button class="btn btn-secondary" data-action="${p.is_featured?'unfeature':'feature'}" data-id="${p.id}">${p.is_featured?'Quitar destacado':'★ Destacar'}</button><button class="btn btn-secondary" data-action="${p.is_hidden?'show':'hide'}" data-id="${p.id}">${p.is_hidden?'Volver a mostrar':'Ocultar'}</button>`:''}
      ${tab==='rejected'?'<span class="tiny muted">Volverá a Pendientes cuando el actor corrija y guarde.</span>':''}
    </div></article>`
}
async function handleAdminAction(btn){
  const {action,id}=btn.dataset;let reason='';
  if(action==='reject'){reason=prompt('Motivo del rechazo. El actor lo verá al iniciar sesión:','');if(!reason?.trim())return alert('Para rechazar un perfil tenés que indicar el motivo.');}
  btn.disabled=true;
  try{await RDA.moderate(id,action,reason.trim());await renderAdminPanel(action==='approve'?'pending':document.querySelector('.admin-tabs .active')?.dataset.tab||'pending')}
  catch(err){alert(err.message||'No se pudo realizar la acción.');btn.disabled=false}
}
document.addEventListener('DOMContentLoaded',initAdminPanel);
