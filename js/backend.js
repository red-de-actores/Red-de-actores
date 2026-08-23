(function(){
  const cfg = window.RDA_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(cfg.supabaseUrl || '') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith('PEGAR_');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  function normalizeUrl(url){
    if(!url) return '';
    try{
      const u = new URL(url);
      if(u.hostname.includes('youtube.com')){
        const id=u.searchParams.get('v'); return id?`https://www.youtube.com/embed/${id}`:url;
      }
      if(u.hostname==='youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
      if(u.hostname.includes('vimeo.com') && !u.hostname.includes('player.')){
        const id=u.pathname.split('/').filter(Boolean).pop(); return id?`https://player.vimeo.com/video/${id}`:url;
      }
      return url;
    }catch{return url}
  }

  function rowToActor(r){
    const photos=[r.photo_url,r.photo_url_2,r.photo_url_3].filter(Boolean);
    return {
      id:r.slug || r.id,
      uuid:r.id,
      name:r.display_name,
      birth:null,
      age:Number(r.age_years),
      city:r.city || '',
      available:!!r.is_available,
      student:!!r.accepts_student_work,
      featured:!!r.is_featured,
      verified:!!r.is_verified,
      updated:(r.updated_at||'').slice(0,10),
      photo:r.photo_url || '',
      photos,
      skills:Array.isArray(r.skills)?r.skills:[],
      bio:r.bio || '',
      presentation:normalizeUrl(r.presentation_url),
      reel:normalizeUrl(r.reel_url),
      monologue:normalizeUrl(r.monologue_url)
    };
  }


  async function compressImage(file,maxSide=1200,quality=.84){
    if(!file.type.startsWith('image/')) throw new Error('El archivo elegido no es una imagen válida.');
    const bitmap=await createImageBitmap(file);let w=bitmap.width,h=bitmap.height;
    const scale=Math.min(1,maxSide/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo procesar la foto.')),'image/webp',quality));
  }

  window.RDA = {
    client, configured,
    async session(){ if(!client) return null; const {data}=await client.auth.getSession(); return data.session; },
    async publicActors(){
      if(!client) return (window.ACTORS||[]);
      const {data,error}=await client.rpc('get_public_actors');
      if(error){ console.error(error); return []; }
      return (data||[]).map(rowToActor);
    },
    async publicActor(idOrSlug){
      if(!client) return (window.ACTORS||[]).find(a=>a.id===idOrSlug) || (window.ACTORS||[])[0] || null;
      const {data,error}=await client.rpc('get_public_actor',{actor_ref:idOrSlug});
      if(error){ console.error(error); return null; }
      return data && data[0] ? rowToActor(data[0]) : null;
    },
    async currentProfile(){
      if(!client) return null;
      const session=await this.session(); if(!session) return null;
      const {data,error}=await client.from('profiles').select('*').eq('id',session.user.id).single();
      if(error) throw error; return data;
    },
    async signUp(email,password){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const {data,error}=await client.auth.signUp({email,password}); if(error) throw error; return data;
    },
    async signIn(email,password){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error; return data;
    },
    async signOut(){ if(client) await client.auth.signOut(); location.href='index.html'; },
    async saveProfile(values){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const session=await this.session(); if(!session) throw new Error('Tenés que iniciar sesión.');
      const payload={...values,updated_at:new Date().toISOString()};
      delete payload.id;
      const {data,error}=await client.from('profiles').update(payload).eq('id',session.user.id).select().single();
      if(error) throw error; return data;
    },
    async submitProfile(values){
      return this.saveProfile({...values,status:'pending',submitted_at:new Date().toISOString()});
    },
    async uploadPhoto(file,slot='main'){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const session=await this.session(); if(!session) throw new Error('Tenés que iniciar sesión.');
      const blob=await compressImage(file,1200,.84);
      const path=`${session.user.id}/${slot}-${Date.now()}.webp`;
      const {error}=await client.storage.from('actor-photos').upload(path,blob,{upsert:false,cacheControl:'3600',contentType:'image/webp'}); if(error) throw error;
      return client.storage.from('actor-photos').getPublicUrl(path).data.publicUrl;
    },
    async pendingProfiles(){
      if(!client) return [];
      const {data,error}=await client.from('profiles').select('*').eq('status','pending').order('submitted_at',{ascending:true}); if(error) throw error; return data||[];
    },
    async allProfiles(){
      if(!client) return [];
      const {data,error}=await client.from('profiles').select('*').order('created_at',{ascending:false}); if(error) throw error; return data||[];
    },
    async moderate(id,action,reason=''){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const updates={};
      if(action==='approve'){updates.status='approved';updates.rejection_reason=null;updates.approved_at=new Date().toISOString();}
      if(action==='reject'){updates.status='rejected';updates.rejection_reason=reason;}
      if(action==='request_changes'){updates.status='changes_requested';updates.rejection_reason=reason;updates.is_hidden=false;}
      if(action==='hide') updates.is_hidden=true;
      if(action==='show') updates.is_hidden=false;
      if(action==='feature') updates.is_featured=true;
      if(action==='unfeature') updates.is_featured=false;
      const {error}=await client.from('profiles').update(updates).eq('id',id); if(error) throw error;
    },
    async notifications(){
      if(!client) return [];
      const {data,error}=await client.from('notifications').select('*').order('created_at',{ascending:false}).limit(30); if(error) throw error; return data||[];
    },
    async markNotificationRead(id){
      if(!client) return;
      const session=await this.session(); if(!session)return;
      const {error}=await client.from('notifications').update({is_read:true}).eq('id',id).eq('user_id',session.user.id); if(error) throw error;
    },
    async markNotificationsRead(){
      if(!client) return;
      const session=await this.session(); if(!session)return;
      const {error}=await client.from('notifications').update({is_read:true}).eq('user_id',session.user.id).eq('is_read',false); if(error) throw error;
    },
    async reportProfile(actorRef,reason){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const {error}=await client.rpc('submit_profile_report',{actor_ref:String(actorRef),report_reason:reason}); if(error) throw error;
    },
    async reports(){
      if(!client) return [];
      const {data,error}=await client.from('profile_reports').select('id,actor_id,reason,created_at,resolved_at').is('resolved_at',null).order('created_at',{ascending:false}); if(error) throw error; return data||[];
    },
    async resolveReport(id){
      const {error}=await client.from('profile_reports').update({resolved_at:new Date().toISOString()}).eq('id',id); if(error) throw error;
    },
    async deleteActor(id){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const {error}=await client.rpc('admin_delete_actor',{target_id:id}); if(error) throw error;
    },

    async submitContact(actorRef,name,email,message){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      const {error}=await client.rpc('submit_contact_request',{actor_ref:String(actorRef),sender_name:name,sender_email:email,contact_message:message}); if(error) throw error;
    },
    async contactRequests(){
      if(!client) return [];
      const {data,error}=await client.from('contact_requests').select('*').order('created_at',{ascending:false}); if(error) throw error; return data||[];
    },
    async publicCastings(){
      if(!client) return [];
      const {data,error}=await client.from('castings').select('*').order('created_at',{ascending:false});
      if(error) throw error;
      const now=Date.now();
      return (data||[]).filter(c=>c.status==='approved' && c.is_open!==false && (!c.expires_at || new Date(c.expires_at).getTime()>now));
    },
    async allCastings(){
      if(!client) return [];
      const {data,error}=await client.from('castings').select('*').order('created_at',{ascending:false}); if(error) throw error; return data||[];
    },
    async uploadCastingImage(file){
      if(!client) throw new Error('Supabase todavía no está configurado.');
      if(!file?.type?.startsWith('image/')) throw new Error('Elegí una imagen válida.');
      if(file.size>5*1024*1024) throw new Error('La imagen supera el máximo de 5 MB.');
      const blob=await compressImage(file,1800,.88);
      const uuid=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`);
      const path=`submissions/${uuid}.webp`;
      const {error}=await client.storage.from('casting-images').upload(path,blob,{upsert:false,cacheControl:'3600',contentType:'image/webp'}); if(error) throw error;
      const imageUrl=client.storage.from('casting-images').getPublicUrl(path).data.publicUrl;
      return {path,imageUrl};
    },
    async submitPublicCasting(values,file){
      const image=await this.uploadCastingImage(file);
      const {data,error}=await client.rpc('submit_public_casting',{
        p_project_name:values.project_name,p_roles:values.roles,p_requirements:values.requirements,
        p_is_paid:values.is_paid,p_duration_days:values.duration_days,p_contact_type:values.contact_type,
        p_contact_value:values.contact_value,p_image_path:image.path,p_image_url:image.imageUrl
      });
      if(error) throw error; return data;
    },
    async approveCasting(id){const {error}=await client.rpc('admin_approve_casting',{target_id:id});if(error)throw error;},
    async rejectCasting(id,reason=''){const {error}=await client.rpc('admin_reject_casting',{target_id:id,reason});if(error)throw error;},
    async closeCasting(id){const {error}=await client.from('castings').update({status:'closed',is_open:false,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;},
    async extendCasting(id,date){const expiry=new Date(`${date}T23:59:59`).toISOString();const {error}=await client.rpc('admin_extend_casting',{target_id:id,new_expiry:expiry});if(error)throw error;},
    async deleteCasting(id){
      const {data,error}=await client.from('castings').select('image_path').eq('id',id).single();if(error)throw error;
      if(data?.image_path){const rem=await client.storage.from('casting-images').remove([data.image_path]);if(rem.error)throw rem.error;}
      const del=await client.from('castings').delete().eq('id',id);if(del.error)throw del.error;
    },
    async downloadCastingImage(c){
      if(!c?.image_path) throw new Error('Este casting no tiene imagen.');
      const {data,error}=await client.storage.from('casting-images').download(c.image_path);if(error)throw error;
      const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=`casting-${(c.project_name||c.title||'imagen').toLowerCase().replace(/[^a-z0-9]+/gi,'-')}.webp`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },
    async isAdmin(){ try{return (await this.currentProfile())?.role==='admin'}catch{return false} }
  };
})();
