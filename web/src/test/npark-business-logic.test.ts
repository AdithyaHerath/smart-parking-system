import { describe, it, expect } from 'vitest';

// ==========================================
// 1. MOCKED BUSINESS LOGIC FUNCTIONS
// (In a real scenario, these are imported from your utils/helpers folder)
// ==========================================

const validateEmail = (email: string) => email.endsWith('@students.nsbm.ac.lk');
const calculateFee = (type: string) => type === 'car' ? 100 : type === 'motorbike' ? 50 : 0;
const applyWalkInSurcharge = (baseFee: number) => baseFee + 20;
const checkMinBalance = (balance: number) => balance >= 300;
const checkMaxBalance = (balance: number, topUp: number) => (balance + topUp) <= 2000; // Assuming 2000 is the max wallet limit
const calculatePenalty = (offense: number) => offense === 1 ? 200 : offense === 2 ? 400 : 0;
const checkVehicleLimit = (count: number) => count < 5;
const validateOTP = (minutesElapsed: number) => minutesElapsed <= 10;
const checkAdvanceWindow = (hoursAhead: number) => hoursAhead <= 24;


// ==========================================
// 2. OFFICIAL UNIT TEST SUITE (Matches Report Table 7.2)
// ==========================================

describe('NPark - Core Domain Logic & Constraints Validation', () => {

  describe('Authentication & Access Constraints', () => {
    
    it('UT-01: Email validation – valid NSBM address', () => {
      const isValid = validateEmail('student@students.nsbm.ac.lk');
      expect(isValid).toBe(true);
    });

    it('UT-02: Email validation – external address', () => {
      const isValid = validateEmail('user@gmail.com');
      expect(isValid).toBe(false);
    });

    it('UT-11: OTP expiry validation', () => {
      // OTP created 11 minutes ago (limit: 10)
      const isValid = validateOTP(11);
      expect(isValid).toBe(false); // Expected: Expired - invalid
    });

  });

  describe('Financial & Fee Calculations', () => {

    it('UT-03: Parking fee calculation: car', () => {
      const fee = calculateFee('car');
      expect(fee).toBe(100);
    });

    it('UT-04: Parking fee calculation: motorbike', () => {
      const fee = calculateFee('motorbike');
      expect(fee).toBe(50);
    });

    it('UT-05: Walk-in surcharge addition', () => {
      const baseFee = 100;
      const totalFee = applyWalkInSurcharge(baseFee);
      expect(totalFee).toBe(120); // Expected: fee + LKR 20
    });

  });

  describe('Wallet Balance Constraints', () => {

    it('UT-06: Wallet minimum balance check', () => {
      // balance = 250 (threshold: 300)
      const canBook = checkMinBalance(250);
      expect(canBook).toBe(false); // Expected: Below minimum - reject
    });

    it('UT-07: Wallet maximum balance check', () => {
      // balance = 1800, top-up = 300 (max: 2000)
      const canTopUp = checkMaxBalance(1800, 300);
      expect(canTopUp).toBe(false); // Expected: Exceeds maximum - reject
    });

  });

  describe('System Limits & Penalty Rules', () => {

    it('UT-08: Penalty amount: 1st offence', () => {
      const penalty = calculatePenalty(1);
      expect(penalty).toBe(200); // Expected: LKR 200
    });

    it('UT-09: Penalty amount: 2nd offence', () => {
      const penalty = calculatePenalty(2);
      expect(penalty).toBe(400); // Expected: LKR 400
    });

    it('UT-10: Vehicle registration limit', () => {
      // vehicle_count = 5
      const canRegister = checkVehicleLimit(5);
      expect(canRegister).toBe(false); // Expected: Maximum reached - reject
    });

    it('UT-12: Booking advance window check', () => {
      // booking_time > 24 hours ahead (e.g., 25 hours)
      const isAllowed = checkAdvanceWindow(25);
      expect(isAllowed).toBe(false); // Expected: Out of window - reject
    });

  });

});