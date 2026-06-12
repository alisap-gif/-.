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
  Database,
  Table,
  Edit,
  Type,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Eraser
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

const DEFAULT_SIMULATED_USERS: UserProfile[] = [
  { id: 'ms', name: 'MS', fullName: 'ผศ.ดร.มนต์ศักดิ์', role: 'executive', avatarColor: '#4f46e5' },
  { id: 'as', name: 'AS', fullName: 'ผศ.ดร.อลิศา', role: 'executive', avatarColor: '#ec4899' },
  { id: 'kk', name: 'KK', fullName: 'รศ.ดร.กัญญ์กนก', role: 'executive', avatarColor: '#10b981' },
  { id: 'jw', name: 'JW', fullName: 'อ.จิรวัฒน์', role: 'executive', avatarColor: '#f59e0b' },
  { id: 'pc', name: 'PC', fullName: 'ผศ.ดร.พีรชัย', role: 'executive', avatarColor: '#06b6d4' }
];

export default function App() {
  // --- Persistent State ---
  const [schedules, setSchedules] = useState<DaySchedule[]>(SEED_SCHEDULES);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(DEFAULT_ATTACHED_FILES);
  const [users, setUsers] = useState<UserProfile[]>(DEFAULT_SIMULATED_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(DEFAULT_SIMULATED_USERS[0]); // Default to first available, or null
  const [selectedMonth, setSelectedMonth] = useState<AcademicMonth>(ACADEMIC_MONTHS[0]); // Default to August 2569
  const [selectedDateString, setSelectedDateString] = useState<string>('2026-08-03'); // Match seed data initially
  const [calendarViewMode, setCalendarViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [gasUrl, setGasUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attachments' | 'gas-integration'>('dashboard');

  // --- Login State & Views ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('isLoggedIn') === 'true');
  const [loginTab, setLoginTab] = useState<'google' | 'local'>('google');
  const [selectedLocalUserId, setSelectedLocalUserId] = useState<string>('ms');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Dynamic user profile fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserColor, setNewUserColor] = useState('#4f46e5');
  const [showUserManager, setShowUserManager] = useState(false);

  // --- UI & Controls State ---
  const [sysTime, setSysTime] = useState<Date>(new Date());
  const [isLocked, setIsLocked] = useState(false); // Time-based integrity simulation lock
  const [auditLogs, setAuditLogs] = useState<string[]>(['[ระบบ] เริ่มต้นเซสชันความปลอดภัยเชิงเวลาสำเร็จ']);
  const [tempNoteInputs, setTempNoteInputs] = useState<{ [hour: string]: string }>({});
  
  // Custom height resizer for Google Doc feel
  const [calendarCardHeight, setCalendarCardHeight] = useState<number>(310);
  const [calendarFontSize, setCalendarFontSize] = useState<number>(10);
  const [activeEditField, setActiveEditField] = useState<{ dateStr: string; type: 'morning' | 'afternoon' } | null>(null);
  const [activeFontColorDropdown, setActiveFontColorDropdown] = useState<boolean>(false);
  const [activeHighlightDropdown, setActiveHighlightDropdown] = useState<boolean>(false);

  const applyFormatting = (tag: 'b' | 'i' | 'u' | 'color' | 'bg' | 'clear', param?: string) => {
    if (!activeEditField) return;
    const targetId = `textarea-${activeEditField.type}-${activeEditField.dateStr}`;
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || '';

    if (!selectedText && tag !== 'clear') {
      alert('💡 กรุณาลากคลุม (เลือกข้อความ) ที่ต้องการก่อน แล้วเลือกเครื่องมือเพื่อตั้งค่าและจัดรูปแบบตัวอักษรครับ');
      textarea.focus();
      return;
    }

    const dateStr = activeEditField.dateStr;
    const type = activeEditField.type;

    let newText = '';
    if (tag === 'clear') {
      if (selectedText) {
        const cleanText = selectedText.replace(/\[\/?(color|bg|b|i|u)(=[^\]]*)?\]/gi, '');
        newText = text.substring(0, start) + cleanText + text.substring(end);
      } else {
        newText = text.replace(/\[\/?(color|bg|b|i|u)(=[^\]]*)?\]/gi, '');
      }
    } else if (tag === 'color') {
      newText = text.substring(0, start) + `[color=${param}]${selectedText}[/color]` + text.substring(end);
    } else if (tag === 'bg') {
      newText = text.substring(0, start) + `[bg=${param}]${selectedText}[/bg]` + text.substring(end);
    } else {
      newText = text.substring(0, start) + `[${tag}]${selectedText}[/${tag}]` + text.substring(end);
    }

    handleUpdateCompartmentNote(dateStr, type, newText);

    setTimeout(() => {
      textarea.focus();
      if (tag === 'clear') {
        if (selectedText) {
          const cleanLen = selectedText.replace(/\[\/?(color|bg|b|i|u)(=[^\]]*)?\]/gi, '').length;
          textarea.setSelectionRange(start, start + cleanLen);
        } else {
          textarea.setSelectionRange(0, newText.length);
        }
      } else {
        const tagOffsetStart = (tag === 'color' || tag === 'bg') ? tag.length + param!.length + 2 : tag.length + 2;
        textarea.setSelectionRange(start + tagOffsetStart, start + tagOffsetStart + selectedText.length);
      }
    }, 50);
  };

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startResizeY = React.useRef<number>(0);
  const startHeight = React.useRef<number>(0);

  const handleMouseDownOnResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startResizeY.current = e.clientY;
    startHeight.current = calendarCardHeight;
    setIsResizing(true);
  };

  const handleTouchStartOnResizer = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches[0]) {
      startResizeY.current = e.touches[0].clientY;
      startHeight.current = calendarCardHeight;
      setIsResizing(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = e.clientY - startResizeY.current;
      const newHeight = Math.max(180, Math.min(800, startHeight.current + deltaY));
      setCalendarCardHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing || !e.touches[0]) return;
      const deltaY = e.touches[0].clientY - startResizeY.current;
      const newHeight = Math.max(180, Math.min(800, startHeight.current + deltaY));
      setCalendarCardHeight(newHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing, calendarCardHeight]);
  
  // Real Firebase User & Status State
  const [fbUser, setFbUser] = useState<any>(null);

  const addAuditLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('th-TH');
    setAuditLogs(prev => [`[${timeStr}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setPin('');
    setPinError('');
    if (fbUser) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
      }
    }
    addAuditLog('🔒 ออกจากระบบและสิ้นสุดเซสชันการทำงานเสร็จสิ้น');
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
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        addAuditLog(`🟢 เชื่อมต่อบัญชีคลาวด์สำเร็จ: (${user.displayName || user.email})`);
      } else {
        addAuditLog(`⚪ สิ้นสุด/ไม่อยู่ในเซสชัน Firebase Auth`);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Listen to Day Schedules updates on Firestore with fallbacks
  useEffect(() => {
    if (!fbUser) return;
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
  }, [fbUser]);

  // 4. Listen to Attached Files updates on Firestore
  useEffect(() => {
    if (!fbUser) return;
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
  }, [fbUser]);

  // 5. Listen to dynamic Primary GAS configuration URL
  useEffect(() => {
    if (!fbUser) return;
    const unsub = onSnapshot(doc(db, 'gasConfig', 'primary'), (docSnap) => {
      if (docSnap.exists()) {
        setGasUrl(docSnap.data().gasUrl || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'gasConfig/primary');
    });
    return () => unsub();
  }, [fbUser]);

  // 6. Listen to dynamic Users Profiles updates on Firestore with fallbacks
  useEffect(() => {
    if (!fbUser) return;
    const unsub = onSnapshot(collection(db, 'users_profile'), (snapshot) => {
      const dbUsers: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        dbUsers.push(docSnap.data() as UserProfile);
      });
      if (dbUsers.length > 0) {
        setUsers(dbUsers);
      } else {
        setUsers(DEFAULT_SIMULATED_USERS);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_profile');
    });
    return () => unsub();
  }, [fbUser]);

  // Ensure currentUser is valid when users list changes
  useEffect(() => {
    if (users.length > 0) {
      const exists = currentUser ? users.some(u => u.id === currentUser.id) : false;
      if (!exists) {
        setCurrentUser(users[0]);
      }
    } else {
      setCurrentUser(null);
    }
  }, [users, currentUser]);

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

    if (!currentUser) {
      alert('⚠️ โปรดสร้างหรือเลือกผู้บริหารระบบก่อนป้อนข้อมูลความพร้อม');
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
      if (fbUser) {
        setDoc(doc(db, 'schedules', selectedDateString), day)
          .catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `schedules/${selectedDateString}`);
          });
      }

      return updated;
    });

    // If Google Sheets GAS is configured, send update in background
    if (gasUrl) {
      sendDataToGAS();
    }
  };

  const handleUpdateNoteText = (hour: string, text: string) => {
    if (!currentUser) return;
    setTempNoteInputs(prev => ({ ...prev, [hour]: text }));
    // Automatically preserve existing status when updating note
    const day = getDaySchedule(selectedDateString);
    const existing = day.slots[hour]?.find(a => a.userId === currentUser.id);
    const currentStatus = existing ? existing.status : 'none';
    const isStruck = existing ? existing.isStruckThrough : false;
    
    handleUpdateAvailability(hour, currentStatus, text, isStruck);
  };

  const handleClearSlot = (hour: string) => {
    if (!currentUser) return;
    setTempNoteInputs(prev => ({ ...prev, [hour]: '' }));
    handleUpdateAvailability(hour, 'none', '', false);
    addAuditLog(`ลบข้อมูลช่วงเวลา ${hour} เรียบร้อยแล้ว`);
  };

  const handleToggleStrikeThrough = (hour: string) => {
    if (!currentUser) return;
    const day = getDaySchedule(selectedDateString);
    const existing = day.slots[hour]?.find(a => a.userId === currentUser.id);
    if (!existing) return;

    const currentStatus = existing.status;
    const currentNote = existing.note;
    const nextStruck = !existing.isStruckThrough;

    handleUpdateAvailability(hour, currentStatus, currentNote, nextStruck);
    addAuditLog(`เปลี่ยนสถานะการขีดฆ่าตารางนัดหมายในช่วงเวลา ${hour} (${nextStruck ? 'ขีดทับสำเร็จ' : 'นำขีดทับออก'})`);
  };

  const handleUpdateDailyNote = (dateStr: string, noteText: string) => {
    if (isLocked) {
      alert('⚠️ ตารางถูกปิดล็อกด้วยระบบความปลอดภัยเชิงเวลา (Time-based Server Lock)');
      return;
    }

    setSchedules(prevSchedules => {
      const updated = [...prevSchedules];
      let dayIndex = updated.findIndex(s => s.dateString === dateStr);

      if (dayIndex === -1) {
        const newDay: DaySchedule = {
          dateString: dateStr,
          slots: {},
          dailyNote: noteText
        };
        updated.push(newDay);
        dayIndex = updated.length - 1;
      } else {
        const day = { ...updated[dayIndex], dailyNote: noteText };
        updated[dayIndex] = day;
      }

      const day = updated[dayIndex];

      // Persist directly to Firebase Firestore
      if (fbUser) {
        setDoc(doc(db, 'schedules', dateStr), day)
          .catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `schedules/${dateStr}`);
          });
      }

      return updated;
    });

    addAuditLog(`อัปเดตบันทึกโน้ตปฏิทินของวันที่ ${dateStr} เป็น: "${noteText}"`);
  };

  const handleUpdateCompartmentNote = (dateStr: string, compartment: 'morning' | 'afternoon', noteText: string) => {
    if (isLocked) {
      alert('⚠️ ตารางถูกปิดล็อกด้วยระบบความปลอดภัยเชิงเวลา (Time-based Server Lock)');
      return;
    }

    setSchedules(prevSchedules => {
      const updated = [...prevSchedules];
      let dayIndex = updated.findIndex(s => s.dateString === dateStr);

      const fieldName = compartment === 'morning' ? 'morningNote' : 'afternoonNote';

      if (dayIndex === -1) {
        const newDay: DaySchedule = {
          dateString: dateStr,
          slots: {},
          [fieldName]: noteText
        };
        updated.push(newDay);
        dayIndex = updated.length - 1;
      } else {
        const day = { ...updated[dayIndex], [fieldName]: noteText };
        updated[dayIndex] = day;
      }

      const day = updated[dayIndex];

      // Persist directly to Firebase Firestore
      if (fbUser) {
        setDoc(doc(db, 'schedules', dateStr), day)
          .catch(err => {
            handleFirestoreError(err, OperationType.UPDATE, `schedules/${dateStr}`);
          });
      }

      return updated;
    });

    addAuditLog(`อัปเดตบันทึกโน้ตช่วง${compartment === 'morning' ? 'เช้า' : 'บ่าย'}ของวันที่ ${dateStr} เป็น: "${noteText}"`);
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
        users.forEach(user => {
          if (user.id === currentUser?.id || user.id === 'secretary') return;
          
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
      if (fbUser) {
        setDoc(doc(db, 'schedules', selectedDateString), day)
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `schedules/${selectedDateString}`));
      }

      return updated;
    });

    addAuditLog('⚡ จำลองกิจกรรมทีมบริหารสำเร็จ: ความหนาแน่นแผนความร้อน (Heatmap Overlay Matrix) อัปเดตอัตโนมัติ');
  };

  const handleAddUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert('⚠️ ตารางถูกปิดล็อกด้วยระบบความปลอดภัยเชิงเวลา (Time-based Server Lock)');
      return;
    }
    const nameTrim = newUserName.trim();
    const fullNameTrim = newUserFullName.trim();
    if (!nameTrim || !fullNameTrim) {
      alert('⚠️ กรุณากรอกชื่อย่อและชื่อเต็มให้ครบถ้วน');
      return;
    }

    // Slugify id
    const slugId = nameTrim.toLowerCase().replace(/\s+/g, '-');
    if (users.some(u => u.id === slugId || u.name.toLowerCase() === nameTrim.toLowerCase())) {
      alert('⚠️ มีระบุชื่อย่อผู้ใช้งานนี้อยู่แล้วในระบบ');
      return;
    }

    const newUser: UserProfile = {
      id: slugId,
      name: nameTrim,
      fullName: fullNameTrim,
      role: 'executive',
      avatarColor: newUserColor
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);

    if (fbUser) {
      try {
        await setDoc(doc(db, 'users_profile', slugId), newUser);
        addAuditLog(`เพิ่มรายชื่อผู้บริหารท่านใหม่สำเร็จ: ${fullNameTrim} (${nameTrim})`);
      } catch (err) {
        console.error('Error adding user profile to Firestore:', err);
      }
    }

    setNewUserName('');
    setNewUserFullName('');
    setNewUserColor('#4f46e5');
  };

  const handleDeleteUserProfile = async (id: string, name: string) => {
    if (isLocked) {
      alert('⚠️ ตารางถูกปิดล็อกด้วยระบบความปลอดภัยเชิงเวลา (Time-based Server Lock)');
      return;
    }
    if (users.length <= 1) {
      alert('⚠️ ต้องคงเหลือผู้ใช้งานในตารางตรวจสอบสิทธิ์อย่างน้อย 1 รายชื่อ');
      return;
    }
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบรายชื่อ "${name}" ออกจากระบบ?`)) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      if (currentUser.id === id) {
        setCurrentUser(updated[0]);
      }
      if (fbUser) {
        try {
          await deleteDoc(doc(db, 'users_profile', id));
          addAuditLog(`ลบรายชื่อผู้บริหารออกจากระบบ: ${name}`);
        } catch (err) {
          console.error('Error removing user profile:', err);
        }
      }
    }
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

  // Get all 7 dates in the week of the selected date string (Sun - Sat)
  const getWeeklyDates = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 is Sun, 1 is Mon, etc.
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const tempDate = new Date(sunday);
      tempDate.setDate(sunday.getDate() + i);
      dates.push(tempDate);
    }
    return dates;
  };

  const getThaiMonthShort = (monthIdx: number) => {
    const shortNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return shortNames[monthIdx];
  };

  const insertHighlightTag = (dateStr: string, color: string) => {
    const textarea = document.getElementById(`textarea-${dateStr}`) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || '';
    if (!selectedText) {
      alert('💡 กรุณาลากคลุม (เลือกข้อความ) ที่ต้องการเพิ่มสีก่อน จากนั้นระบบจะสวมหน้ากากไฮไลท์สีให้ในช่องทันทีครับ');
      textarea.focus();
      return;
    }
    
    const formattedText = text.substring(0, start) + `#${color}(${selectedText})` + text.substring(end);
    handleUpdateDailyNote(dateStr, formattedText);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + color.length + 2 + selectedText.length + 1; // len of `#color(selected)`
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const parseHighlighterText = (text: string, isWhiteTextOnActive: boolean) => {
    if (!text) return <span className="text-slate-400/85 italic text-[11px]">ไม่มีบันทึกสำหรับวันนี้...</span>;

    // Backward compatibility converter: e.g. #red(content) -> [color=#ef4444]content[/color]
    let converted = text;
    const oldRegex = /#(red|blue|green|yellow|pink|purple)\(([^)]+)\)/g;
    converted = converted.replace(oldRegex, (match, color, content) => {
      let colorHex = '';
      let bgHex = '';
      if (color === 'red') colorHex = '#ef4444';
      else if (color === 'blue') colorHex = '#3b82f6';
      else if (color === 'green') colorHex = '#10b981';
      else if (color === 'yellow') bgHex = '#fef08a';
      else if (color === 'pink') bgHex = '#fbcfe8';
      else if (color === 'purple') colorHex = '#8b5cf6';
      
      if (colorHex) return `[color=${colorHex}]${content}[/color]`;
      if (bgHex) return `[bg=${bgHex}]${content}[/bg]`;
      return content;
    });

    // Helper AST parser inside:
    interface TextASTNode {
      type: 'text' | 'color' | 'bg' | 'b' | 'i' | 'u';
      value?: string;
      param?: string;
      children: TextASTNode[];
    }

    let parseIndex = 0;
    const parseToAST = (): TextASTNode[] => {
      const nodes: TextASTNode[] = [];
      
      function parse(parentTagName: string | null = null): TextASTNode[] {
        const currentChildren: TextASTNode[] = [];
        
        while (parseIndex < converted.length) {
          if (converted[parseIndex] === '[') {
            const tagCloseIndex = converted.indexOf(']', parseIndex);
            if (tagCloseIndex !== -1) {
              const tagContent = converted.substring(parseIndex + 1, tagCloseIndex);
              
              if (tagContent.startsWith('/')) {
                const closingName = tagContent.slice(1).toLowerCase().split('=')[0];
                if (closingName === parentTagName) {
                  parseIndex = tagCloseIndex + 1;
                  return currentChildren;
                } else {
                  currentChildren.push({ type: 'text', value: '[', children: [] });
                  parseIndex++;
                  continue;
                }
              }

              const parts = tagContent.split('=');
              const tagName = parts[0].toLowerCase();
              const param = parts[1] || '';

              if (['color', 'bg', 'b', 'i', 'u'].includes(tagName)) {
                parseIndex = tagCloseIndex + 1;
                const node: TextASTNode = {
                  type: tagName as any,
                  param,
                  children: parse(tagName)
                };
                currentChildren.push(node);
                continue;
              }
            }
          }

          let nextSpecial = converted.indexOf('[', parseIndex);
          if (nextSpecial === -1) {
            nextSpecial = converted.length;
          }
          currentChildren.push({
            type: 'text',
            value: converted.substring(parseIndex, nextSpecial),
            children: []
          });
          parseIndex = nextSpecial;
        }

        return currentChildren;
      }

      return parse(null);
    };

    const renderAST = (nodes: TextASTNode[], keyPrefix = 'rtf'): React.ReactNode[] => {
      return nodes.map((node, i) => {
        const key = `${keyPrefix}-${node.type}-${i}`;
        switch (node.type) {
          case 'text':
            return <span key={key}>{node.value}</span>;
          case 'b':
            return <strong key={key} className="font-bold">{renderAST(node.children, key)}</strong>;
          case 'i':
            return <em key={key} className="italic">{renderAST(node.children, key)}</em>;
          case 'u':
            return <span key={key} className="underline">{renderAST(node.children, key)}</span>;
          case 'color': {
            const colorVal = node.param || 'inherit';
            return (
              <span key={key} style={{ color: colorVal }}>
                {renderAST(node.children, key)}
              </span>
            );
          }
          case 'bg': {
            const bgVal = node.param || 'transparent';
            return (
              <span 
                key={key} 
                style={{ backgroundColor: bgVal }} 
                className="px-1 py-0.5 rounded-sm shadow-xs border border-black/5"
              >
                {renderAST(node.children, key)}
              </span>
            );
          }
          default:
            return null;
        }
      });
    };

    const ast = parseToAST();
    const rendered = renderAST(ast, 'rtf');

    return <div className="whitespace-pre-wrap break-words leading-relaxed">{rendered}</div>;
  };

  // File Add / Remove hooks
  const handleAddFile = async (file: AttachedFile) => {
    setAttachedFiles(prev => [file, ...prev]);
    addAuditLog(`📁 เพิ่มไฟล์แนบใหม่สำเร็จ: "${file.name}"`);

    // Write file to Firestore
    if (fbUser) {
      try {
        await setDoc(doc(db, 'attachedFiles', file.id), file);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `attachedFiles/${file.id}`);
      }
    }
  };

  const handleRemoveFile = async (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
    addAuditLog(`🗑️ ลบไฟล์แนบออกจากระบบ`);

    // Delete file from Firestore
    if (fbUser) {
      try {
        await deleteDoc(doc(db, 'attachedFiles', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `attachedFiles/${id}`);
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-505 selection:text-white" id="login-layout">
        {/* Animated glowing backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Main Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-3xl shadow-xl shadow-indigo-950/50 mb-4 items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
              ระบบตารางนัดทีม วก.
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
              กลุ่มผู้บริหารวิชาการ มหาวิทยาลัยเพื่อการพัฒนาและบูรณาการการเรียนรู้
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8">
            
            {/* Tab switch buttons */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-900 mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginTab('google');
                  setPinError('');
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  loginTab === 'google'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔐 Google Cloud
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginTab('local');
                  setPinError('');
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  loginTab === 'local'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👤 สิทธิ์ผู้บริหารจำลอง
              </button>
            </div>

            {loginTab === 'google' ? (
              <div className="space-y-5">
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    เข้าสู่ระบบร่วมกับโครงสร้างพื้นฐานความปลอดภัย Google Workspace Coordinated Cloud เพื่อการประสานตารางเวลาแบบเรียลไทม์
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signInWithPopup(auth, googleProvider);
                    } catch (e) {
                      setPinError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all duration-200 shadow-md hover:shadow-indigo-500/10 cursor-pointer select-none active:scale-98"
                >
                  <Users className="w-4.5 h-4.5 text-indigo-200" />
                  <span>เข้าสู่ระบบด้วย Google Account</span>
                </button>

                {pinError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1.5">
                    เลือกบัญชีผู้บริหารระบบเพื่อเข้าใช้งาน:
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {users.map(u => {
                      const isSel = selectedLocalUserId === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedLocalUserId(u.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all duration-150 cursor-pointer ${
                            isSel 
                              ? 'bg-indigo-650/30 border-indigo-500 text-white font-bold' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.avatarColor }} />
                            <div>
                              <span>{u.fullName}</span>
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({u.name})</span>
                            </div>
                          </div>
                          {isSel && <Check className="w-4 h-4 text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1.5">
                    กรอกรหัสพินเข้าใช้ตรรกะจำลอง (Passcode PIN):
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="ป้อนรหัสพิน 4 หลัก"
                    className="w-full text-center bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white tracking-widest font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-700 placeholder:tracking-normal"
                  />
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-300 bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-850">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>คำแนะนำ: รหัสมาตรฐานสัญญากลางทีม วก. คือ <strong>1234</strong></span>
                  </div>
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (pin === '1234') {
                      const targetUser = users.find(u => u.id === selectedLocalUserId);
                      if (targetUser) {
                        setCurrentUser(targetUser);
                      }
                      setIsLoggedIn(true);
                      localStorage.setItem('isLoggedIn', 'true');
                      addAuditLog(`🔓 บัญชีผู้ใช้งานจำลอง ${targetUser?.fullName || ''} ล็อกอินเข้าใช้งานด้วย PIN สำเร็จ`);
                    } else {
                      setPinError('❌ รหัสพินไม่ถูกต้อง! กรุณากรอกรหัสผ่านเพื่อสัญญากลาง (ลองใช้ "1234")');
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-650 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer mt-2"
                >
                  ยืนยันเข้าสู่ระบบ
                </button>
              </div>
            )}
          </div>

          <div className="text-center mt-6 text-[11px] text-slate-650 font-mono">
            ระบบจัดเก็บตารางนโยบาย • รักษาความปลอดภัยตามพฤติกรรมเชิงเวลาแบบเรียลไทม์
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans leading-relaxed selection:bg-indigo-100 selection:text-indigo-900" id="app-root-layout">
      {/* Print Styles Dynamic Block */}
      <style>{`
        @media print {
          /* Full landscape-friendly text parameters */
          body {
            background: white !important;
            color: black !important;
          }
          header, 
          footer,
          button,
          textarea,
          input,
          .no-print,
          #audit-log-panel,
          [role="tablist"],
          .tab-buttons {
            display: none !important;
          }
          #app-root-layout, main, .max-w-7xl {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background-color: transparent !important;
          }
          /* Preserve colors for green heatmap density grids on color printer */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grid {
            display: grid !important;
            gap: 12px !important;
          }
          /* Custom calendar item height auto expansion */
          .flex-col.border.rounded-xl {
            height: auto !important;
            min-height: 250px !important;
            page-break-inside: avoid !important;
            border: 2px solid #94a3b8 !important;
          }
          .max-h-\\[140px\\] {
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
      
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
                  ตารางนัดทีม วก. ปีการศึกษา 2570
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
            
            {/* MS Word Formatting Toolbar (Integrated into Corner) */}
            <div 
              className={`flex items-center gap-1 bg-white border p-1 rounded-xl shadow-xs transition-all duration-200 ${
                activeEditField 
                  ? 'border-indigo-300 ring-2 ring-indigo-150 ring-offset-1 opacity-100 scale-100' 
                  : 'border-slate-200/60 opacity-60 hover:opacity-100 focus-within:opacity-100'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevents losing focus from the textarea!
              }}
              title={activeEditField ? 'เครื่องมือจัดรูปแบบแบบ MS Word (พร้อมเลือกจัดรูปแบบข้อความแล้ว)' : 'เครื่องมือจัดรูปแบบตัวอักษร: คลิกปุ่มพิมพ์เพื่อเริ่มต้นใช้งาน'}
            >
              <div className="flex items-center gap-0.5">
                {/* Bold */}
                <button
                  type="button"
                  onClick={() => applyFormatting('b')}
                  disabled={!activeEditField}
                  className={`p-1 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="ตัวหนา (B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onClick={() => applyFormatting('i')}
                  disabled={!activeEditField}
                  className={`p-1 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="ตัวเอียง (I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onClick={() => applyFormatting('u')}
                  disabled={!activeEditField}
                  className={`p-1 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="ขีดเส้นใต้ (U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5 shrink-0" />

              <div className="flex items-center gap-0.5">
                {/* Font Color Picker Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeEditField) return;
                      setActiveFontColorDropdown(!activeFontColorDropdown);
                      setActiveHighlightDropdown(false);
                    }}
                    disabled={!activeEditField}
                    className={`p-1 hover:bg-slate-100 rounded text-slate-700 flex flex-col items-center gap-0.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="สีตัวอักษร (A)"
                  >
                    <div className="relative flex flex-col items-center leading-none">
                      <span className="text-[10px] font-black select-none font-sans leading-none">A</span>
                      <div className="w-2.5 h-[2.5px] bg-red-600 rounded-full mt-[-1px]"></div>
                    </div>
                  </button>
                  {activeFontColorDropdown && activeEditField && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 z-50 w-28 text-slate-800">
                      {[
                        { hex: '#ef4444', label: 'แดง' },
                        { hex: '#3b82f6', label: 'น้ำเงิน' },
                        { hex: '#10b981', label: 'เขียว' },
                        { hex: '#8b5cf6', label: 'ม่วง' },
                        { hex: '#f97316', label: 'ส้ม' },
                        { hex: '#1e293b', label: 'ดำ' },
                        { hex: '#ec4899', label: 'ชมพู' },
                        { hex: '#1d4ed8', label: 'น้ำเงินเข้ม' }
                      ].map(col => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => {
                            applyFormatting('color', col.hex);
                            setActiveFontColorDropdown(false);
                          }}
                          className="w-5 h-5 rounded-full border border-slate-205 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Highlight/Background Picker Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeEditField) return;
                      setActiveHighlightDropdown(!activeHighlightDropdown);
                      setActiveFontColorDropdown(false);
                    }}
                    disabled={!activeEditField}
                    className={`p-1 hover:bg-slate-100 rounded text-slate-700 flex flex-col items-center gap-0.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="สีไฮไลท์ข้อความ (Highlight)"
                  >
                    <div className="relative flex flex-col items-center leading-none">
                      <Highlighter className="w-3.5 h-3.5 text-slate-700" />
                      <div className="w-2.5 h-[2.5px] bg-yellow-450 rounded-full mt-[-1px]"></div>
                    </div>
                  </button>
                  {activeHighlightDropdown && activeEditField && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 z-50 w-28 text-slate-800">
                      {[
                        { hex: '#fef08a', label: 'เหลือง' },
                        { hex: '#bbf7d0', label: 'เขียวอ่อน' },
                        { hex: '#bfdbfe', label: 'ฟ้าอ่อน' },
                        { hex: '#fbcfe8', label: 'ชมพูอ่อน' },
                        { hex: '#e9d5ff', label: 'ม่วงอ่อน' },
                        { hex: '#fed7aa', label: 'ส้มอ่อน' },
                        { hex: '#fca5a5', label: 'แดงอ่อน' },
                        { hex: '#ffffff', label: 'ไม่มีไฮไลท์' }
                      ].map(col => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => {
                            if (col.hex === '#ffffff') {
                              applyFormatting('clear');
                            } else {
                              applyFormatting('bg', col.hex);
                            }
                            setActiveHighlightDropdown(false);
                          }}
                          className="w-5 h-5 rounded border border-slate-205 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5 shrink-0" />

              {/* Clear format (Eraser) */}
              <button
                type="button"
                onClick={() => applyFormatting('clear')}
                disabled={!activeEditField}
                className={`p-1 hover:bg-rose-50 rounded transition cursor-pointer ${
                  activeEditField ? 'text-rose-500 hover:text-rose-600' : 'text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title="ล้างการจัดรูปแบบอักษร (Clear Formatting)"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              {/* Status active pulse dot */}
              {activeEditField && (
                <span className="flex h-1.5 w-1.5 relative mr-1 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div className="w-[1px] h-5 bg-slate-200/80 mx-1 hidden sm:block shrink-0" />

            {/* Google Authentication / Simulation Status Badge */}
            {fbUser ? (
              <div className="flex items-center gap-2 text-xs text-emerald-850 bg-emerald-50/95 py-1.5 px-3 rounded-xl border border-emerald-250/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                <span className="font-semibold text-slate-700">Cloud: {fbUser.displayName || fbUser.email}</span>
                <button 
                  onClick={handleLogout}
                  className="ml-2 font-black text-rose-650 hover:text-rose-700 underline cursor-pointer text-[10px]"
                >
                  ออกระบบ
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-indigo-850 bg-indigo-50/95 py-1.5 px-3 rounded-xl border border-indigo-200 shadow-xs">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: currentUser?.avatarColor || '#4f46e5' }}></span>
                <span className="font-semibold text-slate-705">สิทธิ์จำลอง: {currentUser?.fullName || 'ผู้ใช้งาน'}</span>
                <button 
                  onClick={handleLogout}
                  className="ml-2 font-black text-rose-650 hover:text-rose-750 underline cursor-pointer text-[10px]"
                >
                  ออกระบบ
                </button>
              </div>
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
            userRole={currentUser?.role || 'executive'}
            currentUserName={currentUser?.name || ''}
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
          <div className="w-full flex flex-col gap-6">
            
            {/* FULL WIDTH: Academic Month Timeline & Calendar Month Grid */}
            <div className="w-full flex flex-col gap-6">
              
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

              {/* Monthly or Weekly grid calendar */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2 font-display">
                      <CalendarIcon className="w-4.5 h-4.5 text-indigo-600" />
                      {calendarViewMode === 'monthly' ? (
                        <>มุมมองปฏิทินรายเดือน: ประจำเดือน {selectedMonth.thaiName} {selectedMonth.beYear}</>
                      ) : (
                        <>มุมมองปฏิทินรายสัปดาห์: สัปดาห์ปัจจุบันของวันที่ {new Date(selectedDateString).getDate()} {getThaiMonthShort(new Date(selectedDateString).getMonth())}</>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      คลิกเลือกวันที่ว่างเพื่อตรวจสอบความหนาแน่นทีม วก. แบบ Heatmap หรือพิมพ์บันทึกได้เลยในแต่ละฝั่งช่วงเช้า/บ่าย
                    </p>
                  </div>

                  {/* Responsive Elegant Calendar Control Box */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
                    {/* Responsive Elegant Calendar Height Slider */}
                    <div className="flex flex-col gap-1.5 w-full sm:w-56 lg:w-56">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                          ปรับความสูงตารางนัดหมาย
                        </span>
                        <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                          {calendarCardHeight}px
                        </span>
                      </div>
                      <div className="relative w-full h-5 flex items-center">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                        <div 
                          style={{ width: `${((calendarCardHeight - 180) / (800 - 180)) * 100}%` }}
                          className="absolute h-1.5 bg-indigo-500 rounded-full left-0 pointer-events-none"
                        ></div>
                        <div 
                          style={{ left: `calc(${((calendarCardHeight - 180) / (800 - 180)) * 100}% - 6px)` }}
                          className="absolute w-3 h-4 bg-indigo-600 rounded-sm border border-white cursor-ew-resize flex items-center justify-center shadow-md hover:bg-indigo-700 hover:scale-105 active:bg-indigo-800 transition-transform duration-75 pointer-events-none"
                          title="คลิกลากซ้ายขวาเพื่อคุมความสูง"
                        >
                          <div className="w-[1px] h-2 bg-white"></div>
                        </div>
                        <input
                          type="range"
                          min="180"
                          max="800"
                          value={calendarCardHeight}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCalendarCardHeight(val);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="text-[9px] text-slate-400 font-sans flex justify-between select-none">
                        <span>180px</span>
                        <span className="italic text-indigo-400">ดึงขอบล่างของวันได้!</span>
                        <span>800px</span>
                      </div>
                    </div>

                    {/* Responsive Elegant Calendar Font Size Slider */}
                    <div className="flex flex-col gap-1.5 w-full sm:w-56 lg:w-56">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Type className="w-3.5 h-3.5 text-indigo-500" />
                          ปรับขนาดตัวอักษร
                        </span>
                        <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                          {calendarFontSize}px
                        </span>
                      </div>
                      <div className="relative w-full h-5 flex items-center">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                        <div 
                          style={{ width: `${((calendarFontSize - 7) / (16 - 7)) * 100}%` }}
                          className="absolute h-1.5 bg-indigo-500 rounded-full left-0 pointer-events-none"
                        ></div>
                        <div 
                          style={{ left: `calc(${((calendarFontSize - 7) / (16 - 7)) * 100}% - 6px)` }}
                          className="absolute w-3 h-4 bg-indigo-600 rounded-sm border border-white cursor-ew-resize flex items-center justify-center shadow-md hover:bg-indigo-700 hover:scale-105 active:bg-indigo-800 transition-transform duration-75 pointer-events-none"
                          title="คลิกลากซ้ายขวาเพื่อปรับขนาดตัวอักษร"
                        >
                          <div className="w-[1px] h-2 bg-white"></div>
                        </div>
                        <input
                          type="range"
                          min="7"
                          max="16"
                          value={calendarFontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCalendarFontSize(val);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="text-[9px] text-slate-400 font-sans flex justify-between select-none">
                        <span>7px</span>
                        <span className="italic text-indigo-400">ปรับข้อความนัดหมาย</span>
                        <span>16px</span>
                      </div>
                    </div>
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

                  {/* Offset empty spaces (only in monthly view) */}
                  {calendarViewMode === 'monthly' && paddingArray.map((p) => (
                    <div key={`pad-${p}`} className="aspect-square bg-slate-50/20 rounded-xl border border-dashed border-slate-100" />
                  ))}

                  {/* Calendar Days (Monthly or Weekly) */}
                  {(calendarViewMode === 'monthly'
                    ? daysArray.map(day => {
                        const monthStr = String(selectedMonth.index + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const curDateStr = `${selectedMonth.year}-${monthStr}-${dayStr}`;
                        return { dayLabel: String(day), curDateStr };
                      })
                    : getWeeklyDates(selectedDateString).map(dObj => {
                        const year = dObj.getFullYear();
                        const monthIndex = dObj.getMonth();
                        const mStr = String(monthIndex + 1).padStart(2, '0');
                        const day = dObj.getDate();
                        const curDateStr = `${year}-${mStr}-${String(day).padStart(2, '0')}`;
                        return { dayLabel: `${day} ${getThaiMonthShort(monthIndex)}`, curDateStr };
                      })
                  ).map((item) => {
                    const curDateStr = item.curDateStr;
                    const isSelected = selectedDateString === curDateStr;

                    // Compute heatmap density level for this day
                    const daySched = getDaySchedule(curDateStr);
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
                      cellBg = 'bg-indigo-650 text-white shadow-md ring-2 ring-indigo-250';
                      cellBorder = 'border-indigo-650';
                    } else if (freeOverlaps > 0) {
                      // heatmap green gradients
                      if (freeOverlaps >= 8) {
                        cellBg = 'bg-emerald-100/95 border-emerald-300 text-emerald-950 font-semibold';
                      } else if (freeOverlaps >= 4) {
                        cellBg = 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold';
                      } else {
                        cellBg = 'bg-slate-50 border-emerald-100 text-emerald-800';
                      }
                    }

                    const morningSlots = Object.entries(daySched.slots).filter(([hr]) => {
                      const hourNum = parseInt(hr.split(':')[0], 10);
                      return hourNum < 12;
                    });
                    const afternoonSlots = Object.entries(daySched.slots).filter(([hr]) => {
                      const hourNum = parseInt(hr.split(':')[0], 10);
                      return hourNum >= 12;
                    });

                    return (
                      <div
                        key={curDateStr}
                        onClick={() => {
                          setSelectedDateString(curDateStr);
                          addAuditLog(`เลือกวันที่: ${item.dayLabel}`);
                        }}
                        style={{ height: `${calendarCardHeight}px` }}
                        className={`flex flex-col border rounded-xl font-medium transition-all duration-150 text-xs cursor-pointer relative overflow-hidden select-none calendar-day-cell ${
                          isSelected ? 'ring-2 ring-indigo-250 border-indigo-500' : ''
                        } ${cellBg} ${cellBorder}`}
                      >
                        {/* Upper Compartment: Morning (ช่วงเช้า) */}
                        <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200">
                          {/* Morning Header */}
                          <div className="p-2 bg-slate-50/60 flex items-center justify-between border-b border-dashed border-slate-150">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-sm leading-none ${isSelected ? 'text-indigo-900 font-extrabold text-base' : 'text-slate-800'}`}>
                                {item.dayLabel}
                              </span>
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded select-none">☀️ เช้า</span>
                            </div>
                            
                            {/* Morning Stats */}
                            {(() => {
                              let morningFree = 0;
                              let morningBusy = 0;
                              morningSlots.forEach(([_, avails]) => {
                                avails.forEach(av => {
                                  if (av.status === 'available') morningFree++;
                                  if (av.status === 'busy') morningBusy++;
                                });
                              });
                              return (
                                <div className="flex gap-1 select-none">
                                  {morningFree > 0 && (
                                    <span className="text-[8px] px-1 py-0.2 rounded font-bold shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      ว่าง {morningFree}
                                    </span>
                                  )}
                                  {morningBusy > 0 && (
                                    <span className="text-[8px] px-1 py-0.2 rounded font-bold shrink-0 bg-rose-50 text-rose-650 border border-rose-100">
                                      ทับ {morningBusy}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {/* Morning Content Area */}
                          <div className="p-2 flex-grow overflow-y-auto space-y-1 min-h-0 bg-white flex flex-col justify-between">
                            {/* Morning Slots list */}
                            <div className="space-y-1 flex-1 flex flex-col justify-between">
                              <div className="space-y-1">
                                {morningSlots.map(([hr, avails]) => {
                                  const activeAvails = avails.filter(av => av.status !== 'none');
                                  if (activeAvails.length === 0) return null;
                                  return (
                                    <div key={hr} className="flex flex-col gap-0.5 border-b border-slate-50 pb-0.5 last:border-0" onClick={(e) => e.stopPropagation()}>
                                      <span 
                                        style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                        className="font-bold text-slate-500 font-mono"
                                      >
                                        {hr} น. :
                                      </span>
                                      <div className="flex flex-wrap gap-0.5">
                                        {activeAvails.map(av => (
                                          <span 
                                            key={av.userId} 
                                            style={{ fontSize: `${calendarFontSize * 0.8}px` }}
                                            className={`px-1 py-0.2 rounded-sm ${
                                              av.status === 'available' 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : 'bg-rose-50 text-rose-600 line-through decoration-slate-400'
                                            }`}
                                            title={av.note || ''}
                                          >
                                            {av.userName}{av.note ? ` (${av.note})` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Interactive Inline Note Area (No border/box, type directly!) */}
                              <div 
                                className="flex-grow flex flex-col mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEditField({ dateStr: curDateStr, type: 'morning' });
                                }}
                              >
                                {activeEditField?.dateStr === curDateStr && activeEditField?.type === 'morning' ? (
                                  <textarea
                                    id={`textarea-morning-${curDateStr}`}
                                    value={daySched.morningNote || ''}
                                    autoFocus
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setActiveEditField(null);
                                        setActiveFontColorDropdown(false);
                                        setActiveHighlightDropdown(false);
                                      }, 180);
                                    }}
                                    onChange={(e) => handleUpdateCompartmentNote(curDateStr, 'morning', e.target.value)}
                                    placeholder="พิมพ์บันทึกช่วงเช้าตรงนี้..."
                                    disabled={isLocked}
                                    rows={3}
                                    style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                    className={`w-full min-h-[48px] p-1 px-1.5 border-0 bg-transparent text-slate-800 placeholder:text-slate-300/80 resize-none focus:outline-none focus:ring-0 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div 
                                    className="p-1 flex-grow cursor-text hover:bg-slate-50/40 rounded transition-colors duration-100 min-h-[24px]"
                                    style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                  >
                                    {daySched.morningNote ? (
                                      <div className="p-1 px-1.5 rounded-md bg-amber-50/40 border border-amber-100/30 text-slate-700 leading-normal bg-gradient-to-r from-amber-50/60 to-orange-50/20">
                                        {parseHighlighterText(daySched.morningNote, isSelected)}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300/80 italic select-none text-[8.5px]">+ พิมพ์บันทึกช่วงเช้า...</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Solid middle dividing border line (Splitting upper and lower boxes exactly) */}
                        <div className="border-t border-slate-200 z-10"></div>

                        {/* Lower Compartment: Afternoon (ช่วงบ่าย) */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white">
                          {/* Afternoon Header */}
                          <div className="p-2 bg-amber-50/10 flex items-center justify-between border-b border-dashed border-slate-150">
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded select-none">⛅ บ่าย</span>
                            
                            {/* Afternoon Stats */}
                            {(() => {
                              let afternoonFree = 0;
                              let afternoonBusy = 0;
                              afternoonSlots.forEach(([_, avails]) => {
                                avails.forEach(av => {
                                  if (av.status === 'available') afternoonFree++;
                                  if (av.status === 'busy') afternoonBusy++;
                                });
                              });
                              return (
                                <div className="flex gap-1 select-none">
                                  {afternoonFree > 0 && (
                                    <span className="text-[8px] px-1 py-0.2 rounded font-bold shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      ว่าง {afternoonFree}
                                    </span>
                                  )}
                                  {afternoonBusy > 0 && (
                                    <span className="text-[8px] px-1 py-0.2 rounded font-bold shrink-0 bg-rose-50 text-rose-650 border border-rose-100">
                                      ทับ {afternoonBusy}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                           {/* Afternoon Content Area */}
                          <div className="p-2 flex-grow overflow-y-auto space-y-1 min-h-0 flex flex-col justify-between">
                            {/* Afternoon Slots list */}
                            <div className="space-y-1 flex-1 flex flex-col justify-between p-0.5">
                              {daySched.dailyNote && (
                                <p 
                                  style={{ fontSize: `${calendarFontSize * 0.8}px` }}
                                  className="font-sans leading-tight text-slate-500 mb-1 max-h-[16px] overflow-y-auto whitespace-pre-wrap break-words italic select-none"
                                >
                                  📝 โน้ตเดิม: {daySched.dailyNote}
                                </p>
                              )}

                              <div className="space-y-1">
                                {afternoonSlots.map(([hr, avails]) => {
                                  const activeAvails = avails.filter(av => av.status !== 'none');
                                  if (activeAvails.length === 0) return null;
                                  return (
                                    <div key={hr} className="flex flex-col gap-0.5 border-b border-slate-50 pb-0.5 last:border-0" onClick={(e) => e.stopPropagation()}>
                                      <span 
                                        style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                        className="font-bold text-slate-500 font-mono"
                                      >
                                        {hr} น. :
                                      </span>
                                      <div className="flex flex-wrap gap-0.5">
                                        {activeAvails.map(av => (
                                          <span 
                                            key={av.userId} 
                                            style={{ fontSize: `${calendarFontSize * 0.8}px` }}
                                            className={`px-1 py-0.2 rounded-sm ${
                                              av.status === 'available' 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : 'bg-rose-50 text-rose-600 line-through decoration-slate-400'
                                            }`}
                                            title={av.note || ''}
                                          >
                                            {av.userName}{av.note ? ` (${av.note})` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Interactive Inline Note Area (No border/box, type directly!) */}
                              <div 
                                className="flex-grow flex flex-col mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEditField({ dateStr: curDateStr, type: 'afternoon' });
                                }}
                              >
                                {activeEditField?.dateStr === curDateStr && activeEditField?.type === 'afternoon' ? (
                                  <textarea
                                    id={`textarea-afternoon-${curDateStr}`}
                                    value={daySched.afternoonNote || ''}
                                    autoFocus
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setActiveEditField(null);
                                        setActiveFontColorDropdown(false);
                                        setActiveHighlightDropdown(false);
                                      }, 180);
                                    }}
                                    onChange={(e) => handleUpdateCompartmentNote(curDateStr, 'afternoon', e.target.value)}
                                    placeholder="พิมพ์บันทึกช่วงบ่ายตรงนี้..."
                                    disabled={isLocked}
                                    rows={3}
                                    style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                    className={`w-full min-h-[48px] p-1 px-1.5 border-0 bg-transparent text-slate-800 placeholder:text-slate-300/80 resize-none focus:outline-none focus:ring-0 ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div 
                                    className="p-1 flex-grow cursor-text hover:bg-slate-50/40 rounded transition-colors duration-100 min-h-[24px]"
                                    style={{ fontSize: `${calendarFontSize * 0.9}px` }}
                                  >
                                    {daySched.afternoonNote ? (
                                      <div className="p-1 px-1.5 rounded-md bg-amber-50/40 border border-amber-100/30 text-slate-700 leading-normal bg-gradient-to-r from-amber-50/60 to-orange-50/20">
                                        {parseHighlighterText(daySched.afternoonNote, isSelected)}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300/80 italic select-none text-[8.5px]">+ พิมพ์บันทึกช่วงบ่าย...</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Drag and pull down border line handle - Google Docs style */}
                        <div
                          onMouseDown={(e) => handleMouseDownOnResizer(e)}
                          onTouchStart={(e) => handleTouchStartOnResizer(e)}
                          className={`absolute bottom-0 left-0 right-0 h-2.5 bg-slate-100 hover:bg-indigo-500 active:bg-indigo-700 transition-colors cursor-ns-resize z-20 flex items-center justify-center group ${isResizing ? 'bg-indigo-400/30' : ''} no-print`}
                          title="ดึงขอบนี้ลงเพื่อปรับความสูงตารางนัดหมายทั้งหมด (เหมือน Google Docs)"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <div className="w-8 h-[2px] bg-slate-300 group-hover:bg-white rounded-full"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                {/* Time Security Log Container */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm no-print" id="audit-log-panel">
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
