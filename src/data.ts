import { UserProfile, DaySchedule, AttachedFile } from './types';

export const DEFAULT_USERS: UserProfile[] = [
  { id: 'as', name: 'AS', fullName: 'ดร. อภิสิทธิ์ (AS)', role: 'executive', avatarColor: '#f87171' },
  { id: 'sc', name: 'SC', fullName: 'ผศ.ดร. สุรชัย (SC)', role: 'executive', avatarColor: '#fb923c' },
  { id: 'tw', name: 'TW', fullName: 'รศ. ธวัชชัย (TW)', role: 'executive', avatarColor: '#facc15' },
  { id: 'jk', name: 'JK', fullName: 'ดร. จักรินทร์ (JK)', role: 'executive', avatarColor: '#4ade80' },
  { id: 'pk', name: 'PK', fullName: 'ผศ. ปริญญา (PK)', role: 'executive', avatarColor: '#38bdf8' },
  { id: 'team', name: 'ทีม วก', fullName: 'ทีมคณะทำงาน วก.', role: 'executive', avatarColor: '#c084fc' },
  { id: 'secretary', name: 'เลขา (SEC)', fullName: 'เบญญพร (เลขาธิการ)', role: 'secretary', avatarColor: '#f43f5e' }
];

// Seed some data in August 2026 (สิงหาคม 2569 - Buddhist Era)
export const SEED_SCHEDULES: DaySchedule[] = [
  {
    dateString: '2026-08-03', // Mon
    slots: {
      '09:00': [
        { userId: 'as', userName: 'AS', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:05:00Z' },
        { userId: 'tw', userName: 'TW', status: 'busy', note: 'ติดภารกิจนอกห้องเรียน', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'jk', userName: 'JK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'pk', userName: 'PK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
      ],
      '10:50': [
        { userId: 'as', userName: 'AS', status: 'available', note: 'ว่างเฉพาะถึง 11:30', isStruckThrough: false, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:05:00Z' },
        { userId: 'tw', userName: 'TW', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'jk', userName: 'JK', status: 'available', note: 'เข้าประชุมได้', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'pk', userName: 'PK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
        { userId: 'team', userName: 'ทีม วก', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:04:00Z' },
      ],
      '13:30': [
        { userId: 'as', userName: 'AS', status: 'busy', note: 'มีสอน วก.201 - ยกเลิกแล้ว', isStruckThrough: true, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:05:00Z' },
        { userId: 'tw', userName: 'TW', status: 'available', note: 'ยินดีเลื่อนถ้าจำเป็น', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'jk', userName: 'JK', status: 'busy', note: 'สัมมนาวิชาการ', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'pk', userName: 'PK', status: 'busy', note: 'ตรวจข้อสอบ', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
      ],
      '15:20': [
        { userId: 'as', userName: 'AS', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:05:00Z' },
        { userId: 'tw', userName: 'TW', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'jk', userName: 'JK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'pk', userName: 'PK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
        { userId: 'team', userName: 'ทีม วก', status: 'available', note: 'พร้อมเข้าประชุม', isStruckThrough: false, updatedAt: '2026-06-10T08:04:00Z' },
      ],
    }
  },
  {
    dateString: '2026-08-04', // Tue
    slots: {
      '09:00': [
        { userId: 'as', userName: 'AS', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'tw', userName: 'TW', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'jk', userName: 'JK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
      ],
      '13:30': [
        { userId: 'as', userName: 'AS', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:00:00Z' },
        { userId: 'sc', userName: 'SC', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:01:00Z' },
        { userId: 'tw', userName: 'TW', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:02:00Z' },
        { userId: 'jk', userName: 'JK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:03:00Z' },
        { userId: 'pk', userName: 'PK', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:04:00Z' },
        { userId: 'team', userName: 'ทีม วก', status: 'available', note: '', isStruckThrough: false, updatedAt: '2026-06-10T08:05:00Z' },
      ]
    }
  }
];

export const HOURLY_SLOTS = [
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30'
];

export const DEFAULT_ATTACHED_FILES: AttachedFile[] = [
  {
    id: '1',
    name: 'แผนตารางงาน_วก_ภาคเรียน1_2570.pdf',
    size: '1.4 MB',
    uploadedAt: '2026-06-10T05:30:00Z',
    fileType: 'pdf'
  },
  {
    id: '2',
    name: 'กำหนดการประชุมสรุปนโยบาย_2570.xlsx',
    size: '482 KB',
    uploadedAt: '2026-06-10T05:45:00Z',
    fileType: 'xlsx'
  }
];
