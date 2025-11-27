import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Clock, 
  FileText, 
  Upload, 
  CheckCircle, 
  Circle, 
  Lock, 
  Layout, 
  List, 
  BarChart2, 
  MoreVertical,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

// --- Firebase Init ---
const firebaseConfig = {
  apiKey: "AIzaSyBkyP0JWDZbf5djDJ6pQvn3ZRXIhtsLR7A",
  authDomain: "mission-management-5ff40.firebaseapp.com",
  projectId: "mission-management-5ff40",
  storageBucket: "mission-management-5ff40.firebasestorage.app",
  messagingSenderId: "661218578070",
  appId: "1:661218578070:web:57c9db37e2d1a1b4aafcb7",
  measurementId: "G-T5N0WEE7XN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Constants ---
const LEVELS = {
  1: { name: 'Mission', color: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50' },
  2: { name: 'Task', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
  3: { name: 'Subtask', color: 'bg-cyan-500', text: 'text-cyan-600', bg: 'bg-cyan-50' },
  4: { name: 'Action', color: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' },
  5: { name: 'Step', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
};

// --- Helper Components ---

const ProgressBar = ({ progress }) => (
  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
    <div 
      className="h-full bg-indigo-500 transition-all duration-500"
      style={{ width: `${progress}%` }}
    />
  </div>
);

const Badge = ({ level }) => (
  <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${LEVELS[level].bg} ${LEVELS[level].text}`}>
    {LEVELS[level].name}
  </span>
);

// --- Main Application ---

export default function MissionControlApp() {
  // Auth & Data State
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [view, setView] = useState('dashboard'); // dashboard, tree, gantt, agenda
  const [expanded, setExpanded] = useState({}); // For tree view
  const [selectedItem, setSelectedItem] = useState(null); // For detail modal
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOverride, setShowOverride] = useState(false); // Admin override toggle

  // Form State
  const [newItemParent, setNewItemParent] = useState(null); // ID of parent if adding child
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;
    const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'mission_items');
    // Simple fetch all - sorting/filtering happens in memory for complex trees
    const unsubscribe = onSnapshot(itemsRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data);
      setLoading(false);
    }, (err) => console.error("Fetch error:", err));
    return () => unsubscribe();
  }, [user]);

  // --- Derived State (The Tree) ---
  const itemMap = useMemo(() => {
    const map = {};
    items.forEach(item => map[item.id] = { ...item, children: [] });
    items.forEach(item => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      }
    });
    return map;
  }, [items]);

  const rootItems = useMemo(() => {
    return items.filter(i => !i.parentId).sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
  }, [items]);

  // --- Actions ---

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const parentId = newItemParent?.id || null;
    const level = parentId ? (newItemParent.level + 1) : 1;

    if (level > 5) {
      alert("Maximum depth reached (Level 5: Step).");
      return;
    }

    const newItem = {
      title: formData.get('title'),
      description: formData.get('description'),
      level: level,
      parentId: parentId,
      status: 'pending', // pending, complete
      deliverableUrl: null, // Proof of work
      startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
      dueDate: formData.get('dueDate') || '',
      startTime: formData.get('startTime') || '', // For Agenda
      endTime: formData.get('endTime') || '',     // For Agenda
      createdAt: serverTimestamp(),
      dependencies: [] // Array of IDs that must be complete before this starts
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'mission_items'), newItem);
      setIsFormOpen(false);
      setNewItemParent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDeliverable = async (item) => {
    if (!confirm("Simulate file upload for verification?")) return;
    
    // Simulate upload delay
    const loadingBtn = document.getElementById(`upload-btn-${item.id}`);
    if (loadingBtn) loadingBtn.innerText = "Uploading...";
    
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'mission_items', item.id), {
          deliverableUrl: "https://fake-storage.com/evidence.pdf", // Simulated URL
          status: 'complete',
          completedAt: serverTimestamp()
        });
        if (loadingBtn) loadingBtn.innerText = "Upload";
      } catch (err) {
        console.error(err);
      }
    }, 1500);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteItemRecursive = async (itemId) => {
    if (!confirm("Delete this item and all its children?")) return;
    // Note: Real recursive delete is complex in NoSQL. 
    // Here we just delete the node. Children will become orphans (hidden in this UI logic).
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'mission_items', itemId));
    setSelectedItem(null);
  };

  // --- Logic: Dependencies ---
  // A simple dependency check: Can't start if parent is not active? 
  // Or purely explicit dependencies? User asked for Gantt-like flows.
  // For MVP: An item is "Locked" if it has dependencies that are not complete.
  
  const isLocked = (item) => {
    if (showOverride) return false; // Admin override
    // 1. Check Parent status (Cascading Lock)
    // Actually, usually you can work on a Subtask even if Task isn't "Done", 
    // but the Task isn't "Done" until Subtasks are.
    // So we primarily check EXPLICIT dependencies here.
    if (!item.dependencies || item.dependencies.length === 0) return false;
    
    // Check if any dependency is incomplete
    const deps = items.filter(i => item.dependencies.includes(i.id));
    return deps.some(d => d.status !== 'complete');
  };

  // --- Views ---

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium">Active Missions</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">
            {rootItems.filter(i => i.status !== 'complete').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium">Deliverables Pending</div>
          <div className="text-3xl font-bold text-slate-800 mt-1">
            {items.filter(i => i.level > 1 && i.status !== 'complete').length}
          </div>
        </div>
      </div>

      <h3 className="font-bold text-lg text-slate-800">Your Missions</h3>
      <div className="space-y-3">
        {rootItems.map(mission => {
          // Calculate progress based on children completion
          const allChildren = items.filter(i => i.parentId === mission.id); // Direct children only for simplicity here
          const completed = allChildren.filter(c => c.status === 'complete').length;
          const progress = allChildren.length ? (completed / allChildren.length) * 100 : 0;

          return (
            <div key={mission.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100" onClick={() => { setView('tree'); toggleExpand(mission.id); }}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{mission.title}</h4>
                <Badge level={1} />
              </div>
              <p className="text-slate-500 text-sm line-clamp-2 mb-3">{mission.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Calendar size={12} />
                <span>Due: {mission.dueDate || 'No Date'}</span>
              </div>
              <ProgressBar progress={progress} />
            </div>
          );
        })}
        {rootItems.length === 0 && (
          <div className="text-center py-10 text-slate-400">No missions yet. Start one!</div>
        )}
      </div>
      
      <button 
        onClick={() => { setNewItemParent(null); setIsFormOpen(true); }}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200"
      >
        Start New Mission
      </button>
    </div>
  );

  const TreeItem = ({ node, depth = 0 }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded[node.id];
    const locked = isLocked(node);

    return (
      <div className="border-b border-slate-50 last:border-0">
        <div 
          className={`flex items-center py-3 pr-4 transition-colors ${selectedItem?.id === node.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            className={`mr-2 p-1 rounded hover:bg-slate-200 ${hasChildren ? 'visible' : 'invisible'}`}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <div 
            className="flex-1 flex items-center gap-3 cursor-pointer"
            onClick={() => setSelectedItem(node)}
          >
            {/* Status Icon */}
            {locked ? (
              <Lock size={18} className="text-slate-300" />
            ) : node.status === 'complete' ? (
              <CheckCircle size={18} className="text-green-500" />
            ) : (
              <Circle size={18} className="text-slate-300" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium truncate ${node.status === 'complete' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {node.title}
                </span>
                {depth === 0 && <Badge level={1} />}
              </div>
              {/* Breadcrumb-ish details */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Badge level={node.level} />
                {node.dueDate && <span>Due {node.dueDate}</span>}
              </div>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setNewItemParent(node); setIsFormOpen(true); }}
            className="ml-2 p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
            disabled={node.level >= 5}
          >
            {node.level < 5 && <Plus size={16} />}
          </button>
        </div>

        {/* Recursive Children */}
        {isOpen && hasChildren && (
          <div className="bg-slate-50/50">
            {node.children.map(child => (
              <TreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const TreeView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {rootItems.length === 0 ? (
         <div className="p-8 text-center text-slate-400">
           <p>No missions found.</p>
           <button onClick={() => setIsFormOpen(true)} className="mt-4 text-indigo-600 font-medium">Create First Mission</button>
         </div>
      ) : (
        rootItems.map(item => (
          <TreeItem key={item.id} node={itemMap[item.id] || item} />
        ))
      )}
    </div>
  );

  const GanttView = () => {
    // Simple visualization of time
    const sortedItems = items
      .filter(i => i.startDate && i.dueDate)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 overflow-x-auto">
        <h3 className="font-bold text-lg mb-4 sticky left-0">Project Timeline</h3>
        <div className="min-w-[600px] space-y-4">
          {sortedItems.map(item => (
            <div key={item.id} className="relative pl-32 py-1 hover:bg-slate-50">
              <div className="absolute left-0 top-1 w-28 truncate text-xs font-medium text-slate-600" title={item.title}>
                {item.title}
              </div>
              <div className="flex items-center">
                {/* Visual Bar - Randomized width for demo if dates are close, real math would go here */}
                <div 
                  className={`h-6 rounded-md ${LEVELS[item.level].bg} ${LEVELS[item.level].text} border ${LEVELS[item.level].color.replace('bg-', 'border-')} px-2 flex items-center text-xs whitespace-nowrap`}
                  style={{ 
                    marginLeft: `${(new Date(item.startDate).getDate() % 10) * 20}px`, 
                    width: '120px' 
                  }}
                >
                  {item.startDate} - {item.dueDate}
                </div>
              </div>
            </div>
          ))}
          {sortedItems.length === 0 && <div className="text-slate-400 italic">Add Start/Due dates to items to see them here.</div>}
        </div>
      </div>
    );
  };

  const AgendaView = () => {
    // Filter items that have time slots assigned
    const todayItems = items.filter(i => i.startTime && i.endTime).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
        <div className="p-4 border-b border-slate-100 bg-indigo-50 rounded-t-xl">
          <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
            <Clock size={20} />
            Daily Agenda
          </h3>
          <p className="text-xs text-indigo-600 mt-1">Items with assigned Time Slots</p>
        </div>
        <div className="divide-y divide-slate-100">
          {todayItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No items scheduled for today. <br/>
              <span className="text-xs">Edit an item and add Start/End times.</span>
            </div>
          ) : (
            todayItems.map(item => (
              <div key={item.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors" onClick={() => setSelectedItem(item)}>
                <div className="flex flex-col items-center min-w-[60px] text-slate-500 font-mono text-sm pt-1">
                  <span>{item.startTime}</span>
                  <div className="h-4 w-px bg-slate-200 my-1"></div>
                  <span className="opacity-60">{item.endTime}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge level={item.level} />
                    <h4 className="font-medium text-slate-800">{item.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>
                </div>
                {item.status === 'complete' ? (
                  <CheckCircle className="text-green-500" size={20} />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-200"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // --- Rendering ---

  if (loading) return <div className="h-screen flex items-center justify-center text-indigo-600">Initializing Mission Control...</div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20 md:pb-0">
      
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <Layout size={18} className="text-white" />
            </div>
            <h1 className="font-bold tracking-wide">MISSION CTRL</h1>
          </div>
          <button 
             onClick={() => setShowOverride(!showOverride)} 
             className={`text-xs px-2 py-1 rounded border ${showOverride ? 'bg-red-500 border-red-500' : 'border-slate-600 text-slate-400'}`}
          >
            {showOverride ? 'ADMIN MODE' : 'STRICT MODE'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-10">
        <div className="max-w-3xl mx-auto flex">
          {[
            { id: 'dashboard', label: 'Home', icon: Layout },
            { id: 'tree', label: 'Hierarchy', icon: List },
            { id: 'gantt', label: 'Gantt', icon: BarChart2 },
            { id: 'agenda', label: 'Agenda', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-colors
                ${view === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4">
        {view === 'dashboard' && <DashboardView />}
        {view === 'tree' && <TreeView />}
        {view === 'gantt' && <GanttView />}
        {view === 'agenda' && <AgendaView />}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <Badge level={selectedItem.level} />
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedItem.title}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status Section */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {selectedItem.status === 'complete' ? (
                  <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckCircle size={32}/></div>
                ) : isLocked(selectedItem) ? (
                   <div className="bg-slate-200 p-3 rounded-full text-slate-500"><Lock size={32}/></div>
                ) : (
                  <div className="bg-white border-2 border-slate-200 p-3 rounded-full"><Circle size={32}/></div>
                )}
                
                <div className="flex-1">
                  <div className="font-semibold text-slate-700">
                    {selectedItem.status === 'complete' ? 'Completed' : isLocked(selectedItem) ? 'Locked by Dependencies' : 'In Progress'}
                  </div>
                  {isLocked(selectedItem) && <div className="text-xs text-red-500 mt-1">Complete parent or previous tasks first.</div>}
                  
                  {/* Deliverable Section */}
                  {!isLocked(selectedItem) && selectedItem.status !== 'complete' && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Proof of Work Required</p>
                      <button 
                        id={`upload-btn-${selectedItem.id}`}
                        onClick={() => handleUploadDeliverable(selectedItem)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all w-full justify-center"
                      >
                        <Upload size={16} />
                        Upload Deliverable
                      </button>
                    </div>
                  )}

                  {selectedItem.deliverableUrl && (
                    <a href="#" className="flex items-center gap-2 text-xs text-indigo-600 mt-2 font-medium bg-indigo-50 p-2 rounded block">
                      <FileText size={14} />
                      View Uploaded Deliverable
                    </a>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                  <p className="text-slate-700 leading-relaxed">{selectedItem.description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Start Date</label>
                     <div className="mt-1 text-sm font-medium">{selectedItem.startDate || '-'}</div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                     <div className="mt-1 text-sm font-medium">{selectedItem.dueDate || '-'}</div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Agenda Start</label>
                     <div className="mt-1 text-sm font-medium">{selectedItem.startTime || '-'}</div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Agenda End</label>
                     <div className="mt-1 text-sm font-medium">{selectedItem.endTime || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button 
                onClick={() => deleteItemRecursive(selectedItem.id)}
                className="text-red-500 p-2 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button onClick={() => setSelectedItem(null)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">
                New {newItemParent ? LEVELS[Math.min(5, newItemParent.level + 1)].name : 'Mission'}
              </h2>
              {newItemParent && <p className="text-xs text-slate-500 mt-1">Under: {newItemParent.title}</p>}
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input name="title" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Launch Phase 1" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea name="description" rows="2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Details..."></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input type="date" name="startDate" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                  <input type="date" name="dueDate" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              {newItemParent && newItemParent.level >= 3 && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                   <p className="text-xs font-bold text-indigo-600 mb-2 uppercase flex items-center gap-1"><Clock size={12}/> Agenda Slot (Optional)</p>
                   <div className="grid grid-cols-2 gap-2">
                     <input type="time" name="startTime" className="px-2 py-1 rounded border text-sm" />
                     <input type="time" name="endTime" className="px-2 py-1 rounded border text-sm" />
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:bg-indigo-700">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}