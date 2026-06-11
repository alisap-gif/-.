import { UserProfile, DaySchedule, AttachedFile } from './types';

export const DEFAULT_USERS: UserProfile[] = [];

// Seed some data in August 2026 (สิงหาคม 2569 - Buddhist Era)
export const SEED_SCHEDULES: DaySchedule[] = [];

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
