function el(id){return document.getElementById(id)}
function message(text,type='info'){const box=el('formMessage');if(!box)return;box.textContent=text;box.className=`form-message ${type}`;box.hidden=false}
function skillsFrom(value){return value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,7)}
function videoOkay(url){if(!url)return false;try{const h=new URL(url).hostname;return h.includes('youtube.com')||h==='youtu.be'||h.includes('vimeo.com')}catch{return false}}

function notificationHref(n){
  if(['profile_approved','profile_rejected','changes_requested'].includes(n.type)) return 'perfil.html';
  if(n.type==='contact_request') return 'perfil.html';
  return '';
}
async function addNotificationBell(nav){
  try{
    let items=(await RDA.notifications()).filter(n=>!n.is_read);
    const wrap=document.createElement('div');wrap.className='notification-wrap';
    nav.appendChild(wrap);
    const render=()=>{
      const unread=items.length;
      wrap.innerHTML=`<button class="notification-bell" type="button" aria-label="Notificaciones">🔔${unread?`<span>${unread}</span>`:''}</button><div class="notification-menu" hidden><div class="notification-menu-head"><strong>Notificaciones</strong>${unread?'<button type="button" data-read-all>Marcar todo como leído</button>':''}</div><div class="notification-list">${unread?items.map(n=>`<button type="button" class="notification-item unread" data-notification-id="${n.id}" data-href="${notificationHref(n)}"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.body||'')}</p><small>${new Date(n.created_at).toLocaleDateString('es-AR')}</small></button>`).join(''):'<div class="notification-empty">No tenés notificaciones nuevas.</div>'}</div></div>`;
      const btn=wrap.querySelector('.notification-bell'),menu=wrap.querySelector('.notification-menu');
      btn.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};
      wrap.querySelector('[data-read-all]')?.addEventListener('click',async e=>{e.stopPropagation();try{await RDA.markNotificationsRead();items=[];render();wrap.querySelector('.notification-menu').hidden=false}catch(err){console.warn(err)}});
      wrap.querySelectorAll('[data-notification-id]').forEach(item=>item.addEventListener('click',async e=>{e.stopPropagation();const id=Number(item.dataset.notificationId),href=item.dataset.href;try{await RDA.markNotificationRead(id);items=items.filter(n=>Number(n.id)!==id);if(href){location.href=href;return}render();wrap.querySelector('.notification-menu').hidden=false}catch(err){console.warn(err)}}));
    };
    render();
    document.addEventListener('click',e=>{const menu=wrap.querySelector('.notification-menu');if(menu&&!wrap.contains(e.target))menu.hidden=true});
  }catch(e){console.warn('No se pudieron cargar notificaciones',e)}
}
async function initGlobalAuth(){
  if(!window.RDA?.configured) return;
  const session=await RDA.session();
  const nav=document.querySelector('.navlinks');
  if(!session||!nav)return;
  document.querySelectorAll('.auth-btn').forEach(a=>{a.textContent='Mi perfil';a.href='perfil.html'});
  await addNotificationBell(nav);
  if(await RDA.isAdmin()){
    const a=document.createElement('a');a.href='admin.html';a.textContent='Administración';a.className='admin-nav-link';
    nav.appendChild(a);
  }
}

async function initLogin(){
  const form=el('loginForm'); if(!form)return;
  if(!RDA.configured){message('Para activar las cuentas, primero configurá Supabase en js/config.js.','warn');return}
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const btn=form.querySelector('button[type=submit]');btn.disabled=true;
    try{await RDA.signIn(el('email').value.trim(),el('password').value);const p=await RDA.currentProfile();location.href=p?.role==='admin'?'admin.html':'perfil.html'}
    catch(err){message(err.message||'No pudimos iniciar sesión.','error')}
    finally{btn.disabled=false}
  });
}

async function initRegistration(){
  const form=el('registerForm'); if(!form)return;
  if(!RDA.configured){message('La interfaz está lista. Para registrar actores reales, ejecutá supabase-setup.sql y pegá URL + anon key en js/config.js.','warn');}
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!RDA.configured)return;
    const skills=skillsFrom(el('skills').value);
    if(skills.length>7)return message('Podés cargar como máximo 7 habilidades.','error');
    if(!videoOkay(el('presentation').value))return message('El video de presentación debe ser un enlace de YouTube o Vimeo.','error');
    const photo=el('photo').files[0]; if(!photo)return message('Necesitás una foto principal donde tu rostro se vea claramente.','error');
    if(photo.size>12*1024*1024)return message('La foto es demasiado pesada. Elegí una imagen menor a 12 MB.','error');
    const btn=form.querySelector('button[type=submit]');btn.disabled=true;message('Creando tu cuenta y cargando el perfil…');
    try{
      const auth=await RDA.signUp(el('email').value.trim(),el('password').value);
      if(!auth.user)throw new Error('No se pudo crear la cuenta.');
      let session=await RDA.session();
      if(!session)throw new Error('La cuenta fue creada, pero Supabase está solicitando confirmar el email. Desactivá Confirm email en Auth > Providers > Email para usar el flujo acordado.');
      const photoUrl=await RDA.uploadPhoto(photo,'main');
      const photo2=el('photo2').files[0]; const photo3=el('photo3').files[0];
      const photoUrl2=photo2?await RDA.uploadPhoto(photo2,'extra1'):null;
      const photoUrl3=photo3?await RDA.uploadPhoto(photo3,'extra2'):null;
      await RDA.submitProfile({
        display_name:el('displayName').value.trim(),birth_date:el('birthDate').value,city:el('city').value.trim(),bio:el('bio').value.trim(),skills,
        is_available:el('available').checked,accepts_student_work:el('student').checked,photo_url:photoUrl,photo_url_2:photoUrl2,photo_url_3:photoUrl3,presentation_url:el('presentation').value.trim(),
        reel_url:el('reel').value.trim()||null,monologue_url:el('monologue').value.trim()||null,last_profile_confirmation:new Date().toISOString()
      });
      location.href='perfil.html?welcome=1';
    }catch(err){message(err.message||'No se pudo crear el perfil.','error')}
    finally{btn.disabled=false}
  });
}

async function initPrivateProfile(){
  const root=el('privateProfile'); if(!root)return;
  if(!RDA.configured){root.innerHTML='<div class="notice">Supabase todavía no está configurado.</div>';return}
  const session=await RDA.session();if(!session){location.href='login.html';return}
  const p=await RDA.currentProfile();
  const statusLabels={draft:'Borrador',pending:'Pendiente de aprobación',approved:'Perfil publicado',rejected:'Perfil rechazado',changes_requested:'Cambios solicitados'};
  root.innerHTML=`
    ${['rejected','changes_requested'].includes(p.status)?`<div class="rejected-panel"><strong>${p.status==='changes_requested'?'CÓRDOBA CASTING SOLICITÓ CAMBIOS':'TU PERFIL NECESITA CORRECCIONES'}</strong><p>${p.rejection_reason||'Revisá la información indicada por Córdoba Casting.'}</p><span>Corregí lo necesario y guardá. Se enviará automáticamente a una nueva revisión.</span></div>`:''}
    ${new URLSearchParams(location.search).get('welcome')?'<div class="success-panel">Perfil enviado. Córdoba Casting lo revisará antes de publicarlo.</div>':''}
    <div class="private-heading"><div><div class="eyebrow">Área privada</div><h1>${p.display_name||'Mi perfil'}</h1><span class="profile-state state-${p.status}">${statusLabels[p.status]||p.status}</span></div><button class="btn btn-secondary" id="logoutBtn">Cerrar sesión</button></div>
    <form id="profileEditForm" class="profile-edit-form">
      <div class="notice face-notice"><strong>Foto principal:</strong> solamente necesitás una foto clara donde se vea bien tu rostro. No hace falta que sea una producción profesional.</div>
      <div class="renewal-card" id="renewalStatus"></div>
      <div class="edit-grid">
        <div class="field"><label>Nombre artístico / completo</label><input id="editName" required value="${escapeHtml(p.display_name||'')}"></div>
        <div class="field"><label>Fecha de nacimiento <span>Privada</span></label><input id="editBirth" type="date" required value="${p.birth_date||''}"></div>
        <div class="field"><label>Localidad</label><input id="editCity" required value="${escapeHtml(p.city||'')}"></div>
        <div class="field switches"><label><input id="editAvailable" type="checkbox" ${p.is_available?'checked':''}> Disponible ahora</label><label><input id="editStudent" type="checkbox" ${p.accepts_student_work?'checked':''}> Acepto trabajos estudiantiles / no remunerados</label></div>
      </div>
      <div class="field"><label>Sobre mí</label><textarea id="editBio" rows="4" maxlength="500">${escapeHtml(p.bio||'')}</textarea></div>
      <div class="field"><label>Habilidades — máximo 7, separadas por coma</label><input id="editSkills" value="${escapeHtml((p.skills||[]).join(', '))}"></div>
      <div class="photo-edit-section"><h3>Fotografías</h3><p class="muted">La principal debe mostrar claramente tu rostro. Las otras dos son opcionales.</p><div class="photo-edit-grid"><div class="field"><label>Reemplazar foto principal</label><input id="editPhoto" type="file" accept="image/*"></div><div class="field"><label>Foto adicional 1</label><input id="editPhoto2" type="file" accept="image/*"></div><div class="field"><label>Foto adicional 2</label><input id="editPhoto3" type="file" accept="image/*"></div></div><div class="current-photos">${[p.photo_url,p.photo_url_2,p.photo_url_3].filter(Boolean).map(u=>`<img src="${escapeHtml(u)}" alt="Foto actual">`).join('')}</div></div>
      <div class="media-edit-grid"><div class="field"><label>Video de presentación — obligatorio</label><input id="editPresentation" type="url" required value="${escapeHtml(p.presentation_url||'')}"></div><div class="field"><label>Reel — opcional</label><input id="editReel" type="url" value="${escapeHtml(p.reel_url||'')}"></div><div class="field"><label>Monólogo / escena — opcional</label><input id="editMonologue" type="url" value="${escapeHtml(p.monologue_url||'')}"></div></div>
      <div id="editMessage" class="form-message" hidden></div>
      <div class="profile-edit-actions"><button class="btn btn-primary" type="submit">Guardar cambios</button><button class="btn btn-secondary" type="button" id="renewBtn">Confirmar que sigo activo</button></div>
    </form>`;
  const renewal=el('renewalStatus');
  if(renewal){const base=new Date(p.last_profile_confirmation||p.created_at);const expiry=new Date(base);expiry.setFullYear(expiry.getFullYear()+1);const days=Math.ceil((expiry-Date.now())/86400000);renewal.innerHTML=days<=0?'<strong>Tu disponibilidad venció.</strong><span>Confirmá que seguís activo para volver a figurar como disponible.</span>':days<=31?`<strong>Tu perfil vence pronto.</strong><span>Renovalo dentro de ${days} días para mantener tu disponibilidad.</span>`:`<strong>Perfil activo.</strong><span>Vigente por ${days} días más.</span>`;renewal.classList.toggle('urgent',days<=31)}
  el('logoutBtn').onclick=()=>RDA.signOut();
  el('renewBtn').onclick=async()=>{await RDA.saveProfile({last_profile_confirmation:new Date().toISOString()});alert('Perfil renovado por 12 meses.')};
  el('profileEditForm').onsubmit=async e=>{
    e.preventDefault();const skills=skillsFrom(el('editSkills').value);if(skills.length>7)return editMessage('Máximo 7 habilidades.','error');
    try{
      if(!videoOkay(el('editPresentation').value))throw new Error('El video de presentación debe ser un enlace de YouTube o Vimeo.');
      const values={display_name:el('editName').value.trim(),birth_date:el('editBirth').value,city:el('editCity').value.trim(),bio:el('editBio').value.trim(),skills,is_available:el('editAvailable').checked,accepts_student_work:el('editStudent').checked,presentation_url:el('editPresentation').value.trim(),reel_url:el('editReel').value.trim()||null,monologue_url:el('editMonologue').value.trim()||null};
      const f1=el('editPhoto').files[0],f2=el('editPhoto2').files[0],f3=el('editPhoto3').files[0];
      if(f1)values.photo_url=await RDA.uploadPhoto(f1,'main'); if(f2)values.photo_url_2=await RDA.uploadPhoto(f2,'extra1'); if(f3)values.photo_url_3=await RDA.uploadPhoto(f3,'extra2');
      if(['rejected','changes_requested'].includes(p.status))await RDA.submitProfile(values);else await RDA.saveProfile(values);
      editMessage(['rejected','changes_requested'].includes(p.status)?'Cambios guardados. Tu perfil volvió a revisión.':'Cambios publicados correctamente.','success');
    }catch(err){editMessage(err.message,'error')}
  }
}
function editMessage(text,type){const b=el('editMessage');b.textContent=text;b.className=`form-message ${type}`;b.hidden=false}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

document.addEventListener('DOMContentLoaded',()=>{initGlobalAuth();initLogin();initRegistration();initPrivateProfile()});
