// storyPreviewData.tsx
export interface StoryPreview {
  id: string;
  title: string;
  emoji: string;
  image: string;
  difficulty: string;
  duration: string;
  description: string;
  grammar: string[];
  topics: string[];
  tip: string;
}
 
const leo1 =  "../../../assets/leo/preview/preview1.png"
const leo2 =  "../../../assets/leo/preview/preview2.png"
const leo3 =  "../../../assets/leo/preview/preview3.png"
const leo4 =  "../../../assets/leo/preview/preview4.png"
const leo5 =  "../../../assets/leo/preview/preview5.png"
const leo6 =  "../../../assets/leo/preview/preview6.png"
const leo7 =  "../../../assets/leo/preview/preview7.png"
const leo8 =  "../../../assets/leo/preview/preview8.png"
const leo9 =  "../../../assets/leo/preview/preview9.png"
const leo10 = "../../../assets/leo/preview/preview10.png"

// import { getOptimizedImageUrl } from "./imageUrl.ts";

export const storyPreviewData: Record<string, StoryPreview> = {
  "easy-1": {
    id: "1",
    title: "Leo's Life",
    emoji: "🧑",
    image: leo1,
    difficulty: "Easy",
    duration: "~48 sec",
    description:
      "Meet Leo — a cheerful 26-year-old who lives in a small flat with his cat in the town of Neverland. This story introduces his daily life, job, and personality.",
    grammar: [
      "Present Simple (he lives, he works)",
      "Third-person -s (he enjoys, he likes)",
      "Adjectives (friendly, kind, happy)",
      "Adverbs of frequency (always, every)",
    ],
    topics: ["Daily life", "Jobs", "Hobbies", "Personality"],
    tip: "Listen for how Leo describes his daily routine and the things he enjoys.",
  },

  "easy-2": {
    id: "2",
    title: "Leo's Mornings",
    emoji: "☀️",
    image: leo2,
    difficulty: "Easy",
    duration: "~75 sec",
    description:
      "Follow Leo through his peaceful morning routine — from waking up at a certain time to feeding Ginger and heading to work. But one Monday, everything goes wrong and the day turns into a disaster.",
    grammar: [
      "Present Simple for routines (he wakes up, he feeds)",
      "Sequence adverbs (first, then, after that)",
      "Past Simple for one-off events (he woke up late, he forgot)",
      "Negative Past Simple (didn't have, didn't wear)",
    ],
    topics: ["Morning routines", "Daily habits", "Unexpected events"],
    tip: "Pay attention to the order of events in Leo's morning and notice what goes differently on the bad day.",
  },

  "easy-3": {
    id: "3",
    title: "Leo's Favorite Food",
    emoji: "🍕",
    image: leo3,
    difficulty: "Easy",
    duration: "~55 sec",
    description:
      "Leo is a food lover! Find out what his favorite meals are, and why he thinks his mother is the best cook in the world.",
    grammar: [
      "Present Simple (he likes, she makes)",
      "Superlatives (the best cook)",
      "Present Continuous for ongoing habit (he is trying to eat healthily)",
      "Frequency expressions (every Sunday, sometimes)",
    ],
    topics: ["Food & cooking", "Family traditions", "Healthy eating"],
    tip: "Listen for all the different foods mentioned and notice which ones Leo makes himself versus which ones come from family.",
  },

  "easy-4": {
    id: "4",
    title: "Leo's Family",
    emoji: "👨‍👩‍👧‍👦",
    image: leo4,
    difficulty: "Easy",
    duration: "~76 sec",
    description:
      "Learn about the people closest to Leo — his mum, dad, and a sister. Discover what they do together and a little secret about Leo's personal life.",
    grammar: [
      "Present Simple for facts (his mother is a teacher)",
      "Frequency adverbs (every weekend, often)",
      "Present Continuous for current state (he is looking for a girlfriend)",
      "Contrast connector (but — she lives far, but they talk)",
    ],
    topics: ["Family members", "Jobs", "Relationships", "Free time activities"],
    tip: "Try to remember each family member's name and their job — there will be questions about them!",
  },

  "easy-5": {
    id: "5",
    title: "Leo's Clothes",
    emoji: "👕",
    image: leo5,
    difficulty: "Easy",
    duration: "~73 sec",
    description:
      "Leo isn't a fashion fan — he just wants to be comfortable! This story is all about what Leo wears.",
    grammar: [
      "Present Simple for habits (he wears, he likes)",
      "Negative Present Simple (he doesn't like, he isn't a person who…)",
      "Relative clause (a person who follows trends)",
      "Contrast connector (but — comfort is most important)",
    ],
    topics: ["Clothing & fashion", "Work uniforms", "Personal style"],
    tip: "Notice the difference between what Leo wears at home, at work, and in his free time.",
  },

  "easy-6": {
    id: "6",
    title: "A Day at the Beach",
    emoji: "🏖️",
    image: leo6,
    difficulty: "Easy",
    duration: "~78 sec",
    description:
      "Dive into one of Leo's most memorable childhood moments! When a family beach trip takes a dramatic turn involving a shark, young Leo discovers an unexpected talent.",
    grammar: [
      "Past Simple narrative (they went, he built, they saw)",
      "Past Simple negative (he couldn't swim before)",
      "Sequence in the past (suddenly, then, because of)",
      "Past Simple result clause (he was so scared that he…)",
    ],
    topics: ["Childhood memories", "Family trips", "Swimming", "Storytelling"],
    tip: "This is a story told in the past tense — listen carefully to the sequence of events and what happens because of the shark.",
  },

  "easy-7": {
    id: "7",
    title: "A Country Leo Wants to Visit",
    emoji: "🇮🇹",
    image: leo7,
    difficulty: "Easy",
    duration: "~74 sec",
    description:
      "Leo dreams of visiting Italy one day — the old buildings, gondolas, gelato, and of course, authentic pizza and pasta. He's even saving up for it. But ask him about France and it's a very different story…",
    grammar: [
      "Present Simple for opinions & wants (he wants, he loves)",
      "Present Continuous for future plan (he is saving money)",
      "Object relative clause (a country that Leo wants to visit)",
      "Contrast (but — he loves Italy vs. he hates France)",
    ],
    topics: ["Travel & tourism", "Dreams & goals", "Italian culture", "Money"],
    tip: "Listen for the reasons Leo wants to visit Italy and compare them with his strong feelings about France.",
  },

  "easy-8": {
    id: "8",
    title: "Leo's Hobbies",
    emoji: "⚽",
    image: leo8,
    difficulty: "Easy",
    duration: "~78 sec",
    description:
      "Leo is sporty and passionate! He plays football every evening, supports Manchester United with his dad, and unwinds with crime dramas like Breaking Bad.",
    grammar: [
      "Present Simple for regular activities (he goes, he plays)",
      "Present Continuous for current action (he is watching Breaking Bad)",
      "Possessive structures (his sister gifted him, his favorite team)",
      "Reason clause with 'because' (he says it helps him because…)",
    ],
    topics: ["Sports & hobbies", "Football", "TV shows", "Free time"],
    tip: "Listen for the two main hobbies mentioned and all the specific details Leo shares about each one.",
  },

  "easy-9": {
    id: "9",
    title: "Meeting a Friend",
    emoji: "☕",
    image: leo9,
    difficulty: "Easy",
    duration: "~71 sec",
    description:
      "Leo catches up with his old school friend Sam over coffee. They share laughs, old memories, and big plans — but the walk home brings Leo face to face with something unexpected and sad.",
    grammar: [
      "Past Simple for completed events (they met, they talked, they said goodbye)",
      "Past Simple reported speech (Leo told Sam about…, Sam said it was…)",
      "Future 'going to' (he is going to go to England)",
      "'Will' for emotional prediction (Leo will miss his friend)",
    ],
    topics: ["Friendship", "Catching up", "School memories", "Future plans"],
    tip: "Pay attention to what Sam is doing now and where he is going — and listen carefully to the very last line of the story.",
  },

  "easy-10": {
    id: "10",
    title: "The Lost Kitten",
    emoji: "🐱",
    image: leo10,
    difficulty: "Easy",
    duration: "~61 sec",
    description:
      "On his way home from meeting Sam, Leo hears a tiny meow and finds a lost kitten hiding under a car. His kindness leads to a heartwarming ending — and a new dream for Leo himself.",
    grammar: [
      "Past Simple narrative chain (he heard, he saw, he picked up, he took)",
      "Past Simple passive feel (it was all alone, it was very thin)",
      "Time expressions (the next day, a few days later)",
      "Present Simple for new state/result (now Leo wants to have his own cat)",
    ],
    topics: ["Animals & kindness", "Helping others", "Community", "Pets"],
    tip: "Notice all the steps Leo takes to help the kitten — and think about how this story connects back to what we know about Leo's character.",
  },

  // ─── MEDIUM ────────────────────────────────────────────────────────────────

  "medium-1": {
    id: "1",
    title: "Meet Maya!",
    emoji: "✈️",
    // Female journalist / New York City energy
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~42 sec",
    description:
      "Meet Maya — a curious journalist in her late twenties, based in New York City and working for an online magazine. She travels the world chasing stories, cultures, and the questions most people are afraid to ask.",
    grammar: [
      "Present Simple for facts and habits (I work, I travel, I live)",
      "Present Continuous for current situation (I'm working, I'm living)",
      "Adjectives describing personality (curious, passionate, expressive)",
      "Infinitive of purpose (to reflect, to write, to discover)",
    ],
    topics: ["Journalism", "Travel", "Personality", "New York City"],
    tip: "Listen for how Maya describes both her professional and personal character — she gives you a lot of clues about who she really is.",
  },

  "medium-2": {
    id: "2",
    title: "A Trip to Kyoto",
    emoji: "🏯",
    // Kyoto temple / torii gate scene
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~69 sec",
    description:
      "Maya heads to Kyoto on assignment and discovers ancient temples, the mysterious Gion district, and local shopkeepers eager to talk. But the most surprising part? A conversation about rising living costs — and a well-earned promotion.",
    grammar: [
      "Past Simple narrative (I spent, I learned, I gathered)",
      "Past Simple passive (I was captivated, I was surprised)",
      "Reported speech – Past Simple (they said that…)",
      "Result clause with 'so' (I got promoted after…)",
    ],
    topics: ["Japan", "Culture", "Cost of living", "Journalism", "Travel"],
    tip: "Pay attention to what Maya came to Kyoto to write about — and what she actually ended up writing about instead.",
  },

  "medium-3": {
    id: "3",
    title: "Trying Street Food in Bangkok",
    emoji: "🍜",
    // Bangkok street food market at night
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~81 sec",
    description:
      "Sent to Thailand to research street food culture, Maya dives headfirst into Bangkok's legendary culinary scene — from Pad Thai to fried insects. The nightlife dazzles her, but the aftermath teaches her an important lesson.",
    grammar: [
      "Past Simple for sequence of events (I tried, I got, I had)",
      "Past Simple negative (I didn't go there to sunbathe)",
      "Adverbs of manner (hesitantly, carefully)",
      "Contrast connector 'but' (I liked the food, but you need to be careful)",
    ],
    topics: ["Thailand", "Street food", "Culture", "Travel tips", "Health"],
    tip: "Notice the shift in Maya's attitude from the beginning of the story to the end — and listen for her practical advice to future travellers.",
  },

  "medium-4": {
    id: "4",
    title: "A Missed Connection",
    emoji: "🚆",
    // Train station / railway platform
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~80 sec",
    description:
      "On her very first international assignment, a young intern Maya misses her connecting train in Dresden after a delay. Stranded and unable to speak the local language, she finds a way to turn a stressful situation into an unexpected discovery.",
    grammar: [
      "Past Simple narrative chain (I missed, I felt, I found, I managed)",
      "Past Simple passive feel (I was stranded, I was delayed)",
      "Sequence adverbs in the past (while, although, in the end)",
      "Result clause (it led to me exploring…)",
    ],
    topics: ["Germany", "Travel problems", "Problem-solving", "Exploration"],
    tip: "Listen carefully to the sequence of events — what goes wrong, how Maya reacts, and what she gains from the experience.",
  },

  "medium-5": {
    id: "5",
    title: "Budgeting for Adventure",
    emoji: "💸",
    // Wallet / cash / budget planning on a map
    image: "https://images.unsplash.com/photo-1554774853-b415df9eeb92?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~81 sec",
    description:
      "Life as a travelling journalist isn't as glamorous as it sounds — at least not for your wallet. Maya shares her honest approach to managing money on the road, from hostels and local markets to travel apps and the temptation of pointless souvenirs.",
    grammar: [
      "Present Perfect for experience (I've become, I've noticed)",
      "Present Simple for habits and opinions (I create, I use, I look for)",
      "Gerund as subject or object (buying things, finding accommodation)",
      "Contrast connector 'although' (although it comes with risk…)",
    ],
    topics: ["Money & budgeting", "Travel tips", "Personal finance", "Habits"],
    tip: "Listen for all the specific strategies Maya uses to save money — and notice which one she admits she struggles with.",
  },

  "medium-6": {
    id: "6",
    title: "Discussing Environmental Concerns",
    emoji: "🌊",
    // Ocean pollution / coastal environment
    image: "https://images.unsplash.com/photo-1483683804023-6ccbe297ec3a?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~73 sec",
    description:
      "Maya travels to a small coastal village in Vietnam to report on environmental pollution. A conversation with a local fisherman reveals a troubling picture — declining fish stocks, plastic in the nets, and a water supply that is barely drinkable.",
    grammar: [
      "Past Simple for completed events (I visited, I had, I listened)",
      "Present Perfect for ongoing impact (has suffered, has risen)",
      "Reported speech – Past Simple (he spoke about, they stated that…)",
      "Passive voice (the water supply has suffered, measures have been taken)",
    ],
    topics: [
      "Environment",
      "Vietnam",
      "Pollution",
      "Journalism",
      "Local communities",
    ],
    tip: "Listen for the specific statistics Maya mentions — numbers are often the key detail in comprehension questions about this story.",
  },

  "medium-7": {
    id: "7",
    title: "An Unexpected Interview",
    emoji: "🧵",
    // Moroccan leather craft / tannery
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~84 sec",
    description:
      "In Morocco to cover local crafts, Maya ducks through a small door and stumbles into the workshop of an elderly leather craftsman. With no shared language and only a translation app and patience, she uncovers a story worth staying for.",
    grammar: [
      "Past Simple narrative (I saw, I went in, I tapped, I followed)",
      "Past Perfect for background context (I'd learned a long time ago…)",
      "Reported speech – indirect (he told me how his craft was passed down)",
      "Time expressions (hours flew by, when I finally looked…)",
    ],
    topics: [
      "Morocco",
      "Traditional crafts",
      "Communication",
      "Culture",
      "Journalism",
    ],
    tip: "Focus on how Maya communicates without a shared language — and listen for the details about what the craftsman taught her beyond just his trade.",
  },

  "medium-8": {
    id: "8",
    title: "Family Across Borders",
    emoji: "🌍",
    // Video call / family staying in touch across distance
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~83 sec",
    description:
      "Maya's family lives on three different continents — her parents in Canada, her brother in Germany, and her sister studying art in Italy. This story explores how they stay close despite the distance, and what family means to someone who never stops moving.",
    grammar: [
      "Present Simple for current facts (my brother is, my sister studies)",
      "Past Simple for specific memories (I remember once finishing…, we wandered)",
      "Gerund after verbs (staying connected, recording sounds)",
      "Contrast and addition connectors (but, and, between… and…)",
    ],
    topics: [
      "Family",
      "Living abroad",
      "Communication",
      "Relationships",
      "Identity",
    ],
    tip: "Listen for where each family member lives and what they do — and notice what Maya values most about her relationships with each of them.",
  },

  "medium-9": {
    id: "9",
    title: "The Mountain Festival – Part 1",
    emoji: "🏔️",
    // Peruvian highlands / Andean mountains
    image: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~82 sec",
    description:
      "Maya treks into the Peruvian highlands to document a rare ancient festival tied to harvests, weather, and ancestral memory. The journey is steep, the village is cautious, and the ritual is unlike anything she has witnessed before.",
    grammar: [
      "Past Simple narrative (I went, I reached, I spent, I wrote)",
      "Past Simple passive (costumes burst with color, faces were softened)",
      "Sequence and time expressions (at first, by sunset, when I finally)",
      "Relative clause (a ritual tied to weather, a language I didn't understand)",
    ],
    topics: [
      "Peru",
      "Indigenous culture",
      "Festivals",
      "Journalism",
      "Tradition",
    ],
    tip: "This is the first part of a two-part story — pay attention to how Maya earns the trust of the villagers, as it becomes important in Part 2.",
  },

  "medium-10": {
    id: "10",
    title: "The Mountain Festival – Part 2",
    emoji: "🌌",
    // Night sky / stars over mountains — ritual atmosphere
    image: "https://images.unsplash.com/photo-1464852045489-bccb7d17fe39?w=800&auto=format&fit=crop",
    difficulty: "Medium",
    duration: "~101 sec",
    description:
      "As the festival continues into the night, Maya witnesses ancient rituals, a rain-calling dance, and a quiet moment with an elder that changes how she sees her entire career. The most powerful journalism, she learns, is simply about bearing witness.",
    grammar: [
      "Past Simple extended narrative (I followed, I watched, I left, I realized)",
      "Past Simple passive (offerings were set, food was shared)",
      "Nominalization – abstract nouns (continuity, resilience, vulnerability)",
      "Reason clause with 'to' + infinitive (to witness how communities…)",
    ],
    topics: [
      "Peru",
      "Ritual & ceremony",
      "Reflection",
      "Journalism",
      "Human connection",
    ],
    tip: "This episode is the most reflective of the whole series — listen for the conclusion Maya draws at the very end, as it reveals her core motivation as a journalist.",
  },

  // ─── HARD ──────────────────────────────────────────────────────────────────

  "hard-1": {
    id: "1",
    title: "Introducing Myself",
    emoji: "🏢",
    // Confident businessman / office portrait
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~101 sec",
    description:
      "Meet Daniel Mercer — a 52-year-old English businessman who built a mid-sized logistics company from two laptops and a borrowed van. Calm, methodical, and shaped by a coastal upbringing, Daniel shares the philosophy that has carried him through fifteen years of hard decisions.",
    grammar: [
      "Present Simple for personal facts and philosophy (I run, I believe, I read)",
      "Past Simple for formative experience (I grew up, I've navigated, I learned)",
      "Passive-like constructions (calm was trained, not gifted)",
      "Infinitive of purpose (to respect timing, to design exits)",
    ],
    topics: ["Business", "Entrepreneurship", "Philosophy", "Personal values"],
    tip: "Daniel uses a lot of metaphors drawn from his seaside childhood — listen for how he connects the rhythm of tides to the rhythm of business decisions.",
  },

  "hard-2": {
    id: "2",
    title: "The Deal That Nearly Broke Me",
    emoji: "📦",
    // Warehouse / logistics / pallets
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~87 sec",
    description:
      "Daniel's first major contract looked like a breakthrough — until diesel prices spiked, a driver quit, and a leaky warehouse roof ruined two pallets in the same week. This is the story of how honesty, flexibility, and a notebook rule saved the deal — and the company.",
    grammar: [
      "Past Simple narrative chain (I priced, I called, I learned, I wrote)",
      "Past Simple passive (the roof had a leak, the contract was extended)",
      "Conditional logic without 'if' (price for volatility — if luck goes bad, can you survive?)",
      "Contrast connectors (but, unfortunately, instead)",
    ],
    topics: [
      "Business",
      "Crisis management",
      "Contracts",
      "Honesty",
      "Logistics",
    ],
    tip: "Pay close attention to the distinction Daniel draws between asking for schedule flexibility versus asking for more money — it's the core lesson of the whole story.",
  },

  "hard-3": {
    id: "3",
    title: "The Conference in Munich",
    emoji: "🇩🇪",
    // Munich / conference / beer hall
    image: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~163 sec",
    description:
      "At 48, Daniel flies to a logistics conference in Munich without much preparation — and gets far more than he bargained for. A single conversation with a keynote speaker dismantles his core belief about optimization and sends him home with a six-month plan that transforms his company.",
    grammar: [
      "Past Simple for events and turning points (I flew, I admitted, I sketched)",
      "Reported speech — indirect (he said that optimization is a human coordination problem)",
      "Complex noun phrases (commercial-driver upskilling, team error rates)",
      "Metaphorical language in business context (pouring fine wine into paper cups, trust on wheels)",
    ],
    topics: [
      "Leadership",
      "Business strategy",
      "Team management",
      "Germany",
      "Conferences",
    ],
    tip: "This is the longest story in the Hard series — listen for the specific six-step plan Daniel sketches in the beer hall. Each step builds on the speaker's core idea.",
  },

  "hard-4": {
    id: "4",
    title: "A Failure with a Silver Lining",
    emoji: "🧀",
    // Artisan cheese / refrigerated goods
    image: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~120 sec",
    description:
      "Daniel expands into refrigerated transport without fully understanding the craft — and a shipment of artisan cheeses pays the price. What follows is a story of embarrassment, a fierce vendor named Eliza, three weekends of shadow-learning, and an unlikely second chance.",
    grammar: [
      "Past Simple with narrative detail (I bought, I spent, I returned, I realized)",
      "Causative structure (had to pay, had to make, had to withstand)",
      "Conditional in the past (if the reefers would've been working)",
      "Noun + infinitive structure (failure becomes instructive when you pay its tuition)",
    ],
    topics: [
      "Business failure",
      "Learning",
      "Refrigerated logistics",
      "Resilience",
      "Accountability",
    ],
    tip: "Notice how Daniel's relationship with Eliza evolves across the story — and listen for the exact condition she sets before giving him another chance.",
  },

  "hard-5": {
    id: "5",
    title: "The Bridge at Low Tide",
    emoji: "🌉",
    // Narrow stone bridge / English countryside
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~100 sec",
    description:
      "A wedged removal lorry, a stubborn tractor driver, and a queue of impatient commuters — Daniel finds himself mediating a standoff on a narrow stone bridge near Southampton. What seems like a traffic anecdote turns into a precise lesson in leadership and logistics.",
    grammar: [
      "Past Simple storytelling with descriptive detail (I reached, I walked, I asked)",
      "Contrast between past and present self (My younger self would've honked — instead, I…)",
      "Modal verbs for hypothetical past (would've honked, would've fumed)",
      "Prepositional phrases of place and manner (at dawn, on the quay, without any title)",
    ],
    topics: [
      "Leadership",
      "Problem-solving",
      "Logistics philosophy",
      "England",
      "Communication",
    ],
    tip: "The bridge is a metaphor — Daniel spells it out in his notebook at the end. Listen for the exact phrase he writes down, as it captures his entire management style in one line.",
  },

  "hard-6": {
    id: "6",
    title: "Night of the Phantom Pallets",
    emoji: "🌙",
    // Dark warehouse at night / night operations
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~130 sec",
    description:
      "At 1:12 a.m., Daniel's team discovers five pallets that don't exist — a cascade of a customs typo, a scanner glitch, and a time-critical shipment built on nothing. With the clock running, Daniel splits his team into three and races to turn fiction into reality before dawn.",
    grammar: [
      "Past Simple for crisis sequence (we discovered, I split, we paid, we retired)",
      "Passive voice in operational context (the shipment was built on air, the scanner model was retired)",
      "Complex time expressions (at 1:12 a.m., before lunch, by 6:40 a.m.)",
      "Metaphorical register in professional speech (phantom pallets, turned fiction into reality, a choir not a solo)",
    ],
    topics: [
      "Logistics crisis",
      "Night operations",
      "Teamwork",
      "Data errors",
      "Warehouse management",
    ],
    tip: "This story moves fast — listen for the three-team split Daniel organises and what each group is assigned to do. The structure of his response is the real lesson here.",
  },

  "hard-7": {
    id: "7",
    title: "Family Weather Report",
    emoji: "🏠",
    // Warm family kitchen / home life
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~102 sec",
    description:
      "Daniel turns his gaze from the warehouse to the kitchen table — introducing his wife Sandra, his university-age daughter, his three-year-old son, and a dog with a vendetta against the postman. A warm and witty portrait of how a businessman tries to apply his professional habits at home without turning family life into a logistics operation.",
    grammar: [
      "Present Simple for habitual family dynamics (I take the calls, we hold a Sunday council)",
      "Present Perfect for ongoing patterns (I've learned to declare, she has absorbed)",
      "Metaphor used as grammar structure (observing a volatile compound, compound interest)",
      "Conditional future (if the business will be successful, he won't mind)",
    ],
    topics: [
      "Family",
      "Work-life balance",
      "Relationships",
      "Habits",
      "Humour",
    ],
    tip: "Listen for the phrase 'red day' and how Daniel defines it — it's a professional concept he's quietly imported into his personal life, and it says a lot about his character.",
  },

  "hard-8": {
    id: "8",
    title: "The Price of Enough",
    emoji: "💷",
    // Money / financial reflection / coins and notes
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~96 sec",
    description:
      "When people ask Daniel how much a logistics business can make, he used to answer with spreadsheets. Now he gives a different number entirely. This reflective story explores his evolving philosophy on money, growth, and the hidden cost of chasing numbers that look like prizes but turn out to be anchors.",
    grammar: [
      "Past Simple vs Present Simple contrast (I used to answer — now I give)",
      "Used to + infinitive for past habits (I used to answer with spreadsheets)",
      "Abstract noun phrases (the price of yes, unused options, the journey of choosing)",
      "Extended metaphor as argument structure (money is fuel; the journey is choosing where not to drive)",
    ],
    topics: [
      "Business philosophy",
      "Money",
      "Growth",
      "Decision-making",
      "Personal values",
    ],
    tip: "Daniel uses two key metaphors for money in this story — listen for both and think about how they contradict each other. That tension is the whole point of the episode.",
  },

  "hard-9": {
    id: "9",
    title: "Family on the Manifest – Part I",
    emoji: "✈️",
    // Airport / family travel / Bilbao or Spain cityscape
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~118 sec",
    description:
      "Daniel attempts to fold a client tour of northern Spain into a family holiday — Bilbao, San Sebastián, and a cold-chain facility outside Vitoria-Gasteiz. Before the plane even lands, the business intrudes. This is the story of a man trying to carry three cargoes with one airway bill.",
    grammar: [
      "Past Simple for travel narrative (we tried, I told myself, I took the call, I wrote)",
      "Declarative speech acts — rules stated aloud (We don't let the business colonise the trip)",
      "Parallel structure in lists (the meeting, the marriage, and the memories)",
      "Embedded clauses (She has absorbed more of my life than she admits)",
    ],
    topics: [
      "Work-life balance",
      "Spain",
      "Business travel",
      "Family",
      "Boundaries",
    ],
    tip: "This is Part I of a two-part story — pay attention to the rule Daniel declares aloud at Heathrow security. His ability to stick to that rule is tested hard in Part II.",
  },

  "hard-10": {
    id: "10",
    title: "Family on the Manifest – Part II",
    emoji: "⛵",
    // San Sebastián bay / La Concha beach / dramatic sea
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    difficulty: "Hard",
    duration: "~197 sec",
    description:
      "The rest day in San Sebastián was supposed to be the reward — bikes along La Concha, tortilla debates, no phone. Then a freak squall rolls in, a refrigerated shipment throws a temperature alarm, and Daniel has exactly two hours before the point of no return. His family is watching. So is his integrity.",
    grammar: [
      "Past Simple climax narrative (the sea changed, I stepped out, I asked, I returned)",
      "Modal perfect for reflection (I thought I'd perfected the blend)",
      "Reported speech — direct and indirect mixed (she said 'you made it about us first')",
      "Philosophical aphorism structure (Boundaries aren't walls; they're promises with timestamps)",
    ],
    topics: [
      "Family",
      "Crisis management",
      "Spain",
      "Refrigerated logistics",
      "Work-life balance",
    ],
    tip: "This is the most emotionally layered episode in the entire Hard series. Listen for the final line Daniel writes in his notebook — it reframes everything he has said across all ten stories."
    },
};