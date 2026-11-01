window.app = {
  client: null,
  ready() {
    const c = window.APP_CONFIG || {};
    if (!window.supabase || !c.SUPABASE_URL || c.SUPABASE_URL.startsWith("PEGA_AQUI") || !c.SUPABASE_ANON_KEY || c.SUPABASE_ANON_KEY.startsWith("PEGA_AQUI")) return false;
    if (!this.client) this.client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return true;
  },
  msg(id, text, error=false) { const el=document.getElementById(id); if(el){el.textContent=text;el.style.color=error?"#a34f5f":"#8b6570";} },
  async settings() {
    if(!this.ready()) return {};
    const {data,error}=await this.client.from("site_settings").select("key,value");
    if(error) return {};
    return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  },
  async requireGuest() {
    if(!this.ready()) { location.href="index.html"; return null; }
    const {data:{session}}=await this.client.auth.getSession();
    if(!session){location.href="index.html";return null;}
    const {data,error}=await this.client.from("guest_memberships").select("id,nickname,status,response").eq("user_id",session.user.id).maybeSingle();
    if(error||!data||data.status!=="accepted"){location.href="index.html";return null;}
    return data;
  },
  async logout(){if(this.ready()) await this.client.auth.signOut();location.href="index.html";},
  async adminSession(){
    if(!this.ready()) return false;
    const {data:{session}}=await this.client.auth.getSession();
    if(!session) return false;
    const {data,error}=await this.client.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
    return !error && !!data;
  }
};
