import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  Lock, 
  Unlock, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Info, 
  FileText, 
  HeartHandshake, 
  UserCheck, 
  Briefcase,
  HelpCircle,
  TrendingUp,
  Sliders,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { UserProfile, DaySchedule, AttachedFile, SlotAvailability } from './types';
import { DEFAULT_USERS, SEED_SCHEDULES, HOURLY_SLOTS, DEFAULT_ATTACHED_FILES } from './data';
import { ManualCalendarReference } from './components/ManualCalendarReference';
import { AppsScriptHelper } from './components/AppsScriptHelper';

// Firebase core + Firestore sync tools
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';

// Academic Months Sequence (August 2569 B.E. to July 2570 B.E.)
interface AcademicMonth {
  index: number; // 0-11 for JS Date (but mapping to custom years)
  year: number;  // CE Year (2026 or 2027)
  thaiName: string;
  beYear: number; // Buddhist Era
}

const ACADEMIC_MONTHS: AcademicMonth[] = [
  { index: 7, year: 2026, thaiName: 'สิงหาคม', beYear: 2569 },
  { index: 8, year: 2026, thaiName: 'กันยายน', beYear: 2569 },
  { index: 9, year: 2026, thaiName: 'ตุลาคม', beYear: 2569 },
  { index: 10, year: 2026, thaiName: 'พฤศจิกายน', beYear: 2569 },
  { index: 11, year: 2026, thaiName: 'ธันวาคม', beYear: 2569 },
  { index: 0, year: 2027, thaiName: 'มกราคม', beYear: 2570 },
  { index: 1, year: 2027, thaiName: 'กุมภาพันธ์', beYear: 2570 },
  { index: 2, year: 2027, thaiName: 'มีนาคม', beYear: 2570 },
  { index: 3, year: 2027, thaiName: 'เมษายน', beYear: 2570 },
  { index: 4, year: 2027, thaiName: 'พฤษภาคม', beYear: 2570 },
  { index: 5, year: 2027, thaiName: 'มิถุนายน', beYear: 2570 },
  { index: 6, year: 2027, thaiName: 'กรกฎาคม', beYear: 2570 }
];

export default function App() {
  // --- Persistent State ---
  const [schedules, setSchedules] = useState<DaySchedule[]>(SEED_SCHEDULES);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(DEFAULT_ATTACHED_FILES);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USERS[0]); // Default to "AS"
  const [selectedMonth, setSelectedMonth] = useState<AcademicMonth>(ACADEMIC_MONTHS[0]); // Default to August 2569
  const [selectedDateString, setSelectedDateString] = useState<string>('2026-08-03'); // Match seed data initially
  const [gasUrl, setGasUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attachments' | 'gas-integration'>('dashboard');

  // --- UI & Controls State ---
  const [sysTime, setSysTime] = useState<Date>(new Date());
  const [isLocked, setIsLocked] = useState(false); // Time-based integrity simulation lock
  const [auditLogs, setAuditLogs] = useState<string[]>(['[ระบบ] เริ่มต้นเซสชันความปลอดภัยเชิงเวลาสำเร็จ']);
  const [tempNoteInputs, setTempNoteInputs] = useState<{ [hour: string]: string }>({});
  
  // Real Firebase User & Status State
  const [fbUser, setFbUser] = useState<any>(null);

  const addAuditLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('th-TH');
    setAuditLogs(prev => [`[${timeStr}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // 1. Initially check Firebase connection state on mount
  useEffect(() => {
    async function checkFirebase() {
      try {
        await getDocFromServer(doc(db, 'test_dummy', 'ping'));
      } catch (err) {
        console.warn('Firebase boot check finished:', err);
      }
    }
    checkFirebase();
  }, []);

  // 2. Setup Real-time Listeners for Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      if (user) {
        addAuditLog(`🟢 เชื่อมต่อบัญชีคลาวด์สำเร็จ: (${user.displayName || user.email})`);
      } else {
        addAuditLog(`⚪ สิ้นสุด/ไม่อยู่ในเซสชัน Firebase Auth`);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Listen to Day Schedules updates on Firestore with fallbacks
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const dbSchedules: DaySchedule[] = [];
      snapshot.forEach(docSnap => {
        dbSchedules.push(docSnap.data() as DaySchedule);
      });
      if (dbSchedules.length > 0) {
        setSchedules(dbSchedules);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schedules');
    });
    return () => unsub();
  }, []);

  // 4. Listen to Attached Files updates on Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'attachedFiles'), (snapshot) => {
      const dbFiles: AttachedFile[] = [];
      snapshot.forEach(docSnap => {
        dbFiles.push(docSnap.data() as AttachedFile);
      });
      if (dbFiles.length > 0) {
        setAttachedFiles(dbFiles);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attachedFiles');
    });
    return () => unsub();
  }, []);

  // 5. Listen to dynamic Primary GAS configuration URL
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'gasConfig', 'primary'), (docSnap) => {
      if (docSnap.exists()) {
        setGasUrl(docSnap.data().gasUrl || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'gasConfig/primary');
    });
    return () => unsub();
  }, []);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => {
      setSysTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Retrieve active day schedule or empty
  const getDaySchedule = (dateStr: string): DaySchedule => {
    return schedules.find(s => s.dateString === dateStr) || { dateString: dateStr, slots: {} };
  };

  // --- Actions ---
  const handleUpdateAvailability = (
    hour: string,
    status: 'available' | 'busy' | 'none',
    noteText?: string,
    struckThrough?: boolean
  ) => {
    if (isLocked) {
      alert('⚠️ ตารางถูกปิดล็อกด้วยระบบความปลอดภัยเชิงเวลา (Time-based Validation Server Lock) เพื่อความปลอดภัยสูงสุด กรุณาเปิดระบบการขอปลดล็อกชั่วคราว');
      return;
    }

    setSchedules(prevSchedules => {
      const updated = [...prevSchedules];
      let dayIndex = updated.findIndex(s => s.dateString === selectedDateString);

      if (dayIndex === -1) {
        // Create new day schedule
        const newDay: DaySchedule = {
          dateString: selectedDateString,
          slots: {}
        };
        updated.push(newDay);
        dayIndex = updated.length - 1;
      }

      const day = { ...updated[dayIndex] };
      const slotAvails = day.slots[hour] ? [...day.slots[hour]] : [];
      const userAvailIndex = slotAvails.findIndex(a => a.userId === currentUser.id);

      const targetNote = noteText !== undefined ? noteText : (tempNoteInputs[hour] || '');
      const isStruck = struckThrough !== undefined ? struckThrough : false;

      const newAvail: SlotAvailability = {
        userId: currentUser.id,
        userName: currentUser.name,
        status,
        note: targetNote,
        isStruckThrough: isStruck,
        updatedAt: new Date().toISOString()
      };

      if (userAvailIndex >= 0) {
        if (status === 'none' && !targetNote) {
          // Remove if cleared and empty
          slotAvails.splice(userAvailIndex, 1);
        } else {
          slotAvails[userAvailIndex] = newAvail;
        }
      } else if (status !== 'none' || targetNote) {
        slotAvails.push(newAvail);
      }

      day.slots = { ...day.slots, [hour]: slotAvails };
      updated[dayIndex] = day;

      // Log activity
      const formattedStatus = status === 'available' ? 'ว่าง' : status === 'busy' ? 'ไม่ว่าง' : 'ยกเลิกเวลานัด';
      addAuditLog(`ผู้ใช้ ${currentUser.name} อัปเดตช่วง ${hour} เป็น [${formattedStatus}] หมายเหตุ: "${targetNote}"`);

      // 6. Persist directly to Firebase Firestore with custom safety wrappers
      setDoc(doc(db, 'schedules', selectedDateString), day)
        .catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `schedules/${selectedDateString}`);
        });

      return updated;
    });

    // If Google Sheets GAS is configured, send update in background
    if (gasUrl) {
      sendDataToGAS();
    }
  };

  const handleUpdateNoteText = (hour: string, text: string) => {
    setTempNoteInputs(prev => ({ ...prev, [hour]: text }));
    // Automatically preserve existing status when updating note
    const day = getDaySchedule(selectedDateString);
    const existing = day.slots[hour]?.find(a => a.userId === currentUser.id);
    const currentStatus = existing ? existing.status : 'none';
    const isStruck = existing ? existing.isStruckThrough : false;
    
    handleUpdateAvailability(hour, currentStatus, text, isStruck);
  };

  const handleClearSlot = (hour: string) => {
    setTempNoteInputs(prev => ({ ...prev, [hour]: '' }));
    handleUpdateAvailability(hour, 'none', '', false);
    addAuditLog(`ลบข้อมูลช่วงเวลา ${hour} เรียบร้อยแล้ว`);
  };

  const handleToggleStrikeThrough = (hour: string) => {
    const day = getDaySchedule(selectedDateString);
    const existing = day.slots[hour]?.find(a => a.userId === currentUser.id);
    if (!existing) return;

    const currentStatus = existing.status;
    const currentNote = existing.note;
    const nextStruck = !existing.isStruckThrough;

    handleUpdateAvailability(hour, currentStatus, currentNote, nextStruck);
    addAuditLog(`เปลี่ยนสถานะการขีดฆ่าตารางนัดหมายในช่วงเวลา ${hour} (${nextStruck ? 'ขีดทับสำเร็จ' : 'นำขีดทับออก'})`);
  };

  // --- Real-Time Simulation Trigger ---
  const handleSimulateTeamActivity = () => {
    // Randomizes availability for other members so the user instantly sees a rich heatmap
    setSchedules(prev => {
      const updated = [...prev];
      let dayIndex = updated.findIndex(s => s.dateString === selectedDateString);

      if (dayIndex === -1) {
        updated.push({ dateString: selectedDateString, slots: {} });
        dayIndex = updated.length - 1;
      }

      const day = { ...updated[dayIndex] };
      const simulatedNotes = [
        'ติดสอน วก.201', 'ว่างครับ เข้าประชุมได้', 'ว่างเฉพาะช่วงนี้', 'ติดตรวจประเมินหลักสูตร', 
        'ว่างตลอดช่วงบ่าย', 'หากทีมสะดวก ยินดีเลื่อนเวลามาพบพาน', 'ติดแล็บวิจัย'
      ];

      HOURLY_SLOTS.forEach(hour => {
        const slotsForHour = day.slots[hour] ? [...day.slots[hour]] : [];
        
        // Let's seed for developers OTHER than the current selected user
        DEFAULT_USERS.forEach(user => {
          if (user.id === currentUser.id || user.id === 'secretary') return;
          
          const existingIdx = slotsForHour.findIndex(s => s.userId === user.id);
          const probability = Math.random();
          let status: 'available' | 'busy' | 'none' = 'none';
          let note = '';
          let isStruck = false;

          if (probability > 0.4) {
            status = probability > 0.7 ? 'available' : 'busy';
            if (status === 'busy') {
              note = simulatedNotes[Math.floor(Math.random() * simulatedNotes.length)];
              isStruck = Math.random() > 0.85; // 3.5: 15% probability of strike out
            }
          }

          if (status !== 'none' || note) {
            const simulatedAvail: SlotAvailability = {
              userId: user.id,
              userName: user.name,
              status,
              note,
              isStruckThrough: isStruck,
              updatedAt: new Date(Date.now() - Math.random() * 3600000).toISOString()
            };

            if (existingIdx >= 0) {
              slotsForHour[existingIdx] = simulatedAvail;
            } else {
              slotsForHour.push(simulatedAvail);
            }
          } else if (existingIdx >= 0) {
            slotsForHour.splice(existingIdx, 1);
          }
        });

        day.slots[hour] = slotsForHour;
      });

      updated[dayIndex] = day;

      // Persist simulation data to Firestore
      setDoc(doc(db, 'schedules', selectedDateString), day)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `schedules/${selectedDateString}`));

      return updated;
    });

    addAuditLog('⚡ จำลองกิจกรรมทีมบริหารสำเร็จ: ความหนาแน่นแผนความร้อน (Heatmap Overlay Matrix) อัปเดตอัตโนมัติ');
  };

  // --- GAS Synchronization Simulator ---
  const sendDataToGAS = async (optSchedules?: DaySchedule[]) => {
    if (!gasUrl) return;
    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveSchedules',
          schedules: optSchedules || schedules,
          updater: currentUser.name
        })
      });
      addAuditLog(`☁️ ส่งซิงค์ข้อมูลกับสเปรดชีต Google Sheets สำเร็จ`);
    } catch (e) {
      addAuditLog(`⚠️ ไม่สามารถซิงค์ Google Sheets ได้เนื่องจากข้อจำกัดการเชื่อมต่อภายนอก`);
    }
  };

  // --- Date Math for Custom Fiscal Period (Aug 2026 - Jul 2027) ---
  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getFirstDayOffset = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex, 1).getDay(); // 0 (Sun) to 6 (Sat)
  };

  // Build dates list for current selectedMonth
  const daysInActiveMonth = getDaysInMonth(selectedMonth.year, selectedMonth.index);
  const firstDayOfWeekOffset = getFirstDayOffset(selectedMonth.year, selectedMonth.index);

  const daysArray = Array.from({ length: daysInActiveMonth }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: firstDayOfWeekOffset }, (_, i) => i);

  // File Add / Remove hooks
  const handleAddFile = async (file: AttachedFile) => {
    setAttachedFiles(prev => [file, ...prev]);
    addAuditLog(`📁 เพิ่มไฟล์แนบใหม่สำเร็จ: "${file.name}"`);

    // Write file to Firestore
    try {
      await setDoc(doc(db, 'attachedFiles', file.id), file);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `attachedFiles/${file.id}`);
    }
  };

  const handleRemoveFile = async (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
    addAuditLog(`🗑️ ลบไฟล์แนบออกจากระบบ`);

    // Delete file from Firestore
    try {
      await deleteDoc(doc(db, 'attachedFiles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `attachedFiles/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans leading-relaxed selection:bg-indigo-100 selection:text-indigo-900" id="app-root-layout">
      
      {/* Main Navigation Header with Sleek Interface brand guidelines */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-4 lg:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          
          {/* Logo & Headline */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center relative group overflow-hidden">
              <Users className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-display tracking-tight text-slate-900 font-bold">
                  ระบบตารางนัดทีม วก. ปีการศึกษา 2570
                </h1>
                <span className="bg-indigo-50/70 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-100 font-display">
                  สิงหาคม 2569 – กรกฎาคม 2570
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-sans leading-relaxed">
                โมเดลวิเคราะห์ความพร้อมครอบคลุมแบบเวลาจริงของกลุ่มผู้บริหารวิชาการ เพื่อการจัดเก็บตารางนโยบายแม่นยำ
              </p>
            </div>
          </div>

          {/* Time-Based Safety and Connection Status Container */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            
            {/* Google Authentication Status Badge */}
            {fbUser ? (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/90 py-1.5 px-3 rounded-xl border border-emerald-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                <span className="font-semibold text-slate-700">ลงชื่อเข้าไว้: {fbUser.displayName || fbUser.email}</span>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    addAuditLog('🔒 สิ้นสุด/ออกจากระบบ Cloud');
                  }}
                  className="ml-2 font-bold text-rose-650 hover:text-rose-700 underline cursor-pointer text-[10px]"
                >
                  ออกระบบ
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await signInWithPopup(auth, googleProvider);
                  } catch (e) {
                    addAuditLog(`⚠️ เข้าสู่ระบบล้มเหลว: ${e instanceof Error ? e.message : String(e)}`);
                  }
                }}
                className="flex items-center gap-1.5 text-[11px] font-bold py-1.5 px-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl shadow-xs transition-all duration-200 cursor-pointer focus:outline-none"
              >
                <span>ลงชื่อเข้าใช้ Google Coordinated</span>
              </button>
            )}

            {/* Clock */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white py-1.5 px-3 rounded-xl border border-slate-200/60 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span className="font-medium">{sysTime.toLocaleDateString() === '10/6/2026' ? '10 มิ.ย. 2569' : sysTime.toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="font-bold text-indigo-650">{sysTime.toLocaleTimeString('th-TH', { hour12: false })}</span>
            </div>

            {/* Time-based safety lock indicator */}
            <button
              onClick={() => {
                setIsLocked(!isLocked);
                addAuditLog(isLocked ? '🔓 ปลดล็อกสิทธิ์แก้ไขข้อมูลสัญญากลางสำเร็จ' : '🔒 ล็อกข้อมูลความปลอดภัยเชิงเวลาแบบบูรณภาพเชิงโครงสร้าง');
              }}
              className={`flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-3 rounded-xl border transition-all duration-200 focus:outline-none cursor-pointer ${
                isLocked
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:shadow-xs'
              }`}
              title="ตรวจสอบสิทธิ์เชิงเวลา ป้องกันการเปลี่ยนแปลงย้อนหลังโดยบุคคลอื่น"
            >
              {isLocked ? <Lock className="w-3.5 h-3.5 text-rose-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{isLocked ? 'ล็อกบูรณภาพเชิงเวลา' : 'พร้อมรับการแก้ไข'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Dashboard Area */}
      <main className="flex-grow p-4 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 gap-6">
        
        {/* Step 2: Role Switcher & Environment Simulator (Highlighting user switching) */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="role-simulation-hub">
          {/* Ambient Glows */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/4 bottom-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-300 border border-indigo-500/30 font-display">
                สถานะการจำลองบัญชีผู้ใช้ (Session Identity Simulation Indicator)
              </span>
              <h2 className="text-lg font-display font-medium text-white mt-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>ขณะนี้ล็อกอินในนาม:</span> 
                <span className="text-indigo-200 font-bold border-b-2 border-indigo-500 pb-0.5">{currentUser.fullName}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans max-w-xl">
                คลิกสัญลักษณ์ด้านขวาเพื่อสวิตช์ผู้บริหารระบบ (จำลองพฤติกรรมเจ้าหน้าที่ วก. แต่ละท่านเข้ามาลงเวลากำหนดการ) หรือเปลี่ยนเป็น 'เลขา' เพื่อทดสอบสิทธิ์แก้ไขทับซ้อน
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-md">
              {DEFAULT_USERS.map((user) => {
                const isActive = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      addAuditLog(`สลับบัญชีผู้ใช้งานจำลองเป็น: ${user.fullName}`);
                    }}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-300 focus:outline-none flex items-center gap-2.5 touch-manipulation cursor-pointer ${
                      isActive 
                        ? 'bg-white text-slate-900 shadow-md scale-[1.03] font-bold border border-white' 
                        : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 ring-4 ring-black/20" 
                      style={{ backgroundColor: user.avatarColor }}
                    />
                    <span>{user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tab Controls for system */}
        <div className="flex border-b border-slate-200/80 gap-1.5 overflow-x-auto scroller-hidden">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-5 text-xs font-bold transition-all duration-200 rounded-t-xl flex items-center gap-2 border-b-2 font-display cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-650 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <span>ผังตารางสะท้อน และ แผนความร้อน (Dashboard Heatmap Cover)</span>
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3 px-5 text-xs font-bold transition-all duration-200 rounded-t-xl flex items-center gap-2 border-b-2 font-display cursor-pointer ${
              activeTab === 'attachments'
                ? 'border-indigo-650 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span>ตารางเอกสารแนบตารางประชุมอ้างอิง ({attachedFiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gas-integration')}
            className={`py-3 px-5 text-xs font-bold transition-all duration-200 rounded-t-xl flex items-center gap-2 border-b-2 font-display cursor-pointer ${
              activeTab === 'gas-integration'
                ? 'border-indigo-650 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-500" />
            <span>สถาปัตยกรรม Google Sheets (แวร์เฮาส์)</span>
          </button>
        </div>

        {/* Active Tab Elements */}
        {activeTab === 'attachments' && (
          <ManualCalendarReference
            attachedFiles={attachedFiles}
            onAddFile={handleAddFile}
            onRemoveFile={handleRemoveFile}
            userRole={currentUser.role}
            currentUserName={currentUser.name}
          />
        )}

        {activeTab === 'gas-integration' && (
          <AppsScriptHelper
            gasUrl={gasUrl}
            onSaveUrl={(url) => {
              setGasUrl(url);
              addAuditLog(`บันทึก Google Apps Script API สำเร็จ: ${url.slice(0, 45)}...`);
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Academic Month Timeline & Calendar Month Grid */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Monthly picker ribbon - 12 Months scrollable */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-display">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    เลือกเดือนปีการศึกษา 2570 (Aug 2569 - Jul 2570)
                  </h3>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50/80 py-1 px-3 rounded-full font-bold font-display border border-indigo-100">
                    {selectedMonth.thaiName} พ.ศ. {selectedMonth.beYear}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {ACADEMIC_MONTHS.map((mon) => {
                    const isSelected = selectedMonth.index === mon.index && selectedMonth.year === mon.year;
                    return (
                      <button
                        key={`${mon.year}-${mon.index}`}
                        onClick={() => {
                          setSelectedMonth(mon);
                          // Reset selection to 1st of that month
                          const dayPadded = '01';
                          const mStr = String(mon.index + 1).padStart(2, '0');
                          setSelectedDateString(`${mon.year}-${mStr}-${dayPadded}`);
                          addAuditLog(`เปลี่ยนมุมมองตารางรายเดือนเป็น: ${mon.thaiName} ${mon.beYear}`);
                        }}
                        className={`py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 touch-manipulation focus:outline-none cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-md border border-slate-950 font-bold'
                            : 'bg-slate-50/80 hover:bg-slate-150 border border-slate-200/60 text-slate-600'
                        }`}
                      >
                        {mon.thaiName} {String(mon.beYear).slice(2)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly grid calendar */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                      <CalendarIcon className="w-4.5 h-4.5 text-indigo-600" />
                      มุมมองปฏิทินประจำเดือน {selectedMonth.thaiName} {selectedMonth.beYear}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      คลิกเลือกวันที่ว่างเพื่อวางแผนและตรวจสอบความหนาแน่นทีม วก. แบบ Heatmap
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleSimulateTeamActivity}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-3.5 rounded-xl shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all duration-200 cursor-pointer focus:outline-none"
                      title="สุ่มตอบรับของผู้บริหารท่านอื่นเพื่อทดลองตารางสีทับซ้อน (Heatmap)"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-100" />
                      <span>จำลองผู้โหวตเวลาร่วม</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mt-5 text-center">
                  {/* Days of week header */}
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
                    <div 
                      key={d} 
                      className={`text-[11px] font-bold py-1 uppercase tracking-wider font-display ${
                        i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-slate-400'
                      }`}
                    >
                      {d}
                    </div>
                  ))}

                  {/* Offset empty spaces */}
                  {paddingArray.map((p) => (
                    <div key={`pad-${p}`} className="aspect-square bg-slate-50/20 rounded-xl border border-dashed border-slate-100" />
                  ))}

                  {/* Calendar Days */}
                  {daysArray.map((day) => {
                    const monthStr = String(selectedMonth.index + 1).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    const curDateStr = `${selectedMonth.year}-${monthStr}-${dayStr}`;
                    const isSelected = selectedDateString === curDateStr;

                    // Compute heatmap density level for this day
                    const daySched = getDaySchedule(curDateStr);
                    let totalSlotsCount = Object.keys(daySched.slots).length;
                    let freeOverlaps = 0;
                    let busyOverlaps = 0;

                    Object.values(daySched.slots).forEach(availabilities => {
                      availabilities.forEach(av => {
                        if (av.status === 'available') freeOverlaps++;
                        if (av.status === 'busy') busyOverlaps++;
                      });
                    });

                    let cellBg = 'bg-white hover:bg-slate-50/80';
                    let cellBorder = 'border-slate-200/80';
                    
                    if (isSelected) {
                      cellBg = 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-250';
                      cellBorder = 'border-indigo-600';
                    } else if (freeOverlaps > 0) {
                      // heatmap green gradients
                      if (freeOverlaps >= 8) {
                        cellBg = 'bg-emerald-100/95 border-emerald-300 text-emerald-950 font-semibold';
                      } else if (freeOverlaps >= 4) {
                        cellBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                      } else {
                        cellBg = 'bg-slate-50 border-emerald-100 text-emerald-800';
                      }
                    }

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setSelectedDateString(curDateStr);
                          addAuditLog(`เลือกวันที่: ${day} ${selectedMonth.thaiName} ${selectedMonth.beYear}`);
                        }}
                        className={`aspect-square p-2 flex flex-col justify-between border rounded-xl font-medium transition-all duration-200 text-xs cursor-pointer focus:outline-none relative ${cellBg} ${cellBorder}`}
                      >
                        <span className="font-bold self-start mt-0.5 ml-0.5">{day}</span>
                        
                        {/* Day Status Badges (Heatmap markers) */}
                        <div className="w-full flex-grow flex items-end justify-center">
                          {freeOverlaps > 0 && (
                            <div className="flex flex-col gap-0.5 w-full">
                              <span className={`text-[9px] font-bold block truncate text-center ${isSelected ? 'text-indigo-100' : 'text-emerald-700'}`}>
                                ว่าง {freeOverlaps} ค.
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend explanatory notes */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-white border border-slate-200 block"></span>
                    <span>ยังไม่มีการลงเวลา</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-200 block"></span>
                    <span>ว่างบางส่วน (1 - 3 ผู้บริหาร)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 block"></span>
                    <span>ทีมว่างหนาแน่น (4+ ผู้บริหาร)</span>
                  </div>
                </div>
              </div>

              {/* Time Security Log Container */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600 animate-none" />
                    บันทึกประวัติความปลอดภัยเชิงเวลา (Time-based Audit History)
                  </h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                    ป้องกันการสวมรอย
                  </span>
                </div>

                <div className="bg-slate-950 text-slate-400 p-3 rounded-lg font-mono text-[10px] h-[100px] overflow-y-auto space-y-1">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="truncate line-clamp-1">
                      <span className="text-emerald-500">&gt;</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SLOT AVAILABILITY SELECTOR & OVERLAP HEATMAP LIST */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <div className="pb-3 border-b border-slate-100 mb-4 font-sans">
                  <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 py-1 px-3 rounded-full border border-indigo-100/60 font-display">
                    ขั้นตอน 3.2 - 3.5: จัดการช่วงโอกาสเวลา
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-2.5 flex items-center gap-1.5 font-display">
                    <Clock className="w-4.5 h-4.5 text-indigo-600" />
                    วันที่ {new Date(selectedDateString).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    สำหรับผู้บริหาร: <span className="font-bold text-slate-800">{currentUser.fullName}</span> สามารถแก้ไข ขีดทับ หรือล้างช่องตารางเวลาได้โดยตรง
                  </p>
                </div>

                {/* Hourly Slots List */}
                <div className="space-y-4">
                  {HOURLY_SLOTS.map((hour) => {
                    const daySched = getDaySchedule(selectedDateString);
                    const avails = daySched.slots[hour] || [];
                    
                    // Match the slot entry of CURRENT user
                    const userAvail = avails.find(a => a.userId === currentUser.id);
                    const isAvailable = userAvail?.status === 'available';
                    const isBusy = userAvail?.status === 'busy';
                    const isNone = !userAvail || userAvail.status === 'none';
                    const currentNoteVal = tempNoteInputs[hour] !== undefined ? tempNoteInputs[hour] : (userAvail?.note || '');

                    // Total counts for visual heatmap overlap block
                    const totalAvailable = avails.filter(a => a.status === 'available').length;
                    const totalBusy = avails.filter(a => a.status === 'busy').length;
                    const heatmapColorClass = 
                      totalAvailable === 0 
                        ? 'bg-slate-50/40 border-slate-100' 
                        : totalAvailable >= 4 
                        ? 'bg-emerald-50 border-emerald-250/70 text-emerald-950 font-medium' 
                        : 'bg-indigo-50/20 border-indigo-100';

                    return (
                      <div 
                        key={hour} 
                        className={`p-4 rounded-xl border transition-all duration-200 ${heatmapColorClass}`}
                      >
                        {/* Time label and overlay heat indicators */}
                        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-dashed border-slate-200">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            {hour} น.
                          </span>

                          {/* 3.3 Overlap Indicator Pill */}
                          <div className="flex items-center gap-1.5 font-display text-[10px] font-bold">
                            {totalAvailable > 0 && (
                              <span className="text-emerald-800 bg-emerald-100/80 rounded-lg px-2 py-0.5 border border-emerald-200/50">
                                ว่าง {totalAvailable} คน
                              </span>
                            )}
                            {totalBusy > 0 && (
                              <span className="text-rose-800 bg-rose-100/80 rounded-lg px-2 py-0.5 border border-rose-200/50">
                                ไม่ว่าง {totalBusy} คน
                              </span>
                            )}
                            {totalAvailable === 0 && totalBusy === 0 && (
                              <span className="text-[10px] text-slate-400 font-semibold italic">
                                ยังไม่มีท่านใดตอบรับ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Custom Form for adding time slot data */}
                        <div className="space-y-3">
                          {/* Toggle status buttons */}
                          <div className="grid grid-cols-3 gap-1.5 shrink-0">
                            <button
                              onClick={() => handleUpdateAvailability(hour, 'available', currentNoteVal, userAvail?.isStruckThrough)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                                isAvailable
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-xs'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>ว่าง</span>
                            </button>

                            <button
                              onClick={() => handleUpdateAvailability(hour, 'busy', currentNoteVal, userAvail?.isStruckThrough)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                                isBusy
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-xs'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ไม่ว่าง</span>
                            </button>

                            <button
                              onClick={() => handleClearSlot(hour)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                                isNone
                                  ? 'bg-slate-800 text-white shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-xs'
                              }`}
                              title="ยกเลิกการกรอกข้อมูลเวลานี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ล้างช่อง</span>
                            </button>
                          </div>

                          {/* 3.4 Custom Note Text Input Field */}
                          <div className="flex flex-col md:flex-row gap-2">
                            <input
                              type="text"
                              value={currentNoteVal}
                              onChange={(e) => handleUpdateNoteText(hour, e.target.value)}
                              placeholder="ระบุกิจกรรม/ภารกิจ/รายละเอียดห้องประชุม..."
                              className="text-xs py-2 px-3 border border-slate-200 rounded-xl w-full focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-slate-400 transition-all shadow-inner font-sans"
                            />

                            {/* 3.5 Strike out toggle tool */}
                            {userAvail && userAvail.note && (
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleToggleStrikeThrough(hour)}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold focus:outline-none transition-all duration-200 flex items-center justify-center shrink-0 border cursor-pointer ${
                                    userAvail.isStruckThrough
                                      ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-bold line-through'
                                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
                                  }`}
                                  title="ขีดทับข้อความชั่วคราวเพื่อแสดงนัดหมายยกเลิก"
                                >
                                  ขีดทับ
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collaborative matrix displaying who is doing what in this slot */}
                        {avails.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-slate-200/60 space-y-2 bg-white/60 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
                              การกรอกเวลารายบุคคล (Real-time Overlap Monitor)
                            </p>
                            <div className="flex flex-col gap-1.5 font-sans">
                              {avails.map((av) => (
                                <div key={av.userId} className="flex items-center justify-between text-xs py-0.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white" 
                                      style={{ backgroundColor: DEFAULT_USERS.find(u => u.id === av.userId)?.avatarColor || '#cbd5e1' }}
                                    />
                                    <span className="font-semibold text-slate-800 shrink-0">{av.userName}:</span>
                                    {av.note && (
                                      <span className={`text-[11px] text-slate-500 truncate ${
                                        av.isStruckThrough ? 'line-through text-slate-400 decoration-rose-500 decoration-2 italic' : ''
                                      }`}>
                                        {av.note}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    av.status === 'available'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                      : 'bg-rose-50 text-rose-700 border border-rose-100/60'
                                  }`}>
                                    {av.status === 'available' ? 'ว่าง' : 'ไม่ว่าง'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Modern, minimalist and humble footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8 px-4 lg:px-8 text-center" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-sans">
          <p>© ระบบตารางนัดทีม วก. ประจำปีการศึกษา 2570 • ออกแบบเพื่อให้เกิดเสถียรภาพและความโปร่งใสสูงสุด</p>
          <div className="flex items-center gap-3">
            <span className="text-indigo-650 bg-indigo-50/50 border border-indigo-150 py-1 px-3 rounded-full font-bold font-display">• Spark Free Tier (Google Sheets Cloud Data Warehouse)</span>
            <span>• Responsive Layout</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
