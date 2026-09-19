import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_DEMO_BUSINESS,
  PRESET_PROFILES,
  _getBusinessStoreSnapshotForTest,
  _setBusinessStoreRoleForTest,
  _loadBusinessPresetForTest,
  _resetBusinessStoreForTest,
  UserRole,
} from "./business-store";

describe("BusinessStore & Specialist Roles (Mutaxassis rollari)", () => {
  beforeEach(() => {
    _resetBusinessStoreForTest();
  });

  it("standart rol tadbirkor ('entrepreneur') bo'lishi kerak", () => {
    const snapshot = _getBusinessStoreSnapshotForTest();
    expect(snapshot.role).toBe("entrepreneur");
    expect(snapshot.business.name).toBe("Fast Food Urganch");
  });

  it("rol buxgalter, bankir yoki konsultantga o'zgaradi", () => {
    const roles: UserRole[] = ["accountant", "banker", "consultant", "entrepreneur"];
    for (const r of roles) {
      _setBusinessStoreRoleForTest(r);
      expect(_getBusinessStoreSnapshotForTest().role).toBe(r);
    }
  });

  it("konsultant rejimi uchun mijoz preseti to'liq yuklanadi", () => {
    expect(PRESET_PROFILES.length).toBeGreaterThanOrEqual(3);

    // Coffee house Toshkent presetini yuklash
    _loadBusinessPresetForTest("toshkent-coffee");
    const snapshot = _getBusinessStoreSnapshotForTest();
    expect(snapshot.business.name).toBe("Coffee House Tashkent");
    expect(snapshot.business.type).toBe("Kofexona");
    expect(snapshot.business.monthlyRevenue).toBe(60_000_000);

    // Samarqand Retail presetini yuklash
    _loadBusinessPresetForTest("samarqand-retail");
    const snapshot2 = _getBusinessStoreSnapshotForTest();
    expect(snapshot2.business.name).toBe("Samarqand Tekstil & Retail");
    expect(snapshot2.business.type).toBe("Chakana savdo");
    expect(snapshot2.business.potentialLoan).toBe(40_000_000);
  });

  it("reset qilinganda standart qiymatlar va rol tiklanadi", () => {
    _setBusinessStoreRoleForTest("banker");
    _loadBusinessPresetForTest("toshkent-coffee");
    expect(_getBusinessStoreSnapshotForTest().role).toBe("banker");

    _resetBusinessStoreForTest();
    const snapshot = _getBusinessStoreSnapshotForTest();
    expect(snapshot.role).toBe("entrepreneur");
    expect(snapshot.business).toEqual(DEFAULT_DEMO_BUSINESS);
  });
});

