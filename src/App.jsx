import React, { useState, useEffect, useRef } from 'react';
import { 
  initializeAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, deleteField, orderBy 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { 
  Film, Box, Settings, Plus, Play, Pause, Trash2, LogOut, 
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, FolderKanban, BarChart, ChevronLeft, UserCircle, Save, Key, Eraser, Undo, X, Bell, Download, Clapperboard, AlertTriangle, MessageSquare, Type, CheckSquare, Search, HelpCircle, Moon, Sun, Edit3, UserPlus, Image as ImageIcon, MessageCircle, GripVertical, ArrowUp, ArrowDown, Tag, ListTodo, Printer, History, Gamepad2, FileSpreadsheet, FileText
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
const ASSET_CATEGORIES = ['Model Design', 'Props Design', 'Storyboard', 'Background Concept'];
const FRAMERATE = 24;

const generateCloudinarySignature = async (publicId, timestamp, apiSecret) => {
  const msg = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const dict = {
  fr: {
    projects: "Mes Projets", friends: "Mes Amis", myTasks: "Mes Tâches", assets: "Assets", shots: "Plans", time: "Chrono", stats: "Stats", team: "Équipe", settings: "Paramètres", help: "Aide",
    ok: "Ok", cancel: "Annuler", batchAction: "Multi-action", manualTime: "Saisie manuelle", join: "Rejoindre", addFriend: "Ajouter Ami", friendId: "ID Ami", myId: "Mon ID", sharedProj: "projet(s) partagé(s)",
    createProj: "Créer un projet", joinProj: "Rejoindre", projName: "Nom", joinCode: "Code", searchShot: "Rechercher...", allStatus: "Tous statuts", allMembers: "Toute l'équipe", addShot: "Ajouter Plan",
    addAsset: "Ajouter Asset", assetName: "Nom de l'asset", category: "Catégorie", priority: "Priorité", tags: "Tags", history: "Historique", report: "Rapport PDF",
    todo: "À faire", wip: "En cours", reviewStatus: "En validation", reuse: "Réutiliser", done: "Terminé", upload: "Upload", wait: "En attente"
  },
  en: {
    projects: "My Projects", friends: "My Friends", myTasks: "My Tasks", assets: "Assets", shots: "Shots", time: "Time Tracker", stats: "Stats", team: "Team", settings: "Settings", help: "Help",
    ok: "Ok", cancel: "Cancel", batchAction: "Batch Action", manualTime: "Manual Entry", join: "Join", addFriend: "Add Friend", friendId: "Friend ID", myId: "My ID", sharedProj: "shared project(s)",
    createProj: "Create Project", joinProj: "Join Project", projName: "Name", joinCode: "Code", searchShot: "Search...", allStatus: "All Status", allMembers: "All Team", addShot: "Add Shot",
    addAsset: "Add Asset", assetName: "Asset Name", category: "Category", priority: "Priority", tags: "Tags", history: "History", report: "PDF Report",
    todo: "To Do", wip: "WIP", reviewStatus: "Review", reuse: "Reuse", done: "Done", upload: "Upload", wait: "Waiting"
  }
};

// --- PING PONG GAME CORRIGÉ ET AMÉLIORÉ ---
const PingPongGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d');
     let afId;
     
     // Dimensions logiques
     const W = 300, H = 150;
     const paddleHeight = 30, paddleWidth = 4;
     let paddleY = H/2 - paddleHeight/2; 
     let aiY = H/2 - paddleHeight/2;
     
     // Balle
     let ball = { x: W/2, y: H/2, dx: 3, dy: 3, r: 4 };

     // Contrôle souris (clamp pour rester dans le canvas)
     const move = (e) => {
       const rect = canvas.getBoundingClientRect();
       let mouseY = e.clientY - rect.top;
       // On centre la raquette sur la souris
       paddleY = Math.max(0, Math.min(H - paddleHeight, mouseY - paddleHeight/2));
     };
     window.addEventListener('mousemove', move);

     const loop = () => {
       // Clear
       ctx.clearRect(0,0,W,H);
       
       // Update Balle
       ball.x += ball.dx; 
       ball.y += ball.dy;
       
       // Rebond haut/bas
       if(ball.y - ball.r < 0) { ball.y = ball.r; ball.dy *= -1; }
       if(ball.y + ball.r > H) { ball.y = H - ball.r; ball.dy *= -1; }
       
       // Collision Raquette Joueur (Gauche)
       if(ball.dx < 0 && ball.x - ball.r < 15 && ball.y > paddleY && ball.y < paddleY + paddleHeight) {
          ball.dx *= -1.05; // Accélère un peu
          ball.x = 15 + ball.r; // Repousse pour éviter de rester bloqué
       }
       
       // Collision Raquette IA (Droite)
       if(ball.dx > 0 && ball.x + ball.r > W - 15 && ball.y > aiY && ball.y < aiY + paddleHeight) {
          ball.dx *= -1.05;
          ball.x = W - 15 - ball.r;
       }

       // IA suit la balle avec inertie
       const aiSpeed = 0.08;
       let targetAiY = ball.y - paddleHeight/2;
       // Limite la vitesse max de l'IA
       let diff = (targetAiY - aiY) * aiSpeed;
       aiY += Math.max(-4, Math.min(4, diff)); // Vitesse max 4px/frame
       aiY = Math.max(0, Math.min(H - paddleHeight, aiY)); // Clamp

       // Score / Reset
       if(ball.x < 0 || ball.x > W) {
          ball.x = W/2; 
          ball.y = H/2; 
          ball.dx = (ball.dx > 0 ? -3 : 3); 
          ball.dy = (Math.random() > 0.5 ? 3 : -3);
       }

       // Dessin
       ctx.fillStyle = '#fff'; // Raquettes
       ctx.fillRect(10, paddleY, paddleWidth, paddleHeight);
       ctx.fillRect(W - 10 - paddleWidth, aiY, paddleWidth, paddleHeight);
       
       // Ligne centrale
       ctx.strokeStyle = '#334155'; // slate-700
       ctx.setLineDash([5, 5]);
       ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
       ctx.setLineDash([]);
       
       // Balle
       ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

       afId = requestAnimationFrame(loop);
     };
     
     loop();
     
     return () => { 
        cancelAnimationFrame(afId); 
        window.removeEventListener('mousemove', move); 
     }
  }, []);

  return (
     <div className="fixed bottom-24 left-6 bg-slate-900 p-3 rounded-xl shadow-2xl z-50 border border-slate-700 w-[316px]">
       <div className="flex justify-between text-white text-xs mb-2 font-bold px-1 items-center">
         <span className="flex items-center"><Gamepad2 size={14} className="mr-1"/> Ping Pong</span>
         <button onClick={onClose} className="text-red-400 hover:text-red-500 bg-slate-800 p-1 rounded"><X size={14}/></button>
       </div>
       <canvas 
          ref={canvasRef} 
          width={300} 
          height={150} 
          className="bg-slate-950 rounded cursor-none border border-slate-700 w-full h-auto block shadow-inner"
       />
       <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">Bougez la souris pour jouer</p>
     </div>
  );
}

export default function App() {
  const [lang, setLang] = useState('fr');
  const t = (key) => dict[lang][key] || key;
  const [theme, setTheme] = useState('dark');
  
  // Personnalisation des couleurs
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
  const [joinCode, setJoinCode] = useState('');
  
  const [profileName, setProfileName] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [browserNotifs, setBrowserNotifs] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [workspace, setWorkspace] = useState(null);
  const [userPermissions, setUserPermissions] = useState({ canEdit: false, canAssign: false, role: 'Guest' });
  const [shots, setShots] = useState([]);
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  
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
  
  const [drawMode, setDrawMode] = useState('pen'); 
  const [textInputPos, setTextInputPos] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
  
  const [brushSize, setBrushSize] = useState(3);
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

  // Profil Modal state
  const [viewProfileId, setViewProfileId] = useState(null);
  const [profileModalData, setProfileModalData] = useState(null);

  const [modal, setModal] = useState({ isOpen: false, title: '', msg: '', onConfirm: null });
  const openModal = (title, msg, onConfirm = null) => setModal({ isOpen: true, title, msg, onConfirm });
  const closeModal = () => setModal({ isOpen: false, title: '', msg: '', onConfirm: null });

  const inputClass = "w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 shadow-sm transition-all";

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
        if (myMem.role === 'Admin') setUserPermissions({ canEdit: true, canAssign: true, role: 'Admin' });
        else if (myMem.role === 'Supervisor') setUserPermissions({ canEdit: true, canAssign: true, role: 'Supervisor' });
        else if (myMem.role === 'Artist') setUserPermissions({ canEdit: true, canAssign: false, role: 'Artist' });
        else if (myMem.role === 'Custom') setUserPermissions({ canEdit: myMem.canEdit, canAssign: myMem.canAssign, role: 'Custom' });
        else setUserPermissions({ canEdit: false, canAssign: false, role: 'Guest' });
      }
    });
    const unsubLogs = onSnapshot(query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id)), (snap) => setTimeLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubWs = onSnapshot(doc(db, 'workspaces', workspace.id), (docSnap) => { if(docSnap.exists()) setWorkspace({id: docSnap.id, ...docSnap.data()}); });
    
    setCloudNameInput(workspace.cloudinaryCloudName || ''); setUploadPresetInput(workspace.cloudinaryUploadPreset || '');
    setApiKeyInput(workspace.cloudinaryApiKey || ''); setApiSecretInput(workspace.cloudinaryApiSecret || '');
    return () => { unsubShots(); unsubAssets(); unsubMembers(); unsubLogs(); unsubWs(); };
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
  const pendingReviews = shots.filter(s => workspace?.pipeline?.some(step => s.status?.[step] === 'review' && getAssignees(s, step).includes(user?.uid)));

  // --- CORRECTION DES VARIABLES MANQUANTES ---
  const myAssignedShots = shots.filter(s => workspace?.pipeline?.some(step => getAssignees(s, step).includes(user?.uid)));
  const myAssignedAssets = assets.filter(a => getAssignees(a, 'Global').includes(user?.uid));
  
  const filteredShots = shots.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.scene.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus ? workspace?.pipeline?.some(step => s.status?.[step] === filterStatus) : true;
    const matchAssignee = filterAssignee ? workspace?.pipeline?.some(step => getAssignees(s, step).includes(filterAssignee)) : true;
    return matchSearch && matchStatus && matchAssignee;
  });

  const myStats = {
    todo: 0, wip: 0, review: 0, done: 0
  };
  shots.forEach(s => {
    workspace?.pipeline?.forEach(step => {
      if (getAssignees(s, step).includes(user?.uid)) {
        const st = s.status?.[step] || 'todo';
        if (myStats[st] !== undefined) myStats[st]++;
      }
    });
  });
  // ------------------------------------------

  useEffect(() => {
    if (browserNotifs && pendingReviews.length > prevPendingReviews.current) {
      if (Notification.permission === 'granted') new Notification('Fabrica Tracker', { body: 'Vous avez de nouvelles validations en attente !' });
    }
    prevPendingReviews.current = pendingReviews.length;
  }, [pendingReviews.length, browserNotifs]);

  const requestBrowserNotifs = async (checked) => {
    if (checked) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotifs(true); await updateDoc(doc(db, 'users', user.uid), { browserNotifs: true });
        new Notification('Fabrica Tracker', { body: 'Notifications push activées avec succès !' });
      } else { openModal("Refusé", "Vous devez autoriser les notifications dans les paramètres de votre navigateur."); }
    } else { setBrowserNotifs(false); await updateDoc(doc(db, 'users', user.uid), { browserNotifs: false }); }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) { 
      if(isPlaying) { videoRef.current.pause(); compareVideoRef.current?.pause(); } 
      else { videoRef.current.play(); compareVideoRef.current?.play(); } 
    }
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
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        if(!authName) return openModal("Erreur", "Pseudo requis");
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, displayName: authName });
        setUserData({ id: res.user.uid, email: authEmail, displayName: authName });
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

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    const wsRef = await addDoc(collection(db, 'workspaces'), { name: newProjectName, type: newProjectType, pipeline: TEMPLATES[newProjectType] || TEMPLATES['2D'], createdAt: serverTimestamp() });
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsRef.id, workspaceName: newProjectName, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Admin' });
    setNewProjectName('');
  };

  const joinProject = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    const wsDoc = await getDoc(doc(db, 'workspaces', joinCode));
    if (!wsDoc.exists() || myProjects.find(p => p.workspaceId === joinCode)) return openModal("Erreur", "Code invalide ou déjà rejoint.");
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsDoc.id, workspaceName: wsDoc.data().name, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Guest', bannerUrl: wsDoc.data().bannerUrl || '' });
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
      await fetch(`https://api.cloudinary.com/v1_1/${workspace.cloudinaryCloudName}/${resourceType}/destroy`, { method: '
