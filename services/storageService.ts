import { User, AttendanceRecord, FaceDescriptor } from '../types';

const USERS_KEY = 'eduface_users';
const ATTENDANCE_KEY = 'eduface_attendance';
const DESCRIPTORS_KEY = 'eduface_descriptors';

// Helper to serialize Float32Array for JSON storage
const serializeDescriptors = (descriptors: FaceDescriptor[]): any[] => {
  return descriptors.map(d => ({
    label: d.label,
    descriptors: d.descriptors.map(arr => Array.from(arr)) // Convert Float32Array to number[]
  }));
};

// Helper to deserialize back to Float32Array
const deserializeDescriptors = (data: any[]): FaceDescriptor[] => {
  if (!data) return [];
  return data.map(d => ({
    label: d.label,
    descriptors: d.descriptors.map((arr: number[]) => new Float32Array(arr))
  }));
};

export const StorageService = {
  // Users
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  deleteUser: (userId: string) => {
    const users = StorageService.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Also remove descriptors
    let descs = StorageService.getFaceDescriptors();
    descs = descs.filter(d => d.label !== userId);
    StorageService.saveFaceDescriptors(descs);
  },

  // Face Descriptors
  getFaceDescriptors: (): FaceDescriptor[] => {
    const data = localStorage.getItem(DESCRIPTORS_KEY);
    return data ? deserializeDescriptors(JSON.parse(data)) : [];
  },

  saveFaceDescriptors: (descriptors: FaceDescriptor[]) => {
    // We overwrite the entire set usually, or merge logic could go here
    const serializable = serializeDescriptors(descriptors);
    localStorage.setItem(DESCRIPTORS_KEY, JSON.stringify(serializable));
  },

  addFaceDescriptor: (descriptor: FaceDescriptor) => {
    const current = StorageService.getFaceDescriptors();
    // Check if exists and merge, or push new
    const existingIndex = current.findIndex(d => d.label === descriptor.label);
    if (existingIndex >= 0) {
      current[existingIndex].descriptors.push(...descriptor.descriptors);
    } else {
      current.push(descriptor);
    }
    StorageService.saveFaceDescriptors(current);
  },

  // Attendance
  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(ATTENDANCE_KEY);
    return data ? JSON.parse(data) : [];
  },

  logAttendance: (record: AttendanceRecord) => {
    const logs = StorageService.getAttendance();
    logs.push(record);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(logs));
  },

  clearData: () => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);
    localStorage.removeItem(DESCRIPTORS_KEY);
  }
};