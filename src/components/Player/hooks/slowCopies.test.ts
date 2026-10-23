import { describe, it, expect } from 'vitest';
import {
  DRIFT_LIMIT_SECONDS,
  clockCorrection,
  copyKeyFor,
  copyTimeFor,
  needsTapToUnlock,
} from './slowCopies';

const copies = {
  '0.65': 'https://bucket.test/1/audio.slow-0.65.mp3?v=1',
  '0.8': 'https://bucket.test/1/audio.slow-0.8.mp3?v=2',
};

describe('copyKeyFor', () => {
  it('finds the copy for a rate, despite float noise', () => {
    expect(copyKeyFor(0.8, copies)).toBe('0.8');
    expect(copyKeyFor(0.65, copies)).toBe('0.65');
    expect(copyKeyFor(0.65 + 1e-9, copies)).toBe('0.65');
  });

  it('has none at full speed, for unknown rates, or without copies', () => {
    expect(copyKeyFor(1, copies)).toBeNull();
    expect(copyKeyFor(0.5, copies)).toBeNull();
    expect(copyKeyFor(0.8, undefined)).toBeNull();
    expect(copyKeyFor(0.8, { '0.8': '' })).toBeNull();
  });
});

describe('copyTimeFor', () => {
  it('maps a time on the original onto the longer copy', () => {
    // A marker at 12 s of the original is at 15 s of the 0.8x copy.
    expect(copyTimeFor(12, 0.8)).toBeCloseTo(15);
    expect(copyTimeFor(13, 0.65)).toBeCloseTo(20);
  });
});

describe('clockCorrection', () => {
  it('leaves the clock alone while the drift is small', () => {
    expect(clockCorrection(15, 0.8, 12)).toBeNull();
    expect(clockCorrection(15, 0.8, 12 - DRIFT_LIMIT_SECONDS + 0.01)).toBeNull();
  });

  it('moves the clock to what is heard once they drift apart', () => {
    expect(clockCorrection(15, 0.8, 11.5)).toBeCloseTo(12);
    expect(clockCorrection(15, 0.8, 12.4)).toBeCloseTo(12);
  });
});

describe('needsTapToUnlock', () => {
  it('is true on iPhone, iPad and desktop Safari', () => {
    const iPhone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const iPhoneChrome =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
    const iPadDesktopMode =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    expect(needsTapToUnlock(iPhone)).toBe(true);
    expect(needsTapToUnlock(iPhoneChrome)).toBe(true);
    expect(needsTapToUnlock(iPadDesktopMode, 5, 'MacIntel')).toBe(true);
    expect(needsTapToUnlock(iPadDesktopMode, 0, 'MacIntel')).toBe(true); // desktop Safari
  });

  it('is false on Chrome, Yandex and Firefox', () => {
    const chromeAndroid =
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
    const yandex =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 YaBrowser/24.10 Safari/537.36';
    const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0';
    expect(needsTapToUnlock(chromeAndroid)).toBe(false);
    expect(needsTapToUnlock(yandex)).toBe(false);
    expect(needsTapToUnlock(firefox)).toBe(false);
  });
});
