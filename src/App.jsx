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
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, FolderKanban, BarChart, ChevronLeft, UserCircle, Save, Key, Eraser, Undo, X, Bell, Download, Clapperboard, AlertTriangle, MessageSquare, Type, CheckSquare, Search, HelpCircle, Moon, Sun, Edit3, UserPlus, Image as ImageIcon, MessageCircle, GripVertical, ArrowUp, ArrowDown, Tag, ListTodo, Printer, History
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

export default function App() {
  const [lang, setLang] = useState('fr');
  const t = (key) => dict[lang][key] || key;
  const [theme, setTheme] = useState('dark');
  
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const [showAddShot, setShowAddShot] = useState(false);
  const [addSeq, setAddSeq] = useState('SQ01');
  const [addScene, setAddScene] = useState('SC001');
  const [addName, setAddName] = useState('SH010');

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

  const [modal, setModal] = useState({ isOpen: false, title: '', msg: '', onConfirm: null });
  const openModal = (title, msg, onConfirm = null) => setModal({ isOpen: true, title, msg, onConfirm });
  const closeModal = () => setModal({ isOpen: false, title: '', msg: '', onConfirm: null });

  // Input Class corrigée pour s'adapter au clair/sombre sans texte invisible
  const inputClass = "w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 shadow-sm transition-all";

  // Gestion de la Présence (En Ligne)
  useEffect(() => {
    if (!user) return;
    const updatePresence = async () => {
      try { await updateDoc(doc(db, 'users', user.uid), { lastOnline: serverTimestamp() }); } catch(e){}
    };
    updatePresence();
    const interval = setInterval(updatePresence, 60000); // Mise à jour chaque minute
    
    // Écoute de l'activité globale pour l'indicateur "En Ligne"
    const unsubOnline = onSnapshot(collection(db, 'users'), (snap) => {
      const now = Date.now();
      const onlineStatus = {};
      snap.forEach(d => {
        const data = d.data();
        if(data.lastOnline) {
          const diff = now - data.lastOnline.toMillis();
          if(diff < 120000) onlineStatus[d.id] = true; // Actif dans les 2 dernières minutes
        }
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
    if (!reviewItem) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); toggleVideoPlay(); }
      if (e.code === 'ArrowLeft' && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime -= (1/FRAMERATE);} }
      if (e.code === 'ArrowRight' && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime += (1/FRAMERATE);} }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); setStrokes(prev => prev.slice(0, -1)); }
      
      const statusMap = {'1':'todo', '2':'wip', '3':'review', '4':'reuse', '5':'done'};
      if (statusMap[e.key] && reviewType === 'shots') { changeStatus(reviewItem, reviewStep, statusMap[e.key], 'shots'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewItem, isPlaying, reviewStep]);

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
    try { await sendPasswordResetEmail(auth, authEmail); openModal("Succès", "E-mail de réinitialisation envoyé !"); } 
    catch(err) { openModal("Erreur", err.message); }
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user.email) {
      return openModal("Erreur", "L'email ne correspond pas.");
    }
    try { 
      await deleteDoc(doc(db, 'users', user.uid)); 
      await user.delete(); 
    } 
    catch (err) { openModal("Erreur de sécurité", "Veuillez vous déconnecter puis vous reconnecter avant de supprimer votre compte."); }
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

  const addFriend = async (e) => {
    e.preventDefault();
    if(!friendInput || friendInput === user.uid) return openModal("Erreur", "ID Invalide");
    if(friendsList.find(f => f.id === friendInput)) return openModal("Erreur", "Vous êtes déjà ami avec cette personne.");
    try {
      const friendDoc = await getDoc(doc(db, 'users', friendInput));
      if(!friendDoc.exists()) return openModal("Erreur", "Utilisateur introuvable");
      const friendData = friendDoc.data();
      await addDoc(collection(db, 'friendships'), {
        users: [user.uid, friendInput], names: { [user.uid]: userData.displayName, [friendInput]: friendData.displayName }, createdAt: serverTimestamp()
      });
      setFriendInput(''); openModal("Succès", "Ami ajouté !");
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

  const uploadBanner = async (e) => {
    const file = e.target.files[0]; if(!file || !workspace) return;
    setUploadingMedia(true);
    try {
      const uploaded = await uploadMediaToCloud(file, "c_fill,w_1200,h_300");
      if(uploaded?.url) {
        await updateDoc(doc(db, 'workspaces', workspace.id), { bannerUrl: uploaded.url });
        setWorkspace({...workspace, bannerUrl: uploaded.url});
        const snap = await getDocs(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id)));
        snap.forEach(d => updateDoc(d.ref, { bannerUrl: uploaded.url }));
      }
    } catch(err) { openModal("Erreur", err.message); }
    setUploadingMedia(false);
  };

  const removeBanner = async () => {
    if(!workspace) return;
    await updateDoc(doc(db, 'workspaces', workspace.id), { bannerUrl: deleteField() });
    const newWs = {...workspace}; delete newWs.bannerUrl; setWorkspace(newWs);
    const snap = await getDocs(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id)));
    snap.forEach(d => updateDoc(d.ref, { bannerUrl: deleteField() }));
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
    } catch(err) { console.error("Cloudinary Delete Error:", err); }
  };

  const deleteProject = async () => {
    const conf = window.prompt(`Tapez "${workspace?.name}" pour confirmer la suppression (IRREVERSIBLE) :`);
    if (conf === workspace?.name) {
      setUploadingMedia(true);
      for (const s of shots) { if(s.previews) { for (const step in s.previews) { for (const v of s.previews[step]) { if(v.url) await deleteMediaFromCloudinary(v.url); } } } }
      for (const a of assets) { if(a.previews) { for (const v of a.previews) { if(v.files) { for (const f of v.files) { if(f.url) await deleteMediaFromCloudinary(f.url); } } } } }
      const snapMembers = await getDocs(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id))); snapMembers.forEach(d => deleteDoc(d.ref));
      const snapShots = await getDocs(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id))); snapShots.forEach(d => deleteDoc(d.ref));
      const snapAssets = await getDocs(query(collection(db, 'assets'), where('workspaceId', '==', workspace.id))); snapAssets.forEach(d => deleteDoc(d.ref));
      const snapLogs = await getDocs(query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id))); snapLogs.forEach(d => deleteDoc(d.ref));
      
      await deleteDoc(doc(db, 'workspaces', workspace.id));
      setUploadingMedia(false); setCurrentView('dashboard');
    }
  };

  const handleAddShot = async (e) => {
    e.preventDefault();
    if (!/^SQ\d{2,}$/.test(addSeq)) return openModal("Format invalide", "Séquence: SQ + 2 chiffres (SQ01).");
    if (!/^SC\d{3,}$/.test(addScene)) return openModal("Format invalide", "Scène: SC + 3 chiffres (SC001).");
    await addDoc(collection(db, 'shots'), { sequence: addSeq, scene: addScene, name: addName, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {}, priority: 'Normal', tags: [] });
    setShowAddShot(false);
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!addAssetName) return;
    await addDoc(collection(db, 'assets'), { name: addAssetName, category: addAssetCategory, workspaceId: workspace.id, assignedTo: {}, priority: 'Normal', tags: [] });
    setShowAddAsset(false); setAddAssetName('');
  };

  const confirmDeletePreview = (id, step, versionIndex, currentVersions, collectionType = 'shots') => {
    openModal("Supprimer cette version ?", "L'image/vidéo sera effacée.", async () => {
      const versionToDelete = currentVersions[versionIndex];
      if (versionToDelete) {
        if (collectionType === 'shots' && versionToDelete.url) await deleteMediaFromCloudinary(versionToDelete.url);
        if (collectionType === 'assets' && versionToDelete.files) { for (const f of versionToDelete.files) { await deleteMediaFromCloudinary(f.url); } }
      }
      const newVersions = currentVersions.filter((_, i) => i !== versionIndex);
      const updateObj = collectionType === 'shots' ? { [`previews.${step}`]: newVersions } : { previews: newVersions };
      await updateDoc(doc(db, collectionType, id), updateObj);
      logAudit(id, collectionType, `A supprimé la V${versionToDelete.version} de l'étape ${step}`);
      closeModal();
    });
  };

  const saveTimeLog = async (durationSeconds) => {
    if (durationSeconds > 0 && selectedTask && selectedStep && workspace) {
      try {
        const taskName = [...shots, ...assets].find(t => t.id === selectedTask)?.name || 'Inconnu';
        await addDoc(collection(db, 'timeLogs'), {
          workspaceId: workspace.id, userId: user.uid, userName: userData.displayName, taskId: selectedTask, taskName: taskName, step: selectedStep, durationSeconds, date: serverTimestamp()
        });
        openModal("Temps enregistré", `Durée sauvegardée avec succès.`);
      } catch (err) { openModal("Erreur", err.message); }
    } else {
      openModal("Erreur", "Sélectionnez une tâche et une étape.");
    }
  };

  const handleStopTimer = () => { setIsTimerActive(false); saveTimeLog(timer); setTimer(0); };
  
  const handleAddManualTime = (e) => {
    e.preventDefault();
    const secs = (parseInt(manualTime.h || 0) * 3600) + (parseInt(manualTime.m || 0) * 60);
    if(secs > 0) { saveTimeLog(secs); setManualTime({h:0, m:0}); }
  };

  const addAssignee = async (collectionName, id, step, userId) => {
    const item = collectionName === 'shots' ? shots.find(s=>s.id===id) : assets.find(a=>a.id===id);
    const current = getAssignees(item, step);
    if(!current.includes(userId)) {
      await updateDoc(doc(db, collectionName, id), { [`assignedTo.${step}`]: [...current, userId] });
      const member = members.find(m => m.userId === userId);
      logAudit(id, collectionName, `A assigné ${member?.displayName || userId} sur l'étape ${step}`);
    }
  };

  const removeAssignee = async (collectionName, id, step, userId) => {
    const item = collectionName === 'shots' ? shots.find(s=>s.id===id) : assets.find(a=>a.id===id);
    const current = getAssignees(item, step);
    await updateDoc(doc(db, collectionName, id), { [`assignedTo.${step}`]: current.filter(u => u !== userId) });
    const member = members.find(m => m.userId === userId);
    logAudit(id, collectionName, `A retiré ${member?.displayName || userId} de l'étape ${step}`);
  };

  const changeStatus = async (item, step, newStatus, collectionName = 'shots') => {
    const oldStatus = item.status?.[step] || 'todo';
    if (oldStatus === newStatus) return;
    await updateDoc(doc(db, collectionName, item.id), { [`status.${step}`]: newStatus });
    logAudit(item.id, collectionName, `Statut "${step}" : ${oldStatus.toUpperCase()} ➔ ${newStatus.toUpperCase()}`);
  };

  const changePriority = async (id, newPriority, collectionName) => {
    await updateDoc(doc(db, collectionName, id), { priority: newPriority });
    logAudit(id, collectionName, `A changé la priorité en ${newPriority}`);
  };

  const addTag = async (id, collectionName, currentTags) => {
    const tag = window.prompt("Nom du nouveau tag :");
    if (tag && tag.trim() !== '' && !currentTags.includes(tag.trim())) {
      await updateDoc(doc(db, collectionName, id), { tags: [...currentTags, tag.trim()] });
      logAudit(id, collectionName, `A ajouté le tag "${tag.trim()}"`);
    }
  };
  const removeTag = async (id, collectionName, currentTags, tagToRemove) => {
    await updateDoc(doc(db, collectionName, id), { tags: currentTags.filter(t => t !== tagToRemove) });
    logAudit(id, collectionName, `A retiré le tag "${tagToRemove}"`);
  };

  const applyBatchAction = async () => {
    if(batchSelection.length === 0) return openModal("Erreur", "Sélectionnez des plans.");
    if(!batchActionStep) return openModal("Erreur", "Sélectionnez une étape.");
    
    for (const id of batchSelection) {
      const shot = shots.find(s => s.id === id);
      if (shot && batchActionStatus) await changeStatus(shot, batchActionStep, batchActionStatus, 'shots');
    }
    setBatchSelection([]); openModal(t('batchAction'), "Multi-action appliquée.");
  };

  const uploadShotPreview = async (shotId, step, file, currentVersions = []) => {
    if (!file) return; setUploadingMedia(true);
    try {
      const uploaded = await uploadMediaToCloud(file);
      if (uploaded?.url) {
        const newVersion = { url: uploaded.url, type: uploaded.type, version: currentVersions.length + 1, date: new Date().toISOString() };
        await updateDoc(doc(db, 'shots', shotId), { [`previews.${step}`]: [...currentVersions, newVersion] });
        logAudit(shotId, 'shots', `A uploadé une nouvelle V${newVersion.version} pour l'étape ${step}`);
      }
    } catch(err) { openModal("Erreur Upload", err.message); }
    setUploadingMedia(false);
  };

  const uploadAssetPreviews = async (assetId, filesList, currentVersions = []) => {
    if(!filesList || filesList.length === 0) return; setUploadingMedia(true);
    try {
      const files = Array.from(filesList); const uploadedFiles = [];
      for(const f of files) { const res = await uploadMediaToCloud(f); if(res) uploadedFiles.push(res); }
      if (uploadedFiles.length > 0) {
        const newV = { version: currentVersions.length + 1, files: uploadedFiles, date: new Date().toISOString() };
        await updateDoc(doc(db, 'assets', assetId), { previews: [...currentVersions, newV] });
        logAudit(assetId, 'assets', `A uploadé une nouvelle V${newV.version} (${uploadedFiles.length} fichiers)`);
      }
    } catch(err) { openModal("Erreur Upload", err.message); }
    setUploadingMedia(false);
  };

  const openReview = (item, step, version, previewObj, type = 'shots') => {
    setReviewItem(item); setReviewType(type); setReviewStep(step); setReviewVersion(version); setReviewPreview(previewObj);
    setCompareMode(false); setCompareVersion(''); setStrokes([]); setCurrentStroke(null); setDrawMode('pen'); setReviewTab('chat');
  };

  const getAnnotationKey = () => {
    if(!reviewItem || !reviewStep || !reviewPreview) return null;
    if(reviewPreview.type === 'video') return Math.floor(videoProgress * FRAMERATE);
    if(reviewType === 'assets') return `image_${reviewPreview.fileIndex}`;
    return 'image';
  };

  const getThumbnail = (versionOrFile) => {
    if(!versionOrFile || !versionOrFile.url) return '';
    return versionOrFile.type === 'video' ? versionOrFile.url.replace(/\.[^/.]+$/, ".jpg") : versionOrFile.url;
  };

  useEffect(() => {
    const key = getAnnotationKey();
    if(key && reviewItem?.annotations?.[reviewStep]?.[`v${reviewVersion}`]?.[key]) { setStrokes(JSON.parse(reviewItem.annotations[reviewStep][`v${reviewVersion}`][key])); } else setStrokes([]);
  }, [videoProgress, reviewItem, reviewStep, reviewVersion]);

  const drawOnCanvas = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      if(!stroke) return;
      if (stroke.type === 'text') {
        ctx.font = `bold ${stroke.size * 4}px Arial`; ctx.fillStyle = 'red';
        ctx.fillText(stroke.content, stroke.x * canvas.width, stroke.y * canvas.height);
      } else if (stroke.points && stroke.points.length > 1) {
        ctx.lineCap = 'round'; ctx.strokeStyle = 'red'; ctx.lineWidth = stroke.size || 3;
        ctx.beginPath(); ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for(let i=1; i<stroke.points.length; i++) ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        ctx.stroke();
      }
    });
  };

  useEffect(() => { drawOnCanvas(); }, [strokes, currentStroke]);

  const startDraw = (e) => {
    if(!drawMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    if (drawMode === 'text') {
      setTextInputPos({ x: x/rect.width, y: y/rect.height, px: x, py: y }); setTextInputValue('');
    } else {
      setCurrentStroke({ type: 'pen', size: brushSize, points: [{ x: x/rect.width, y: y/rect.height }] });
    }
  };
  const onDraw = (e) => {
    if(drawMode !== 'pen' || !currentStroke) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    setCurrentStroke(prev => ({ ...prev, points: [...prev.points, { x: x/rect.width, y: y/rect.height }] }));
  };
  const endDraw = () => {
    if(drawMode !== 'pen' || !currentStroke) return;
    setStrokes([...strokes, currentStroke]); setCurrentStroke(null);
  };
  
  const commitTextAnnotation = () => {
    if(textInputValue.trim() && textInputPos) { setStrokes([...strokes, { type: 'text', content: textInputValue, x: textInputPos.x, y: textInputPos.y, size: brushSize }]); }
    setTextInputPos(null); setTextInputValue('');
  };

  const saveAnnotations = async () => {
    const key = getAnnotationKey(); if(!key || !reviewItem) return;
    await updateDoc(doc(db, reviewType, reviewItem.id), { [`annotations.${reviewStep}.v${reviewVersion}.${key}`]: JSON.stringify(strokes) });
    logAudit(reviewItem.id, reviewType, `A sauvegardé une retake sur la V${reviewVersion}`);
    openModal("Retake Sauvegardée", "Le point rouge a été ajouté à la timeline.");
  };

  const deleteRetakeFromDB = () => {
    openModal("Supprimer Retake", "Détruire définitivement cette retake ?", async () => {
      const key = getAnnotationKey(); if(!key || !reviewItem) return;
      await updateDoc(doc(db, reviewType, reviewItem.id), { [`annotations.${reviewStep}.v${reviewVersion}.${key}`]: deleteField() });
      if (reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`]) {
        delete reviewItem.annotations[reviewStep][`v${reviewVersion}`][key];
        if (Object.keys(reviewItem.annotations[reviewStep][`v${reviewVersion}`]).length === 0) delete reviewItem.annotations[reviewStep][`v${reviewVersion}`];
      }
      setStrokes([]); setReviewItem({ ...reviewItem }); closeModal();
    });
  };

  const postComment = async (e) => {
    e.preventDefault(); if(!newChatMsg.trim() || !reviewItem) return;
    await addDoc(collection(db, `${reviewType}/${reviewItem.id}/comments`), { type: 'chat', text: newChatMsg, date: serverTimestamp(), author: userData.displayName });
    setNewChatMsg('');
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'Urgent': return <span className="text-red-500 font-bold" title="Urgent">🔴 Urgent</span>;
      case 'Low': return <span className="text-green-500 font-bold" title="Basse">🟢 Basse</span>;
      default: return <span className="text-yellow-500 font-bold" title="Normal">🟡 Normal</span>;
    }
  };

  const myAssignedShots = shots.filter(s => workspace?.pipeline?.some(step => getAssignees(s, step).includes(user?.uid)));
  const myAssignedAssets = assets.filter(a => getAssignees(a, 'Global').includes(user?.uid));

  const exportPDFReport = () => {
    window.print();
  };

  const getStatusColor = (st) => {
    switch(st) {
      case 'wip': return 'bg-blue-900/40 text-blue-500 border-blue-700 dark:text-blue-400';
      case 'review': return 'bg-purple-900/40 text-purple-500 border-purple-700 dark:text-purple-400';
      case 'reuse': return 'bg-orange-900/40 text-orange-500 border-orange-700 dark:text-orange-400';
      case 'done': return 'bg-green-900/40 text-green-500 border-green-700 dark:text-green-400';
      default: return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const myStats = { todo: 0, wip: 0, review: 0, done: 0 };
  myAssignedShots.forEach(s => {
    workspace?.pipeline?.forEach(step => {
      if(getAssignees(s, step).includes(user?.uid)) {
        const st = s.status?.[step] || 'todo';
        if(myStats[st] !== undefined) myStats[st]++;
      }
    });
  });

  let filteredShots = shots.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.scene.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus ? workspace?.pipeline?.some(step => s.status?.[step] === filterStatus) : true;
    const matchAssignee = filterAssignee ? workspace?.pipeline?.some(step => getAssignees(s, step).includes(filterAssignee)) : true;
    return matchSearch && matchStatus && matchAssignee;
  });

  const groupedShots = filteredShots.reduce((acc, s) => { (acc[s.sequence] = acc[s.sequence] || []).push(s); return acc; }, {});
  const sortedSeqs = Object.keys(groupedShots).sort();
  const groupedAssets = assets.reduce((acc, a) => { (acc[a.category] = acc[a.category] || []).push(a); return acc; }, {});
  const sortedCats = Object.keys(groupedAssets).sort();

  const pixelateStyle = `
    @keyframes pixelateAnim {
      0% { filter: blur(0px) contrast(1); transform: scale(1); }
      50% { filter: blur(3px) contrast(5); transform: scale(1.05); }
      100% { filter: blur(0px) contrast(1); transform: scale(1); }
    }
    select option { background-color: var(--bg-option, white); color: var(--text-option, black); }
    .dark select option { background-color: var(--bg-option, #0f172a); color: var(--text-option, white); }
    @media print {
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
    }
  `;

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement...</div>;

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <style>{pixelateStyle}</style>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="px-3 py-1 rounded font-bold text-sm bg-slate-200 dark:bg-slate-800 uppercase">{lang}</button>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800">{theme==='dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>
        </div>
        <form onSubmit={handleAuth} className={`border p-8 rounded-xl w-full max-w-md space-y-5 shadow-2xl ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col items-center justify-center space-y-2 mb-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Clapperboard size={26} className="text-white" /></div>
            <h1 onClick={triggerEasterEgg} className="text-2xl font-black tracking-tight cursor-pointer select-none" style={{ animation: logoPixelated ? 'pixelateAnim 0.5s ease-in-out' : 'none' }}>Fabrica Tracker</h1>
          </div>
          <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 pb-2 ${authMode === 'login' ? 'text-blue-500 font-bold border-b-2 border-blue-500' : 'text-slate-400'}`}>Connexion</button>
            <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 pb-2 ${authMode === 'register' ? 'text-blue-500 font-bold border-b-2 border-blue-500' : 'text-slate-400'}`}>Inscription</button>
          </div>
          {authMode === 'register' && (
            <>
              <input type="text" placeholder="Pseudo" value={authName} onChange={(e) => setAuthName(e.target.value)} className={inputClass} />
              <label className="flex items-center space-x-2 text-sm text-slate-500"><input type="checkbox" checked={emailNotifs} onChange={(e)=>setEmailNotifs(e.target.checked)}/> <span>Recevoir alertes Email</span></label>
            </>
          )}
          <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={inputClass} required />
          <input type="password" placeholder="Mot de passe" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={inputClass} required />
          {authMode === 'login' && <div className="text-right"><button type="button" onClick={handleForgotPassword} className="text-xs text-blue-500 hover:underline">Mot de passe oublié ?</button></div>}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-md">{authMode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
        </form>
        
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':'bg-white border-slate-200 text-slate-900'}`}>
              <h3 className="font-bold text-lg">{modal.title}</h3><p className="text-sm opacity-80">{modal.msg}</p>
              <div className="flex space-x-3 pt-4">
                {modal.onConfirm && <button onClick={closeModal} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded font-bold transition hover:bg-slate-300 dark:hover:bg-slate-700">{t('cancel')}</button>}
                <button onClick={modal.onConfirm || closeModal} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold transition hover:bg-blue-500">{t('ok')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Page Profil Complète ---
  if (currentView === 'profile') {
    return (
      <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative ${theme==='dark'?'bg-slate-950 text-white':'bg-slate-50 text-slate-900'}`}>
         <button onClick={() => setCurrentView('dashboard')} className="absolute top-6 left-6 flex items-center space-x-2 text-slate-500 hover:text-blue-500 font-bold transition"><ChevronLeft/> Retour au Dashboard</button>
         <form onSubmit={updateProfile} className={`p-8 w-full max-w-md border rounded-2xl shadow-xl space-y-6 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
            <div className="flex flex-col items-center space-y-4 mb-6">
               <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-4xl shadow-lg"><UserCircle size={48} className="text-white"/></div>
               <h2 className="text-2xl font-black">{userData?.displayName || 'Utilisateur'}</h2>
               <p className="text-slate-500 text-sm font-mono">{user.email}</p>
            </div>
            <div className="space-y-4">
               <div><label className="text-xs font-bold text-slate-500 uppercase">Pseudo</label><input type="text" value={profileName} onChange={e=>setProfileName(e.target.value)} className={inputClass} /></div>
               <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={emailNotifs} onChange={e=>setEmailNotifs(e.target.checked)}/><span>Notifications par Email</span></label>
               <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={browserNotifs} onChange={e=>requestBrowserNotifs(e.target.checked)}/><span>Notifications Push (Navigateur)</span></label>
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition shadow-md">Mettre à jour le profil</button>
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
               <p className="text-xs text-slate-500 mb-2">Pour supprimer votre compte, confirmez votre email :</p>
               <input type="email" value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder={user.email} className={`${inputClass} mb-2 border-red-300 dark:border-red-900/50`} />
               <button type="button" onClick={handleDeleteAccount} className="text-red-500 font-bold text-sm hover:underline">Supprimer mon compte définitivement</button>
            </div>
         </form>

        {modal.isOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
            <div className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':'bg-white border-slate-200 text-slate-900'}`}>
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
        <div className={`w-80 h-[28rem] mb-4 rounded-xl shadow-2xl border flex flex-col overflow-hidden transform transition-all ${theme==='dark'?'bg-slate-900 border-slate-700':'bg-white border-slate-200'}`}>
          {!activeFriend ? (
             <div className="flex flex-col h-full">
               <div className={`p-4 border-b font-bold flex justify-between items-center ${theme==='dark'?'border-slate-800 bg-slate-950/50':'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center"><MessageCircle size={18} className="mr-2 text-blue-500"/> Mes Messages</div>
                  <button onClick={()=>setIsChatWidgetOpen(false)} className="text-slate-400 hover:text-red-500"><X size={18}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {friendsList.length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-10">Ajoutez des amis dans le Dashboard.</p> : null}
                 {friendsList.map(f => (
                   <button key={f.id} onClick={() => setActiveFriend(f)} className={`w-full flex items-center justify-between p-3 rounded-lg transition text-left ${theme==='dark'?'hover:bg-slate-800':'hover:bg-slate-100'}`}>
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
               <div className={`p-3 border-b flex justify-between items-center shadow-sm ${theme==='dark'?'border-slate-800 bg-slate-950/50':'border-slate-200 bg-slate-50'}`}>
                  <button onClick={()=>setActiveFriend(null)} className="p-1 text-slate-400 hover:text-blue-500"><ChevronLeft size={20}/></button>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm truncate flex-1 text-center">{activeFriend.displayName}</span>
                    {onlineUsers[activeFriend.id] && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </div>
                  <button onClick={()=>setIsChatWidgetOpen(false)} className="p-1 text-slate-400 hover:text-red-500"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950/30">
                 {pmMessages.length === 0 ? <p className="text-xs text-center text-slate-500 italic mt-10">Dites bonjour !</p> : null}
                 {pmMessages.map(msg => (
                    <div key={msg.id} className={`p-2.5 rounded-xl text-xs max-w-[85%] shadow-sm ${msg.authorId === user.uid ? 'bg-blue-600 text-white ml-auto rounded-br-none' : (theme==='dark'?'bg-slate-800 text-slate-200 mr-auto rounded-bl-none':'bg-white border text-slate-700 mr-auto rounded-bl-none')}`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                 ))}
               </div>
               <form onSubmit={postPm} className={`p-2 border-t flex space-x-2 ${theme==='dark'?'border-slate-800 bg-slate-900':'border-slate-200 bg-white'}`}>
                  <input type="text" value={newPmMsg} onChange={e=>setNewPmMsg(e.target.value)} placeholder="Message..." className={`flex-1 p-2 rounded-lg outline-none text-sm ${theme==='dark'?'bg-slate-950 border-slate-700 border':'bg-slate-100 border-slate-300 border focus:border-blue-500'}`} />
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-500 transition"><Plus size={18}/></button>
               </form>
             </div>
          )}
        </div>
      )}
      <button onClick={() => setIsChatWidgetOpen(!isChatWidgetOpen)} className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition">
         {isChatWidgetOpen ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>
    </div>
  );

  if (currentView === 'dashboard') {
    return (
      <div className={`min-h-screen p-6 relative flex flex-col ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <style>{pixelateStyle}</style>
        {renderChatWidget()}
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 max-w-5xl mx-auto w-full space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-md"><Clapperboard size={22} className="text-white" /></div>
            <h1 onClick={triggerEasterEgg} className="text-2xl font-black cursor-pointer select-none" style={{ animation: logoPixelated ? 'pixelateAnim 0.5s ease-in-out' : 'none' }}>Fabrica Tracker</h1>
          </div>
          
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="px-3 py-1.5 rounded font-bold text-sm bg-slate-100 dark:bg-slate-800 uppercase text-slate-600 dark:text-slate-300 shadow-sm">{lang}</button>
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm">{theme==='dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
            <button onClick={() => setCurrentView('profile')} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border shadow-sm ${theme==='dark'?'bg-slate-800 border-slate-700 hover:text-white':'bg-slate-50 border-slate-200 hover:text-blue-600'} transition`}><UserCircle size={18} /> <span className="text-sm font-medium">{userData?.displayName}</span></button>
            <button onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full mb-6 flex space-x-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button onClick={()=>setDashTab('projects')} className={`font-bold text-lg ${dashTab === 'projects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('projects')}</button>
          <button onClick={()=>setDashTab('friends')} className={`font-bold text-lg ${dashTab === 'friends' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('friends')}</button>
        </div>

        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashTab === 'projects' && (
            <>
              <div className={`md:col-span-2 border p-6 rounded-xl flex-1 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center"><FolderKanban className="mr-2 text-blue-500" /> {t('projects')}</h2>
                <div className="space-y-3">
                  {myProjects.length === 0 ? <p className="text-slate-500 italic">Aucun projet. Créez-en un à droite.</p> : null}
                  {myProjects.map(p => (
                    <div key={p.id} className={`relative rounded-lg overflow-hidden border transition group ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-blue-500':'bg-slate-50 border-slate-200 hover:border-blue-500'}`}>
                      {p.bannerUrl && <div className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition" style={{backgroundImage: `url(${p.bannerUrl})`}}></div>}
                      <div className="relative z-10 p-4 flex justify-between items-center backdrop-blur-[2px]">
                        <div className="flex-1 cursor-pointer flex items-center" onClick={async () => {
                          const wsDoc = await getDoc(doc(db, 'workspaces', p.workspaceId));
                          if(wsDoc.exists()) { setWorkspace({ id: wsDoc.id, ...wsDoc.data() }); setCurrentView('workspace'); setActiveTab('myTasks'); }
                        }}>
                          <div><h3 className="font-bold text-lg drop-shadow-md">{p.workspaceName}</h3><p className="text-xs text-slate-700 font-bold dark:text-slate-300 uppercase tracking-wider mt-1 drop-shadow-md">Rôle : <span className="text-blue-600 dark:text-blue-400 font-black">{p.role}</span></p></div>
                        </div>
                        <div className="flex items-center space-x-3 bg-white/50 dark:bg-slate-950/50 p-1.5 rounded-full backdrop-blur-md">
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
                          }} className="cursor-pointer w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg transform hover:scale-105 transition"><Play size={18} className="ml-1" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <form onSubmit={createProject} className={`border p-6 rounded-xl space-y-4 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                  <h2 className="text-lg font-bold">{t('createProj')}</h2>
                  <input type="text" placeholder={t('projName')} value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className={inputClass} required />
                  <div className="flex space-x-2">
                    {['2D', '3D', 'Game'].map(tp => (
                      <button key={tp} type="button" onClick={() => setNewProjectType(tp)} className={`flex-1 py-1.5 text-xs font-bold rounded border ${newProjectType === tp ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{tp}</button>
                    ))}
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-sm">Créer</button>
                </form>
                <form onSubmit={joinProject} className={`border p-6 rounded-xl space-y-4 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                  <h2 className="text-lg font-bold">{t('joinProj')}</h2>
                  <input type="text" placeholder={t('joinCode')} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className={`font-mono text-center tracking-widest ${inputClass}`} required />
                  <button type="submit" className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold rounded-lg transition hover:bg-slate-300 dark:hover:bg-slate-700">{t('join')}</button>
                </form>
              </div>
            </>
          )}

          {dashTab === 'friends' && (
            <>
               <div className={`md:col-span-2 border p-6 rounded-xl ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center"><Users className="mr-2 text-blue-500" /> {t('friends')}</h2>
                <div className="space-y-3">
                  {friendsList.length === 0 ? <p className="text-slate-500 italic">Aucun ami ajouté.</p> : null}
                  {friendsList.map(f => (
                    <div key={f.id} onClick={() => { setActiveFriend(f); setIsChatWidgetOpen(true); }} className={`border p-4 rounded-lg cursor-pointer flex justify-between items-center transition ${theme==='dark'?'bg-slate-950 border-slate-800 hover:border-blue-500':'bg-slate-50 border-slate-200 hover:border-blue-500'}`}>
                      <div className="flex items-center space-x-3">
                         <UserCircle size={32} className="text-slate-400"/> 
                         <div className="flex items-center space-x-2"><h3 className="font-bold text-lg">{f.displayName}</h3> {onlineUsers[f.id] && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow" title="En ligne"></div>}</div>
                      </div>
                      <MessageSquare size={18} className="text-blue-500"/>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <form onSubmit={addFriend} className={`border p-6 rounded-xl space-y-4 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                  <h2 className="text-lg font-bold flex items-center"><UserPlus className="mr-2"/> {t('addFriend')}</h2>
                  <input type="text" placeholder={t('friendId')} value={friendInput} onChange={(e) => setFriendInput(e.target.value)} className={`font-mono text-center tracking-widest ${inputClass}`} required />
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-sm">Ajouter</button>
                </form>
                <div className={`border p-6 rounded-xl text-center space-y-2 ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
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
    <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <style>{pixelateStyle}</style>
      {renderChatWidget()}
      
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm no-print">
          <div className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800 text-white':'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="font-bold text-lg">{modal.title}</h3><p className="text-sm opacity-80">{modal.msg}</p>
            <div className="flex space-x-3 pt-4">
              {modal.onConfirm && <button onClick={closeModal} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded font-bold transition hover:bg-slate-300 dark:hover:bg-slate-700">{t('cancel')}</button>}
              <button onClick={modal.onConfirm || closeModal} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold transition hover:bg-blue-500">{t('ok')}</button>
            </div>
          </div>
        </div>
      )}

      {showAddShot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 no-print">
          <form onSubmit={handleAddShot} className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-lg mb-2">{t('addShot')}</h3>
            <div><label className="text-xs font-bold text-slate-500">Séquence (SQ01)</label><input type="text" value={addSeq} onChange={(e)=>setAddSeq(e.target.value.toUpperCase())} className={inputClass} required/></div>
            <div><label className="text-xs font-bold text-slate-500">Scène (SC001)</label><input type="text" value={addScene} onChange={(e)=>setAddScene(e.target.value.toUpperCase())} className={inputClass} required/></div>
            <div><label className="text-xs font-bold text-slate-500">Nom</label><input type="text" value={addName} onChange={(e)=>setAddName(e.target.value.toUpperCase())} className={inputClass} required/></div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => setShowAddShot(false)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded font-bold hover:bg-slate-300 dark:hover:bg-slate-700">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500">Créer</button>
            </div>
          </form>
        </div>
      )}

      {showAddAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 no-print">
          <form onSubmit={handleAddAsset} className={`p-6 rounded-xl border w-full max-w-sm space-y-4 shadow-2xl ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-lg mb-2">{t('addAsset')}</h3>
            <div><label className="text-xs font-bold text-slate-500">{t('assetName')}</label><input type="text" value={addAssetName} onChange={(e)=>setAddAssetName(e.target.value)} className={inputClass} required/></div>
            <div><label className="text-xs font-bold text-slate-500">{t('category')}</label>
               <select value={addAssetCategory} onChange={(e)=>setAddAssetCategory(e.target.value)} className={inputClass}>
                 {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => {setShowAddAsset(false); setAddAssetName('');}} className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 rounded font-bold hover:bg-slate-300 dark:hover:bg-slate-700">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500">OK</button>
            </div>
          </form>
        </div>
      )}

      <aside className={`w-16 md:w-64 border-r flex flex-col justify-between shrink-0 h-full z-20 no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-100 border-slate-200'}`}>
        <div className="space-y-4">
          <div className="relative p-4 border-b border-slate-200 dark:border-slate-800 bg-cover bg-center" style={workspace?.bannerUrl ? {backgroundImage: `url(${workspace.bannerUrl})`} : {}}>
            {workspace?.bannerUrl && <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/80 backdrop-blur-sm"></div>}
            <div className="relative z-10 space-y-4">
              <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold"><ChevronLeft size={20} /> <span className="hidden md:inline">Projets</span></button>
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
            <button onClick={() => {setActiveTab('time'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'time' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Clock size={18} /> <span className="hidden md:inline font-bold">{t('time')}</span></button>
            <button onClick={() => {setActiveTab('stats'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><BarChart size={18} /> <span className="hidden md:inline font-bold">{t('stats')}</span></button>
            <button onClick={() => {setActiveTab('team'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Users size={18} /> <span className="hidden md:inline font-bold">{t('team')}</span></button>
            {userPermissions.role === 'Admin' && <button onClick={() => {setActiveTab('settings'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><Settings size={18} /> <span className="hidden md:inline font-bold">{t('settings')}</span></button>}
            <button onClick={() => {setActiveTab('help'); setReviewItem(null);}} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'help' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}><HelpCircle size={18} /> <span className="hidden md:inline font-bold">{t('help')}</span></button>
          </nav>
        </div>
        <div className="p-4 flex items-center space-x-2">
          <button onClick={()=>setLang(lang==='fr'?'en':'fr')} className="flex-1 p-2 rounded border dark:border-slate-800 border-slate-300 bg-white dark:bg-slate-900 transition text-xs text-slate-700 dark:text-slate-400 font-bold uppercase shadow-sm">{lang}</button>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="p-2 rounded border dark:border-slate-800 border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 shadow-sm">{theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>
        </div>
      </aside>

      <div className="flex-1 flex overflow-hidden relative">
        <main className={`flex-1 p-6 overflow-y-auto overflow-x-hidden relative print-area ${theme==='dark'?'bg-slate-950':'bg-slate-50'}`}>
          {uploadingMedia && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded text-sm animate-pulse shadow-lg z-50 no-print">Transfert Cloudinary...</div>}
          
          <header className="mb-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 no-print">
            <h2 className="text-2xl font-bold tracking-tight uppercase">{t(activeTab)}</h2>
            <div className="flex items-center space-x-6">
              {userPermissions.canAssign && (
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    <Bell size={20} />
                    {pendingReviews.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">{pendingReviews.length}</span>}
                  </button>
                  {showNotifications && (
                    <div className={`absolute top-10 right-0 w-64 border rounded-xl shadow-2xl z-50 p-3 max-h-64 overflow-y-auto ${theme==='dark'?'bg-slate-900 border-slate-700':'bg-white border-slate-200'}`}>
                      <h4 className="text-sm font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">À Valider (Mes Assignations)</h4>
                      {pendingReviews.length === 0 ? <p className="text-xs text-slate-500 italic">Rien à voir pour le moment !</p> : pendingReviews.map(s => (
                        <div key={s.id} className={`text-xs p-2 rounded mb-1 border cursor-pointer transition ${theme==='dark'?'hover:bg-slate-800 border-slate-800':'hover:bg-blue-50 border-slate-100'}`} onClick={()=>{setActiveTab('shots'); setShowNotifications(false);}}>
                          <span className="font-bold text-blue-500">{s.name}</span> prêt pour validation.
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Rôle : <span className="text-blue-600 dark:text-blue-400 ml-1">{userPermissions.role}</span></p>
            </div>
          </header>

          {activeTab === 'myTasks' && (
            <div className="space-y-8">
               <div className={`p-6 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                  <h3 className="font-black text-xl mb-4 flex items-center text-blue-500"><Film className="mr-3" /> Mes Plans ({myAssignedShots.length})</h3>
                  {myAssignedShots.length === 0 ? <p className="text-sm text-slate-500 italic">Aucun plan assigné pour l'instant.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {myAssignedShots.map(s => (
                          <div key={s.id} className={`p-4 rounded-lg border flex flex-col justify-between cursor-pointer hover:border-blue-500 transition shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`} onClick={() => setActiveTab('shots')}>
                             <div className="flex justify-between items-start mb-2">
                               <div><div className="text-xs text-slate-500 font-mono font-bold">{s.sequence} / {s.scene}</div><div className="font-bold text-lg">{s.name}</div></div>
                               {getPriorityIcon(s.priority)}
                             </div>
                             <div className="flex flex-wrap gap-1 mt-2">
                                {workspace?.pipeline?.map(step => getAssignees(s, step).includes(user.uid) && (
                                  <span key={step} className={`text-xs px-2 py-1 rounded border font-bold ${getStatusColor(s.status?.[step])}`}>{step}</span>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                  )}
               </div>

               <div className={`p-6 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                  <h3 className="font-black text-xl mb-4 flex items-center text-blue-500"><Box className="mr-3" /> Mes Assets ({myAssignedAssets.length})</h3>
                  {myAssignedAssets.length === 0 ? <p className="text-sm text-slate-500 italic">Aucun asset assigné pour l'instant.</p> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {myAssignedAssets.map(a => (
                          <div key={a.id} className={`p-4 rounded-lg border flex flex-col justify-between cursor-pointer hover:border-blue-500 transition shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`} onClick={() => setActiveTab('assets')}>
                             <div className="flex justify-between items-start mb-2">
                               <div><div className="text-xs text-slate-500 font-bold">{a.category}</div><div className="font-bold text-lg">{a.name}</div></div>
                               {getPriorityIcon(a.priority)}
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
              <div className={`p-4 rounded-xl border flex flex-col xl:flex-row gap-4 items-center justify-between no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row flex-1 gap-2 w-full">
                  <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16}/><input type="text" placeholder={t('searchShot')} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className={`${inputClass} pl-10`} /></div>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={inputClass + " flex-1 font-bold"}><option value="">{t('allStatus')}</option><option value="todo">{t('todo')}</option><option value="wip">{t('wip')}</option><option value="review">{t('reviewStatus')}</option><option value="reuse">{t('reuse')}</option><option value="done">{t('done')}</option></select>
                  <select value={filterAssignee} onChange={e=>setFilterAssignee(e.target.value)} className={inputClass + " flex-1 font-bold"}><option value="">{t('allMembers')}</option>{members.map(m=><option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select>
                </div>
                {userPermissions.canAssign && <button onClick={() => setShowAddShot(true)} className="w-full xl:w-auto flex items-center justify-center space-x-2 bg-blue-600 text-white hover:bg-blue-500 px-4 py-2.5 rounded-lg font-bold text-sm shrink-0 shadow-sm"><Plus size={16} /> <span>{t('addShot')}</span></button>}
              </div>

              {userPermissions.canEdit && batchSelection.length > 0 && (
                <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg sticky top-0 z-40 no-print">
                  <div className="font-bold flex items-center"><CheckSquare className="mr-2"/> {batchSelection.length} sélectionnés</div>
                  <div className="flex space-x-2 items-center">
                    <select value={batchActionStep} onChange={e=>setBatchActionStep(e.target.value)} className="bg-blue-800 text-white border-none rounded-lg p-2 text-sm outline-none font-bold"><option value="">-- Étape --</option>{workspace?.pipeline?.map(p=><option key={p} value={p}>{p}</option>)}</select>
                    <select value={batchActionStatus} onChange={e=>setBatchActionStatus(e.target.value)} className="bg-blue-800 text-white border-none rounded-lg p-2 text-sm outline-none font-bold"><option value="">-- Statut --</option><option value="todo">{t('todo')}</option><option value="wip">{t('wip')}</option><option value="review">{t('reviewStatus')}</option><option value="done">{t('done')}</option></select>
                    <button onClick={applyBatchAction} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 shadow-sm">Appliquer</button>
                  </div>
                </div>
              )}

              {filteredShots.length === 0 && (
                <div className={`p-10 text-center text-slate-500 italic border border-dashed rounded-xl ${theme==='dark'?'border-slate-700 bg-slate-900/50':'border-slate-300 bg-white'}`}>
                   <Film size={48} className="mx-auto mb-4 opacity-30" />
                   Aucun plan trouvé ou créé. {userPermissions.canAssign && 'Cliquez sur "Ajouter Plan" pour commencer.'}
                </div>
              )}

              {sortedSeqs.map(seq => (
                <div key={seq} className={`border rounded-xl overflow-hidden shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                  <div className={`p-3 border-b font-black text-blue-600 dark:text-blue-500 tracking-widest text-sm flex items-center ${theme==='dark'?'bg-slate-950/50 border-slate-800':'bg-slate-50 border-slate-200'}`}><Film size={16} className="mr-2 opacity-50"/> {seq}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className={`border-b text-xs uppercase ${theme==='dark'?'border-slate-800 text-slate-400 bg-slate-900':'border-slate-200 text-slate-500 bg-white'}`}>
                          <th className="p-3 sticky left-0 z-10 w-56 font-bold bg-inherit">
                            {userPermissions.canEdit && <input type="checkbox" onChange={(e) => setBatchSelection(e.target.checked ? groupedShots[seq].map(s=>s.id) : batchSelection.filter(id => !groupedShots[seq].map(s=>s.id).includes(id))) } className="mr-2 cursor-pointer no-print"/>} Scène / Nom
                          </th>
                          {workspace?.pipeline?.map(step => <th key={step} className={`p-3 min-w-[240px] border-l font-bold ${theme==='dark'?'border-slate-800':'border-slate-200'}`}>{step}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                        {groupedShots[seq].sort((a,b)=> a.scene.localeCompare(b.scene)).map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                            <td className={`p-3 font-medium sticky left-0 z-10 align-top ${theme==='dark'?'bg-slate-900':'bg-white'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start">
                                  {userPermissions.canEdit && <input type="checkbox" checked={batchSelection.includes(s.id)} onChange={(e) => setBatchSelection(e.target.checked ? [...batchSelection, s.id] : batchSelection.filter(id=>id!==s.id))} className="mr-3 mt-1 cursor-pointer no-print"/>}
                                  <div>
                                    <div className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-0.5 font-bold">{s.scene}</div>
                                    <div className="font-black text-base flex items-center gap-2">
                                       {s.name} 
                                       {userPermissions.canAssign ? (
                                         <select value={s.priority || 'Normal'} onChange={e => changePriority(s.id, e.target.value, 'shots')} className={`text-[10px] p-0 outline-none bg-transparent cursor-pointer no-print ${theme==='dark'?'text-slate-400':'text-slate-500'}`}>
                                            <option value="Urgent">🔴</option><option value="Normal">🟡</option><option value="Low">🟢</option>
                                         </select>
                                       ) : <span className="text-[10px]">{s.priority==='Urgent'?'🔴':s.priority==='Low'?'🟢':'🟡'}</span>}
                                    </div>
                                  </div>
                                </div>
                                {userPermissions.canAssign && <button onClick={() => openModal("Supprimer Plan", `Détruire définitivement le plan ${s.name} ?`, async () => { await deleteDoc(doc(db, 'shots', s.id)); closeModal(); })} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 no-print"><Trash2 size={16}/></button>}
                              </div>
                              <div className="flex flex-wrap gap-1 ml-6">
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
                                        <span key={uid} onClick={() => userPermissions.canAssign && removeAssignee('shots', s.id, step, uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold shadow-sm ${userPermissions.canAssign ? 'cursor-pointer bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                          {members.find(m => m.userId === uid)?.displayName || 'Inconnu'} {userPermissions.canAssign && <X size={10} className="ml-1"/>}
                                        </span>
                                      ))}
                                    </div>
                                    {userPermissions.canAssign && (<select className={`${inputClass} !p-1 !text-xs !py-1`} value="" onChange={(e) => { if(e.target.value) addAssignee('shots', s.id, step, e.target.value) }}><option value="">+ Assigner</option>{members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select>)}
                                    <select disabled={!userPermissions.canEdit} className={`rounded p-1 text-xs font-bold outline-none transition-colors border shadow-sm ${getStatusColor(s.status?.[step])}`} value={s.status?.[step] || 'todo'} onChange={(e) => changeStatus(s, step, e.target.value, 'shots')}><option value="todo">{t('todo')}</option><option value="wip">{t('wip')}</option><option value="review">{t('reviewStatus')}</option><option value="reuse">{t('reuse')}</option><option value="done">{t('done')}</option></select>
                                  </div>
                                  <div className="hidden print:block text-xs font-bold">{s.status?.[step] || 'todo'}</div>
                                  <div className={`pt-2 border-t h-[4.5rem] no-print ${theme==='dark'?'border-slate-800/50':'border-slate-200'}`}>
                                    {activePreview ? (
                                      <div className="flex flex-col w-full space-y-1">
                                        <div className="flex justify-between items-center px-0.5">
                                          {versions.length > 1 ? (<select value={activeIdx} onChange={(e) => setSelectedVersions({...selectedVersions, [`${s.id}_${step}`]: parseInt(e.target.value)})} className="bg-transparent text-xs text-slate-500 font-bold outline-none">{versions.map((v, i) => <option key={i} value={i} className="dark:bg-slate-900">V{v.version}</option>)}</select>) : <span className="text-xs font-bold text-slate-400">V1</span>}
                                          <div className="flex space-x-2 text-slate-400">{canUpload && <label className="cursor-pointer hover:text-blue-500 transition" title="Upload"><Upload size={14}/><input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} /></label>}{canUpload && <button onClick={() => confirmDeletePreview(s.id, step, activeIdx, versions, 'shots')} className="hover:text-red-500 transition"><Trash2 size={14}/></button>}</div>
                                        </div>
                                        <div className="relative w-full h-12 bg-black rounded border border-slate-800 group/preview cursor-pointer overflow-hidden shadow-sm" onClick={() => openReview(s, step, activePreview.version, activePreview, 'shots')}>
                                          <img src={getThumbnail(activePreview)} className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition duration-300" />
                                          <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover/preview:bg-blue-600/20 transition duration-300"><MonitorPlay size={18} className="text-white opacity-0 group-hover/preview:opacity-100 drop-shadow-md transform scale-75 group-hover/preview:scale-100 transition-all" /></div>
                                          {s.annotations?.[step]?.[`v${activePreview.version}`] && Object.keys(s.annotations[step][`v${activePreview.version}`]).length > 0 && (<div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow"></div>)}
                                        </div>
                                      </div>
                                    ) : (canUpload ? (<label className={`text-xs flex flex-col items-center justify-center border border-dashed text-slate-500 dark:text-slate-400 font-bold w-full rounded cursor-pointer h-full transition group/up ${theme==='dark'?'bg-slate-950 border-slate-700 hover:border-blue-500 hover:text-blue-400':'bg-slate-50 border-slate-300 hover:border-blue-500 hover:text-blue-600'}`}><Upload size={16} className="mb-1 group-hover/up:-translate-y-0.5 transition-transform"/> <span>{t('upload')}</span><input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} /></label>) : (<div className={`text-xs w-full h-full flex items-center justify-center italic font-bold rounded ${theme==='dark'?'text-slate-600 bg-slate-950/50':'text-slate-400 bg-slate-100'}`}>{t('wait')}</div>))}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
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
              {userPermissions.canAssign && <button onClick={() => setShowAddAsset(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm no-print"><Plus size={16} /> <span>{t('addAsset')}</span></button>}
              
              {assets.length === 0 && (
                <div className={`p-10 text-center text-slate-500 italic border border-dashed rounded-xl ${theme==='dark'?'border-slate-700 bg-slate-900/50':'border-slate-300 bg-white'}`}>
                   <Box size={48} className="mx-auto mb-4 opacity-30" />
                   Aucun asset trouvé ou créé. {userPermissions.canAssign && 'Cliquez sur "Ajouter Asset" pour commencer.'}
                </div>
              )}

              {sortedCats.map(cat => (
                <div key={cat} className="space-y-4">
                  <h3 className={`font-black text-lg border-b pb-2 ${theme==='dark'?'text-slate-300 border-slate-800':'text-slate-700 border-slate-200'}`}>{cat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {groupedAssets[cat].map(a => {
                      const assignees = getAssignees(a, 'Global');
                      const canUpload = userPermissions.canEdit && (assignees.includes(user.uid) || userPermissions.canAssign);
                      const versions = Array.isArray(a.previews) ? a.previews : [];
                      const activeIdx = selectedVersions[`asset_${a.id}`] ?? (versions.length > 0 ? versions.length - 1 : -1);
                      const activePreview = activeIdx >= 0 ? versions[activeIdx] : null;

                      return (
                      <div key={a.id} className={`border rounded-xl overflow-hidden flex flex-col relative shadow-sm hover:border-slate-400 transition group/asset ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
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
                          <label className={`w-full h-40 flex flex-col items-center justify-center cursor-pointer transition no-print font-bold ${theme==='dark'?'bg-slate-950 hover:bg-slate-900 text-slate-600':'bg-slate-50 hover:bg-slate-100 text-slate-400'}`}>
                            <Upload size={24} className="mb-2"/> <span className="text-xs">Upload V1 (Multiple)</span><input disabled={!canUpload} type="file" multiple accept="image/*" className="hidden" onChange={(e)=>uploadAssetPreviews(a.id, e.target.files, versions)}/>
                          </label>
                        )}
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="font-black text-base truncate pr-2">{a.name}</div>
                            {userPermissions.canAssign ? (
                               <select value={a.priority || 'Normal'} onChange={e => changePriority(a.id, e.target.value, 'assets')} className={`text-[10px] p-0 outline-none bg-transparent cursor-pointer no-print ${theme==='dark'?'text-slate-400':'text-slate-500'}`}>
                                  <option value="Urgent">🔴</option><option value="Normal">🟡</option><option value="Low">🟢</option>
                               </select>
                             ) : <span className="text-[10px]">{a.priority==='Urgent'?'🔴':a.priority==='Low'?'🟢':'🟡'}</span>}
                          </div>
                          
                          <div className="flex justify-between items-center no-print">
                            {userPermissions.canAssign ? <select className={`${inputClass} !p-1 !text-xs w-full font-bold`} value={a.category || ''} onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { category: e.target.value })}>{ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select> : <div className="text-xs text-slate-500 font-bold">{a.category}</div>}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 pt-1 no-print">
                            {assignees.map(uid => (<span key={uid} onClick={() => userPermissions.canAssign && removeAssignee('assets', a.id, 'Global', uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold shadow-sm ${userPermissions.canAssign ? 'cursor-pointer bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-red-100 hover:text-red-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>{members.find(m => m.userId === uid)?.displayName || uid} {userPermissions.canAssign && <X size={10} className="ml-1"/>}</span>))}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 no-print">
                             {(a.tags || []).map(tag => (
                                <span key={tag} className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded flex items-center font-bold">
                                   {tag} {userPermissions.canAssign && <X size={8} className="ml-1 cursor-pointer hover:text-red-500" onClick={()=>removeTag(a.id, 'assets', a.tags, tag)}/>}
                                </span>
                             ))}
                             {userPermissions.canAssign && <button onClick={()=>addTag(a.id, 'assets', a.tags||[])} className="text-[9px] border border-dashed border-slate-400 text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center font-bold"><Plus size={8} className="mr-0.5"/> Tag</button>}
                          </div>
                          
                          {userPermissions.canAssign && (<select className={`${inputClass} !p-1 !text-xs no-print`} value="" onChange={(e) => { if(e.target.value) addAssignee('assets', a.id, 'Global', e.target.value) }}><option value="">+ Assigner</option>{members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select>)}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'time' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-5xl mx-auto mt-6 no-print">
              <div className={`border p-8 rounded-2xl space-y-8 shadow-xl flex flex-col justify-center ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                <h3 className="font-black text-xl text-center">Chronomètre en Direct</h3>
                <div className="space-y-4">
                  <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className={inputClass} disabled={isTimerActive}><option value="">Sélectionner Plan/Asset</option>{[...shots, ...assets].map(tk => <option key={tk.id} value={tk.id}>{tk.name}</option>)}</select>
                  <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)} className={inputClass} disabled={isTimerActive}><option value="">Étape de production</option>{workspace?.pipeline?.map(step => <option key={step} value={step}>{step}</option>)}</select>
                </div>
                <div className="text-center">
                  <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest mb-8 text-blue-600 dark:text-blue-500 drop-shadow break-all">{formatTime(timer)}</div>
                  <div className="flex justify-center">
                    {!isTimerActive ? (<button onClick={() => { if(!selectedTask || !selectedStep) return openModal("Erreur", "Sélectionnez tâche et étape."); setIsTimerActive(true); }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105"><Play size={20} fill="currentColor"/> <span>Démarrer</span></button>) : (<button onClick={handleStopTimer} className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition"><Pause size={20} fill="currentColor"/> <span>Stop & Sauver</span></button>)}
                  </div>
                </div>
              </div>

              <div className={`border p-8 rounded-2xl space-y-6 shadow-xl flex flex-col justify-center ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                <div>
                  <h3 className="font-black text-xl mb-4">{t('manualTime')}</h3>
                  <form onSubmit={handleAddManualTime} className="space-y-4">
                    <div className="flex space-x-4"><div className="flex-1"><label className="text-xs font-bold text-slate-500">Heures</label><input type="number" min="0" value={manualTime.h} onChange={e=>setManualTime({...manualTime, h: e.target.value})} className={inputClass}/></div><div className="flex-1"><label className="text-xs font-bold text-slate-500">Minutes</label><input type="number" min="0" max="59" value={manualTime.m} onChange={e=>setManualTime({...manualTime, m: e.target.value})} className={inputClass}/></div></div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-500 transition shadow-sm">Ajouter au log</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex justify-between items-center no-print">
                <h2 className="text-xl font-bold text-slate-500">Statistiques</h2>
                <button onClick={exportPDFReport} className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-700 transition"><Printer size={16}/> <span>{t('report')}</span></button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`border rounded-xl p-4 text-center ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}><div className="text-3xl font-black text-slate-400">{myStats.todo}</div><div className="text-xs font-bold text-slate-500 uppercase">To Do</div></div>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-blue-600 dark:text-blue-500">{myStats.wip}</div><div className="text-xs font-bold text-blue-700 dark:text-blue-500 uppercase">WIP</div></div>
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-purple-600 dark:text-purple-500">{myStats.review}</div><div className="text-xs font-bold text-purple-700 dark:text-purple-500 uppercase">Review</div></div>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center shadow-sm"><div className="text-3xl font-black text-green-600 dark:text-green-500">{myStats.done}</div><div className="text-xs font-bold text-green-700 dark:text-green-500 uppercase">Done</div></div>
              </div>

              <div className={`border rounded-xl p-6 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                <h3 className="font-black text-xl mb-4 text-blue-600 dark:text-blue-500">Progression Globale du Projet</h3>
                {(() => {
                  let totalTasks = 0; let doneTasks = 0;
                  shots.forEach(s => workspace?.pipeline?.forEach(step => { totalTasks++; if(s.status?.[step]==='done') doneTasks++; }));
                  const pct = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
                  return (
                    <div>
                      <div className="flex justify-between mb-1 text-sm font-bold"><span className="text-slate-600 dark:text-slate-400">{doneTasks} / {totalTasks} Tâches Terminées</span> <span className="text-blue-600 dark:text-blue-500">{pct}%</span></div>
                      <div className={`w-full h-4 rounded-full overflow-hidden ${theme==='dark'?'bg-slate-950':'bg-slate-100 border'}`}>
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className={`border rounded-xl p-6 shadow-sm no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                <h3 className="font-black text-xl mb-6 flex items-center text-blue-600 dark:text-blue-500"><BarChart className="mr-3"/> Logs Récents</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead><tr className={`border-b text-xs uppercase ${theme==='dark'?'border-slate-800 bg-slate-950 text-slate-500':'border-slate-200 bg-slate-50 text-slate-500'}`}>{userPermissions.canAssign && <th className="p-3 font-bold">Membre</th>}<th className="p-3 font-bold">Tâche</th><th className="p-3 font-bold">Étape</th><th className="p-3 font-bold">Temps</th></tr></thead>
                    <tbody className={`divide-y ${theme==='dark'?'divide-slate-800/50':'divide-slate-200'}`}>
                      {timeLogs.filter(log => userPermissions.canAssign || log.userId === user.uid).sort((a,b) => b.date - a.date).slice(0,20).map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">{userPermissions.canAssign && <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{log.userName}</td>}<td className="p-3 font-medium">{log.taskName}</td><td className="p-3 text-slate-500 font-bold">{log.step}</td><td className="p-3 text-blue-600 dark:text-blue-500 font-mono font-bold">{formatTime(log.durationSeconds)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className={`border rounded-xl p-6 max-w-4xl mx-auto shadow-sm no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
              <h3 className="font-black text-xl mb-6 text-blue-600 dark:text-blue-500">Membres ({members.length})</h3>
              <div className="space-y-4">
                {members.map(m => (
                  <div key={m.id} className={`flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 p-4 rounded-xl border shadow-sm ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center space-x-3">
                       <UserCircle size={32} className="text-slate-400 shrink-0"/>
                       <div>
                          <div className="font-black text-base flex items-center space-x-2"><span>{m.displayName}</span> {onlineUsers[m.userId] && <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow" title="En ligne"></div>}</div>
                          <div className="text-xs text-slate-500 font-mono font-bold">{m.email}</div>
                       </div>
                    </div>
                    {userPermissions.role === 'Admin' && m.userId !== user.uid ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                         {m.role === 'Custom' && (
                            <div className="flex items-center space-x-3 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
                               <label className="flex items-center space-x-1 cursor-pointer font-bold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={m.canEdit} onChange={e=>updateDoc(doc(db, 'projectMembers', m.id), { canEdit: e.target.checked })}/><span>Édition</span></label>
                               <label className="flex items-center space-x-1 cursor-pointer font-bold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={m.canAssign} onChange={e=>updateDoc(doc(db, 'projectMembers', m.id), { canAssign: e.target.checked })}/><span>Assigner/Valider</span></label>
                            </div>
                         )}
                         <select className={`${inputClass} !p-2 !w-auto !text-sm !font-black !text-blue-600 dark:!text-blue-400`} value={m.role} onChange={async (e) => await updateDoc(doc(db, 'projectMembers', m.id), { role: e.target.value, canEdit: false, canAssign: false })}>
                           <option value="Guest">Guest (Lecture seule)</option>
                           <option value="Artist">Artist</option>
                           <option value="Supervisor">Supervisor</option>
                           <option value="Admin">Admin</option>
                           <option value="Custom">Custom (Personnalisé)</option>
                         </select>
                      </div>
                    ) : <span className="text-sm text-blue-700 dark:text-blue-400 font-black px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-center shadow-sm">{m.role}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && userPermissions.role === 'Admin' && (
            <div className="space-y-6 max-w-3xl mx-auto pb-10 no-print">
              <div className={`p-6 rounded-xl border ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="font-black text-xl mb-4 text-blue-600 dark:text-blue-500">Configuration Cloudinary</h3>
                <p className="text-sm text-slate-500 mb-4 font-medium">Pour pouvoir uploader des images et des vidéos dans le tracker, vous devez configurer gratuitement une API Cloudinary et lier les clés ici.</p>
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-slate-500">Cloud Name</label><input type="text" placeholder="ex: dp6xxxx" value={cloudNameInput} onChange={e=>setCloudNameInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">Upload Preset (unsigned)</label><input type="text" placeholder="ex: fabrica_preset" value={uploadPresetInput} onChange={e=>setUploadPresetInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">API Key (Pour la suppression)</label><input type="text" placeholder="Clé publique" value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} className={inputClass} /></div>
                  <div><label className="text-xs font-bold text-slate-500">API Secret (Pour la suppression)</label><input type="password" placeholder="Clé secrète" value={apiSecretInput} onChange={e=>setApiSecretInput(e.target.value)} className={inputClass} /></div>
                  <button onClick={() => updateDoc(doc(db, 'workspaces', workspace.id), { cloudinaryCloudName: cloudNameInput, cloudinaryUploadPreset: uploadPresetInput, cloudinaryApiKey: apiKeyInput, cloudinaryApiSecret: apiSecretInput }).then(()=>openModal('Succès', 'Configuration Cloudinary sauvegardée !'))} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition w-full sm:w-auto">Sauvegarder les clés</button>
                </div>
              </div>
              <div className={`p-6 rounded-xl border ${theme==='dark'?'bg-slate-900 border-slate-800 border-red-900/50':'bg-red-50 border-red-200 shadow-sm'}`}>
                 <h3 className="font-black text-xl mb-4 text-red-600 dark:text-red-500">Zone de Danger</h3>
                 <p className="text-sm text-slate-700 dark:text-slate-400 mb-4 font-medium">La suppression d'un projet entraîne la destruction de tous les plans, assets, et logs de temps associés. Cette action est irréversible.</p>
                 <button onClick={deleteProject} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition w-full sm:w-auto">Supprimer le projet définitivement</button>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="max-w-4xl space-y-6 mx-auto pb-10 no-print">
               <div className={`p-8 rounded-xl border space-y-4 shadow-sm ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
                 <h3 className="font-black text-2xl text-blue-600 dark:text-blue-500 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">Guide Rapide - Fabrica Tracker</h3>
                 <p className="text-base text-slate-700 dark:text-slate-300"><b>1. Dashboard :</b> Créez ou rejoignez des projets. Ajoutez vos collègues en amis via leur ID pour discuter en privé.</p>
                 <p className="text-base text-slate-700 dark:text-slate-300"><b>2. Plans & Assets :</b> Ajoutez vos éléments. En tant qu'Admin ou Supervisor, vous pouvez assigner des tâches et changer les statuts des différentes étapes du pipeline.</p>
                 <p className="text-base text-slate-700 dark:text-slate-300"><b>3. Lecteur Vidéo Enrichi :</b> Cliquez sur une miniature pour l'ouvrir. Utilisez l'outil stylo ou texte pour faire des retouches visuelles (Retakes). Les points rouges apparaîtront sur la timeline.</p>
                 <p className="text-base text-slate-700 dark:text-slate-300"><b>4. Chrono :</b> Suivez le temps passé sur chaque étape de vos plans pour générer des statistiques précises dans l'onglet Stats.</p>
                 <p className="text-base text-slate-700 dark:text-slate-300"><b>5. Cloudinary :</b> Le Tracker nécessite un compte Cloudinary gratuit pour stocker les images et vidéos. L'administrateur du projet doit configurer l'API dans l'onglet "Paramètres".</p>
               </div>
            </div>
          )}
        </main>
        
        {reviewItem && reviewPreview && (
          <>
            <div className={`w-1.5 md:w-2 cursor-col-resize shrink-0 transition-colors z-30 no-print ${isResizing ? 'bg-blue-500' : (theme==='dark'?'bg-slate-700 hover:bg-slate-600':'bg-slate-300 hover:bg-slate-400')}`} onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}><div className="h-full flex items-center justify-center opacity-50"><GripVertical size={16} /></div></div>
            <aside style={{ width: reviewPanelWidth }} className={`flex flex-col border-l shadow-2xl z-20 shrink-0 no-print ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-50 border-slate-300'}`}>
              <div className={`flex-1 flex flex-col min-h-[40%] border-b ${theme==='dark'?'border-slate-800':'border-slate-300'}`}>
                <div className={`flex flex-wrap justify-between items-center p-3 shrink-0 ${theme==='dark'?'bg-slate-950/50':'bg-white shadow-sm'}`}>
                  <div>
                    <div className="flex items-center space-x-2"><h3 className="font-black text-lg truncate max-w-[200px]">{reviewItem.name}</h3>{reviewStep !== 'Global' && <span className="text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{reviewStep}</span>}</div>
                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider"><span>V{reviewVersion}</span>{(reviewItem.previews?.[reviewStep]?.length > 1 || (reviewType==='assets' && reviewItem.previews?.length > 1)) && (<label className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"><input type="checkbox" checked={compareMode} onChange={e=>setCompareMode(e.target.checked)} className="mr-1"/>Comparer</label>)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end items-center mt-2 2xl:mt-0">
                    {compareMode && (<select value={compareVersion} onChange={e=>setCompareVersion(e.target.value)} className={`${inputClass} !w-auto !py-1 !text-xs font-bold`}><option value="">-- Comparer --</option>{(reviewType==='shots' ? reviewItem.previews[reviewStep] : reviewItem.previews).map((v, i) => v.version !== reviewVersion && <option key={i} value={i}>V{v.version}</option>)}</select>)}
                    {drawMode && (
                      <div className={`flex border rounded-lg p-0.5 space-x-0.5 ${theme==='dark'?'bg-slate-950 border-slate-800':'bg-slate-100 border-slate-300'}`}>
                        <button onClick={()=>setDrawMode(drawMode==='pen' ? 'text' : 'pen')} className={`p-1.5 rounded transition ${drawMode==='text' ? 'bg-slate-300 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}><Type size={14}/></button>
                        <div className={`px-1 flex items-center border-l border-r space-x-1 ${theme==='dark'?'border-slate-800':'border-slate-300'}`}>{[2, 4, 8].map(sz => (<button key={sz} onClick={() => setBrushSize(sz)} className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${brushSize === sz ? 'bg-slate-300 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}><div className="bg-red-500 rounded-full shadow-sm" style={{ width: sz+2, height: sz+2 }}></div></button>))}</div>
                        <button onClick={() => setStrokes(strokes.slice(0, -1))} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition"><Undo size={14} /></button>
                        <button onClick={() => setStrokes([])} className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-white rounded transition"><Eraser size={14} /></button>
                        {strokes.length > 0 && <button onClick={deleteRetakeFromDB} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition border-l border-slate-300 dark:border-slate-800 ml-0.5 pl-1.5"><Trash2 size={14} /></button>}
                      </div>
                    )}
                    <button onClick={saveAnnotations} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition shadow" title="Enregistrer le point rouge"><Save size={16} /></button>
                    <button onClick={() => setReviewItem(null)} className="ml-2 text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                  </div>
                </div>

                <div className="flex-1 relative bg-black flex flex-col md:flex-row shadow-inner overflow-hidden">
                  <div className="relative flex-1 w-full h-full flex items-center justify-center border-r border-slate-800 min-h-0 bg-slate-900">
                    {reviewPreview.type === 'video' ? (<video ref={videoRef} src={reviewPreview.url} className="max-w-full max-h-full object-contain" onTimeUpdate={(e) => setVideoProgress(e.target.currentTime)} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />) : (<img src={reviewPreview.url} className="max-w-full max-h-full object-contain" />)}
                    <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={endDraw} className="absolute top-0 left-0 w-full h-full z-10 cursor-crosshair" width={1920} height={1080} style={{ width: '100%', height: '100%' }} />
                    {textInputPos && (<input type="text" autoFocus value={textInputValue} onChange={e=>setTextInputValue(e.target.value)} onBlur={commitTextAnnotation} onKeyDown={e=>{if(e.key==='Enter') commitTextAnnotation()}} className="absolute z-20 bg-transparent text-red-500 outline-none border-b-2 border-red-500 font-bold drop-shadow-md" style={{ left: textInputPos.px, top: textInputPos.py, fontSize: `${brushSize * 4}px` }} placeholder="Taper..." />)}
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
                  <div className={`p-3 shrink-0 flex flex-col justify-center ${theme==='dark'?'bg-slate-950/50':'bg-white shadow-sm z-10'}`}>
                    <div className={`relative w-full h-2.5 rounded-full cursor-pointer mb-2 border overflow-hidden shadow-inner ${theme==='dark'?'bg-slate-900 border-slate-800':'bg-slate-200 border-slate-300'}`} onClick={(e) => { if(videoRef.current) { const rect = e.currentTarget.getBoundingClientRect(); const time = ((e.clientX - rect.left) / rect.width) * videoDuration; videoRef.current.currentTime = time; if(compareVideoRef.current) compareVideoRef.current.currentTime = time; } }}>
                      <div className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-75" style={{ width: `${Math.min(100, Math.max(0, (videoProgress / (videoDuration||1)) * 100))}%` }}></div>
                      {Object.keys(reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`] || {}).map(frameTime => (
                        <div key={frameTime} className="absolute top-0 h-full w-2 bg-red-500 shadow-sm border-x border-black" style={{ left: `${(parseFloat(frameTime) / ((videoDuration||1)*FRAMERATE)) * 100}%` }}></div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold mb-3 px-1">
                      <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition" onClick={() => setShowSeconds(!showSeconds)} title="Cliquez pour changer (Frames / Secondes)">
                        {showSeconds ? formatTime(videoProgress) : `${Math.floor(videoProgress * FRAMERATE)} f`}
                      </span>
                      <span>
                        {showSeconds ? formatTime(videoDuration) : `${Math.floor(videoDuration * FRAMERATE)} f`}
                      </span>
                    </div>
                    
                    <div className="flex justify-center items-center space-x-6">
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime -= (1/FRAMERATE);} } }} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition"><SkipBack size={20} /></button>
                      <button onClick={toggleVideoPlay} className="p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-md transform hover:scale-105">{isPlaying ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor" className="ml-0.5" />}</button>
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/FRAMERATE); if(compareVideoRef.current){compareVideoRef.current.pause(); compareVideoRef.current.currentTime += (1/FRAMERATE);} } }} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition"><SkipForward size={20} /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className={`flex border-b text-sm font-bold shadow-sm ${theme==='dark'?'border-slate-800 bg-slate-950/80':'border-slate-300 bg-slate-100'}`}>
                   <button onClick={()=>setReviewTab('chat')} className={`flex-1 p-3 flex items-center justify-center transition ${reviewTab==='chat'?'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900':'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><MessageSquare size={16} className="mr-2"/> Discussions</button>
                   <button onClick={()=>setReviewTab('history')} className={`flex-1 p-3 flex items-center justify-center transition ${reviewTab==='history'?'text-blue-600 dark:text-blue-500 border-b-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900':'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><History size={16} className="mr-2"/> {t('history')}</button>
                </div>
                
                <div className={`flex-1 p-3 overflow-y-auto space-y-3 ${theme==='dark'?'bg-transparent':'bg-slate-50'}`}>
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
                     <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-500 transition shadow-sm"><Plus size={18}/></button>
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
