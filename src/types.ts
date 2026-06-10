export type UserRole = 'executive' | 'secretary';

export interface UserProfile {
  id: string;
  name: string; // e.g. "AS", "SC", "TW", "JK", "PK", "ทีม วก"
  fullName: string;
  role: UserRole;
  avatarColor: string;
}

export interface SlotAvailability {
  userId: string;
  userName: string;
  status: 'available' | 'busy' | 'none';
  note: string;
  isStruckThrough: boolean; // 3.5: หากต้องการยกเลิกสามารถขีดทับตัวอักษรได้
  updatedAt: string; // for Time-based validation
}

export interface DaySchedule {
  dateString: string; // YYYY-MM-DD
  slots: {
    [hour: string]: SlotAvailability[]; // hour: "08:00", "09:00", ...
  };
}

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  fileType: string;
  url?: string;
  contentSnapshot?: string;
}
