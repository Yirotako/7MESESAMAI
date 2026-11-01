document.addEventListener("DOMContentLoaded", async () => {
  const form=document.getElementById("entryForm");
  if(!window.app.ready()){app.msg("entryMessage","Primero hay que configurar Supabase. Revisa el archivo README.",true);return;}
  const {data:{session}}=await app.client.auth.getSession();
  if(session){
    const {data}=await app.client.from("guest_memberships").select("status").eq("user_id",session.user.id).maybeSingle();
    if(data?.status==="accepted"){location.href="invitacion.html";return;}
  }
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const nickname=document.getElementById("nickname").value.trim();
    const code=document.getElementById("accessCode").value;
    const btn=form.querySelector("button");btn.disabled=true;btn.textContent="Comprobando…";
    try{
      let {data:{session}}=await app.client.auth.getSession();
      if(!session){
        const {data,error}=await app.client.auth.signInAnonymously();
        if(error) throw error; session=data.session;
      }
      const {data,error}=await app.client.rpc("enter_invitation",{p_nickname:nickname,p_access_code:code});
      if(error) throw error;
      if(data?.status==="denied"){app.msg("entryMessage","Este acceso está pausado. Puedes solicitar una nueva autorización desde aquí.",true);return;}
      if(data?.status==="pending"){app.msg("entryMessage","Tu solicitud está pendiente de revisión.",true);return;}
      location.href="invitacion.html";
    }catch(err){app.msg("entryMessage",err.message||"No se pudo validar el acceso.",true);}
    finally{btn.disabled=false;btn.innerHTML='Continuar <span>↗</span>';}
  });
});
