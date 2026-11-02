import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, CheckCheck, Circle, ClipboardList, Clock3, Eye, EyeOff, LoaderCircle, LogOut, Mail, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
const TOKEN_KEY = 'todo-session-token';
async function request(path, options = {}) {
  let response;
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  try { response = await fetch(`${API}${path}`, { ...options, headers }); }
  catch { throw new Error('Server connection failed. Check that the API and MongoDB are running.'); }
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'The request could not be completed.'); }
  return response.status === 204 ? null : response.json();
}
const blankTask = { title: '', description: '', dueDate: '' };
const blankAccount = { username: '', email: '', password: '' };
const dateText = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const titleCase = value => String(value || '').trim().replace(/\b\S/g, letter => letter.toUpperCase());
function dueInfo(value, completed) {
  if (!value) return null;
  const due = new Date(value); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return { label: due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), overdue: !completed && due < today };
}

function AuthScreen({ mode, setMode, values, setValues, submit, busy, error, theme, setTheme, motion, setMotion }) {
  const [showPassword, setShowPassword] = useState(false);
  const registering = mode === 'register';
  return <main className="auth-page">
    <header className="auth-topbar"><a className="brand" href="#"><span className="brand-mark"><CheckCheck size={19}/></span><span>to-do</span></a><div className="auth-controls"><div className="auth-theme-pills" aria-label="Choose a color theme"><button type="button" className={theme==='olive'?'selected':''} onClick={()=>setTheme('olive')}><span className="theme-swatch swatch-olive"/>Olive</button><button type="button" className={theme==='gray'?'selected':''} onClick={()=>setTheme('gray')}><span className="theme-swatch swatch-gray"/>Light gray</button></div><button type="button" className={`auth-motion ${motion?'on':''}`} aria-pressed={motion} aria-label="Toggle animations" onClick={()=>setMotion(v=>!v)}><Sparkles size={14}/><span>{motion?'Motion on':'Motion off'}</span></button></div></header>
    <section className="auth-layout">
      <div className="auth-story"><div className="eyebrow"><span className="eyebrow-line"/>A CLEARER WAY TO GET THINGS DONE</div><h1>Make space for<br/><em>what matters.</em></h1><p>Keep every plan in one place. Sign in to pick up where you left off.</p><div className="story-points"><span><Check size={15}/> Your tasks, saved securely</span><span><Check size={15}/> A workspace that feels like yours</span></div><span className="story-orbit orbit-one"/><span className="story-orbit orbit-two"/></div>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-switch"><button type="button" className={!registering?'active':''} onClick={()=>setMode('login')}>Log in</button><button type="button" className={registering?'active':''} onClick={()=>setMode('register')}>Create account</button></div>
        <div className="auth-intro"><span className="auth-icon"><UserRound size={19}/></span><p className="section-label">{registering?'YOUR PERSONAL WORKSPACE':'WELCOME BACK'}</p><h2 id="auth-title">{registering?'Create your account':'Log in to To-Do'}</h2><p>{registering?'Set up your details to save and manage your tasks.':'Enter your email and password to continue.'}</p></div>
        <form className="auth-form" onSubmit={submit}>
          {registering && <label className="field"><span>USERNAME</span><div className="input-wrap"><UserRound size={16}/><input autoComplete="username" value={values.username} onChange={e=>setValues({...values,username:e.target.value})} placeholder="Your name" minLength={2} maxLength={32} required/></div></label>}
          <label className="field"><span>EMAIL ADDRESS</span><div className="input-wrap"><Mail size={16}/><input type="email" autoComplete="email" value={values.email} onChange={e=>setValues({...values,email:e.target.value})} placeholder="you@example.com" required/></div></label>
          <label className="field"><span>PASSWORD</span><div className="input-wrap"><ShieldCheck size={16}/><input type={showPassword?'text':'password'} autoComplete={registering?'new-password':'current-password'} value={values.password} onChange={e=>setValues({...values,password:e.target.value})} placeholder={registering?'At least 8 characters':'Your password'} minLength={registering?8:1} maxLength={128} required/><button className="password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
          {error && <div className="message error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy}>{busy?<><LoaderCircle className="spin" size={17}/> Please wait</>:<>{registering?'Create account':'Log in'}<ArrowRight size={16}/></>}</button>
        </form>
        <p className="auth-footnote"><ShieldCheck size={14}/> Your password is protected with a one-way hash.</p>
      </section>
    </section>
    <footer className="auth-footer"><span>TO-DO · PERSONAL TASK MANAGER</span><span>Theme: {theme==='olive'?'Olive green':'Light gray'}</span></footer>
  </main>;
}

export default function App() {
  const [user, setUser] = useState(null), [sessionChecking, setSessionChecking] = useState(true);
  const [authMode, setAuthMode] = useState('login'), [account, setAccount] = useState(blankAccount), [authBusy, setAuthBusy] = useState(false), [authError, setAuthError] = useState('');
  const [todos, setTodos] = useState([]), [form, setForm] = useState(blankTask), [filter, setFilter] = useState('all');
  const [query, setQuery] = useState(''), [editing, setEditing] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(()=>localStorage.getItem('todo-theme') || 'olive'), [motion, setMotion] = useState(()=>localStorage.getItem('todo-motion') !== 'off'), [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.motion=motion?'on':'off';
    localStorage.setItem('todo-theme',theme); localStorage.setItem('todo-motion',motion?'on':'off');
  },[theme,motion]);
  useEffect(()=>{
    const token=localStorage.getItem(TOKEN_KEY);
    if(!token){setSessionChecking(false);return;}
    request('/auth/me').then(data=>setUser(data.user)).catch(()=>localStorage.removeItem(TOKEN_KEY)).finally(()=>setSessionChecking(false));
  },[]);
  async function loadTodos(){setLoading(true);try{setError('');setTodos(await request('/todos'));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{if(user)loadTodos();else{setTodos([]);setLoading(false);}},[user]);
  function announce(message){setNotice(message);window.setTimeout(()=>setNotice(''),2400);}
  async function submitAuth(e){
    e.preventDefault();setAuthBusy(true);setAuthError('');
    try{
      const path=authMode==='register'?'/auth/register':'/auth/login';
      const payload=authMode==='register'?account:{email:account.email,password:account.password};
      const result=await request(path,{method:'POST',body:JSON.stringify(payload)});
      localStorage.setItem(TOKEN_KEY,result.token);setUser(result.user);setAccount(blankAccount);setAuthError('');
    }catch(e){setAuthError(e.message);}finally{setAuthBusy(false);}
  }
  function logout(){localStorage.removeItem(TOKEN_KEY);setUser(null);setTodos([]);setAccount(blankAccount);setAuthMode('login');setError('');setNotice('');}
  async function addTodo(e){
    e.preventDefault();if(!form.title.trim())return;setBusy(true);setError('');
    try{const todo=await request('/todos',{method:'POST',body:JSON.stringify({...form,title:form.title.trim(),dueDate:form.dueDate||null})});setTodos(current=>[todo,...current]);setForm(blankTask);announce('Task added.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function update(id,changes){try{const updated=await request(`/todos/${id}`,{method:'PATCH',body:JSON.stringify(changes)});setTodos(current=>current.map(t=>t._id===id?updated:t));return true;}catch(e){setError(e.message);return false;}}
  async function toggle(todo){if(await update(todo._id,{completed:!todo.completed}))announce(todo.completed?'Task moved back to To do.':'Task completed.');}
  async function saveEdit(){if(!editing?.title.trim()){setError('Task title cannot be empty.');return;}if(await update(editing._id,{title:editing.title.trim(),description:editing.description||'',dueDate:editing.dueDate||null})){setEditing(null);announce('Task updated.');}}
  async function remove(id){try{await request(`/todos/${id}`,{method:'DELETE'});setTodos(current=>current.filter(t=>t._id!==id));announce('Task deleted.');}catch(e){setError(e.message);}}

  const pending=todos.filter(t=>!t.completed).length,done=todos.length-pending,completion=todos.length?Math.round(done/todos.length*100):0;
  const visible=useMemo(()=>todos.filter(t=>(filter==='all'||(filter==='pending'?!t.completed:t.completed))&&`${t.title} ${t.description||''}`.toLowerCase().includes(query.trim().toLowerCase())),[todos,filter,query]);
  const filters=[['all','All tasks',todos.length],['pending','To do',pending],['completed','Completed',done]];
  const displayName=titleCase(user?.username),hour=new Date().getHours(),greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  if(sessionChecking)return <main className="session-loading"><span className="brand-mark"><CheckCheck size={19}/></span><LoaderCircle className="spin" size={20}/><p>Checking your account…</p></main>;
  if(!user)return <AuthScreen mode={authMode} setMode={mode=>{setAuthMode(mode);setAuthError('');}} values={account} setValues={setAccount} submit={submitAuth} busy={authBusy} error={authError} theme={theme} setTheme={setTheme} motion={motion} setMotion={setMotion}/>;

  return <main className="page">
    <header className="topbar"><a className="brand" href="#" aria-label="To-Do home"><span className="brand-mark"><CheckCheck size={19}/></span><span>to-do</span></a><div className="top-meta"><span className="top-date"><CalendarDays size={14}/>{dateText.format(new Date())}</span><span className="user-chip"><span className="avatar">{displayName.slice(0,1).toUpperCase()}</span><span>{displayName}</span></span><div className="customize-anchor"><button type="button" className={`top-action ${customizeOpen?'is-open':''}`} onClick={()=>setCustomizeOpen(v=>!v)} aria-expanded={customizeOpen}><Settings2 size={16}/><span>Customize</span></button>{customizeOpen&&<section className="customize-panel"><div className="customize-head"><div><strong>Personalize</strong><small>Make the workspace yours</small></div><button type="button" className="icon-button" onClick={()=>setCustomizeOpen(false)} aria-label="Close customizations"><X size={15}/></button></div><p className="section-label">COLOR THEME</p><div className="theme-choices"><button type="button" className={`theme-choice ${theme==='olive'?'selected':''}`} onClick={()=>setTheme('olive')}><span className="theme-swatch swatch-olive"/>Olive green{theme==='olive'&&<Check size={15}/>}</button><button type="button" className={`theme-choice ${theme==='gray'?'selected':''}`} onClick={()=>setTheme('gray')}><span className="theme-swatch swatch-gray"/>Light gray{theme==='gray'&&<Check size={15}/>}</button></div><div className="motion-setting"><span><strong>Animations</strong><small>Soft motion across the app</small></span><button type="button" role="switch" aria-checked={motion} className={`switch ${motion?'on':''}`} onClick={()=>setMotion(v=>!v)}><span/></button></div></section>}</div><button type="button" className="top-action logout-button" onClick={logout}><LogOut size={15}/><span>Log out</span></button></div></header>
    <section className="hero"><div className="eyebrow"><span className="eyebrow-line"/>{displayName.toUpperCase()}'S TASK SPACE</div><h1>{greeting}, {displayName}.<br/><em>Let's make today count.</em></h1><p className="hero-copy">A clear plan makes room for your best work.</p><span className="hero-sparkle"><Sparkles size={23}/></span></section>
    <section className="workspace">
      <div className="workspace-heading"><div><p className="section-label">OVERVIEW</p><h2>Your day at a glance</h2></div><span className="live-pill"><span/>LIVE</span></div>
      <div className="dashboard"><div className="stat-card total-card"><span className="stat-icon"><ClipboardList size={17}/></span><div className="stat-copy"><span>ALL TASKS</span><b key={todos.length}>{todos.length}</b><small>In your list</small></div></div><div className="stat-card pending-card"><span className="stat-icon"><Clock3 size={17}/></span><div className="stat-copy"><span>TO DO</span><b key={pending}>{pending}</b><small>Ready when you are</small></div></div><div className="stat-card complete-card"><span className="stat-icon"><Check size={17}/></span><div className="stat-copy"><span>COMPLETED</span><b key={done}>{done}</b><small>{completion}% of your list</small></div></div></div>
      <div className="task-panel"><div className="workspace-head"><div><p className="section-label">YOUR WORKSPACE</p><h2>Task list <span className="count">{todos.length}</span></h2></div><div className="progress"><span className="progress-label">{completion}% complete</span><span className="progress-track"><span style={{width:`${completion}%`}}/></span></div></div>
        <form className="add-form" onSubmit={addTodo}><div className="form-grid"><label className="field"><span>TASK TITLE</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Finish project report" maxLength={120} required/></label><label className="field"><span>DESCRIPTION <small>OPTIONAL</small></span><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Add a little detail" maxLength={500}/></label><label className="field date-field"><span>DUE DATE <small>OPTIONAL</small></span><input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label></div><button className="add-button" disabled={busy||!form.title.trim()}>{busy?<><LoaderCircle className="spin" size={16}/> Saving</>:<><Plus size={16}/> Add task</>}</button></form>
        {(error||notice)&&<div className={`message ${error?'error':'success'}`} role={error?'alert':'status'}>{error||notice}{error&&<button type="button" onClick={()=>setError('')} aria-label="Dismiss"><X size={15}/></button>}</div>}
        <div className="list-toolbar"><div className="filters" role="tablist" aria-label="Filter tasks">{filters.map(([key,label,count])=><button type="button" role="tab" aria-selected={filter===key} key={key} className={`filter ${filter===key?'selected':''}`} onClick={()=>setFilter(key)}>{label}<small>{count}</small></button>)}</div><label className="search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={13}/></button>}</label></div>
        <div className="todo-list" aria-live="polite">{loading?<div className="empty"><LoaderCircle className="spin" size={24}/><p>Loading your tasks…</p></div>:visible.length===0?<div className="empty"><span className="empty-icon"><ClipboardList size={26}/></span><p>{todos.length?'No tasks match this view.':'A fresh page.'}</p><small>{todos.length?'Try another filter or search.':'Add a task above to get started.'}</small></div>:visible.map((todo,index)=>{const due=dueInfo(todo.dueDate,todo.completed);return <article className={`todo-row ${todo.completed?'is-done':''}`} key={todo._id} style={{'--i':index}}>
          <button type="button" className="check-button" onClick={()=>toggle(todo)} aria-label={todo.completed?'Mark as to do':'Mark complete'} title={todo.completed?'Mark as to do':'Mark complete'}>{todo.completed?<Check size={15}/>:<Circle size={19}/>}</button>
          {editing?._id===todo._id?<div className="edit-fields"><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} maxLength={120} aria-label="Edit title" onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditing(null)}}/><input value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="Description" aria-label="Edit description" maxLength={500}/><input type="date" value={editing.dueDate?editing.dueDate.slice(0,10):''} onChange={e=>setEditing({...editing,dueDate:e.target.value})} aria-label="Edit due date"/></div>:<div className="todo-content"><span className="todo-title">{todo.title}</span>{todo.description&&<span className="todo-description">{todo.description}</span>}{due&&<span className={`due-date ${due.overdue?'overdue':''}`}><CalendarDays size={12}/>{due.overdue?'OVERDUE · ':'DUE · '}{due.label}</span>}</div>}
          <div className="row-actions">{editing?._id===todo._id?<><button type="button" className="icon-button save" onClick={saveEdit} aria-label="Save changes" title="Save"><Check size={17}/></button><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="Cancel editing" title="Cancel"><X size={17}/></button></>:<><button type="button" className="icon-button" onClick={()=>setEditing({...todo})} aria-label="Edit task" title="Edit task"><Pencil size={16}/></button><button type="button" className="icon-button delete" onClick={()=>remove(todo._id)} aria-label="Delete task" title="Delete task"><Trash2 size={16}/></button></>}</div>
        </article>;})}</div>
        <footer className="list-footer"><span><span className="status-dot"/>SAVED TO MONGODB</span><span>{pending} {pending===1?'task':'tasks'} left to do</span></footer>
      </div>
    </section>
    <footer className="page-footer"><span>TO-DO · PERSONAL TASK MANAGER</span><span>Small steps. Clear mind.</span></footer>
  </main>;
}
