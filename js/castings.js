(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function initNav(){
    const btn=document.querySelector('.menu-toggle');
    const links=document.querySelector('.navlinks');
    if(btn&&links) btn.addEventListener('click',()=>links.classList.toggle('open'));
  }

  function roleLabel(r){
    const min=Number(r.min_age||0), max=Number(r.max_age||0);
    const age=max&&max!==min?`${min}–${max} años`:`${min} años`;
    return `${r.name?`${esc(r.name)} · `:''}${esc(r.gender||'')} · ${age}`;
  }

  function contactLink(c){
    const value=String(c.contact_value||'').trim();
    if(c.contact_type==='email') return `mailto:${encodeURIComponent(value)}`;
    if(c.contact_type==='whatsapp') return `https://wa.me/${value.replace(/\D/g,'')}`;
    if(c.contact_type==='phone') return `tel:${value.replace(/[^+\d]/g,'')}`;
    return '#';
  }

  function daysLeft(c){
    if(!c.expires_at) return '';
    return Math.max(0,Math.ceil((new Date(c.expires_at)-Date.now())/86400000));
  }

  function card(c){
    const roles=Array.isArray(c.roles)?c.roles:[];
    const left=daysLeft(c);
    return `<article class="casting-card casting-public-card">
      ${c.image_url?`<a class="casting-image-wrap" href="${esc(c.image_url)}" target="_blank" rel="noopener"><img src="${esc(c.image_url)}" alt="Anuncio de casting de ${esc(c.project_name||c.title)}" loading="lazy"></a>`:''}
      <div class="casting-card-body">
        <div class="casting-card-top"><div><div class="eyebrow">CASTING</div><h3>${esc(c.project_name||c.title)}</h3></div><span class="casting-paid ${c.is_paid?'paid':'unpaid'}">${c.is_paid?'Remunerado':'No remunerado'}</span></div>
        <div class="casting-role-pills">${roles.map(r=>`<span>${roleLabel(r)}</span>`).join('')}</div>
        ${c.requirements?`<div class="casting-detail"><strong>Requisitos excluyentes</strong><p>${esc(c.requirements)}</p></div>`:''}
        <div class="casting-card-footer"><div><small>Contacto para postularse</small><a class="casting-contact" href="${contactLink(c)}" ${c.contact_type==='whatsapp'?'target="_blank" rel="noopener"':''}>${esc(c.contact_value)}</a></div><span class="casting-expiry">${left===0?'Último día':left===1?'Cierra mañana':`Cierra en ${left} días`}</span></div>
      </div>
    </article>`;
  }

  function roleRow(removable){
    return `<div class="casting-role-row" data-role-row>
      <div class="field"><label>Rol / personaje <span>Opcional</span></label><input data-role-name maxlength="80" placeholder="Ej. Protagonista"></div>
      <div class="field"><label>Género</label><select data-role-gender required><option value="Femenino">Femenino</option><option value="Masculino">Masculino</option></select></div>
      <div class="field"><label>Edad mínima</label><input data-role-min type="number" min="1" max="100" required placeholder="25"></div>
      <div class="field"><label>Edad máxima <span>Opcional</span></label><input data-role-max type="number" min="1" max="100" placeholder="35"></div>
      ${removable?'<button class="role-remove" type="button" data-remove-role aria-label="Eliminar rol">×</button>':''}
    </div>`;
  }

  function wireRoleRemoveButtons(){
    document.querySelectorAll('[data-remove-role]').forEach(btn=>{
      btn.onclick=()=>btn.closest('[data-role-row]')?.remove();
    });
  }

  function addRole(){
    const root=$('castingRoles');
    if(!root) return;
    const hasRows=root.querySelector('[data-role-row]');
    root.insertAdjacentHTML('beforeend',roleRow(Boolean(hasRows)));
    wireRoleRemoveButtons();
  }

  function collectRoles(){
    const rows=[...document.querySelectorAll('[data-role-row]')];
    if(!rows.length) throw new Error('Agregá al menos un rol.');
    return rows.map(row=>{
      const min=Number(row.querySelector('[data-role-min]')?.value);
      const maxRaw=row.querySelector('[data-role-max]')?.value;
      const max=maxRaw?Number(maxRaw):min;
      if(!min||min<1||min>100) throw new Error('Revisá la edad de los roles.');
      if(max<min||max>100) throw new Error('La edad máxima no puede ser menor que la mínima.');
      return {
        name:row.querySelector('[data-role-name]')?.value.trim()||null,
        gender:row.querySelector('[data-role-gender]')?.value||'',
        min_age:min,
        max_age:max
      };
    });
  }

  function message(text,type='info'){
    const box=$('castingFormMessage');
    if(!box) return;
    box.textContent=text;
    box.className=`form-message span-2 ${type}`;
    box.hidden=false;
  }

  function clearFormFields(){
    const values={
      castingProjectName:'', castingRequirements:'', castingPaid:'yes', castingDuration:'7',
      castingContactType:'email', castingContact:'', castingImage:''
    };
    Object.entries(values).forEach(([id,value])=>{ const el=$(id); if(el) el.value=value; });
    const roles=$('castingRoles');
    if(roles){ roles.innerHTML=''; addRole(); }
  }

  async function render(){
    const root=$('castingList');
    if(!root) return;
    if(!window.RDA?.configured){
      root.innerHTML='<div class="notice">La sección de castings se activará al conectar Supabase.</div>';
      return;
    }
    try{
      const list=await RDA.publicCastings();
      root.innerHTML=list.length?list.map(card).join(''):'<div class="admin-empty">No hay castings abiertos por el momento.</div>';
    }catch(err){
      root.innerHTML=`<div class="notice">${esc(err?.message||'No se pudieron cargar los castings.')}</div>`;
    }
  }

  async function handleSubmit(event){
    event.preventDefault();
    const form=$('publicCastingForm');
    const btn=form?.querySelector('[type="submit"]');
    if(!form||!btn){ message('No se pudo inicializar el formulario. Recargá la página.','error'); return; }

    try{
      const projectName=$('castingProjectName')?.value.trim();
      const contact=$('castingContact')?.value.trim();
      const image=$('castingImage')?.files?.[0];
      if(!projectName) throw new Error('Ingresá el nombre del proyecto.');
      if(!contact) throw new Error('Ingresá un dato de contacto.');
      if(!image) throw new Error('La imagen del anuncio es obligatoria.');
      if(image.size>5*1024*1024) throw new Error('La imagen supera el máximo de 5 MB.');

      const payload={
        project_name:projectName,
        roles:collectRoles(),
        requirements:$('castingRequirements')?.value.trim()||null,
        is_paid:$('castingPaid')?.value==='yes',
        duration_days:Number($('castingDuration')?.value||7),
        contact_type:$('castingContactType')?.value||'email',
        contact_value:contact
      };

      btn.disabled=true;
      message('Subiendo la imagen y enviando el casting…');
      await RDA.submitPublicCasting(payload,image);
      clearFormFields();
      message('¡Listo! El casting fue enviado a Córdoba Casting y se publicará únicamente después de ser aprobado.','success');
    }catch(err){
      console.error('Error al enviar casting:',err);
      message(err?.message||'No se pudo enviar el casting.','error');
    }finally{
      btn.disabled=false;
    }
  }

  function init(){
    initNav();
    const form=$('publicCastingForm');
    const panel=$('castingSubmitPanel');
    const show=$('showCastingForm');
    const cancel=$('cancelCastingForm');
    const add=$('addCastingRole');
    if(!form||!panel||!show||!cancel||!add){
      console.error('Castings: faltan elementos requeridos del formulario.');
      return;
    }
    addRole();
    show.addEventListener('click',()=>{panel.hidden=false;show.hidden=true;panel.scrollIntoView({behavior:'smooth',block:'start'});});
    cancel.addEventListener('click',()=>{panel.hidden=true;show.hidden=false;});
    add.addEventListener('click',addRole);
    form.addEventListener('submit',handleSubmit);
    render();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
