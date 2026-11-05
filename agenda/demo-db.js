/* Demonstração da agenda: faz o papel do Firebase, mas guarda tudo no próprio aparelho (localStorage).
   Na primeira abertura entra com os serviços da Rafaela e alguns horários de exemplo.
   Na versão oficial, este arquivo sai e entra o Firebase (login + banco na nuvem), igual ao da Essence Glam. */
(function(){
  const KEY = "rafaelamoura.demo.v1";
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const dia = n => { const d = new Date(); d.setDate(d.getDate()+n); return ymd(d); };

  /* cuidados tirados do post "Como cuidar dos seus cílios após a extensão" do Instagram dela */
  const CUIDADOS = "• Lave os cílios todo dia com shampoo próprio pra extensão, de leve na região dos olhos.\n• Seque com delicadeza, sem esfregar: toalha limpa ou secador no frio.\n• Evite produtos oleosos (demaquilante bifásico, cremes e séruns) perto dos olhos.\n• Não puxe nem esfregue os cílios. Arrancar a extensão pode danificar seus fios naturais.\n• Faça a manutenção no prazo certo pra manter o efeito bonito por mais tempo.";
  const cilios = (id, nome) => ({id, nome, profId: "rafa", preco: null, duracao: null, retornoDias: null, cuidados: CUIDADOS});
  function seed(){
    const cfg = {
      estudio: "Rafaela Moura · Lash Designer",
      profissionais: [{id: "rafa", nome: "Rafaela Moura", area: "Extensão de cílios", cor: "#6E5E55"}],
      servicos: [
        cilios("s-fio", "Fio a fio clássico"),
        cilios("s-br", "Volume brasileiro"),
        cilios("s-egi", "Volume egípcio"),
        cilios("s-5d", "Volume 5D"),
        cilios("s-fox", "Fox eyes"),
        cilios("s-mfox", "Mega fox eyes"),
        cilios("s-cap", "Capping"),
        {id: "s-buco", nome: "Epilação de buço", profId: "rafa", preco: null, duracao: null, retornoDias: null, cuidados: ""}
      ],
      reservaPct: 0,
      semProxima: "buço",
      domicilioServicos: "^$sem-domiciliar",
      taxas: {"Cartão de débito": {pct: 0, proxDiaUtil: true}, "Cartão de crédito": {pct: 0, proxDiaUtil: true}, "Link de pagamento (crédito)": {pct: 0, proxDiaUtil: true}}
    };
    const cli = (id, nome) => ({nome, telefone: "", obs: "Cliente de exemplo", criadoEm: dia(-40)});
    const ag = (cid, sid, nome, data, hora, status) => ({clienteId: cid, profId: "rafa", divisao: [], servicos: [{id: sid, nome, preco: null, duracao: null}], servicoId: sid, servicoNome: nome, domicilio: null, data, hora, valor: null, duracao: null, obs: "", status, criadoEm: new Date().toISOString()});
    return {
      config: {geral: cfg},
      clientes: {c1: cli("c1", "Ana (exemplo)"), c2: cli("c2", "Bruna (exemplo)"), c3: cli("c3", "Camila (exemplo)"), c4: cli("c4", "Duda (exemplo)")},
      agendamentos: {
        a1: ag("c1", "s-mfox", "Mega fox eyes", dia(0), "09:00", "confirmado"),
        a2: ag("c2", "s-br", "Volume brasileiro", dia(0), "14:00", "agendado"),
        a3: ag("c3", "s-cap", "Capping", dia(1), "10:00", "agendado"),
        a4: ag("c4", "s-fox", "Fox eyes", dia(3), "15:30", "agendado"),
        a5: ag("c1", "s-buco", "Epilação de buço", dia(5), "11:00", "agendado")
      },
      caixa: {}, acompanhamentos: {}, reservas: {}, pedidos: {}
    };
  }
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY)); } catch(e){}
  if (!store || !store.config) store = seed();
  ["config","clientes","agendamentos","caixa","acompanhamentos","reservas","pedidos"].forEach(c => store[c] = store[c] || {});
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch(e){} };
  save();

  const subs = []; let n = 0;
  const notify = () => { save(); setTimeout(() => subs.forEach(f => f()), 0); };
  const clone = d => JSON.parse(JSON.stringify(d === undefined ? null : d));
  const novoId = () => Date.now().toString(36) + (++n).toString(36) + Math.random().toString(36).slice(2, 6);
  function docRef(c, id){ return { id,
    set: async d => { store[c][id] = clone(d); notify(); },
    update: async d => { store[c][id] = {...store[c][id], ...clone(d)}; notify(); },
    delete: async () => { delete store[c][id]; notify(); },
    get: async () => ({exists: !!store[c][id], data: () => store[c][id]}),
    onSnapshot: cb => { const f = () => cb({exists: !!store[c][id], data: () => store[c][id]}); subs.push(f); f(); return () => {}; } }; }
  function q(c, filt){ return {
    doc: id => docRef(c, id || novoId()), orderBy: () => q(c, filt), limit: () => q(c, filt),
    where: (k, op, v) => q(c, d => d[k] === v),
    get: async () => ({docs: Object.entries(store[c]).map(([i, d]) => ({id: i, data: () => d}))}),
    onSnapshot: cb => { const f = () => cb({docs: Object.entries(store[c]).filter(([i, d]) => !filt || filt(d)).map(([i, d]) => ({id: i, data: () => d}))}); subs.push(f); f(); return () => {}; } }; }
  const db = { collection: c => q(c), doc: p => { const [c, i] = p.split("/"); return docRef(c, i); }, settings(){}, enablePersistence: async () => {},
    batch(){ const ops = []; return {set: (r, d) => ops.push(() => r.set(d)), commit: async () => { for (const o of ops) await o(); }}; } };
  const auth = { setPersistence: async () => {}, onAuthStateChanged: cb => setTimeout(() => cb({email: "demonstração"}), 0), signOut: async () => {},
    signInWithEmailAndPassword: async () => {}, sendPasswordResetEmail: async () => {} };
  window.firebase = { initializeApp(){}, auth: Object.assign(() => auth, {Auth: {Persistence: {LOCAL: 1}}}), firestore: () => db };
  window.__DEMO = true;
  window.__demoReset = () => { try { localStorage.removeItem(KEY); } catch(e){} location.reload(); };
})();
