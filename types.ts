export enum UserRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  STAFF = 'Staff',
}

export interface FaceDescriptor {
  label: string;
  descriptors: Float32Array[];
}

export interface User {
  id: string;
  fullName: string;
  role: UserRole;
  courseOrDept: string;
  registeredAt: string;
  profileImage?: string; // Base64 thumbnail
}

export enum AttendanceType {
  CHECK_IN = 'Check-In',
  CHECK_OUT = 'Check-Out',
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  course: string;
  timestamp: string; // ISO String
  type: AttendanceType;
}

export interface ChartDataPoint {
  name: string;
  present: number;
  absent: number;
  rate: number;
}