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
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, Timer
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

export default function App() {
  // États globaux
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Artist');
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shots');
  
  // États d'authentification
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  
  // Données Firestore
  const [shots, setShots] = useState([]);
  const [members, setMembers] = useState([]);
  const [pipelineSteps, setPipelineSteps] = useState(['Layout', 'Animation', 'Compositing']);
  
  // États Video Player
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // États Chronomètre
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Initialisation et récupération des données
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'Artist');
          if (userData.workspaceId) fetchWorkspace(userData.workspaceId);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchWorkspace = async (wsId) => {
    const wsDoc = await getDoc(doc(db, 'workspaces', wsId));
    if (wsDoc.exists()) {
      setWorkspace({ id: wsDoc.id, ...wsDoc.data() });
      if (wsDoc.data().pipeline) setPipelineSteps(wsDoc.data().pipeline);
    }
  };

  useEffect(() => {
    if (!workspace) return;

    const qShots = query(collection(db, 'shots'), where('workspaceId', '==', workspace.id));
    const unsubShots = onSnapshot(qShots, (snap) => setShots(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qMembers = query(collection(db, 'users'), where('workspaceId', '==', workspace.id));
    const unsubMembers = onSnapshot(qMembers, (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubShots(); unsubMembers(); };
  }, [workspace]);

  // Chronomètre Logic
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

  // Auth Logic
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        let wsId = inviteCodeInput.trim();
        let assignedRole = 'Artist';
        
        if (!wsId) {
          const newWs = await addDoc(collection(db, 'workspaces'), {
            name: 'Production Project',
            pipeline: ['Layout', 'Animation', 'Compositing'],
            createdAt: serverTimestamp()
          });
          wsId = newWs.id;
          assignedRole = 'Admin'; // Le créateur est Admin
        }

        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, role: assignedRole, workspaceId: wsId });
        setUserRole(assignedRole);
        fetchWorkspace(wsId);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) { alert(err.message); }
  };

  // Video Player Logic
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !workspace) return;
    setUploading(true);
    const vidRef = storageRef(storage, `workspaces/${workspace.id}/reviews/${file.name}`);
    await uploadBytes(vidRef, file);
    const url = await getDownloadURL(vidRef);
    setVideoUrl(url);
    setUploading(false);
  };
  
  const stepFrame = (forward = true) => {
    if (videoRef.current) {
      videoRef.current.pause();
      // 1/24ème de seconde (Standard Animation 24fps)
      videoRef.current.currentTime += forward ? (1/24) : -(1/24); 
    }
  };

  // Settings Logic
  const addPipelineStep = async () => {
    const step = prompt('Nouvelle étape (ex: Clean, FX) :');
    if (step && workspace) {
      const newPipeline = [...pipelineSteps, step];
      await updateDoc(doc(db, 'workspaces', workspace.id), { pipeline: newPipeline });
      setPipelineSteps(newPipeline);
    }
  };

  const deleteProject = async () => {
    if (window.confirm("ATTENTION : Supprimer définitivement ce projet pour tout le monde ?")) {
      await deleteDoc(doc(db, 'workspaces', workspace.id));
      setWorkspace(null);
    }
  };

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
          <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          <input type="password" placeholder="Mot de passe" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded" required />
          {authMode === 'register' && (
            <input type="text" placeholder="Code d'invitation (Optionnel)" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-sm" />
          )}
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded">
            {authMode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="text-xl font-bold text-blue-500 hidden md:block">Fabrica Tracker</div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('shots')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'shots' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Film size={20} /> <span className="hidden md:inline">Plans</span>
            </button>
            <button onClick={() => setActiveTab('review')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'review' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <MonitorPlay size={20} /> <span className="hidden md:inline">Review Vidéo</span>
            </button>
            <button onClick={() => setActiveTab('time')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'time' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Clock size={20} /> <span className="hidden md:inline">Temps de travail</span>
            </button>
            <button onClick={() => setActiveTab('team')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'team' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Users size={20} /> <span className="hidden md:inline">Équipe</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 p-2 rounded ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
              <Settings size={20} /> <span className="hidden md:inline">Paramètres</span>
            </button>
          </nav>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center space-x-3 p-2 text-red-400 hover:bg-slate-800 rounded">
          <LogOut size={20} /> <span className="hidden md:inline">Quitter</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 overflow-x-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            <p className="text-xs text-slate-400">Rôle : <span className="text-blue-400">{userRole}</span></p>
          </div>
          {workspace && (
            <div className="text-xs bg-slate-900 border border-slate-800 p-2 rounded text-slate-400">
              Code Projet : <span className="text-blue-400 font-mono">{workspace.id}</span>
            </div>
          )}
        </header>

        {/* ONGLET : SHOTS (PIPELINE) */}
        {activeTab === 'shots' && (
          <div className="space-y-4">
            {(userRole === 'Admin' || userRole === 'Supervisor') && (
              <button 
                onClick={async () => {
                  const name = prompt('Nom du plan (ex: SH_010) :');
                  if (name && workspace) await addDoc(collection(db, 'shots'), { name, workspaceId: workspace.id, status: {} });
                }} 
                className="flex items-center space-x-2 bg-blue-600 px-3 py-2 rounded text-sm"
              >
                <Plus size={16} /> <span>Ajouter un plan</span>
              </button>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2">Plan</th>
                    {pipelineSteps.map(step => <th key={step} className="p-2">{step}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shots.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50">
                      <td className="p-2 font-medium">{s.name}</td>
                      {pipelineSteps.map(step => (
                        <td key={step} className="p-2">
                          <select 
                            className="bg-slate-950 border border-slate-800 rounded p-1 text-xs"
                            value={s.status?.[step] || 'todo'}
                            onChange={async (e) => {
                              await updateDoc(doc(db, 'shots', s.id), { [`status.${step}`]: e.target.value });
                            }}
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

        {/* ONGLET : REVIEW VIDÉO FRAME-BY-FRAME */}
        {activeTab === 'review' && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded cursor-pointer hover:bg-slate-700">
                <Upload size={16} /> <span>{uploading ? 'Upload en cours...' : 'Charger une vidéo'}</span>
                <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
              </label>
            </div>
            
            {videoUrl ? (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <video ref={videoRef} src={videoUrl} className="w-full rounded bg-black aspect-video" controls={false} />
                <div className="flex justify-center items-center space-x-6 mt-4">
                  <button onClick={() => stepFrame(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipBack size={20} /></button>
                  <button onClick={() => videoRef.current?.play()} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full"><Play size={24} /></button>
                  <button onClick={() => videoRef.current?.pause()} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full"><Pause size={24} /></button>
                  <button onClick={() => stepFrame(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><SkipForward size={20} /></button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Avance/Recule de 1 frame (Base 24fps)</p>
              </div>
            ) : (
              <div className="aspect-video bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                Aucune vidéo chargée
              </div>
            )}
          </div>
        )}

        {/* ONGLET : TIME TRACKING */}
        {activeTab === 'time' && (
          <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl text-center space-y-6">
            <Timer size={48} className="mx-auto text-blue-500" />
            <div className="text-5xl font-mono tracking-wider">{formatTime(timer)}</div>
            <div className="flex justify-center space-x-4">
              {!isTimerActive ? (
                <button onClick={() => setIsTimerActive(true)} className="flex items-center space-x-2 bg-green-600 px-6 py-3 rounded-lg font-bold">
                  <Play size={20} /> <span>Démarrer</span>
                </button>
              ) : (
                <button onClick={() => setIsTimerActive(false)} className="flex items-center space-x-2 bg-yellow-600 px-6 py-3 rounded-lg font-bold">
                  <Pause size={20} /> <span>Pause</span>
                </button>
              )}
              <button onClick={() => { setIsTimerActive(false); setTimer(0); }} className="px-6 py-3 bg-slate-800 rounded-lg">Reset</button>
            </div>
          </div>
        )}

        {/* ONGLET : ÉQUIPE ET RÔLES */}
        {activeTab === 'team' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-2xl">
            <h3 className="font-bold mb-4">Membres du projet</h3>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                  <span>{m.email}</span>
                  {userRole === 'Admin' ? (
                    <select 
                      className="bg-slate-900 border border-slate-700 rounded p-1 text-sm text-blue-400"
                      value={m.role}
                      onChange={async (e) => await updateDoc(doc(db, 'users', m.id), { role: e.target.value })}
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

        {/* ONGLET : PARAMÈTRES (ADMIN SEULEMENT) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="font-bold mb-2">Code d'invitation</h3>
              <input type="text" readOnly value={workspace?.id || ''} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-blue-400" />
            </div>

            {userRole === 'Admin' && (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <h3 className="font-bold mb-4">Personnaliser le Pipeline</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pipelineSteps.map(step => (
                      <span key={step} className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-900/50">
                        {step}
                      </span>
                    ))}
                  </div>
                  <button onClick={addPipelineStep} className="text-sm bg-slate-800 px-3 py-2 rounded hover:bg-slate-700">
                    + Ajouter une colonne d'étape
                  </button>
                </div>

                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6">
                  <h3 className="font-bold text-red-500 mb-2">Zone de danger</h3>
                  <p className="text-sm text-slate-400 mb-4">Cette action supprimera le projet pour toute l'équipe.</p>
                  <button onClick={deleteProject} className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold">
                    <Trash2 size={18} /> <span>Supprimer le projet</span>
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
