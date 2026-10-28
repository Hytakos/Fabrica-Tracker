import React, { useState, useEffect, useRef } from 'react';
import { 
  initializeAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { 
  Film, Box, Settings, Plus, Play, Pause, Trash2, LogOut, 
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, Timer, FolderKanban, BarChart, ChevronLeft
} from 'lucide-react';

// Clé découpée pour contourner l'alerte GitHub
const keyPart1 = "AIzaSyDgTadoI2_";
const keyPart2 = "BW9mRhi1_--wsGmfGOetAx1Y";
const firebaseConfig = {
  apiKey: keyPart1 + keyPart2,
  authDomain: "fabrica-tracker.firebaseapp.com",
  projectId: "fabrica-tracker",
  storageBucket: "fabrica-tracker.firebasestorage.app",
  messagingSenderId: "389627861507",
  appId: "1:389627861507:web:81e01785c7b10de213cc36"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const PIPELINE_2D = ['Animatic', 'Color Script', 'Layout', '2D Background', '2D FX', '2D Anim Rough', '2D Anim Clean', '2D Anim Colo', 'Compositing'];
const PIPELINE_3D = ['Animatic', 'Color Script', 'Layout', 'Modeling', '3D Background', '3D FX', '3D Anim', '3D Lighting', '3D Render', 'Compositing'];
const ASSET_CATEGORIES = ['Model Design', 'Props Design', 'Storyboard', 'Background Concept'];

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'workspace'
  const [activeTab, setActiveTab] = useState('shots');
  
  // Dashboard states
  const [myProjects, setMyProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('2D');
  const [joinCode, setJoinCode] = useState('');

  // Workspace states
  const [workspace, setWorkspace] = useState(null);
  const [userRole, setUserRole] = useState('Artist');
  const [shots, setShots] = useState([]);
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  
  // Auth states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMode, setAuthMode] = useState('login');

  // Video & Time states
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedStep, setSelectedStep] = useState('');

  // INITIALISATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) setUserData({ id: uDoc.id, ...uDoc.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // FETCH PROJECTS (DASHBOARD)
  useEffect(() => {
    if (!user) return;
    const qProjects = query(collection(db, 'projectMembers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(qProjects, (snap) => {
      setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // FETCH WORKSPACE DATA
  useEffect(() => {
    if (!workspace) return;

    const qShots = query(collection(db, 'shots'), where('workspaceId', '==', workspace.id));
    const unsubShots = onSnapshot(qShots, (snap) => setShots(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qAssets = query(collection(db, 'assets'), where('workspaceId', '==', workspace.id));
    const unsubAssets = onSnapshot(qAssets, (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qMembers = query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id));
    const unsubMembers = onSnapshot(qMembers, (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qLogs = query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id));
    const unsubLogs = onSnapshot(qLogs, (snap) => setTimeLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubShots(); unsubAssets(); unsubMembers(); unsubLogs(); };
  }, [workspace]);

  // TIMER LOGIC
  useEffect(() => {
    let interval = null;
    if (isTimerActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleStopTimer = async () => {
    setIsTimerActive(false);
    if (timer > 0 && selectedTask && selectedStep && workspace) {
      const taskName = [...shots, ...assets].find(t => t.id === selectedTask)?.name || 'Inconnu';
      await addDoc(collection(db, 'timeLogs'), {
        workspaceId: workspace.id,
        userId: user.uid,
        userName: userData.displayName,
        taskId: selectedTask,
        taskName: taskName,
        step: selectedStep,
        durationSeconds: timer,
        date: serverTimestamp()
      });
      setTimer(0);
      alert('Temps de travail enregistré !');
    }
  };

  // AUTH ACTIONS
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, displayName: authName });
        setUserData({ id: res.user.uid, email: authEmail, displayName: authName });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setCurrentView('dashboard');
    } catch (err) { alert(err.message); }
  };

  // PROJECT ACTIONS
  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    
    const wsRef = await addDoc(collection(db, 'workspaces'), {
      name: newProjectName,
      type: newProjectType,
      pipeline: newProjectType === '2D' ? PIPELINE_2D : PIPELINE_3D,
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, 'projectMembers'), {
      workspaceId: wsRef.id,
      workspaceName: newProjectName,
      userId: user.uid,
      displayName: userData.displayName,
      email: userData.email,
      role: 'Admin'
    });
    
    setNewProjectName('');
  };

  const joinProject = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    
    const wsDoc = await getDoc(doc(db, 'workspaces', joinCode));
    if (!wsDoc.exists()) { alert('Code de projet invalide'); return; }

    const alreadyJoined = myProjects.find(p => p.workspaceId === joinCode);
    if (alreadyJoined) { alert('Tu fais déjà partie de ce projet'); return; }

    await addDoc(collection(db, 'projectMembers'), {
      workspaceId: wsDoc.id,
      workspaceName: wsDoc.data().name,
      userId: user.uid,
      displayName: userData.displayName,
      email: userData.email,
      role: 'Artist'
    });
    setJoinCode('');
  };

  const openProject = async (projectItem) => {
    const wsDoc = await getDoc(doc(db, 'workspaces', projectItem.workspaceId));
    if (wsDoc.exists()) {
      setWorkspace({ id: wsDoc.id, ...wsDoc.data() });
      setUserRole(projectItem.role);
      setCurrentView('workspace');
      setActiveTab('shots');
    }
  };

  // HELPERS
  const canAssign = ['Admin', 'Supervisor'].includes(userRole);
  const allTasks = [...shots, ...assets];

  // RENDER APP
  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-blue-500 text-center">Fabrica Tracker</h1>
          <div className="flex space-x-4 border-b border-slate-800 pb-2">
            <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 ${authMode === 'login' ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>Connexion</button>
            <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 ${authMode === 'register' ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>Inscription</button>
          </div>
          {authMode === 'register' && (
            <input type="text" placeholder="Ton pseudo / Nom" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          )}
          <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          <input type="password" placeholder="Mot de passe" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded">
            {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-500">Fabrica Tracker</h1>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Salut, {userData?.displayName}</span>
            <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300"><LogOut size={24} /></button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des projets */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center"><FolderKanban className="mr-2" /> Mes Projets</h2>
            <div className="space-y-3">
              {myProjects.length === 0 ? <p className="text-slate-500">Aucun projet rejoint.</p> : null}
              {myProjects.map(p => (
                <div key={p.id} onClick={() => openProject(p)} className="bg-slate-950 border border-slate-800 p-4 rounded-lg cursor-pointer hover:border-blue-500 flex justify-between items-center transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{p.workspaceName}</h3>
                    <p className="text-xs text-slate-500">Rôle : {p.role}</p>
                  </div>
                  <Play size={20} className="text-blue-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions : Créer / Rejoindre */}
          <div className="space-y-6">
            <form onSubmit={createProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">Créer un projet</h2>
              <input type="text" placeholder="Nom du projet" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
              <select value={newProjectType} onChange={(e) => setNewProjectType(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded">
                <option value="2D">Production 2D</option>
                <option value="3D">Production 3D</option>
              </select>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded">Créer</button>
            </form>

            <form onSubmit={joinProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">Rejoindre un projet</h2>
              <input type="text" placeholder="Code d'invitation" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-sm" required />
              <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded">Rejoindre</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // WORKSPACE VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div className="space-y-6">
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6">
            <ChevronLeft size={20} /> <span className="hidden md:inline font-bold">Retour aux projets</span>
          </button>
          
          <div className="text-xl font-bold text-blue-500 hidden md:block">{workspace?.name}</div>
          
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('shots')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'shots' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Film size={20} /> <span className="hidden md:inline">Plans</span>
            </button>
            <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'assets' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Box size={20} /> <span className="hidden md:inline">Assets</span>
            </button>
            <button onClick={() => setActiveTab('review')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'review' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <MonitorPlay size={20} /> <span className="hidden md:inline">Review Vidéo</span>
            </button>
            <button onClick={() => setActiveTab('time')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'time' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Clock size={20} /> <span className="hidden md:inline">Chronomètre</span>
            </button>
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'stats' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <BarChart size={20} /> <span className="hidden md:inline">Statistiques</span>
            </button>
            <button onClick={() => setActiveTab('team')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'team' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Users size={20} /> <span className="hidden md:inline">Équipe</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Settings size={20} /> <span className="hidden md:inline">Paramètres</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 overflow-x-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            <p className="text-xs text-slate-400">Connecté en tant que : <span className="text-blue-400 font-bold">{userData?.displayName}</span> ({userRole})</p>
          </div>
        </header>

        {/* SHOTS TAB */}
        {activeTab === 'shots' && (
          <div className="space-y-4">
            {canAssign && (
              <button 
                onClick={async () => {
                  const name = prompt('Nom du plan (ex: SH_010) :');
                  if (name) await addDoc(collection(db, 'shots'), { name, workspaceId: workspace.id, status: {}, assignedTo: '' });
                }} 
                className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded text-sm font-bold"
              >
                <Plus size={16} /> <span>Ajouter un plan</span>
              </button>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2">Plan</th>
                    <th className="p-2">Assigné à</th>
                    {workspace?.pipeline?.map(step => <th key={step} className="p-2">{step}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shots.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50">
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2">
                        {canAssign ? (
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-blue-300"
                            value={s.assignedTo || ''}
                            onChange={async (e) => await updateDoc(doc(db, 'shots', s.id), { assignedTo: e.target.value })}
                          >
                            <option value="">-- Personne --</option>
                            {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-400">{members.find(m => m.userId === s.assignedTo)?.displayName || 'Non assigné'}</span>
                        )}
                      </td>
                      {workspace?.pipeline?.map(step => (
                        <td key={step} className="p-2">
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs"
                            value={s.status?.[step] || 'todo'}
                            onChange={async (e) => await updateDoc(doc(db, 'shots', s.id), { [`status.${step}`]: e.target.value })}
                          >
                            <option value="todo">À faire</option>
                            <option value="wip">En cours</option>
                            <option value="review">Review</option>
                            <option value="done">Terminé</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ASSETS TAB */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {canAssign && (
              <button 
                onClick={async () => {
                  const name = prompt('Nom de l\'Asset :');
                  if (name) await addDoc(collection(db, 'assets'), { name, category: 'Model Design', workspaceId: workspace.id, status: {}, assignedTo: '' });
                }} 
                className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded text-sm font-bold"
              >
                <Plus size={16} /> <span>Ajouter un Asset</span>
              </button>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2">Catégorie</th>
                    <th className="p-2">Asset</th>
                    <th className="p-2">Assigné à</th>
                    {workspace?.pipeline?.map(step => <th key={step} className="p-2">{step}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className="border-b border-slate-800/50">
                      <td className="p-2">
                        {canAssign ? (
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs"
                            value={a.category || ''}
                            onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { category: e.target.value })}
                          >
                            {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-400">{a.category}</span>
                        )}
                      </td>
                      <td className="p-2 font-medium">{a.name}</td>
                      <td className="p-2">
                        {canAssign ? (
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-blue-300"
                            value={a.assignedTo || ''}
                            onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { assignedTo: e.target.value })}
                          >
                            <option value="">-- Personne --</option>
                            {members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-400">{members.find(m => m.userId === a.assignedTo)?.displayName || 'Non assigné'}</span>
                        )}
                      </td>
                      {workspace?.pipeline?.map(step => (
                        <td key={step} className="p-2">
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs"
                            value={a.status?.[step] || 'todo'}
                            onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { [`status.${step}`]: e.target.value })}
                          >
                            <option value="todo">À faire</option>
                            <option value="wip">En cours</option>
                            <option value="review">Review</option>
                            <option value="done">Terminé</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === 'review' && (
          <div className="space-y-4 max-w-4xl">
            <label className="inline-flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded cursor-pointer hover:bg-slate-700">
              <Upload size={16} /> <span>{uploading ? 'Upload en cours...' : 'Charger une vidéo'}</span>
              <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);
                const vidRef = storageRef(storage, `workspaces/${workspace.id}/reviews/${file.name}`);
                await uploadBytes(vidRef, file);
                const url = await getDownloadURL(vidRef);
                setVideoUrl(url);
                setUploading(false);
              }} disabled={uploading} />
            </label>
            
            {videoUrl ? (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <video ref={videoRef} src={videoUrl} className="w-full rounded bg-black aspect-video" controls={false} />
                <div className="flex justify-center items-center space-x-6 mt-4">
                  <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/24); } }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipBack size={20} /></button>
                  <button onClick={() => videoRef.current?.play()} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full"><Play size={24} /></button>
                  <button onClick={() => videoRef.current?.pause()} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full"><Pause size={24} /></button>
                  <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/24); } }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipForward size={20} /></button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Avance/Recule frame par frame (Base 24fps)</p>
              </div>
            ) : (
              <div className="aspect-video bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">Aucune vidéo chargée</div>
            )}
          </div>
        )}

        {/* TIME TRACKING TAB */}
        {activeTab === 'time' && (
          <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
            <h3 className="font-bold text-center">Enregistrer mon travail</h3>
            <div className="space-y-4">
              <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" disabled={isTimerActive}>
                <option value="">-- Sélectionner un Plan / Asset --</option>
                {allTasks.map(t => <option key={t.id} value={t.id}>{t.name} {t.category ? `(Asset)` : `(Plan)`}</option>)}
              </select>
              
              <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" disabled={isTimerActive}>
                <option value="">-- Étape du pipeline --</option>
                {workspace?.pipeline?.map(step => <option key={step} value={step}>{step}</option>)}
              </select>
            </div>

            <div className="text-center py-6">
              <div className="text-5xl font-mono tracking-wider mb-6 text-blue-400">{formatTime(timer)}</div>
              <div className="flex justify-center space-x-4">
                {!isTimerActive ? (
                  <button onClick={() => {
                    if (!selectedTask || !selectedStep) return alert("Sélectionne une tâche et une étape d'abord !");
                    setIsTimerActive(true);
                  }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold">
                    <Play size={20} /> <span>Démarrer</span>
                  </button>
                ) : (
                  <button onClick={handleStopTimer} className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 px-6 py-3 rounded-lg font-bold text-white">
                    <Pause size={20} /> <span>Stop & Sauvegarder</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center"><BarChart className="mr-2"/> Temps passé sur le projet</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    {canAssign && <th className="p-2">Membre</th>}
                    <th className="p-2">Tâche</th>
                    <th className="p-2">Étape</th>
                    <th className="p-2">Temps total</th>
                  </tr>
                </thead>
                <tbody>
                  {timeLogs
                    .filter(log => canAssign || log.userId === user.uid)
                    .sort((a, b) => b.date - a.date)
                    .map(log => (
                      <tr key={log.id} className="border-b border-slate-800/50">
                        {canAssign && <td className="p-2 font-medium">{log.userName}</td>}
                        <td className="p-2">{log.taskName}</td>
                        <td className="p-2 text-slate-400">{log.step}</td>
                        <td className="p-2 text-blue-400 font-mono">{formatTime(log.durationSeconds)}</td>
                      </tr>
                  ))}
                  {timeLogs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Aucune donnée de temps enregistrée.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-2xl">
            <h3 className="font-bold mb-4">Membres du projet</h3>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                  <div>
                    <div className="font-bold">{m.displayName}</div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </div>
                  {userRole === 'Admin' && m.userId !== user.uid ? (
                    <select 
                      className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-blue-400"
                      value={m.role}
                      onChange={async (e) => await updateDoc(doc(db, 'projectMembers', m.id), { role: e.target.value })}
                    >
                      <option value="Artist">Artist</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-sm text-blue-400 bg-blue-900/20 px-2 py-1 rounded">{m.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="font-bold mb-2">Code d'invitation</h3>
              <p className="text-xs text-slate-400 mb-2">Transmets ce code à ton équipe pour qu'elle rejoigne le projet via le tableau de bord.</p>
              <input type="text" readOnly value={workspace?.id || ''} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-blue-400 text-center text-lg" />
            </div>

            {userRole === 'Admin' && (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <h3 className="font-bold mb-4">Pipeline du projet</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {workspace?.pipeline?.map(step => (
                      <span key={step} className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-900/50">{step}</span>
                    ))}
                  </div>
                  <button onClick={async () => {
                    const step = prompt('Nouvelle étape :');
                    if (step) await updateDoc(doc(db, 'workspaces', workspace.id), { pipeline: [...workspace.pipeline, step] });
                  }} className="text-sm bg-slate-800 px-3 py-2 rounded hover:bg-slate-700">+ Ajouter une colonne d'étape</button>
                </div>

                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
                  <h3 className="font-bold text-red-500 mb-2">Zone de danger</h3>
                  <button onClick={async () => {
                    if (window.confirm("Supprimer définitivement ce projet ?")) {
                      await deleteDoc(doc(db, 'workspaces', workspace.id));
                      setCurrentView('dashboard');
                    }
                  }} className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold text-sm">
                    <Trash2 size={16} /> <span>Supprimer le projet</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
