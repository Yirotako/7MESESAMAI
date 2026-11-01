document.addEventListener("DOMContentLoaded",async()=>{
  const guest=await app.requireGuest();if(!guest)return;
  const settings=await app.settings();
  const start=settings.start_date||APP_CONFIG.START_DATE;
  const startDate=new Date(start+"T00:00:00");
  const now=new Date();const days=Math.max(0,Math.floor((now-startDate)/86400000));
  document.getElementById("daysCount").textContent=days;
  let months=(now.getFullYear()-startDate.getFullYear())*12+now.getMonth()-startDate.getMonth();
  if(now.getDate()<startDate.getDate()) months--;document.getElementById("monthsCount").textContent=Math.max(0,months);
  if(settings.letter)document.getElementById("letterContent").textContent=settings.letter;
  if(settings.music_url){const audio=document.getElementById("backgroundMusic");audio.src=settings.music_url;document.getElementById("musicButton").addEventListener("click",async()=>{try{if(audio.paused)await audio.play();else audio.pause();}catch(e){app.msg("musicButton","No se pudo reproducir");}});}else document.getElementById("musicButton").classList.add("hidden");
  const modules=settings.modules||{};
  const map={capsule:"capsula",quiz:"preguntas",secret:"secreto",gallery:"recuerdos"};
  Object.entries(map).forEach(([key,id])=>{if(modules[key]===false)document.getElementById(id).classList.add("hidden");});
  const {data:memories}=await app.client.from("memories").select("*").order("created_at",{ascending:false});
  const grid=document.getElementById("galleryGrid");
  if(memories?.length){grid.innerHTML="";memories.forEach(m=>{const item=document.createElement("article");item.className="gallery-item";const isVideo=/\.(mp4|webm|ogg)(\?.*)?$/i.test(m.media_url);const media=document.createElement(isVideo?"video":"img");media.src=m.media_url;if(isVideo){media.controls=true;}else{media.alt=m.title||"Recuerdo";}const title=document.createElement("h3");title.textContent=m.title;const desc=document.createElement("p");desc.textContent=m.description||"";item.append(media,title,desc);grid.append(item);});}
  const memoryLines=(settings.memories||"A veces los detalles pequeños son los que más permanecen.").split("\n").filter(Boolean);
  let index=0;document.getElementById("randomMemoryText").textContent=memoryLines[0]||"Un recuerdo para hoy.";
  document.getElementById("randomMemoryButton").onclick=()=>{index=(index+1)%memoryLines.length;document.getElementById("randomMemoryText").textContent=memoryLines[index];};
  document.getElementById("secretButton").onclick=()=>{const el=document.getElementById("secretMessage");el.textContent=settings.secret_message||"Gracias por formar parte de esta historia.";el.classList.remove("hidden");};
  await loadQuiz();
  document.getElementById("capsuleDate").min=new Date().toISOString().slice(0,10);
  document.getElementById("capsuleForm").addEventListener("submit",async e=>{
    e.preventDefault();const message=document.getElementById("capsuleMessage").value.trim(),openOn=document.getElementById("capsuleDate").value;
    const {error}=await app.client.from("capsules").insert({message,open_on:openOn});
    app.msg("capsuleStatus",error?error.message:"Cápsula guardada.",!!error);if(!error){e.target.reset();await loadCapsules();}
  });
  await loadCapsules();
  document.getElementById("logoutButton").onclick=()=>app.logout();
  async function loadCapsules(){
    const {data,error}=await app.client.from("capsules").select("*").order("open_on");
    const box=document.getElementById("capsuleList");box.innerHTML="";
    if(error)return;
    (data||[]).forEach(c=>{const div=document.createElement("div");div.className="capsule-item";const d=document.createElement("strong");d.textContent="Para abrir: "+c.open_on+" — ";div.append(d);const p=document.createElement("span");p.textContent=c.open_on<=new Date().toISOString().slice(0,10)?c.message:"Mensaje cerrado hasta la fecha elegida.";div.append(p);box.append(div);});
  }
  async function loadQuiz(){
    const {data}=await app.client.from("quiz_questions").select("*").limit(1).maybeSingle();
    if(!data)return;
    document.getElementById("quizQuestion").textContent=data.question;
    const answers=[data.correct_answer,...(data.wrong_answers||[])].sort(()=>Math.random()-.5);
    const box=document.getElementById("quizAnswers");box.innerHTML="";
    answers.forEach(a=>{const b=document.createElement("button");b.textContent=a;b.onclick=()=>app.msg("quizFeedback",a===data.correct_answer?"¡Exacto! Qué buen recuerdo.":"No era esa, pero puedes intentarlo de nuevo.",a!==data.correct_answer);box.append(b);});
  }
});
