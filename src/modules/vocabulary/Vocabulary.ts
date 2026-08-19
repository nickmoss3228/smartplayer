export interface VocabEntry {
  word: string;
  definition: string;
  audioKey: string;
  // English filename without extension, used when word is non-Latin
}

export const trackFolderMap: Record<
  string,
  Record<string, Record<string, string>>
> = {
  easy: {
    leo: {
      "1": "1.leo's life",
      "2": "2. leo's mornings",
      "3": "3. leo's favorite food",
      "4": "4. leo's family",
      "5": "5. leo's clothes",
      "6": "6. a day at the beach",
      "7": "7. a country that Leo wants to visit",
      "8": "8. leo's hobbies",
      "9": "9. meeting a friend",
      "10": "10. the lost kitten",
    },
    "leo-additional": {
      "1": "1. leo's new chapter",
      "2": "2. leo's second story",
      "3": "3. leo's third story",
    },
    // "News and Interesting things" group — every news story is a source
    // article (part 1) plus a linked conversation (part 2). These folder names
    // are also what the player prints as the track title (see
    // useStoryTitles.ts: "1. story" → "Story"), matching the placeholder
    // AudioTrack titles in audioDataNewsPlaceholder.ts.
    "news-roland-garros": {
      "1": "1. story",
      "2": "2. discussion",
    },
    "news-family-visit": {
      "1": "1. story",
      "2": "2. discussion",
    },
    "news-grazing-board": {
      "1": "1. story",
      "2": "2. discussion",
    },
  },
  medium: {
    maya: {
      "1": "1. meet me",
      "2": "2. a trip to kyoto",
      "3": "3. trying street food in bangkok",
      "4": "4. a missed connection",
      "5": "5. family across borders",
      "6": "6. budgeting for adventure",
      "7": "7. discussing environmental concerns",
      "8": "8. an unexpected interview",
      "9": "9. the mountain festival part 1",
      "10": "10. the mountain festival part 2",
    },
  },
  hard: {
    daniel: {
      "1": "1. introducing myself",
      "2": "2. the deal that nearly broke me",
      "3": "3. the conference in munich",
      "4": "4. a failure with a silver lining",
      "5": "5. the bridge at low tide",
      "6": "6. night of the phantom pallets",
      "7": "7. family weather report",
      "8": "8. the price of enough",
      "9": "9. family on the manifest, part I the itinerary that blinked.",
      "10": "10. family on the manifest, part II the break that tested the break.",
    },
  },
};

// Maps each difficulty + story slug to its top-level story folder
export const storyFolderMap: Record<string, Record<string, string>> = {
  easy: {
    leo: "leo",
    "leo-additional": "leo",
    // ^ change to "leo-additional" if the new set lives in its own
    // top-level bucket in storage rather than a subfolder of "leo".
    // Each news story gets its own top-level bucket rather than sharing
    // "leo" — otherwise all three would collide on the same "1. story" /
    // "2. discussion" track folders. Full vocab path, for reference:
    //   news-grazing-board/quiz/1. story/vocab/olives.mp3
    // roland-garros and grazing-board are uploaded and match this layout;
    // family-visit's clips don't exist in the bucket yet.
    "news-roland-garros": "news-roland-garros",
    "news-family-visit": "news-family-visit",
    "news-grazing-board": "news-grazing-board",
  },
  medium: {
    maya: "maya",
  },
  hard: {
    daniel: "daniel",
  },
};

export const trackPhrasalVerbs: Record<
  string,
  Record<string, Record<string, VocabEntry[]>>
> = {
  easy: {
    leo: {
      "2": [
        { word: "просыпаться", definition: "1", audioKey: "wake up" },
        { word: "вставать", definition: "1", audioKey: "get up" },
        {
          word: "вставать с кровати",
          definition: "1",
          audioKey: "get out of bed",
        },
        { word: "остывать", definition: "1", audioKey: "cool down" },
        { word: "запускаться", definition: "1", audioKey: "start up" },
        { word: "возвращаться", definition: "1", audioKey: "come back" },
        { word: "надоесть", definition: "1", audioKey: "feed up" },
        { word: "лечь", definition: "1", audioKey: "lie down" },
        { word: "думать о", definition: "1", audioKey: "think about" },
      ],
      "3": [{ word: "звонить", definition: "1", audioKey: "call up" }],
      "4": [
        { word: "продолжаться", definition: "1", audioKey: "go on" },
        { word: "быть не дома", definition: "1", audioKey: "be out" },
        { word: "быть готовым на", definition: "1", audioKey: "be down for" },
        { word: "присоединяться", definition: "1", audioKey: "join in" },
        { word: "возвращаться", definition: "1", audioKey: "go back" },
      ],
      "5": [
        { word: "надевать", definition: "1", audioKey: "put on" },
        { word: "снимать", definition: "1", audioKey: "take off" },
      ],
      "6": [
        { word: "оглядываться", definition: "1", audioKey: "look back" },
        { word: "плыть обратно", definition: "1", audioKey: "swim back" },
      ],
      "7": [
        { word: "повторять", definition: "1", audioKey: "follow along" },
        { word: "сбываться", definition: "1", audioKey: "come true" },
        { word: "ломаться", definition: "1", audioKey: "break down" },
      ],
      "8": [
        { word: "продолжаться", definition: "1", audioKey: "go on" },
        { word: "вырастать", definition: "1", audioKey: "grow up" },
      ],
      "9": [
        { word: "встречаться", definition: "1", audioKey: "meet up" },
        { word: "возвращаться", definition: "1", audioKey: "come back" },
      ],
      "10": [
        { word: "оглядываться", definition: "1", audioKey: "look around" },
        { word: "поднимать", definition: "1", audioKey: "pick up" },
        { word: "убегать", definition: "1", audioKey: "run away" },
        { word: "искать", definition: "1", audioKey: "look for" },
        { word: "устанавливать", definition: "1", audioKey: "put up" },
        { word: "возвращаться", definition: "1", audioKey: "go back" },
      ],
    },
    "leo-additional": {
  "1": [
    { word: "проверить, посмотреть", definition: "1", audioKey: "check out" },
    { word: "уйти, отстать (грубо)", definition: "1", audioKey: "get lost" },
    { word: "встретиться", definition: "1", audioKey: "meet up" },
    { word: "подходить, быть удобным", definition: "1", audioKey: "work for" },
  ],
  "2": [
    { word: "получать весточку от", definition: "1", audioKey: "hear from" },
    { word: "влюбиться в", definition: "1", audioKey: "fall for" },
    { word: "пытаться подкатить к", definition: "1", audioKey: "make a move on" },
  ],
  "3": [],
},
    // ── News stories ────────────────────────────────────────────────────
    // These follow the same loose definition of "phrasal" the lists above
    // already use — verb + particle *and* verb + preposition ("pay for",
    // "bet on", "be out"), not strict particle verbs only. The two news
    // articles are adapted A2 prose with very few true particle verbs, so
    // most of what's here is the prepositional kind.
    "news-roland-garros": {
      "1": [
        { word: "верить в", definition: "1", audioKey: "believe in" },
        { word: "благодарить за", definition: "1", audioKey: "thank for" },
      ],
      "2": [
        {
          word: "хорошо разбираться в",
          definition: "1",
          audioKey: "be good at",
        },
        { word: "сделать (с этим)", definition: "1", audioKey: "do about" },
        {
          word: "сразу отправиться в",
          definition: "1",
          audioKey: "go straight to",
        },
        { word: "продолжать делать", definition: "1", audioKey: "keep doing" },
      ],
    },
    "news-family-visit": {
      "1": [
        { word: "тратить на", definition: "1", audioKey: "spend on" },
        { word: "быть про, сводиться к", definition: "1", audioKey: "be about" },
      ],
      // Part 2 (discussion) text not written yet.
      "2": [],
    },
    "news-grazing-board": {
      "1": [
        {
          word: "возникнуть, подвернуться",
          definition: "1",
          audioKey: "come up",
        },
        { word: "позвать в гости", definition: "1", audioKey: "invite over" },
        { word: "закинуть (в корзину)", definition: "1", audioKey: "toss in" },
        { word: "купить, взять", definition: "1", audioKey: "pick up" },
        { word: "пригодиться", definition: "1", audioKey: "come in handy" },
        {
          word: "пройти, справиться",
          definition: "1",
          audioKey: "make it through",
        },
        { word: "выложить, выставить", definition: "1", audioKey: "put out" },
        { word: "вовлечь в", definition: "1", audioKey: "get involved in" },
      ],
      "2": [
        { word: "разогреть(ся)", definition: "1", audioKey: "warm up" },
        { word: "вынимать, доставать", definition: "1", audioKey: "take out" },
        { word: "собрать, составить", definition: "1", audioKey: "put together" },
        { word: "вернуться", definition: "1", audioKey: "go back" },
        { word: "увлечься", definition: "1", audioKey: "get carried away" },
      ],
    },
  },
  medium: {
    maya: {
      "1": [{ word: "записывать", definition: "1", audioKey: "write down" }],
      "2": [{ word: "расти", definition: "1", audioKey: "rise up" }],
      "3": [],
      "4": [
        { word: "наткнуться на", definition: "1", audioKey: "run into" },
        { word: "превращаться в", definition: "1", audioKey: "turn into" },
      ],
      "5": [
        { word: "взрослеть", definition: "1", audioKey: "grow up" },
        { word: "наверстывать", definition: "1", audioKey: "catch up on" },
      ],
      "6": [{ word: "есть вне дома", definition: "1", audioKey: "eat out" }],
      "7": [
        { word: "узнавать о", definition: "1", audioKey: "find out" },
        { word: "в итоге оказаться", definition: "1", audioKey: "end up" },
      ],
      "8": [
        { word: "входить", definition: "1", audioKey: "go in" },
        { word: "наклоняться над", definition: "1", audioKey: "bend over" },
        { word: "превращаться в", definition: "1", audioKey: "turn into" },
        {
          word: "передавать из поколения в поколение",
          definition: "1",
          audioKey: "pass down",
        },
        {
          word: "быстро пролетать (о времени)",
          definition: "1",
          audioKey: "fly by",
        },
      ],
      "9": [
        { word: "устанавливать", definition: "1", audioKey: "set up" },
        { word: "записывать", definition: "1", audioKey: "write down" },
      ],
      "10": [{ word: "впадать в", definition: "1", audioKey: "fall into" }],
    },
  },
  hard: {
    daniel: {
      "1": [
        { word: "вырастать", definition: "1", audioKey: "grow up" },
        { word: "записывать", definition: "1", audioKey: "write down" },
      ],
      "2": [
        { word: "вернуть упущенное", definition: "1", audioKey: "claw back" },
      ],
      "3": [
        { word: "поддерживать работу", definition: "1", audioKey: "keep from" },
        { word: "делать ставку на", definition: "1", audioKey: "bet on" },
      ],
      "4": [
        {
          word: "расширяться в новую сферу",
          definition: "1",
          audioKey: "expand into",
        },
        { word: "оказываться", definition: "1", audioKey: "turn out" },
        { word: "выдумывать", definition: "1", audioKey: "make up" },
        { word: "ломаться", definition: "1", audioKey: "go down" },
        {
          word: "готовиться к неприятностям",
          definition: "1",
          audioKey: "brace for",
        },
      ],
      "5": [{ word: "входить в", definition: "1", audioKey: "step into" }],
      "6": [
        { word: "платить за", definition: "1", audioKey: "pay for" },
        { word: "превращать в", definition: "1", audioKey: "turn into" },
      ],
      "7": [{ word: "записывать", definition: "1", audioKey: "write down" }],
      "8": [
        { word: "платить за", definition: "1", audioKey: "pay for" },
        { word: "отказываться от", definition: "1", audioKey: "pass on" },
      ],
      "9": [
        {
          word: "включать в, объединять с",
          definition: "1",
          audioKey: "fold into",
        },
        { word: "убирать, откладывать", definition: "1", audioKey: "put away" },
      ],
      "10": [
        { word: "накатывать, наступать", definition: "1", audioKey: "roll in" },
        {
          word: "укрыться в, быстро зайти в",
          definition: "1",
          audioKey: "duck into",
        },
        { word: "проплыть", definition: "1", audioKey: "sail through" },
        {
          word: "заканчивать выступление / сообщение",
          definition: "1",
          audioKey: "sign off",
        },
      ],
    },
  },
};

export const trackVocabulary: Record<
  string,
  Record<string, Record<string, VocabEntry[]>>
> = {
  easy: {
    leo: {
      "1": [
        { word: "квартира", definition: "1", audioKey: "flat" },
        { word: "местный магазин", definition: "1", audioKey: "local shop" },
        { word: "удобный", definition: "1", audioKey: "convenient" },
        { word: "добрый", definition: "1", audioKey: "kind" },
        { word: "дружелюбный", definition: "1", audioKey: "friendly" },
        { word: "просто", definition: "1", audioKey: "just" },
        { word: "около", definition: "1", audioKey: "near" },
        { word: "неплохо", definition: "1", audioKey: "pretty good" },
        { word: "каждый день", definition: "1", audioKey: "every day" },
        { word: "много друзей", definition: "1", audioKey: "a lot of friends" },
        { word: "только", definition: "1", audioKey: "only" },
      ],
      "2": [
        { word: "жаворонок", definition: "1", audioKey: "lark" },
        { word: "счастливые носки", definition: "1", audioKey: "lucky socks" },
        { word: "расслабиться", definition: "1", audioKey: "relax" },
        {
          word: "продажи падают",
          definition: "1",
          audioKey: "sales are going down",
        },
        { word: "кормить", definition: "1", audioKey: "feed" },
        { word: "чистить зубы", definition: "1", audioKey: "brush my teeth" },
        { word: "брюки", definition: "1", audioKey: "trousers" },
        { word: "ответить", definition: "1", audioKey: "answer" },
        { word: "тихое утро", definition: "1", audioKey: "a quiet morning" },
        { word: "занятый", definition: "1", audioKey: "busy" },
        { word: "расстроенный", definition: "1", audioKey: "upset" },
        { word: "прилечь", definition: "1", audioKey: "lay down" },
      ],
      "3": [
        { word: "есть", definition: "1", audioKey: "eat" },
        { word: "тесто", definition: "1", audioKey: "dough" },
        { word: "пекарня", definition: "1", audioKey: "bakery" },
        { word: "яблочный пирог", definition: "1", audioKey: "apple pie" },
        { word: "лазанья", definition: "1", audioKey: "lasagna" },
        { word: "скидка", definition: "1", audioKey: "discount" },
        { word: "процент", definition: "1", audioKey: "percent" },
        { word: "ручной работы", definition: "1", audioKey: "handmade" },
        {
          word: "вредный для здоровья",
          definition: "1",
          audioKey: "unhealthy",
        },
      ],
      "4": [
        { word: "двоюродная сестра", definition: "1", audioKey: "cousin" },
        { word: "галерея", definition: "1", audioKey: "art gallery" },
        { word: "экзамены", definition: "1", audioKey: "exams" },
        { word: "бизнес", definition: "1", audioKey: "business" },
        { word: "вместе", definition: "1", audioKey: "together" },
        { word: "молодой", definition: "1", audioKey: "young" },
        { word: "сканированные фото", definition: "1", audioKey: "scans" },
        { word: "почти", definition: "1", audioKey: "almost" },
        { word: "жаловаться", definition: "1", audioKey: "complain" },
        { word: "готовиться", definition: "1", audioKey: "prepare" },
        { word: "школьный класс", definition: "1", audioKey: "grade" },
        {
          word: "лицом к лицу, лично",
          definition: "1",
          audioKey: "face to face",
        },
      ],
      "5": [
        { word: "тренды", definition: "1", audioKey: "trends" },
        { word: "модный", definition: "1", audioKey: "fashionable" },
        { word: "удобный", definition: "1", audioKey: "comfortable" },
        {
          word: "шерстяной свитер",
          definition: "1",
          audioKey: "woolen sweater",
        },
        { word: "форма", definition: "1", audioKey: "uniform" },
        { word: "костюм", definition: "1", audioKey: "suit" },
        { word: "кепка", definition: "1", audioKey: "cap" },
        { word: "платье", definition: "1", audioKey: "a dress" },
        { word: "потные", definition: "1", audioKey: "sweaty" },
        {
          word: "аккуратный и опрятный",
          definition: "1",
          audioKey: "neat and tidy",
        },
        { word: "наряд", definition: "1", audioKey: "outfit" },
      ],
      "6": [
        { word: "поездка", definition: "1", audioKey: "a trip" },
        { word: "вспоминть", definition: "1", audioKey: "recall" },
        { word: "обычный день", definition: "1", audioKey: "a usual day" },
        { word: "пляж", definition: "1", audioKey: "a beach" },
        { word: "замок", definition: "1", audioKey: "a castle" },
        { word: "берег", definition: "1", audioKey: "a shore" },
        { word: "напуганный", definition: "1", audioKey: "scared" },
        { word: "акула", definition: "1", audioKey: "a shark" },
        {
          word: "научил себя сам",
          definition: "1",
          audioKey: "taught himself",
        },
        { word: "купальник", definition: "1", audioKey: "swimming suit" },
        { word: "напоминать", definition: "1", audioKey: "remind" },
      ],
      "7": [
        { word: "гондола", definition: "1", audioKey: "gondola" },
        { word: "настоящий", definition: "1", audioKey: "authentic" },
        { word: "джелато", definition: "1", audioKey: "gelato" },
        { word: "копить деньги", definition: "1", audioKey: "saving money" },
        {
          word: "мечта сбывается",
          definition: "1",
          audioKey: "dream come true",
        },
        { word: "путешествовать", definition: "1", audioKey: "travel" },
        { word: "опасный", definition: "1", audioKey: "dangerous" },
      ],
      "8": [
        { word: "билет", definition: "1", audioKey: "a ticket" },
        { word: "информировать", definition: "1", audioKey: "inform" },
        { word: "продуктивный", definition: "1", audioKey: "productive" },
        { word: "нападающий", definition: "1", audioKey: "attacker" },
        { word: "дарить", definition: "1", audioKey: "gift" },
        { word: "спортивное поле", definition: "1", audioKey: "sports field" },
        { word: "напряжённый", definition: "1", audioKey: "stressful" },
        {
          word: "сериалы на Netflix",
          definition: "1",
          audioKey: "netflix series",
        },
        { word: "коллекция DVD", definition: "1", audioKey: "DVD collection" },
        { word: "капитан команды", definition: "1", audioKey: "team captain" },
      ],
      "9": [
        { word: "старый друг", definition: "1", audioKey: "old friend" },
        { word: "кафе", definition: "1", audioKey: "cafe" },
        { word: "уютный", definition: "1", audioKey: "cozy" },
        { word: "великолепный", definition: "1", audioKey: "wonderful" },
        { word: "очевидно", definition: "1", audioKey: "obviously" },
        {
          word: "получить по заслугам",
          definition: "1",
          audioKey: "get the beatings",
        },
        { word: "приключения", definition: "1", audioKey: "adventures" },
        { word: "смеяться", definition: "1", audioKey: "laugh" },
        { word: "важный", definition: "1", audioKey: "important" },
        {
          word: "планы на будущее",
          definition: "1",
          audioKey: "plans for the future",
        },
        { word: "рабочая поездка", definition: "1", audioKey: "work trip" },
        { word: "скучать", definition: "1", audioKey: "miss" },
        { word: "попрощался", definition: "1", audioKey: "said goodbye" },
        { word: "крошечный", definition: "1", audioKey: "tiny" },
      ],
      "10": [
        { word: "мягкий", definition: "1", audioKey: "soft" },
        { word: "трястись", definition: "1", audioKey: "shake" },
        { word: "бережно", definition: "1", audioKey: "carefully" },
        { word: "убежать", definition: "1-", audioKey: "run away" },
        {
          word: "магазин у дома",
          definition: "1-",
          audioKey: "convenience shop",
        },
        { word: "одеяло", definition: "1-", audioKey: "blanket" },
        { word: "ветеринар", definition: "1", audioKey: "veterinarian" },
        { word: "постеры", definition: "1", audioKey: "posters" },
        { word: "район", definition: "1", audioKey: "neighborhood" },
        { word: "социальные сети", definition: "1", audioKey: "social media" },
      ],
    },
    "leo-additional": {
      "1": [
        { word: "публиковать", definition: "1", audioKey: "post" },
        { word: "фотографии", definition: "1", audioKey: "pictures" },
        { word: "лгать", definition: "1", audioKey: "lie" },
        { word: "смущаться", definition: "1", audioKey: "blush" },
        { word: "курсовая работа", definition: "1", audioKey: "term paper" },
        { word: "уважать", definition: "1", audioKey: "respect" },
        { word: "владелец", definition: "1", audioKey: "owner" },
        { word: "встречаться (с кем-то)", definition: "1", audioKey: "dating" },
        { word: "признаваться", definition: "1", audioKey: "confess" },
        { word: "выпечка", definition: "1", audioKey: "pastries" },
      ],
      "2": [
    { word: "cледить, быть подписаным", definition: "1", audioKey: "follow" },
    { word: "жаворонок (ранняя пташка)", definition: "1", audioKey: "early bird" },
    { word: "сова (полуночник)", definition: "1", audioKey: "night owl" },
    { word: "играть в видеоигры", definition: "1", audioKey: "play games" },
    { word: "влюблён", definition: "1", audioKey: "in love" },
    { word: "серьёзные отношения", definition: "1", audioKey: "serious relationship" },
    { word: "пропустить", definition: "1", audioKey: "miss" },
    { word: "заметить", definition: "1", audioKey: "notice" },
    { word: "постыдный", definition: "1", audioKey: "cringe" },
  ],
      "3": [
        // vocab entries for track 3
      ],
    },
    // ── News stories ──────────────────────────────────────────────────────
    // Part 1 = the source article, part 2 = the linked conversation, matching
    // the "Story" / "Discussion" tracks in audioDataNewsPlaceholder.ts.
    "news-roland-garros": {
      // Article: Mirra Andreeva wins the 2026 French Open.
      "1": [
        { word: "турнир", definition: "1", audioKey: "a tournament" },
        { word: "финал", definition: "1", audioKey: "the final" },
        { word: "чемпионка", definition: "1", audioKey: "a champion" },
        { word: "победить (соперника)", definition: "1", audioKey: "defeat" },
        { word: "титул", definition: "1", audioKey: "a title" },
        {
          word: "финалистка, второе место",
          definition: "1",
          audioKey: "a runner-up",
        },
        // audioKeys stay lowercase: useVocabAudio builds the mp3 path from the
        // raw key while usePreloadStoryAssets/assembleImportPayload lowercase
        // it, so a capitalised key would preload one file and play another.
        //
        // NOTE: "a grand slam" is the one clip in this story with no recording
        // in the bucket — every other vocab/phrasal key here is uploaded. The
        // chip renders but its audio 404s until the mp3 is generated and
        // dropped at news-roland-garros/quiz/1. story/vocab/a grand slam.mp3.
        { word: "Большой шлем", definition: "1", audioKey: "a grand slam" },
        {
          word: "карьерный Большой шлем",
          definition: "1",
          audioKey: "a career grand slam",
        },
        { word: "самая молодая", definition: "1", audioKey: "the youngest" },
        { word: "примечательный, заметный", definition: "1", audioKey: "notable" },
        { word: "тренер", definition: "1", audioKey: "a coach" },
        { word: "присутствовать на", definition: "1", audioKey: "attend" },
        { word: "невероятно", definition: "1", audioKey: "incredibly" },
      ],
      // Discussion: E / S / A talk about the win.
      "2": [
        { word: "восходящая звезда", definition: "1", audioKey: "a rising star" },
        { word: "следить за спортом", definition: "1", audioKey: "follow sports" },
        { word: "шутить, разыгрывать", definition: "1", audioKey: "be kidding" },
        { word: "потрясающий", definition: "1", audioKey: "amazing" },
        { word: "практически", definition: "1", audioKey: "practically" },
        { word: "школьница", definition: "1", audioKey: "a schoolgirl" },
        { word: "слёзы радости", definition: "1", audioKey: "tears of joy" },
        { word: "попробуй угадать", definition: "1", audioKey: "take a guess" },
        { word: "обменный курс", definition: "1", audioKey: "an exchange rate" },
        { word: "безумный, огромный", definition: "1", audioKey: "insane" },
        { word: "несправедливый", definition: "1", audioKey: "unfair" },
        { word: "тяжёлый труд", definition: "1", audioKey: "hard work" },
        { word: "ракетка", definition: "1", audioKey: "a racket" },
        { word: "тренировка", definition: "1", audioKey: "practice" },
        {
          word: "чемпионат мира",
          definition: "1",
          audioKey: "a world championship",
        },
        { word: "поднять бокал за", definition: "1", audioKey: "raise a glass" },
        { word: "передумать", definition: "1", audioKey: "change your mind" },
      ],
    },
    "news-family-visit": {
      // Article: how young people in Russia are changing New Year traditions.
      "1": [
        { word: "опрос-анкетирование", definition: "1", audioKey: "a survey" },
        { word: "безопасность", definition: "1", audioKey: "safe" },
        { word: "уют", definition: "1", audioKey: "cozy" },
        { word: "тратить", definition: "1", audioKey: "to spend" },
        { word: "подарок", definition: "1", audioKey: "a gift" },
        { word: "старше", definition: "1", audioKey: "older" },
        {
          word: "большинство, бо́льшая часть",
          definition: "1",
          audioKey: "most",
        },
        { word: "традиционный", definition: "1", audioKey: "traditional" },
        { word: "праздновать", definition: "1", audioKey: "celebrate" },
        { word: "вместо этого", definition: "1", audioKey: "instead" },
        { word: "вообще (не)", definition: "1", audioKey: "at all" },
        { word: "блюдо", definition: "1", audioKey: "a dish" },
        { word: "селёдка", definition: "1", audioKey: "herring" },
        { word: "загадать желание", definition: "1", audioKey: "make a wish" },
        { word: "полночь", definition: "1", audioKey: "midnight" },
        { word: "привычка", definition: "1", audioKey: "a habit" },
        { word: "социальные сети", definition: "1", audioKey: "social media" },
        { word: "меняться", definition: "1", audioKey: "change" },
      ],
      // Discussion text not written yet — fill in when the second part exists.
      "2": [],
    },
    "news-grazing-board": {
      // Article: "Grazing Board. Italian Antipasti" — mostly a shopping list,
      // so the food nouns are the comprehension bottleneck for A2 listeners.
      "1": [
        {
          word: "доска с закусками (ассорти)",
          definition: "1",
          audioKey: "a grazing board",
        },
        {
          word: "итальянские закуски",
          definition: "1",
          audioKey: "antipasti",
        },
        {
          word: "сырокопчёная колбаса",
          definition: "1",
          audioKey: "dry-cured sausage",
        },
        { word: "ветчина", definition: "1", audioKey: "ham" },
        { word: "копчёный сыр", definition: "1", audioKey: "smoked cheese" },
        { word: "виноград", definition: "1", audioKey: "grapes" },
        { word: "помидоры черри", definition: "1", audioKey: "cherry tomatoes" },
        { word: "оливки", definition: "1", audioKey: "olives" },
        { word: "перепелиные яйца", definition: "1", audioKey: "quail eggs" },
        { word: "форель", definition: "1", audioKey: "trout" },
        { word: "шпроты", definition: "1", audioKey: "sprats" },
        { word: "мёд", definition: "1", audioKey: "honey" },
        { word: "грецкие орехи", definition: "1", audioKey: "walnuts" },
        { word: "ржаной хлеб", definition: "1", audioKey: "rye bread" },
        { word: "деревянная доска", definition: "1", audioKey: "a wooden board" },
        { word: "острый нож", definition: "1", audioKey: "a sharp knife" },
        { word: "нарезать", definition: "1", audioKey: "slice" },
        { word: "чистить (от скорлупы)", definition: "1", audioKey: "peel" },
        { word: "горка, кучка", definition: "1", audioKey: "a pile" },
        { word: "сытный", definition: "1", audioKey: "filling" },
        {
          word: "пропасть, испортиться зря",
          definition: "1",
          audioKey: "go to waste",
        },
      ],
      // Discussion: Katrin, Evelyn and Igor argue about what to order.
      "2": [
        { word: "удобный", definition: "1", audioKey: "convenient" },
        { word: "надоесть", definition: "1", audioKey: "be tired of" },
        { word: "альтернатива", definition: "1", audioKey: "an alternative" },
        { word: "с нуля", definition: "1", audioKey: "from scratch" },
        { word: "недорогой, доступный", definition: "1", audioKey: "affordable" },
        { word: "совет", definition: "1", audioKey: "a tip" },
        {
          word: "ограниченный бюджет",
          definition: "1",
          audioKey: "a tight budget",
        },
        {
          word: "холодные закуски",
          definition: "1",
          audioKey: "cold appetizers",
        },
        { word: "пастись", definition: "1", audioKey: "graze" },
        { word: "пастбище", definition: "1", audioKey: "a pasture" },
        { word: "под рукой", definition: "1", audioKey: "on hand" },
        {
          word: "средиземноморская кухня",
          definition: "1",
          audioKey: "mediterranean food",
        },
        { word: "духовка", definition: "1", audioKey: "the oven" },
        { word: "угадать", definition: "1", audioKey: "guess" },
        { word: "ссылка", definition: "1", audioKey: "a link" },
      ],
    },
  },
  medium: {
    maya: {
      "1": [
        { word: "журналист", definition: "1", audioKey: "journalist" },
        { word: "онлайн-журнал", definition: "1", audioKey: "online magazine" },
        { word: "гибкость", definition: "1", audioKey: "flexibility" },
        { word: "увлечённый", definition: "1", audioKey: "passionate" },
        { word: "любопытный", definition: "1", audioKey: "curious" },
        { word: "острые ощущения", definition: "1", audioKey: "thrill" },
        { word: "размышлять", definition: "1", audioKey: "reflect" },
        {
          word: "разные точки зрения",
          definition: "1",
          audioKey: "diverse perspectives",
        },
        {
          word: "делиться опытом",
          definition: "1",
          audioKey: "share experiences",
        },
        { word: "выразительный", definition: "1", audioKey: "expressive" },
      ],
      "2": [
        { word: "командировка", definition: "1", audioKey: "assignment" },
        { word: "древние храмы", definition: "1", audioKey: "ancient temples" },
        { word: "безмятежный", definition: "1", audioKey: "serene" },
        { word: "очарованный", definition: "1", audioKey: "captivated" },
        {
          word: "традиционные обычаи",
          definition: "1",
          audioKey: "traditional customs",
        },
        { word: "ремесленник", definition: "1", audioKey: "artisan" },
        { word: "вдохновляющий", definition: "1", audioKey: "inspiring" },
        {
          word: "стоимость жизни",
          definition: "1",
          audioKey: "cost of living",
        },
        { word: "резко", definition: "1", audioKey: "drastically" },
        {
          word: "получить повышение",
          definition: "1",
          audioKey: "got promoted",
        },
      ],
      "3": [
        { word: "легендарный", definition: "1", audioKey: "legendary" },
        { word: "нерешительно", definition: "1", audioKey: "hesitantly" },
        { word: "энтузиазм", definition: "1", audioKey: "enthusiasm" },
        {
          word: "жареное насекомое",
          definition: "1",
          audioKey: "fried insect",
        },
        {
          word: "взрыв вкусов",
          definition: "1",
          audioKey: "explosion of flavors",
        },
        { word: "вкусовые рецепторы", definition: "1", audioKey: "taste buds" },
        {
          word: "яркая атмосфера",
          definition: "1",
          audioKey: "vibrant atmosphere",
        },
        { word: "ночная жизнь", definition: "1", audioKey: "nightlife" },
        { word: "неоновые огни", definition: "1", audioKey: "neon lights" },
        {
          word: "расстройство желудка",
          definition: "1",
          audioKey: "stomach bug",
        },
      ],
      "4": [
        { word: "стажёр", definition: "1", audioKey: "intern" },
        { word: "задержан", definition: "1", audioKey: "delayed" },
        { word: "пересадка", definition: "1", audioKey: "connecting train" },
        { word: "застрявший", definition: "1", audioKey: "stranded" },
        { word: "волна паники", definition: "1", audioKey: "wave of panic" },
        {
          word: "железнодорожная станция",
          definition: "1",
          audioKey: "railway station",
        },
        {
          word: "взять себя в руки",
          definition: "1",
          audioKey: "compose yourself",
        },
        {
          word: "альтернативный маршрут",
          definition: "1",
          audioKey: "alternative route",
        },
        { word: "незапланированный", definition: "1", audioKey: "impromptu" },
        { word: "собор", definition: "1", audioKey: "cathedral" },
      ],
      "5": [
        {
          word: "разбросаны по всему миру",
          definition: "1",
          audioKey: "spread across the world",
        },
        { word: "часовые пояса", definition: "1", audioKey: "time zones" },
        {
          word: "оставаться на связи",
          definition: "1",
          audioKey: "staying connected",
        },
        {
          word: "голосовое сообщение",
          definition: "1",
          audioKey: "voice note",
        },
        { word: "бродить", definition: "1", audioKey: "wander" },
        { word: "наверстать упущённое", definition: "1", audioKey: "catch up" },
        {
          word: "отдалённые деревни",
          definition: "1",
          audioKey: "remote villages",
        },
        {
          word: "чувство принадлежности",
          definition: "1",
          audioKey: "sense of belonging",
        },
        { word: "расписание", definition: "1", audioKey: "schedule" },
        { word: "стабилизирующий", definition: "1", audioKey: "grounding" },
      ],
      "6": [
        { word: "финансы", definition: "1", audioKey: "finances" },
        {
          word: "доступное жильё",
          definition: "1",
          audioKey: "affordable accommodation",
        },
        { word: "хостел", definition: "1", audioKey: "hostel" },
        {
          word: "подробный бюджет",
          definition: "1",
          audioKey: "detailed budget",
        },
        {
          word: "распределять средства",
          definition: "1",
          audioKey: "allocate funds",
        },
        { word: "проживание", definition: "1", audioKey: "lodging" },
        { word: "дисциплина", definition: "1", audioKey: "discipline" },
        { word: "сувениры", definition: "1", audioKey: "souvenirs" },
        {
          word: "накапливать долги",
          definition: "1",
          audioKey: "accumulate debt",
        },
        {
          word: "отслеживать расходы",
          definition: "1",
          audioKey: "track spending",
        },
      ],
      "7": [
        {
          word: "прибрежная деревня",
          definition: "1",
          audioKey: "coastal village",
        },
        {
          word: "загрязнение окружающей среды",
          definition: "1",
          audioKey: "environmental pollution",
        },
        {
          word: "средства к существованию",
          definition: "1",
          audioKey: "livelihood",
        },
        {
          word: "сокращение рыбных запасов",
          definition: "1",
          audioKey: "declining fish stocks",
        },
        {
          word: "пластиковые отходы",
          definition: "1",
          audioKey: "plastic waste",
        },
        { word: "микропластика", definition: "1", audioKey: "microplastic" },
        { word: "кровоток", definition: "1", audioKey: "bloodstream" },
        { word: "питьевая вода", definition: "1", audioKey: "drinking water" },
        { word: "принимать меры", definition: "1", audioKey: "take measures" },
        { word: "открывающий глаза", definition: "1", audioKey: "eye-opening" },
      ],
      "8": [
        { word: "ремёсла", definition: "1", audioKey: "crafts" },
        { word: "мастер", definition: "1", audioKey: "craftsman" },
        { word: "мастерская", definition: "1", audioKey: "workshop" },
        { word: "диктофон", definition: "1", audioKey: "recorder" },
        {
          word: "приложение-переводчик",
          definition: "1",
          audioKey: "translation app",
        },
        {
          word: "передавать по наследству",
          definition: "1",
          audioKey: "pass down",
        },
        { word: "узоры", definition: "1", audioKey: "patterns" },
        {
          word: "время сбора урожая",
          definition: "1",
          audioKey: "harvest time",
        },
        { word: "мятный чай", definition: "1", audioKey: "mint tea" },
        {
          word: "удостоверение репортёра",
          definition: "1",
          audioKey: "reporter's ID",
        },
      ],
      "9": [
        { word: "нагорье", definition: "1", audioKey: "highlands" },
        {
          word: "древний фестиваль",
          definition: "1",
          audioKey: "ancient festival",
        },
        { word: "ритуал", definition: "1", audioKey: "ritual" },
        {
          word: "память предков",
          definition: "1",
          audioKey: "ancestral memory",
        },
        { word: "церемония", definition: "1", audioKey: "ceremony" },
        { word: "восхождение", definition: "1", audioKey: "trek" },
        { word: "плетёные ткани", definition: "1", audioKey: "woven textiles" },
        { word: "алтарь", definition: "1", audioKey: "altar" },
        { word: "старейшины", definition: "1", audioKey: "elders" },
        { word: "флейта Пана", definition: "1", audioKey: "panpipes" },
      ],
      "10": [
        { word: "Млечный Путь", definition: "1", audioKey: "Milky Way" },
        { word: "факелы", definition: "1", audioKey: "torches" },
        { word: "процессия", definition: "1", audioKey: "procession" },
        { word: "подношения", definition: "1", audioKey: "offerings" },
        { word: "святилище", definition: "1", audioKey: "shrine" },
        {
          word: "хоровое пение",
          definition: "1",
          audioKey: "harmonized chant",
        },
        { word: "совместно", definition: "1", audioKey: "communally" },
        { word: "стойкость", definition: "1", audioKey: "resilience" },
        { word: "уязвимость", definition: "1", audioKey: "vulnerability" },
        { word: "голосовые заметки", definition: "1", audioKey: "voice memos" },
      ],
    },
  },
  hard: {
    daniel: {
      "1": [
        { word: "логистика", definition: "1", audioKey: "logistics" },
        {
          word: "накопительный эффект",
          definition: "1",
          audioKey: "compound effort",
        },
        {
          word: "структурные преимущества",
          definition: "1",
          audioKey: "structural advantages",
        },
        { word: "прибрежный город", definition: "1", audioKey: "coastal town" },
        { word: "последовательный", definition: "1", audioKey: "consistent" },
        {
          word: "наихудший сценарий",
          definition: "1",
          audioKey: "worst-case scenario",
        },
        { word: "управляемый", definition: "1", audioKey: "controllable" },
        { word: "энтузиазм", definition: "1", audioKey: "enthusiasm" },
        { word: "одолженный", definition: "1", audioKey: "borrowed" },
        { word: "терпеливый", definition: "1", audioKey: "patient" },
        { word: "ориентироваться", definition: "1", audioKey: "navigate" },
      ],
      "2": [
        {
          word: "медицинское оборудование",
          definition: "1",
          audioKey: "medical equipment",
        },
        {
          word: "минимальная маржа",
          definition: "1",
          audioKey: "razor-thin margins",
        },
        { word: "резкий рост цен", definition: "1", audioKey: "prices spiked" },
        { word: "склад", definition: "1", audioKey: "warehouse" },
        {
          word: "пересмотреть условия",
          definition: "1",
          audioKey: "renegotiate",
        },
        { word: "прозрачность", definition: "1", audioKey: "transparency" },
        { word: "эффективность", definition: "1", audioKey: "efficiency" },
        { word: "нестабильность", definition: "1", audioKey: "volatility" },
        {
          word: "растянутые окна доставки",
          definition: "1",
          audioKey: "staggered delivery windows",
        },
        { word: "складной стул", definition: "1", audioKey: "fold-out chair" },
        { word: "компенсировать", definition: "1", audioKey: "compensate" },
      ],
      "3": [
        { word: "основной доклад", definition: "1", audioKey: "keynote" },
        {
          word: "текучесть кадров",
          definition: "1",
          audioKey: "staff turnover",
        },
        { word: "оптимизация", definition: "1", audioKey: "optimization" },
        {
          word: "базовая зарплата",
          definition: "1",
          audioKey: "baseline wages",
        },
        {
          word: "повышение квалификации",
          definition: "1",
          audioKey: "upskilling",
        },
        {
          word: "взаимозаменяемый",
          definition: "1",
          audioKey: "interchangeable",
        },
        { word: "наставник", definition: "1", audioKey: "mentor" },
        {
          word: "коэффициент ошибок",
          definition: "1",
          audioKey: "error rates",
        },
        { word: "координация", definition: "1", audioKey: "coordination" },
        { word: "доверие", definition: "1", audioKey: "trust" },
      ],
      "4": [
        { word: "рефрижератор", definition: "1", audioKey: "reefer" },
        {
          word: "колебания температуры",
          definition: "1",
          audioKey: "temperature fluctuations",
        },
        { word: "партия товаров", definition: "1", audioKey: "shipment" },
        { word: "ремесло", definition: "1", audioKey: "craft" },
        { word: "пилотная фаза", definition: "1", audioKey: "pilot phase" },
        { word: "смирение", definition: "1", audioKey: "humility" },
        {
          word: "опытный оператор",
          definition: "1",
          audioKey: "veteran operator",
        },
        { word: "безупречно", definition: "1", audioKey: "flawlessly" },
        { word: "аукцион", definition: "1", audioKey: "auction" },
        { word: "поучительный", definition: "1", audioKey: "instructive" },
        {
          word: "журнал производительности",
          definition: "1",
          audioKey: "performance logs",
        },
      ],
      "5": [
        {
          word: "однополосный мост",
          definition: "1",
          audioKey: "single-lane bridge",
        },
        { word: "тупик", definition: "1", audioKey: "deadlock" },
        { word: "хореография", definition: "1", audioKey: "choreography" },
        { word: "иерархия", definition: "1", audioKey: "hierarchy" },
        { word: "задний ход", definition: "1", audioKey: "reverse gear" },
        { word: "сигналы руками", definition: "1", audioKey: "hand signals" },
        { word: "причал", definition: "1", audioKey: "quay" },
        { word: "застрявший", definition: "1", audioKey: "wedged" },
        { word: "кипел от злости", definition: "1", audioKey: "fumed" },
        {
          word: "поэтапное отступление",
          definition: "1",
          audioKey: "staggered retreat",
        },
      ],
      "6": [
        {
          word: "таможенный брокер",
          definition: "1",
          audioKey: "customs broker",
        },
        { word: "опечатка", definition: "1", audioKey: "typo" },
        {
          word: "продублированные записи",
          definition: "1",
          audioKey: "duplicate entries",
        },
        { word: "сверить данные", definition: "1", audioKey: "reconcile" },
        { word: "экстренная доставка", definition: "1", audioKey: "hotshot" },
        {
          word: "критичный по времени",
          definition: "1",
          audioKey: "time-critical",
        },
        {
          word: "соглашение об уровне сервиса",
          definition: "1",
          audioKey: "service level agreement",
        },
        { word: "несоответствие", definition: "1", audioKey: "mismatch" },
        { word: "каннибализировать", definition: "1", audioKey: "cannibalize" },
        { word: "сбой сканера", definition: "1", audioKey: "scanner hiccup" },
        {
          word: "логистический кошмар",
          definition: "1",
          audioKey: "logistic nightmare",
        },
      ],
      "7": [
        {
          word: "нерегулярный график",
          definition: "1",
          audioKey: "irregular hours",
        },
        {
          word: "летучее соединение",
          definition: "1",
          audioKey: "volatile compound",
        },
        {
          word: "столкновение расписаний",
          definition: "1",
          audioKey: "calendar collisions",
        },
        {
          word: "использовать как оружие",
          definition: "1",
          audioKey: "weaponize",
        },
        { word: "вендетта", definition: "1", audioKey: "vendetta" },
        { word: "семейный совет", definition: "1", audioKey: "family council" },
        {
          word: "объявить красный день",
          definition: "1",
          audioKey: "declare a red day",
        },
        {
          word: "сложные проценты",
          definition: "1",
          audioKey: "compound interest",
        },
        {
          word: "брошенная кружка",
          definition: "1",
          audioKey: "abandoned mug",
        },
        { word: "быть редким", definition: "1", audioKey: "be scarce" },
      ],
      "8": [
        {
          word: "фиксирование стоимости топлива",
          definition: "1",
          audioKey: "fuel hedges",
        },
        { word: "честность", definition: "1", audioKey: "integrity" },
        { word: "хрупкость", definition: "1", audioKey: "fragility" },
        { word: "устойчивость", definition: "1", audioKey: "sturdiness" },
        { word: "фонд оплаты труда", definition: "1", audioKey: "payroll" },
        { word: "якорь", definition: "1", audioKey: "anchor" },
        {
          word: "использование мощностей",
          definition: "1",
          audioKey: "utilisation",
        },
        { word: "столбик", definition: "1", audioKey: "bollard" },
        { word: "пиковая доходность", definition: "1", audioKey: "peak yield" },
        {
          word: "клыки",
          definition: "1",
          audioKey: "fangs",
        },
        { word: "хрупкий", definition: "1", audioKey: "brittle" },
        { word: "добрая воля", definition: "1", audioKey: "goodwill" },
        { word: "милость", definition: "1", audioKey: "grace" },
      ],
      "9": [
        {
          word: "авиационная накладная",
          definition: "1",
          audioKey: "airway bill",
        },
        { word: "объезд", definition: "1", audioKey: "detour" },
        { word: "колонизировать", definition: "1", audioKey: "colonise" },
        {
          word: "переместил товар между складами",
          definition: "1",
          audioKey: "lateral swap",
        },
        {
          word: "схема удержания сотрудников",
          definition: "1",
          audioKey: "retention schemes",
        },
        { word: "неприкосновенный", definition: "1", audioKey: "sacred" },
        { word: "граница", definition: "1", audioKey: "boundary" },
        {
          word: "холодильная цепь",
          definition: "1",
          audioKey: "cold-chain facility",
        },
        {
          word: "провозгласить правило",
          definition: "1",
          audioKey: "declare a rule",
        },
        {
          word: "месть",
          definition: "1",
          audioKey: "revenge",
        },
        {
          word: "поддоны",
          definition: "1",
          audioKey: "pallets",
        },
        {
          word: "пропустил доставку",
          definition: "1",
          audioKey: "missed a handover",
        },
      ],
      "10": [
        { word: "режим полёта", definition: "1", audioKey: "airplane mode" },
        { word: "внезапный шквал", definition: "1", audioKey: "freak squall" },
        { word: "диспетчер", definition: "1", audioKey: "dispatcher" },
        { word: "сверхурочная работа", definition: "1", audioKey: "overtime" },
        {
          word: "надбавка за вредность",
          definition: "1",
          audioKey: "hazard pay",
        },
        { word: "отклонение", definition: "1", audioKey: "variance" },
        { word: "ритм", definition: "1", audioKey: "cadence" },
        { word: "прогулка", definition: "1", audioKey: "promenade" },
        {
          word: "доверяй, но проверяй",
          definition: "1",
          audioKey: "trust but verify",
        },
        { word: "перенаправить", definition: "1", audioKey: "reroute" },
        // { word: "вестибюль", definition: "1", audioKey: "vestibule" },
        { word: "неохотно", definition: "1", audioKey: "grudgingly" },
        { word: "расслабиться", definition: "1", audioKey: "unwind" },
      ],
    },
  },
};
