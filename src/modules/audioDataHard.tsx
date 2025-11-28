// Hard level Audios
import Introducing from "../assets/3. Daniel/1. Introducing Myself.mp3";
import TheDeal from "../assets/3. Daniel/2. The deal that nearly broke me..mp3";
import Conference from "../assets/3. Daniel/3. The Conference in Munich.mp3";
import AFailure from "../assets/3. Daniel/4. A Failure with a Silver Lining.mp3";
import TheBridge from "../assets/3. Daniel/5. The Bridge at Low Tide.mp3";
import Night from "../assets/3. Daniel/6. Night of the Phantom Pallets.mp3";
import FamilyReport from "../assets/3. Daniel/7. Family Weather Report.mp3";
import ThePrice from "../assets/3. Daniel/8. The Price of Enough.mp3";
import FamilyOnTheManifest1 from "../assets/3. Daniel/9. Family on the Manifest, Part I The Itinerary That Blinked..mp3";
import FamilyOnTheManifest2 from "../assets/3. Daniel/10. Family on the Manifest, Part II The Break That Tested the Break..mp3";

import { AudioTrack } from "../types";

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
    "quiz": [
      {
        "question": "What does Daniel Mercer compare his business philosophy of 'compound effort' to, regarding its effect over time?",
        "options": [
          "A building slowly decaying.",
          "A quick lottery win.",
          "A sudden technological breakthrough.",
          "Small, consistent improvements becoming structural advantages."
        ],
        "correctAnswer": 3,
        "referenceTime": 37.5
      },
      {
        "question": "Daniel mentions that the 'rhythm' of his hometown, where 'ships left at dawn and returned with the tide,' taught him a crucial lesson. What was that lesson?",
        "options": [
          "The importance of early mornings for productivity.",
          "The unpredictability of the sea.",
          "That timing is critical, and missing it means waiting.",
          "The value of traditional fishing methods."
        ],
        "correctAnswer": 2,
        "referenceTime": 27.0
      },
      {
        "question": "When faced with a problem, Daniel describes a specific three-step process he uses. What are these steps?",
        "options": [
          "Ignoring it, hoping it resolves itself, and delegating it.",
          "Complaining about it, blaming others, and seeking external help.",
          "Writing it down, naming the worst-case scenario, and designing three exits.",
          "Panicking, calling for advice, and making impulsive decisions."
        ],
        "correctAnswer": 2,
        "referenceTime": 81.5
      },
      {
        "question": "What does Daniel imply about his calm demeanor?",
        "options": [
          "He was born with a naturally calm personality.",
          "It is a result of extensive meditation and yoga.",
          "It is a learned trait developed through navigating difficult situations.",
          "He uses medication to maintain his composure."
        ],
        "correctAnswer": 2,
        "referenceTime": 68.4
      },
      {
        "question": "What is the overarching theme Daniel identifies for his life and business philosophy?",
        "options": [
          "Always seek external validation and approval.",
          "Take unnecessary risks and hope for the best.",
          "Control the controllable, honor promises, and let time compound the rest.",
          "Prioritize personal comfort over professional growth."
        ],
        "correctAnswer": 2,
        "referenceTime": 95.0
      }
    ]
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
    "quiz": [
      {
        "question": "What was Daniel's initial pricing strategy for his first significant contract, and why did he choose it?",
        "options": [
          "He priced it high to maximize immediate profit, expecting quick returns.",
          "He priced it at market average to attract new clients, hoping for referrals.",
          "He priced it 'lean' with 'razor-thin margins,' banking on high volume to compensate.",
          "He offered it for free as a promotional offer to establish his company."
        ],
        "correctAnswer": 2,
        "referenceTime": 10.3
      },
      {
        "question": "Which of the following was NOT one of the immediate problems Daniel faced after signing the contract?",
        "options": [
          "Diesel prices suddenly increased.",
          "A key employee resigned mid-week.",
          "His main delivery truck broke down irreparably.",
          "Two pallets of medical equipment were damaged due to a leaky warehouse roof."
        ],
        "correctAnswer": 2,
        "referenceTime": 20.1
      },
      {
        "question": "Instead of asking for a higher fee, what did Daniel request from his client when problems arose?",
        "options": [
          "A full cancellation of the contract without penalty.",
          "Financial compensation for his losses.",
          "Increased advertising for his services.",
          "Schedule flexibility, specifically 'staggered delivery windows.'"
        ],
        "correctAnswer": 3,
        "referenceTime": 46.3
      },
      {
        "question": "Daniel states, 'transparency is an asset, but only if paired with a plan.' What does he mean by this?",
        "options": [
          "It's always better to be honest, regardless of the consequences.",
          "Being open about problems is only valuable if you also propose solutions.",
          "Transparency helps in hiding underlying issues from clients.",
          "Having a plan means you don't need to be transparent."
        ],
        "correctAnswer": 1,
        "referenceTime": 56.6
      },
      {
        "question": "What rule did Daniel write in his notebook after the challenging contract experience?",
        "options": [
          "\"Always aim for the highest profit margins.\"",
          "\"Never trust new clients.\"",
          "\"Price for volatility. If luck goes bad, can you survive?\"",
          "\"Avoid all risks in business.\""
        ],
        "correctAnswer": 2,
        "referenceTime": 80.0
      }
    ]
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
    "quiz": [
      {
        "question": "Daniel states he went to the Munich conference to 'network,' but reveals a deeper, more pressing reason. What was this underlying motivation?",
        "options": [
          "To find new investors for his company.",
          "To escape his family life for a few days.",
          "To gain ideas that would help stabilize his struggling company and prevent 'the wheels from wobbling.'",
          "To experience the culture of Munich and enjoy German beer."
        ],
        "correctAnswer": 2,
        "referenceTime": 21.1
      },
      {
        "question": "What was the key insight Daniel gained from the keynote speaker regarding optimization in logistics?",
        "options": [
          "Optimization is purely a mathematical problem solved by complex algorithms.",
          "Optimization is primarily about reducing costs by cutting corners.",
          "Optimization is fundamentally 'a human coordination problem disguised by numbers.'",
          "Optimization depends entirely on having the latest software."
        ],
        "correctAnswer": 2,
        "referenceTime": 38.2
      },
      {
        "question": "The keynote speaker used a vivid analogy to describe Daniel's company's situation with high employee turnover. What was it?",
        "options": [
          "\"Trying to fill a bucket with a hole in it.\"",
          "\"Building a castle on sand.\"",
          "\"You’re pouring fine wine into paper cups.\"",
          "\"Running a race with your shoelaces untied.\""
        ],
        "correctAnswer": 2,
        "referenceTime": 64.0
      },
      {
        "question": "Which of the following was NOT part of Daniel's six-month plan to address his company's issues after the conference?",
        "options": [
          "Reducing baseline wages to cut costs.",
          "Funding commercial-driver upskilling.",
          "Requiring managers to run a route day each month.",
          "Building a path from loader to dispatcher."
        ],
        "correctAnswer": 0,
        "referenceTime": 86.7
      },
      {
        "question": "After implementing his new strategy, what did Daniel come to realize about his drivers?",
        "options": [
          "They were easily replaceable and interchangeable.",
          "They were primarily concerned with their hourly pay.",
          "They were 'relationship holders — trust on wheels,' essential for client satisfaction.",
          "They were simply cogs in a larger logistical machine."
        ],
        "correctAnswer": 2,
        "referenceTime": 132.2
      },
      {
        "question": "What is the ultimate lesson or 'compass' that Munich provided Daniel, according to him?",
        "options": [
          "That international conferences are a waste of time and money.",
          "That mathematical models are always superior to human intuition.",
          "That 'systems succeed at the speed of trust.'",
          "That the best way to optimize is to cut costs aggressively."
        ],
        "correctAnswer": 2,
        "referenceTime": 145.5
      }
    ]
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
    "quiz": [
      {
        "question": "What new venture did the company attempt to expand into, which initially failed?",
        "options": [
          "Dry goods transport",
          "Overseas shipping",
          "Refrigerated transport",
          "Passenger transport"
        ],
        "correctAnswer": 2,
        "referenceTime": 8.9
      },
      {
        "question": "What product was spoiled due to temperature fluctuations in the first failed shipment?",
        "options": [
          "Fresh produce",
          "Artisan cheeses",
          "Frozen meats",
          "Pharmaceuticals"
        ],
        "correctAnswer": 1,
        "referenceTime": 36.5
      },
      {
        "question": "When the speaker initially failed, what excuse did he give to the client for the spoiled shipment?",
        "options": [
          "Mechanical failure of the reefers",
          "A driver error",
          "Bad road conditions",
          "A supplier issue"
        ],
        "correctAnswer": 2,
        "referenceTime": 49.2
      },
      {
        "question": "What was Eliza's unexpected response when she called the speaker after the failure?",
        "options": [
          "She demanded immediate compensation and threatened legal action.",
          "She offered to teach him the craft if he was honest.",
          "She cancelled all future contracts with his company.",
          "She expressed extreme anger and frustration."
        ],
        "correctAnswer": 1,
        "referenceTime": 64.0
      },
      {
        "question": "According to the speaker, when does failure become instructive?",
        "options": [
          "When you simply incur financial losses.",
          "When you learn from someone else's mistakes.",
          "When you pay its tuition in attention, not just money.",
          "Failure is never truly instructive."
        ],
        "correctAnswer": 2,
        "referenceTime": 109.0
      }
    ]
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
    "quiz": [
      {
        "question": "Where is the single-lane stone bridge located that the speaker describes?",
        "options": [
          "Near London",
          "In Manchester",
          "On the north road out of Southampton",
          "In Bristol"
        ],
        "correctAnswer": 2,
        "referenceTime": 8.9
      },
      {
        "question": "What type of vehicle was wedged on the bridge, blocking traffic?",
        "options": [
          "A passenger car",
          "A flatbed truck",
          "A removal lorry",
          "A delivery van"
        ],
        "correctAnswer": 2,
        "referenceTime": 25.7
      },
      {
        "question": "What was the speaker's initial, 'younger self' reaction to the traffic deadlock?",
        "options": [
          "To calmly assess the situation.",
          "To honk and fume, creating 'heat without light.'",
          "To call the police immediately.",
          "To try and force his way through."
        ],
        "correctAnswer": 1,
        "referenceTime": 50.5
      },
      {
        "question": "What did the speaker do, following his father's teaching, to resolve the deadlock?",
        "options": [
          "He waited patiently for others to resolve it.",
          "He used his authority to direct traffic.",
          "He stepped into the gap and 'named the rules,' orchestrating a retreat.",
          "He found an alternate route."
        ],
        "correctAnswer": 2,
        "referenceTime": 60.0
      },
      {
        "question": "What lesson did the speaker write in his notebook after this experience?",
        "options": [
          "Traffic jams are unavoidable.",
          "Hierarchy is always key in resolving conflicts.",
          "In deadlocks, hierarchy is less useful than choreography.",
          "Always take the longest route to avoid problems."
        ],
        "correctAnswer": 2,
        "referenceTime": 88.4
      }
    ]
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
    "quiz": [
      {
        "question": "What caused the initial 'logistic nightmare' involving five non-existent pallets?",
        "options": [
          "A shipping container went missing.",
          "A customs broker's typo and a warehouse scanner 'hiccup'.",
          "An inventory theft.",
          "A natural disaster."
        ],
        "correctAnswer": 1,
        "referenceTime": 33.6
      },
      {
        "question": "At what time of day was the mismatch discovered?",
        "options": [
          "Early morning",
          "Mid-afternoon",
          "Late evening",
          "Deep at night (1:12 a.m.)"
        ],
        "correctAnswer": 3,
        "referenceTime": 63.1
      },
      {
        "question": "How did the speaker's team address the problem of the missing physical stock for the time-critical shipment?",
        "options": [
          "They informed the client they couldn't fulfill the order.",
          "They waited for the original pallets to appear.",
          "They 'cannibalised' sister depots and paid for a dawn hotshot.",
          "They manufactured new pallets themselves."
        ],
        "correctAnswer": 2,
        "referenceTime": 91.0
      },
      {
        "question": "Which of the following was NOT a corrective action taken after the 'phantom pallets' incident?",
        "options": [
          "Retired the problematic scanner model.",
          "Added a 'hard count required' rule for exceptions.",
          "Hired more customs brokers.",
          "Rewrote their Service Level Agreement to include honesty under pressure."
        ],
        "correctAnswer": 2,
        "referenceTime": 107.2
      },
      {
        "question": "What was the key lesson learned from the 'Night of the Phantom Pallets' incident?",
        "options": [
          "Single points of failure are rare.",
          "Recovery from system failures requires individual effort.",
          "Systems fail in plural; recovery requires a choir, not a solo.",
          "It's best to hide system errors from clients."
        ],
        "correctAnswer": 2,
        "referenceTime": 120.5
      }
    ]
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
        endTime: 102 ,
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
    "quiz": [
      {
        "question": "How many children does the speaker have?",
        "options": [
          "One daughter",
          "One son",
          "A daughter and a son",
          "Two daughters"
        ],
        "correctAnswer": 2,
        "referenceTime": 6.0
      },
      {
        "question": "Where does the speaker's wife, Sandra, work?",
        "options": [
          "At a school",
          "In the clinic",
          "At a bank",
          "At a restaurant"
        ],
        "correctAnswer": 1,
        "referenceTime": 26.8
      },
      {
        "question": "What do they discuss during their Sunday council at the kitchen table?",
        "options": [
          "Sports results",
          "Calendar collisions, grocery logistics, and the dog's vendetta against the postman",
          "Political news",
          "Vacation plans"
        ],
        "correctAnswer": 1,
        "referenceTime": 45.3
      },
      {
        "question": "What does the speaker do when he declares a 'red day'?",
        "options": [
          "He goes on vacation",
          "He tells his family where he'll be scarce and when he'll be back",
          "He works from home",
          "He takes a day off"
        ],
        "correctAnswer": 1,
        "referenceTime": 76.2
      },
      {
        "question": "What does the speaker's son want regarding family presence at home?",
        "options": [
          "He wants to go out all the time",
          "He wants everybody to be at home all the time",
          "He wants to play alone",
          "He wants more toys"
        ],
        "correctAnswer": 1,
        "referenceTime": 92.5
      }
    ]
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
    "quiz": [
      {
        "question": "How does the speaker now answer the question 'How much can a logistics business make?'",
        "options": [
          "With spreadsheets",
          "Enough to sleep well and say no",
          "A lot of money",
          "It depends on the market"
        ],
        "correctAnswer": 1,
        "referenceTime": 20.1
      },
      {
        "question": "What does the speaker keep in his notebook as a definition of 'wealth'?",
        "options": [
          "'Wealth is power'",
          "'Wealth is unused options'",
          "'Wealth is endless growth'",
          "'Wealth is security'"
        ],
        "correctAnswer": 1,
        "referenceTime": 56.6
      },
      {
        "question": "What does the speaker measure by these days instead of just numbers?",
        "options": [
          "Profit margins",
          "Market share",
          "Sturdiness",
          "Employee satisfaction"
        ],
        "correctAnswer": 2,
        "referenceTime": 77.5
      },
      {
        "question": "According to the speaker, if a truck kisses a bollard, what happens to his day?",
        "options": [
          "It is ruined",
          "It is only redirected",
          "He gets angry",
          "He loses money"
        ],
        "correctAnswer": 1,
        "referenceTime": 88.3
      },
      {
        "question": "What analogy does the speaker use for money and the business journey?",
        "options": [
          "Money's the map, the journey is the destination",
          "Money's the engine, the journey is the speed",
          "Money's the fuel, the journey is choosing where not to drive",
          "Money's the compass, the journey is the direction"
        ],
        "correctAnswer": 2,
        "referenceTime": 92.2
      }
    ]
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
    "quiz": [
      {
        "question": "Where did the speaker's family trip take place, combining with a client tour?",
        "options": [
          "Southern France",
          "Northern Spain",
          "Italian Alps",
          "German Black Forest"
        ],
        "correctAnswer": 1,
        "referenceTime": 18.2
      },
      {
        "question": "Who packed 'chaos' for the trip?",
        "options": [
          "The speaker's wife",
          "The speaker's daughter",
          "The speaker's three-year-old son",
          "The dog, Terry"
        ],
        "correctAnswer": 2,
        "referenceTime": 38.0
      },
      {
        "question": "What was the first trouble that arrived at Heathrow airport?",
        "options": [
          "Lost passports",
          "A missed flight",
          "One of their pallets for a different client missed a handover",
          "Bad weather"
        ],
        "correctAnswer": 2,
        "referenceTime": 55.7
      },
      {
        "question": "What rule did the speaker make aloud to his family at the airport?",
        "options": [
          "'We don't let the business colonise the trip.'",
          "'We must always answer business calls.'",
          "'Family time is secondary to work.'",
          "'No phones allowed.'"
        ],
        "correctAnswer": 0,
        "referenceTime": 66.0
      },
      {
        "question": "What surprising question did the speaker's daughter ask the head of operations at the client dinner?",
        "options": [
          "About the local cuisine",
          "About retention schemes",
          "About the company's profits",
          "About vacation policies"
        ],
        "correctAnswer": 1,
        "referenceTime": 90.8
      }
    ]
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
    "quiz": [
      {
        "question": "What was San Sebastián promised as to the family?",
        "options": [
          "The main business location",
          "The dessert after the vegetables (a rest day)",
          "A challenging adventure",
          "A historical tour"
        ],
        "correctAnswer": 1,
        "referenceTime": 10.5
      },
      {
        "question": "What buzzed like a trapped wasp during the freak squall?",
        "options": [
          "A real wasp",
          "The speaker's pocket (phone)",
          "A car alarm",
          "A ship horn"
        ],
        "correctAnswer": 1,
        "referenceTime": 54.9
      },
      {
        "question": "What business problem arose during the squall?",
        "options": [
          "A client cancelled an order",
          "A refrigerated shipment had a temperature alarm",
          "A truck broke down",
          "A delivery was delayed"
        ],
        "correctAnswer": 1,
        "referenceTime": 60.5
      },
      {
        "question": "What did the speaker do first when addressing the business issue during his family time?",
        "options": [
          "He immediately returned to work",
          "He ignored the call",
          "He asked for ten minutes and stepped into the vestibule to call the dispatcher",
          "He told his family to wait"
        ],
        "correctAnswer": 2,
        "referenceTime": 92.2
      },
      {
        "question": "What was the final lesson the speaker wrote in his notebook about boundaries?",
        "options": [
          "'Boundaries are fences; they keep people out.'",
          "'Boundaries aren’t walls; they’re promises with timestamps.'",
          "'Boundaries are flexible and can be ignored.'",
          "'Boundaries are for others, not for me.'"
        ],
        "correctAnswer": 1,
        "referenceTime": 160.0
      }
    ]
  },
];
