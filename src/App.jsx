import React, { useState, useEffect, useRef } from 'react';
import { 
  initializeAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, deleteField 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { 
  Film, Box, Settings, Plus, Play, Pause, Trash2, LogOut, 
  Users, Upload, Clock, SkipForward, SkipBack, MonitorPlay, FolderKanban, BarChart, ChevronLeft, UserCircle, PenTool, Save, Key, Eraser, Undo, X, Bell, Download, Clapperboard, AlertTriangle
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
const db = getFirestore(app);

const PIPELINE_2D = ['Animatic', 'Color Script', 'Layout', '2D Background', '2D FX', '2D Anim Rough', '2D Anim Clean', '2D Anim Colo', 'Compositing'];
const PIPELINE_3D = ['Animatic', 'Color Script', 'Layout', 'Modeling', '3D Background', '3D FX', '3D Anim', '3D Lighting', '3D Render', 'Compositing'];
const ASSET_CATEGORIES = ['Model Design', 'Props Design', 'Storyboard', 'Background Concept'];

const dict = {
  en: {
    app: "Fabrica Tracker", login: "Login", register: "Register", pseudo: "Username", email: "Email", pwd: "Password", connect: "Sign In", createAcc: "Create Account", 
    dash: "Dashboard", myProj: "My Projects", noProj: "No projects.", role: "Role", createProj: "Create Project", joinProj: "Join Project", projName: "Project Name", 
    prod2d: "2D Production", prod3d: "3D Production", create: "Create", joinCode: "Invite Code", join: "Join", profile: "My Profile", saveModifs: "Save Changes", 
    shots: "Shots", assets: "Assets", review: "Review & Retake", time: "Time Tracker", stats: "Statistics", team: "Team", settings: "Settings", back: "Projects", logout: "Logout", 
    addShot: "Add Shot", addAsset: "Add Asset", seq: "Sequence", scene: "Scene", shotName: "Name", assign: "Assign", unassigned: "Unassigned", 
    todo: "To Do", wip: "WIP", rev: "Review", reuse: "Reuse", done: "Done", upload: "Upload V1", wait: "Waiting", delShot: "Delete Shot?", delAsset: "Delete Asset?", 
    drawMode: "Drawing", draw: "Draw (Retake)", saveClose: "Save & Close", clearRetake: "Delete Retake", undo: "Undo", clearAll: "Clear", brush: "Brush:", 
    start: "Start", stopSave: "Stop & Save", task: "-- Select Task --", step: "-- Step --", export: "Export Excel",
    danger: "Danger Zone", delProj: "Delete Project", keysInfo: "Keys to upload files to your server:", apiSecretInfo: "(Optional) Required to auto-delete files when project is deleted.",
    saveKeys: "Save Keys", reqSeq: "Sequence: SQ + 2 digits (SQ01).", reqScene: "Scene: SC + 3 digits (SC001).", cancel: "Cancel", delVersion: "Delete version?",
    forgotPwd: "Forgot password?", resetSent: "Password reset email sent!", delAcc: "Delete Account", confirmDel: "Confirm Deletion", typeEmail: "Type email to confirm"
  },
  fr: {
    app: "Fabrica Tracker", login: "Connexion", register: "Inscription", pseudo: "Pseudo", email: "Email", pwd: "Mot de passe", connect: "Se connecter", createAcc: "Créer un compte", 
    dash: "Tableau de bord", myProj: "Mes Projets", noProj: "Aucun projet.", role: "Rôle", createProj: "Créer un projet", joinProj: "Rejoindre un projet", projName: "Nom du projet", 
    prod2d: "Production 2D", prod3d: "Production 3D", create: "Créer", joinCode: "Code d'invitation", join: "Rejoindre", profile: "Mon Profil", saveModifs: "Enregistrer", 
    shots: "Plans (Shots)", assets: "Assets", review: "Review & Retake", time: "Chronomètre", stats: "Statistiques", team: "Équipe", settings: "Paramètres", back: "Projets", logout: "Quitter", 
    addShot: "Ajouter Shot", addAsset: "Ajouter Asset", seq: "Séquence", scene: "Scène", shotName: "Nom", assign: "Assigner", unassigned: "Non assigné", 
    todo: "À faire", wip: "En cours", rev: "Review", reuse: "Réutiliser", done: "Terminé", upload: "Upload V1", wait: "En attente", delShot: "Supprimer ce Shot ?", delAsset: "Supprimer cet Asset ?", 
    drawMode: "Dessin Actif", draw: "Dessiner (Retake)", saveClose: "Sauver & Fermer", clearRetake: "Effacer Retake", undo: "Annuler", clearAll: "Tout effacer", brush: "Pinceau :", 
    start: "Démarrer", stopSave: "Stop & Save", task: "-- Sélectionner Tâche --", step: "-- Étape --", export: "Export Excel",
    danger: "Zone de danger", delProj: "Supprimer le projet", keysInfo: "Clés nécessaires pour héberger les fichiers :", apiSecretInfo: "(Optionnel) Requis pour purger les fichiers du cloud si le projet est supprimé.",
    saveKeys: "Sauvegarder", reqSeq: "Séquence : SQ + 2 chiffres (SQ01).", reqScene: "Scène : SC + 3 chiffres (SC001).", cancel: "Annuler", delVersion: "Supprimer cette version ?",
    forgotPwd: "Mot de passe oublié ?", resetSent: "E-mail de réinitialisation envoyé !", delAcc: "Supprimer mon compte", confirmDel: "Confirmer la suppression", typeEmail: "Tape ton email pour confirmer"
  }
};

// Cryptographie pour signer les requêtes de suppression Cloudinary côté front
const generateCloudinarySignature = async (publicId, timestamp, apiSecret) => {
  const msg = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function App() {
  const [lang, setLang] = useState('en');
  const t = (key) => dict[lang][key] || key;

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('shots');
  
  const [myProjects, setMyProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('2D');
  const [joinCode, setJoinCode] = useState('');
  
  const [profileName, setProfileName] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [workspace, setWorkspace] = useState(null);
  const [userRole, setUserRole] = useState('Artist');
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

  const [showAddShot, setShowAddShot] = useState(false);
  const [addSeq, setAddSeq] = useState('SQ01');
  const [addScene, setAddScene] = useState('SC001');
  const [addName, setAddName] = useState('SH010');

  // REVIEW STATES
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewType, setReviewType] = useState('shots');
  const [reviewStep, setReviewStep] = useState(null);
  const [reviewVersion, setReviewVersion] = useState(null);
  const [reviewPreview, setReviewPreview] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) { setUserData({ id: uDoc.id, ...uDoc.data() }); setProfileName(uDoc.data().displayName); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qProjects = query(collection(db, 'projectMembers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(qProjects, (snap) => setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!workspace) return;
    const unsubShots = onSnapshot(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id)), (snap) => setShots(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAssets = onSnapshot(query(collection(db, 'assets'), where('workspaceId', '==', workspace.id)), (snap) => setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubMembers = onSnapshot(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id)), (snap) => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLogs = onSnapshot(query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id)), (snap) => setTimeLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    setCloudNameInput(workspace.cloudinaryCloudName || ''); 
    setUploadPresetInput(workspace.cloudinaryUploadPreset || '');
    setApiKeyInput(workspace.cloudinaryApiKey || '');
    setApiSecretInput(workspace.cloudinaryApiSecret || '');
    return () => { unsubShots(); unsubAssets(); unsubMembers(); unsubLogs(); };
  }, [workspace]);

  useEffect(() => {
    if (reviewItem) {
      const freshItem = reviewType === 'shots' ? shots.find(s => s.id === reviewItem.id) : assets.find(a => a.id === reviewItem.id);
      if (freshItem) setReviewItem(freshItem);
    }
  }, [shots, assets]);

  useEffect(() => {
    let interval = null;
    if (isTimerActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (s) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        if(!authName) return alert(t('pseudo'));
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', res.user.uid), { email: authEmail, displayName: authName });
        setUserData({ id: res.user.uid, email: authEmail, displayName: authName });
      } else { await signInWithEmailAndPassword(auth, authEmail, authPassword); }
      setCurrentView('dashboard');
    } catch (err) { alert(err.message); }
  };

  const handleForgotPassword = async () => {
    if(!authEmail) return alert(t('email'));
    try { await sendPasswordResetEmail(auth, authEmail); alert(t('resetSent')); } 
    catch(err) { alert(err.message); }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if(!profileName) return;
    await updateDoc(doc(db, 'users', user.uid), { displayName: profileName });
    setUserData({...userData, displayName: profileName});
    const snap = await getDocs(query(collection(db, 'projectMembers'), where('userId', '==', user.uid)));
    snap.forEach(d => updateDoc(d.ref, { displayName: profileName }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user.email) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await user.delete();
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') { alert("Sécurité : Veuillez vous déconnecter et vous reconnecter avant de supprimer le compte."); } 
      else { alert(err.message); }
    }
  };

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
    if (!wsDoc.exists() || myProjects.find(p => p.workspaceId === joinCode)) return alert("Code invalide / Déjà rejoint");
    await addDoc(collection(db, 'projectMembers'), { workspaceId: wsDoc.id, workspaceName: wsDoc.data().name, userId: user.uid, displayName: userData.displayName, email: user.email, role: 'Artist' });
    setJoinCode('');
  };

  // Suppression des médias depuis Cloudinary API
  const deleteMediaFromCloudinary = async (url) => {
    if (!workspace?.cloudinaryApiKey || !workspace?.cloudinaryApiSecret || !workspace?.cloudinaryCloudName) return;
    try {
      const parts = url.split('/upload/');
      if (parts.length !== 2) return;
      const path = parts[1].split('/');
      if (path[0].match(/^v\d+$/)) path.shift();
      const publicIdWithExt = path.join('/');
      const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await generateCloudinarySignature(publicId, timestamp, workspace.cloudinaryApiSecret);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', workspace.cloudinaryApiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      
      const resourceType = url.includes('/video/') ? 'video' : 'image';
      await fetch(`https://api.cloudinary.com/v1_1/${workspace.cloudinaryCloudName}/${resourceType}/destroy`, { method: 'POST', body: formData });
    } catch(err) { console.error("Cloudinary Delete Error:", err); }
  };

  const deleteProject = async () => {
    const conf = window.prompt(`Type "${workspace?.name}" to delete:`);
    if (conf === workspace?.name) {
      setUploadingMedia(true);
      // Scan and delete all files in Cloudinary if Keys exist
      for (const s of shots) {
        if(s.previews) {
          for (const step in s.previews) {
            for (const v of s.previews[step]) { if(v.url) await deleteMediaFromCloudinary(v.url); }
          }
        }
      }
      for (const a of assets) {
        if(a.previews) {
          for (const v of a.previews) {
            if(v.files) { for (const f of v.files) { if(f.url) await deleteMediaFromCloudinary(f.url); } }
          }
        }
      }
      // Delete from Firestore
      const snapMembers = await getDocs(query(collection(db, 'projectMembers'), where('workspaceId', '==', workspace.id)));
      snapMembers.forEach(d => deleteDoc(d.ref));
      const snapShots = await getDocs(query(collection(db, 'shots'), where('workspaceId', '==', workspace.id)));
      snapShots.forEach(d => deleteDoc(d.ref));
      const snapAssets = await getDocs(query(collection(db, 'assets'), where('workspaceId', '==', workspace.id)));
      snapAssets.forEach(d => deleteDoc(d.ref));
      const snapLogs = await getDocs(query(collection(db, 'timeLogs'), where('workspaceId', '==', workspace.id)));
      snapLogs.forEach(d => deleteDoc(d.ref));
      
      await deleteDoc(doc(db, 'workspaces', workspace.id));
      setUploadingMedia(false);
      setCurrentView('dashboard');
    }
  };

  const handleAddShot = async (e) => {
    e.preventDefault();
    if (!/^SQ\d{2,}$/.test(addSeq)) return alert(t('reqSeq'));
    if (!/^SC\d{3,}$/.test(addScene)) return alert(t('reqScene'));
    await addDoc(collection(db, 'shots'), { sequence: addSeq, scene: addScene, name: addName, workspaceId: workspace.id, status: {}, assignedTo: {}, previews: {} });
    setShowAddShot(false);
  };

  const deletePreview = async (id, step, versionIndex, currentVersions, collectionType = 'shots') => {
    if(!window.confirm(t('delVersion'))) return;
    const versionToDelete = currentVersions[versionIndex];
    if (versionToDelete) {
      if (collectionType === 'shots' && versionToDelete.url) await deleteMediaFromCloudinary(versionToDelete.url);
      if (collectionType === 'assets' && versionToDelete.files) {
        for (const f of versionToDelete.files) { await deleteMediaFromCloudinary(f.url); }
      }
    }
    const newVersions = currentVersions.filter((_, i) => i !== versionIndex);
    const updateObj = collectionType === 'shots' ? { [`previews.${step}`]: newVersions } : { previews: newVersions };
    await updateDoc(doc(db, collectionType, id), updateObj);
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

  const getAssignees = (item, step) => Array.isArray(item.assignedTo?.[step]) ? item.assignedTo[step] : (item.assignedTo?.[step] ? [item.assignedTo[step]] : []);
  
  const addAssignee = async (collectionName, id, step, userId) => {
    const item = collectionName === 'shots' ? shots.find(s=>s.id===id) : assets.find(a=>a.id===id);
    const current = getAssignees(item, step);
    if(!current.includes(userId)) await updateDoc(doc(db, collectionName, id), { [`assignedTo.${step}`]: [...current, userId] });
  };

  const removeAssignee = async (collectionName, id, step, userId) => {
    const item = collectionName === 'shots' ? shots.find(s=>s.id===id) : assets.find(a=>a.id===id);
    const current = getAssignees(item, step);
    await updateDoc(doc(db, collectionName, id), { [`assignedTo.${step}`]: current.filter(u => u !== userId) });
  };

  const saveStorageSettings = async (e) => {
    e.preventDefault();
    if (!workspace) return;
    await updateDoc(doc(db, 'workspaces', workspace.id), {
      cloudinaryCloudName: cloudNameInput,
      cloudinaryUploadPreset: uploadPresetInput,
      cloudinaryApiKey: apiKeyInput,
      cloudinaryApiSecret: apiSecretInput
    });
    setWorkspace({ ...workspace, cloudinaryCloudName: cloudNameInput, cloudinaryUploadPreset: uploadPresetInput, cloudinaryApiKey: apiKeyInput, cloudinaryApiSecret: apiSecretInput });
    alert("Clés de stockage sauvegardées !");
  };

  const uploadMediaToCloud = async (file) => {
    const cloudName = workspace?.cloudinaryCloudName; const uploadPreset = workspace?.cloudinaryUploadPreset;
    if (!cloudName || !uploadPreset) { alert("Missing Cloudinary Keys in Settings!"); return null; }
    const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', uploadPreset);
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { url: data.secure_url, type: resourceType };
  };

  const uploadShotPreview = async (shotId, step, file, currentVersions = []) => {
    if (!file) return; setUploadingMedia(true);
    try {
      const uploaded = await uploadMediaToCloud(file);
      if (uploaded?.url) {
        const newVersion = { url: uploaded.url, type: uploaded.type, version: currentVersions.length + 1, date: new Date().toISOString() };
        await updateDoc(doc(db, 'shots', shotId), { [`previews.${step}`]: [...currentVersions, newVersion] });
      }
    } catch(err) {}
    setUploadingMedia(false);
  };

  const uploadAssetPreviews = async (assetId, filesList, currentVersions = []) => {
    if(!filesList || filesList.length === 0) return; setUploadingMedia(true);
    try {
      const files = Array.from(filesList);
      const uploadedFiles = [];
      for(const f of files) {
        const res = await uploadMediaToCloud(f);
        if(res) uploadedFiles.push(res);
      }
      if (uploadedFiles.length > 0) {
        const newV = { version: currentVersions.length + 1, files: uploadedFiles, date: new Date().toISOString() };
        await updateDoc(doc(db, 'assets', assetId), { previews: [...currentVersions, newV] });
      }
    } catch(err) { alert(err.message); }
    setUploadingMedia(false);
  };

  const openReview = (item, step, version, previewObj, type = 'shots') => {
    setReviewItem(item); setReviewType(type); setReviewStep(step); setReviewVersion(version); setReviewPreview(previewObj);
    setActiveTab('review'); setStrokes([]); setCurrentStroke(null);
  };

  const getAnnotationKey = () => {
    if(!reviewItem || !reviewStep || !reviewPreview) return null;
    if(reviewPreview.type === 'video') return Math.floor(videoProgress * 24);
    if(reviewType === 'assets') return `image_${reviewPreview.fileIndex}`;
    return 'image';
  };

  useEffect(() => {
    const key = getAnnotationKey();
    if(key && reviewItem?.annotations?.[reviewStep]?.[`v${reviewVersion}`]?.[key]) {
      setStrokes(JSON.parse(reviewItem.annotations[reviewStep][`v${reviewVersion}`][key]));
    } else setStrokes([]);
  }, [videoProgress, reviewItem, reviewStep, reviewVersion]);

  const drawOnCanvas = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.lineCap = 'round';
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      if(!stroke || !stroke.points || stroke.points.length < 2) return;
      ctx.strokeStyle = 'red'; ctx.lineWidth = stroke.size || 3;
      ctx.beginPath(); ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
      for(let i=1; i<stroke.points.length; i++) ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      ctx.stroke();
    });
  };

  useEffect(() => { drawOnCanvas(); }, [strokes, currentStroke]);

  const startDraw = (e) => {
    if(!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    setCurrentStroke({ size: brushSize, points: [{ x: x/rect.width, y: y/rect.height }] });
  };
  const onDraw = (e) => {
    if(!isDrawing || !currentStroke) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    setCurrentStroke(prev => ({ ...prev, points: [...prev.points, { x: x/rect.width, y: y/rect.height }] }));
  };
  const endDraw = () => {
    if(!isDrawing || !currentStroke) return;
    setStrokes([...strokes, currentStroke]); setCurrentStroke(null);
  };

  const saveAnnotations = async () => {
    const key = getAnnotationKey(); if(!key || !reviewItem) return;
    await updateDoc(doc(db, reviewType, reviewItem.id), { [`annotations.${reviewStep}.v${reviewVersion}.${key}`]: JSON.stringify(strokes) });
    setReviewItem(null); setActiveTab(reviewType);
  };

  const deleteRetakeFromDB = async () => {
    const key = getAnnotationKey(); if(!key || !reviewItem) return;
    await updateDoc(doc(db, reviewType, reviewItem.id), { [`annotations.${reviewStep}.v${reviewVersion}.${key}`]: deleteField() });
    
    if (reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`]) {
      delete reviewItem.annotations[reviewStep][`v${reviewVersion}`][key];
      if (Object.keys(reviewItem.annotations[reviewStep][`v${reviewVersion}`]).length === 0) {
        delete reviewItem.annotations[reviewStep][`v${reviewVersion}`];
      }
    }
    setStrokes([]);
    setReviewItem({ ...reviewItem });
  };

  // EXPORT XML EXCEL (Vraies couleurs natives pour garantir l'affichage sur Excel)
  const getXMLStyleID = (st) => {
    switch(st) {
      case 'wip': return 'sWip';
      case 'review': return 'sReview';
      case 'reuse': return 'sReuse';
      case 'done': return 'sDone';
      default: return 'sTodo';
    }
  };

  const exportExcel = () => {
    if(!workspace) return;
    let xml = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Styles>
          <Style ss:ID="Default" ss:Name="Normal">
            <Alignment ss:Vertical="Bottom"/>
            <Borders/>
            <Font ss:FontName="Arial" ss:Size="10" ss:Color="#000000"/>
            <Interior/>
          </Style>
          <Style ss:ID="sHeader">
            <Font ss:FontName="Arial" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
            <Interior ss:Color="#1e293b" ss:Pattern="Solid"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders>
          </Style>
          <Style ss:ID="sTodo">
            <Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/>
            <Font ss:Color="#475569" ss:Bold="1"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/></Borders>
          </Style>
          <Style ss:ID="sWip">
            <Interior ss:Color="#bfdbfe" ss:Pattern="Solid"/>
            <Font ss:Color="#1e40af" ss:Bold="1"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/></Borders>
          </Style>
          <Style ss:ID="sReview">
            <Interior ss:Color="#e9d5ff" ss:Pattern="Solid"/>
            <Font ss:Color="#6b21a8" ss:Bold="1"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/></Borders>
          </Style>
          <Style ss:ID="sReuse">
            <Interior ss:Color="#fed7aa" ss:Pattern="Solid"/>
            <Font ss:Color="#c2410c" ss:Bold="1"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/></Borders>
          </Style>
          <Style ss:ID="sDone">
            <Interior ss:Color="#bbf7d0" ss:Pattern="Solid"/>
            <Font ss:Color="#166534" ss:Bold="1"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/></Borders>
          </Style>
        </Styles>
        <Worksheet ss:Name="Tracker">
          <Table>
    `;

    xml += `<Row>`;
    xml += `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${t('seq')}</Data></Cell>`;
    xml += `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${t('scene')}</Data></Cell>`;
    xml += `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${t('shotName')}</Data></Cell>`;
    workspace.pipeline.forEach(step => {
       xml += `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${step}</Data></Cell>`;
    });
    xml += `</Row>`;
    
    const sortedShots = [...shots].sort((a,b)=> a.sequence.localeCompare(b.sequence) || a.scene.localeCompare(b.scene));
    sortedShots.forEach(s => {
       xml += `<Row>`;
       xml += `<Cell><Data ss:Type="String">${s.sequence}</Data></Cell>`;
       xml += `<Cell><Data ss:Type="String">${s.scene}</Data></Cell>`;
       xml += `<Cell><Data ss:Type="String">${s.name}</Data></Cell>`;
       workspace.pipeline.forEach(step => {
          const st = s.status?.[step] || 'todo';
          const styleId = getXMLStyleID(st);
          const text = dict[lang][st] || st;
          xml += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${text}</Data></Cell>`;
       });
       xml += `</Row>`;
    });
    
    xml += `</Table></Worksheet></Workbook>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${workspace.name.replace(/\s+/g, '_')}_Tracker.xml`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const canAssign = ['Admin', 'Supervisor'].includes(userRole);
  const getThumbnail = (obj) => obj ? (obj.type === 'video' ? obj.url.replace(/\.[^/.]+$/, ".jpg") : obj.url) : "";
  
  const getStatusColor = (st) => {
    switch(st) {
      case 'wip': return 'bg-blue-900/40 text-blue-400 border-blue-700';
      case 'review': return 'bg-purple-900/40 text-purple-400 border-purple-700';
      case 'reuse': return 'bg-orange-900/40 text-orange-400 border-orange-700';
      case 'done': return 'bg-green-900/40 text-green-400 border-green-700';
      default: return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  const pendingReviews = shots.filter(s => workspace?.pipeline?.some(step => s.status?.[step] === 'review'));

  const myAssignedTasks = shots.filter(s => workspace?.pipeline?.some(step => getAssignees(s, step).includes(user?.uid)));
  const myStats = { todo: 0, wip: 0, review: 0, done: 0 };
  myAssignedTasks.forEach(s => {
    workspace?.pipeline?.forEach(step => {
      if(getAssignees(s, step).includes(user?.uid)) {
        const st = s.status?.[step] || 'todo';
        if(myStats[st] !== undefined) myStats[st]++;
      }
    });
  });

  const groupedShots = shots.reduce((acc, s) => { (acc[s.sequence] = acc[s.sequence] || []).push(s); return acc; }, {});
  const sortedSeqs = Object.keys(groupedShots).sort();
  const groupedAssets = assets.reduce((acc, a) => { (acc[a.category] = acc[a.category] || []).push(a); return acc; }, {});
  const sortedCats = Object.keys(groupedAssets).sort();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative">
        <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="absolute bottom-6 left-6 flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-800 hover:bg-slate-800 transition">
          <span className="text-xl">{lang === 'en' ? '🇬🇧' : '🇫🇷'}</span> <span className="font-bold">{lang === 'en' ? 'EN' : 'FR'}</span>
        </button>
        <form onSubmit={handleAuth} className="bg-slate-900 border border-slate-800 p-8 rounded-xl w-full max-w-md space-y-5 shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-2 mb-2">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Clapperboard size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('app')}</h1>
          </div>

          <div className="flex space-x-2 border-b border-slate-800 pb-2">
            <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 pb-2 ${authMode === 'login' ? 'text-blue-400 font-bold border-b-2 border-blue-500' : 'text-slate-500'}`}>{t('login')}</button>
            <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 pb-2 ${authMode === 'register' ? 'text-blue-400 font-bold border-b-2 border-blue-500' : 'text-slate-500'}`}>{t('register')}</button>
          </div>
          {authMode === 'register' && <input type="text" placeholder={t('pseudo')} value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded focus:border-blue-500 outline-none" />}
          <input type="email" placeholder={t('email')} value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded focus:border-blue-500 outline-none" required />
          <input type="password" placeholder={t('pwd')} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded focus:border-blue-500 outline-none" required />
          
          {authMode === 'login' && (
            <div className="text-right">
              <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 hover:underline">{t('forgotPwd')}</button>
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded transition">{authMode === 'login' ? t('connect') : t('createAcc')}</button>
        </form>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative">
        <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="absolute bottom-6 left-6 flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-800 hover:bg-slate-800 transition">
          <span className="text-xl">{lang === 'en' ? '🇬🇧' : '🇫🇷'}</span> <span className="font-bold">{lang === 'en' ? 'EN' : 'FR'}</span>
        </button>
        <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
              <Clapperboard size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">{t('app')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentView('profile')} className="flex items-center space-x-2 text-slate-400 hover:text-white bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"><UserCircle size={20} /> <span className="text-sm font-medium">{userData?.displayName}</span></button>
            <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 p-2"><LogOut size={20} /></button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center"><FolderKanban className="mr-2 text-blue-500" /> {t('myProj')}</h2>
            <div className="space-y-3">
              {myProjects.length === 0 ? <p className="text-slate-500 italic">{t('noProj')}</p> : null}
              {myProjects.map(p => (
                <div key={p.id} onClick={async () => {
                  const wsDoc = await getDoc(doc(db, 'workspaces', p.workspaceId));
                  if(wsDoc.exists()) { setWorkspace({ id: wsDoc.id, ...wsDoc.data() }); setUserRole(p.role); setCurrentView('workspace'); setActiveTab('shots'); }
                }} className="bg-slate-950 border border-slate-800 p-4 rounded-lg cursor-pointer hover:border-blue-500 flex justify-between items-center transition">
                  <div><h3 className="font-bold text-lg">{p.workspaceName}</h3><p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{t('role')} : <span className="text-blue-400 font-bold">{p.role}</span></p></div>
                  <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-500"><Play size={18} className="ml-1" /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <form onSubmit={createProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">{t('createProj')}</h2>
              <input type="text" placeholder={t('projName')} value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded outline-none focus:border-blue-500" required />
              <select value={newProjectType} onChange={(e) => setNewProjectType(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded outline-none">
                <option value="2D">{t('prod2d')}</option><option value="3D">{t('prod3d')}</option>
              </select>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded transition">{t('create')}</button>
            </form>
            <form onSubmit={joinProject} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-bold">{t('joinProj')}</h2>
              <input type="text" placeholder={t('joinCode')} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded font-mono text-sm text-center tracking-widest outline-none focus:border-blue-500" required />
              <button type="submit" className="w-full py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded transition">{t('join')}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6 absolute top-6 left-6"><ChevronLeft size={20} /> <span>{t('back')}</span></button>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl w-full max-w-md space-y-6">
          <h2 className="text-2xl font-bold text-center">{t('profile')}</h2>
          <form onSubmit={updateProfile} className="space-y-6">
            <div className="space-y-2"><label className="text-sm text-slate-400">{t('email')}</label><input type="email" value={userData?.email} disabled className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-500 cursor-not-allowed" /></div>
            <div className="space-y-2"><label className="text-sm text-slate-400">{t('pseudo')}</label><input type="text" value={profileName} onChange={(e)=>setProfileName(e.target.value)} className="w-full p-2 bg-slate-950 border border-slate-800 rounded outline-none focus:border-blue-500" required /></div>
            
            <button type="button" onClick={handleForgotPassword} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded transition">{t('forgotPwd')}</button>
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded transition">{t('saveModifs')}</button>
          </form>

          <div className="pt-6 mt-6 border-t border-slate-800">
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full py-2 bg-red-950 hover:bg-red-900 text-red-500 font-bold rounded transition">{t('delAcc')}</button>
            ) : (
              <div className="space-y-3 bg-red-950/30 p-4 border border-red-900 rounded-lg">
                <p className="text-xs text-red-400 text-center font-bold uppercase">{t('confirmDel')}</p>
                <input type="text" placeholder={t('typeEmail')} value={deleteConfirmText} onChange={(e)=>setDeleteConfirmText(e.target.value)} className="w-full p-2 bg-slate-950 border border-red-900 rounded outline-none focus:border-red-500 text-sm text-center" />
                <div className="flex space-x-2">
                  <button onClick={() => {setShowDeleteConfirm(false); setDeleteConfirmText('');}} className="flex-1 py-2 bg-slate-800 rounded text-sm font-bold">{t('cancel')}</button>
                  <button onClick={handleDeleteAccount} className={`flex-1 py-2 rounded text-sm font-bold transition ${deleteConfirmText === user.email ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-950 text-red-800 cursor-not-allowed'}`}>{t('delAcc')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {showAddShot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddShot} className="bg-slate-900 p-6 rounded-xl border border-slate-800 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">{t('addShot')}</h3>
            <div><label className="text-xs text-slate-400">{t('seq')}</label><input type="text" value={addSeq} onChange={(e)=>setAddSeq(e.target.value.toUpperCase())} className="w-full p-2 mt-1 bg-slate-950 border border-slate-800 rounded font-mono" required/></div>
            <div><label className="text-xs text-slate-400">{t('scene')}</label><input type="text" value={addScene} onChange={(e)=>setAddScene(e.target.value.toUpperCase())} className="w-full p-2 mt-1 bg-slate-950 border border-slate-800 rounded font-mono" required/></div>
            <div><label className="text-xs text-slate-400">{t('shotName')}</label><input type="text" value={addName} onChange={(e)=>setAddName(e.target.value.toUpperCase())} className="w-full p-2 mt-1 bg-slate-950 border border-slate-800 rounded font-mono" required/></div>
            <div className="flex space-x-3 pt-2">
              <button type="button" onClick={() => setShowAddShot(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded font-bold">{t('cancel')}</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold">{t('create')}</button>
            </div>
          </form>
        </div>
      )}

      <aside className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 h-screen sticky top-0">
        <div className="space-y-6">
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center space-x-2 text-slate-400 hover:text-white mb-4 transition-colors"><ChevronLeft size={20} /> <span className="hidden md:inline font-bold">{t('back')}</span></button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shrink-0">
              <Clapperboard size={18} className="text-white" />
            </div>
            <div className="text-sm font-black text-white hidden md:block leading-tight truncate">{workspace?.name}</div>
          </div>

          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab('shots')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'shots' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Film size={18} /> <span className="hidden md:inline font-medium">{t('shots')}</span></button>
            <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'assets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Box size={18} /> <span className="hidden md:inline font-medium">{t('assets')}</span></button>
            <button onClick={() => setActiveTab('review')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'review' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><MonitorPlay size={18} /> <span className="hidden md:inline font-medium">{t('review')}</span></button>
            <button onClick={() => setActiveTab('time')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'time' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Clock size={18} /> <span className="hidden md:inline font-medium">{t('time')}</span></button>
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><BarChart size={18} /> <span className="hidden md:inline font-medium">{t('stats')}</span></button>
            <button onClick={() => setActiveTab('team')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Users size={18} /> <span className="hidden md:inline font-medium">{t('team')}</span></button>
            {userRole === 'Admin' && <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 p-2 rounded transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Settings size={18} /> <span className="hidden md:inline font-medium">{t('settings')}</span></button>}
            
            <div className="pt-4 mt-4 border-t border-slate-800">
              <button onClick={exportExcel} className="w-full flex items-center space-x-3 p-2 rounded text-emerald-400 hover:bg-emerald-900/30 transition-colors"><Download size={18} /> <span className="hidden md:inline font-medium">{t('export')}</span></button>
            </div>
          </nav>
        </div>
        <div className="flex flex-col space-y-4">
          <button onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} className="flex items-center justify-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800 hover:bg-slate-800 transition text-sm">
            <span className="text-lg">{lang === 'en' ? '🇬🇧' : '🇫🇷'}</span> <span className="hidden md:inline font-bold">{lang === 'en' ? 'EN' : 'FR'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto relative">
        {uploadingMedia && <div className="fixed top-4 right-4 bg-blue-600 px-4 py-2 rounded text-sm animate-pulse shadow-lg z-50">Upload / Delete...</div>}
        
        <header className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight">{t(activeTab)}</h2>
          <div className="flex items-center space-x-6">
            {['Admin', 'Supervisor'].includes(userRole) && (
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-white transition">
                  <Bell size={20} />
                  {pendingReviews.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">{pendingReviews.length}</span>}
                </button>
                {showNotifications && (
                  <div className="absolute top-10 right-0 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 p-3 max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-bold border-b border-slate-800 pb-2 mb-2">Pending Reviews</h4>
                    {pendingReviews.length === 0 ? <p className="text-xs text-slate-500">All clear!</p> : pendingReviews.map(s => (
                      <div key={s.id} className="text-xs p-2 bg-slate-950 rounded mb-1 border border-slate-800 cursor-pointer hover:bg-slate-800" onClick={()=>{setActiveTab('shots'); setShowNotifications(false);}}>
                        <span className="font-bold text-blue-400">{s.name}</span> is ready for review.
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 uppercase tracking-wider">{t('role')} : <span className="text-blue-400 font-bold ml-1">{userRole}</span></p>
          </div>
        </header>

        {activeTab === 'shots' && (
          <div className="space-y-6">
            {canAssign && <button onClick={() => setShowAddShot(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold text-sm transition shadow-lg"><Plus size={16} /> <span>{t('addShot')}</span></button>}
            
            {sortedSeqs.length === 0 ? <p className="text-slate-500 italic p-4 text-center">Aucun plan créé.</p> : sortedSeqs.map(seq => (
              <div key={seq} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-950/50 p-3 border-b border-slate-800 font-black text-blue-400 tracking-widest text-sm flex items-center"><Film size={16} className="mr-2 opacity-50"/> {seq}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase bg-slate-900">
                        <th className="p-3 sticky left-0 bg-slate-900 z-10 w-48 font-semibold">{t('scene')} / {t('shotName')}</th>
                        {workspace?.pipeline?.map(step => <th key={step} className="p-3 min-w-[240px] border-l border-slate-800 font-semibold">{step}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {groupedShots[seq].sort((a,b)=> a.scene.localeCompare(b.scene)).map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="p-3 font-medium sticky left-0 bg-slate-900 z-10 align-top">
                            <div className="flex justify-between items-start">
                              <div><div className="text-slate-300 font-mono text-xs mb-0.5">{s.scene}</div><div className="font-bold text-base">{s.name}</div></div>
                              {canAssign && <button onClick={() => { if(window.confirm(t('delShot'))) deleteDoc(doc(db, 'shots', s.id)) }} className="text-slate-700 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                            </div>
                          </td>
                          {workspace?.pipeline?.map(step => {
                            const assignees = getAssignees(s, step);
                            const canUpload = assignees.includes(user.uid) || canAssign;
                            const versions = Array.isArray(s.previews?.[step]) ? s.previews[step] : [];
                            const activeIdx = selectedVersions[`${s.id}_${step}`] ?? (versions.length > 0 ? versions.length - 1 : -1);
                            const activePreview = activeIdx >= 0 ? versions[activeIdx] : null;

                            return (
                              <td key={step} className="p-3 border-l border-slate-800/50 align-top space-y-2">
                                <div className="flex flex-col space-y-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {assignees.map(uid => (
                                      <span key={uid} onClick={() => canAssign && removeAssignee('shots', s.id, step, uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold ${canAssign ? 'cursor-pointer bg-blue-900/40 text-blue-300 hover:bg-red-900/50 hover:text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                                        {members.find(m => m.userId === uid)?.displayName || t('unassigned')} {canAssign && <X size={10} className="ml-1"/>}
                                      </span>
                                    ))}
                                  </div>
                                  
                                  {canAssign && (
                                    <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-400 outline-none w-full" value="" onChange={(e) => { if(e.target.value) addAssignee('shots', s.id, step, e.target.value) }}>
                                      <option value="">+ {t('assign')}</option>
                                      {members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                                    </select>
                                  )}

                                  <select className={`rounded p-1 text-xs font-semibold outline-none transition-colors border ${getStatusColor(s.status?.[step])}`} value={s.status?.[step] || 'todo'} onChange={async (e) => await updateDoc(doc(db, 'shots', s.id), { [`status.${step}`]: e.target.value })}>
                                    <option value="todo">{t('todo')}</option><option value="wip">{t('wip')}</option><option value="review">{t('rev')}</option><option value="reuse">{t('reuse')}</option><option value="done">{t('done')}</option>
                                  </select>
                                </div>
                                
                                <div className="pt-2 border-t border-slate-800/50 h-[4.5rem]">
                                  {activePreview ? (
                                    <div className="flex flex-col w-full space-y-1">
                                      <div className="flex justify-between items-center px-0.5">
                                        {versions.length > 1 ? (
                                          <select value={activeIdx} onChange={(e) => setSelectedVersions({...selectedVersions, [`${s.id}_${step}`]: parseInt(e.target.value)})} className="bg-transparent text-xs text-slate-300 outline-none font-bold">
                                            {versions.map((v, i) => <option key={i} value={i} className="bg-slate-900">V{v.version}</option>)}
                                          </select>
                                        ) : <span className="text-xs font-bold text-slate-400">V1</span>}
                                        <div className="flex space-x-2 text-slate-500">
                                          {canUpload && (
                                            <label className="cursor-pointer hover:text-blue-400 transition" title="Upload New Version"><Upload size={14}/><input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} /></label>
                                          )}
                                          {canUpload && (
                                            <button onClick={() => deletePreview(s.id, step, activeIdx, versions, 'shots')} className="hover:text-red-400 transition" title="Delete Version"><Trash2 size={14}/></button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="relative w-full h-12 bg-slate-950 rounded border border-slate-800 group/preview cursor-pointer overflow-hidden shadow-sm" onClick={() => openReview(s, step, activePreview.version, activePreview, 'shots')}>
                                        <img src={getThumbnail(activePreview)} className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition duration-300" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover/preview:bg-blue-600/20 transition duration-300">
                                          <MonitorPlay size={18} className="text-white opacity-0 group-hover/preview:opacity-100 drop-shadow-md transform scale-75 group-hover/preview:scale-100 transition-all" />
                                        </div>
                                        {s.annotations?.[step]?.[`v${activePreview.version}`] && Object.keys(s.annotations[step][`v${activePreview.version}`]).length > 0 && (
                                          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow" title="Retake !"></div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    canUpload ? (
                                      <label className="text-xs flex flex-col items-center justify-center bg-slate-950 border border-slate-800 border-dashed hover:border-blue-500 hover:text-blue-400 text-slate-500 w-full rounded cursor-pointer h-full transition group/up">
                                        <Upload size={16} className="mb-1 group-hover/up:-translate-y-0.5 transition-transform"/> <span>{t('upload')}</span>
                                        <input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" onChange={(e)=>uploadShotPreview(s.id, step, e.target.files[0], versions)} />
                                      </label>
                                    ) : (
                                      <div className="text-xs text-slate-600 w-full h-full flex items-center justify-center italic bg-slate-950/50 rounded">{t('wait')}</div>
                                    )
                                  )}
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
            {canAssign && <button onClick={async () => { const n = prompt(t('shotName')); if (n) await addDoc(collection(db, 'assets'), { name: n, category: 'Model Design', workspaceId: workspace.id, assignedTo: {} }); }} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold text-sm shadow-lg"><Plus size={16} /> <span>{t('addAsset')}</span></button>}
            
            {sortedCats.length === 0 ? <p className="text-slate-500 italic p-4 text-center">Aucun asset.</p> : sortedCats.map(cat => (
              <div key={cat} className="space-y-4">
                <h3 className="font-black text-lg text-slate-300 border-b border-slate-800 pb-2">{cat}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupedAssets[cat].map(a => {
                    const assignees = getAssignees(a, 'Global');
                    const canUpload = assignees.includes(user.uid) || canAssign;
                    const versions = Array.isArray(a.previews) ? a.previews : [];
                    const activeIdx = selectedVersions[`asset_${a.id}`] ?? (versions.length > 0 ? versions.length - 1 : -1);
                    const activePreview = activeIdx >= 0 ? versions[activeIdx] : null;

                    return (
                    <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative shadow-sm hover:border-slate-700 transition group/asset">
                      {canAssign && <button onClick={() => { if(window.confirm(t('delAsset'))) deleteDoc(doc(db, 'assets', a.id)) }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded text-slate-300 hover:text-red-500 z-10 opacity-0 group-hover/asset:opacity-100 transition"><Trash2 size={14}/></button>}
                      
                      {activePreview && activePreview.files?.length > 0 ? (
                        <div className="relative w-full h-40 bg-black overflow-hidden flex overflow-x-auto snap-x">
                          {activePreview.files.map((file, i) => (
                             <div key={i} className="relative shrink-0 snap-center w-full h-full cursor-pointer group/preview" onClick={() => openReview(a, 'Global', activePreview.version, {url: file.url, type: 'image', fileIndex: i}, 'assets')}>
                               <img src={file.url} className="w-full h-full object-cover opacity-80 group-hover/preview:opacity-100 transition" />
                               <div className="absolute inset-0 flex items-center justify-center bg-blue-600/0 group-hover/preview:bg-blue-600/20 transition duration-300">
                                 <MonitorPlay size={18} className="text-white opacity-0 group-hover/preview:opacity-100 drop-shadow-md transform scale-75 group-hover/preview:scale-100 transition-all" />
                               </div>
                               {a.annotations?.Global?.[`v${activePreview.version}`]?.[`image_${i}`] && (
                                   <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black shadow"></div>
                               )}
                             </div>
                          ))}
                          <div className="absolute bottom-1 right-1 bg-black/70 text-xs px-1.5 rounded text-slate-300 pointer-events-none">{activePreview.files.length} img</div>
                        </div>
                      ) : (
                        <label className="w-full h-40 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 text-slate-600 transition">
                          <Upload size={24} className="mb-2"/> <span className="text-xs font-medium">Upload V1 (Multiple)</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={(e)=>uploadAssetPreviews(a.id, e.target.files, versions)}/>
                        </label>
                      )}

                      <div className="p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-sm truncate pr-2">{a.name}</div>
                          {versions.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {canUpload && <label className="cursor-pointer text-blue-400 hover:text-blue-300" title="Nouvelle Version (Multi-images)"><Plus size={14}/><input type="file" multiple accept="image/*" className="hidden" onChange={(e)=>uploadAssetPreviews(a.id, e.target.files, versions)}/></label>}
                              <select value={activeIdx} onChange={(e) => setSelectedVersions({...selectedVersions, [`asset_${a.id}`]: parseInt(e.target.value)})} className="bg-transparent text-xs font-bold text-slate-400 outline-none">
                                {versions.map((v, i) => <option key={i} value={i} className="bg-slate-900">V{v.version}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                        
                        {canAssign ? <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs w-full outline-none" value={a.category || ''} onChange={async (e) => await updateDoc(doc(db, 'assets', a.id), { category: e.target.value })}>{ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select> : <div className="text-xs text-slate-400">{a.category}</div>}
                        
                        <div className="flex flex-wrap gap-1 pt-1">
                          {assignees.map(uid => (
                            <span key={uid} onClick={() => canAssign && removeAssignee('assets', a.id, 'Global', uid)} className={`text-[10px] px-1.5 py-0.5 rounded flex items-center font-bold ${canAssign ? 'cursor-pointer bg-blue-900/40 text-blue-300 hover:bg-red-900/50 hover:text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                              {members.find(m => m.userId === uid)?.displayName || uid} {canAssign && <X size={10} className="ml-1"/>}
                            </span>
                          ))}
                        </div>
                        {canAssign && (
                          <select className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-slate-400 outline-none w-full" value="" onChange={(e) => { if(e.target.value) addAssignee('assets', a.id, 'Global', e.target.value) }}>
                            <option value="">+ {t('assign')}</option>
                            {members.filter(m => !assignees.includes(m.userId)).map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="max-w-6xl mx-auto flex flex-col items-center h-full">
            {!reviewItem ? (
              <div className="flex flex-col items-center justify-center mt-32 text-slate-500 space-y-4">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800"><MonitorPlay size={40} className="text-slate-600" /></div>
                <p className="font-medium text-lg">Sélectionnez une miniature pour Review.</p>
              </div>
            ) : (
              <div className="w-full flex flex-col h-[calc(100vh-8rem)]">
                <div className="flex justify-between items-center mb-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm shrink-0">
                  <div>
                    <h3 className="font-black text-xl">{reviewItem.name} {reviewStep !== 'Global' && <span className="text-blue-500 text-sm ml-2 px-2 py-0.5 bg-blue-900/30 rounded-full">{reviewStep}</span>}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 tracking-wider uppercase">Version {reviewVersion}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 justify-end items-center">
                    {isDrawing && (
                      <div className="flex bg-slate-950 border border-slate-800 rounded p-1 space-x-1 mr-2">
                        <div className="px-2 flex items-center border-r border-slate-800 space-x-3">
                          <span className="text-xs text-slate-500 font-bold mr-1">{t('brush')}</span>
                          {[2, 4, 8, 16].map(sz => (
                            <button key={sz} onClick={() => setBrushSize(sz)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${brushSize === sz ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
                              <div className="bg-red-500 rounded-full" style={{ width: sz+2, height: sz+2 }}></div>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStrokes(strokes.slice(0, -1))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title={t('undo')}><Undo size={18} /></button>
                        <button onClick={() => setStrokes([])} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition" title={t('clearAll')}><Eraser size={18} /></button>
                        {strokes.length > 0 && (
                          <button onClick={deleteRetakeFromDB} className="p-2 text-red-500 hover:text-white hover:bg-red-600 rounded transition border-l border-slate-800 ml-1 pl-3" title={t('clearRetake')}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                    
                    <button onClick={() => setIsDrawing(!isDrawing)} className={`flex items-center space-x-2 px-4 py-2.5 rounded font-bold text-sm transition shadow ${isDrawing ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}`}>
                      <PenTool size={16} /> <span>{isDrawing ? t('drawMode') : t('draw')}</span>
                    </button>
                    {isDrawing && <button onClick={saveAnnotations} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded font-bold text-sm transition shadow"><Save size={16} /> <span>{t('saveClose')}</span></button>}
                  </div>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden flex-1 border border-slate-800 flex justify-center items-center shadow-inner">
                  {reviewPreview.type === 'video' ? (
                    <video ref={videoRef} src={reviewPreview.url} className="w-full h-full object-contain" onTimeUpdate={(e) => setVideoProgress(e.target.currentTime)} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                  ) : (
                    <img src={reviewPreview.url} className="w-full h-full object-contain" />
                  )}
                  
                  <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={endDraw} className={`absolute top-0 left-0 w-full h-full z-10 ${isDrawing ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`} width={1920} height={1080} style={{ width: '100%', height: '100%' }} />

                  {reviewPreview.type !== 'video' && reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`]?.[getAnnotationKey()] && (
                    <div className="absolute bottom-4 left-4 w-4 h-4 bg-red-600 rounded-full animate-pulse z-20 shadow-lg border-2 border-black" title="Retake requis"></div>
                  )}
                </div>

                {reviewPreview.type === 'video' && (
                  <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shrink-0">
                    <div className="relative w-full h-4 bg-slate-950 rounded-full cursor-pointer mb-5 border border-slate-800" onClick={(e) => {
                      if(videoRef.current) { const rect = e.currentTarget.getBoundingClientRect(); videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoDuration; }
                    }}>
                      <div className="absolute h-full bg-blue-600 rounded-full transition-all duration-75" style={{ width: `${(videoProgress / videoDuration) * 100 || 0}%` }}></div>
                      
                      {Object.keys(reviewItem.annotations?.[reviewStep]?.[`v${reviewVersion}`] || {}).map(frameTime => (
                        <div key={frameTime} className="absolute top-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1.5 -translate-y-1/2 shadow-sm border border-black" style={{ left: `${(parseFloat(frameTime) / (videoDuration*24)) * 100}%` }} title="Retake"></div>
                      ))}
                    </div>

                    <div className="flex justify-center items-center space-x-8">
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime -= (1/24); } }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"><SkipBack size={24} /></button>
                      <button onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()} className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-lg transform hover:scale-105">{isPlaying ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor" className="ml-1" />}</button>
                      <button onClick={() => { if(videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime += (1/24); } }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"><SkipForward size={24} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-8 mt-10 shadow-xl">
            <h3 className="font-black text-xl text-center">{t('time')}</h3>
            <div className="space-y-4">
              <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none" disabled={isTimerActive}>
                <option value="">{t('task')}</option>{[...shots, ...assets].map(tk => <option key={tk.id} value={tk.id}>{tk.name}</option>)}
              </select>
              <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg outline-none" disabled={isTimerActive}>
                <option value="">{t('step')}</option>{workspace?.pipeline?.map(step => <option key={step} value={step}>{step}</option>)}
              </select>
            </div>
            <div className="text-center">
              <div className="text-6xl font-black font-mono tracking-widest mb-8 text-blue-500 drop-shadow">{formatTime(timer)}</div>
              <div className="flex justify-center">
                {!isTimerActive ? (
                  <button onClick={() => { if(!selectedTask || !selectedStep) return alert(t('task')); setIsTimerActive(true); }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105"><Play size={20} fill="currentColor"/> <span>{t('start')}</span></button>
                ) : (
                  <button onClick={handleStopTimer} className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition"><Pause size={20} fill="currentColor"/> <span>{t('stopSave')}</span></button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-black text-slate-300">{myStats.todo}</div><div className="text-xs font-bold text-slate-500 uppercase">{t('todo')}</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-black text-blue-400">{myStats.wip}</div><div className="text-xs font-bold text-blue-500 uppercase">{t('wip')}</div>
              </div>
              <div className="bg-purple-900/30 border border-purple-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-black text-purple-400">{myStats.review}</div><div className="text-xs font-bold text-purple-500 uppercase">{t('rev')}</div>
              </div>
              <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-black text-green-400">{myStats.done}</div><div className="text-xs font-bold text-green-500 uppercase">{t('done')}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-black text-xl mb-6 flex items-center text-blue-400"><BarChart className="mr-3"/> Chrono Logs</h3>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead><tr className="border-b border-slate-800 text-slate-500 text-xs uppercase bg-slate-950">{canAssign && <th className="p-3 rounded-tl">Membre</th>}<th className="p-3">Tâche</th><th className="p-3">Étape</th><th className="p-3 rounded-tr">Temps</th></tr></thead>
                <tbody className="divide-y divide-slate-800/50">
                  {timeLogs.filter(log => canAssign || log.userId === user.uid).sort((a,b) => b.date - a.date).map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/20">{canAssign && <td className="p-3 font-medium">{log.userName}</td>}<td className="p-3">{log.taskName}</td><td className="p-3 text-slate-400">{log.step}</td><td className="p-3 text-blue-400 font-mono font-bold">{formatTime(log.durationSeconds)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl shadow-sm">
            <h3 className="font-black text-xl mb-6 text-blue-400">{t('team')}</h3>
            <div className="space-y-3">
              {members.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center space-x-3"><UserCircle size={32} className="text-slate-600"/><div><div className="font-bold text-base">{m.displayName}</div><div className="text-xs text-slate-500 font-mono">{m.email}</div></div></div>
                  {userRole === 'Admin' && m.userId !== user.uid ? (
                    <select className="bg-slate-900 border border-slate-700 rounded p-1.5 text-sm font-bold text-blue-400 outline-none" value={m.role} onChange={async (e) => await updateDoc(doc(db, 'projectMembers', m.id), { role: e.target.value })}>
                      <option value="Artist">Artist</option><option value="Supervisor">Supervisor</option><option value="Admin">Admin</option>
                    </select>
                  ) : <span className="text-sm text-blue-400 font-bold px-3 py-1 bg-blue-900/20 rounded-full">{m.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && userRole === 'Admin' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-black mb-3">{t('joinCode')}</h3>
              <input type="text" readOnly value={workspace?.id || ''} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-blue-400 text-center tracking-widest text-lg outline-none" />
            </div>

            <form onSubmit={saveStorageSettings} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-sm">
              <h3 className="font-black flex items-center text-blue-400"><Key className="mr-2" /> Cloudinary Storage Config</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t('keysInfo')}</p>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cloud Name</label><input type="text" value={cloudNameInput} onChange={(e)=>setCloudNameInput(e.target.value)} placeholder="ex: mon-studio-cloud" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono outline-none focus:border-blue-500" required /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Upload Preset (Unsigned)</label><input type="text" value={uploadPresetInput} onChange={(e)=>setUploadPresetInput(e.target.value)} placeholder="ex: ml_default" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono outline-none focus:border-blue-500" required /></div>
              
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center space-x-2 text-yellow-500"><AlertTriangle size={16}/><span className="text-xs font-bold">{t('apiSecretInfo')}</span></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">API Key</label><input type="text" value={apiKeyInput} onChange={(e)=>setApiKeyInput(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">API Secret</label><input type="password" value={apiSecretInput} onChange={(e)=>setApiSecretInput(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono outline-none focus:border-blue-500" /></div>
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition">{t('saveKeys')}</button>
            </form>

            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 shadow-sm">
              <h3 className="font-black text-red-500 mb-4">{t('danger')}</h3>
              <button onClick={deleteProject} className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-5 py-2.5 rounded-lg font-bold text-sm transition"><Trash2 size={18} /> <span>{t('delProj')}</span></button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
