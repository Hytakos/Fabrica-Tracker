import React, { useState, useEffect, useRef } from 'react';
import { 
  initializeAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { 
  Film, Box, Settings, Plus, Play, Pause, Trash2, LogOut, 
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, FolderKanban, BarChart, ChevronLeft, UserCircle, Save, Eraser, Undo, X, Bell, Clapperboard, MessageSquare, Type, CheckSquare, Search, HelpCircle, Moon, Sun, Edit3, UserPlus, MessageCircle, GripVertical, Tag, ListTodo, Printer, History, Gamepad2, FileSpreadsheet, FileText, Volume2, VolumeX, Calendar, PieChart, ShieldAlert, UserCheck
} from 'lucide-react';

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
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const TEMPLATES = {
  '2D': ['Animatic', 'Color Script', 'Layout', '2D Background', '2D FX', '2D Anim Rough', '2D Anim Clean', '2D Anim Colo', 'Compositing'],
  '3D': ['Animatic', 'Color Script', 'Layout', 'Modeling', '3D Background', '3D FX', '3D Anim', '3D Lighting', '3D Render', 'Compositing'],
  'Game': ['Concept Art', 'Modeling Low Poly', 'UV Mapping', 'Texturing', 'Rigging', 'Animation', 'VFX', 'Integration Engine']
};
const ASSET_CATEGORIES = ['Character', 'Prop', 'Set', 'FX', 'Model Design', 'Props Design', 'Storyboard', 'Background Concept'];
const FRAMERATE = 25;

const generateCloudinarySignature = async (publicId, timestamp, apiSecret) => {
  const msg = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const dict = {
  fr: {
    projects: "Mes Projets", friends: "Mes Amis", myTasks: "Mes Tâches", assets: "Assets", shots: "Plans", time: "Chrono", stats: "Stats", team: "Équipe", settings: "Paramètres", help: "Aide",
    schedule: "Agenda", breakdown: "Dépouillement", historyLog: "Historique", scene: "Scène", plan: "Plan",
    ok: "Ok", cancel: "Annuler", batchAction: "Multi-action", manualTime: "Saisie manuelle", join: "Rejoindre", addFriend: "Ajouter Ami", friendId: "ID Ami", myId: "Mon ID", sharedProj: "projet(s) partagé(s)",
    createProj: "Créer un projet", joinProj: "Rejoindre", projName: "Nom", joinCode: "Code", searchShot: "Rechercher...", allStatus: "Tous statuts", allMembers: "Toute l'équipe", addShot: "Ajouter Plan",
    addAsset: "Ajouter Asset", assetName: "Nom de l'asset", category: "Catégorie", priority: "Priorité", tags: "Tags", history: "Historique", report: "Rapport PDF", desc: "Description", duration: "Durée",
    todo: "À faire", wip: "En cours", reviewStatus: "En validation", reuse: "Réutiliser", retake: "Retake", done: "Terminé", upload: "Upload", wait: "En attente",
    createAsset: "Créer Asset", exportCSV: "Export CSV", save: "Valider", startDate: "Début", endDate: "Fin",
    cloudGuideTitle: "Tutoriel complet : Configurer Cloudinary (Gratuit)",
    cloudGuide1: "1. Créez un compte gratuit sur Cloudinary.com",
    cloudGuide2: "2. Allez dans Dashboard, copiez votre 'Cloud Name'.",
    cloudGuide3: "3. Allez dans Settings > Upload. Créez un 'Upload preset' en mode 'Unsigned'. Copiez son nom.",
    cloudGuide4: "4. Allez dans Settings > API Keys. Générez ou copiez 'API Key' et 'API Secret'.",
    cloudGuide5: "5. Collez toutes ces infos dans l'onglet Paramètres du Tracker pour activer l'upload de médias."
  },
  en: {
    projects: "My Projects", friends: "My Friends", myTasks: "My Tasks", assets: "Assets", shots: "Shots", time: "Tracker", stats: "Stats", team: "Team", settings: "Settings", help: "Help",
    schedule: "Schedule", breakdown: "Breakdown", historyLog: "History Log", scene: "Scene", plan: "Shot",
    ok: "Ok", cancel: "Cancel", batchAction: "Batch Action", manualTime: "Manual Entry", join: "Join", addFriend: "Add Friend", friendId: "Friend ID", myId: "My ID", sharedProj: "shared project(s)",
    createProj: "Create Project", joinProj: "Join Project", projName: "Name", joinCode: "Code", searchShot: "Search...", allStatus: "All Status", allMembers: "All Team", addShot: "Add Shot",
    addAsset: "Add Asset", assetName: "Asset Name", category: "Category", priority: "Priority", tags: "Tags", history: "History", report: "PDF Report", desc: "Description", duration: "Duration",
    todo: "To Do", wip: "WIP", reviewStatus: "Review", reuse: "Reuse", retake: "Retake", done: "Done", upload: "Upload", wait: "Waiting",
    createAsset: "Create Asset", exportCSV: "Export CSV", save: "Save", startDate: "Start", endDate: "End",
    cloudGuideTitle: "Complete Tutorial: Setup Cloudinary (Free)",
    cloudGuide1: "1. Create a free account on Cloudinary.com",
    cloudGuide2: "2. Go to Dashboard, copy your 'Cloud Name'.",
    cloudGuide3: "3. Go to Settings > Upload. Create an 'Upload preset' and set it to 'Unsigned'. Copy its name.",
    cloudGuide4: "4. Go to Settings > API Keys. Generate or copy 'API Key' and 'API Secret'.",
    cloudGuide5: "5. Paste all these details in the Settings tab of the Tracker to enable media upload."
  }
};

const ShotDetailsEditor = ({ shot, onSave, t }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [desc, setDesc] = useState(shot.description || '');
  const [dur, setDur] = useState(shot.durationFrames || '');

  useEffect(() => {
    setDesc(shot.description || '');
    setDur(shot.durationFrames || '');
  }, [shot.description, shot.durationFrames]);

  const handleSave = () => {
    onSave({ description: desc, durationFrames: parseInt(dur) || 0 });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className="mb-2 ml-6 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700 p-1.5 rounded no-print"
        title="Cliquez pour éditer la durée et la description"
      >
        {shot.durationFrames ? <span className="font-bold mr-3 text-blue-500">{shot.durationFrames} frames</span> : <span className="font-bold mr-3 italic opacity-50">Durée ?</span>}
        {shot.description ? <span>{shot.description}</span> : <span className="italic opacity-50">Aucune description... (cliquez pour ajouter)</span>}
      </div>
    );
  }

  return (
     <div className="space-y-1 mb-2 ml-6 text-xs bg-slate-200/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-300 dark:border-slate-800 transition-all no-print">
        <div className="flex items-center">
          <span className="text-[9px] uppercase font-bold text-slate-500 mr-2 w-10">{t('duration')}</span>
          <input type="number" value={dur} onChange={e=>setDur(e.target.value)} placeholder="Frames" className="p-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 w-16 text-center text-[10px] font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
        </div>
        <div className="flex items-start">
          <span className="text-[9px] uppercase font-bold text-slate-500 mr-2 w-10 mt-1">{t('desc')}</span>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="..." className="p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 w-full h-12 text-[10px] resize-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
        </div>
        <div className="flex justify-end mt-1.5 space-x-2">
          <button onClick={() => setIsEditing(false)} className="bg-slate-400 hover:bg-slate-500 transition-colors text-white text-[10px] px-2.5 py-1 rounded shadow font-bold">Annuler</button>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 transition-colors text-white text-[10px] px-2.5 py-1 rounded shadow flex items-center font-bold"><CheckSquare size={12} className="mr-1.5"/> {t('save')}</button>
        </div>
     </div>
  )
}

const PingPongGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     let afId;
     let paddleY = 50; let aiY = 50;
     let ball = { x: 150, y: 75, dx: 2.5, dy: 2, r: 4 };

     const move = (e) => {
       const rect = canvas.getBoundingClientRect();
       paddleY = Math.max(0, Math.min(120, e.clientY - rect.top - 15));
     };
     window.addEventListener('mousemove', move);

     const loop = () => {
       ctx.clearRect(0,0,300,150);
       ctx.fillStyle = '#fff';
       ctx.fillRect(10, paddleY, 4, 30);
       ctx.fillRect(286, aiY, 4, 30);
       ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

       ball.x += ball.dx; ball.y += ball.dy;
       if(ball.y < 0 || ball.y > 150) ball.dy *= -1;
       
       const targetY = ball.y - 15;
       aiY += (targetY - aiY) * 0.05;
       aiY = Math.max(0, Math.min(120, aiY));

       if(ball.x < 15 && ball.y >= paddleY && ball.y <= paddleY+30) {
         ball.dx *= -1;
         const hitOffset = (ball.y - (paddleY + 15)) / 15;
         ball.dy += hitOffset * 1.5;
       }
       if(ball.x > 285 && ball.y >= aiY && ball.y <= aiY+30) {
         ball.dx *= -1;
         const aiOffset = (ball.y - (aiY + 15)) / 15;
         ball.dy += aiOffset * 1.2;
       }

       if(ball.x < 0 || ball.x > 300) { ball.x = 150; ball.y = 75; ball.dx = (ball.dx > 0 ? -2.5 : 2.5); ball.dy = 2; }
       afId = requestAnimationFrame(loop);
     };
     loop();
     return () => { cancelAnimationFrame(afId); window.removeEventListener('mousemove', move); }
  }, []);
  return (
     <div className="fixed bottom-24 left-6 bg-slate-900 p-3 rounded-xl shadow-2xl z-50 border border-slate-700">
       <div className="flex justify-between text-white text-xs mb-2 font-bold px-1">
         <span className="flex items-center"><Gamepad2 size={14} className="mr-1"/> Ping Pong (Détente)</span><button onClick={onClose} className="text-red-400 hover:text-red-500"><X size={16}/></button>
       </div>
       <canvas ref={canvasRef} width={300} height={150} className="bg-slate-800 rounded cursor-crosshair border border-slate-700"/>
     </div>
  );
}

export default function App() {
  const [lang, setLang] = useState('fr');
  const t = (key) => dict[lang][key] || key;
  const [theme, setTheme] = useState('dark');
  
  const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('customPrimary') || '#2563eb');
  const [secondaryColor, setSecondaryColor] = useState(localStorage.getItem('customSecondary') || '#3b82f6');
  
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState({});
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [dashTab, setDashTab] = useState('projects'); 
  const [activeTab, setActiveTab] = useState('myTasks');
  
  const [myProjects, setMyProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('2D');
  const [newProjectBannerFile, setNewProjectBannerFile] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  
  const [profileName, setProfileName] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [browserNotifs, setBrowserNotifs] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);

  const [workspace, setWorkspace] = useState(null);
  const [userPermissions, setUserPermissions] = useState({ canEdit: false, canAssign: false, role: 'Guest', leads: [] });
  const [shots, setShots] = useState([]);
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [breakdownItems, setBreakdownItems] = useState([]);
  const [breakdownFilter, setBreakdownFilter] = useState('');
  const [globalHistory, setGlobalHistory] = useState([]);
  
  const [cloudNameInput, setCloudNameInput] = useState('');
  const [uploadPresetInput, setUploadPresetInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  
  const [selectedVersions, setSelectedVersions] = useState({});
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMode, setAuthMode] = useState('login');

  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [manualTime, setManualTime] = useState({ h: 0, m: 0 });

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addAssetName, setAddAssetName] = useState('');
  const [addAssetCategory, setAddAssetCategory] = useState(ASSET_CATEGORIES[0]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [batchSelection, setBatchSelection] = useState([]);
  const [batchActionStep, setBatchActionStep] = useState('');
  const [batchActionStatus, setBatchActionStatus] = useState('');

  const [reviewItem, setReviewItem] = useState(null);
  const [reviewType, setReviewType] = useState('shots');
  const [reviewStep, setReviewStep] = useState(null);
  const [reviewVersion, setReviewVersion] = useState(null);
  const [reviewPreview, setReviewPreview] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState('');
  const [reviewPanelWidth, setReviewPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [reviewTab, setReviewTab] = useState('chat');
  const [showSeconds, setShowSeconds] = useState(false);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMsg, setNewChatMsg] = useState('');

  const videoRef = useRef(null);
  const compareVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  
  const [drawMode, setDrawMode] = useState('pen'); 
  const [textInputPos, setTextInputPos] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
  
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevPendingReviews = useRef(0);
  
  const [logoPixelated, setLogoPixelated] = useState(false);
  
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [friendInput, setFriendInput] = useState('');
  const [activeFriend, setActiveFriend] = useState(null);
  const [pmMessages, setPmMessages] = useState([]);
  const [newPmMsg, setNewPmMsg] = useState('');
  const [showPingPong, setShowPingPong] = useState(false);

  const [viewProfileId, setViewProfileId] = useState(null);
  const [profileModalData, setProfileModalData] = useState(null);
  const [deleteStepConfirm, setDeleteStepConfirm] = useState(''); 

  const [modal, setModal] = useState({ isOpen: false, title: '', msg: '', onConfirm: null });
  const openModal = (title, msg, onConfirm = null) => setModal({ isOpen: true, title, msg, onConfirm });
  const closeModal = () => setModal({ isOpen: false, title: '', msg: '', onConfirm: null });

  const inputClass = "w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 shadow-sm transition-all";

  useEffect(() => {
    localStorage.setItem('customPrimary', primaryColor);
    localStorage.setItem('customSecondary', secondaryColor);
  }, [primaryColor, secondaryColor]);

  useEffect(() => {
    if (viewProfileId) {
      getDoc(doc(db, 'users', viewProfileId)).then(d => { if(d.exists()) setProfileModalData({ id: d.id, ...d.data() }); });
    } else setProfileModalData(null);
  }, [viewProfileId]);

  useEffect(() => {
    if (!user) return;
    const updatePresence = async () => { try { await updateDoc(doc(db, 'users', user.uid), { lastOnline: serverTimestamp() }); } catch(e){} };
    updatePresence();
    const interval = setInterval(updatePresence, 60000); 
    
    const unsubOnline = onSnapshot(collection(db, 'users'), (snap) => {
      const now = Date.now();
      const onlineStatus = {};
      snap.forEach(d => {
        const data = d.data();
        if(data.lastOnline && (now - data.lastOnline.toMillis()) < 120000) onlineStatus[d.id] = true;
      });
      setOnlineUsers(onlineStatus);
    });
    return () => { clearInterval(interval); unsubOnline(); };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) { 
          setUserData({ id: uDoc.id, ...uDoc.data() }); 
          setProfileName(uDoc.data().displayName); 
          setEmailNotifs(uDoc.data().wantsEmailNotifications || false);
          setBrowserNotifs(uDoc.data().browserNotifs || false);
          setIsAbsent(uDoc.data().isAbsent || false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qProjects = query(collection(db, 'projectMembers'), where('userId', '==', user.uid));
    const unsubP = onSnapshot(qProjects, (snap) => setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qFriends = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
    const unsubF = onSnapshot(qFriends, (snap) => {
      const flist = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const otherId = data.users.find(id => id !== user.uid);
        if (otherId) flist.push({ id: otherId, friendshipId: d.id, displayName: data.names?.[otherId] || "Ami" });
      });
      setFriendsList(flist);
    });
    return () => { unsubP(); unsubF(); };
  }, [user]);

  useEffect(() => {
    if (!workspace) return;
    const unsubShots = onSnapshot(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id)), (snap) => setShots(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAssets = onSnapshot(query(collection(db, 'assets'), where('workspaceId', '==', workspace.id)), (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMembers = onSnapshot(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id)), (snap) => {
      const mList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(mList);
      const myMem = mList.find(m => m.userId === user?.uid);
      if (myMem) {
        if (myMem.role === 'Admin') setUserPermissions({ canEdit: true, canAssign: true, role: 'Admin', leads: myMem.leads || [] });
        else if (myMem.role === 'Supervisor') setUserPermissions({ canEdit: true, canAssign: true, role: 'Supervisor', leads: myMem.leads || [] });
        else if (myMem.role === 'Artist') setUserPermissions({ canEdit: true, canAssign: false, role: 'Artist', leads: myMem.leads || [] });
        else if (myMem.role === 'Custom') setUserPermissions({ canEdit: myMem.canEdit, canAssign: myMem.canAssign, role: 'Custom', leads: myMem.leads || [] });
        else setUserPermissions({ canEdit: false, canAssign: false, role: 'Guest', leads: myMem.leads || [] });
      }
    });
    const unsubLogs = onSnapshot(query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id)), (snap) => setTimeLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBreakdown = onSnapshot(query(collection(db, 'breakdown'), where('workspaceId', '==', workspace.id)), (snap) => setBreakdownItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGlobalHistory = onSnapshot(query(collection(db, 'globalHistory'), where('workspaceId', '==', workspace.id), orderBy('date', 'desc')), (snap) => setGlobalHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubWs = onSnapshot(doc(db, 'workspaces', workspace.id), (docSnap) => { if(docSnap.exists()) setWorkspace({id: docSnap.id, ...docSnap.data()}); });
    
    setCloudNameInput(workspace.cloudinaryCloudName || ''); setUploadPresetInput(workspace.cloudinaryUploadPreset || '');
    setApiKeyInput(workspace.cloudinaryApiKey || ''); setApiSecretInput(workspace.cloudinaryApiSecret || '');
    return () => { unsubShots(); unsubAssets(); unsubMembers(); unsubLogs(); unsubBreakdown(); unsubGlobalHistory(); unsubWs(); };
  }, [workspace?.id]);

  useEffect(() => {
    if (!reviewItem || !reviewStep) return;
    const q = query(collection(db, `${reviewType}/${reviewItem.id}/comments`), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [reviewItem, reviewType, reviewStep]);

  useEffect(() => {
    if (reviewItem) {
      const freshItem = reviewType === 'shots' ? shots.find(s => s.id === reviewItem.id) : assets.find(a => a.id === reviewItem.id);
      if (freshItem) setReviewItem(freshItem); else setReviewItem(null);
    }
  }, [shots, assets]);

  useEffect(() => {
    if (!activeFriend) return;
    const q = query(collection(db, `friendships/${activeFriend.friendshipId}/messages`), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => setPmMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [activeFriend]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => setReviewPanelWidth(Math.max(320, Math.min(document.body.clientWidth - e.clientX, document.body.clientWidth - 200)));
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isResizing]);

  const getAssignees = (item, step) => Array.isArray(item.assignedTo?.[step]) ? item.assignedTo[step] : (item.assignedTo?.[step] ? [item.assignedTo[step]] : []);
  const pendingReviews = shots.filter(s => workspace?.pipeline?.some(step => s.status?.[step] === 'review' && (getAssignees(s, step).includes(user?.uid) || (userPermissions.leads?.includes(step)))));
  
  const myAssignedShots = shots.filter(s => workspace?.pipeline?.some(step => getAssignees(s, step).includes(user?.uid) || (userPermissions.leads?.includes(step) && s.status?.[step] === 'review')));
  const myAssignedAssets = assets.filter(a => getAssignees(a, 'Global').includes(user?.uid) || (userPermissions.leads?.includes('Global')));

  const sortTasksByPriorityStatus = (tasksList, isShot = true) => {
    return [...tasksList].sort((a, b) => {
      const getScore = (task) => {
        let maxScore = 99;
        const steps = isShot ? workspace?.pipeline || [] : ['Global'];
        steps.forEach(step => {
           const isAssigned = getAssignees(task, step).includes(user?.uid) || (userPermissions.leads?.includes(step));
           if (!isAssigned) return;
           const st = task.status?.[step] || 'todo';
           let score = 99;
           if ((userPermissions.role === 'Admin' || userPermissions.role === 'Supervisor' || userPermissions.leads?.includes(step)) && st === 'review') score = 1;
           else if (st === 'retake') score = 2;
           else if (st === 'todo') score = 3;
           else if (st === 'wip') score = 4;
           else if (st === 'reuse') score = 5;
           else if (st === 'done') score = 6;
           if (score < maxScore) maxScore = score;
        });
        return maxScore;
      };
      return getScore(a) - getScore(b);
    }).filter(task => {
      const steps = isShot ? workspace?.pipeline || [] : ['Global'];
      let hasActive = false;
      steps.forEach(step => {
        const isAssigned = getAssignees(task, step).includes(user?.uid) || (userPermissions.leads?.includes(step));
        if (isAssigned && (task.status?.[step] || 'todo') !== 'done') hasActive = true;
      });
      return hasActive;
    });
  };

  const myStats = React.useMemo(() => {
    let todo = 0, wip = 0, review = 0, done = 0;
    shots.forEach(s => {
      workspace?.pipeline?.forEach(step => {
        if (getAssignees(s, step).includes(user?.uid)) {
          const st = s.status?.[step] || 'todo';
          if (st === 'todo') todo++;
          else if (st === 'wip') wip++;
          else if (st === 'review') review++;
          else if (st === 'done') done++;
        }
      });
    });
    return { todo, wip, review, done };
  }, [shots, workspace, user]);

  useEffect(() => {
    if (browserNotifs && pendingReviews.length > prevPendingReviews.current) {
      if (Notification.permission === 'granted') new Notification('Fabrica Tracker', { body: 'Vous avez de nouvelles validations en attente !' });
    }
    prevPendingReviews.current = pendingReviews.length;
  }, [pendingReviews.length, browserNotifs]);

  const toggleVideoPlay = () => {
    if (videoRef.current) { 
      if(isPlaying) { videoRef.current.pause(); compareVideoRef.current?.pause(); } 
      else { videoRef.current.play(); compareVideoRef.current?.play(); } 
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVideoVolume(vol);
    if (videoRef.current) videoRef.current.volume = vol;
    if (compareVideoRef.current) compareVideoRef.current.volume = vol;
  };

  useEffect(() => {
    let interval = null;
    if (isTimerActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const triggerEasterEgg = () => { setLogoPixelated(true); setTimeout(() => setLogoPixelated(false), 500); };
  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  const logAudit = async (itemId, type, text) => {
    await addDoc(collection(db, `${type}/${itemId}/comments`), {
      type: 'system', text: text, date: serverTimestamp(), author: userData.displayName
    });
    if (workspace) {
       await addDoc(collection(db, 'globalHistory'), {
         workspaceId: workspace.id, text: `${userData.displayName} : ${text}`, date: serverTimestamp(), author: userData.displayName
       });
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        if(!authName) return openModal("Erreur", "Pseudo requis");
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, displayName: authName, isAbsent: false });
        setUserData({ id: res.user.uid, email: authEmail, displayName: authName, isAbsent: false });
      } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); }
      setCurrentView('dashboard');
    } catch (err) { openModal("Erreur", err.message); }
  };
  
  const handleForgotPassword = async () => {
    if(!authEmail) return openModal("Erreur", "Tapez votre e-mail d'abord.");
    try {
      await sendPasswordResetEmail(auth, authEmail);
      openModal("Succès", "E-mail de réinitialisation envoyé !");
    } catch(err) {
      openModal("Erreur", err.message);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if(!profileName) return;
    await updateDoc(doc(db, 'users', user.uid), { displayName: profileName, wantsEmailNotifications: emailNotifs });
    setUserData({...userData, displayName: profileName, wantsEmailNotifications: emailNotifs});
    const snap = await getDocs(query(collection(db, 'projectMembers'), where('userId', '==', user.uid)));
    snap.forEach(d => updateDoc(d.ref, { displayName: profileName }));
    openModal("Profil à jour", "Vos modifications ont été enregistrées avec succès.");
  };

  const toggleAbsence = async () => {
     const nextState = !isAbsent;
     setIsAbsent(nextState);
     await updateDoc(doc(db, 'users', user.uid), { isAbsent: nextState });
  };

  const uploadBannerFileToCloud = async (file) => {
    if (!file) return '';
    const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', uploadPresetInput || 'fabrica_preset');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudNameInput || 'dp6xxxx'}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url || '';
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    let bannerUrl = '';
    if (newProjectBannerFile) {
       bannerUrl = await uploadBannerFileToCloud(newProjectBannerFile);
    }
    const wsRef = await addDoc(collection(db, 'workspaces'), { 
      name: newProjectName, 
      type: newProjectType, 
      bannerUrl: bannerUrl, 
      pipeline: TEMPLATES[newProjectType] || TEMPLATES['2D'], 
      createdAt: serverTimestamp() 
    });
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsRef.id, workspaceName: newProjectName, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Admin', bannerUrl: bannerUrl, leads: [] });
    setNewProjectName('');
    setNewProjectBannerFile(null);
  };

  const joinProject = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    const wsDoc = await getDoc(doc(db, 'workspaces', joinCode));
    if (!wsDoc.exists() || myProjects.find(p => p.workspaceId === joinCode)) return openModal("Erreur", "Code invalide ou déjà rejoint.");
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsDoc.id, workspaceName: wsDoc.data().name, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Guest', bannerUrl: wsDoc.data().bannerUrl || '', leads: [] });
    setJoinCode('');
  };

  const addFriend = async (friendId) => {
    if(!friendId || friendId === user.uid) return openModal("Erreur", "ID Invalide");
    if(friendsList.find(f => f.id === friendId)) return openModal("Erreur", "Vous êtes déjà ami avec cette personne.");
    try {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if(!friendDoc.exists()) return openModal("Erreur", "Utilisateur introuvable");
      const friendData = friendDoc.data();
      await addDoc(collection(db, 'friendships'), {
        users: [user.uid, friendId], names: { [user.uid]: userData.displayName, [friendId]: friendData.displayName }, createdAt: serverTimestamp()
      });
      setFriendInput(''); setViewProfileId(null); openModal("Succès", "Ami ajouté !");
    } catch(err) { openModal("Erreur", err.message); }
  };

  const postPm = async (e) => {
    e.preventDefault(); if(!newPmMsg.trim() || !activeFriend) return;
    await addDoc(collection(db, `friendships/${activeFriend.friendshipId}/messages`), { text: newPmMsg, date: serverTimestamp(), authorId: user.uid });
    setNewPmMsg('');
  };

  const uploadMediaToCloud = async (file, cropOptions = null) => {
    const cloudName = workspace?.cloudinaryCloudName || cloudNameInput; 
    const uploadPreset = workspace?.cloudinaryUploadPreset || uploadPresetInput;
    if (!cloudName || !uploadPreset) { openModal("Configuration manquante", "Allez dans Paramètres pour ajouter vos clés Cloudinary."); return null; }
    const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', uploadPreset);
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let finalUrl = data.secure_url;
    const optimizeParams = "q_auto,f_auto"; 
    const combinedParams = cropOptions ? `${cropOptions},${optimizeParams}` : optimizeParams;
    finalUrl = finalUrl.replace('/upload/', `/upload/${combinedParams}/`);
    return { url: finalUrl, type: resourceType };
  };

  const deleteMediaFromCloudinary = async (url) => {
    if (!workspace?.cloudinaryApiKey || !workspace?.cloudinaryApiSecret || !workspace?.cloudinaryCloudName) return;
    try {
      const parts = url.split('/upload/'); if (parts.length !== 2) return;
      const path = parts[1].split('/'); if (path[0].match(/^v\d+$/) || path[0].includes('c_fill') || path[0].includes('q_auto')) path.shift();
      const publicIdWithExt = path.join('/'); const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await generateCloudinarySignature(publicId, timestamp, workspace.cloudinaryApiSecret);
      const formData = new FormData();
      formData.append('public_id', publicId); formData.append('api_key', workspace.cloudinaryApiKey);
      formData.append('timestamp', timestamp); formData.append('signature', signature);
      const resourceType = url.includes('/video/') ? 'video' : 'image';
      await fetch(`https://api.cloudinary.com/v1_1/${workspace.cloudinaryCloudName}/${resourceType}/destroy`, { method: 'POST', body: formData });
    } catch(err) { console.error("Cloudinary Delete:", err); }
  };

  const recalculateSequenceShots = async (seqName) => {
    const snap = await getDocs(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id), where('sequence', '==', seqName)));
    let localShots = snap.docs.map(d => ({id: d.id, ...d.data()}));
    localShots.forEach((s, i) => { if (s.order === undefined) s.order = (i+1)*10; });
    localShots.sort((a,b) => a.order - b.order);

    for (let i = 0; i < localShots.length; i++) {
       const numStr = ((i+1)*10).toString().padStart(3, '0');
       const sceneName = lang === 'en' ? `SH${numStr}` : `SC${numStr}`;
       const shotName = `SH${numStr}`;
       const newOrder = (i+1)*10;
       if (localShots[i].scene !== sceneName || localShots[i].name !== shotName || localShots[i].order !== newOrder) {
          await updateDoc(doc(db, 'shots', localShots[i].id), { scene: sceneName, name: shotName, order: newOrder });
       }
    }
  };

  const filteredShots = shots.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.scene.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus ? workspace?.pipeline?.some(step => s.status?.[step] === filterStatus) : true;
    const matchAssignee = filterAssignee ? workspace?.pipeline?.some(step => getAssignees(s, step).includes(filterAssignee)) : true;
    const matchTag = filterTag ? (s.tags || []).includes(filterTag) : true;
    return matchSearch && matchStatus && matchAssignee && matchTag;
  });

  const groupedShots = filteredShots.reduce((acc, s) => { (acc[s.sequence] = acc[s.sequence] || []).push(s); return acc; }, {});
  const sortedSeqs = Object.keys(groupedShots).sort();

  const addNewSequence = async () => {
    const seqs = Object.keys(groupedShots).sort();
    let nextSeqId = 1; 
    if (seqs.length > 0) {
      const last = seqs[seqs.length - 1];
      const num = parseInt(last.replace(/\D/g, ''));
      if (!isNaN(num)) nextSeqId = num + 1;
    }
    const newSeq = `SQ${nextSeqId.toString().padStart(2, '0')}`;
    const initialScene = lang === 'en' ? 'SH010' : 'SC010';
    await addDoc(collection(db, 'shots'), { sequence: newSeq, scene: initialScene, name: 'SH010', order: 10, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {}, priority: 'Normal', tags: [], description: '', durationFrames: 100 });
  };

  const addNewShot = async (seqName) => {
    const seqShots = (groupedShots[seqName]||[]).sort((a,b) => (a.order||0) - (b.order||0));
    let nextOrder = 10;
    if (seqShots.length > 0) nextOrder = (seqShots[seqShots.length - 1].order || seqShots.length * 10) + 10;
    
    await addDoc(collection(db, 'shots'), { sequence: seqName, scene: 'TEMP', name: 'TEMP', order: nextOrder, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {}, priority: 'Normal', tags: [], description: '', durationFrames: 100 });
    setTimeout(() => recalculateSequenceShots(seqName), 500);
  };

  const insertShotAfter = async (seqName, currentIndex) => {
    const seqShots = (groupedShots[seqName]||[]).sort((a,b) => (a.order||0) - (b.order||0));
    const currentShot = seqShots[currentIndex];
    const nextShot = seqShots[currentIndex + 1];
    
    let newOrder;
    if (nextShot) newOrder = (currentShot.order + nextShot.order) / 2;
    else newOrder = (currentShot.order||0) + 10;

    await addDoc(collection(db, 'shots'), { sequence: seqName, scene: 'TEMP', name: 'TEMP', order: newOrder, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {}, priority: 'Normal', tags: [], description: '', durationFrames: 100 });
    setTimeout(() => recalculateSequenceShots(seqName), 500);
  };
  
  const exportExcel = () => {
    const statusColors = {
      todo: '#cbd5e1', wip: '#93c5fd', review: '#c084fc', reuse: '#fdba74', retake: '#f43f5e', done: '#86efac'  
    };
    let html = "<table border='1'><tr><th>Sequence</th><th>Scene</th><th>Nom</th><th>Priorite</th>";
    workspace?.pipeline?.forEach(p => html += `<th>${p}</th>`);
    html += "</tr>";
    shots.forEach(s => {
      html += `<tr><td>${s.sequence}</td><td>${s.scene}</td><td>${s.name}</td><td>${s.priority}</td>`;
      workspace?.pipeline?.forEach(p => {
        const st = s.status?.[p] || 'todo';
        const bgCol = statusColors[st] || '#fff';
        html += `<td style="background-color: ${bgCol};">${st}</td>`;
      });
      html += "</tr>";
    });
    html += "</table>";
    const blob = new Blob([html], {type: "application/vnd.ms-excel"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "export_shots.xls"; a.click();
  };

  const changeStatus = async (item, step, newStatus, collectionName = 'shots') => {
    const oldStatus = item.status?.[step] || 'todo';
    if (oldStatus === newStatus) return;
    await updateDoc(doc(db, collectionName, item.id), { [`status.${step}`]: newStatus });
    logAudit(item.id, collectionName, `Statut "${step}" : ${oldStatus.toUpperCase()} ➔ ${newStatus.toUpperCase()}`);
  };

  const changePriority = async (id, newPriority, collectionName) => {
    await updateDoc(doc(db, collectionName, id), { priority: newPriority });
  };
  const addTag = async (id, collectionName, currentTags) => {
    const tag = window.prompt("Nouveau tag :");
    if (tag && !currentTags.includes(tag.trim())) await updateDoc(doc(db, collectionName, id), { tags: [...currentTags, tag.trim()] });
  };
  const removeTag = async (id, collectionName, currentTags, tagToRemove) => {
    await updateDoc(doc(db, collectionName, id), { tags: currentTags.filter(t => t !== tagToRemove) });
  };
  const applyBatchAction = async () => {
    if(!batchActionStep || batchSelection.length === 0) return;
    for (const id of batchSelection) {
      const shot = shots.find(s => s.id === id);
      if (shot && batchActionStatus) await changeStatus(shot, batchActionStep, batchActionStatus, 'shots');
    }
    setBatchSelection([]); openModal(t('batchAction'), "Appliquée.");
  };

  const addAssignee = async (coll, id, step, uid) => {
    const item = coll === 'shots' ? shots.find(s => s.id === id) : assets.find(a => a.id === id);
    if (!item) return;
    const current = getAssignees(item, step);
    if (!current.includes(uid)) {
      const updated = [...current, uid];
      await updateDoc(doc(db, coll, id), { [`assignedTo.${step}`]: updated });
    }
  };

  const removeAssignee = async (coll, id, step, uid) => {
    const item = coll === 'shots' ? shots.find(s => s.id === id) : assets.find(a => a.id === id);
    if (!item) return;
    const current = getAssignees(item, step);
    const updated = current.filter(u => u !== uid);
    await updateDoc(doc(db, coll, id), { [`assignedTo.${step}`]: updated });
  };

  const uploadShotPreview = async (shotId, step, file, existingVersions) => {
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await uploadMediaToCloud(file);
      if (res) {
        const newVersionNum = existingVersions.length + 1;
        const newPreview = { version: newVersionNum, url: res.url, type: res.type, date: Date.now() };
        const updated = [...existingVersions, newPreview];
        await updateDoc(doc(db, 'shots', shotId), { [`previews.${step}`]: updated });
        logAudit(shotId, 'shots', `Nouvelle version V${newVersionNum} uploadée pour ${step}`);
      }
    } catch(err) { openModal("Erreur", err.message); }
    setUploadingMedia(false);
  };

  const uploadAssetPreviews = async (assetId, files, existingVersions) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    try {
      let fileObjs = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadMediaToCloud(files[i]);
        if (res) fileObjs.push({ url: res.url, type: res.type });
      }
      if (fileObjs.length > 0) {
        const newVersionNum = existingVersions.length + 1;
        const newPreview = { version: newVersionNum, files: fileObjs, date: Date.now() };
        const updated = [...existingVersions, newPreview];
        await updateDoc(doc(db, 'assets', assetId), { previews: updated });
        logAudit(assetId, 'assets', `Nouvelle version V${newVersionNum} uploadée pour l'Asset`);
      }
    } catch(err) { openModal("Erreur", err.message); }
    setUploadingMedia(false);
  };

  const confirmDeletePreview = async (id, step, index, versions, coll = 'shots') => {
    openModal("Supprimer Version", "Voulez-vous supprimer cette version ?", async () => {
      const target = versions[index];
      if (target.url) await deleteMediaFromCloudinary(target.url);
      if (target.files) { for(let f of target.files) await deleteMediaFromCloudinary(f.url); }
      const updated = versions.filter((_, i) => i !== index);
      if (coll === 'shots') {
        await updateDoc(doc(db, 'shots', id), { [`previews.${step}`]: updated });
      } else {
        await updateDoc(doc(db, 'assets', id), { previews: updated });
      }
      closeModal();
    });
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!addAssetName) return;
    await addDoc(collection(db, 'assets'), { name: addAssetName, category: addAssetCategory, workspaceId: workspace.id, previews: [], assignedTo: {}, priority: 'Normal', tags: [] });
    setAddAssetName(''); setShowAddAsset(false);
  };

  const getThumbnail = (previewObj) => {
    if (!previewObj || !previewObj.url) return '';
    return previewObj.url.replace('/upload/', '/upload/w_400,c_scale,q_auto,f_auto/');
  };

  const getAnnotationKey = () => {
    if (reviewType === 'shots') return 'general';
    return `image_${reviewPreview.fileIndex}`;
  };

  const openReview = (item, step, version, previewObj, type = 'shots') => {
    setReviewItem(item); setReviewType(type); setReviewStep(step); setReviewVersion(version); setReviewPreview(previewObj);
    setCompareMode(false); setCompareVersion(''); setStrokes([]); setCurrentStroke(null); setDrawMode('pen'); setReviewTab('chat');
    
    const annotKey = type === 'shots' ? 'general' : `image_${previewObj.fileIndex}`;
    const saved = item.annotations?.[step]?.[`v${version}`]?.[annotKey];
    if (saved && Array.isArray(saved)) {
      setStrokes(saved);
    }
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const normX = x / rect.width;
    const normY = y / rect.height;

    if (drawMode === 'text') {
      setTextInputPos({ px: x, py: y, x: normX, y: normY });
      setTextInputValue('');
      return;
    }

    setCurrentStroke({ type: drawMode === 'eraser' ? 'eraser' : 'pen', size: brushSize, points: [{ x: normX, y: normY }] });
  };

  const onDraw = (e) => {
    if (!currentStroke || drawMode === 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const normX = x / rect.width;
    const normY = y / rect.height;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, { x: normX, y: normY }]
    });
  };

  const endDraw = () => {
    if (currentStroke) {
      setStrokes([...strokes, currentStroke]);
      setCurrentStroke(null);
    }
  };

  const commitTextAnnotation = () => {
    if (textInputValue.trim() && textInputPos) {
      const newStroke = { type: 'text', content: textInputValue, size: brushSize, x: textInputPos.x, y: textInputPos.y };
      setStrokes([...strokes, newStroke]);
    }
    setTextInputPos(null);
    setTextInputValue('');
  };

  const saveAnnotations = async () => {
    if (!reviewItem) return;
    const annotKey = getAnnotationKey();
    const updatedAnnotations = {
      ...(reviewItem.annotations || {}),
      [reviewStep]: {
        ...(reviewItem.annotations?.[reviewStep] || {}),
        [`v${reviewVersion}`]: {
          ...(reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`] || {}),
          [annotKey]: strokes
        }
      }
    };
    await updateDoc(doc(db, reviewType, reviewItem.id), { annotations: updatedAnnotations });
    openModal("Succès", "Annotations enregistrées !");
  };

  const deleteRetakeFromDB = async () => {
    setStrokes([]);
  };

  const drawOnCanvas = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); 
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      if(!stroke) return;
      
      if (stroke.type === 'eraser') {
         ctx.globalCompositeOperation = 'destination-out';
      } else {
         ctx.globalCompositeOperation = 'source-over';
      }

      if (stroke.type === 'text') {
        ctx.font = `bold ${stroke.size * 10}px Arial`; ctx.fillStyle = 'red';
        ctx.fillText(stroke.content, stroke.x * canvas.width, stroke.y * canvas.height);
      } else if (stroke.points && stroke.points.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = stroke.type === 'eraser' ? 'rgba(0,0,0,1)' : 'red'; ctx.lineWidth = stroke.size || 5;
        ctx.beginPath(); ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for(let i=1; i<stroke.points.length; i++) ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over'; 
  };
  useEffect(() => { drawOnCanvas(); }, [strokes, currentStroke]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!newChatMsg.trim() || !reviewItem || !reviewStep) return;
    await addDoc(collection(db, `${reviewType}/${reviewItem.id}/comments`), {
      type: 'chat', text: newChatMsg, date: serverTimestamp(), author: userData.displayName
    });
    setNewChatMsg('');
  };

  const handleStopTimer = async () => {
    setIsTimerActive(false);
    if (!selectedTask || !selectedStep) { setTimer(0); return; }
    await addDoc(collection(db, 'timeLogs'), {
      workspaceId: workspace.id, taskId: selectedTask, taskName: [...shots, ...assets].find(t=>t.id===selectedTask)?.name || 'Inconnu',
      step: selectedStep, durationSeconds: timer, userId: user.uid, userName: userData.displayName, date: serverTimestamp()
    });
    setTimer(0);
    openModal("Chrono", "Temps enregistré avec succès !");
  };

  const handleAddManualTime = async (e) => {
    e.preventDefault();
    if (!selectedTask || !selectedStep) return openModal("Erreur", "Sélectionnez une tâche et une étape.");
    const totalSec = (parseInt(manualTime.h || 0) * 3600) + (parseInt(manualTime.m || 0) * 60);
    if (totalSec <= 0) return;
    await addDoc(collection(db, 'timeLogs'), {
      workspaceId: workspace.id, taskId: selectedTask, taskName: [...shots, ...assets].find(t=>t.id===selectedTask)?.name || 'Inconnu',
      step: selectedStep, durationSeconds: totalSec, userId: user.uid, userName: userData.displayName, date: serverTimestamp()
    });
    setManualTime({ h: 0, m: 0 });
    openModal("Chrono", "Saisie manuelle ajoutée !");
  };

  const exportPDFReport = () => {
    window.print();
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'Urgent': return <span className="text-red-500 font-bold" title="Urgent">🔴 Urgent</span>;
      case 'Low': return <span className="text-green-500 font-bold" title="Basse">🟢 Basse</span>;
      default: return <span className="text-yellow-500 font-bold" title="Normal">🟡 Normal</span>;
    }
  };
  const getStatusColor = (st) => {
    switch(st) {
      case 'wip': return 'bg-blue-900/40 text-blue-500 border-blue-700 dark:text-blue-400';
      case 'review': return 'bg-purple-900/40 text-purple-500 border-purple-700 dark:text-purple-400';
      case 'reuse': return 'bg-orange-900/40 text-orange-500 border-orange-700 dark:text-orange-400';
      case 'retake': return 'bg-red-900/40 text-red-500 border-red-700 dark:text-red-400';
      case 'done': return 'bg-green-900/40 text-green-500 border-green-700 dark:text-green-400';
      default: return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const groupedAssets = assets.reduce((acc, a) => { (acc[a.category] = acc[a.category] || []).push(a); return acc; }, {});
  const sortedCats = Object.keys(groupedAssets).sort();

  const renderSchedule = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const allTasks = [...shots, ...assets].sort((a,b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });
    
    return (
      <div className={`border rounded-xl p-4 overflow-hidden flex flex-col ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
        <h3 className="font-black text-xl mb-4 text-blue-600">{t('schedule')}</h3>
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex border-b border-slate-700 pb-2 mb-2">
              <div className="w-80 shrink-0 font-bold text-xs uppercase text-slate-500">Tâche & Dates</div>
              <div className="flex-1 flex">
                 {daysArray.map(d => <div key={d} className="flex-1 text-center text-[10px] text-slate-500 font-bold border-l border-slate-700/30">{d}</div>)}
              </div>
            </div>
            {allTasks.map(task => {
              const startDay = task.startDate ? new Date(task.startDate).getDate() : null;
              const endDay = task.endDate ? new Date(task.endDate).getDate() : null;
              const duration = (startDay && endDay) ? (endDay - startDay) + 1 : 0;
              const offset = startDay ? startDay - 1 : 0;
              const color = task.scene ? 'bg-purple-500' : 'bg-blue-500';
              const isAsset = !task.scene;
              
              return (
                <div key={task.id} className="flex items-center mb-2 border-b border-slate-200 dark:border-slate-800/50 pb-2">
                  <div className="w-80 shrink-0 pr-4">
                     <div className="text-xs font-bold truncate mb-1" title={task.name}>{task.scene || task.category} / {task.name}</div>
                     <div className="flex space-x-2 text-[10px]">
                        <input type="date" value={task.startDate || ''} onChange={e => updateDoc(doc(db, isAsset ? 'assets' : 'shots', task.id), { startDate: e.target.value })} className={`p-1 rounded outline-none ${theme==='dark'?'bg-slate-950 border-slate-700':'bg-slate-100 border-slate-300'} border`} title={t('startDate')} />
                        <input type="date" value={task.endDate || ''} onChange={e => updateDoc(doc(db, isAsset ? 'assets' : 'shots', task.id), { endDate: e.target.value })} className={`p-1 rounded outline-none ${theme==='dark'?'bg-slate-950 border-slate-700':'bg-slate-100 border-slate-300'} border`} title={t('endDate')} />
                     </div>
                  </div>
                  <div className="flex-1 flex relative h-8 bg-slate-200/50 dark:bg-slate-950 rounded items-center">
                    {duration > 0 && (
                       <div className={`absolute h-6 rounded shadow-sm ${color} opacity-80`} style={{ left: `${(offset / daysInMonth) * 100}%`, width: `${(duration / daysInMonth) * 100}%` }}></div>
                    )}
                  </div>
                </div>
              );
            })}
            {allTasks.length === 0 && <p className="text-xs text-slate-500 italic mt-4">Aucune tâche disponible.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderBreakdown = () => {
    const addBreakdownItem = async (e) => {
      e.preventDefault();
      const form = e.target;
      const seq = form.sequence.value;
      const scene = form.scene.value;
      const duration = parseInt(form.duration.value) || 100;
      const description = form.description.value;
      const characters = form.characters.value;
      const props = form.props.value;
      const sets = form.sets.value;
      const fx = form.fx.value;
      
      if (!scene) return;
      await addDoc(collection(db, 'breakdown'), { 
        workspaceId: workspace.id, sequence: seq, scene: scene, duration: duration, description: description, 
        characters: characters, props: props, sets: sets, fx: fx 
      });
      form.reset();
    };

    const convertToAsset = async (item) => {
      const categories = [
        { key: 'characters', cat: 'Character' }, { key: 'props', cat: 'Prop' },
        { key: 'sets', cat: 'Set' }, { key: 'fx', cat: 'FX' }
      ];
      
      let count = 0;
      for (const c of categories) {
        if (!item[c.key]) continue;
        const elements = item[c.key].split(',').map(s => s.trim()).filter(Boolean);
        for (const el of elements) {
          await addDoc(collection(db, 'assets'), {
            name: el, category: c.cat, workspaceId: workspace.id, previews: [], assignedTo: {}, priority: 'Normal', tags: [item.scene || '']
          });
          count++;
        }
      }
      openModal("Succès", `${count} assets ont été créés automatiquement depuis la scène ${item.scene} !`);
    };

    const convertToShots = async (item) => {
      const seqName = item.sequence || 'SQ01';
      const sceneName = item.scene || 'SC01';
      
      const snap = await getDocs(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id), where('sequence', '==', seqName)));
      let localShots = snap.docs.map(d => d.data());
      let nextOrder = 10;
      if (localShots.length > 0) {
        localShots.sort((a,b) => (a.order||0) - (b.order||0));
        nextOrder = (localShots[localShots.length - 1].order || localShots.length * 10) + 10;
      }

      await addDoc(collection(db, 'shots'), { 
        sequence: seqName, scene: sceneName, name: `${sceneName}_SH010`, order: nextOrder, 
        workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {}, priority: 'Normal', tags: [], description: item.description || '', durationFrames: item.duration || 100 
      });
      openModal("Succès", `La scène ${sceneName} a été générée dans la séquence ${seqName} (Shots) !`);
    };

    const countElements = (catKey) => breakdownItems.reduce((acc, item) => acc + (item[catKey] ? item[catKey].split(',').filter(x => x.trim() !== '').length : 0), 0);

    return (
      <div className={`border rounded-xl p-6 ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xl text-blue-600">{t('breakdown')}</h3>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl text-center border shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
              <div className="text-3xl font-black text-blue-600">{countElements('characters')}</div>
              <div className="text-xs font-bold text-slate-500 uppercase">Characters</div>
            </div>
            <div className={`p-4 rounded-xl text-center border shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
              <div className="text-3xl font-black text-green-600">{countElements('props')}</div>
              <div className="text-xs font-bold text-slate-500 uppercase">Props</div>
            </div>
            <div className={`p-4 rounded-xl text-center border shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
              <div className="text-3xl font-black text-purple-600">{countElements('sets')}</div>
              <div className="text-xs font-bold text-slate-500 uppercase">Sets</div>
            </div>
            <div className={`p-4 rounded-xl text-center border shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
              <div className="text-3xl font-black text-orange-500">{countElements('fx')}</div>
              <div className="text-xs font-bold text-slate-500 uppercase">FX</div>
            </div>
         </div>

         <form onSubmit={addBreakdownItem} className="flex flex-col gap-4 mb-8">
           <div className="flex flex-wrap gap-4">
             <input name="sequence" placeholder="Séquence (ex: SQ01)" className={`${inputClass} flex-1 min-w-[120px] font-bold`} defaultValue="SQ01" required/>
             <input name="scene" placeholder="Scène (ex: SC01)" className={`${inputClass} flex-1 min-w-[120px] font-bold`} required/>
             <input name="duration" type="number" placeholder="Durée (frames)" className={`${inputClass} flex-1 min-w-[120px]`} defaultValue="100"/>
             <input name="description" placeholder="Description de l'action..." className={`${inputClass} flex-[2] min-w-[200px]`}/>
           </div>
           <div className="flex flex-wrap gap-4">
             <input name="characters" placeholder="Personnages (séparés par virgule)" className={`${inputClass} flex-1 min-w-[150px]`}/>
             <input name="props" placeholder="Props (séparés par virgule)" className={`${inputClass} flex-1 min-w-[150px]`}/>
             <input name="sets" placeholder="Décors (séparés par virgule)" className={`${inputClass} flex-1 min-w-[150px]`}/>
             <input name="fx" placeholder="FX (séparés par virgule)" className={`${inputClass} flex-1 min-w-[150px]`}/>
             <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors shadow-sm">Créer Scène</button>
           </div>
         </form>

         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
             <thead>
               <tr className={`border-b text-xs uppercase ${theme==='dark'?'border-slate-800 text-slate-500':'border-slate-200 text-slate-500'}`}>
                 <th className="p-4">Séquence</th><th className="p-4">Scène</th><th className="p-4">Durée</th><th className="p-4">Description</th>
                 <th className="p-4">Characters</th><th className="p-4">Props</th><th className="p-4">Sets</th><th className="p-4">FX</th><th className="p-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className={`divide-y ${theme==='dark'?'divide-slate-800/50':'divide-slate-200'}`}>
               {breakdownItems.map(item => (
                 <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-colors">
                   <td className="p-4 font-mono text-xs font-bold text-slate-500">{item.sequence || '-'}</td>
                   <td className="p-4 font-black text-blue-600 dark:text-blue-400">{item.scene || '-'}</td>
                   <td className="p-4 font-bold">{item.duration} f</td>
                   <td className="p-4 text-slate-500 italic max-w-[200px] truncate" title={item.description}>{item.description}</td>
                   <td className="p-4"><div className="flex flex-wrap gap-1">{(item.characters||'').split(',').map((x,i) => x.trim() && <span key={i} className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded">{x.trim()}</span>)}</div></td>
                   <td className="p-4"><div className="flex flex-wrap gap-1">{(item.props||'').split(',').map((x,i) => x.trim() && <span key={i} className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded">{x.trim()}</span>)}</div></td>
                   <td className="p-4"><div className="flex flex-wrap gap-1">{(item.sets||'').split(',').map((x,i) => x.trim() && <span key={i} className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded">{x.trim()}</span>)}</div></td>
                   <td className="p-4"><div className="flex flex-wrap gap-1">{(item.fx||'').split(',').map((x,i) => x.trim() && <span key={i} className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded">{x.trim()}</span>)}</div></td>
                   <td className="p-4 flex justify-end space-x-3">
                      <button onClick={() => convertToShots(item)} className="text-purple-500 hover:text-purple-600 transition flex items-center space-x-1 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30" title="Générer en Plan (Shots)"><Film size={14}/> <span className="text-[10px] font-bold">Plan</span></button>
                      <button onClick={() => convertToAsset(item)} className="text-blue-500 hover:text-blue-600 transition flex items-center space-x-1 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Générer tous les Assets"><Box size={14}/> <span className="text-[10px] font-bold">Assets</span></button>
                      <button onClick={()=>deleteDoc(doc(db, 'breakdown', item.id))} className="text-red-500 hover:text-red-600 transition p-2" title="Supprimer"><Trash2 size={16}/></button>
                   </td>
                 </tr>
               ))}
               {breakdownItems.length === 0 && (
                 <tr><td colSpan="9" className="text-center p-8 text-slate-500 italic">Aucune scène analysée dans le dépouillement.</td></tr>
               )}
             </tbody>
           </table>
         </div>
      </div>
    );
  };

  const pixelateStyle = `
    @keyframes pixelateAnim { 0% { filter: blur(0px) contrast(1); transform: scale(1); } 50% { filter: blur(3px) contrast(5); transform: scale(1.05); } 100% { filter: blur(0px) contrast(1); transform: scale(1); } }
    :root { --primary: ${primaryColor}; --secondary: ${secondaryColor}; }
    .bg-blue-600 { background-color: var(--primary) !important; }
    .hover\\:bg-blue-500:hover { background-color: var(--secondary) !important; }
    .text-blue-600, .text-blue-500 { color: var(--primary) !important; }
    .border-blue-600, .border-blue-500 { border-color: var(--primary) !important; }
    .from-blue-600 { --tw-gradient-from: var(--primary) !important; }
    .to-indigo-500 { --tw-gradient-to: var(--secondary) !important; }
  `;
  const lightWrapperClass = "bg-slate-100 text-slate-700";
  const lightCardClass = "bg-slate-50 border-slate-200 shadow-sm"; 

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold">Chargement...</div>;

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${theme === 'dark' ? 'bg-slate-950 text-white' : lightWrapperClass}`}>
        <style>{pixelateStyle}</style>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="px-3 py-1 rounded font-bold text-sm bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase transition">{lang}</button>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition">{theme==='dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>
        </div>
        <form onSubmit={handleAuth} className={`border p-8 rounded-xl w-full max-w-md space-y-5 shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : lightCardClass}`}>
          <div className="flex flex-col items-center justify-center space-y-2 mb-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Clapperboard size={26} className="text-white" /></div>
            <h1 onClick={()=>setLogoPixelated(true)} className="text-2xl font-black tracking-tight cursor-pointer select-none" style={{ animation: logoPixelated ? 'pixelateAnim 0.5s ease-in-out' : 'none' }}>Fabrica Tracker</h1>
          </div>
          <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 pb-2 transition ${authMode === 'login' ? 'text-blue-500 font-bold border-b-2 border-blue-500' : 'text-slate-400'}`}>Connexion</button>
            <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 pb-2 transition ${authMode === 'register' ? 'text-blue-500 font-bold border-b-2 border-blue-500' : 'text-slate-400'}`}>Inscription</button>
          </div>
          {authMode === 'register' && (
            <>
              <input type="text" placeholder="Pseudo" value={authName} onChange={(e) => setAuthName(e.target.value)} className={inputClass} />
              <label className="flex items-center space-x-2 text-sm text-slate-500 cursor-pointer"><input type="checkbox" checked={emailNotifs} onChange={(e)=>setEmailNotifs(e.target.checked)}/> <span>Recevoir alertes Email</span></label>
            </>
          )}
          <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={inputClass} required />
          <input type="password" placeholder="Mot de passe" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={inputClass} required />
          {authMode === 'login' && <div className="text-right"><button type="button" onClick={handleForgotPassword} className="text-xs text-blue-500 hover:underline transition">Mot de passe oublié ?</button></div>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg transition shadow-md">{authMode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
        </form>
      </div>
    );
  }

  if (currentView === 'profile') {
    return (
      <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative ${theme==='dark'?'bg-slate-950 text-white':lightWrapperClass}`}>
         <style>{pixelateStyle}</style>
         <button onClick={() => setCurrentView('dashboard')} className="absolute top-6 left-6 flex items-center space-x-2 text-slate-500 hover:text-blue-500 font-bold transition"><ChevronLeft/> Retour au Dashboard</button>
         <form onSubmit={updateProfile} className={`p-8 w-full max-w-md border rounded-2xl shadow-xl space-y-6 ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
            <div className="flex flex-col items-center space-y-4 mb-6">
               <div className="relative w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-4xl shadow-lg">
                 <UserCircle size={48} className="text-white"/>
                 {isAbsent && <div className="absolute -bottom-2 -right-2 text-2xl" title="Absent">🏖️</div>}
               </div>
               <h2 className="text-2xl font-black">{userData?.displayName || 'Utilisateur'}</h2>
               <p className="text-slate-500 text-sm font-mono">{user.email}</p>
            </div>
            
            <button type="button" onClick={toggleAbsence} className={`w-full py-2 border rounded-lg font-bold transition flex items-center justify-center space-x-2 ${isAbsent ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
               <span>{isAbsent ? '🏖️ Vous êtes déclaré(e) absent(e)' : 'Déclarer une absence (Congés)'}</span>
            </button>

            <div className="space-y-4">
               <div><label className="text-xs font-bold text-slate-500 uppercase">Pseudo</label><input type="text" value={profileName} onChange={e=>setProfileName(e.target.value)} className={inputClass} /></div>
               <label className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={emailNotifs} onChange={e=>setEmailNotifs(e.target.checked)}/><span>Notifications par Email</span></label>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
               <h3 className="font-bold text-sm text-slate-500 uppercase">🎨 Personnalisation (Thème)</h3>
               <div className="flex space-x-4">
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-500 block mb-1">Couleur Principale</label>
                   <input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="w-full h-10 cursor-pointer rounded border-none bg-transparent" />
                 </div>
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-500 block mb-1">Couleur Secondaire</label>
                   <input type="color" value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} className="w-full h-10 cursor-pointer rounded border-none bg-transparent" />
                 </div>
               </div>
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold transition shadow-md mt-4 hover:bg-blue-500">Mettre à jour le profil</button>
         </form>

        {modal.isOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
            <div className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':lightCardClass}`}>
              <h3 className="font-bold text-lg">{modal.title}</h3><p className="text-sm opacity-80">{modal.msg}</p>
              <div className="flex space-x-3 pt-4">
                {modal.onConfirm && <button onClick={closeModal} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded font-bold transition hover:bg-slate-300 dark:hover:bg-slate-700">{t('cancel')}</button>}
                <button onClick={modal.onConfirm || closeModal} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold transition hover:bg-blue-500">{t('ok')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderChatWidget = () => (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end no-print">
      {isChatWidgetOpen && (
        <div className={`w-80 h-[28rem] mb-4 rounded-xl shadow-2xl border flex flex-col overflow-hidden transform transition-all ${theme==='dark'?'bg-slate-900 border-slate-700':lightCardClass}`}>
          {!activeFriend ? (
             <div className="flex flex-col h-full">
               <div className={`p-4 border-b font-bold flex justify-between items-center ${theme==='dark'?'border-slate-800 bg-slate-950/50':'border-slate-200 bg-slate-100'}`}>
                  <div className="flex items-center"><MessageCircle size={18} className="mr-2 text-blue-500"/> Mes Messages</div>
                  <button onClick={()=>setIsChatWidgetOpen(false)} className="text-slate-400 hover:text-red-500 transition"><X size={18}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {friendsList.length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-10">Ajoutez des amis dans le Dashboard.</p> : null}
                 {friendsList.map(f => (
                   <button key={f.id} onClick={() => setActiveFriend(f)} className={`w-full flex items-center justify-between p-3 rounded-lg transition text-left ${theme==='dark'?'hover:bg-slate-800':'hover:bg-slate-200/50'}`}>
                     <div className="flex items-center">
                       <UserCircle size={24} className="text-slate-400 mr-3 shrink-0"/>
                       <span className="font-bold text-sm truncate">{f.displayName}</span>
                     </div>
                     {onlineUsers[f.id] && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow" title="En ligne"></div>}
                   </button>
                 ))}
               </div>
             </div>
          ) : (
             <div className="flex flex-col h-full">
               <div className={`p-3 border-b flex justify-between items-center shadow-sm ${theme==='dark'?'border-slate-800 bg-slate-950/50':'border-slate-200 bg-slate-100'}`}>
                  <button onClick={()=>setActiveFriend(null)} className="p-1 text-slate-400 hover:text-blue-500 transition"><ChevronLeft size={20}/></button>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm truncate flex-1 text-center cursor-pointer hover:underline" onClick={()=>setViewProfileId(activeFriend.id)}>{activeFriend.displayName}</span>
                    {onlineUsers[activeFriend.id] && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </div>
                  <button onClick={()=>setIsChatWidgetOpen(false)} className="p-1 text-slate-400 hover:text-red-500 transition"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950/30">
                 {pmMessages.length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-10">Dites bonjour !</p> : null}
                 {pmMessages.map(msg => (
                    <div key={msg.id} className={`p-2.5 rounded-xl text-xs max-w-[85%] shadow-sm ${msg.authorId === user.uid ? 'bg-blue-600 text-white ml-auto rounded-br-none' : (theme==='dark'?'bg-slate-800 text-slate-200 mr-auto rounded-bl-none':'bg-white border border-slate-200 text-slate-700 mr-auto rounded-bl-none')}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                 ))}
               </div>
               <form onSubmit={postPm} className={`p-2 border-t flex space-x-2 ${theme==='dark'?'border-slate-800 bg-slate-900':'border-slate-200 bg-slate-50'}`}>
                  <input type="text" value={newPmMsg} onChange={e=>setNewPmMsg(e.target.value)} placeholder="Message..." className={`flex-1 p-2 rounded-lg outline-none text-sm transition ${theme==='dark'?'bg-slate-950 border-slate-700 border':'bg-white border-slate-300 border focus:border-blue-500'}`} />
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg transition hover:bg-blue-500"><Plus size={18}/></button>
               </form>
             </div>
          )}
        </div>
      )}
      <button onClick={() => setIsChatWidgetOpen(!isChatWidgetOpen)} className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition">
         {isChatWidgetOpen ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>
    </div>
  );

  if (currentView === 'dashboard') {
    return (
      <div className={`min-h-screen p-6 relative flex flex-col ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : lightWrapperClass}`}>
        <style>{pixelateStyle}</style>
        {renderChatWidget()}
        
        <button onClick={() => setShowPingPong(!showPingPong)} className="fixed bottom-6 left-6 w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition z-50"><Gamepad2 size={24}/></button>
        {showPingPong && <PingPongGame onClose={() => setShowPingPong(false)} />}
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-5xl mx-auto w-full space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-md"><Clapperboard size={22} className="text-white" /></div>
            <h1 onClick={()=>setLogoPixelated(true)} className="text-2xl font-black cursor-pointer select-none" style={{ animation: logoPixelated ? 'pixelateAnim 0.5s ease-in-out' : 'none' }}>Fabrica Tracker</h1>
          </div>
          
          <div className={`flex items-center space-x-3 p-2 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-50 border-slate-200'}`}>
            <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="px-3 py-1.5 rounded font-bold text-sm bg-slate-100 dark:bg-slate-800 uppercase text-slate-900 dark:text-slate-100 shadow-sm transition">{lang}</button>
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm transition">{theme==='dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
            <button onClick={() => setCurrentView('profile')} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border shadow-sm transition ${theme==='dark'?'bg-slate-800 border-slate-700 hover:text-white':'bg-white border-slate-200 hover:text-blue-600'}`}>
              <UserCircle size={18} /> 
              <span className="text-sm font-medium">{userData?.displayName} {isAbsent && '🏖️'}</span>
            </button>
            <button onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition"><LogOut size={18} /></button>
          </div>
        </header>

        {viewProfileId && profileModalData && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
            <div className={`p-6 rounded-xl border w-full max-w-sm space-y-6 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':lightCardClass}`}>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><UserCircle size={40} className="text-blue-500" /></div>
                <div>
                  <h3 className="font-bold text-xl">{profileModalData.displayName} {profileModalData.isAbsent && '🏖️'}</h3>
                  <p className="text-sm text-slate-500 font-bold">{onlineUsers[viewProfileId] ? '🟢 En ligne' : '⚪ Hors ligne'}</p>
                </div>
              </div>
              {viewProfileId !== user.uid && !friendsList.find(f => f.id === viewProfileId) && (
                <button onClick={() => addFriend(viewProfileId)} className="w-full bg-blue-600 hover:bg-blue-500 transition text-white py-2.5 rounded-lg font-bold">Ajouter en ami</button>
              )}
              <button onClick={() => setViewProfileId(null)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition rounded-lg font-bold text-slate-800 dark:text-white">Fermer</button>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto w-full mb-6 flex space-x-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button onClick={()=>setDashTab('projects')} className={`font-bold text-lg transition ${dashTab === 'projects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('projects')}</button>
          <button onClick={()=>setDashTab('friends')} className={`font-bold text-lg transition ${dashTab === 'friends' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('friends')}</button>
        </div>

        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashTab === 'projects' && (
            <>
              <div className={`md:col-span-2 border p-6 rounded-xl flex-1 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center"><FolderKanban className="mr-2 text-blue-500" /> {t('projects')}</h2>
                <div className="space-y-3">
                  {myProjects.length === 0 ? <p className="text-slate-500 italic">Aucun projet. Créez-en un à droite.</p> : null}
                  {myProjects.map(p => (
                    <div key={p.id} className={`relative rounded-lg overflow-hidden border transition group ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-blue-500':'bg-white border-slate-200 hover:border-blue-500'}`}>
                      {p.bannerUrl && <div className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition" style={{backgroundImage: `url(${p.bannerUrl})`}}></div>}
                      <div className="relative z-10 p-4 flex justify-between items-center backdrop-blur-[2px]">
                        <div className="flex-1 cursor-pointer flex items-center" onClick={async () => {
                          const wsDoc = await getDoc(doc(db, 'workspaces', p.workspaceId));
                          if(wsDoc.exists()) { setWorkspace({ id: wsDoc.id, ...wsDoc.data() }); setCurrentView('workspace'); setActiveTab('myTasks'); }
                        }}>
                          <div><h3 className="font-bold text-lg drop-shadow-md">{p.workspaceName}</h3><p className="text-xs text-slate-700 font-bold dark:text-slate-300 uppercase tracking-wider mt-1 drop-shadow-md">Rôle : <span className="text-blue-600 dark:text-blue-400 font-black">{p.role}</span></p></div>
                        </div>
                        <div className="flex items-center space-x-3 bg-white/70 dark:bg-slate-950/70 p-1.5 rounded-full backdrop-blur-md">
                          {p.role === 'Admin' && <button onClick={() => {
                            const newName = window.prompt("Nouveau nom :", p.workspaceName);
                            if(newName) {
                              updateDoc(doc(db, 'workspaces', p.workspaceId), { name: newName });
                              getDocs(query(collection(db, 'projectMembers'), where('workspaceId', '==', p.workspaceId))).then(snap => snap.forEach(m => updateDoc(m.ref, { workspaceName: newName })));
                            }
                          }} className="p-2 text-slate-800 dark:text-slate-300 hover:text-blue-600 transition"><Edit3 size={18}/></button>}
                          <div onClick={async () => {
                            const wsDoc = await getDoc(doc(db, 'workspaces', p.workspaceId));
                            if(wsDoc.exists()) { setWorkspace({ id: wsDoc.id, ...wsDoc.data() }); setCurrentView('workspace'); setActiveTab('myTasks'); }
                          }} className="cursor-pointer w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-50 flex items-center justify-center text-white shadow-lg transform hover:scale-105 transition"><Play size={18} className="ml-1" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <form onSubmit={createProject} className={`border p-6 rounded-xl space-y-4 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h2 className="text-lg font-bold">{t('createProj')}</h2>
                  <input type="text" placeholder={t('projName')} value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className={inputClass} required />
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Bannière (Fichier)</label>
                    <input type="file" accept="image/*" onChange={(e) => setNewProjectBannerFile(e.target.files[0])} className={`text-xs ${inputClass} !py-1.5`} />
                  </div>

                  <div className="flex space-x-2">
                    {['2D', '3D', 'Game'].map(tp => (
                      <button key={tp} type="button" onClick={() => setNewProjectType(tp)} className={`flex-1 py-1.5 text-xs font-bold rounded border transition ${newProjectType === tp ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{tp}</button>
                    ))}
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-sm">Créer</button>
                </form>
                <form onSubmit={joinProject} className={`border p-6 rounded-xl space-y-4 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h2 className="text-lg font-bold">{t('joinProj')}</h2>
                  <input type="text" placeholder={t('joinCode')} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className={`font-mono text-center tracking-widest ${inputClass}`} required />
                  <button type="submit" className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg transition">{t('join')}</button>
                </form>
              </div>
            </>
          )}

          {dashTab === 'friends' && (
            <>
               <div className={`md:col-span-2 border p-6 rounded-xl shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center"><Users className="mr-2 text-blue-500" /> {t('friends')}</h2>
                <div className="space-y-3">
                  {friendsList.length === 0 ? <p className="text-slate-500 italic">Aucun ami ajouté.</p> : null}
                  {friendsList.map(f => (
                    <div key={f.id} className={`border p-4 rounded-lg flex justify-between items-center transition ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-slate-700':'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80" onClick={()=>setViewProfileId(f.id)}>
                         <UserCircle size={32} className="text-slate-400"/> 
                         <div className="flex items-center space-x-2"><h3 className="font-bold text-lg hover:underline">{f.displayName}</h3> {onlineUsers[f.id] && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow" title="En ligne"></div>}</div>
                      </div>
                      <button onClick={() => { setActiveFriend(f); setIsChatWidgetOpen(true); }} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition"><MessageSquare size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <form onSubmit={(e)=>{e.preventDefault(); addFriend(friendInput);}} className={`border p-6 rounded-xl space-y-4 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h2 className="text-lg font-bold flex items-center"><UserPlus className="mr-2"/> {t('addFriend')}</h2>
                  <input type="text" placeholder={t('friendId')} value={friendInput} onChange={(e) => setFriendInput(e.target.value)} className={`font-mono text-center tracking-widest ${inputClass}`} required />
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-sm">Ajouter</button>
                </form>
                <div className={`border p-6 rounded-xl text-center space-y-2 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h3 className="font-bold text-sm text-slate-500">{t('myId')}</h3>
                  <div className="font-mono bg-slate-100 dark:bg-slate-950 p-2 rounded text-blue-600 dark:text-blue-500 font-bold select-all cursor-pointer border border-slate-200 dark:border-slate-800">{user.uid}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : lightWrapperClass}`}>
      <style>{pixelateStyle}</style>
      {renderChatWidget()}
      
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
          <div className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':lightCardClass}`}>
            <h3 className="font-bold text-lg">{modal.title}</h3><p className="text-sm opacity-80">{modal.msg}</p>
            <div className="flex space-x-3 pt-4">
              {modal.onConfirm && <button onClick={closeModal} className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded font-bold transition">{t('cancel')}</button>}
              <button onClick={modal.onConfirm || closeModal} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition">{t('ok')}</button>
            </div>
          </div>
        </div>
      )}

      {viewProfileId && profileModalData && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
            <div className={`p-6 rounded-xl border w-full max-w-sm space-y-6 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':lightCardClass}`}>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><UserCircle size={40} className="text-blue-500" /></div>
                <div>
                  <h3 className="font-bold text-xl">{profileModalData.displayName} {profileModalData.isAbsent && '🏖️'}</h3>
                  <p className="text-sm text-slate-500 font-bold">{onlineUsers[viewProfileId] ? '🟢 En ligne' : '⚪ Hors ligne'}</p>
                </div>
              </div>
              {viewProfileId !== user.uid && !friendsList.find(f => f.id === viewProfileId) && (
                <button onClick={() => addFriend(viewProfileId)} className="w-full bg-blue-600 hover:bg-blue-500 transition text-white py-2.5 rounded-lg font-bold">Ajouter en ami</button>
              )}
              <button onClick={() => setViewProfileId(null)} className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition rounded-lg font-bold text-slate-800 dark:text-white">Fermer</button>
            </div>
          </div>
        )}

      {showAddAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 no-print">
          <form onSubmit={handleAddAsset} className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
            <h3 className="font-bold text-lg mb-2">{t('addAsset')}</h3>
            <div><label className="text-xs font-bold text-slate-500">{t('assetName')}</label><input type="text" value={addAssetName} onChange={(e)=>setAddAssetName(e.target.value)} className={inputClass} required/></div>
            <div><label className="text-xs font-bold text-slate-500">{t('category')}</label>
               <select value={addAssetCategory} onChange={(e)=>setAddAssetCategory(e.target.value)} className={inputClass}>
                 {ASSET_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-50 dark:bg-slate-900">{c}</option>)}
               </select>
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => {setShowAddAsset(false); setAddAssetName('');}} className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition rounded font-bold">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 transition text-white rounded font-bold">OK</button>
            </div>
          </form>
        </div>
      )}

      <aside className={`w-16 md:w-64 border-r flex flex-col justify-between shrink-0 h-full z-20 no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-50 border-slate-200'}`}>
        <div className="space-y-4">
          <div className="relative p-4 border-b border-slate-200 dark:border-slate-800 bg-cover bg-center" style={workspace?.bannerUrl ? {backgroundImage: `url(${workspace.bannerUrl})`} : {}}>
            {workspace?.bannerUrl && <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-sm"></div>}
            <div className="relative z-10 space-y-4">
              <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition dark:text-slate-400 font-bold"><ChevronLeft size={20} /> <span className="hidden md:inline">Projets</span></button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-md"><Clapperboard size={18} className="text-white" /></div>
                <div className="text-sm font-black hidden md:block leading-tight truncate drop-shadow-sm">{workspace?.name}</div>
              </div>
            </div>
          </div>
          
          <nav className="space-y-1.5 px-4 overflow-y-auto">
            <button onClick={() => {setActiveTab('myTasks'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'myTasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><ListTodo size={18} /> <span className="hidden md:inline font-bold">{t('myTasks')}</span></button>
            <button onClick={() => {setActiveTab('assets'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'assets' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Box size={18} /> <span className="hidden md:inline font-bold">{t('assets')}</span></button>
            <button onClick={() => {setActiveTab('shots'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'shots' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Film size={18} /> <span className="hidden md:inline font-bold">{t('shots')}</span></button>
            <button onClick={() => {setActiveTab('schedule'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Calendar size={18} /> <span className="hidden md:inline font-bold">{t('schedule')}</span></button>
            <button onClick={() => {setActiveTab('breakdown'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'breakdown' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><FileText size={18} /> <span className="hidden md:inline font-bold">{t('breakdown')}</span></button>
            <button onClick={() => {setActiveTab('time'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'time' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Clock size={18} /> <span className="hidden md:inline font-bold">{t('time')}</span></button>
            <button onClick={() => {setActiveTab('stats'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><PieChart size={18} /> <span className="hidden md:inline font-bold">{t('stats')}</span></button>
            <button onClick={() => {setActiveTab('historyLog'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'historyLog' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><History size={18} /> <span className="hidden md:inline font-bold">{t('historyLog')}</span></button>
            <button onClick={() => {setActiveTab('team'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Users size={18} /> <span className="hidden md:inline font-bold">{t('team')}</span></button>
            {userPermissions.role === 'Admin' && <button onClick={() => {setActiveTab('settings'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Settings size={18} /> <span className="hidden md:inline font-bold">{t('settings')}</span></button>}
            <button onClick={() => {setActiveTab('help'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'help' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><HelpCircle size={18} /> <span className="hidden md:inline font-bold">{t('help')}</span></button>
          </nav>
        </div>
        <div className="p-4 flex items-center space-x-2">
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="flex-1 p-2 rounded border dark:border-slate-800 border-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 transition text-xs text-slate-900 dark:text-slate-100 font-bold uppercase shadow-sm">{lang}</button>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded border dark:border-slate-800 border-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm transition">{theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>
        </div>
      </aside>

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden relative print-area bg-transparent">
          {uploadingMedia && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded text-sm animate-pulse shadow-lg z-50 no-print">Transfert Cloudinary...</div>}
          
          <header className="mb-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 no-print">
            <h2 className="text-2xl font-bold tracking-tight uppercase">{t(activeTab)}</h2>
            <div className="flex items-center space-x-6">
              {userPermissions.canAssign && (
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                    <Bell size={20} />
                    {pendingReviews.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">{pendingReviews.length}</span>}
                  </button>
                  {showNotifications && (
                    <div className={`absolute top-10 right-0 w-64 border rounded-xl shadow-2xl z-50 p-3 max-h-64 overflow-y-auto ${theme==='dark'?'bg-slate-900 border-slate-700':lightCardClass}`}>
                      <h4 className="text-sm font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">À Valider</h4>
                      {pendingReviews.length === 0 ? <p className="text-xs text-slate-500 italic">Rien à voir pour le moment !</p> : pendingReviews.map(s => (
                        <div key={s.id} className={`text-xs p-2 rounded mb-1 border cursor-pointer transition ${theme==='dark'?'hover:bg-slate-800 border-slate-800':'hover:bg-blue-50 border-slate-200'}`} onClick={()=>{setActiveTab('shots'); setShowNotifications(false);}}>
                          <span className="font-bold text-blue-500">{s.name}</span> prêt pour validation.
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Rôle : <span className="text-blue-600 ml-1">{userPermissions.role}</span>
                 {userPermissions.leads?.length > 0 && <div className="text-[9px] text-purple-500">Lead: {userPermissions.leads.join(', ')}</div>}
              </div>
            </div>
          </header>

          {activeTab === 'myTasks' && (
            <div className="space-y-8">
               <div className={`p-6 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h3 className="font-black text-xl mb-4 flex items-center text-blue-600"><Film className="mr-3" /> Mes Plans ({sortTasksByPriorityStatus(myAssignedShots, true).length})</h3>
                  {sortTasksByPriorityStatus(myAssignedShots, true).length === 0 ? <p className="text-sm text-slate-500 italic">Aucun plan actif assigné pour l'instant.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {sortTasksByPriorityStatus(myAssignedShots, true).map(s => (
                          <div key={s.id} className={`p-4 rounded-lg border flex flex-col justify-between cursor-pointer transition shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-blue-500':'bg-slate-50 border-slate-200 hover:border-blue-500'}`} onClick={() => setActiveTab('shots')}>
                             <div className="flex justify-between items-start mb-2">
                               <div><div className="text-xs text-slate-500 font-mono font-bold">{s.sequence} / {s.scene}</div><div className="font-bold text-lg">{s.name}</div></div>
                               {getPriorityIcon(s.priority)}
                             </div>
                             <div className="flex flex-wrap gap-1 mt-2">
                                {workspace?.pipeline?.map(step => (getAssignees(s, step).includes(user.uid) || userPermissions.leads?.includes(step)) && s.status?.[step] !== 'done' && (
                                  <span key={step} className={`text-[10px] px-2 py-1 rounded border font-bold ${getStatusColor(s.status?.[step])}`}>
                                    {step} : {s.status?.[step]?.toUpperCase() || 'TODO'}
                                  </span>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                  )}
               </div>

               <div className={`p-6 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h3 className="font-black text-xl mb-4 flex items-center text-blue-600"><Box className="mr-3" /> Mes Assets ({sortTasksByPriorityStatus(myAssignedAssets, false).length})</h3>
                  {sortTasksByPriorityStatus(myAssignedAssets, false).length === 0 ? <p className="text-sm text-slate-500 italic">Aucun asset actif assigné pour l'instant.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {sortTasksByPriorityStatus(myAssignedAssets, false).map(a => (
                          <div key={a.id} className={`p-4 rounded-lg border flex flex-col justify-between cursor-pointer transition shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-blue-500':'bg-slate-50 border-slate-200 hover:border-blue-500'}`} onClick={() => setActiveTab('assets')}>
                             <div className="flex justify-between items-start mb-2">
                               <div><div className="text-xs text-slate-500 font-bold">{a.category}</div><div className="font-bold text-lg">{a.name}</div></div>
                               {getPriorityIcon(a.priority)}
                             </div>
                             <div className="mt-2">
                               <span className={`text-[10px] px-2 py-1 rounded border font-bold ${getStatusColor(a.status?.Global)}`}>
                                 {a.status?.Global?.toUpperCase() || 'TODO'}
                               </span>
                             </div>
                          </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'shots' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border flex flex-col xl:flex-row gap-4 items-center justify-between no-print ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <div className="flex flex-col md:flex-row flex-1 gap-2 w-full">
                  <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input type="text" placeholder={t('searchShot')} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className={`${inputClass} pl-10`} /></div>
                  <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} className={inputClass + " flex-1 font-bold"}>
                    <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">-- Tags --</option>
                    {Array.from(new Set(shots.flatMap(s=>s.tags||[]))).map(t => <option key={t} value={t} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={inputClass + " flex-1 font-bold"}>
                     <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('allStatus')}</option>
                     <option value="todo" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('todo')}</option>
                     <option value="wip" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('wip')}</option>
                     <option value="review" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('reviewStatus')}</option>
                     <option value="retake" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('retake')}</option>
                     <option value="reuse" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('reuse')}</option>
                     <option value="done" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('done')}</option>
                  </select>
                  <select value={filterAssignee} onChange={e=>setFilterAssignee(e.target.value)} className={inputClass + " flex-1 font-bold"}>
                     <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('allMembers')}</option>
                     {members.map(m=><option key={m.userId} value={m.userId} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{m.displayName}</option>)}
                  </select>
                </div>
                
                <div className="flex space-x-2 shrink-0">
                  <button onClick={()=>setActiveTab('stats')} className="bg-purple-600 hover:bg-purple-500 transition text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center space-x-1" title="Voir Stats"><PieChart size={16}/></button>
                  <button onClick={exportExcel} className="bg-green-700 hover:bg-green-600 transition text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center space-x-1" title="Export Excel"><FileSpreadsheet size={16}/><span>Excel</span></button>
                  {userPermissions.canAssign && <button onClick={addNewSequence} className="w-full xl:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Plus size={16} /> <span>Séquence</span></button>}
                </div>
              </div>

              {userPermissions.canEdit && batchSelection.length > 0 && (
                <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg sticky top-0 z-40 no-print">
                  <div className="font-bold flex items-center"><CheckSquare className="mr-2"/> {batchSelection.length} sélectionnés</div>
                  <div className="flex space-x-2 items-center">
                    <select value={batchActionStep} onChange={e=>setBatchActionStep(e.target.value)} className="bg-blue-800 text-white border-none rounded-lg p-2 text-sm outline-none font-bold"><option value="">-- Étape --</option>{workspace?.pipeline?.map(p=><option key={p} value={p}>{p}</option>)}</select>
                    <select value={batchActionStatus} onChange={e=>setBatchActionStatus(e.target.value)} className="bg-blue-800 text-white border-none rounded-lg p-2 text-sm outline-none font-bold"><option value="">-- Statut --</option><option value="todo">{t('todo')}</option><option value="wip">{t('wip')}</option><option value="review">{t('reviewStatus')}</option><option value="retake">{t('retake')}</option><option value="done">{t('done')}</option></select>
                    <button onClick={applyBatchAction} className="bg-slate-50 text-blue-600 hover:bg-white transition px-4 py-2 rounded-lg font-bold text-sm shadow-sm">Appliquer</button>
                  </div>
                </div>
              )}

              {filteredShots.length === 0 && (
                <div className={`p-10 text-center text-slate-500 italic border border-dashed rounded-xl ${theme==='dark'?'border-slate-700 bg-slate-900/50':'border-slate-300 bg-slate-50'}`}>
                   <Film size={48} className="mx-auto mb-4 opacity-30" />
                   Aucun plan trouvé ou créé. {userPermissions.canAssign && 'Cliquez sur "+ Séquence" pour commencer la numérotation auto.'}
                </div>
              )}

              {sortedSeqs.map(seq => (
                <div key={seq} className={`border rounded-xl overflow-hidden shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <div className={`p-3 border-b flex justify-between items-center ${theme==='dark'?'bg-slate-950/50 border-slate-800':'bg-slate-100 border-slate-200'}`}>
                    <div className="font-black text-blue-600 tracking-widest text-sm flex items-center"><Film size={16} className="mr-2 opacity-50"/> {seq}</div>
                    {userPermissions.canAssign && <button onClick={() => addNewShot(seq)} className="text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg font-bold shadow-sm flex items-center"><Plus size={14} className="mr-1"/> Ajouter Plan</button>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className={`border-b text-xs uppercase ${theme==='dark'?'border-slate-800 text-slate-400 bg-slate-900':'border-slate-200 text-slate-500 bg-slate-50'}`}>
                          <th className="p-3 sticky left-0 z-10 w-96 font-bold bg-inherit">
                            {userPermissions.canEdit && <input type="checkbox" onChange={(e) => setBatchSelection(e.target.checked ? groupedShots[seq].map(s=>s.id) : batchSelection.filter(id => !groupedShots[seq].map(s=>s.id).includes(id))) } className="mr-2 cursor-pointer no-print accent-blue-600"/>} {t('scene')} / {t('plan')}
                          </th>
                          {workspace?.pipeline?.map(step => <th key={step} className={`p-3 min-w-[240px] border-l font-bold ${theme==='dark'?'border-slate-800':'border-slate-200'}`}>{step}</th>)}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme==='dark'?'divide-slate-800/50':'divide-slate-200'}`}>
                        {groupedShots[seq].sort((a,b)=> (a.order||0) - (b.order||0)).map((s, index) => (
                          <React.Fragment key={s.id}>
                            <tr className={`group ${theme==='dark'?'hover:bg-slate-800/40':'hover:bg-slate-100/50'} transition-colors`}>
                              <td className={`p-3 font-medium sticky left-0 z-10 align-top ${theme==='dark'?'bg-slate-900':'bg-white'} group-hover:bg-inherit`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-start w-full">
                                    {userPermissions.canEdit && <input type="checkbox" checked={batchSelection.includes(s.id)} onChange={(e) => setBatchSelection(e.target.checked ? [...batchSelection, s.id] : batchSelection.filter(id=>id!==s.id))} className="mr-3 mt-1 cursor-pointer no-print accent-blue-600"/>}
                                    <div className="w-full">
                                      <div className="font-black text-base flex items-center justify-between w-full">
                                         <div><span className="text-slate-400 text-xs font-mono mr-1">{s.scene}</span> {s.name}</div>
                                         <div className="flex items-center space-x-1">
                                            {userPermissions.canAssign ? (
                                              <select value={s.priority || 'Normal'} onChange={e => changePriority(s.id, e.target.value, 'shots')} className={`text-[10px] p-0 outline-none bg-transparent cursor-pointer no-print ${theme==='dark'?'text-slate-400':'text-slate-500'}`}>
                                                  <option value="Urgent" className="bg-slate-50 dark:bg-slate-900">🔴</option><option value="Normal" className="bg-slate-50 dark:bg-slate-900">🟡</option><option value="Low" className="bg-slate-50 dark:bg-slate-900">🟢</option>
                                              </select>
                                            ) : <span className="text-[10px]">{s.priority==='Urgent'?'🔴':s.priority==='Low'?'🟢':'🟡'}</span>}
                                            {userPermissions.canAssign && <button onClick={() => openModal("Supprimer Plan", `Détruire définitivement le plan ${s.name} ?`, async () => { await deleteDoc(doc(db, 'shots', s.id)); closeModal(); setTimeout(()=>recalculateSequenceShots(s.sequence), 500); })} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 no-print ml-2"><Trash2 size={16}/></button>}
                                         </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <ShotDetailsEditor shot={s} onSave={(updates) => updateDoc(doc(db, 'shots', s.id), updates)} t={t} />

                                <div className="flex flex-wrap gap-1 ml-6 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                                   {(s.tags || []).map(tag => (
                                      <span key={tag} className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded flex items-center font-bold">
                                         {tag} {userPermissions.canAssign && <X size={8} className="ml-1 cursor-pointer hover:text-red-500 no-print" onClick={()=>removeTag(s.id, 'shots', s.tags, tag)}/>}
                                      </span>
                                   ))}
                                   {userPermissions.canAssign && <button onClick={()=>addTag(s.id, 'shots', s.tags||[])} className="text-[9px] border border-dashed border-slate-400 text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center font-bold no-print"><Plus size={8} className="mr-0.5"/> Tag</button>}
                                </div>
                              </td>
                              {workspace?.pipeline?.map(step => {
                                const assignees = getAssignees(s, step);
                                const isMyTask = assignees.includes(user.uid);
                                const canUpload = userPermissions.canEdit && (isMyTask || userPermissions.canAssign);
                                const versions = Array.isArray(s.previews?.[step]) ? s.previews[step] : [];
                                const activeIdx = selectedVersions[`${s.id}_${step}`] ?? (versions.length > 0 ? versions.length - 1 : -1);
                                const activePreview = activeIdx >= 0 ? versions[activeIdx] : null;

                                return (
                                  <td key={step} className={`p-3 border-l align-top space-y-2 ${theme==='dark'?'border-slate-800/50':'border-slate-200'}`}>
                                    <div className="flex flex-col space-y-1.5 no-print">
                                      <div className="flex flex-wrap gap-1">
                                        {assignees.map(uid => (
                                          <span key={uid} onClick={() => userPermissions.canAssign && removeAssignee('shots', s.id, step, uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold shadow-sm transition-colors ${userPermissions.canAssign ? 'cursor-pointer bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                            {members.find(m => m.userId === uid)?.displayName || 'Inconnu'} {userPermissions.canAssign && <X size={10} className="ml-1"/>}
                                          </span>
                                        ))}
                                      </div>
                                      {userPermissions.canAssign && (<select className={`${inputClass} !p-1 !text-xs !py-1`} value="" onChange={(e) => { if(e.target.value) addAssignee('shots', s.id, step, e.target.value) }}><option value="" className="bg-slate-50 dark:bg-slate-900">+ Assigner</option>{members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId} className="bg-slate-50 dark:bg-slate-900">{m.displayName}</option>)}</select>)}
                                      
                                      <select disabled={!userPermissions.canEdit} className={`rounded p-1 text-xs font-bold outline-none transition-colors border shadow-sm ${getStatusColor(s.status?.[step])}`} value={s.status?.[step] || 'todo'} onChange={(e) => changeStatus(s, step, e.target.value, 'shots')}>
                                         <option value="todo" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('todo')}</option>
                                         <option value="wip" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('wip')}</option>
                                         <option value="review" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('reviewStatus')}</option>
                                         <option value="retake" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('retake')}</option>
                                         <option value="reuse" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('reuse')}</option>
                                         <option value="done" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t('done')}</option>
                                      </select>
                                    </div>
                                    <div className="hidden print:block text-xs font-bold">{s.status?.[step] || 'todo'}</div>
                                    <div className={`pt-2 border-t h-[4.5rem] no-print ${theme==='dark'?'border-slate-800/50':'border-slate-200'}`}>
                                      {activePreview ? (
                                        <div className="flex flex-col w-full space-y-1">
                                          <div className="flex justify-between items-center px-0.5">
                                            {versions.length > 1 ? (<select value={activeIdx} onChange={(e) => setSelectedVersions({...selectedVersions, [`${s.id}_${step}`]: parseInt(e.target.value)})} className="bg-transparent text-xs text-slate-500 font-bold outline-none cursor-pointer">{versions.map((v, i) => <option key={i} value={i} className="bg-slate-50 dark:bg-slate-900">V{v.version}</option>)}</select>) : <span className="text-xs font-bold text-slate-400">V1</span>}
                                            <div className="flex space-x-2 text-slate-400">{canUpload && <label className="cursor-pointer hover:text-blue-500 transition" title="Upload"><Upload size={14}/><input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} /></label>}{canUpload && <button onClick={() => confirmDeletePreview(s.id, step, activeIdx, versions, 'shots')} className="hover:text-red-500 transition"><Trash2 size={14}/></button>}</div>
                                          </div>
                                          <div className="relative w-full h-12 bg-black rounded border border-slate-800 group/preview cursor-pointer overflow-hidden shadow-sm" onClick={() => openReview(s, step, activePreview.version, activePreview, 'shots')}>
                                            {activePreview.type === 'video' ? (
                                              <video src={activePreview.url} className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition duration-300" muted />
                                            ) : (
                                              <img src={getThumbnail(activePreview)} className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition duration-300" />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover/preview:bg-blue-600/20 transition duration-300"><MonitorPlay size={18} className="text-white opacity-0 group-hover/preview:opacity-100 drop-shadow-md transform scale-75 group-hover/preview:scale-100 transition-all" /></div>
                                            {s.annotations?.[step]?.[`v${activePreview.version}`] && Object.keys(s.annotations[step][`v${activePreview.version}`]).length > 0 && (<div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow"></div>)}
                                          </div>
                                        </div>
                                      ) : (canUpload ? (<label className={`text-xs flex flex-col items-center justify-center border border-dashed text-slate-500 dark:text-slate-400 font-bold w-full rounded cursor-pointer h-full transition group/up ${theme==='dark'?'bg-slate-950 border-slate-700 hover:border-blue-500':'bg-slate-50 border-slate-300 hover:border-blue-500'}`}><Upload size={16} className="mb-1 group-hover/up:-translate-y-0.5 transition-transform"/> <span>{t('upload')}</span><input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} /></label>) : (<div className={`text-xs w-full h-full flex items-center justify-center italic font-bold rounded ${theme==='dark'?'text-slate-600 bg-slate-950/50':'text-slate-400 bg-slate-100'}`}>{t('wait')}</div>))}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            {userPermissions.canAssign && (
                              <tr className="h-0 opacity-0 group-hover:opacity-100 transition-opacity no-print relative">
                                <td colSpan={workspace?.pipeline?.length + 1} className="p-0 text-center relative border-none">
                                   <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-20">
                                     <button onClick={() => insertShotAfter(seq, index)} className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-blue-500 transition" title="Insérer un plan ici"><Plus size={14}/></button>
                                   </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center no-print">
                <div className="flex space-x-2">
                   {userPermissions.canAssign && <button onClick={() => setShowAddAsset(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 transition text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm"><Plus size={16} /> <span>{t('addAsset')}</span></button>}
                   <button onClick={()=>setActiveTab('stats')} className="bg-purple-600 hover:bg-purple-500 transition text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center space-x-1" title="Voir Stats"><PieChart size={16}/></button>
                </div>
                <div className="flex space-x-2">
                  <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} className={inputClass + " font-bold py-2"}>
                     <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">-- Tags --</option>
                     {Array.from(new Set(assets.flatMap(a=>a.tags||[]))).map(t => <option key={t} value={t} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{t}</option>)}
                  </select>
                </div>
              </div>
              
              {assets.length === 0 && (
                <div className={`p-10 text-center text-slate-500 italic border border-dashed rounded-xl ${theme==='dark'?'border-slate-700 bg-slate-900/50':'border-slate-300 bg-slate-50'}`}>
                   <Box size={48} className="mx-auto mb-4 opacity-30" />
                   Aucun asset trouvé ou créé. {userPermissions.canAssign && 'Cliquez sur "Ajouter Asset" pour commencer.'}
                </div>
              )}

              {sortedCats.map(cat => (
                <div key={cat} className="space-y-4">
                  <h3 className={`font-black text-lg border-b pb-2 ${theme==='dark'?'text-slate-300 border-slate-800':'text-slate-700 border-slate-200'}`}>{cat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {groupedAssets[cat].filter(a => filterTag ? (a.tags||[]).includes(filterTag) : true).map(a => {
                      const assignees = getAssignees(a, 'Global');
                      const canUpload = userPermissions.canEdit && (assignees.includes(user.uid) || userPermissions.canAssign);
                      const versions = Array.isArray(a.previews) ? a.previews : [];
                      const activeIdx = selectedVersions[`asset_${a.id}`] ?? (versions.length > 0 ? versions.length - 1 : -1);
                      const activePreview = activeIdx >= 0 ? versions[activeIdx] : null;

                      return (
                      <div key={a.id} className={`border rounded-xl overflow-hidden flex flex-col relative shadow-sm transition group/asset ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                        {userPermissions.canAssign && <button onClick={() => openModal("Supprimer", "Détruire cet asset ?", async()=>{await deleteDoc(doc(db, 'assets', a.id)); closeModal()})} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded text-white hover:text-red-500 z-10 opacity-0 group-hover/asset:opacity-100 transition no-print"><Trash2 size={14}/></button>}
                        {activePreview && activePreview.files?.length > 0 ? (
                          <div className="relative w-full h-40 bg-black overflow-hidden flex overflow-x-auto snap-x no-print">
                            {activePreview.files.map((file, i) => (
                               <div key={i} className="relative shrink-0 snap-center w-full h-full cursor-pointer group/preview" onClick={() => openReview(a, 'Global', activePreview.version, {url: file.url, type: 'image', fileIndex: i}, 'assets')}>
                                 <img src={getThumbnail(file)} className="w-full h-full object-cover opacity-80 group-hover/preview:opacity-100 transition" />
                                 <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover/preview:bg-blue-600/20 transition"><MonitorPlay size={18} className="text-white opacity-0 group-hover/preview:opacity-100 drop-shadow-md transform scale-75 group-hover/preview:scale-100 transition-all" /></div>
                                 {a.annotations?.Global?.[`v${activePreview.version}`]?.[`image_${i}`] && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow"></div>}
                               </div>
                            ))}
                            <div className="absolute bottom-1 right-1 bg-black/70 text-xs font-bold px-1.5 rounded text-white pointer-events-none shadow">{activePreview.files.length} img</div>
                          </div>
                        ) : (
                          <label className={`w-full h-40 flex flex-col items-center justify-center cursor-pointer transition no-print font-bold ${theme==='dark'?'bg-slate-950 hover:bg-slate-900 text-slate-600':'bg-slate-100 hover:bg-slate-200 text-slate-400'}`}>
                            <Upload size={24} className="mb-2"/> <span className="text-xs">Upload V1 (Multiple)</span><input disabled={!canUpload} type="file" multiple accept="image/*" className="hidden" onChange={(e)=>uploadAssetPreviews(a.id, e.target.files, versions)}/>
                          </label>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="font-black text-base truncate pr-2">{a.name}</div>
                            {userPermissions.canAssign ? (
                               <select value={a.priority || 'Normal'} onChange={e => changePriority(a.id, e.target.value, 'assets')} className={`text-[10px] p-0 outline-none bg-transparent cursor-pointer no-print ${theme==='dark'?'text-slate-400':'text-slate-500'}`}>
                                  <option value="Urgent" className="bg-slate-50 dark:bg-slate-900">🔴</option><option value="Normal" className="bg-slate-50 dark:bg-slate-900">🟡</option><option value="Low" className="bg-slate-50 dark:bg-slate-900">🟢</option>
                               </select>
                             ) : <span className="text-[10px]">{a.priority==='Urgent'?'🔴':a.priority==='Low'?'🟢':'🟡'}</span>}
                          </div>
                          
                          <div className="flex justify-between items-center no-print">
                            {userPermissions.canAssign ? <select className={`${inputClass} !p-1 !text-xs w-full font-bold`} value={a.category || ''} onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { category: e.target.value })}>{ASSET_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-50 dark:bg-slate-900">{c}</option>)}</select> : <div className="text-xs text-slate-500 font-bold">{a.category}</div>}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 pt-1 no-print">
                            {assignees.map(uid => (<span key={uid} onClick={() => userPermissions.canAssign && removeAssignee('assets', a.id, 'Global', uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold shadow-sm transition-colors ${userPermissions.canAssign ? 'cursor-pointer bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-red-100 hover:text-red-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>{members.find(m => m.userId === uid)?.displayName || uid} {userPermissions.canAssign && <X size={10} className="ml-1"/>}</span>))}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 no-print">
                             {(a.tags || []).map(tag => (
                                <span key={tag} className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded flex items-center font-bold">
                                   {tag} {userPermissions.canAssign && <X size={8} className="ml-1 cursor-pointer hover:text-red-500" onClick={()=>removeTag(a.id, 'assets', a.tags, tag)}/>}
                                </span>
                             ))}
                             {userPermissions.canAssign && <button onClick={()=>addTag(a.id, 'assets', a.tags||[])} className="text-[9px] border border-dashed border-slate-400 text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center font-bold"><Plus size={8} className="mr-0.5"/> Tag</button>}
                          </div>
                          
                          {userPermissions.canAssign && (<select className={`${inputClass} !p-1 !text-xs no-print`} value="" onChange={(e) => { if(e.target.value) addAssignee('assets', a.id, 'Global', e.target.value) }}><option value="" className="bg-slate-50 dark:bg-slate-900">+ Assigner</option>{members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId} className="bg-slate-50 dark:bg-slate-900">{m.displayName}</option>)}</select>)}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'schedule' && renderSchedule()}
          {activeTab === 'breakdown' && renderBreakdown()}

          {activeTab === 'time' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-5xl mx-auto mt-6 no-print">
              <div className={`border p-8 rounded-2xl space-y-8 shadow-xl flex flex-col justify-center ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h3 className="font-black text-xl text-center">Chronomètre en Direct</h3>
                <div className="space-y-4">
                  <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className={inputClass} disabled={isTimerActive}>
                    <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Sélectionner Plan/Asset</option>
                    {[...shots, ...assets].map(tk => <option key={tk.id} value={tk.id} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{tk.name}</option>)}
                  </select>
                  <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)} className={inputClass} disabled={isTimerActive}>
                    <option value="" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Étape de production</option>
                    {workspace?.pipeline?.map(step => <option key={step} value={step} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">{step}</option>)}
                  </select>
                </div>
                <div className="text-center">
                  <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest mb-8 text-blue-600 drop-shadow break-all">{formatTime(timer)}</div>
                  <div className="flex justify-center">
                    {!isTimerActive ? (<button onClick={() => { if(!selectedTask || !selectedStep) return openModal("Erreur", "Sélectionnez tâche et étape."); setIsTimerActive(true); }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105"><Play size={20} fill="currentColor"/> <span>Démarrer</span></button>) : (<button onClick={handleStopTimer} className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition"><Pause size={20} fill="currentColor"/> <span>Stop & Sauver</span></button>)}
                  </div>
                </div>
              </div>

              <div className={`border p-8 rounded-2xl space-y-6 shadow-xl flex flex-col justify-center ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <div>
                  <h3 className="font-black text-xl mb-4">{t('manualTime')}</h3>
                  <form onSubmit={handleAddManualTime} className="space-y-4">
                    <div className="flex space-x-4"><div className="flex-1"><label className="text-xs font-bold text-slate-500">Heures</label><input type="number" min="0" value={manualTime.h} onChange={e=>setManualTime({...manualTime, h: e.target.value})} className={inputClass}/></div><div className="flex-1"><label className="text-xs font-bold text-slate-500">Minutes</label><input type="number" min="0" max="59" value={manualTime.m} onChange={e=>setManualTime({...manualTime, m: e.target.value})} className={inputClass}/></div></div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-xl transition shadow-sm">Ajouter au log</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex justify-between items-center no-print">
                <h2 className="text-xl font-bold text-slate-500">Statistiques</h2>
                <button onClick={exportPDFReport} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition"><Printer size={16}/> <span>{t('report')}</span></button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`border rounded-xl p-4 text-center shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}><div className="text-3xl font-black text-slate-400">{myStats.todo}</div><div className="text-xs font-bold text-slate-500 uppercase">To Do</div></div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-blue-600">{myStats.wip}</div><div className="text-xs font-bold text-blue-700 dark:text-blue-500 uppercase">WIP</div></div>
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-purple-600 dark:text-purple-500">{myStats.review}</div><div className="text-xs font-bold text-purple-700 dark:text-purple-500 uppercase">Review</div></div>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-green-600 dark:text-green-500">{myStats.done}</div><div className="text-xs font-bold text-green-700 dark:text-green-500 uppercase">Done</div></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border rounded-xl p-6 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                  <h3 className="font-black text-xl mb-4 text-blue-600">Progression Globale du Projet</h3>
                  {(() => {
                    let totalTasks = 0; let doneTasks = 0;
                    shots.forEach(s => workspace?.pipeline?.forEach(step => { totalTasks++; if(s.status?.[step]==='done') doneTasks++; }));
                    const pct = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
                    return (
                      <div>
                        <div className="flex justify-between mb-1 text-sm font-bold"><span className="text-slate-600 dark:text-slate-400">{doneTasks} / {totalTasks} Tâches Terminées</span> <span className="text-blue-600">{pct}%</span></div>
                        <div className={`w-full h-4 rounded-full overflow-hidden ${theme==='dark'?'bg-slate-950':'bg-slate-200 border border-slate-300'}`}>
                          <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className={`border rounded-xl p-6 shadow-sm flex items-center justify-between ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                   <h3 className="font-black text-xl mb-4 text-blue-600">Répartition</h3>
                   {(() => {
                      let counts = { todo: 0, wip: 0, review: 0, retake: 0, reuse: 0, done: 0 };
                      let totalTasks = 0;
                      shots.forEach(s => workspace?.pipeline?.forEach(step => {
                        const st = s.status?.[step] || 'todo';
                        if (counts[st] !== undefined) counts[st]++;
                        totalTasks++;
                      }));
                      if(totalTasks === 0) return <span className="text-slate-500 text-sm">Vide</span>;
                      
                      const todoPct = (counts.todo/totalTasks)*100;
                      const wipPct = todoPct + (counts.wip/totalTasks)*100;
                      const revPct = wipPct + (counts.review/totalTasks)*100;
                      const retPct = revPct + (counts.retake/totalTasks)*100;
                      const reuPct = retPct + (counts.reuse/totalTasks)*100;
                      
                      return (
                        <div className="w-24 h-24 rounded-full" style={{
                           background: `conic-gradient(
                             #cbd5e1 0% ${todoPct}%, 
                             #93c5fd ${todoPct}% ${wipPct}%, 
                             #c084fc ${wipPct}% ${revPct}%, 
                             #f43f5e ${revPct}% ${retPct}%, 
                             #fdba74 ${retPct}% ${reuPct}%, 
                             #86efac ${reuPct}% 100%)`
                        }}></div>
                      );
                   })()}
                </div>
              </div>

              <div className={`border rounded-xl p-6 shadow-sm no-print ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h3 className="font-black text-xl mb-6 flex items-center text-blue-600"><BarChart className="mr-3"/> Logs Récents</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead><tr className={`border-b text-xs uppercase ${theme==='dark'?'border-slate-800 bg-slate-950 text-slate-500':'border-slate-200 bg-slate-100 text-slate-500'}`}>{userPermissions.canAssign && <th className="p-3 font-bold">Membre</th>}<th className="p-3 font-bold">Tâche</th><th className="p-3 font-bold">Étape</th><th className="p-3 font-bold">Temps</th></tr></thead>
                    <tbody className={`divide-y ${theme==='dark'?'divide-slate-800/50':'divide-slate-200'}`}>
                      {timeLogs.filter(log => userPermissions.canAssign || log.userId === user.uid).sort((a,b) => b.date - a.date).slice(0,20).map(log => (
                        <tr key={log.id} className={`hover:bg-slate-100 dark:hover:bg-slate-800/20 transition-colors`}>{userPermissions.canAssign && <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{log.userName}</td>}<td className="p-3 font-medium">{log.taskName}</td><td className="p-3 text-slate-500 font-bold">{log.step}</td><td className="p-3 text-blue-600 font-mono font-bold">{formatTime(log.durationSeconds)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historyLog' && (
            <div className={`border rounded-xl p-6 max-w-4xl mx-auto shadow-sm no-print ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
               <h3 className="font-black text-xl mb-6 flex items-center text-blue-600"><History className="mr-3"/> {t('historyLog')}</h3>
               <div className="space-y-3">
                 {globalHistory.length === 0 && <p className="text-slate-500 italic text-sm">Aucun historique enregistré pour le moment.</p>}
                 {globalHistory.map(log => (
                    <div key={log.id} className={`p-3 rounded-lg border flex justify-between items-center text-sm shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
                      <span className="font-bold">{log.text}</span>
                      <span className="text-xs text-slate-400 font-mono">{log.date ? new Date(log.date.toDate()).toLocaleString() : ''}</span>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className={`border rounded-xl p-6 max-w-4xl mx-auto shadow-sm no-print ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
              <h3 className="font-black text-xl mb-6 text-blue-600">Membres ({members.length})</h3>
              <div className="space-y-4">
                {members.map(m => (
                  <div key={m.id} className={`flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 p-4 rounded-xl border shadow-sm transition-colors ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80" onClick={()=>setViewProfileId(m.userId)}>
                       <UserCircle size={32} className="text-slate-400 shrink-0"/>
                       <div>
                          <div className="font-black text-base flex items-center space-x-2 hover:underline"><span>{m.displayName}</span> {onlineUsers[m.userId] && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow" title="En ligne"></div>}</div>
                          <div className="text-xs text-slate-500 font-mono font-bold">{m.email}</div>
                       </div>
                    </div>
                    {userPermissions.role === 'Admin' && m.userId !== user.uid ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                         <div className="flex flex-col space-y-1">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Leads (Étapes)</span>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                               {workspace?.pipeline?.map(step => (
                                 <label key={step} className="flex items-center space-x-1 text-[10px] cursor-pointer">
                                   <input type="checkbox" checked={m.leads?.includes(step) || false} onChange={e => {
                                      let newLeads = m.leads || [];
                                      if (e.target.checked) newLeads.push(step);
                                      else newLeads = newLeads.filter(l => l !== step);
                                      updateDoc(doc(db, 'projectMembers', m.id), { leads: newLeads });
                                   }} className="accent-blue-600"/>
                                   <span>{step}</span>
                                 </label>
                               ))}
                            </div>
                         </div>
                         {m.role === 'Custom' && (
                            <div className="flex flex-col lg:flex-row items-center space-y-1 lg:space-y-0 lg:space-x-3 text-xs bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
                               <label className="flex items-center space-x-1 cursor-pointer font-bold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={m.canEdit} onChange={e=>updateDoc(doc(db, 'projectMembers', m.id), { canEdit: e.target.checked })} className="accent-blue-600"/><span>Édition</span></label>
                               <label className="flex items-center space-x-1 cursor-pointer font-bold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={m.canAssign} onChange={e=>updateDoc(doc(db, 'projectMembers', m.id), { canAssign: e.target.checked })} className="accent-blue-600"/><span>Assigner/Valider</span></label>
                            </div>
                         )}
                         <select className={`${inputClass} !p-2 !w-auto !text-sm !font-black !text-blue-600`} value={m.role} onChange={async (e) => await updateDoc(doc(db, 'projectMembers', m.id), { role: e.target.value, canEdit: false, canAssign: false })}>
                           <option value="Guest" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Guest (Lecture seule)</option>
                           <option value="Artist" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Artist</option>
                           <option value="Supervisor" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Supervisor</option>
                           <option value="Admin" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Admin</option>
                           <option value="Custom" className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Custom (Personnalisé)</option>
                         </select>
                      </div>
                    ) : (
                      <div className="text-right">
                         <span className="text-sm text-blue-700 font-black px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-center shadow-sm">{m.role}</span>
                         {m.leads?.length > 0 && <div className="text-[10px] text-purple-500 mt-1">Lead: {m.leads.join(', ')}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className={`border rounded-xl p-8 max-w-4xl mx-auto shadow-sm space-y-6 ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
              <h3 className="font-black text-2xl text-blue-600">Aide & Documentation Technique</h3>
              <p className="text-sm text-slate-500">Retrouvez ci-dessous toutes les informations techniques, raccourcis et spécifications de l'écosystème Fabrica Tracker.</p>
              
              <div className="space-y-4 text-sm">
                
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800">
                  <h4 className="font-bold text-base mb-2 flex items-center text-blue-600"><Upload size={16} className="mr-2"/> {t('cloudGuideTitle')}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-bold">Sans cette configuration, vous ne pourrez pas uploader d'images ou de vidéos.</p>
                  <ul className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <li>{t('cloudGuide1')}</li>
                    <li>{t('cloudGuide2')}</li>
                    <li>{t('cloudGuide3')}</li>
                    <li>{t('cloudGuide4')}</li>
                    <li>{t('cloudGuide5')}</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-base mb-2 flex items-center"><ShieldAlert size={16} className="mr-2"/> Rôles, Leads & Permissions</h4>
                  <ul className="list-disc list-inside space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li><strong>Admin & Supervisor :</strong> Accès total (création, assignation, suppression). Les Admins peuvent gérer les paramètres Cloudinary et la suppression du projet.</li>
                    <li><strong>Leads :</strong> Un rôle hybride applicable à n'importe quel membre via l'onglet <em>Équipe</em>. Si un membre est coché comme Lead sur l'étape <em>Compositing</em>, il verra les plans en <em>Review</em> remonter tout en haut de <em>Mes Tâches</em>.</li>
                    <li><strong>Artist :</strong> Peut s'assigner des tâches, changer son statut, et uploader des fichiers.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-base mb-2 flex items-center"><Edit3 size={16} className="mr-2"/> Raccourcis & Commandes du Lecteur Vidéo</h4>
                  <ul className="list-disc list-inside text-xs space-y-2 text-slate-600 dark:text-slate-400">
                    <li><strong>Espace / Play :</strong> Lecture / Pause de la vidéo.</li>
                    <li><strong>Image par image :</strong> Cliquez sur les boutons pour reculer ou avancer d'exactement 1 frame (calculé en 25 fps).</li>
                    <li><strong>Outils Retake (Annotations) :</strong> 
                       <ul className="ml-6 mt-1 list-circle">
                         <li><strong>Pinceau :</strong> Dessinez par-dessus. Slider pour régler la taille.</li>
                         <li><strong>Gomme :</strong> Permet d'effacer précisément ce que vous venez de dessiner au pinceau, fonctionne avec le même slider de taille.</li>
                         <li><strong>Texte :</strong> Cliquez pour écrire, `Entrée` pour valider.</li>
                       </ul>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-base mb-2 flex items-center"><UserCheck size={16} className="mr-2"/> Absence</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Pour notifier l'équipe de vos congés ou de votre absence, rendez-vous sur votre profil (en cliquant sur votre nom en haut à droite) et activez le mode Absence. L'icône 🏖️ sera affichée partout.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && userPermissions.role === 'Admin' && (
            <div className="space-y-6 max-w-3xl mx-auto pb-10 no-print">
              <div className={`p-6 rounded-xl border space-y-6 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h3 className="font-black text-xl text-blue-600">Configuration Cloudinary</h3>
                <p className="text-sm text-slate-500 font-medium">Pour pouvoir uploader des images et des vidéos dans le tracker, vous devez configurer gratuitement une API Cloudinary et lier les clés ici.</p>
                <div className="space-y-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div><label className="text-xs font-bold text-slate-500">Cloud Name</label><input type="text" placeholder="ex: dp6xxxx" value={cloudNameInput} onChange={e=>setCloudNameInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">Upload Preset (unsigned)</label><input type="text" placeholder="ex: fabrica_preset" value={uploadPresetInput} onChange={e=>setUploadPresetInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">API Key (Pour la suppression)</label><input type="text" placeholder="Clé publique" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">API Secret (Pour la suppression)</label><input type="password" placeholder="Clé secrète" value={apiSecretInput} onChange={e=>setApiSecretInput(e.target.value)} className={inputClass} /></div>
                  <button onClick={() => updateDoc(doc(db, 'workspaces', workspace.id), { cloudinaryCloudName: cloudNameInput, cloudinaryUploadPreset: uploadPresetInput, cloudinaryApiKey: apiKeyInput, cloudinaryApiSecret: apiSecretInput }).then(()=>openModal('Succès', 'Configuration Cloudinary sauvegardée !'))} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition w-full sm:w-auto">Sauvegarder les clés</button>
                </div>
              </div>

              <div className={`p-6 rounded-xl border space-y-6 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':lightCardClass}`}>
                <h3 className="font-black text-xl text-blue-600">Bannière du Projet</h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Uploader une nouvelle image</label>
                  <input type="file" accept="image/*" onChange={async (e) => {
                     const file = e.target.files[0];
                     if(file) {
                        const url = await uploadBannerFileToCloud(file);
                        if(url) setWorkspace({...workspace, bannerUrl: url});
                     }
                  }} className={`text-sm ${inputClass} !py-1.5`} />
                  {workspace?.bannerUrl && <img src={workspace.bannerUrl} className="mt-4 h-24 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm"/>}
                </div>
                <button onClick={() => updateDoc(doc(db, 'workspaces', workspace.id), { bannerUrl: workspace.bannerUrl || '' }).then(()=>openModal('Succès', 'Bannière mise à jour !'))} className="bg-blue-600 hover:bg-blue-500 transition text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md">Mettre à jour la bannière</button>
              </div>

              <div className={`p-6 rounded-xl border border-red-500/30 space-y-4 ${theme==='dark'?'bg-slate-900':'bg-slate-50'}`}>
                <h3 className="font-black text-xl text-red-500">Supprimer le projet</h3>
                <p className="text-xs text-slate-500">La suppression d'un projet est définitive et effacera toutes les données associées.</p>
                {deleteStepConfirm !== workspace.id ? (
                  <button onClick={() => setDeleteStepConfirm(workspace.id)} className="bg-red-600 hover:bg-red-500 transition text-white px-4 py-2 rounded-lg font-bold text-sm">Supprimer le projet</button>
                ) : (
                  <div className="space-y-3 p-4 border border-red-500 rounded-lg bg-red-500/10">
                    <p className="text-xs font-bold text-red-500">Êtes-vous absolument sûr ? Cette action est irréversible.</p>
                    <div className="flex space-x-3">
                      <button onClick={() => setDeleteStepConfirm('')} className="bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold transition hover:bg-slate-600">Annuler</button>
                      <button onClick={async () => {
                        await deleteDoc(doc(db, 'workspaces', workspace.id));
                        setCurrentView('dashboard');
                        closeModal();
                      }} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold transition hover:bg-red-500">Confirmer la suppression</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
        
        {reviewItem && reviewPreview && (
          <>
            <div className={`w-1.5 md:w-2 cursor-col-resize shrink-0 transition-colors z-30 no-print ${isResizing ? 'bg-blue-500' : (theme==='dark'?'bg-slate-700 hover:bg-slate-600':'bg-slate-300 hover:bg-slate-400')}`} onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}><div className="h-full flex items-center justify-center opacity-50"><GripVertical size={16} /></div></div>
            <aside style={{ width: reviewPanelWidth }} className={`flex flex-col border-l shadow-2xl z-20 shrink-0 no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-50 border-slate-300'}`}>
              <div className={`flex-1 flex flex-col min-h-[40%] border-b ${theme==='dark'?'border-slate-800':'border-slate-300'}`}>
                <div className={`flex flex-wrap justify-between items-center p-3 shrink-0 ${theme==='dark'?'bg-slate-950/50':'bg-slate-100 shadow-sm'}`}>
                  <div>
                    <div className="flex items-center space-x-2"><h3 className="font-black text-lg truncate max-w-[200px]">{reviewItem.name}</h3>{reviewStep !== 'Global' && <span className="text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{reviewStep}</span>}</div>
                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider"><span>V{reviewVersion}</span>{(reviewItem.previews?.[reviewStep]?.length > 1 || (reviewType==='assets' && reviewItem.previews?.length > 1)) && (<label className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"><input type="checkbox" checked={compareMode} onChange={e=>setCompareMode(e.target.checked)} className="mr-1 accent-blue-600"/>Comparer</label>)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end items-center mt-2 2xl:mt-0">
                    {compareMode && (<select value={compareVersion} onChange={e=>setCompareVersion(e.target.value)} className={`${inputClass} !w-auto !py-1 !text-xs font-bold`}><option value="">-- Comparer --</option>{(reviewType==='shots' ? reviewItem.previews[reviewStep] : reviewItem.previews).map((v, i) => v.version !== reviewVersion && <option key={i} value={i}>V{v.version}</option>)}</select>)}
                    {drawMode && (
                      <div className={`flex items-center border rounded-lg p-0.5 space-x-0.5 ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-white border-slate-300'}`}>
                        <button onClick={()=>setDrawMode('pen')} className={`p-1.5 rounded transition ${drawMode==='pen' ? 'bg-slate-200 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}><Edit3 size={14}/></button>
                        <button onClick={()=>setDrawMode('text')} className={`p-1.5 rounded transition ${drawMode==='text' ? 'bg-slate-200 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}><Type size={14}/></button>
                        <button onClick={()=>setDrawMode('eraser')} className={`p-1.5 rounded transition ${drawMode==='eraser' ? 'bg-slate-200 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}><Eraser size={14}/></button>
                        
                        <div className={`px-2 flex items-center border-l border-r space-x-1 ${theme==='dark'?'border-slate-800':'border-slate-300'}`}>
                          <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-16 h-1 cursor-pointer accent-blue-600" />
                        </div>
                        
                        <button onClick={() => setStrokes(strokes.slice(0, -1))} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition"><Undo size={14} /></button>
                        {strokes.length > 0 && <button onClick={deleteRetakeFromDB} className="p-1.5 text-red-500 hover:bg-red-100 dark:bg-red-900/50 rounded transition border-l border-slate-300 dark:border-slate-800 ml-0.5 pl-1.5"><Trash2 size={14} /></button>}
                      </div>
                    )}
                    <button onClick={saveAnnotations} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition shadow" title="Enregistrer le point rouge"><Save size={16} /></button>
                    <button onClick={() => setReviewItem(null)} className="ml-2 text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                  </div>
                </div>

                <div className="flex-1 relative bg-black flex flex-col md:flex-row shadow-inner overflow-hidden">
                  <div className="relative flex-1 w-full h-full flex items-center justify-center border-r border-slate-800 min-h-0 bg-slate-900 overflow-hidden">
                    {reviewPreview.type === 'video' ? (<video ref={videoRef} src={reviewPreview.url} className="max-w-full max-h-full object-contain pointer-events-none" onTimeUpdate={(e) => setVideoProgress(e.target.currentTime)} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />) : (<img src={reviewPreview.url} className="max-w-full max-h-full object-contain pointer-events-none" />)}
                    <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={endDraw} className={`absolute top-0 left-0 w-full h-full z-10 ${drawMode==='eraser'?'cursor-pointer':'cursor-crosshair'}`} width={1920} height={1080} style={{ objectFit: 'contain' }} />
                    {textInputPos && (<input type="text" autoFocus value={textInputValue} onChange={e=>setTextInputValue(e.target.value)} onBlur={commitTextAnnotation} onKeyDown={e=>{if(e.key==='Enter') commitTextAnnotation()}} className="absolute z-20 bg-transparent text-red-500 outline-none font-bold drop-shadow-md border border-red-500/50 p-1" style={{ left: `${textInputPos.x * 100}%`, top: `${textInputPos.y * 100}%`, fontSize: `${brushSize * 4}px` }} placeholder="Taper..." />)}
                    {reviewPreview.type !== 'video' && reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`]?.[getAnnotationKey()] && (<div className="absolute bottom-4 left-4 w-4 h-4 bg-red-600 rounded-full animate-pulse z-20 shadow-lg border-2 border-black"></div>)}
                  </div>
                  {compareMode && compareVersion !== '' && (
                    <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 min-h-0 border-l border-slate-800">
                      <div className="absolute top-2 right-2 z-20 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md">V{(reviewType==='shots' ? reviewItem.previews[reviewStep][compareVersion] : reviewItem.previews[compareVersion]).version}</div>
                      {(reviewType==='shots' ? reviewItem.previews[reviewStep][compareVersion] : reviewItem.previews[compareVersion]).type === 'video' ? (<video ref={compareVideoRef} src={(reviewType==='shots' ? reviewItem.previews[reviewStep][compareVersion] : reviewItem.previews[compareVersion]).url} className="max-w-full max-h-full object-contain" muted />) : (<img src={(reviewType==='shots' ? reviewItem.previews[reviewStep][compareVersion].url : reviewItem.previews[compareVersion].files[reviewPreview.fileIndex].url)} className="max-w-full max-h-full object-contain" />)}
                    </div>
                  )}
                </div>

                {reviewPreview.type === 'video' && (
                  <div className={`p-3 shrink-0 flex flex-col justify-center ${theme==='dark'?'bg-slate-950/50':'bg-slate-100 shadow-sm z-10'}`}>
                    
                    <div className="flex items-center space-x-2 mb-2 w-full max-w-full">
                       <div className={`relative flex-1 h-2.5 rounded-full cursor-pointer border overflow-hidden shadow-inner ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-200 border-slate-300'}`} onClick={(e) => { if(videoRef.current && videoDuration > 0) { const rect = e.currentTarget.getBoundingClientRect(); const time = ((e.clientX - rect.left) / rect.width) * videoDuration; videoRef.current.currentTime = time; if(compareVideoRef.current) compareVideoRef.current.currentTime = time; } }}>
                         <div className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-75" style={{ width: `${Math.min(100, Math.max(0, (videoProgress / (videoDuration||1)) * 100))}%` }}></div>
                         {Object.keys(reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`] || {}).map(frameTime => (
                           <div key={frameTime} className="absolute top-0 h-full w-2 bg-red-500 shadow-sm border-x border-black" style={{ left: `${(parseFloat(frameTime) / ((videoDuration||1)*FRAMERATE)) * 100}%` }}></div>
                         ))}
                       </div>
                       
                       <div className="text-[10px] text-slate-500 font-mono font-bold w-12 text-right">
                         {reviewItem.durationFrames ? `${reviewItem.durationFrames}f` : ''}
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold mb-3 px-1">
                      <span className="cursor-pointer hover:text-blue-600 transition" onClick={() => setShowSeconds(!showSeconds)} title="Cliquez pour changer (Frames / Secondes)">
                        {showSeconds ? formatTime(videoProgress) : `${Math.floor(videoProgress * FRAMERATE)} f`}
                      </span>
                      <span>
                        {showSeconds ? formatTime(videoDuration) : `${Math.floor(videoDuration * FRAMERATE)} f`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                       <div className="flex items-center space-x-2 w-24">
                          {videoVolume === 0 ? <VolumeX size={14} className="text-slate-400"/> : <Volume2 size={14} className="text-slate-400"/>}
                          <input type="range" min="0" max="1" step="0.1" value={videoVolume} onChange={handleVolumeChange} className="w-full h-1 accent-blue-600 cursor-pointer" />
                       </div>
                       <div className="flex justify-center items-center space-x-6 flex-1">
                         <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime -= (1/FRAMERATE);} } }} className="p-2 text-slate-500 hover:text-blue-600 rounded-full transition"><SkipBack size={20} /></button>
                         <button onClick={toggleVideoPlay} className="p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-md transform hover:scale-105">{isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor" className="ml-0.5" />}</button>
                         <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime += (1/FRAMERATE);} } }} className="p-2 text-slate-500 hover:text-blue-600 rounded-full transition"><SkipForward size={20} /></button>
                       </div>
                       <div className="w-24"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className={`flex border-b text-sm font-bold shadow-sm ${theme==='dark'?'border-slate-800 bg-slate-950/80':'border-slate-300 bg-slate-100'}`}>
                   <button onClick={()=>setReviewTab('chat')} className={`flex-1 p-3 flex items-center justify-center transition ${reviewTab==='chat'?'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900':'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><MessageSquare size={16} className="mr-2"/> Discussions</button>
                   <button onClick={()=>setReviewTab('history')} className={`flex-1 p-3 flex items-center justify-center transition ${reviewTab==='history'?'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900':'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><History size={16} className="mr-2"/> {t('history')}</button>
                </div>
                
                <div className={`flex-1 p-3 overflow-y-auto space-y-3 ${theme==='dark'?'bg-transparent':'bg-[#f8fafc]'}`}>
                  {reviewTab === 'chat' ? (
                     <>
                        {chatMessages.filter(m => m.type !== 'system').length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-4 font-bold">Aucun commentaire pour ce plan.</p> : null}
                        {chatMessages.filter(m => m.type !== 'system').map(msg => (
                           <div key={msg.id} className={`p-3 rounded-xl text-xs shadow-sm ${msg.author === userData.displayName ? 'bg-blue-600 text-white ml-6 rounded-tr-none' : (theme==='dark'?'bg-slate-800 text-slate-200 mr-6 rounded-tl-none':'bg-white border border-slate-200 text-slate-700 mr-6 rounded-tl-none')}`}>
                             <div className={`font-black text-[10px] mb-1 ${msg.author === userData.displayName ? 'text-blue-200' : 'text-slate-500'}`}>{msg.author}</div><p className="whitespace-pre-wrap">{msg.text}</p>
                             <div className={`text-[9px] text-right mt-1.5 opacity-70 font-bold`}>{new Date(msg.date?.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           </div>
                        ))}
                     </>
                  ) : (
                     <>
                        {chatMessages.filter(m => m.type === 'system').length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-4 font-bold">Historique vierge.</p> : null}
                        {chatMessages.filter(m => m.type === 'system').map(msg => (
                           <div key={msg.id} className={`text-[11px] p-2.5 rounded-lg border-l-4 font-medium shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-700 text-slate-400':'bg-white border-slate-300 text-slate-600'}`}>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{msg.author}</span> {msg.text.charAt(0).toLowerCase() + msg.text.slice(1)}
                              <div className="opacity-50 text-[9px] mt-1.5 font-bold">{new Date(msg.date?.toDate()).toLocaleString()}</div>
                           </div>
                        ))}
                     </>
                  )}
                </div>
                
                {reviewTab === 'chat' && (
                   <form onSubmit={postComment} className={`p-3 border-t flex space-x-2 shrink-0 ${theme==='dark'?'border-slate-800 bg-slate-950/80':'border-slate-300 bg-white shadow-inner'}`}>
                     <input type="text" value={newChatMsg} onChange={e=>setNewChatMsg(e.target.value)} placeholder="Ajouter un commentaire..." className={inputClass} />
                     <button type="submit" className="bg-blue-600 hover:bg-blue-500 transition text-white p-3 rounded-lg shadow-sm"><Plus size={18}/></button>
                   </form>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
