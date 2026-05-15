// Hard level Audios
import Introducing from "../../assets/3. Daniel/1. Introducing Myself.mp3";
import TheDeal from "../../assets/3. Daniel/2. The deal that nearly broke me..mp3";
import Conference from "../../assets/3. Daniel/3. The Conference in Munich.mp3";
import AFailure from "../../assets/3. Daniel/4. A Failure with a Silver Lining.mp3";
import TheBridge from "../../assets/3. Daniel/5. The Bridge at Low Tide.mp3";
import Night from "../../assets/3. Daniel/6. Night of the Phantom Pallets.mp3";
import FamilyReport from "../../assets/3. Daniel/7. Family Weather Report.mp3";
import ThePrice from "../../assets/3. Daniel/8. The Price of Enough.mp3";
import FamilyOnTheManifest1 from "../../assets/3. Daniel/9. Family on the Manifest, Part I The Itinerary That Blinked..mp3";
import FamilyOnTheManifest2 from "../../assets/3. Daniel/10. Family on the Manifest, Part II The Break That Tested the Break..mp3";

import { AudioTrack } from "../../types";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 1: Introducing Myself
// ─────────────────────────────────────────────────────────────
const q1_1fast = "/assets/3. Daniel/quiz/1. introducing myself/q1-fast.mp3";
const q1_1slow = "/assets/3. Daniel/quiz/1. introducing myself/q1-slow.mp3";
const q1_2fast = "/assets/3. Daniel/quiz/1. introducing myself/q2-fast.mp3";
const q1_2slow = "/assets/3. Daniel/quiz/1. introducing myself/q2-slow.mp3";
const q1_3fast = "/assets/3. Daniel/quiz/1. introducing myself/q3-fast.mp3";
const q1_3slow = "/assets/3. Daniel/quiz/1. introducing myself/q3-slow.mp3";
const q1_4fast = "/assets/3. Daniel/quiz/1. introducing myself/q4-fast.mp3";
const q1_4slow = "/assets/3. Daniel/quiz/1. introducing myself/q4-slow.mp3";
const q1_5fast = "/assets/3. Daniel/quiz/1. introducing myself/q5-fast.mp3";
const q1_5slow = "/assets/3. Daniel/quiz/1. introducing myself/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 2: The Deal That Nearly Broke Me
// ─────────────────────────────────────────────────────────────
const q2_1fast =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q1-fast.mp3";
const q2_1slow =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q1-slow.mp3";
const q2_2fast =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q2-fast.mp3";
const q2_2slow =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q2-slow.mp3";
const q2_3fast =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q3-fast.mp3";
const q2_3slow =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q3-slow.mp3";
const q2_4fast =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q4-fast.mp3";
const q2_4slow =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q4-slow.mp3";
const q2_5fast =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q5-fast.mp3";
const q2_5slow =
  "/assets/3. Daniel/quiz/2. the deal that nearly broke me/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 3: The Conference in Munich
// ─────────────────────────────────────────────────────────────
const q3_1fast =
  "/assets/3. Daniel/quiz/3. the conference in munich/q1-fast.mp3";
const q3_1slow =
  "/assets/3. Daniel/quiz/3. the conference in munich/q1-slow.mp3";
const q3_2fast =
  "/assets/3. Daniel/quiz/3. the conference in munich/q2-fast.mp3";
const q3_2slow =
  "/assets/3. Daniel/quiz/3. the conference in munich/q2-slow.mp3";
const q3_3fast =
  "/assets/3. Daniel/quiz/3. the conference in munich/q3-fast.mp3";
const q3_3slow =
  "/assets/3. Daniel/quiz/3. the conference in munich/q3-slow.mp3";
const q3_4fast =
  "/assets/3. Daniel/quiz/3. the conference in munich/q4-fast.mp3";
const q3_4slow =
  "/assets/3. Daniel/quiz/3. the conference in munich/q4-slow.mp3";
const q3_5fast =
  "/assets/3. Daniel/quiz/3. the conference in munich/q5-fast.mp3";
const q3_5slow =
  "/assets/3. Daniel/quiz/3. the conference in munich/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 4: A Failure with a Silver Lining
// ─────────────────────────────────────────────────────────────
const q4_1fast =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q1-fast.mp3";
const q4_1slow =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q1-slow.mp3";
const q4_2fast =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q2-fast.mp3";
const q4_2slow =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q2-slow.mp3";
const q4_3fast =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q3-fast.mp3";
const q4_3slow =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q3-slow.mp3";
const q4_4fast =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q4-fast.mp3";
const q4_4slow =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q4-slow.mp3";
const q4_5fast =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q5-fast.mp3";
const q4_5slow =
  "/assets/3. Daniel/quiz/4. a failure with a silver lining/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 5: The Bridge at Low Tide
// ─────────────────────────────────────────────────────────────
const q5_1fast = "/assets/3. Daniel/quiz/5. the bridge at low tide/q1-fast.mp3";
const q5_1slow = "/assets/3. Daniel/quiz/5. the bridge at low tide/q1-slow.mp3";
const q5_2fast = "/assets/3. Daniel/quiz/5. the bridge at low tide/q2-fast.mp3";
const q5_2slow = "/assets/3. Daniel/quiz/5. the bridge at low tide/q2-slow.mp3";
const q5_3fast = "/assets/3. Daniel/quiz/5. the bridge at low tide/q3-fast.mp3";
const q5_3slow = "/assets/3. Daniel/quiz/5. the bridge at low tide/q3-slow.mp3";
const q5_4fast = "/assets/3. Daniel/quiz/5. the bridge at low tide/q4-fast.mp3";
const q5_4slow = "/assets/3. Daniel/quiz/5. the bridge at low tide/q4-slow.mp3";
const q5_5fast = "/assets/3. Daniel/quiz/5. the bridge at low tide/q5-fast.mp3";
const q5_5slow = "/assets/3. Daniel/quiz/5. the bridge at low tide/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 6: Night of the Phantom Pallets
// ─────────────────────────────────────────────────────────────
const q6_1fast =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q1-fast.mp3";
const q6_1slow =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q1-slow.mp3";
const q6_2fast =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q2-fast.mp3";
const q6_2slow =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q2-slow.mp3";
const q6_3fast =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q3-fast.mp3";
const q6_3slow =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q3-slow.mp3";
const q6_4fast =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q4-fast.mp3";
const q6_4slow =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q4-slow.mp3";
const q6_5fast =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q5-fast.mp3";
const q6_5slow =
  "/assets/3. Daniel/quiz/6. night of the phantom pallets/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 7: Family Weather Report
// ─────────────────────────────────────────────────────────────
const q7_1fast = "/assets/3. Daniel/quiz/7. family weather report/q1-fast.mp3";
const q7_1slow = "/assets/3. Daniel/quiz/7. family weather report/q1-slow.mp3";
const q7_2fast = "/assets/3. Daniel/quiz/7. family weather report/q2-fast.mp3";
const q7_2slow = "/assets/3. Daniel/quiz/7. family weather report/q2-slow.mp3";
const q7_3fast = "/assets/3. Daniel/quiz/7. family weather report/q3-fast.mp3";
const q7_3slow = "/assets/3. Daniel/quiz/7. family weather report/q3-slow.mp3";
const q7_4fast = "/assets/3. Daniel/quiz/7. family weather report/q4-fast.mp3";
const q7_4slow = "/assets/3. Daniel/quiz/7. family weather report/q4-slow.mp3";
const q7_5fast = "/assets/3. Daniel/quiz/7. family weather report/q5-fast.mp3";
const q7_5slow = "/assets/3. Daniel/quiz/7. family weather report/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 8: The Price of Enough
// ─────────────────────────────────────────────────────────────
const q8_1fast = "/assets/3. Daniel/quiz/8. the price of enough/q1-fast.mp3";
const q8_1slow = "/assets/3. Daniel/quiz/8. the price of enough/q1-slow.mp3";
const q8_2fast = "/assets/3. Daniel/quiz/8. the price of enough/q2-fast.mp3";
const q8_2slow = "/assets/3. Daniel/quiz/8. the price of enough/q2-slow.mp3";
const q8_3fast = "/assets/3. Daniel/quiz/8. the price of enough/q3-fast.mp3";
const q8_3slow = "/assets/3. Daniel/quiz/8. the price of enough/q3-slow.mp3";
const q8_4fast = "/assets/3. Daniel/quiz/8. the price of enough/q4-fast.mp3";
const q8_4slow = "/assets/3. Daniel/quiz/8. the price of enough/q4-slow.mp3";
const q8_5fast = "/assets/3. Daniel/quiz/8. the price of enough/q5-fast.mp3";
const q8_5slow = "/assets/3. Daniel/quiz/8. the price of enough/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 9: Family on the Manifest, Part I
// ─────────────────────────────────────────────────────────────
const q9_1fast =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q1-fast.mp3";
const q9_1slow =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q1-slow.mp3";
const q9_2fast =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q2-fast.mp3";
const q9_2slow =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q2-slow.mp3";
const q9_3fast =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q3-fast.mp3";
const q9_3slow =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q3-slow.mp3";
const q9_4fast =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q4-fast.mp3";
const q9_4slow =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q4-slow.mp3";
const q9_5fast =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q5-fast.mp3";
const q9_5slow =
  "/assets/3. Daniel/quiz/9. family on the manifest part i/q5-slow.mp3";

// ─────────────────────────────────────────────────────────────
// Quiz Audio — Track 10: Family on the Manifest, Part II
// ─────────────────────────────────────────────────────────────
const q10_1fast =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q1-fast.mp3";
const q10_1slow =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q1-slow.mp3";
const q10_2fast =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q2-fast.mp3";
const q10_2slow =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q2-slow.mp3";
const q10_3fast =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q3-fast.mp3";
const q10_3slow =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q3-slow.mp3";
const q10_4fast =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q4-fast.mp3";
const q10_4slow =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q4-slow.mp3";
const q10_5fast =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q5-fast.mp3";
const q10_5slow =
  "/assets/3. Daniel/quiz/10. family on the manifest part ii/q5-slow.mp3";

export const hardAudioData: AudioTrack[] = [
  {
    id: "1",
    title: "Introducing Myself",
    audio: Introducing,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "1. Introducing Myself" },
      {
        startTime: 4.4,
        endTime: 9.3,
        text: "My name is Daniel Mercer, and I’m 52 years old English businessman.",
      },
      {
        startTime: 10.3,
        endTime: 15.3,
        text: "I run a mid-sized logistics company that I started fifteen years ago with two laptops,",
      },
      {
        startTime: 15.7,
        endTime: 19,
        text: "one borrowed van, and a very patient spouse.",
      },
      {
        startTime: 21.2,
        endTime: 24.3,
        text: "I grew up in a small coastal town where ships left at dawn",
      },
      {
        startTime: 24.4,
        endTime: 25.8,
        text: "and returned with the tide.",
      },
      {
        startTime: 27,
        endTime: 32,
        text: "That rhythm taught me timing matters; miss the tide and you wait.",
      },
      {
        startTime: 33.3,
        endTime: 36.7,
        text: "In business, I’ve learned to respect timing the same way. ",
      },
      {
        startTime: 37.5,
        endTime: 41.7,
        text: "I believe in compound effort—small, consistent improvements that,",
      },
      {
        startTime: 41.9,
        endTime: 45,
        text: "over years, become structural advantages.",
      },
      {
        startTime: 46.5,
        endTime: 49.9,
        text: "Outside work, I read history, lift light weights",
      },
      {
        startTime: 50.1,
        endTime: 52.5,
        text: "with more enthusiasm than technique, ",
      },
      {
        startTime: 53,
        endTime: 58,
        text: "and take dawn walks without my phone – or at least try to. ",
      },
      {
        startTime: 59.3,
        endTime: 63,
        text: "I have one daughter in college who pretends not to need advice ",
      },
      {
        startTime: 63.7,
        endTime: 66,
        text: "and one dog who clearly does. [chuckle] ",
      },
      {
        startTime: 68.4,
        endTime: 72.7,
        text: "People describe me as calm, but that calm was trained, not gifted.",
      },
      {
        startTime: 74.3,
        endTime: 77,
        text: "I’ve navigated late invoices, broken contracts, ",
      },
      {
        startTime: 77.3,
        endTime: 80,
        text: "and trucks stuck in snow at 2 a.m.",
      },
      {
        startTime: 81.5,
        endTime: 85.4,
        text: "What steadies me is a habit: write the problem down, ",
      },
      {
        startTime: 86,
        endTime: 90.6,
        text: "name the worst-case scenario, and design three exits.",
      },
      {
        startTime: 92.1,
        endTime: 94.3,
        text: "If there’s a theme to my life, it’s this:",
      },
      {
        startTime: 95,
        endTime: 101,
        text: "control the controllable, honor your promises, and let time compound the rest.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.5, label: "2", color: "red" },
      { time: 10.2, label: "3", color: "red" },
      { time: 21.2, label: "4", color: "red" },
      { time: 26.9, label: "5", color: "red" },
      { time: 33.2, label: "6", color: "red" },
      { time: 37.3, label: "7", color: "red" },
      { time: 46.3, label: "8", color: "red" },
      { time: 59.1, label: "9", color: "red" },
      { time: 68.2, label: "10", color: "red" },
      { time: 74, label: "11", color: "red" },
      { time: 81, label: "12", color: "red" },
      { time: 91.9, label: "13", color: "red" },
    ],
    quiz: [
      {
        question: "How old is Daniel Mercer, and what is his profession?",
        options: [
          "A travel writer in his early forties",
          "A 52-year-old English businessman",
          "A 48-year-old logistics consultant",
          "A retired entrepreneur in his sixties",
        ],
        correctAnswer: 1,
        referenceTime: 4.4,
        audio: { fast: q1_1fast, slow: q1_1slow },
      },
      {
        question:
          "What three things did Daniel use to start his logistics company fifteen years ago?",
        options: [
          "A bank loan, an office, and a small team",
          "Two laptops, one borrowed van, and a patient spouse",
          "One truck, a warehouse, and three employees",
          "A government grant and an inherited business",
        ],
        correctAnswer: 1,
        referenceTime: 10.3,
        audio: { fast: q1_2fast, slow: q1_2slow },
      },
      {
        question:
          "What lesson did the rhythm of Daniel's coastal hometown teach him?",
        options: [
          "That the sea is unpredictable and must always be respected",
          "That community matters more than personal ambition",
          "That timing matters — miss the tide and you wait",
          "That hard physical work builds lasting character",
        ],
        correctAnswer: 2,
        referenceTime: 27,
        audio: { fast: q1_3fast, slow: q1_3slow },
      },
      {
        question: "How does Daniel describe his calm demeanor?",
        options: [
          "A natural gift he was born with",
          "Inherited from his father's disciplined example",
          "Trained through navigating difficult situations, not gifted",
          "The result of daily meditation and journaling",
        ],
        correctAnswer: 2,
        referenceTime: 68.4,
        audio: { fast: q1_4fast, slow: q1_4slow },
      },
      {
        question:
          "What is Daniel's three-step habit for dealing with problems?",
        options: [
          "Research solutions, delegate tasks, and review outcomes",
          "Ignore the issue, wait for clarity, then act decisively",
          "Write the problem down, name the worst-case scenario, and design three exits",
          "Call a trusted advisor, make a financial plan, and execute quickly",
        ],
        correctAnswer: 2,
        referenceTime: 81.5,
        audio: { fast: q1_5fast, slow: q1_5slow },
      },
    ],
  },
  {
    id: "2",
    title: "The deal that nearly broke me",
    audio: TheDeal,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "2. The deal that nearly broke me" },
      {
        startTime: 4.8,
        endTime: 6.8,
        text: "My first meaningful contract involved ",
      },
      {
        startTime: 7,
        endTime: 9.5,
        text: "delivering medical equipment to a chain of clinics.",
      },
      {
        startTime: 10.3,
        endTime: 12.5,
        text: "I priced it lean, assuming volume ",
      },
      {
        startTime: 12.6,
        endTime: 15,
        text: "would compensate for razor-thin margins.",
      },
      {
        startTime: 16,
        endTime: 19.3,
        text: "Unfortunately, the business is not as simple as it may seem.",
      },
      {
        startTime: 20.1,
        endTime: 25,
        text: "The ink had barely dried when diesel prices spiked, a driver quit midweek,",
      },
      {
        startTime: 25.4,
        endTime: 29.2,
        text: "and the warehouse we subleased had a leaky roof that ruined two pallets.",
      },
      {
        startTime: 30.2,
        endTime: 33,
        text: "A way to start the contract, I thought.",
      },
      {
        startTime: 34.2,
        endTime: 38,
        text: "I slept on a fold-out chair, trying to calculate which bill could wait.",
      },
      {
        startTime: 39.1,
        endTime: 42,
        text: "The temptation to renegotiate was intense.",
      },
      {
        startTime: 42.8,
        endTime: 46,
        text: "I called the client, declared the problems honestly,",
      },
      {
        startTime: 46.3,
        endTime: 49.6,
        text: "and asked for schedule flexibility, not a higher fee.",
      },
      {
        startTime: 50.5,
        endTime: 52.5,
        text: "They agreed to staggered delivery windows,",
      },
      {
        startTime: 52.8,
        endTime: 55.7,
        text: "which allowed me to group routes and claw back efficiency.",
      },
      {
        startTime: 56.6,
        endTime: 61.3,
        text: "I learned that transparency is an asset, but only if paired with a plan.",
      },
      {
        startTime: 62.2,
        endTime: 65.6,
        text: "Complaining is cheap; solutions are currency.",
      },
      {
        startTime: 67,
        endTime: 69.9,
        text: "When the contract ended, they extended for another year —",
      },
      {
        startTime: 70.1,
        endTime: 71.3,
        text: "— at a fairer rate.",
      },
      {
        startTime: 72,
        endTime: 73,
        text: "I didn’t celebrate.",
      },
      {
        startTime: 73.7,
        endTime: 76.7,
        text: "I took a quiet walk, bought tarps for that roof,",
      },
      {
        startTime: 77.2,
        endTime: 79.2,
        text: "and wrote a rule in my notebook:",
      },
      {
        startTime: 80,
        endTime: 84,
        text: "'Price for volatility. If luck goes bad, can you survive?' ",
      },
      {
        startTime: 84.9,
        endTime: 87,
        text: "I still think about that rule every day.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.7, label: "2", color: "red" },
      { time: 10.2, label: "3", color: "red" },
      { time: 15.8, label: "4", color: "red" },
      { time: 19.8, label: "5", color: "red" },
      { time: 30, label: "6", color: "red" },
      { time: 34, label: "7", color: "red" },
      { time: 39, label: "8", color: "red" },
      { time: 42.7, label: "9", color: "red" },
      { time: 50.3, label: "10", color: "red" },
      { time: 56.5, label: "11", color: "red" },
      { time: 62, label: "12", color: "red" },
      { time: 66.8, label: "13", color: "red" },
      { time: 71.9, label: "14", color: "red" },
      { time: 79.6, label: "15", color: "red" },
      { time: 84.8, label: "16", color: "red" },
    ],
    // ── Track 2 ──────────────────────────────────────────────────
    quiz: [
      {
        question: "What was Daniel's first meaningful contract?",
        options: [
          "Transporting furniture across the country",
          "Delivering medical equipment to a chain of clinics",
          "Shipping refrigerated goods to supermarkets",
          "Moving office supplies for a government agency",
        ],
        correctAnswer: 1,
        referenceTime: 5,
        audio: { fast: q2_1fast, slow: q2_1slow },
      },
      {
        question:
          "What three problems hit Daniel at the very start of the contract?",
        options: [
          "A flood, a broken truck, and a lost invoice",
          "A staff strike, a missing shipment, and a client complaint",
          "Diesel prices spiked, a driver quit midweek, and the warehouse roof leaked",
          "A road closure, bad weather, and equipment failure",
        ],
        correctAnswer: 2,
        referenceTime: 18,
        audio: { fast: q2_2fast, slow: q2_2slow },
      },
      {
        question:
          "When Daniel called his client to declare the problems, what did he ask for?",
        options: [
          "A higher fee to cover unexpected losses",
          "An early termination of the contract",
          "Schedule flexibility, not a higher fee",
          "A short-term loan to bridge the cash gap",
        ],
        correctAnswer: 2,
        referenceTime: 38,
        audio: { fast: q2_3fast, slow: q2_3slow },
      },
      {
        question:
          "What did Daniel learn about transparency from this experience?",
        options: [
          "Transparency should only be used as a last resort",
          "Transparency is always enough on its own to solve problems",
          "Transparency is an asset, but only if paired with a plan",
          "Transparency makes clients lose confidence in you",
        ],
        correctAnswer: 2,
        referenceTime: 55,
        audio: { fast: q2_4fast, slow: q2_4slow },
      },
      {
        question:
          "What rule did Daniel write in his notebook after this contract ended?",
        options: [
          '"Always negotiate the highest possible fee upfront."',
          '"Never trust a client who asks for schedule flexibility."',
          '"Price for volatility. If luck goes bad, can you survive?"',
          '"Complaining is cheap; solutions are currency."',
        ],
        correctAnswer: 2,
        referenceTime: 75,
        audio: { fast: q2_5fast, slow: q2_5slow },
      },
    ],
  },
  {
    id: "3",
    title: "Conference in Munich",
    audio: Conference,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "3. The Conference in Munich" },
      {
        startTime: 3.5,
        endTime: 6.8,
        text: "I was 48, an Englishman with more miles than medals, ",
      },
      {
        startTime: 7,
        endTime: 10.7,
        text: "when I flew to Munich for a logistics conference I hadn’t prepared for. ",
      },
      {
        startTime: 11.9,
        endTime: 15,
        text: "Jet lag back then just bent me in half - it was awful. [chuckle]",
      },
      {
        startTime: 16.3,
        endTime: 20.4,
        text: "When I arrived, the hotel smelled of polished wood and quiet money.",
      },
      {
        startTime: 21.1,
        endTime: 23.4,
        text: "I told myself I was there to “network.” ",
      },
      {
        startTime: 24.1,
        endTime: 25.2,
        text: "To tell you the truth: ",
      },
      {
        startTime: 25.5,
        endTime: 28.7,
        text: "I needed ideas to keep 'the wheels from wobbling' at home.",
      },
      {
        startTime: 29.8,
        endTime: 32,
        text: "The keynote arrived like a surgeon.",
      },
      {
        startTime: 33.1,
        endTime: 37.5,
        text: "I expected equations; he dismantled my favorite belief instead: ",
      },
      {
        startTime: 38.2,
        endTime: 41,
        text: "optimization isn’t mostly math. ",
      },
      {
        startTime: 41.7,
        endTime: 46,
        text: "“It’s a human coordination problem disguised by numbers.” ",
      },
      {
        startTime: 46.9,
        endTime: 50,
        text: "Something accurate and uncomfortable clicked.",
      },
      {
        startTime: 51,
        endTime: 55.6,
        text: "At coffee, he asked about my team—not revenue, not software.",
      },
      {
        startTime: 56.7,
        endTime: 61,
        text: "I admitted turnover was high, a door that never stopped spinning.",
      },
      {
        startTime: 62,
        endTime: 63.5,
        text: "He stirred his espresso.",
      },
      {
        startTime: 64,
        endTime: 67.5,
        text: "“Then every optimization you make is temporary. ",
      },
      {
        startTime: 68,
        endTime: 71,
        text: "You’re pouring fine wine into paper cups.”",
      },
      {
        startTime: 71.5,
        endTime: 76,
        text: "That line followed me to a beer hall where the first stein tasted like honesty. ",
      },
      {
        startTime: 77.1,
        endTime: 82.4,
        text: "I split a page: “Math” on the left, “People” on the right. ",
      },
      {
        startTime: 83.2,
        endTime: 85.5,
        text: "For once, people won.",
      },
      {
        startTime: 86.7,
        endTime: 92.6,
        text: "I sketched a six-month plan: raise baseline wages, rotate weekends, ",
      },
      {
        startTime: 93.2,
        endTime: 98.4,
        text: "fund commercial-driver upskilling, build a path from loader to dispatcher,",
      },
      {
        startTime: 99,
        endTime: 104,
        text: "add mentor ride-alongs, tie bonuses to team error rates, ",
      },
      {
        startTime: 104.7,
        endTime: 107.5,
        text: "and require managers to run a route day each month.",
      },
      {
        startTime: 108.2,
        endTime: 110.9,
        text: "No desk-only generals.",
      },
      {
        startTime: 111.3,
        endTime: 112.3,
        text: "The cost hurt.",
      },
      {
        startTime: 112.8,
        endTime: 117,
        text: "I could hear the accountants sharpening pencils from a continent away.",
      },
      {
        startTime: 117.5,
        endTime: 121,
        text: "But within a year, routes stopped behaving like weather.",
      },
      {
        startTime: 122,
        endTime: 123.2,
        text: "Error rates halved.",
      },
      {
        startTime: 123.7,
        endTime: 127,
        text: "Clients noticed arrivals that were precisely on time, ",
      },
      {
        startTime: 127.3,
        endTime: 131,
        text: "handled by drivers who knew names, quirks, and back doors. ",
      },
      {
        startTime: 132.2,
        endTime: 134.4,
        text: "I stopped seeing drivers as interchangeable ",
      },
      {
        startTime: 135,
        endTime: 140,
        text: "and started seeing them as relationship holders — trust on wheels.",
      },
      {
        startTime: 141.2,
        endTime: 145,
        text: "Munich gave me no formulas, just a compass:",
      },
      {
        startTime: 145.5,
        endTime: 149,
        text: "systems succeed at the speed of trust. ",
      },
      {
        startTime: 150.1,
        endTime: 154,
        text: "The best optimization I’ve made didn’t live in a spreadsheet",
      },
      {
        startTime: 154.6,
        endTime: 159,
        text: "— it wore a uniform, learned a new skill, and chose to stay.",
      },
      {
        startTime: 161,
        endTime: 163.2,
        text: "Always bet on your workers.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 3.4, label: "2", color: "red" },
      { time: 11.7, label: "3", color: "red" },
      { time: 16, label: "4", color: "red" },
      { time: 21, label: "5", color: "red" },
      { time: 24, label: "6", color: "red" },
      { time: 29.7, label: "7", color: "red" },
      { time: 33, label: "8", color: "red" },
      { time: 38.2, label: "9", color: "red" },
      { time: 41.6, label: "10", color: "red" },
      { time: 46.8, label: "11", color: "red" },
      { time: 50.8, label: "12", color: "red" },
      { time: 56.5, label: "13", color: "red" },
      { time: 61.8, label: "14", color: "red" },
      { time: 67.9, label: "15", color: "red" },
      { time: 71.4, label: "16", color: "red" },
      { time: 77, label: "17", color: "red" },
      { time: 83, label: "18", color: "red" },
      { time: 108, label: "19", color: "red" },
      { time: 111, label: "20", color: "red" },
      { time: 117.4, label: "21", color: "red" },
      { time: 121.8, label: "22", color: "red" },
      { time: 132, label: "23", color: "red" },
      { time: 141, label: "24", color: "red" },
      { time: 150, label: "25", color: "red" },
    ],
    // ── Track 3 ──────────────────────────────────────────────────
    quiz: [
      {
        question:
          "Why did Daniel really fly to Munich for the logistics conference?",
        options: [
          "He had been invited as a guest speaker",
          "He organised the conference himself",
          "He needed ideas to keep his business from struggling",
          "He was sent by his investors to scout new partners",
        ],
        correctAnswer: 2,
        referenceTime: 12,
        audio: { fast: q3_1fast, slow: q3_1slow },
      },
      {
        question:
          "What surprising claim did the keynote speaker make about optimization?",
        options: [
          "That optimization is mostly about advanced mathematics",
          "That optimization is a human coordination problem disguised by numbers",
          "That optimization requires expensive enterprise software",
          "That optimization is impossible without a large, stable team",
        ],
        correctAnswer: 1,
        referenceTime: 30,
        audio: { fast: q3_2fast, slow: q3_2slow },
      },
      {
        question:
          "What metaphor did the speaker use after Daniel admitted his staff turnover was high?",
        options: [
          '"You\'re building a house on sand."',
          '"You\'re running a race with no finish line."',
          '"You\'re pouring fine wine into paper cups."',
          '"You\'re planting seeds in frozen ground."',
        ],
        correctAnswer: 2,
        referenceTime: 45,
        audio: { fast: q3_3fast, slow: q3_3slow },
      },
      {
        question:
          "What six-month plan did Daniel sketch out in the beer hall after the conference?",
        options: [
          "Cut costs, automate processes, and reduce staff headcount",
          "Raise baseline wages, rotate weekends, fund driver upskilling, build a loader-to-dispatcher path, add mentor ride-alongs, and tie bonuses to team error rates",
          "Hire new senior managers, upgrade software, and expand the fleet",
          "Outsource logistics, reduce routes, and renegotiate client contracts",
        ],
        correctAnswer: 1,
        referenceTime: 65,
        audio: { fast: q3_4fast, slow: q3_4slow },
      },
      {
        question: "What compass did Munich ultimately give Daniel?",
        options: [
          "Invest in the latest technology to stay ahead of competitors",
          "Always prioritise revenue growth over people management",
          "Systems succeed at the speed of trust",
          "Math is the only reliable foundation for logistics planning",
        ],
        correctAnswer: 2,
        referenceTime: 98,
        audio: { fast: q3_5fast, slow: q3_5slow },
      },
    ],
  },
  {
    id: "4",
    title: "A Failure with a Silver Lining",
    audio: AFailure,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "4. A Failure with a Silver Lining" },
      {
        startTime: 4.2,
        endTime: 8,
        text: "In our company we always try to expand our ventures somewhere else. ",
      },
      {
        startTime: 8.9,
        endTime: 12.7,
        text: "Last month, my company tried to expand into refrigerated transport — ",
      },
      {
        startTime: 13.5,
        endTime: 14.5,
        text: "— but as it turned out — ",
      },
      {
        startTime: 14.8,
        endTime: 16.3,
        text: "we didn't respect its complexity.",
      },
      {
        startTime: 17.5,
        endTime: 22,
        text: "I bought two used reefers at auction, confident my general knowledge would transfer.",
      },
      {
        startTime: 22.6,
        endTime: 23.6,
        text: "It didn’t.",
      },
      {
        startTime: 24.5,
        endTime: 27.8,
        text: "So I had to withstand an immense amount of stress and pressure —",
      },
      {
        startTime: 28.1,
        endTime: 30,
        text: "including the financial losses. ",
      },
      {
        startTime: 31.2,
        endTime: 33.4,
        text: "We used these reefers 4 days ago. ",
      },
      {
        startTime: 34,
        endTime: 36,
        text: "You will be surprised — in the nutshell,",
      },
      {
        startTime: 36.5,
        endTime: 39.8,
        text: "the temperature fluctuations spoiled a shipment of artisan cheeses,",
      },
      {
        startTime: 40.3,
        endTime: 45.2,
        text: "and I had to pay the invoice in full, plus an apology written by hand.",
      },
      {
        startTime: 46.4,
        endTime: 48.7,
        text: "I had to make a story up, saying something like: ",
      },
      {
        startTime: 49.2,
        endTime: 52,
        text: "'The refrigerators went down because of the bad road conditions'",
      },
      {
        startTime: 52.6,
        endTime: 56.4,
        text: "I had to blame the road! Ridiculous, but whatever.",
      },
      {
        startTime: 57.5,
        endTime: 61,
        text: "The vendor’s owner, a fierce woman named Eliza, called me. ",
      },
      {
        startTime: 61.8,
        endTime: 63,
        text: "I braced for anger.",
      },
      {
        startTime: 64,
        endTime: 70,
        text: "Instead she said, 'Be honest. If you want to learn the craft, then call me.'",
      },
      {
        startTime: 71.4,
        endTime: 74.7,
        text: "I guess she understood that the cheese should have arrived perfectly fine",
      },
      {
        startTime: 75.1,
        endTime: 77,
        text: "— if the reefers would've been working.",
      },
      {
        startTime: 78.1,
        endTime: 81.3,
        text: "I spent three weekends shadowing a veteran reefer operator, ",
      },
      {
        startTime: 81.5,
        endTime: 85,
        text: "learning the difference between 'cold' and 'stable cold,'",
      },
      {
        startTime: 85.5,
        endTime: 87.5,
        text: "how door-open events matter, ",
      },
      {
        startTime: 88,
        endTime: 91.5,
        text: "how a 20-minute delay at a border can ruin a day’s work.",
      },
      {
        startTime: 92.7,
        endTime: 96.6,
        text: "Six months later, I returned to Eliza—not with a pitch,",
      },
      {
        startTime: 97,
        endTime: 98.2,
        text: "but with performance logs.",
      },
      {
        startTime: 99.3,
        endTime: 100.5,
        text: "She gave us another chance.",
      },
      {
        startTime: 101.4,
        endTime: 104,
        text: "We executed flawlessly.",
      },
      {
        startTime: 104.6,
        endTime: 108,
        text: "Failure, I realized, isn’t instructive by default;",
      },
      {
        startTime: 109,
        endTime: 113.4,
        text: "it becomes instructive when you pay its tuition in attention, not just money. ",
      },
      {
        startTime: 114.4,
        endTime: 120.2,
        text: "Since then, any new line gets a pilot phase, a mentor, and a humility budget.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4, label: "2", color: "red" },
      { time: 8.8, label: "3", color: "red" },
      { time: 13.4, label: "4", color: "red" },
      { time: 17.5, label: "5", color: "red" },
      { time: 24.4, label: "6", color: "red" },
      { time: 31.2, label: "7", color: "red" },
      { time: 46.2, label: "8", color: "red" },
      { time: 52.2, label: "9", color: "red" },
      { time: 57.3, label: "10", color: "red" },
      { time: 61.5, label: "11", color: "red" },
      { time: 71, label: "12", color: "red" },
      { time: 77.8, label: "13", color: "red" },
      { time: 92.5, label: "14", color: "red" },
      { time: 99, label: "15", color: "red" },
      { time: 104.5, label: "16", color: "red" },
      { time: 114, label: "17", color: "red" },
    ],
    quiz: [
      {
        question: "What new area did Daniel's company try to expand into?",
        options: [
          "International shipping by sea",
          "Drone delivery services",
          "Refrigerated transport",
          "Pharmaceutical courier services",
        ],
        correctAnswer: 2,
        referenceTime: 8,
        audio: { fast: q4_1fast, slow: q4_1slow },
      },
      {
        question: "What caused the shipment of artisan cheeses to be spoiled?",
        options: [
          "The driver took the wrong route and added hours to the journey",
          "The cheeses were packed incorrectly by the supplier",
          "Temperature fluctuations from reefers that weren't working properly",
          "A 24-hour delay at customs held the delivery back",
        ],
        correctAnswer: 2,
        referenceTime: 25,
        audio: { fast: q4_2fast, slow: q4_2slow },
      },
      {
        question:
          "How did Eliza, the vendor's owner, respond when Daniel called after the spoiled shipment?",
        options: [
          "She told him to be honest and offered to teach him the craft",
          "She demanded immediate full compensation and threatened legal action",
          "She refused to speak to him and cancelled all future contracts",
          "She was sympathetic and chose to waive the invoice",
        ],
        correctAnswer: 0,
        referenceTime: 50,
        audio: { fast: q4_3fast, slow: q4_3slow },
      },
      {
        question:
          "What did Daniel do to learn the reefer trade properly after the failure?",
        options: [
          "He hired an expensive industry consultant",
          "He took an online course in refrigerated logistics",
          "He spent three weekends shadowing a veteran reefer operator",
          "He sent his operations manager to an external training programme",
        ],
        correctAnswer: 2,
        referenceTime: 65,
        audio: { fast: q4_4fast, slow: q4_4slow },
      },
      {
        question:
          "What policy did Daniel introduce for any new business line after this experience?",
        options: [
          "A full financial audit before committing any capital",
          "A legal review and insurance assessment",
          "A pilot phase, a mentor, and a humility budget",
          "A six-month trial period with no active client commitments",
        ],
        correctAnswer: 2,
        referenceTime: 90,
        audio: { fast: q4_5fast, slow: q4_5slow },
      },
    ],
  },
  {
    id: "5",
    title: "The Bridge at Low Tide",
    audio: TheBridge,
    subtitles: [
      { startTime: 0.1, endTime: 3.2, text: "5. The Bridge at Low Tide." },
      {
        startTime: 4.7,
        endTime: 8,
        text: "I have a story from one of my own personal deliveries.",
      },
      {
        startTime: 8.9,
        endTime: 13.1,
        text: "There’s a single-lane stone bridge on the north road out of my hometown, Southampton.",
      },
      {
        startTime: 14.3,
        endTime: 19,
        text: "No lights, no sensor, just a road locals who learn by driving through it ",
      },
      {
        startTime: 19.1,
        endTime: 21,
        text: "it when there is some natural light present.",
      },
      {
        startTime: 22.6,
        endTime: 25,
        text: "Years ago, on a visit back from the warehouse,",
      },
      {
        startTime: 25.7,
        endTime: 29.7,
        text: "I reached the bridge at dawn to find a removal lorry wedged like a cork",
      },
      {
        startTime: 30.2,
        endTime: 33,
        text: "— reverse gear gone, driver white-knuckled.",
      },
      {
        startTime: 34.2,
        endTime: 39.5,
        text: "Behind me, a queue of commuters; ahead of him, a tractor and an old man",
      },
      {
        startTime: 39.6,
        endTime: 41.7,
        text: "who refused to blink first. ",
      },
      {
        startTime: 43,
        endTime: 46,
        text: "It is always difficult to resolve such problems on the road ",
      },
      {
        startTime: 46.2,
        endTime: 49.3,
        text: "where every single person thinks he or she is right.",
      },
      {
        startTime: 50.5,
        endTime: 52.3,
        text: "My younger self would’ve honked, fumed, ",
      },
      {
        startTime: 52.7,
        endTime: 54.6,
        text: "and created heat without light.",
      },
      {
        startTime: 56,
        endTime: 59,
        text: "Instead, I did what my father taught me on the quay: ",
      },
      {
        startTime: 60,
        endTime: 64,
        text: "step into the gap between the tractor and the lorry and name the rules.",
      },
      {
        startTime: 65.4,
        endTime: 69,
        text: "I walked the line, asked who could back 50 yards, ",
      },
      {
        startTime: 69.4,
        endTime: 71.5,
        text: "who had trailers, who had patience.",
      },
      {
        startTime: 72.8,
        endTime: 74.2,
        text: "We made a staggered retreat, ",
      },
      {
        startTime: 74.7,
        endTime: 78.2,
        text: "hand signals and nods carrying more weight than any title.",
      },
      {
        startTime: 79.8,
        endTime: 82.3,
        text: "Twenty minutes later, the bridge breathed again. ",
      },
      {
        startTime: 84.4,
        endTime: 87.4,
        text: "Later, over tea, I wrote in my notebook:",
      },
      {
        startTime: 88.4,
        endTime: 92.6,
        text: "in deadlocks, hierarchy is less useful than choreography. ",
      },
      {
        startTime: 93.7,
        endTime: 96,
        text: "Logistics is seldom about trucks. ",
      },
      {
        startTime: 96.7,
        endTime: 99.7,
        text: "It’s about teaching strangers to share a narrow bridge.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.5, label: "2", color: "red" },
      { time: 8.8, label: "3", color: "red" },
      { time: 14.2, label: "4", color: "red" },
      { time: 22.3, label: "5", color: "red" },
      { time: 34, label: "6", color: "red" },
      { time: 42.7, label: "7", color: "red" },
      { time: 55.8, label: "8", color: "red" },
      { time: 65.2, label: "9", color: "red" },
      { time: 72.6, label: "10", color: "red" },
      { time: 84, label: "11", color: "red" },
      { time: 93.5, label: "12", color: "red" },
    ],
    // ── Track 5 ──────────────────────────────────────────────────
    quiz: [
      {
        question:
          "Where is the single-lane stone bridge Daniel describes located?",
        options: [
          "On the outskirts of London near his main depot",
          "On the north road out of his hometown, Southampton",
          "Near his first warehouse in the Midlands",
          "On a country road he used while driving through Munich",
        ],
        correctAnswer: 1,
        referenceTime: 10,
        audio: { fast: q5_1fast, slow: q5_1slow },
      },
      {
        question:
          "What situation did Daniel find when he arrived at the bridge at dawn?",
        options: [
          "A flooded road blocking all oncoming traffic",
          "Two cars at a standoff over right of way",
          "A removal lorry wedged like a cork with its reverse gear gone",
          "A broken-down tractor spilling its load across the lane",
        ],
        correctAnswer: 2,
        referenceTime: 20,
        audio: { fast: q5_2fast, slow: q5_2slow },
      },
      {
        question:
          "How did Daniel choose to resolve the deadlock at the bridge?",
        options: [
          "He called the police and waited for official help to arrive",
          "He honked his horn and forced his way through the gap",
          "He walked the line, named the rules, and coordinated a staggered retreat using hand signals",
          "He turned around, took a detour, and left the others to sort it out",
        ],
        correctAnswer: 2,
        referenceTime: 42,
        audio: { fast: q5_3fast, slow: q5_3slow },
      },
      {
        question:
          "What lesson did Daniel write in his notebook after the bridge incident?",
        options: [
          "In deadlocks, hierarchy is less useful than choreography",
          "Always plan an alternative route before setting off on a delivery",
          "Never drive on unfamiliar roads without a navigator",
          "The early morning is the most dangerous time to be on the road",
        ],
        correctAnswer: 0,
        referenceTime: 65,
        audio: { fast: q5_4fast, slow: q5_4slow },
      },
      {
        question:
          "What broader insight about logistics does Daniel draw from the bridge story?",
        options: [
          "Logistics is mainly about having the right vehicles for the job",
          "Speed is always the most important factor in logistics",
          "Logistics is seldom about trucks — it's about teaching strangers to share a narrow bridge",
          "The best logistics companies always rely on the newest technology",
        ],
        correctAnswer: 2,
        referenceTime: 72,
        audio: { fast: q5_5fast, slow: q5_5slow },
      },
    ],
  },
  {
    id: "6",
    title: "Night of the Phantom Pallets",
    audio: Night,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "6. Night of the Phantom Pallets" },
      {
        startTime: 4.8,
        endTime: 7.1,
        text: "The business of transporting and sorting things",
      },
      {
        startTime: 7.2,
        endTime: 10.8,
        text: "can sometimes be not so strategic and calculated.",
      },
      {
        startTime: 11.8,
        endTime: 15.6,
        text: "There are sometimes — as I call them — 'logistic nightmares' ",
      },
      {
        startTime: 16.2,
        endTime: 20,
        text: "— that appear so quickly that you need to decide what to do in matter of minutes.",
      },
      {
        startTime: 21.1,
        endTime: 25.1,
        text: "And in the scope of a transporting business - that can be quite serious.",
      },
      {
        startTime: 27,
        endTime: 32,
        text: "Our worst “logistic nightmare” started with five pallets that didn’t exist. ",
      },
      {
        startTime: 33.6,
        endTime: 39.4,
        text: "Basically, what happened is: customs broker’s typo spawned duplicate entries;",
      },
      {
        startTime: 40.3,
        endTime: 42.5,
        text: "created 5 excessive pallets.",
      },
      {
        startTime: 43.3,
        endTime: 46.6,
        text: "And a warehouse scanner 'hiccup' made the ghosts 'real'.",
      },
      {
        startTime: 47.7,
        endTime: 52,
        text: "Suddenly, our Warehouse Management System showed stock we didn’t own, ",
      },
      {
        startTime: 52.8,
        endTime: 55.5,
        text: "and a time-critical shipment was built on air.",
      },
      {
        startTime: 56,
        endTime: 59,
        text: "So we were about to ship 'nothing'.",
      },
      {
        startTime: 59.7,
        endTime: 62,
        text: "Always fun when this happens. [laughs]",
      },
      {
        startTime: 63.1,
        endTime: 67.6,
        text: "At 1:12 a.m., we discovered the mismatch — deep at night.",
      },
      {
        startTime: 69.1,
        endTime: 73.4,
        text: "I felt my chest tighten the way it did when the roof leaked in year one.",
      },
      {
        startTime: 74.3,
        endTime: 77.2,
        text: "But panic was a luxury item we couldn’t afford.",
      },
      {
        startTime: 79,
        endTime: 83,
        text: "I split the team: one group to reconcile physical counts, ",
      },
      {
        startTime: 83.7,
        endTime: 90,
        text: "one to reconstruct the data trail, one to call the client with a plain report and options.",
      },
      {
        startTime: 91,
        endTime: 93,
        text: "We 'cannibalised' sister depots,",
      },
      {
        startTime: 93.3,
        endTime: 100,
        text: "paid for a dawn hotshot, and turned the pallets from fiction into reality by 6:40 a.m.",
      },
      {
        startTime: 101.3,
        endTime: 106,
        text: "The client received the goods — and we had the debriefing before lunch.",
      },
      {
        startTime: 107.2,
        endTime: 112,
        text: "We retired the scanner model, added a “hard count required” rule",
      },
      {
        startTime: 112.2,
        endTime: 116.3,
        text: "when exceptions appear, and rewrote our Service Level Agreement ",
      },
      {
        startTime: 116.5,
        endTime: 119,
        text: "to include how we tell the truth under pressure. ",
      },
      {
        startTime: 120.5,
        endTime: 125,
        text: "The lesson was sharp: systems fail in plural.",
      },
      {
        startTime: 125.8,
        endTime: 130,
        text: "Recovery requires a choir, not a solo.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.7, label: "2", color: "red" },
      { time: 11.6, label: "3", color: "red" },
      { time: 21, label: "4", color: "red" },
      { time: 26.4, label: "5", color: "red" },
      { time: 33, label: "6", color: "red" },
      { time: 43, label: "7", color: "red" },
      { time: 47.5, label: "8", color: "red" },
      { time: 56.3, label: "9", color: "red" },
      { time: 63, label: "10", color: "red" },
      { time: 69, label: "11", color: "red" },
      { time: 78.7, label: "12", color: "red" },
      { time: 90.7, label: "13", color: "red" },
      { time: 100.8, label: "14", color: "red" },
      { time: 107, label: "15", color: "red" },
      { time: 120, label: "16", color: "red" },
    ],
    quiz: [
      {
        question:
          "What originally caused the phantom pallets to appear in the system?",
        options: [
          "A hacker broke into the Warehouse Management System overnight",
          "A customs broker's typo created duplicate entries, and a scanner glitch made them appear real",
          "A new employee accidentally deleted and then restored shipping records",
          "A client ordered extra pallets and then cancelled without informing the team",
        ],
        correctAnswer: 1,
        referenceTime: 18,
        audio: { fast: q6_1fast, slow: q6_1slow },
      },
      {
        question: "At what time did Daniel's team discover the stock mismatch?",
        options: ["9:30 p.m.", "11:45 p.m.", "1:12 a.m.", "3:00 a.m."],
        correctAnswer: 2,
        referenceTime: 38,
        audio: { fast: q6_2fast, slow: q6_2slow },
      },
      {
        question: "How did Daniel split his team to tackle the crisis?",
        options: [
          "One group to reconcile physical counts, one to reconstruct the data trail, one to call the client with a plain report and options",
          "One group to call clients, one to fix the software, one to contact the press",
          "One group to find replacement stock, one to delay the shipment, one to renegotiate the contract",
          "One group to file an insurance claim, one to contact customs, one to pause all operations",
        ],
        correctAnswer: 0,
        referenceTime: 50,
        audio: { fast: q6_3fast, slow: q6_3slow },
      },
      {
        question:
          "By what time did Daniel's team turn the phantom pallets from fiction into reality?",
        options: ["4:00 a.m.", "5:30 a.m.", "6:40 a.m.", "8:15 a.m."],
        correctAnswer: 2,
        referenceTime: 62,
        audio: { fast: q6_4fast, slow: q6_4slow },
      },
      {
        question:
          "What was the key lesson Daniel drew from the phantom pallets incident?",
        options: [
          "Systems are always reliable as long as they are maintained properly",
          "One strong leader can solve any logistical crisis alone",
          "Systems fail in plural — recovery requires a choir, not a solo",
          "The best prevention is avoiding clients with complex supply chains",
        ],
        correctAnswer: 2,
        referenceTime: 80,
        audio: { fast: q6_5fast, slow: q6_5slow },
      },
    ],
  },
  {
    id: "7",
    title: "Family Weather Report",
    audio: FamilyReport,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "7. Family Weather Report." },
      { startTime: 4.1, endTime: 5.7, text: "My family is quite big." },
      {
        startTime: 6,
        endTime: 10.7,
        text: "I have a wife, a daughter and a 3 year-old son with a toy-terrier named Terry.",
      },
      {
        startTime: 11.6,
        endTime: 16,
        text: "At home, we’re a small fleet with mismatched schedules. ",
      },
      {
        startTime: 16.6,
        endTime: 21.7,
        text: "My daughter calls from university at odd hours—questions disguised as sarcasm",
      },
      {
        startTime: 22.1,
        endTime: 25.3,
        text: "—and I take the calls even when I’m lacing my shoes for a dawn walk.",
      },
      {
        startTime: 26.8,
        endTime: 31.7,
        text: "My wife works irregular hours in the clinic, but she still persists to like this job.",
      },
      {
        startTime: 32.6,
        endTime: 36.1,
        text: "Her name is Sandra, and she is the one who once tolerated my risks",
      },
      {
        startTime: 36.2,
        endTime: 39,
        text: "like a scientist observing a volatile compound,",
      },
      {
        startTime: 39.8,
        endTime: 41.2,
        text: "but now co-authors them.",
      },
      {
        startTime: 42.4,
        endTime: 44.5,
        text: "We hold a Sunday council at the kitchen table: ",
      },
      {
        startTime: 45.3,
        endTime: 48,
        text: "calendar collisions, grocery logistics, ",
      },
      {
        startTime: 48.5,
        endTime: 51.5,
        text: "the dog’s mysterious vendetta against the postman.",
      },
      {
        startTime: 52.4,
        endTime: 55.2,
        text: "I bring my work habits and try not to weaponize them. ",
      },
      {
        startTime: 56,
        endTime: 61,
        text: "We name worst cases, we design exits, we write down who’s buying milk.",
      },
      {
        startTime: 62.2,
        endTime: 65.2,
        text: "When the business runs hot, I can feel the temperature at home ",
      },
      {
        startTime: 65.3,
        endTime: 71,
        text: "rise half a degree — short answers, late dinners, abandoned mugs. ",
      },
      {
        startTime: 72.2,
        endTime: 75.7,
        text: "I’ve learned to declare a red day the way we flag a route at risk:",
      },
      {
        startTime: 76.2,
        endTime: 79,
        text: "I tell them where I’ll be scarce and when I’ll be back,",
      },
      {
        startTime: 79.6,
        endTime: 81,
        text: "then I keep the promise. ",
      },
      {
        startTime: 81.6,
        endTime: 84.5,
        text: "Calm, like trust, is compound interest. ",
      },
      {
        startTime: 85.5,
        endTime: 88.6,
        text: "But my son: he cannot take me being not at home, ",
      },
      {
        startTime: 89.3,
        endTime: 91.2,
        text: "so I might reconsider the timetable.",
      },
      {
        startTime: 92.5,
        endTime: 95,
        text: "He really wants everybody to be at home all the time.",
      },
      {
        startTime: 95.5,
        endTime: 99,
        text: "Well, at least if the business will be successful in the future",
      },
      {
        startTime: 99.7,
        endTime: 102,
        text: "— I'm sure he won't mind. [chuckle]",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4, label: "2", color: "red" },
      { time: 11.5, label: "3", color: "red" },
      { time: 16.5, label: "4", color: "red" },
      { time: 26.6, label: "5", color: "red" },
      { time: 32.4, label: "6", color: "red" },
      { time: 42.3, label: "7", color: "red" },
      { time: 52, label: "8", color: "red" },
      { time: 62, label: "9", color: "red" },
      { time: 72, label: "10", color: "red" },
      { time: 85.3, label: "11", color: "red" },
      { time: 92.3, label: "12", color: "red" },
    ],
    quiz: [
      {
        question: "How does Daniel describe his family at home?",
        options: [
          "A wife, two sons, and a labrador named Max",
          "A wife, a daughter, a 3-year-old son, and a toy-terrier named Terry",
          "A wife, twin daughters, and a cat",
          "Just a wife and a daughter away at college",
        ],
        correctAnswer: 1,
        referenceTime: 4,
        audio: { fast: q7_1fast, slow: q7_1slow },
      },
      {
        question:
          "What does Daniel call the regular family meeting he and his wife hold?",
        options: [
          "A Monday morning briefing",
          "A family debrief session",
          "A Sunday council at the kitchen table",
          "A weekly household check-in",
        ],
        correctAnswer: 2,
        referenceTime: 28,
        audio: { fast: q7_2fast, slow: q7_2slow },
      },
      {
        question:
          "How does Daniel describe his wife Sandra's relationship with his professional risks?",
        options: [
          "She strongly disapproves of all financial risk-taking",
          "She is largely indifferent to his business decisions",
          "She once tolerated his risks like a scientist observing a volatile compound, but now co-authors them",
          "She manages the financial side of the company herself",
        ],
        correctAnswer: 2,
        referenceTime: 32,
        audio: { fast: q7_3fast, slow: q7_3slow },
      },
      {
        question:
          'What does Daniel do on a "red day" when work makes him scarce at home?',
        options: [
          "He says nothing and trusts his family will understand",
          "He tells them where he'll be scarce and when he'll be back, then keeps the promise",
          "He gives his family extra money to compensate for his absence",
          "He cancels his work commitments to prioritise family time",
        ],
        correctAnswer: 1,
        referenceTime: 58,
        audio: { fast: q7_4fast, slow: q7_4slow },
      },
      {
        question:
          "How does Daniel describe the connection between calm and trust in family life?",
        options: [
          "Calm is a natural state that requires no conscious effort",
          "Trust is built through generous gifts and family holidays",
          "Calm, like trust, is compound interest",
          "Family calm depends entirely on financial stability",
        ],
        correctAnswer: 2,
        referenceTime: 68,
        audio: { fast: q7_5fast, slow: q7_5slow },
      },
    ],
  },
  {
    id: "8",
    title: "The Price of Enough",
    audio: ThePrice,
    subtitles: [
      { startTime: 0.1, endTime: 2.8, text: "8. The Price of Enough" },
      {
        startTime: 4.2,
        endTime: 7,
        text: "People often ask, usually over a drink they’re not paying for,",
      },
      {
        startTime: 7.8,
        endTime: 10.2,
        text: "“How much can a logistics business make?” ",
      },
      {
        startTime: 10.9,
        endTime: 16,
        text: "I used to answer with spreadsheets—utilisation, fuel hedges, peak season yield. ",
      },
      {
        startTime: 17.5,
        endTime: 19.6,
        text: "Now I give them the number that matters to me: ",
      },
      {
        startTime: 20.1,
        endTime: 22,
        text: "enough to sleep well and say no",
      },
      {
        startTime: 22.1,
        endTime: 24.2,
        text: "when the price of yes is my integrity",
      },
      {
        startTime: 24.4,
        endTime: 26,
        text: "or my family’s patience.",
      },
      {
        startTime: 27,
        endTime: 30.2,
        text: "Make no mistake, there’s good money in moving things predictably ",
      },
      {
        startTime: 30.4,
        endTime: 32,
        text: "in an unpredictable world. ",
      },
      {
        startTime: 33.4,
        endTime: 36.2,
        text: "In a strong quarter, margins look like a polite nod; ",
      },
      {
        startTime: 36.8,
        endTime: 40,
        text: "in a great quarter, they look like a handshake you actually feel.",
      },
      {
        startTime: 41.2,
        endTime: 42.8,
        text: "But the curve has fangs.",
      },
      {
        startTime: 43.3,
        endTime: 47.7,
        text: "Every extra percentage point of growth invites another layer of fragility",
      },
      {
        startTime: 48,
        endTime: 53.5,
        text: "— more night calls, more brittle clients, more systems that behave until they don't.",
      },
      {
        startTime: 54.2,
        endTime: 56.5,
        text: "Profit arrives with a chorus of “what ifs.” ",
      },
      {
        startTime: 56.6,
        endTime: 60.4,
        text: "I keep a line in my notebook: “Wealth is unused options.” ",
      },
      {
        startTime: 61.6,
        endTime: 64.5,
        text: "Enough cash to buy time when something breaks, ",
      },
      {
        startTime: 64.7,
        endTime: 67,
        text: "enough goodwill to ask for grace, ",
      },
      {
        startTime: 67.4,
        endTime: 72,
        text: "enough discipline to pass on the flashy contract that pays today and bleeds tomorrow.",
      },
      {
        startTime: 72.8,
        endTime: 75.2,
        text: "I’ve chased numbers that looked like prizes ",
      },
      {
        startTime: 75.4,
        endTime: 76.8,
        text: "and found they were anchors. ",
      },
      {
        startTime: 77.5,
        endTime: 80.2,
        text: "These days, I measure by sturdiness: ",
      },
      {
        startTime: 80.8,
        endTime: 85,
        text: "months of payroll in the bank, the freedom to comp a client before they ask,",
      },
      {
        startTime: 86,
        endTime: 88,
        text: "the certainty that if a truck kisses a bollard, ",
      },
      {
        startTime: 88.3,
        endTime: 91,
        text: "my day isn’t ruined, only redirected. ",
      },
      {
        startTime: 92.2,
        endTime: 93.5,
        text: "Money’s the fuel.",
      },
      {
        startTime: 94,
        endTime: 96,
        text: "The journey is choosing where not to drive.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 4.1, label: "2", color: "red" },
      { time: 10.9, label: "3", color: "red" },
      { time: 17.3, label: "4", color: "red" },
      { time: 26.8, label: "5", color: "red" },
      { time: 33.3, label: "6", color: "red" },
      { time: 41, label: "7", color: "red" },
      { time: 54, label: "8", color: "red" },
      { time: 61, label: "9", color: "red" },
      { time: 72.7, label: "10", color: "red" },
      { time: 77, label: "11", color: "red" },
      { time: 92, label: "12", color: "red" },
    ],
    quiz: [
      {
        question:
          'How does Daniel now answer the question "How much can a logistics business make?',
        options: [
          "With the number that matters: enough to sleep well and say no when yes would cost his integrity or his family's patience",
          "With detailed spreadsheets covering utilisation, fuel hedges, and peak season yield",
          "By listing the revenue figures from his best trading year",
          "By explaining quarterly margins and year-on-year growth percentages",
        ],
        correctAnswer: 0,
        referenceTime: 8,
        audio: { fast: q8_1fast, slow: q8_1slow },
      },
      {
        question:
          "What does Daniel say happens with every extra percentage point of business growth?",
        options: [
          "The business becomes more stable and its cash flow more predictable",
          "It creates valuable new job opportunities across the team",
          "It invites another layer of fragility — more night calls, brittle clients, and systems that behave until they don't",
          "It directly improves the quality of long-term client relationships",
        ],
        correctAnswer: 2,
        referenceTime: 33,
        audio: { fast: q8_2fast, slow: q8_2slow },
      },
      {
        question: "What line does Daniel keep in his notebook about wealth?",
        options: [
          '"Wealth is unused options."',
          '"Wealth is consistent monthly revenue."',
          '"Wealth is the freedom to retire early."',
          '"Wealth is a spreadsheet that never lies."',
        ],
        correctAnswer: 0,
        referenceTime: 48,
        audio: { fast: q8_3fast, slow: q8_3slow },
      },
      {
        question:
          "How does Daniel measure his company's financial health these days?",
        options: [
          "By quarterly profit margins and year-on-year revenue growth",
          "By the total number of active client contracts",
          "By sturdiness: months of payroll in the bank, freedom to comp a client before they ask, and certainty that one bad day won't ruin everything",
          "By comparing his performance against industry benchmarks",
        ],
        correctAnswer: 2,
        referenceTime: 60,
        audio: { fast: q8_4fast, slow: q8_4slow },
      },
      {
        question:
          "What is Daniel's closing metaphor about money in this story?",
        options: [
          '"Money is the destination. Drive as fast as you can."',
          '"Money is a scoreboard. Always aim for the highest number."',
          '"Money\'s the fuel. The journey is choosing where not to drive."',
          '"Money is a tool. Use it wisely or lose it quickly."',
        ],
        correctAnswer: 2,
        referenceTime: 88,
        audio: { fast: q8_5fast, slow: q8_5slow },
      },
    ],
  },
  {
    id: "9",
    title: "Family on the Manifest, Part I - The Itinerary That Blinked",
    audio: FamilyOnTheManifest1,
    subtitles: [
      {
        startTime: 0.1,
        endTime: 6,
        text: "9. Family on the Manifest, Part I - The Itinerary That Blinked",
      },
      {
        startTime: 7.4,
        endTime: 9.4,
        text: "When you mix business travel with family,",
      },
      {
        startTime: 9.9,
        endTime: 13.3,
        text: "you’re effectively flying three cargoes with one airway bill: ",
      },
      {
        startTime: 14,
        endTime: 17,
        text: "the meeting, the marriage, and the memories. ",
      },
      {
        startTime: 18.2,
        endTime: 22.1,
        text: "We tried it last spring, folding a client tour of northern Spain",
      },
      {
        startTime: 22.2,
        endTime: 25,
        text: "into a family trip — Bilbao to San Sebastián, ",
      },
      {
        startTime: 25.5,
        endTime: 29.5,
        text: "with a detour to a cold-chain facility outside Vitoria-Gasteiz. ",
      },
      {
        startTime: 30.7,
        endTime: 34.2,
        text: "My wife, Sandra, packed optimism and sensible shoes. ",
      },
      {
        startTime: 34.7,
        endTime: 37.4,
        text: "My daughter packed questions and headphones. ",
      },
      {
        startTime: 38,
        endTime: 40.4,
        text: "My three-year-old son packed chaos. ",
      },
      {
        startTime: 41,
        endTime: 44.3,
        text: "The dog, Terry, stayed home, plotting revenge.",
      },
      {
        startTime: 45.2,
        endTime: 48.5,
        text: "I told myself it would be simple: morning site visits, ",
      },
      {
        startTime: 48.9,
        endTime: 52,
        text: "afternoon pintxos, evenings by the sea. ",
      },
      {
        startTime: 53.5,
        endTime: 55.5,
        text: "The first trouble arrived at Heathrow",
      },
      {
        startTime: 55.7,
        endTime: 58.6,
        text: "—one of our pallets to a different client missed a handover, ",
      },
      {
        startTime: 59.2,
        endTime: 61.4,
        text: "and the alert chimed as we queued for security. ",
      },
      {
        startTime: 62.7,
        endTime: 65.5,
        text: "I looked at my family and made a rule aloud: ",
      },
      {
        startTime: 66,
        endTime: 68.6,
        text: "'We don't let the business colonise the trip.",
      },
      {
        startTime: 69.7,
        endTime: 72.4,
        text: "Thirty minutes to resolve, then it waits.' ",
      },
      {
        startTime: 73,
        endTime: 77.4,
        text: "I took the call, authorised a lateral swap from our Basildon depot,",
      },
      {
        startTime: 77.7,
        endTime: 81,
        text: "and put the phone away like it weighed more than my carry-on.",
      },
      {
        startTime: 82,
        endTime: 85,
        text: "Bilbao welcomed us with the smell of rain on stone. ",
      },
      {
        startTime: 86,
        endTime: 90,
        text: "The client dinner was generous, the bodega louder than the forecast. ",
      },
      {
        startTime: 90.8,
        endTime: 95.2,
        text: "My daughter surprised me by asking the head of operations about retention schemes; ",
      },
      {
        startTime: 96,
        endTime: 98.4,
        text: "she has absorbed more of my life than she admits. ",
      },
      {
        startTime: 99.8,
        endTime: 102,
        text: "Back at the hotel, I wrote three lines: ",
      },
      {
        startTime: 102.6,
        endTime: 109,
        text: "'Keep mornings sacred. Declare a boundary before the boundary declares you. ",
      },
      {
        startTime: 110,
        endTime: 112,
        text: "Pack spare patience.' ",
      },
      {
        startTime: 113.2,
        endTime: 118,
        text: "Everything seemed quite calm and it looked to me as if I finally could relax for a while. ",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 7.3, label: "2", color: "red" },
      { time: 18, label: "3", color: "red" },
      { time: 30.6, label: "4", color: "red" },
      { time: 44.9, label: "5", color: "red" },
      { time: 53.4, label: "6", color: "red" },
      { time: 62, label: "7", color: "red" },
      { time: 69.3, label: "8", color: "red" },
      { time: 81.8, label: "9", color: "red" },
      { time: 99.6, label: "10", color: "red" },
      { time: 113, label: "11", color: "red" },
    ],
    quiz: [
      {
        question:
          "How does Daniel describe mixing business travel with family at the start of this story?",
        options: [
          "As a well-organised adventure that always works out smoothly",
          "As flying three cargoes with one airway bill: the meeting, the marriage, and the memories",
          "As a necessary sacrifice families must make to support entrepreneurs",
          "As a test of whether work and family life can ever truly be separated",
        ],
        correctAnswer: 1,
        referenceTime: 5,
        audio: { fast: q9_1fast, slow: q9_1slow },
      },
      {
        question:
          "Where did the family trip to Spain take them, and what was the business purpose?",
        options: [
          "Madrid, to attend a major European trade conference",
          "Bilbao to San Sebastián, with a detour to a cold-chain facility outside Vitoria-Gasteiz",
          "Barcelona, to visit the headquarters of a key client",
          "Seville, to inspect a prospective new distribution partner",
        ],
        correctAnswer: 1,
        referenceTime: 15,
        audio: { fast: q9_2fast, slow: q9_2slow },
      },
      {
        question:
          "What problem arose at Heathrow, and how did Daniel handle it?",
        options: [
          "A pallet missed a handover; he gave himself thirty minutes to resolve it, then put the phone away",
          "His passport was out of date; he had to rebook on a later flight",
          "A client called to cancel the Spain tour; he renegotiated from the departure lounge",
          "His carry-on was overweight; he repacked everything at the check-in desk",
        ],
        correctAnswer: 0,
        referenceTime: 35,
        audio: { fast: q9_3fast, slow: q9_3slow },
      },
      {
        question:
          "What rule did Daniel announce aloud to his family at the airport?",
        options: [
          '"Family trips always come first — the business can wait a full week."',
          '"We don\'t let the business colonise the trip. Thirty minutes to resolve, then it waits."',
          '"Everyone is allowed one business call per day during the holiday."',
          '"If the business calls more than twice, the trip ends — no exceptions."',
        ],
        correctAnswer: 1,
        referenceTime: 40,
        audio: { fast: q9_4fast, slow: q9_4slow },
      },
      {
        question:
          "What did Daniel's daughter do at the client dinner in Bilbao that surprised him?",
        options: [
          "She gave an impromptu speech about her father's company",
          "She asked the head of operations about employee retention schemes",
          "She refused to attend and stayed at the hotel instead",
          "She acted as an informal translator for the Spanish clients",
        ],
        correctAnswer: 1,
        referenceTime: 70,
        audio: { fast: q9_5fast, slow: q9_5slow },
      },
    ],
  },
  {
    id: "10",
    title: "Family on the Manifest, Part II - The Break that tested the break.",
    audio: FamilyOnTheManifest2,
    subtitles: [
      {
        startTime: 0.1,
        endTime: 6.8,
        text: "10. Family on the Manifest, Part II - The Break that tested the break.",
      },
      { startTime: 8, endTime: 10, text: "San Sebastián was the promise" },
      {
        startTime: 10.5,
        endTime: 14.8,
        text: "— the rest day I’d sold to my family as the dessert after the vegetables.",
      },
      {
        startTime: 15.6,
        endTime: 20.4,
        text: "We’d earned it: the site tour went clean, the presentations landed,",
      },
      {
        startTime: 21,
        endTime: 25,
        text: "and I’d managed to keep my phone in airplane mode for whole hours at a time.",
      },
      {
        startTime: 26.6,
        endTime: 30.2,
        text: "We rented bikes, chased the curve of La Concha, ",
      },
      {
        startTime: 31,
        endTime: 34.4,
        text: "and argued pleasantly about where the best tortilla lived.",
      },
      {
        startTime: 35.4,
        endTime: 38.2,
        text: "For a few hours, I thought I’d perfected the blend:",
      },
      {
        startTime: 39,
        endTime: 43,
        text: "attentive father, present husband, competent owner.",
      },
      {
        startTime: 44.9,
        endTime: 47.5,
        text: "Then the sea changed its mind.",
      },
      {
        startTime: 49,
        endTime: 54,
        text: "A freak squall rolled in, the sort that turns postcards into warnings. ",
      },
      {
        startTime: 54.9,
        endTime: 59.7,
        text: "We ducked into a café just as my pocket buzzed like a trapped wasp",
      },
      {
        startTime: 60.5,
        endTime: 63.8,
        text: "— on the phone was a problem of our refrigerated shipment ",
      },
      {
        startTime: 63.9,
        endTime: 67,
        text: "on a different lane that had thrown a temperature alarm.",
      },
      {
        startTime: 68.1,
        endTime: 72,
        text: "The timestamp said we were two hours from the point of no return. ",
      },
      {
        startTime: 73.8,
        endTime: 78.1,
        text: "My son clutched a wooden toy boat and asked if the storm would drown it. ",
      },
      {
        startTime: 79,
        endTime: 83,
        text: "My wife looked at me like a mirror: what will you choose? ",
      },
      {
        startTime: 84,
        endTime: 88.3,
        text: "And really, there was my family - and the business problems once again, ",
      },
      {
        startTime: 89.4,
        endTime: 91,
        text: "and I had to choose.",
      },
      {
        startTime: 92.2,
        endTime: 94.5,
        text: "I asked for ten minutes. ",
      },
      {
        startTime: 95.2,
        endTime: 100.2,
        text: "I stepped into the vestibule, called the dispatcher, and ran a tight play:",
      },
      {
        startTime: 101.4,
        endTime: 106,
        text: "reroute to a closer dock, swap trailers and approve overtime with hazard pay.",
      },
      {
        startTime: 107.5,
        endTime: 112,
        text: "We added a seal check via video—trust but verify.",
      },
      {
        startTime: 113,
        endTime: 114.4,
        text: "Then I did the harder thing: ",
      },
      {
        startTime: 115.5,
        endTime: 119.7,
        text: "I texted the client before they noticed, owned the variance, ",
      },
      {
        startTime: 120.2,
        endTime: 123,
        text: "and sent the fix and the timestamps to prove it. ",
      },
      {
        startTime: 124.5,
        endTime: 128,
        text: "It cost us margin. It bought us trust.",
      },
      {
        startTime: 129.8,
        endTime: 133.6,
        text: "When I returned, the storm had softened to useful rain. ",
      },
      {
        startTime: 134.7,
        endTime: 137,
        text: "My daughter slid a plate across the table. ",
      },
      {
        startTime: 138.2,
        endTime: 143,
        text: "“You made it about us first...” - she said, almost grudgingly. ",
      },
      {
        startTime: 144.3,
        endTime: 149,
        text: "My son sailed his toy boat through a ring of water and declared victory.",
      },
      {
        startTime: 150.6,
        endTime: 153.2,
        text: "I felt the tightness in my chest unwind.",
      },
      {
        startTime: 154.5,
        endTime: 159,
        text: "Later, walking the wet promenade, I wrote another line: ",
      },
      {
        startTime: 160,
        endTime: 165,
        text: "“Boundaries aren’t walls; they’re promises with timestamps.”",
      },
      {
        startTime: 166,
        endTime: 170.2,
        text: "The business lived, the family day survived",
      },
      {
        startTime: 171,
        endTime: 174.8,
        text: "and I learned the trick isn’t balance — balance is static. ",
      },
      {
        startTime: 176,
        endTime: 177.7,
        text: "The trick is cadence: ",
      },
      {
        startTime: 178,
        endTime: 185,
        text: "honest pauses, deliberate sprints, and the grace to let the tide decide the tempo.",
      },
      {
        startTime: 186.8,
        endTime: 193.8,
        text: "We returned back home and — that is when I tell you about the stories of my life! ",
      },
      {
        startTime: 195,
        endTime: 197,
        text: "Daniel Mercer, signing off.",
      },
    ],
    timeMarkers: [
      { time: 0, label: "1", color: "red" },
      { time: 7, label: "2", color: "red" },
      { time: 15.5, label: "3", color: "red" },
      { time: 26.5, label: "4", color: "red" },
      { time: 35, label: "5", color: "red" },
      { time: 44.7, label: "6", color: "red" },
      { time: 68, label: "7", color: "red" },
      { time: 73.7, label: "8", color: "red" },
      { time: 92, label: "9", color: "red" },
      { time: 107.4, label: "10", color: "red" },
      { time: 124, label: "11", color: "red" },
      { time: 129, label: "12", color: "red" },
      { time: 150, label: "13", color: "red" },
      { time: 166, label: "14", color: "red" },
      { time: 175, label: "15", color: "red" },
      { time: 186, label: "16", color: "red" },
    ],
    quiz: [
      {
        question:
          "What was San Sebastián meant to represent for Daniel and his family?",
        options: [
          "The final client meeting before heading back to London",
          "A shopping day Sandra had planned months in advance",
          "The rest day — the dessert after the vegetables, earned after completing all the work",
          "A city Daniel had always wanted to visit purely for personal reasons",
        ],
        correctAnswer: 2,
        referenceTime: 5,
        audio: { fast: q10_1fast, slow: q10_1slow },
      },
      {
        question:
          "What business crisis interrupted the family's rest day in San Sebastián?",
        options: [
          "A key client cancelled a major contract without any warning",
          "A refrigerated shipment threw a temperature alarm, leaving two hours before the point of no return",
          "One of Daniel's drivers was involved in an accident on a Spanish motorway",
          "The cold-chain facility they had just visited failed its safety inspection",
        ],
        correctAnswer: 1,
        referenceTime: 32,
        audio: { fast: q10_2fast, slow: q10_2slow },
      },
      {
        question:
          "What steps did Daniel take from the café vestibule to resolve the crisis?",
        options: [
          "He rerouted to a closer dock, swapped trailers, approved overtime with hazard pay, and added a video seal check",
          "He delegated everything to his operations manager and rejoined his family immediately",
          "He called the client to request a 24-hour delivery extension and offered a discount",
          "He instructed the driver to reduce speed to protect the temperature-sensitive cargo",
        ],
        correctAnswer: 0,
        referenceTime: 52,
        audio: { fast: q10_3fast, slow: q10_3slow },
      },
      {
        question:
          "What did Daniel do before the client had even noticed the problem?",
        options: [
          "He waited to see if the shipment would recover on its own",
          "He informed his insurance company and started a liability claim",
          "He texted the client, owned the variance, and sent the fix and timestamps as proof",
          "He asked his operations manager to draft a formal written apology",
        ],
        correctAnswer: 2,
        referenceTime: 65,
        audio: { fast: q10_4fast, slow: q10_4slow },
      },
      {
        question:
          "What line did Daniel write while walking the wet promenade that evening?",
        options: [
          '"Balance is the key to a successful business and family life."',
          '"Never mix business travel with family holidays again."',
          "\"Boundaries aren't walls; they're promises with timestamps.\"",
          '"The business must always come first, or neither side survives."',
        ],
        correctAnswer: 2,
        referenceTime: 92,
        audio: { fast: q10_5fast, slow: q10_5slow },
      },
    ],
  },
];

// ─── Vocabulary per track ─────────────────────────────────────────────────────
// Key = track id (matches AudioTrack.id)
export const trackVocabulary: Record<
  string,
  { word: string; definition: string }[]
> = {
  "1": [
    {
      word: "compound effort",
      definition:
        "the result of many small consistent actions building up over time",
    },
    {
      word: "structural advantages",
      definition:
        "long-term strengths built into the foundation of a business or system",
    },
    {
      word: "worst-case scenario",
      definition: "the most negative possible outcome of a situation",
    },
    {
      word: "invoices",
      definition: "official documents requesting payment for goods or services",
    },
    {
      word: "controllable",
      definition:
        "something that can be managed or influenced by your own actions",
    },
    {
      word: "calm was trained",
      definition:
        "a state of composure that was developed through experience, not natural temperament",
    },
  ],
  "2": [
    {
      word: "razor-thin margins",
      definition: "very small profit left after all costs are paid",
    },
    {
      word: "volatile",
      definition: "likely to change suddenly and unpredictably",
    },
    {
      word: "renegotiate",
      definition: "to discuss and change the terms of an existing agreement",
    },
    {
      word: "staggered delivery",
      definition:
        "deliveries spread out over different times rather than all at once",
    },
    {
      word: "claw back efficiency",
      definition:
        "to recover lost productivity or savings through careful reorganisation",
    },
    {
      word: "price for volatility",
      definition:
        "to set costs in a way that accounts for unexpected changes or risks",
    },
  ],
  "3": [
    {
      word: "optimization",
      definition:
        "the process of making something as effective or efficient as possible",
    },
    {
      word: "human coordination problem",
      definition:
        "a challenge that arises from people needing to work together effectively",
    },
    {
      word: "turnover",
      definition:
        "the rate at which employees leave and are replaced in a company",
    },
    {
      word: "interchangeable",
      definition:
        "able to be swapped with another without any difference in outcome",
    },
    {
      word: "upskilling",
      definition:
        "teaching workers new or improved skills to advance their abilities",
    },
    {
      word: "systems succeed at the speed of trust",
      definition:
        "the idea that operations only work as fast as people trust each other",
    },
  ],
  "4": [
    {
      word: "reefers",
      definition:
        "refrigerated trucks or containers used to transport temperature-sensitive goods",
    },
    {
      word: "temperature fluctuations",
      definition:
        "irregular rises and falls in temperature that can damage goods",
    },
    {
      word: "stable cold",
      definition:
        "a consistently maintained low temperature, as opposed to one that varies",
    },
    {
      word: "door-open events",
      definition:
        "moments when a refrigerated unit is opened, causing temperature change",
    },
    {
      word: "performance logs",
      definition:
        "written records showing how well equipment or operations have functioned",
    },
    {
      word: "humility budget",
      definition:
        "an intentional allowance for learning and making mistakes in a new area",
    },
  ],
  "5": [
    {
      word: "single-lane bridge",
      definition:
        "a narrow bridge that only allows one vehicle to pass at a time",
    },
    {
      word: "white-knuckled",
      definition: "gripping tightly out of fear or extreme tension",
    },
    {
      word: "staggered retreat",
      definition:
        "an organised withdrawal where people move back in a controlled sequence",
    },
    {
      word: "deadlock",
      definition:
        "a situation where no progress can be made because neither side will move",
    },
    {
      word: "hierarchy vs choreography",
      definition:
        "the contrast between using authority to command versus coordinating people through shared movement and signals",
    },
    {
      word: "hand signals",
      definition: "physical gestures used to communicate without words",
    },
  ],
  "6": [
    {
      word: "duplicate entries",
      definition:
        "identical records entered more than once into a system, causing errors",
    },
    {
      word: "Warehouse Management System",
      definition:
        "software used to control and track inventory and operations in a warehouse",
    },
    {
      word: "time-critical shipment",
      definition:
        "a delivery that must arrive by a strict deadline or serious consequences follow",
    },
    {
      word: "cannibalised sister depots",
      definition:
        "borrowed stock or resources from other company locations to cover a shortage",
    },
    {
      word: "hotshot",
      definition:
        "an urgent, expedited delivery arranged outside normal scheduling",
    },
    {
      word: "hard count required",
      definition:
        "a rule requiring a physical manual count of goods rather than relying on system data",
    },
  ],
  "7": [
    {
      word: "mismatched schedules",
      definition:
        "timetables that do not align, making coordination between people difficult",
    },
    {
      word: "volatile compound",
      definition:
        "a mixture of elements that can react unpredictably; used here as a metaphor for risk",
    },
    {
      word: "weaponize",
      definition: "to use something harmless as a tool for control or pressure",
    },
    {
      word: "calendar collisions",
      definition:
        "situations where two or more planned events conflict at the same time",
    },
    {
      word: "compound interest",
      definition:
        "growth that builds on itself over time; here used metaphorically for trust and calm",
    },
    {
      word: "red day",
      definition:
        "a day flagged in advance as high-pressure, during which availability will be limited",
    },
  ],
  "8": [
    {
      word: "utilisation",
      definition:
        "the degree to which a resource, vehicle, or capacity is being used",
    },
    {
      word: "fuel hedges",
      definition:
        "financial agreements made in advance to protect against rising fuel costs",
    },
    {
      word: "peak season yield",
      definition:
        "the maximum income generated during the busiest period of the business year",
    },
    {
      word: "fragility",
      definition:
        "the tendency to break down or fail under pressure or unexpected events",
    },
    {
      word: "unused options",
      definition:
        "available choices or resources kept in reserve; here used as a definition of wealth",
    },
    {
      word: "integrity",
      definition:
        "the quality of being honest and having strong moral principles",
    },
  ],
  "9": [
    {
      word: "airway bill",
      definition: "a shipping document used for goods transported by air",
    },
    {
      word: "cold-chain facility",
      definition:
        "a warehouse or depot that maintains a controlled temperature for perishable goods",
    },
    {
      word: "lateral swap",
      definition:
        "replacing a missing item with an equivalent one from a parallel source or location",
    },
    {
      word: "colonise the trip",
      definition:
        "to allow work to take over and dominate time intended for personal or family use",
    },
    {
      word: "retention schemes",
      definition:
        "programmes designed to encourage employees to stay with a company long-term",
    },
    {
      word: "pintxos",
      definition:
        "small snacks or appetisers typical of Basque cuisine in northern Spain",
    },
  ],
  "10": [
    {
      word: "point of no return",
      definition:
        "the moment after which a decision or situation can no longer be reversed",
    },
    {
      word: "temperature alarm",
      definition:
        "an automated alert triggered when a refrigerated unit moves outside its safe range",
    },
    {
      word: "reroute",
      definition:
        "to change the planned path or destination of a delivery or vehicle",
    },
    {
      word: "hazard pay",
      definition:
        "additional wages given to workers for doing risky or difficult work",
    },
    {
      word: "trust but verify",
      definition:
        "a principle meaning you rely on someone's word but still confirm the outcome independently",
    },
    {
      word: "boundaries aren't walls",
      definition:
        "the idea that personal limits are flexible agreements, not rigid barriers",
    },
  ],
};
