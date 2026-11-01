document.addEventListener("DOMContentLoaded",async()=>{
  if(!app.ready()){app.msg("adminLoginMessage","Configura Supabase siguiendo el README.",true);return;}
  const login=document.getElementById("adminLogin"),dash=document.getElementById("adminDashboard");
  async function show(){
    const ok=await app.adminSession();login.classList.toggle("hidden",ok);dash.classList.toggle("hidden",!ok);if(ok)await refresh();
  }
  document.getElementById("adminLoginForm").addEventListener("submit",async e=>{
    e.preventDefault();const {error}=await app.client.auth.signInWithPassword({email:adminEmail.value,password:adminPassword.value});
    if(error){app.msg("adminLoginMessage",error.message,true);return;}
    if(!await app.adminSession()){await app.client.auth.signOut();app.msg("adminLoginMessage","Esta cuenta no tiene permisos de administrador.",true);return;}await show();
  });
  document.getElementById("adminLogout").onclick=()=>app.logout();
  async function refresh(){
    const {data:invites}=await app.client.from("invitation_access").select("*").order("created_at",{ascending:false});
    const rows=invites||[];totalUsers.textContent=rows.length;yesCount.textContent=rows.filter(x=>x.response==="yes").length;noCount.textContent=rows.filter(x=>x.response==="no").length;pendingCount.textContent=rows.filter(x=>x.reaccess_requested).length;
    inviteRows.innerHTML="";
    rows.forEach(x=>{const tr=document.createElement("tr");[x.nickname,x.response||"Sin respuesta",x.status,x.last_seen?new Date(x.last_seen).toLocaleString():"—"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});const td=document.createElement("td");const b=document.createElement("button");b.textContent=x.status==="accepted"?"Bloquear":"Autorizar";b.onclick=async()=>{const {error}=await app.client.rpc("admin_set_invite_status",{p_invite_id:x.id,p_status:x.status==="accepted"?"denied":"accepted"});if(error)alert(error.message);else refresh();};td.append(b);tr.append(td);inviteRows.append(tr);});
    const s=await app.settings();settingQuestion.value=s.question||"¿Deseas continuar siendo algo bueno?";settingLetter.value=s.letter||"";settingSecret.value=s.secret_message||"";settingMemories.value=s.memories||"";settingStart.value=s.start_date||APP_CONFIG.START_DATE;settingMusic.value=s.music_url||"";
    const {data:mems}=await app.client.from("memories").select("*").order("created_at",{ascending:false});adminMemoryList.innerHTML="";
    (mems||[]).forEach(m=>{const row=document.createElement("div");row.className="admin-memory-row";const span=document.createElement("span");span.textContent=m.title;const b=document.createElement("button");b.textContent="Eliminar";b.onclick=async()=>{await app.client.from("memories").delete().eq("id",m.id);refresh();};row.append(span,b);adminMemoryList.append(row);});
    const modules=s.modules||{capsule:true,quiz:true,secret:true,gallery:true};moduleToggles.innerHTML="";
    [["capsule","Cápsula del tiempo"],["quiz","Preguntas"],["secret","Mensaje secreto"],["gallery","Galería"]].forEach(([k,label])=>{const l=document.createElement("label");l.className="module-toggle";const i=document.createElement("input");i.type="checkbox";i.checked=modules[k]!==false;i.onchange=()=>{modules[k]=i.checked;saveModule(modules);};l.append(i,document.createTextNode(label));moduleToggles.append(l);});
    const {data:q}=await app.client.from("quiz_questions").select("*").limit(1).maybeSingle();if(q){quizPrompt.value=q.question;quizCorrect.value=q.correct_answer;quizWrong.value=(q.wrong_answers||[]).join(" | ");}
  }
  async function upsert(key,value){return app.client.from("site_settings").upsert({key,value,updated_at:new Date().toISOString()});}
  async function saveModule(modules){const {error}=await upsert("modules",modules);if(error)alert(error.message);}
  contentForm.addEventListener("submit",async e=>{e.preventDefault();const values={question:settingQuestion.value,letter:settingLetter.value,secret_message:settingSecret.value,memories:settingMemories.value,start_date:settingStart.value,music_url:settingMusic.value,modules:(await app.settings()).modules||{capsule:true,quiz:true,secret:true,gallery:true}};for(const [k,v] of Object.entries(values)){const {error}=await upsert(k,v);if(error){app.msg("contentStatus",error.message,true);return;}}app.msg("contentStatus","Cambios guardados.");});
  memoryForm.addEventListener("submit",async e=>{e.preventDefault();const {error}=await app.client.from("memories").insert({title:memoryTitle.value,description:memoryDescription.value,media_url:memoryUrl.value});app.msg("memoryStatus",error?error.message:"Recuerdo agregado.",!!error);if(!error){memoryForm.reset();refresh();}});
  quizForm.addEventListener("submit",async e=>{e.preventDefault();const {data:old}=await app.client.from("quiz_questions").select("id").limit(1).maybeSingle();const row={question:quizPrompt.value,correct_answer:quizCorrect.value,wrong_answers:quizWrong.value.split("|").map(x=>x.trim()).filter(Boolean)};const result=old?await app.client.from("quiz_questions").update(row).eq("id",old.id):await app.client.from("quiz_questions").insert(row);app.msg("quizStatus",result.error?result.error.message:"Pregunta guardada.",!!result.error);});
  await show();
});
