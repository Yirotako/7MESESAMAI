document.addEventListener("DOMContentLoaded",async()=>{
  if(!app.ready()){app.msg("choiceMessage","Configura Supabase siguiendo el README.",true);return;}
  const guest=await app.requireGuest(); if(!guest)return;
  const settings=await app.settings();
  document.getElementById("questionText").textContent=settings.question||"¿Deseas continuar siendo algo bueno?";
  const yes=document.getElementById("yesButton"),no=document.getElementById("noButton");
  yes.addEventListener("click",async()=>{
    yes.disabled=true;
    const {error}=await app.client.rpc("record_invitation_response",{p_response:"yes"});
    if(error){app.msg("choiceMessage",error.message,true);yes.disabled=false;return;}
    location.href="historia.html";
  });
  no.addEventListener("click",async()=>{
    no.disabled=true;
    const {error}=await app.client.rpc("record_invitation_response",{p_response:"no"});
    if(error){app.msg("choiceMessage",error.message,true);no.disabled=false;return;}
    document.querySelector(".choice-actions").classList.add("hidden");
    document.getElementById("questionText").textContent="Gracias por responder con sinceridad.";
    app.msg("choiceMessage","Tu decisión ha quedado registrada. Si deseas reconsiderarlo, puedes solicitar un nuevo acceso al administrador.");
    const request=document.createElement("button");request.className="button button-light";request.textContent="Solicitar otro acceso";
    request.onclick=async()=>{
      const {error}=await app.client.rpc("request_reaccess");
      app.msg("choiceMessage",error?"No se pudo enviar la solicitud. Inténtalo más tarde.":"Tu solicitud fue enviada. El acceso quedará pendiente de autorización.",!!error);
      request.disabled=true;
    };
    document.querySelector(".invitation-card").appendChild(request);
  });
});
