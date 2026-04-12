import React, { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import DoctorAnalytics from '../components/DoctorAnalytics'
import api from '../api'
import toast from 'react-hot-toast'
import { format, addDays } from 'date-fns'
import {
  Users, ChevronRight, ClipboardList, Plus, Trash2,
  Clock, CheckCircle, ArrowRight, GripVertical, Stethoscope, X, Mic, MicOff
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TABS = [
  { id: 'opd', label: 'OPD Queue', icon: Users },
  { id: 'tp', label: 'Treatment Plans', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: Stethoscope },
]

const DAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4']

const FREQ_MAP = {
  'OD': ['08:00'],
  'BD': ['08:00', '20:00'],
  'TDS': ['08:00', '14:00', '20:00'],
  'QID': ['08:00', '12:00', '16:00', '20:00'],
  'HS': ['22:00'],
  'PRN': ['PRN'],
  'STAT': ['STAT']
}

const MEDICINE_TEMPLATES = [
  { title: 'Give Glucose', instructions: '500ml IV over 2h', category: 'medication', color: 'yellow', frequency: 'BD' },
  { title: 'Antibiotic (Ceftriaxone 1g)', instructions: 'IV once', category: 'medication', color: 'blue', frequency: 'OD' },
  { title: 'Amoxicillin 500mg', instructions: 'PO', category: 'medication', color: 'green', frequency: 'TDS' },
  { title: 'Painkiller (Paracetamol 1g)', instructions: 'IV if pain ≥ 5', category: 'medication', color: 'red', frequency: 'PRN' },
  { title: 'Check Vitals', instructions: 'BP, temp, SPO2, pulse', category: 'nursing', color: 'purple', frequency: 'QID' },
  { title: 'IV Fluid Change', instructions: 'Every 8 hours', category: 'nursing', color: 'amber', frequency: 'TDS' },
  { title: 'Physiotherapy', instructions: '30 min session', category: 'physiotherapy', color: 'blue', frequency: 'OD' },
  { title: 'Blood CBC', instructions: 'Fasting sample', category: 'investigation', color: 'purple', frequency: 'OD' },
  { title: 'Diet – Soft/Liquid', instructions: 'No spicy food', category: 'diet', color: 'green', frequency: 'TDS' },
]

// Predefined packages — each is a named bundle of multiple order items.
const DEFAULT_PACKAGES = [
  {
    id: 'pkg-postop-0',
    name: 'Post-op Day 0',
    color: 'purple',
    items: [
      { title: 'Give Glucose', instructions: '500ml IV over 2h', category: 'medication', time_of_day: '08:00' },
      { title: 'Antibiotic (Ceftriaxone 1g)', instructions: 'IV once', category: 'medication', time_of_day: '08:00' },
      { title: 'Painkiller (Paracetamol 1g)', instructions: 'IV if pain ≥ 5', category: 'medication', time_of_day: '10:00' },
      { title: 'Check Vitals', instructions: 'BP, temp, SPO2, pulse', category: 'nursing', time_of_day: '06:00' },
      { title: 'IV Fluid Change', instructions: 'Every 8 hours', category: 'nursing', time_of_day: '08:00' },
    ],
  },
  {
    id: 'pkg-recovery',
    name: 'Recovery Protocol',
    color: 'green',
    items: [
      { title: 'Check Vitals', instructions: 'BP, temp, SPO2, pulse', category: 'nursing', time_of_day: '06:00' },
      { title: 'Physiotherapy', instructions: '30 min session', category: 'physiotherapy', time_of_day: '10:00' },
      { title: 'Diet – Soft/Liquid', instructions: 'No spicy food', category: 'diet', time_of_day: '08:00' },
      { title: 'Blood CBC', instructions: 'Fasting sample', category: 'investigation', time_of_day: '07:00' },
    ],
  },
  {
    id: 'pkg-morning',
    name: 'Morning Ward Round',
    color: 'blue',
    items: [
      { title: 'Check Vitals', instructions: 'BP, temp, SPO2, pulse', category: 'nursing', time_of_day: '06:00' },
      { title: 'IV Fluid Change', instructions: 'Every 8 hours', category: 'nursing', time_of_day: '06:30' },
      { title: 'Amoxicillin 500mg', instructions: 'PO once', category: 'medication', time_of_day: '07:00' },
    ],
  },
  {
    id: 'pkg-fever',
    name: 'Fever Management',
    color: 'red',
    items: [
      { title: 'Paracetamol 650mg', instructions: 'PO if temp > 38.5°C', category: 'medication', time_of_day: '08:00' },
      { title: 'Blood CBC', instructions: 'Fasting sample', category: 'investigation', time_of_day: '07:00' },
      { title: 'Check Vitals', instructions: 'Every 4 hours', category: 'nursing', time_of_day: '06:00' },
      { title: 'IV Fluids NS', instructions: '500ml IV over 4h', category: 'medication', time_of_day: '09:00' },
    ],
  },
]

const categoryEmoji = { medication: '💊', nursing: '🩺', physiotherapy: '🏃', investigation: '🔬', diet: '🥗', other: '📋' }

const pkgColors = {
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', btn: 'bg-purple-200 hover:bg-purple-300 text-purple-800' },
  green:  { bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-800',  btn: 'bg-green-200 hover:bg-green-300 text-green-800' },
  blue:   { bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-800',   btn: 'bg-blue-200 hover:bg-blue-300 text-blue-800' },
  red:    { bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-800',    btn: 'bg-red-200 hover:bg-red-300 text-red-800' },
  amber:  { bg: 'bg-amber-100',  border: 'border-amber-300',  text: 'text-amber-800',  btn: 'bg-amber-200 hover:bg-amber-300 text-amber-800' },
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', btn: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-800' },
}

function suggestIconsByName(name = '') {
  const n = name.toLowerCase()
  if (n.includes('glucose') || n.includes('fluid') || n.includes('iv')) return ['💧', '🧪', '💊']
  if (n.includes('antibiotic') || n.includes('amoxicillin') || n.includes('paracetamol') || n.includes('pain')) return ['💊', '💉', '🩹']
  if (n.includes('vital') || n.includes('bp') || n.includes('pulse') || n.includes('nursing')) return ['🩺', '❤️', '📈']
  if (n.includes('physio')) return ['🏃', '🦵', '🤸']
  if (n.includes('cbc') || n.includes('blood') || n.includes('test') || n.includes('investigation')) return ['🧪', '🔬', '🩸']
  if (n.includes('diet') || n.includes('food') || n.includes('liquid')) return ['🥗', '🍲', '🥛']
  if (n.includes('oxygen') || n.includes('resp')) return ['🫁', '💨', '🩺']
  if (n.includes('inj') || n.includes('injection')) return ['💉', '💊', '🧪']
  return ['📋', '💊', '🩺']
}

function pickIconWithSuggestion(title, fallback = '📋') {
  const suggestions = suggestIconsByName(title)
  const picked = window.prompt(
    `Select sticker icon for "${title}"\n` +
    `1) ${suggestions[0]}   2) ${suggestions[1]}   3) ${suggestions[2]}\n` +
    `You can type 1/2/3 or paste any emoji.`,
    suggestions[0]
  )
  if (!picked) return suggestions[0] || fallback
  const v = picked.trim()
  if (v === '1') return suggestions[0]
  if (v === '2') return suggestions[1]
  if (v === '3') return suggestions[2]
  return v
}

// ─── Sortable item in template palette ──────────────────────────────────────
function TemplateCard({ item, onAdd, dayIdx }) {
  return (
    <button
      onClick={() => onAdd(item, dayIdx)}
      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-all group border border-transparent hover:border-blue-200"
    >
      <span className="text-base">{categoryEmoji[item.category]}</span>
      <span className="text-xs font-medium text-gray-700 flex-1">{item.title}</span>
      <Plus size={13} className="text-blue-400 opacity-0 group-hover:opacity-100" />
    </button>
  )
}

// ─── Sortable task row ───────────────────────────────────────────────────────
function SortableTaskRow({ task, onRemove, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 bg-gray-50 rounded-xl px-2 py-2 border border-gray-100 hover:shadow-sm transition-shadow">
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab px-1">
        <GripVertical size={14} />
      </button>

      <span className="text-sm shrink-0 w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
        {task.icon || categoryEmoji[task.category]}
      </span>

      <input 
        value={task.title} 
        onChange={e => onUpdate(task._id, 'title', e.target.value)}
        className="flex-1 text-xs bg-transparent outline-none font-bold text-gray-700 min-w-0 px-1" 
      />

      {/* Properly Visible Time Input */}
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 shadow-sm shrink-0 min-w-[120px]">
        <input 
          type="time" 
          value={task.time_of_day || '08:00'} 
          onChange={e => onUpdate(task._id, 'time_of_day', e.target.value)}
          className="text-xs font-black text-gray-800 bg-transparent outline-none border-none w-full cursor-pointer h-5" 
        />
      </div>

      <button onClick={() => onRemove(task._id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── STT Microphone Input ────────────────────────────────────────────────────────
function MicrophoneInput({ onTranscript, autoStart = false }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const autoStartedRef = useRef(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Browser dictation not supported.'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      let currentFinal = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) currentFinal += event.results[i][0].transcript;
      }
      if (currentFinal) onTranscript(currentFinal);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setTimeout(startListening, 400); // small delay to let UI settle
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [autoStart]);

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      startListening();
    }
  };

  return (
    <button
      onClick={toggleListen}
      className={`p-2 rounded-full transition-all flex items-center justify-center ${isListening ? 'bg-red-500 text-white animate-pulse shadow-md' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
      title={isListening ? "Stop Dictation" : "Start Dictation"}
    >
      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  );
}

// ─── AI Medical Extractor ───────────────────────────────────────────────────────
const MEDICINE_DB = [
  // Antibiotics
  'amoxicillin','augmentin','azithromycin','ciprofloxacin','ceftriaxone','metronidazole','doxycycline','clindamycin','ampicillin','trimethoprim','cephalexin','erythromycin','nitrofurantoin','vancomycin','levofloxacin',
  // Pain / Anti-inflammatory
  'paracetamol','ibuprofen','diclofenac','naproxen','aspirin','ketorolac','tramadol','morphine','codeine','mefenamic','celecoxib','piroxicam',
  // Antacids / GI
  'omeprazole','pantoprazole','ranitidine','famotidine','metoclopramide','domperidone','ondansetron','sucralfate','lactulose','bisacodyl',
  // Cardiac
  'amlodipine','atenolol','metoprolol','losartan','ramipril','enalapril','digoxin','furosemide','spironolactone','nitroglycerin','clopidogrel','warfarin','heparin',
  // Diabetes
  'metformin','glibenclamide','glipizide','insulin','sitagliptin','empagliflozin','dapagliflozin','pioglitazone',
  // Respiratory
  'salbutamol','budesonide','fluticasone','montelukast','theophylline','ipratropium','tiotropium','salmeterol',
  // Vitamins / Supplements
  'vitamin','calcium','zinc','folic','iron','b12','b6','d3','magnesium','potassium','multivitamin',
  // Steroids
  'prednisolone','dexamethasone','hydrocortisone','methylprednisolone','betamethasone',
  // Neuro / Psych
  'diazepam','lorazepam','alprazolam','phenobarbitone','phenytoin','levetiracetam','gabapentin','pregabalin','amitriptyline','sertraline','fluoxetine','haloperidol',
  // Common brand names / combos
  'panadol','crocin','combiflam','mucaine','pan','pantop','volix','glucophage','calpol','zithromax','augpen','taxim','taxim-o','rifagut',
  // IV fluids
  'normal saline','ringer lactate','dextrose','dns','rl','ns','glucose','iv fluid','iv fluids',
];

function extractMedAndFollowup(text) {
  if (!text || text.trim().length < 3) return { meds: [], followupDays: null };
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,;.()]+/);

  // Extract medicines
  const foundMeds = new Set();
  MEDICINE_DB.forEach(med => {
    if (lower.includes(med)) {
      // Capitalize nicely
      foundMeds.add(med.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }
  });
  // Also grab tokens that look like "DrugName Xmg" or "Xmg DrugName"
  const mgPattern = /\b([a-z]+(?:\s+[a-z]+)?)\s*(?:\d+(?:\.\d+)?\s*(?:mg|ml|mcg|gm|g|iu|units?))\b/gi;
  let m;
  while ((m = mgPattern.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (candidate.length > 3) foundMeds.add(candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  }

  // Extract follow-up days — STRICT patterns only, but find the LAST mentioned (if user rephrases)
  let followupDays = null;
  let lastIndex = -1;
  const fupPatterns = [
    /follow[\s-]?up\s+(?:after|in)\s+(\d+)\s+days?/ig,
    /follow[\s-]?up\s+(\d+)\s+days?/ig,
    /\b(?:review|revisit|re-visit)\s+(?:after|in)\s+(\d+)\s+days?/ig,
    /(\d+)\s+days?\s+(?:follow[\s-]?up|review|revisit)/ig,
    /next\s+(?:visit|appointment)\s+(?:after|in)\s+(\d+)\s+days?/ig,
    /come\s+back\s+after\s+(\d+)\s+days?/ig,
    /return\s+after\s+(\d+)\s+days?/ig,
    /see\s+me\s+after\s+(\d+)\s+days?/ig,
  ];
  
  for (const pat of fupPatterns) {
    const matches = [...text.matchAll(pat)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      if (lastMatch.index > lastIndex) {
        lastIndex = lastMatch.index;
        followupDays = parseInt(lastMatch[1], 10);
      }
    }
  }

  // Check tomorrow
  const tomorrowPattern = /(?:follow[\s-]?up|review|revisit)\s+tomorrow/ig;
  const tomorrowMatches = [...text.matchAll(tomorrowPattern)];
  if (tomorrowMatches.length > 0) {
    const lastMatch = tomorrowMatches[tomorrowMatches.length - 1];
    if (lastMatch.index > lastIndex) {
      lastIndex = lastMatch.index;
      followupDays = 1;
    }
  }

  return { meds: [...foundMeds], followupDays };
}

function AutoSavePopup({ prompt, onAccept, onReject }) {
  const [timeLeft, setTimeLeft] = useState(3);
  
  useEffect(() => {
     if (timeLeft <= 0) {
       onAccept(prompt.visitId, prompt.days);
       return;
     }
     const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
     return () => clearTimeout(timer);
  }, [timeLeft, prompt.visitId, prompt.days]);
  
  return (
    <div className="fixed bottom-10 right-10 bg-white shadow-2xl border-2 border-blue-500 rounded-2xl p-5 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-bottom-5">
      <h3 className="font-extrabold text-blue-700 flex items-center gap-2 mb-2"><Stethoscope size={18} /> AI Detected Follow-up</h3>
      <p className="text-gray-700 text-sm font-medium mb-4">Patient should follow up in <span className="font-bold text-blue-600 px-1 py-0.5 bg-blue-50 rounded">{prompt.days} days</span>. Confirm?</p>
      
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => onAccept(prompt.visitId, prompt.days)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-blue-700 shadow flex items-center justify-center gap-1"><CheckCircle size={14}/> Yes</button>
        <button onClick={onReject} className="flex-1 bg-red-50 text-red-600 border border-red-200 font-bold py-2 rounded-xl text-sm hover:bg-red-100 flex items-center justify-center gap-1"><X size={14}/> No</button>
      </div>
      
      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3 relative">
         <div className="bg-blue-500 h-full absolute left-0 top-0 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 3) * 100}%` }}></div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-center text-gray-400 mt-2 font-bold animate-pulse">Auto-saving in {timeLeft}s</p>
    </div>
  );
}

// ─── Manual Follow-Up Date Component ─────────────────────────────────────────
function ManualFollowUp({ visitId, existingDate }) {
  const [date, setDate] = useState(existingDate || '');
  const [saved, setSaved] = useState(!!existingDate);
  const [editing, setEditing] = useState(!existingDate);

  useEffect(() => {
    if (existingDate) { setDate(existingDate); setSaved(true); setEditing(false); }
  }, [existingDate]);

  async function save() {
    if (!date) return toast.error('Pick a date first');
    try {
      await api.patch(`/opd-visits/${visitId}/`, {
        follow_up_date: date,
        revisit_advice: `Follow up on ${format(new Date(date), 'dd MMM yyyy')}`,
      });
      setSaved(true);
      setEditing(false);
      toast.success(`✅ Follow-up set for ${format(new Date(date), 'dd MMM yyyy')} — Receptionist will be alerted!`);
    } catch { toast.error('Failed to save'); }
  }

  async function cancel() {
    try {
      await api.patch(`/opd-visits/${visitId}/`, { follow_up_date: null, revisit_advice: '' });
      setDate(''); setSaved(false); setEditing(true);
      toast('Follow-up cleared', { icon: '🗑️' });
    } catch { toast.error('Failed to clear'); }
  }

  if (saved && !editing) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <CheckCircle size={14} className="text-green-600 shrink-0" />
        <span className="text-xs font-bold text-green-700 flex-1">
          {format(new Date(date), 'dd MMM yyyy')}
        </span>
        <button onClick={() => setEditing(true)}
          className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
          Edit
        </button>
        <button onClick={cancel}
          className="text-[10px] font-bold px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        min={format(new Date(), 'yyyy-MM-dd')}
        onChange={e => { setDate(e.target.value); setSaved(false); }}
        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
      />
      <button onClick={save}
        className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all shrink-0 shadow-sm">
        Save &amp; Alert
      </button>
      {existingDate && (
        <button onClick={() => setEditing(false)}
          className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-200">
          Back
        </button>
      )}
    </div>
  );
}

// ─── Speech-to-Text Glow AI Transition Overlay ───────────────────────────────
function AITransitionOverlay({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Outer ambient glow that fills screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.12) 40%, transparent 70%)',
          animation: 'ambientPulse 1.2s ease-in-out infinite',
        }} />
      </div>

      {/* Sound wave rings */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: '280px', height: '280px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="absolute rounded-full border border-indigo-400/50" style={{
            width: `${i * 60}px`,
            height: `${i * 60}px`,
            animation: `sttRing 1.4s ease-out ${i * 0.18}s infinite`,
          }} />
        ))}

        {/* Mic button core */}
        <div className="relative z-20 flex items-center justify-center" style={{ animation: 'micPop 0.5s 0.2s ease-out both', opacity: 0 }}>
          {/* Outer glow circle */}
          <div className="absolute rounded-full" style={{
            width: '110px', height: '110px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
            animation: 'micGlow 1s ease-in-out infinite',
          }} />

          {/* Main mic circle */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            boxShadow: '0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={36} className="text-white" />
          </div>
        </div>
      </div>

      {/* Sound bars (equalizer) below mic */}
      <div className="relative z-10 flex items-end gap-1.5 mt-6" style={{ height: '32px' }}>
        {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4].map((h, i) => (
          <div key={i} style={{
            width: '5px',
            borderRadius: '3px',
            background: 'linear-gradient(to top, #6366f1, #a855f7)',
            boxShadow: '0 0 6px rgba(139,92,246,0.7)',
            animation: `eqBar 0.6s ${i * 0.07}s ease-in-out infinite alternate`,
            height: '8px',
          }} />
        ))}
      </div>

      {/* Text */}
      <div className="relative z-10 text-center mt-6" style={{ animation: 'micPop 0.5s 0.6s ease-out both', opacity: 0 }}>
        <p className="text-white text-xl font-black tracking-tight">Listening…</p>
        <p className="text-purple-300 text-sm mt-1 font-medium">AI is active — dictate your notes 🎙️</p>
      </div>

      <style>{`
        @keyframes ambientPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50%       { transform: scale(1.15); opacity: 1; }
        }
        @keyframes sttRing {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes micGlow {
          0%, 100% { transform: scale(1);   opacity: 0.6; }
          50%       { transform: scale(1.3); opacity: 1; }
        }
        @keyframes micPop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes eqBar {
          from { height: 4px;  opacity: 0.5; }
          to   { height: 28px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}


// ─── OPD Tab ─────────────────────────────────────────────────────────────────
function OPDTab({ aiMode = false }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')
  const pollingRef = useRef(null)

  const [autoSavePrompt, setAutoSavePrompt] = useState(null)
  const prevFollowupRef = useRef({})

  useEffect(() => {
    if (!aiMode) return;
    const inProg = visits.filter(v => v.status === 'in_progress' || v.status === 'in_consultation');
    inProg.forEach(v => {
      const { followupDays } = extractMedAndFollowup(v.chief_complaint);
      const prev = prevFollowupRef.current[v.id];
      if (followupDays && followupDays !== prev) {
        const fupISODate = format(addDays(new Date(), followupDays), 'yyyy-MM-dd');
        if (v.follow_up_date !== fupISODate) {
          setAutoSavePrompt({ visitId: v.id, days: followupDays, token: Date.now() });
        }
        prevFollowupRef.current[v.id] = followupDays;
      } else if (!followupDays && prev) {
        prevFollowupRef.current[v.id] = null;
      }
    });
  }, [visits, aiMode]);

  const acceptFollowUp = (visitId, days) => {
    const fupISODate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    api.patch(`/opd-visits/${visitId}/`, {
      revisit_advice: `Follow up after ${days} days`,
      follow_up_date: fupISODate,
    }).then(() => {
      setVisits(prev => prev.map(x => x.id === visitId ? { ...x, follow_up_date: fupISODate } : x));
      toast.success(`✅ Follow-up saved automatically!`);
    }).catch(() => {});
    setAutoSavePrompt(null);
  };

  useEffect(() => {
    fetchVisits()
    pollingRef.current = setInterval(fetchVisits, 15000)
    return () => clearInterval(pollingRef.current)
  }, [])

  async function fetchVisits() {
    setLoading(true)
    try {
      const { data } = await api.get(`/opd-visits/?visit_date=${today}&limit=1000`)
      setVisits(data.results || data)
    } catch { toast.error('Failed to load OPD') }
    finally { setLoading(false) }
  }

  async function callNext() {
    const waiting = visits.filter(v => v.status === 'waiting')
    if (!waiting.length) return toast('No patients waiting', { icon: 'ℹ️' })
    const next = waiting[0]
    try {
      await api.patch(`/opd-visits/${next.id}/`, { status: 'in_progress' })
      toast.success(`Token #${next.token_number} called`)
      fetchVisits()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  async function completeVisit(visit) {
    try {
      await api.patch(`/opd-visits/${visit.id}/`, { status: 'completed' })
      toast.success('Consultation done')
      fetchVisits()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  async function updateVisitNotes(id, text) {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, chief_complaint: text } : v))
    try {
      await api.patch(`/opd-visits/${id}/`, { chief_complaint: text })
    } catch { } // quiet fail
  }

  function appendVisitNotes(id, currentText, newText) {
    const space = (currentText && currentText.trim().length > 0) ? ' ' : '';
    const updated = (currentText || '') + space + newText.trim();
    updateVisitNotes(id, updated);
  }

  const waiting = visits.filter(v => v.status === 'waiting')
  const inProgress = visits.filter(v => v.status === 'in_progress' || v.status === 'in_consultation')
  const done = visits.filter(v => v.status === 'completed')

  const statusBadge = {
    waiting: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    in_consultation: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Waiting', count: waiting.length, color: 'amber' },
          { label: 'In Room', count: inProgress.length, color: 'blue' },
          { label: 'Done', count: done.length, color: 'green' },
        ].map(s => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-2xl p-4 text-center`}>
            <p className={`text-3xl font-black text-${s.color}-700`}>{s.count}</p>
            <p className={`text-xs font-semibold text-${s.color}-600 mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next token button */}
      <button onClick={callNext}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg">
        <ChevronRight size={22} />
        Call Next Token {waiting[0] ? `— #${waiting[0].token_number}` : ''}
      </button>

      {/* In-progress */}
      {inProgress.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-bold text-blue-700">🔵 Currently In Room</p>
          {inProgress.map(v => {
            const { meds, followupDays } = extractMedAndFollowup(v.chief_complaint);
            const followupDate = followupDays
              ? format(addDays(new Date(), followupDays), 'yyyy-MM-dd')
              : null;
            return (
            <div key={v.id} className="bg-white rounded-xl p-3 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl text-white font-black text-lg flex items-center justify-center">{v.token_number}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{v.patient_name || 'Patient'}</p>
                  <p className="text-xs text-gray-400">Time: {v.visit_time || ''}</p>
                </div>
                <button onClick={() => completeVisit(v)}
                  className="bg-green-600 text-white text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-1 hover:bg-green-700">
                  <CheckCircle size={13} /> Done
                </button>
              </div>

              {/* Notes area — AI mode: with dictate mic (auto-start) | Manual mode: plain textarea */}
              <div className={`relative border-2 rounded-lg overflow-hidden shadow-sm transition-colors duration-300 ${
                aiMode ? 'border-purple-300 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 focus-within:border-purple-500' : 'border-gray-200 bg-gray-50/50 focus-within:border-blue-400'
              }`}>
                <textarea
                  value={v.chief_complaint || ''}
                  onChange={(e) => updateVisitNotes(v.id, e.target.value)}
                  placeholder={aiMode ? '🎙️ Dictate freely — say "follow up in 7 days", medicines, symptoms...' : 'Type patient notes, symptoms, and observations...'}
                  className="w-full text-sm text-gray-700 bg-transparent p-2.5 min-h-[80px] outline-none resize-none"
                  style={{ paddingBottom: aiMode ? '44px' : '12px' }}
                />
                {aiMode && (
                  <div className="absolute bottom-2 right-2 flex gap-2 items-center bg-white shadow-sm border border-purple-100 rounded-full pl-3 pr-1 py-1">
                    <span className="text-[10px] text-purple-500 font-black tracking-widest uppercase">Dictate</span>
                    <MicrophoneInput autoStart={true} onTranscript={(text) => appendVisitNotes(v.id, v.chief_complaint, text)} />
                  </div>
                )}
              </div>

              {/* Follow-up Panel — conditional on AI mode */}
              {aiMode ? (
                <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3 space-y-2 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🤖</span>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-700">AI Follow-up Detection</span>
                    <span className="ml-auto text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">AUTO</span>
                  </div>

                  {/* AI detected follow-up */}
                  {followupDays ? (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2">
                      <span className="text-xs text-green-700 font-semibold">✅ Follow up in <strong>{followupDays} days</strong> — {format(addDays(new Date(), followupDays), 'dd MMM yyyy')}</span>
                      <button
                        onClick={() => {
                          const fupISODate = format(addDays(new Date(), followupDays), 'yyyy-MM-dd');
                          api.patch(`/opd-visits/${v.id}/`, {
                            revisit_advice: `Follow up after ${followupDays} days`,
                            follow_up_date: fupISODate,
                          })
                            .then(() => { setVisits(prev => prev.map(x => x.id === v.id ? { ...x, follow_up_date: fupISODate } : x)); toast.success(`✅ Follow-up saved!`); })
                            .catch(() => {});
                        }}
                        className="ml-auto text-[10px] font-bold bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 transition-all shrink-0">
                        Use this
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-purple-400 italic">🎙️ Dictate something like "follow up in 7 days" to auto-detect...</p>
                  )}

                  {/* AI extracted medicines */}
                  {meds.length > 0 && (
                    <div className="pt-2 border-t border-purple-100">
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5">💊 AI Detected Medicines</p>
                      <div className="flex flex-wrap gap-1">
                        {meds.map((med, i) => (
                          <span key={i} className="text-xs text-purple-900 bg-purple-100 rounded-full px-2.5 py-1 border border-purple-200 font-semibold">{med}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-500" />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-600">Set Follow-up Date</span>
                    <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">MANUAL</span>
                  </div>
                  <ManualFollowUp visitId={v.id} existingDate={v.follow_up_date} />
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* Waiting queue */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="font-bold text-gray-800">Queue</p>
          <span className="text-xs text-gray-400">{visits.length} total today</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {visits.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No visits today</div>
          ) : visits.map(v => (
            <div key={v.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center ${
                (v.status === 'in_progress' || v.status === 'in_consultation') ? 'bg-blue-600 text-white' :
                v.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>{v.token_number}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{v.patient_name || `Patient #${v.token_number}`}</p>
                <p className="text-xs text-gray-400">{v.chief_complaint || 'General'} · {v.visit_time || ''}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[v.status] || 'bg-gray-100 text-gray-600'}`}>
                {v.status?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
      {aiMode && autoSavePrompt && (
        <AutoSavePopup 
          key={autoSavePrompt.token} 
          prompt={autoSavePrompt} 
          onAccept={acceptFollowUp} 
          onReject={() => setAutoSavePrompt(null)} 
        />
      )}
    </div>
  )
}

// ─── Treatment Plan Builder (Drag & Drop) ─────────────────────────────────
function TPBuilder() {
  const [admissions, setAdmissions] = useState([])
  const [selectedAdm, setSelectedAdm] = useState('')
  const [planName, setPlanName] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [days, setDays] = useState({ 0: [], 1: [], 2: [], 3: [] })
  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, type: '', mode: 'add', payload: {} })
  const [paletteTab, setPaletteTab] = useState('templates') // 'templates' | 'packages'
  const [expandedPkg, setExpandedPkg] = useState(null)
  const [templates, setTemplates] = useState(MEDICINE_TEMPLATES)
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const [voiceCmdListening, setVoiceCmdListening] = useState(false)
  const [voiceLog, setVoiceLog] = useState(null)   // { text, matched: [{type,name}] } or null
  const voiceRecRef = useRef(null)
  const sensors = useSensors(useSensor(PointerSensor))
  let idCounter = useRef(0)

  useEffect(() => {
    api.get('/ipd-admissions/?status=admitted').then(({ data }) => setAdmissions(data.results || data))
  }, [])

  function mkId() { return `item-${++idCounter.current}` }

  function addToDay(template, dayIdx) {
    const times = (template.frequency && FREQ_MAP[template.frequency]) || [template.time_of_day || '08:00']
    const newItems = times.map(t => ({ ...template, _id: mkId(), time_of_day: t }))
    setDays(d => ({ ...d, [dayIdx]: [...d[dayIdx], ...newItems] }))
  }

  function addPackageToDay(pkg, dayIdx) {
    const newItems = pkg.items.flatMap(t => {
       const times = (t.frequency && FREQ_MAP[t.frequency]) || [t.time_of_day || '08:00']
       return times.map(time => ({ ...t, _id: mkId(), time_of_day: time }))
    })
    setDays(d => ({ ...d, [dayIdx]: [...d[dayIdx], ...newItems] }))
    toast.success(`"${pkg.name}" added to Day ${dayIdx + 1} (${newItems.length} orders)`)
  }

  // ─── Voice command processor (with day + time extraction) ──────────────────
  function processVoiceCommand(transcript) {
    const lower = transcript.toLowerCase();
    const matchedItems = [];

    // ── 1. Detect target day from speech ─────────────────────────────────────
    const dayWords = { one: 1, two: 2, three: 3, four: 4, '1': 1, '2': 2, '3': 3, '4': 4 };
    const dayMatch = lower.match(/\bday\s+(\w+)\b/);
    let targetDayIdx = activeDayIdx; // default = current active day
    if (dayMatch) {
      const spoken = dayMatch[1];
      const parsed = dayWords[spoken];
      if (parsed && parsed >= 1 && parsed <= 4) {
        targetDayIdx = parsed - 1;
        setActiveDayIdx(targetDayIdx); // switch tab
      }
    }

    // ── 2. Detect time from speech (robust extraction) ──────────────────────
    const timeKeywords = {
      morning: '08:00', afternoon: '13:00', evening: '18:00', night: '21:00',
      midnight: '00:00', noon: '12:00',
    };
    let overrideTime = null;

    // A. Relative offset (e.g., "after 2 hours", "in 30 minutes")
    const relRegex = /(?:after|in)\s+(\d+)\s*(hour|minute)s?/i;
    const relMatch = lower.match(relRegex);
    if (relMatch) {
      const amount = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();
      const now = new Date();
      const future = new Date(now.getTime() + (unit.startsWith('hour') ? amount * 3600000 : amount * 60000));
      overrideTime = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`;
    }

    // B. Explicit numerical time (if no relative offset found)
    if (!overrideTime) {
      const timeRegex = /(?:\bat\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m?\.?\b|o'clock)?/i;
      const timeMatch = lower.match(timeRegex);

      if (timeMatch) {
        const hStr = timeMatch[1];
        const mStr = timeMatch[2];
        const meridiemRaw = timeMatch[3] ? timeMatch[3].toLowerCase().replace(/[\.\s]/g, '') : null;
        
        let h = parseInt(hStr, 10);
        const m = mStr ? parseInt(mStr, 10) : 0;

        const hasColon = !!mStr;
        const hasMeridiem = meridiemRaw && (meridiemRaw.startsWith('a') || meridiemRaw.startsWith('p'));
        const hasOClock = meridiemRaw === "o'clock";
        const hasAtContext = lower.includes(`at ${hStr}`);

        if (hasColon || hasMeridiem || hasOClock || hasAtContext) {
          if (hasMeridiem) {
            const isPM = meridiemRaw.startsWith('p');
            if (isPM && h < 12) h += 12;
            if (!isPM && h === 12) h = 0;
          }
          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            overrideTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }
        }
      }
    }

    // C. Keyword time fallback
    if (!overrideTime) {
      for (const [kw, t] of Object.entries(timeKeywords)) {
        if (lower.includes(kw)) { overrideTime = t; break; }
      }
    }

    // helper to inject overrideTime into addToDay
    const addToDayWithTime = (tmpl) => {
      if (!overrideTime) { addToDay(tmpl, targetDayIdx); return; }
      const newItem = { ...tmpl, _id: mkId(), time_of_day: overrideTime };
      setDays(d => ({ ...d, [targetDayIdx]: [...d[targetDayIdx], newItem] }));
    };

    // ── 3. Match packages ───────────────────────────────────────────────────
    const STOP_WORDS = new Set(['give', 'check', 'start', 'add', 'from', 'with', 'after', 'hour', 'minute', 'day', 'days', 'hours', 'minutes', 'at', 'today', 'tomorrow']);
    
    packages.forEach(pkg => {
      // Split pkg name into words, filter out short words and common stop-words
      const keywords = pkg.name.toLowerCase().split(/[\s&,/-]+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      
      // Strict matching: check if any of the UNIQUE clinical keywords are present as full words
      const isMatch = keywords.some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lower);
      });

      if (isMatch) {
        if (overrideTime) {
          const newItems = pkg.items.flatMap(t => [{ ...t, _id: mkId(), time_of_day: overrideTime }]);
          setDays(d => ({ ...d, [targetDayIdx]: [...d[targetDayIdx], ...newItems] }));
          toast.success(`"${pkg.name}" → Day ${targetDayIdx + 1} @ ${overrideTime}`);
        } else {
          addPackageToDay(pkg, targetDayIdx);
        }
        matchedItems.push({ type: 'package', name: pkg.name, day: targetDayIdx + 1, time: overrideTime });
      }
    });

    // ── 4. Match templates ──────────────────────────────────────────────────
    templates.forEach(tmpl => {
      // Clean the title for matching (exclude common prefixes like "Give", "Check")
      const keywords = tmpl.title.toLowerCase().split(/[\s&,()-]+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      
      const isMatch = keywords.some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lower);
      });

      if (isMatch) {
        addToDayWithTime(tmpl);
        matchedItems.push({ type: 'template', name: tmpl.title, day: targetDayIdx + 1, time: overrideTime });
      }
    });

    if (matchedItems.length > 0) {
      setVoiceLog({ text: transcript, matched: matchedItems, day: targetDayIdx + 1, time: overrideTime });
      setTimeout(() => setVoiceLog(null), 6000);
    } else {
      toast(`No match for: "${transcript.slice(0, 40)}"`, { icon: '🎙️' });
    }
  }

  function toggleVoiceCmd() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Speech not supported'); return; }

    if (voiceCmdListening) {
      voiceRecRef.current?.stop();
      setVoiceCmdListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    voiceRecRef.current = rec;

    rec.onresult = e => {
      const transcript = e.results[0][0].transcript;
      processVoiceCommand(transcript);
    };
    rec.onerror = () => setVoiceCmdListening(false);
    rec.onend = () => setVoiceCmdListening(false);

    rec.start();
    setVoiceCmdListening(true);
  }

  function removeFromDay(dayIdx, itemId) {
    setDays(d => ({ ...d, [dayIdx]: d[dayIdx].filter(i => i._id !== itemId) }))
  }

  function updateItem(dayIdx, itemId, field, val) {
    setDays(d => ({
      ...d,
      [dayIdx]: d[dayIdx].map(i => i._id === itemId ? { ...i, [field]: val } : i)
    }))
  }

  function handleDragEnd(event, dayIdx) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setDays(d => {
        const arr = d[dayIdx]
        const oldIndex = arr.findIndex(i => i._id === active.id)
        const newIndex = arr.findIndex(i => i._id === over.id)
        return { ...d, [dayIdx]: arrayMove(arr, oldIndex, newIndex) }
      })
    }
  }

  function addTemplate() {
    setModal({ open: true, type: 'template', mode: 'add', payload: { title: '', instructions: '', category: 'medication', frequency: 'OD', color: 'yellow' } })
  }

  function editTemplate(index) {
    const t = templates[index]
    setModal({ open: true, type: 'template', mode: 'edit', payload: { index, color: 'yellow', frequency: 'OD', ...t } })
  }

  function togglePin(index) {
    setTemplates(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isPinned: !copy[index].isPinned };
      return copy;
    });
  }

  function deleteTemplate(index) {
    if(window.confirm('Delete template?')) setTemplates(prev => prev.filter((_, idx) => idx !== index))
  }

  function addPackage() {
    setModal({ open: true, type: 'package', mode: 'add', payload: { name: '', color: 'blue' } })
  }

  function editPackageName(pkgId) {
    const p = packages.find(x => x.id === pkgId)
    if(p) setModal({ open: true, type: 'package', mode: 'edit', payload: { pkgId, name: p.name, color: p.color } })
  }

  function deletePackage(pkgId) {
    if(window.confirm('Delete package?')) {
      setPackages(prev => prev.filter(p => p.id !== pkgId))
      if (expandedPkg === pkgId) setExpandedPkg(null)
    }
  }

  function addPackageItem(pkgId) {
    setModal({ open: true, type: 'packageItem', mode: 'add', payload: { pkgId, title: '', instructions: '', category: 'medication', frequency: 'OD' } })
  }

  function editPackageItem(pkgId, itemIdx) {
    const p = packages.find(x => x.id === pkgId)
    if(p) {
      const item = p.items[itemIdx]
      setModal({ open: true, type: 'packageItem', mode: 'edit', payload: { pkgId, itemIdx, frequency: 'OD', ...item } })
    }
  }

  function deletePackageItem(pkgId, itemIdx) {
    if(window.confirm('Delete item?')) {
      setPackages(prev => prev.map(p => p.id === pkgId ? {
        ...p,
        items: p.items.filter((_, idx) => idx !== itemIdx),
      } : p))
    }
  }

  function handleModalSave() {
    const { type, mode, payload } = modal;
    if (!payload) return;
    
    if (type === 'template') {
      const bestIcon = payload.icon || suggestIconsByName(payload.title)[0] || categoryEmoji[payload.category] || '📋';
      const newData = { title: payload.title, instructions: payload.instructions, category: payload.category, frequency: payload.frequency || 'OD', icon: bestIcon, color: payload.color || 'yellow' };
      if (mode === 'add') {
         setTemplates(prev => [...prev, newData]);
      } else {
         setTemplates(prev => prev.map((it, idx) => idx === payload.index ? { ...it, ...newData } : it));
      }
    } else if (type === 'package') {
      if (mode === 'add') {
         setPackages(prev => [...prev, { id: `pkg-${Date.now()}`, name: payload.name, color: payload.color, items: [] }]);
      } else {
         setPackages(prev => prev.map(p => p.id === payload.pkgId ? { ...p, name: payload.name, color: payload.color } : p));
      }
    } else if (type === 'packageItem') {
       const newItem = { title: payload.title, instructions: payload.instructions, category: payload.category, frequency: payload.frequency || 'OD' };
       if (mode === 'add') {
          setPackages(prev => prev.map(p => p.id === payload.pkgId ? {
            ...p,
            items: [...p.items, newItem],
          } : p));
       } else {
          setPackages(prev => prev.map(p => {
             if (p.id !== payload.pkgId) return p;
             return {
                ...p,
                items: p.items.map((it, idx) => idx === payload.itemIdx ? { ...it, ...newItem } : it)
             };
          }));
       }
    }
    setModal({ open: false, type: '', mode: 'add', payload: {} });
  }

  async function createPlan() {
    if (!selectedAdm) return toast.error('Select a patient')
    const totalItems = Object.values(days).flat().length
    if (totalItems === 0) return toast.error('Add at least one order item')
    setLoading(true)
    try {
      const endDate = format(addDays(new Date(startDate), 3), 'yyyy-MM-dd')
      const resPlan = await api.post('/treatment-plans/', {
        ipd_admission: selectedAdm,
        name: planName || 'Treatment Plan',
        start_date: startDate,
        end_date: endDate,
      })
      const pl = resPlan.data?.data || resPlan.data  // support success_response and plain DRF
      let seq = 0
      for (const [dayOffset, items] of Object.entries(days)) {
        for (const item of items) {
          seq++
          await api.post('/treatment-plan-items/', {
            plan: pl.id,
            sequence: seq,
            title: item.title,
            instructions: item.instructions || '',
            category: item.category,
            day_offset: parseInt(dayOffset),
            time_of_day: item.time_of_day || '08:00',
            is_active: true,
          })
        }
      }
      toast.success(`Plan created with ${totalItems} orders!`)
      setDays({ 0: [], 1: [], 2: [], 3: [] })
      setPlanName('')
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  const totalItems = Object.values(days).flat().length

  return (
    <div className="space-y-4">
      {/* Patient & plan meta */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Patient (IPD)</label>
            <select value={selectedAdm} onChange={e => setSelectedAdm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">-- Select patient --</option>
              {admissions.map(a => <option key={a.id} value={a.id}>{a.patient_name || a.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Plan Name</label>
            <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Post-op care"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Palette: Templates | Packages */}
        <div className="col-span-5 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[calc(100vh-210px)]">
          {/* Tab switcher + Voice CMD mic */}
          <div className="flex items-center gap-1.5 p-2 bg-gray-50 border-b border-gray-100">
            <button onClick={() => setPaletteTab('templates')}
              className={`flex-1 flex gap-2 items-center justify-center text-[11px] uppercase tracking-wider font-extrabold py-2 px-3 rounded-xl transition-all ${paletteTab === 'templates' ? 'bg-white text-blue-700 shadow border border-gray-200 ring-1 ring-blue-500/10' : 'text-gray-400 hover:bg-gray-100/50'}`}>
              🧪 Templates <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${paletteTab === 'templates' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{templates.length}</span>
            </button>
            <button onClick={() => setPaletteTab('packages')}
              className={`flex-1 flex gap-2 items-center justify-center text-[11px] uppercase tracking-wider font-extrabold py-2 px-3 rounded-xl transition-all ${paletteTab === 'packages' ? 'bg-white text-blue-700 shadow border border-gray-200 ring-1 ring-blue-500/10' : 'text-gray-400 hover:bg-gray-100/50'}`}>
              📦 Packages <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${paletteTab === 'packages' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>{packages.length}</span>
            </button>
            {/* AI Voice Command Button */}
            <button
              onClick={toggleVoiceCmd}
              title={voiceCmdListening ? 'Stop voice command' : 'Say a package or template name to add to Day ' + (activeDayIdx + 1)}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all ${
                voiceCmdListening
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/40'
                  : 'bg-gray-100 hover:bg-purple-100 text-gray-500 hover:text-purple-600'
              }`}
            >
              {voiceCmdListening ? (
                <>
                  <Mic size={16} className="text-white z-10" />
                  <span className="absolute inset-0 rounded-xl animate-ping bg-purple-500/40" />
                </>
              ) : (
                <Mic size={16} />
              )}
            </button>
          </div>

          {/* Voice command feedback banner */}
          {voiceLog && (
            <div className="mx-2 mt-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 shadow-sm">
              <p className="text-[10px] text-purple-500 uppercase font-extrabold tracking-wider flex items-center gap-1">
                <Mic size={10} /> Heard: <span className="text-purple-700 font-bold normal-case tracking-normal">"{voiceLog.text.slice(0, 50)}"</span>
              </p>
              {/* Day + Time detected */}
              <div className="flex gap-2">
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  📅 Day {voiceLog.day}
                </span>
                {voiceLog.time && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    ⏰ {voiceLog.time}
                  </span>
                )}
              </div>
              {/* Matched items */}
              <div className="flex flex-wrap gap-1">
                {voiceLog.matched.map((m, i) => (
                  <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.type === 'package' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {m.type === 'package' ? '📦' : '🧪'} {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Templates tab */}
          {paletteTab === 'templates' && (
            <div className="p-3 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-gray-400">Add directly to days →</p>
                <button onClick={addTemplate} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-all shadow-sm">+ New Note</button>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-4">
                {templates.map((t, i) => ({ ...t, _originalIndex: i }))
                 .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                 .map((t) => {
                  const i = t._originalIndex;
                  const c = pkgColors[t.color || 'yellow'] || pkgColors.yellow;
                  return (
                  <div key={i} onClick={() => addToDay(t, activeDayIdx)} className={`rounded-lg shadow-sm border p-2.5 flex flex-col justify-start ${c.bg} ${c.border} relative group transform transition-all duration-200 cursor-pointer hover:shadow hover:-translate-y-0.5`}>
                    {t.isPinned && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg drop-shadow-md z-10 transition-transform group-hover:scale-110">📌</div>}
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-base bg-white/60 w-7 h-7 flex items-center justify-center rounded-md shadow-sm" title={t.category}>{t.icon || categoryEmoji[t.category]}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); togglePin(i) }} className="p-1 rounded-md bg-white/80 hover:bg-white border border-transparent hover:border-gray-300 text-gray-700 transition-all shadow-sm" title={t.isPinned ? "Unpin" : "Pin to Top"}>{t.isPinned ? '📍' : '📌'}</button>
                          <button onClick={(e) => { e.stopPropagation(); editTemplate(i) }} className={`p-1 rounded-md bg-white/80 hover:bg-white border border-transparent hover:border-gray-200 text-gray-700 transition-all shadow-sm ${c.text}`}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteTemplate(i) }} className="p-1 rounded-md bg-white/80 hover:bg-white border border-transparent hover:border-red-200 text-red-600 transition-all shadow-sm">❌</button>
                        </div>
                      </div>
                      <p className={`font-bold text-xs leading-tight mb-1 line-clamp-2 ${c.text}`}>{t.title}</p>
                      {t.instructions && <p className={`text-[10px] leading-tight line-clamp-2 ${c.text} opacity-80 mt-1`}>{t.instructions}</p>}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* Packages tab */}
          {paletteTab === 'packages' && (
            <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-xs text-gray-400">Add all items in a package to any day →</p>
                <button onClick={addPackage} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg font-semibold">+ Add</button>
              </div>
              {packages.map(pkg => {
                const c = pkgColors[pkg.color] || pkgColors.blue
                const isOpen = expandedPkg === pkg.id
                return (
                  <div key={pkg.id} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden text-xs`}>
                    {/* Package header */}
                    <button
                      onClick={() => setExpandedPkg(isOpen ? null : pkg.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left ${c.text}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">📦</span>
                        <span className="text-xs font-bold">{pkg.name}</span>
                        <span className="text-xs opacity-60">({pkg.items.length})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); editPackageName(pkg.id) }} className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 text-gray-700">Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); deletePackage(pkg.id) }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Del</button>
                        <span className="text-xs opacity-60">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Add-to-day row always visible */}
                    <div className="px-2 pb-2">
                       <button onClick={() => addPackageToDay(pkg, activeDayIdx)}
                         className={`w-full text-xs font-bold py-1.5 rounded-lg transition-all ${c.btn}`}
                         title={`Add all to Day ${activeDayIdx + 1}`}>+ Add to Day {activeDayIdx + 1}</button>
                    </div>

                    {/* Expandable item list */}
                    {isOpen && (
                      <div className="px-2 pb-2 space-y-1 border-t border-white/60 pt-2">
                        <button onClick={() => addPackageItem(pkg.id)} className="w-full text-[11px] py-1 rounded-lg bg-white/80 text-gray-700 font-semibold">
                          + Add item to package
                        </button>
                        {pkg.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 bg-white/70 rounded-lg px-2 py-1">
                            <span>{categoryEmoji[item.category]}</span>
                            <span className="flex-1 truncate font-medium">{item.title}</span>
                            <span className="text-blue-500 font-bold shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">{item.frequency || item.time_of_day || 'OD'}</span>
                            <button onClick={() => editPackageItem(pkg.id, idx)} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">E</button>
                            <button onClick={() => deletePackageItem(pkg.id, idx)} className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600">D</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Day columns */}
        <div className="col-span-5 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[calc(100vh-210px)]">
          {/* Day Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
             {[0, 1, 2, 3].map(dayIdx => (
                <button
                   key={dayIdx}
                   onClick={() => setActiveDayIdx(dayIdx)}
                   className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-between transition-all ${activeDayIdx === dayIdx ? 'bg-white shadow-md border border-gray-100 ring-1 ring-blue-500/10 scale-[1.02]' : 'hover:bg-gray-100/50 text-gray-500'}`}
                >
                   <div className="text-left">
                     <p className={`text-sm font-extrabold ${activeDayIdx === dayIdx ? 'text-blue-700' : ''}`}>Day {dayIdx + 1}</p>
                     <p className={`text-xs ${activeDayIdx === dayIdx ? 'text-blue-400 font-medium' : 'text-gray-400'}`}>{format(addDays(new Date(startDate), dayIdx), 'dd MMM')}</p>
                   </div>
                   <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${activeDayIdx === dayIdx ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>{days[dayIdx].length} items</span>
                </button>
             ))}
          </div>

          {/* Active Day Content */}
          <div className="p-4 flex-1 bg-gray-50/30 overflow-y-auto custom-scrollbar">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, activeDayIdx)}>
              <SortableContext items={days[activeDayIdx].map(i => i._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[400px]">
                  {days[activeDayIdx].length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl bg-white mt-4">
                      <Plus size={28} className="mb-2 text-gray-300" />
                      Add orders to Day {activeDayIdx + 1}
                    </div>
                  ) : (
                    days[activeDayIdx].map(task => (
                      <SortableTaskRow
                        key={task._id}
                        task={task}
                        onRemove={id => removeFromDay(activeDayIdx, id)}
                        onUpdate={(id, field, val) => updateItem(activeDayIdx, id, field, val)}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      <button onClick={createPlan} disabled={loading || totalItems === 0}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
        <ClipboardList size={20} />
        {loading ? 'Creating Plan...' : `Create Plan (${totalItems} orders across 4 days)`}
      </button>

      {modal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-gray-800 text-lg">
                {modal.mode === 'add' ? 'Create' : 'Edit'} {modal.type === 'template' ? 'Template' : modal.type === 'package' ? 'Package' : 'Package Item'}
              </h3>
              <button type="button" onClick={() => setModal({ open: false, type: '', mode: 'add', payload: {} })} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {modal.type === 'package' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Package Name <span className="text-red-400">*</span></label>
                    <input autoFocus value={modal.payload.name || ''} onChange={e => setModal({...modal, payload: {...modal.payload, name: e.target.value}})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800" placeholder="e.g. ICU General Protocol" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Color Tag</label>
                    <div className="grid grid-cols-5 gap-2">
                       {['purple', 'green', 'blue', 'red', 'amber'].map(c => (
                         <button key={c} type="button" onClick={() => setModal({...modal, payload: {...modal.payload, color: c}})} 
                            className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${modal.payload.color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-sm' : 'hover:scale-105'}`}
                         >
                            <span className={`block w-full h-full rounded-xl ${pkgColors[c]?.bg || `bg-${c}-50`} ${pkgColors[c]?.border || `border-${c}-200`} border-2 border-solid`}></span>
                         </button>
                       ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Title <span className="text-red-400">*</span></label>
                    <input autoFocus value={modal.payload.title || ''} onChange={e => setModal({...modal, payload: {...modal.payload, title: e.target.value}})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800" placeholder="e.g. Administer Glucose" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Instructions</label>
                    <input value={modal.payload.instructions || ''} onChange={e => setModal({...modal, payload: {...modal.payload, instructions: e.target.value}})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800" placeholder="e.g. 500ml IV over 2 hours" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Category</label>
                      <select value={modal.payload.category || 'medication'} onChange={e => setModal({...modal, payload: {...modal.payload, category: e.target.value}})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800 bg-white cursor-pointer">
                        {Object.keys(categoryEmoji).map(c => <option key={c} value={c}>{categoryEmoji[c]} <span className="capitalize">{c}</span></option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Frequency</label>
                      <select value={modal.payload.frequency || 'OD'} onChange={e => setModal({...modal, payload: {...modal.payload, frequency: e.target.value}})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-800 bg-white cursor-pointer">
                        {Object.keys(FREQ_MAP).map(f => <option key={f} value={f}>{f} ({FREQ_MAP[f].length}x)</option>)}
                      </select>
                    </div>
                  </div>
                  {modal.type === 'template' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider mt-4">Sticky Note Color</label>
                      <div className="grid grid-cols-6 gap-2">
                         {['yellow', 'purple', 'green', 'blue', 'red', 'amber'].map(c => (
                           <button key={c} type="button" onClick={() => setModal({...modal, payload: {...modal.payload, color: c}})} 
                              className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${modal.payload.color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-sm' : 'hover:scale-105'}`}
                           >
                              <span className={`block w-full h-full rounded-xl ${pkgColors[c]?.bg || `bg-${c}-50`} ${pkgColors[c]?.border || `border-${c}-200`} border-2 border-solid`}></span>
                           </button>
                         ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
               <button onClick={() => setModal({ open: false, type: '', mode: 'add', payload: {} })} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm rounded-xl transition-all">Cancel</button>
               <button onClick={handleModalSave} disabled={!(modal.type === 'package' ? modal.payload.name : modal.payload.title)} className="px-7 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg shadow-blue-600/20 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2">
                 <CheckCircle size={16} /> Save
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const [tab, setTab] = useState('opd')
  const [aiMode, setAiMode] = useState(false)
  const [showAiTransition, setShowAiTransition] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const toggleAI = () => {
    if (!aiMode) setShowAiTransition(true);
    else setAiMode(false);
  };

  const AIToggleBtn = (
    <button
      onClick={toggleAI}
      title={aiMode ? 'Disable AI Mode' : 'Enable AI Assistant'}
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all duration-300 border-2 ${
        aiMode
          ? 'bg-white/20 border-white/40 text-white shadow-lg'
          : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
      }`}
    >
      <span className="text-base">🤖</span>
      <span className="hidden sm:inline">{aiMode ? 'AI ON' : 'AI OFF'}</span>
      <span className={`relative inline-flex h-4 w-8 items-center rounded-full transition-all ${
        aiMode ? 'bg-green-400' : 'bg-white/30'
      }`}>
        <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-all ${
          aiMode ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </span>
    </button>
  );

  return (
    <>
      {showAiTransition && <AITransitionOverlay onDone={() => { setShowAiTransition(false); setAiMode(true); }} />}
      <Layout title="Doctor Portal" subtitle={user.email || 'Doctor'} color="blue" tabs={TABS} activeTab={tab} onTab={setTab} headerExtra={AIToggleBtn}>
        {tab === 'opd' && <OPDTab aiMode={aiMode} />}
        {tab === 'tp' && <TPBuilder />}
        {tab === 'analytics' && <DoctorAnalytics />}
      </Layout>
    </>
  )
}
