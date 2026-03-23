export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@students\.nsbm\.ac\.lk$/;

export const PARKING_FEES = {
  car: 100,
  motorbike: 50,
} as const;

export const WALKIN_SURCHARGE = 20;

export const WALLET_MIN = 300;
export const WALLET_MAX = 2000;

export const MAX_VEHICLES = 5;

export const BOOKING_WINDOW_HOURS = 24;
export const CANCELLATION_WINDOW_HOURS = 1;
export const NO_SHOW_HOURS = 2;

export const PENALTY_AMOUNTS = {
  1: 200,
  2: 400,
} as const;

export type VehicleType = 'car' | 'motorbike';
export type SlotStatus = 'free' | 'booked' | 'arrived';
export type BookingStatus = 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'expired';
export type AppRole = 'student' | 'super_admin' | 'security' | 'cashier';
export type ComplaintStatus = 'pending' | 'accepted' | 'declined';
export type TransactionType = 'topup' | 'parking_fee' | 'penalty' | 'walkin_surcharge' | 'refund';
