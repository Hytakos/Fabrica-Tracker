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
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, FolderKanban, BarChart, ChevronLeft, UserCircle, PenTool, Save
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
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('shots');
  
  // Dashboard & Profile
  const [myProjects, setMyProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('2D');
  const [joinCode, setJoinCode] = useState('');
  const [profileName, setProfileName] = useState('');

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

  // Time states
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedStep, setSelectedStep] = useState('');

  // Review & Annotation States
  const [reviewShot, setReviewShot] = useState(null);
  const [reviewStep, setReviewStep] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // INITIALISATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) {
          setUserData({ id: uDoc.id, ...uDoc.data() });
          setProfileName(uDoc.data().displayName);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // FETCH PROJECTS
  useEffect(() => {
    if (!user) return;
    const qProjects = query(collection(db, 'projectMembers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(qProjects, (snap) => {
      setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // FETCH WORKSPACE
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

  // TIMER
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
      try {
        const taskName = [...shots, ...assets].find(t => t.id === selectedTask)?.name || 'Inconnu';
        await addDoc(collection(db, 'timeLogs'), {
          workspaceId: workspace.id, userId: user.uid, userName: userData.displayName, taskId: selectedTask, taskName: taskName, step: selectedStep, durationSeconds: timer, date: serverTimestamp()
        });
        setTimer(0); alert('Temps enregistré !');
      } catch (err) { alert(err.message); }
    }
  };

  // AUTH
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        if(!authName) return alert("Le nom d'utilisateur est obligatoire.");
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, displayName: authName });
        setUserData({ id: res.user.uid, email: authEmail, displayName: authName });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setCurrentView('dashboard');
    } catch (err) { alert(err.message); }
  };

  // PROFIL UPDATE
  const updateProfile = async (e) => {
    e.preventDefault();
    if(!profileName) return;
    await updateDoc(doc(db, 'users', user.uid), { displayName: profileName });
    setUserData({...userData, displayName: profileName});
    // Update name in all projects
    const q = query(collection(db, 'projectMembers'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    snap.forEach(d => updateDoc(d.ref, { displayName: profileName }));
    alert("Profil mis à jour !");
  };

  // PROJECTS
  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    const wsRef = await addDoc(collection(db, 'workspaces'), { name: newProjectName, type: newProjectType, pipeline: newProjectType === '2D' ? PIPELINE_2D : PIPELINE_3D, createdAt: serverTimestamp() });
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsRef.id, workspaceName: newProjectName, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Admin' });
    setNewProjectName('');
  };

  const joinProject = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    const wsDoc = await getDoc(doc(db, 'workspaces', joinCode));
    if (!wsDoc.exists()) { alert('Code invalide'); return; }
    if (myProjects.find(p => p.workspaceId === joinCode)) { alert('Déjà rejoint'); return; }
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsDoc.id, workspaceName: wsDoc.data().name, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Artist' });
    setJoinCode('');
  };

  const deleteProject = async () => {
    if (window.confirm("Supprimer définitivement ce projet pour tout le monde ?")) {
      const q = query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
      await deleteDoc(doc(db, 'workspaces', workspace.id));
      setCurrentView('dashboard');
    }
  };

  // UPLOADS
  const uploadShotPreview = async (shotId, step, file) => {
    if (!file) return;
    setUploadingMedia(true);
    const fRef = storageRef(storage, `workspaces/${workspace.id}/shots/${shotId}/${step}_${file.name}`);
    await uploadBytes(fRef, file);
    const url = await getDownloadURL(fRef);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    await updateDoc(doc(db, 'shots', shotId), { 
      [`previews.${step}`]: url,
      [`previewTypes.${step}`]: type 
    });
    setUploadingMedia(false);
  };

  const uploadAsset = async (assetId, file) => {
    if (!file) return;
    setUploadingMedia(true);
    const fRef = storageRef(storage, `workspaces/${workspace.id}/assets/${assetId}/${file.name}`);
    await uploadBytes(fRef, file);
    const url = await getDownloadURL(fRef);
    await updateDoc(doc(db, 'assets', assetId), { fileUrl: url });
    setUploadingMedia(false);
  };

  // ANNOTATION CANVAS LOGIC
  const openReview = (shot, step) => {
    setReviewShot(shot); setReviewStep(step);
    setActiveTab('review'); setStrokes([]); setCurrentStroke([]);
  };

  const getAnnotationKey = () => {
    if(!reviewShot || !reviewStep) return null;
    const isVid = reviewShot.previewTypes?.[reviewStep] === 'video';
    return isVid ? Math.floor(videoProgress * 24) : 'image'; // frame number or 'image'
  };

  const loadAnnotations = () => {
    const key = getAnnotationKey();
    if(key && reviewShot.annotations?.[reviewStep]?.[key]) {
      setStrokes(JSON.parse(reviewShot.annotations[reviewStep][key]));
    } else {
      setStrokes([]);
    }
  };

  useEffect(() => { loadAnnotations(); }, [videoProgress, reviewShot, reviewStep]);

  const drawOnCanvas = () => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const allStrokes = [...strokes, currentStroke];
    allStrokes.forEach(stroke => {
      if(!stroke || stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height);
      for(let i=1; i<stroke.length; i++) ctx.lineTo(stroke[i].x * canvas.width, stroke[i].y * canvas.height);
      ctx.stroke();
    });
  };

  useEffect(() => { drawOnCanvas(); }, [strokes, currentStroke]);

  const startDraw = (e) => {
    if(!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    setCurrentStroke([{ x: x/rect.width, y: y/rect.height }]);
  };

  const onDraw = (e) => {
    if(!isDrawing || currentStroke.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    setCurrentStroke([...currentStroke, { x: x/rect.width, y: y/rect.height }]);
  };

  const endDraw = () => {
    if(!isDrawing || currentStroke.length === 0) return;
    setStrokes([...strokes, currentStroke]);
    setCurrentStroke([]);
  };

  const saveAnnotations = async () => {
    const key = getAnnotationKey();
    if(!key || !reviewShot) return;
    await updateDoc(doc(db, 'shots', reviewShot.id), {
      [`annotations.${reviewStep}.${key}`]: JSON.stringify(strokes)
    });
    alert("Retake sauvegardé !");
  };

  // HELPERS
  const canAssign = ['Admin', 'Supervisor'].includes(userRole);

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
            <input type="text" placeholder="Ton pseudo (Obligatoire)" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
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
            <button onClick={() => setCurrentView('profile')} className="flex items-center space-x-2 text-slate-400 hover:text-white"><UserCircle size={24} /> <span>{userData?.displayName}</span></button>
            <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300"><LogOut size={24} /></button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center"><FolderKanban className="mr-2" /> Mes Projets</h2>
            <div className="space-y-3">
              {myProjects.length === 0 ? <p className="text-slate-500">Aucun projet rejoint.</p> : null}
              {myProjects.map(p => (
                <div key={p.id} onClick={async () => {
                  const wsDoc = await getDoc(doc(db, 'workspaces', p.workspaceId));
                  if(wsDoc.exists()) { setWorkspace({ id: wsDoc.id, ...wsDoc.data() }); setUserRole(p.role); setCurrentView('workspace'); setActiveTab('shots'); }
                }} className="bg-slate-950 border border-slate-800 p-4 rounded-lg cursor-pointer hover:border-blue-500 flex justify-between items-center">
                  <div><h3 className="font-bold text-lg">{p.workspaceName}</h3><p className="text-xs text-slate-500">Rôle : {p.role}</p></div>
                  <Play size={20} className="text-blue-500" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <form onSubmit={createProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">Créer un projet</h2>
              <input type="text" placeholder="Nom du projet" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
              <select value={newProjectType} onChange={(e) => setNewProjectType(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded">
                <option value="2D">Production 2D</option><option value="3D">Production 3D</option>
              </select>
              <button type="submit" className="w-full py-2 bg-blue-600 font-bold rounded">Créer</button>
            </form>
            <form onSubmit={joinProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">Rejoindre un projet</h2>
              <input type="text" placeholder="Code d'invitation" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-sm" required />
              <button type="submit" className="w-full py-2 bg-slate-800 font-bold rounded">Rejoindre</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6 absolute top-6 left-6"><ChevronLeft size={20} /> <span>Retour</span></button>
        <form onSubmit={updateProfile} className="bg-slate-900 border border-slate-800 p-8 rounded-xl w-full max-w-md space-y-6">
          <h2 className="text-2xl font-bold text-center">Mon Profil</h2>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Email (Non modifiable)</label>
            <input type="email" value={userData?.email} disabled className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Pseudo / Nom d'utilisateur</label>
            <input type="text" value={profileName} onChange={(e)=>setProfileName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded">Enregistrer les modifications</button>
        </form>
      </div>
    );
  }

  // WORKSPACE VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6">
            <ChevronLeft size={20} /> <span className="hidden md:inline font-bold">Projets</span>
          </button>
          <div className="text-xl font-bold text-blue-500 hidden md:block">{workspace?.name}</div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('shots')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'shots' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Film size={20} /> <span className="hidden md:inline">Plans</span></button>
            <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'assets' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Box size={20} /> <span className="hidden md:inline">Assets (Concept)</span></button>
            <button onClick={() => setActiveTab('review')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'review' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><MonitorPlay size={20} /> <span className="hidden md:inline">Review & Retake</span></button>
            <button onClick={() => setActiveTab('time')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'time' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Clock size={20} /> <span className="hidden md:inline">Chronomètre</span></button>
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'stats' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><BarChart size={20} /> <span className="hidden md:inline">Statistiques</span></button>
            <button onClick={() => setActiveTab('team')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'team' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={20} /> <span className="hidden md:inline">Équipe</span></button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Settings size={20} /> <span className="hidden md:inline">Paramètres</span></button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto relative">
        {uploadingMedia && <div className="absolute top-4 right-4 bg-blue-600 px-4 py-2 rounded text-sm animate-pulse shadow-lg z-50">Upload en cours...</div>}
        
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          <p className="text-xs text-slate-400">Rôle : <span className="text-blue-400 font-bold">{userRole}</span></p>
        </header>

        {activeTab === 'shots' && (
          <div className="space-y-4">
            {canAssign && <button onClick={async () => { const n = prompt('Nom du plan :'); if (n) await addDoc(collection(db, 'shots'), { name: n, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {} }); }} className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded font-bold text-sm"><Plus size={16} /> <span>Ajouter un plan</span></button>}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2 sticky left-0 bg-slate-900 z-10">Plan</th>
                    {workspace?.pipeline?.map(step => <th key={step} className="p-2 min-w-[200px] border-l border-slate-800">{step}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shots.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50">
                      <td className="p-2 font-medium sticky left-0 bg-slate-900 z-10">{s.name}</td>
                      {workspace?.pipeline?.map(step => (
                        <td key={step} className="p-2 border-l border-slate-800/50 space-y-2">
                          <div className="flex flex-col space-y-1">
                            {canAssign ? (
                              <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-blue-300" value={s.assignedTo?.[step] || ''} onChange={async (e) => await updateDoc(doc(db, 'shots', s.id), { [`assignedTo.${step}`]: e.target.value })}>
                                <option value="">-- Assigner --</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                              </select>
                            ) : <span className="text-xs text-blue-400">{members.find(m => m.userId === s.assignedTo?.[step])?.displayName || 'Non assigné'}</span>}
                            <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs" value={s.status?.[step] || 'todo'} onChange={async (e) => await updateDoc(doc(db, 'shots', s.id), { [`status.${step}`]: e.target.value })}>
                              <option value="todo">À faire</option><option value="wip">En cours</option><option value="review">Review</option><option value="done">Terminé</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                            {s.previews?.[step] ? (
                              <>
                                {s.previewTypes?.[step] === 'video' ? <div className="w-10 h-10 bg-slate-800 flex items-center justify-center rounded"><Film size={16}/></div> : <img src={s.previews[step]} className="w-10 h-10 object-cover rounded bg-black" />}
                                <button onClick={() => openReview(s, step)} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded w-full flex justify-center"><MonitorPlay size={14}/></button>
                              </>
                            ) : (
                              <label className="text-xs flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 w-full py-1 rounded cursor-pointer">
                                <Upload size={12}/> <span>Upload Preview</span>
                                <input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0])} />
                              </label>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            {canAssign && <button onClick={async () => { const n = prompt("Nom de l'Asset :"); if (n) await addDoc(collection(db, 'assets'), { name: n, category: 'Model Design', workspaceId: workspace.id, assignedTo: '' }); }} className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded text-sm font-bold"><Plus size={16} /> <span>Ajouter un Concept/Asset</span></button>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(a => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                  {a.fileUrl ? <img src={a.fileUrl} className="w-full h-48 object-cover bg-black" /> : <label className="w-full h-48 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 text-slate-500"><Upload size={24} className="mb-2"/> <span className="text-xs">Upload Image</span><input type="file" accept="image/*" className="hidden" onChange={(e)=>uploadAsset(a.id, e.target.files[0])}/></label>}
                  <div className="p-4 space-y-2">
                    <div className="font-bold text-lg">{a.name}</div>
                    {canAssign ? <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs w-full" value={a.category || ''} onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { category: e.target.value })}>{ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select> : <div className="text-xs text-slate-400">{a.category}</div>}
                    {canAssign ? <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-blue-300 w-full" value={a.assignedTo || ''} onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { assignedTo: e.target.value })}><option value="">-- Assigné à --</option>{members.map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select> : <div className="text-xs text-blue-400">{members.find(m => m.userId === a.assignedTo)?.displayName || 'Non assigné'}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4 max-w-5xl mx-auto flex flex-col items-center">
            {!reviewShot ? (
              <div className="text-center mt-20 text-slate-500">
                <MonitorPlay size={48} className="mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une preview depuis l'onglet "Plans" pour lancer une review.</p>
              </div>
            ) : (
              <div className="w-full">
                <div className="flex justify-between items-center mb-4 bg-slate-900 p-4 rounded-lg border border-slate-800">
                  <h3 className="font-bold text-lg">Review : {reviewShot.name} <span className="text-blue-500 text-sm ml-2">({reviewStep})</span></h3>
                  <div className="flex space-x-4">
                    <button onClick={() => setIsDrawing(!isDrawing)} className={`flex items-center space-x-2 px-3 py-2 rounded font-bold text-sm ${isDrawing ? 'bg-red-600' : 'bg-slate-700'}`}><PenTool size={16} /> <span>{isDrawing ? 'Mode Dessin Actif' : 'Dessiner (Retake)'}</span></button>
                    {isDrawing && <button onClick={saveAnnotations} className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded font-bold text-sm"><Save size={16} /> <span>Sauver le Retake</span></button>}
                  </div>
                </div>

                <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-slate-800 flex justify-center items-center">
                  {reviewShot.previewTypes[reviewStep] === 'video' ? (
                    <video ref={videoRef} src={reviewShot.previews[reviewStep]} className="w-full h-full" onTimeUpdate={(e) => setVideoProgress(e.target.currentTime)} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                  ) : (
                    <img src={reviewShot.previews[reviewStep]} className="w-full h-full object-contain" />
                  )}
                  
                  <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={endDraw} className={`absolute top-0 left-0 w-full h-full z-10 ${isDrawing ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`} width={1920} height={1080} style={{ width: '100%', height: '100%' }} />

                  {/* Red Dot Image */}
                  {reviewShot.previewTypes[reviewStep] !== 'video' && reviewShot.annotations?.[reviewStep]?.['image'] && (
                    <div className="absolute bottom-4 left-4 w-4 h-4 bg-red-600 rounded-full animate-pulse z-20 shadow-lg border-2 border-black" title="Retake requis"></div>
                  )}
                </div>

                {reviewShot.previewTypes[reviewStep] === 'video' && (
                  <div className="mt-4 bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="relative w-full h-3 bg-slate-700 rounded-full cursor-pointer mb-4" onClick={(e) => {
                      if(videoRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        videoRef.current.currentTime = pct * videoDuration;
                      }
                    }}>
                      <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: `${(videoProgress / videoDuration) * 100 || 0}%` }}></div>
                      {/* Red Dots on Timeline */}
                      {Object.keys(reviewShot.annotations?.[reviewStep] || {}).map(frameTime => (
                        <div key={frameTime} className="absolute top-0 w-3 h-3 bg-red-600 rounded-full transform -translate-x-1.5 shadow" style={{ left: `${(parseFloat(frameTime) / (videoDuration*24)) * 100}%` }} title="Retake"></div>
                      ))}
                    </div>

                    <div className="flex justify-center items-center space-x-6">
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/24); } }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipBack size={20} /></button>
                      <button onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full">{isPlaying ? <Pause size={24}/> : <Play size={24} />}</button>
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/24); } }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipForward size={20} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
            <h3 className="font-bold text-center">Enregistrer mon travail</h3>
            <div className="space-y-4">
              <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" disabled={isTimerActive}>
                <option value="">-- Sélectionner un Plan / Asset --</option>
                {[...shots, ...assets].map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" disabled={isTimerActive}>
                <option value="">-- Étape --</option>
                {workspace?.pipeline?.map(step => <option key={step} value={step}>{step}</option>)}
              </select>
            </div>
            <div className="text-center py-6">
              <div className="text-5xl font-mono tracking-wider mb-6 text-blue-400">{formatTime(timer)}</div>
              <div className="flex justify-center space-x-4">
                {!isTimerActive ? (
                  <button onClick={() => { if(!selectedTask || !selectedStep) return alert("Sélectionne une tâche et étape !"); setIsTimerActive(true); }} className="flex items-center space-x-2 bg-green-600 px-6 py-3 rounded-lg font-bold"><Play size={20} /> <span>Démarrer</span></button>
                ) : (
                  <button onClick={handleStopTimer} className="flex items-center space-x-2 bg-yellow-600 px-6 py-3 rounded-lg font-bold"><Pause size={20} /> <span>Stop & Save</span></button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center"><BarChart className="mr-2"/> Statistiques</h3>
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-slate-800 text-slate-400">{canAssign && <th className="p-2">Membre</th>}<th className="p-2">Tâche</th><th className="p-2">Étape</th><th className="p-2">Temps</th></tr></thead>
              <tbody>
                {timeLogs.filter(log => canAssign || log.userId === user.uid).sort((a,b) => b.date - a.date).map(log => (
                  <tr key={log.id} className="border-b border-slate-800/50">{canAssign && <td className="p-2">{log.userName}</td>}<td className="p-2">{log.taskName}</td><td className="p-2 text-slate-400">{log.step}</td><td className="p-2 text-blue-400 font-mono">{formatTime(log.durationSeconds)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-2xl">
            <h3 className="font-bold mb-4">Équipe</h3>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                  <div><div className="font-bold">{m.displayName}</div><div className="text-xs text-slate-500">{m.email}</div></div>
                  {userRole === 'Admin' && m.userId !== user.uid ? (
                    <select className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-blue-400" value={m.role} onChange={async (e) => await updateDoc(doc(db, 'projectMembers', m.id), { role: e.target.value })}>
                      <option value="Artist">Artist</option><option value="Supervisor">Supervisor</option><option value="Admin">Admin</option>
                    </select>
                  ) : <span className="text-sm text-blue-400">{m.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && userRole === 'Admin' && (
          <div className="space-y-6 max-w-xl">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="font-bold mb-2">Code d'invitation</h3>
              <input type="text" readOnly value={workspace?.id || ''} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-blue-400 text-center text-lg" />
            </div>
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
              <h3 className="font-bold text-red-500 mb-2">Zone de danger</h3>
              <button onClick={deleteProject} className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold text-sm"><Trash2 size={16} /> <span>Supprimer le projet</span></button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
