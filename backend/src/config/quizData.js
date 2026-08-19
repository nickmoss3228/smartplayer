// config/quizData.js
//
// Full authoritative quiz content per story part, keyed by
// difficulty -> storyId -> partNumber. This is the server-side counterpart of
// the `quiz` arrays in the frontend's `src/modules/audiodata/audioData*.ts(x)`
// files, extracted from there so the backend can both grade submissions AND
// serve quiz questions without ever sending `correctAnswer` to the client.
//
// If quiz content changes on the frontend, this file must be updated to
// match by hand, or scoring/serving will use stale data.
//
// "leo-additional" part 2 is intentionally an empty array — that story
// part's quiz content doesn't exist yet on the frontend either (placeholder).

export const quizData = {
  "easy": {
    "leo": {
      "1": [
        {
          "question": "How old is Leo?",
          "options": [
            "20",
            "22",
            "25",
            "18"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q1-slow.mp3"
          }
        },
        {
          "question": "What is the name of Leo's cat?",
          "options": [
            "Ginger",
            "Tiger",
            "Fluffy",
            "Shadow"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q2-slow.mp3"
          }
        },
        {
          "question": "Where does Leo work?",
          "options": [
            "At a bank",
            "At a school",
            "At a restaurant",
            "At a local shop"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q3-slow.mp3"
          }
        },
        {
          "question": "What is the name of the town where Leo lives?",
          "options": [
            "Moscow",
            "London",
            "Saint-Petersburg",
            "Paris"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q4-slow.mp3"
          }
        },
        {
          "question": "What does Leo enjoy doing in his free time?",
          "options": [
            "Playing videogames",
            "Listening to music and birds",
            "Walking in the forest",
            "Drinking coffee"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/1.leo's%20life/q5-slow.mp3"
          }
        }
      ],
      "2": [
        {
          "question": "What time does Leo usually wake up?",
          "options": [
            "Seven o'clock",
            "Eight o'clock",
            "Six o'clock",
            "Five o'clock"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q1slow.mp3"
          }
        },
        {
          "question": "What does Leo usually eat for breakfast?",
          "options": [
            "Porridge and fruit",
            "Eggs with avocado and toast",
            "Cereal and milk",
            "Pancakes and juice"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q2slow.mp3"
          }
        },
        {
          "question": "What happened on the bad Monday morning?",
          "options": [
            "Leo missed the bus",
            "Leo's cat ran away",
            "Leo woke up late and forgot to feed Ginger",
            "Leo forgot his keys"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q3slow.mp3"
          }
        },
        {
          "question": "What did Leo's boss say about his work?",
          "options": [
            "His sales were going up",
            "He was doing great",
            "His sales were going down",
            "He needed to work faster"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q4slow.mp3"
          }
        },
        {
          "question": "What did Leo do at the end of the bad day?",
          "options": [
            "He went for a walk",
            "He called his boss",
            "He watched a TV show about animals",
            "He cooked dinner for Ginger"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/2.%20leo's%20mornings/q5slow.mp3"
          }
        }
      ],
      "3": [
        {
          "question": "What is Leo's favorite food?",
          "options": [
            "Pasta",
            "Burgers",
            "Pizza",
            "Lasagna"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q1slow.mp3"
          }
        },
        {
          "question": "What toppings does Leo like on his pizza?",
          "options": [
            "Bell peppers",
            "Mushrooms",
            "Olives",
            "Cheese"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q2slow.mp3"
          }
        },
        {
          "question": "Where does Leo buy fresh dough?",
          "options": [
            "At work",
            "In the market",
            "In the supermarket",
            "He makes it at home"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q3slow.mp3"
          }
        },
        {
          "question": "What does Leo's mother make every Sunday?",
          "options": [
            "Sandwiches",
            "Apple pie",
            "Lasagna",
            "Pizza"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q4slow.mp3"
          }
        },
        {
          "question": "What meal does Leo's cat Ginger really like?",
          "options": [
            "Pizza",
            "Pasta",
            "Burgers",
            "Lasagna"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/3.%20leo's%20favorite%20food/q5slow.mp3"
          }
        }
      ],
      "4": [
        {
          "question": "What is Leo's mother's job",
          "options": [
            "At a university",
            "At a local shop",
            "At an art gallery",
            "At a school"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q1slow.mp3"
          }
        },
        {
          "question": "What does Leo's father do?",
          "options": [
            "He is a teacher",
            "He runs a business",
            "He works at a shop",
            "He is an engineer"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q2slow.mp3"
          }
        },
        {
          "question": "What is Leo's sister's name?",
          "options": [
            "Layla",
            "Maya",
            "Mia",
            "Tina"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q3slow.mp3"
          }
        },
        {
          "question": "What country does the Leo's family want to visit?",
          "options": [
            "Vietnam",
            "Cambodia",
            "China",
            "Thailand"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q4slow.mp3"
          }
        },
        {
          "question": "What did Tom do when he was young - in Leo's opinion?",
          "options": [
            "A basketball player",
            "A football player",
            "A volleyball player",
            "A baseball player"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/4.%20leo's%20family/q5slow.mp3"
          }
        }
      ],
      "5": [
        {
          "question": "What does Leo usually wear when he is not at work?",
          "options": [
            "A suit and tie",
            "Shorts and sandals",
            "Jeans and a T-shirt",
            "Sweaters and boots"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q1slow.mp3"
          }
        },
        {
          "question": "What color is Leo's favorite T-shirt?",
          "options": [
            "White",
            "Red",
            "Black",
            "Blue"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q2slow.mp3"
          }
        },
        {
          "question": "What does Leo usually wear for work?",
          "options": [
            "Jeans and a T-shirt",
            "A white shirt and black trousers",
            "A suit and tie",
            "A uniform with a logo"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q3slow.mp3"
          }
        },
        {
          "question": "What party idea does Leo suggest to Ted?",
          "options": [
            "A costume party",
            "A sports party",
            "A pyjama party",
            "A formal dinner"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q4slow.mp3"
          }
        },
        {
          "question": "What were Leo and Ted wearing at the party in December?",
          "options": [
            "Woolen sweaters",
            "T-Shirts",
            "Pyjamas",
            "White shirts and black trousers"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/5.%20leo's%20clothes/q5slow.mp3"
          }
        }
      ],
      "6": [
        {
          "question": "How old were Leo and Jessica when they were at the beach?",
          "options": [
            "Eight",
            "Ten",
            "Nine",
            "Twelve"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q1slow.mp3"
          }
        },
        {
          "question": "What did Leo build on the beach with his sister?",
          "options": [
            "A sand sculpture",
            "A big castle",
            "A fort",
            "A sand house"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q2slow.mp3"
          }
        },
        {
          "question": "What did Leo's father want to teach him at the beach?",
          "options": [
            "How to surf",
            "How to fish",
            "How to sail",
            "How to swim in the sea"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q3slow.mp3"
          }
        },
        {
          "question": "What did they see while swimming?",
          "options": [
            "A shark",
            "A dolphin",
            "A whale",
            "A big fish"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q4slow.mp3"
          }
        },
        {
          "question": "How did Leo learn to swim?",
          "options": [
            "His father taught him slowly",
            "He took swimming lessons",
            "He was scared by the shark and swam quickly",
            "His sister helped him"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/6.%20a%20day%20at%20the%20beach/q5slow.mp3"
          }
        }
      ],
      "7": [
        {
          "question": "Which country does Leo dream of visiting?",
          "options": [
            "France",
            "Spain",
            "Italy",
            "England"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q1slow.mp3"
          }
        },
        {
          "question": "What does Leo want to see in Rome?",
          "options": [
            "Modern museums",
            "The old buildings and ruins",
            "Shopping centers",
            "Famous restaurants"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q2slow.mp3"
          }
        },
        {
          "question": "What does Leo want to do in Venice?",
          "options": [
            "Visit churches",
            "Take photos",
            "Go shopping",
            "Ride a gondola"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q3slow.mp3"
          }
        },
        {
          "question": "How does Leo save money for his trip?",
          "options": [
            "He works overtime",
            "He borrows from his family",
            "He doesn't save money",
            "He saves a little each month"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q4slow.mp3"
          }
        },
        {
          "question": "Why does Leo say about France?",
          "options": [
            "He loves France",
            "His friend told him bad things about it",
            "His French car breaks every month",
            "He doesn't like French food"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/7.%20a%20country%20that%20Leo%20wants%20to%20visit/q5slow.mp3"
          }
        }
      ],
      "8": [
        {
          "question": "What is Leo's favorite sport?",
          "options": [
            "Tennis",
            "Basketball",
            "Football",
            "Swimming"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q1slow.mp3"
          }
        },
        {
          "question": "What is Leo and his father's favorite football team?",
          "options": [
            "Liverpool",
            "Chelsea",
            "Arsenal",
            "Manchester United"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q2slow.mp3"
          }
        },
        {
          "question": "Where does Leo play football after work?",
          "options": [
            "On the street",
            "On the stadium",
            "On the sports field",
            "At home"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q3slow.mp3"
          }
        },
        {
          "question": "What TV series is Leo watching at the moment?",
          "options": [
            "Friends",
            "The Office",
            "Game of Thrones",
            "Breaking Bad"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q4slow.mp3"
          }
        },
        {
          "question": "How many DVDs does Leo's collection have?",
          "options": [
            "One hundred",
            "One hundred fifty",
            "One hundred thirty-seven",
            "Two hundred"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/8.%20leo's%20hobbies/q5slow.mp3"
          }
        }
      ],
      "9": [
        {
          "question": "Who did Leo meet for coffee?",
          "options": [
            "His cousin",
            "His colleague",
            "His old school friend Sam",
            "His neighbor"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q1slow.mp3"
          }
        },
        {
          "question": "Where did Leo and Sam meet?",
          "options": [
            "At a small cafe near the park",
            "At Leo's house",
            "At the sports center",
            "At work"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q2slow.mp3"
          }
        },
        {
          "question": "What did Leo and Sam do when they skipped school?",
          "options": [
            "They went to the cinema",
            "They went to play football",
            "They went to Dodo Pizza",
            "They went to the park"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q3slow.mp3"
          }
        },
        {
          "question": "What is Sam's job now?",
          "options": [
            "Teacher",
            "Engineer in an international company",
            "Shop assistant",
            "Doctor"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q4slow.mp3"
          }
        },
        {
          "question": "Where is Sam going for a work trip?",
          "options": [
            "France",
            "Italy",
            "Germany",
            "England"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/9.%20meeting%20a%20friend/q5slow.mp3"
          }
        }
      ],
      "10": [
        {
          "question": "Where did Leo find the kitten?",
          "options": [
            "In a box",
            "Under a car",
            "In the park",
            "On the street"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q1fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q1slow.mp3"
          }
        },
        {
          "question": "What did Leo give the kitten first?",
          "options": [
            "Cat food",
            "Cookies",
            "Cold water",
            "Warm milk"
          ],
          "correctAnswer": 3,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q2fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q2slow.mp3"
          }
        },
        {
          "question": "Who helped Leo with medicine for the kitten?",
          "options": [
            "His mother",
            "A neighbor",
            "His sister Mia",
            "A vet clinic"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q3fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q3slow.mp3"
          }
        },
        {
          "question": "How did Leo try to find the kitten's owners?",
          "options": [
            "He called the police",
            "He asked his neighbors",
            "He made posters and posted online",
            "He went to the vet"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q4fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q4slow.mp3"
          }
        },
        {
          "question": "Who came to take the kitten?",
          "options": [
            "An old man",
            "A young couple",
            "Another cat owner",
            "A little girl and her mother"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q5fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/leo/quiz/10.%20the%20lost%20kitten/q5slow.mp3"
          }
        }
      ]
    },
    "leo-additional": {
      "1": [
        {
          "question": "What does Ava talk about with Kate?",
          "options": [
            "About work",
            "About new photos",
            "About her brother Leo",
            "About relationships"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "How does Katrin feel about Leo?",
          "options": [
            "She likes him",
            "They are best friends with Leo",
            "They are not friends",
            "She hates him"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "What does Leo do at the store where he works?",
          "options": [
            "He is the owner",
            "He does all the design work",
            "He sells clothes",
            "He bakes bread only"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "Why did Katrin go to Leo's place?",
          "options": [
            "To buy pastries",
            "To meet his cat",
            "To ask him to help with her term paper",
            "To interview him for a story"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "When do Ava and Kate agree to meet up?",
          "options": [
            "Tomorrow morning",
            "Tomorrow evening",
            "The day after tomorrow, in the evening",
            "Next weekend"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        }
      ],
      "2": [
        {
          "question": "Who is Leo, according to Ava?",
          "options": [
            "Sofia's cousin",
            "Mia's brother",
            "Kate's neighbor",
            "Ava's coworker"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "When did Leo post a new story on Instagram?",
          "options": [
            "In the morning",
            "In the afternoon",
            "In the evening",
            "At night"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "How old is Ava's brother?",
          "options": [
            "22",
            "23",
            "24",
            "25"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "Who is Leo dating, according to Sofia?",
          "options": [
            "Mia",
            "Ava",
            "Catherine",
            "Sofia herself"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        },
        {
          "question": "How long have Leo and Catherine reportedly been together?",
          "options": [
            "Three months",
            "Six months",
            "One year",
            "Two years"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "1",
            "slow": "1"
          }
        }
      ]
    },
    // ── News and Interesting things ───────────────────────────────────────
    // Part 1 = source article, part 2 = the linked conversation.
    //
    // roland-garros and grazing-board have real fast/slow question recordings
    // in the bucket under the same layout the static stories use:
    //   <slug>/quiz/<track folder>/qN-{fast,slow}.mp3
    // where <track folder> matches trackFolderMap in the frontend's
    // modules/vocabulary/Vocabulary.ts ("1. story" / "2. discussion"), so the
    // quiz clips sit next to that part's vocab/ and phrasal-verbs/ folders.
    //
    // family-visit still uses the "1" placeholder that leo-additional uses —
    // its recordings don't exist yet, and nothing reads these strings as URLs
    // until they're replaced with real paths.
    "news-roland-garros": {
      "1": [
        {
          "question": "How old was Mirra Andreeva on the day of her victory?",
          "options": [
            "17 years and 39 days",
            "18 years and 39 days",
            "19 years and 39 days",
            "20 years and 39 days"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q1-slow.mp3"
          }
        },
        {
          "question": "Who did Andreeva defeat in the final?",
          "options": [
            "A Polish player",
            "A French player",
            "An American player",
            "Another Russian player"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q2-slow.mp3"
          }
        },
        {
          "question": "Including Andreeva, how many Russian women have won a Grand Slam tournament?",
          "options": [
            "Two",
            "Three",
            "Four",
            "Five"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q3-slow.mp3"
          }
        },
        {
          "question": "Which Russian player completed the career Grand Slam?",
          "options": [
            "Anastasia Myskina",
            "Svetlana Kuznetsova",
            "Maria Sharapova",
            "Mirra Andreeva"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q4-slow.mp3"
          }
        },
        {
          "question": "How much did Andreeva earn for winning the tournament?",
          "options": [
            "1.4 million euros",
            "2.8 million euros",
            "3.8 million euros",
            "2.4 million euros"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/1.%20story/q5-slow.mp3"
          }
        }
      ],
      "2": [
        {
          "question": "Why doesn't Sam know who Mirra Andreeva is?",
          "options": [
            "He doesn't follow tennis",
            "He was away on holiday",
            "He only watches women's sport",
            "He doesn't like sport at all"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q1-slow.mp3"
          }
        },
        {
          "question": "Which Russian tennis player does Sam remember?",
          "options": [
            "Anastasia Myskina",
            "Svetlana Kuznetsova",
            "Maria Sharapova",
            "Mirra Andreeva"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q2-slow.mp3"
          }
        },
        {
          "question": "What does Evelyn ask the others to do about the prize money?",
          "options": [
            "Look it up online",
            "Guess the amount",
            "Divide it by two",
            "Convert it into dollars"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q3-slow.mp3"
          }
        },
        {
          "question": "What is Evelyn not sure about?",
          "options": [
            "Whether the money was in dollars or euros",
            "Whether Andreeva won the final",
            "Whether Andreeva is Russian",
            "How many sets the final lasted"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q4-slow.mp3"
          }
        },
        {
          "question": "What does Ava want to do at the end of the conversation?",
          "options": [
            "Eat pizza before it gets cold",
            "Raise a glass of champagne to Andreeva",
            "Call Leo and Katrin",
            "Watch the final on television"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-roland-garros/quiz/2.%20discussion/q5-slow.mp3"
          }
        }
      ]
    },
    "news-family-visit": {
      "1": [
        {
          "question": "How many people took part in the survey?",
          "options": [
            "800",
            "1,800",
            "8,000",
            "18,000"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": { "fast": "1", "slow": "1" }
        },
        {
          "question": "Which two companies made the survey?",
          "options": [
            "Odnoklassniki and YuMoney",
            "VKontakte and Sberbank",
            "Odnoklassniki and Sberbank",
            "Telegram and YuMoney"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": { "fast": "1", "slow": "1" }
        },
        {
          "question": "What do 52% of people aged 18-26 NOT want on New Year's Eve?",
          "options": [
            "A traditional family dinner",
            "A party with friends",
            "Presents from their parents",
            "A photo on social media"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": { "fast": "1", "slow": "1" }
        },
        {
          "question": "What do people aged 27-42 spend most of their money on?",
          "options": [
            "Food and drinks",
            "Gifts",
            "Travel",
            "Decorations"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": { "fast": "1", "slow": "1" }
        },
        {
          "question": "Which two dishes must be on the table for almost everyone?",
          "options": [
            "Olivier salad and herring under a fur coat",
            "Pizza and sushi",
            "Olivier salad and lasagna",
            "Herring under a fur coat and apple pie"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": { "fast": "1", "slow": "1" }
        }
      ],
      "2": []
    },
    "news-grazing-board": {
      "1": [
        {
          "question": "What is a grazing board?",
          "options": [
            "A hot Italian main dish",
            "A big wooden board with cold food arranged on it",
            "A type of Italian bread",
            "A kitchen tool for slicing cheese"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q1-slow.mp3"
          }
        },
        {
          "question": "How much of the work should the trip to the store be?",
          "options": [
            "20%",
            "50%",
            "80%",
            "100%"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q2-slow.mp3"
          }
        },
        {
          "question": "What does the author say to do with the quail eggs?",
          "options": [
            "Boil them and leave them unpeeled for the guests",
            "Peel them and slice them thinly",
            "Fry them in olive oil",
            "Serve them raw with black pepper"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q3-slow.mp3"
          }
        },
        {
          "question": "What does the author suggest doing with the rye bread?",
          "options": [
            "Toasting it in the oven",
            "Pan-frying it in olive oil",
            "Serving it with honey",
            "Cutting it into triangles"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q4-slow.mp3"
          }
        },
        {
          "question": "Why should you NOT slice everything you bought?",
          "options": [
            "So you can keep refilling the board and nothing goes to waste",
            "Because slicing takes too long",
            "Because guests prefer whole food",
            "Because the board is too small"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/1.%20story/q5-slow.mp3"
          }
        }
      ],
      "2": [
        {
          "question": "Why does Katrin think pizza is a good choice?",
          "options": [
            "It's quick and convenient, with no cooking",
            "It's the cheapest option there is",
            "Everyone in the group likes Asian food",
            "Leo can make it in ten minutes"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q1-slow.mp3"
          }
        },
        {
          "question": "What is Evelyn's problem with pizza?",
          "options": [
            "It's too expensive",
            "She is tired of eating it every time",
            "She doesn't like Italian food at all",
            "It takes too long to make"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q2-slow.mp3"
          }
        },
        {
          "question": "What does Igor say about the price of sushi?",
          "options": [
            "It costs about the same as pizza",
            "It's much more expensive than pizza",
            "It's a lot cheaper than pizza",
            "He has no idea what it costs"
          ],
          "correctAnswer": 0,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q3-slow.mp3"
          }
        },
        {
          "question": "Where did Katrin read about the grazing board?",
          "options": [
            "In a magazine",
            "On Zen",
            "On social media",
            "In a cookbook"
          ],
          "correctAnswer": 1,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q4-slow.mp3"
          }
        },
        {
          "question": "What does the word \"grazing\" originally mean?",
          "options": [
            "Slicing food very thinly",
            "Cooking food on a wooden board",
            "When cows or sheep feed in a pasture",
            "Buying food on a tight budget"
          ],
          "correctAnswer": 2,
          "referenceTime": 0,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/news-grazing-board/quiz/2.%20discussion/q5-slow.mp3"
          }
        }
      ]
    }
  },
  "medium": {
    "maya": {
      "1": [
        {
          "question": "What is Maya's profession?",
          "options": [
            "A travel agent",
            "A journalist",
            "A photographer",
            "An online magazine editor"
          ],
          "correctAnswer": 1,
          "referenceTime": 3.1,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q1-slow.mp3"
          }
        },
        {
          "question": "What allows Maya the flexibility to travel?",
          "options": [
            "Her personal savings",
            "Her job at an online magazine",
            "Her family's support",
            "Freelance work"
          ],
          "correctAnswer": 1,
          "referenceTime": 9.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q2-slow.mp3"
          }
        },
        {
          "question": "What does Maya enjoy doing in her quiet moments?",
          "options": [
            "Watching movies",
            "Reflecting on experiences and writing them down",
            "Socializing with friends",
            "Planning new trips"
          ],
          "correctAnswer": 1,
          "referenceTime": 26.5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q3-slow.mp3"
          }
        },
        {
          "question": "What city does Maya currently live in?",
          "options": [
            "Kyoto",
            "Bangkok",
            "New York City",
            "London"
          ],
          "correctAnswer": 2,
          "referenceTime": 29.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q4-slow.mp3"
          }
        },
        {
          "question": "What two things is Maya passionate about?",
          "options": [
            "Eating street food and sunbathing",
            "Discovering different cultures and understanding diverse perspectives",
            "Interviewing celebrities and taking photos",
            "Learning new languages and reading books"
          ],
          "correctAnswer": 1,
          "referenceTime": 13.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/1.%20meet%20me/q5-slow.mp3"
          }
        }
      ],
      "2": [
        {
          "question": "Where did Maya's assignment take her last spring?",
          "options": [
            "Bangkok, Thailand",
            "Kyoto, Japan",
            "New York City, USA",
            "London, UK"
          ],
          "correctAnswer": 1,
          "referenceTime": 4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q1-slow.mp3"
          }
        },
        {
          "question": "What district was Maya particularly captivated by in Kyoto?",
          "options": [
            "Shibuya",
            "Gion",
            "Harajuku",
            "Akihabara"
          ],
          "correctAnswer": 1,
          "referenceTime": 11.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q2-slow.mp3"
          }
        },
        {
          "question": "What did Maya discover about the cost of living in Kyoto?",
          "options": [
            "It has decreased significantly",
            "It has remained stable",
            "It has risen up drastically in the past 10 years",
            "Locals were not concerned about it"
          ],
          "correctAnswer": 2,
          "referenceTime": 51.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q3-slow.mp3"
          }
        },
        {
          "question": "What helped Maya connect with local shopkeepers and artisans?",
          "options": [
            "Hiring a translator",
            "Using a translation app",
            "Learning a few basic Japanese phrases",
            "Speaking English loudly"
          ],
          "correctAnswer": 2,
          "referenceTime": 24.9,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q4-slow.mp3"
          }
        },
        {
          "question": "What was the result of Maya's articles about Japan?",
          "options": [
            "She was fired from her job",
            "She decided to quit her job",
            "She got promoted at her job",
            "She started her own magazine"
          ],
          "correctAnswer": 2,
          "referenceTime": 65.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/2.%20a%20trip%20to%20kyoto/q5-slow.mp3"
          }
        }
      ],
      "3": [
        {
          "question": "Where did Maya's company send her after her visit to Japan?",
          "options": [
            "Kyoto",
            "Bangkok, Thailand",
            "New York City",
            "Hanoi, Vietnam"
          ],
          "correctAnswer": 1,
          "referenceTime": 3.1,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q1-slow.mp3"
          }
        },
        {
          "question": "What was Maya's primary research objective in Bangkok?",
          "options": [
            "To study ancient temples",
            "To explore the nightlife scene",
            "To research local street food culture",
            "To learn the Thai language"
          ],
          "correctAnswer": 2,
          "referenceTime": 20.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q2-slow.mp3"
          }
        },
        {
          "question": "Which of these foods did Maya try in Bangkok?",
          "options": [
            "Sushi",
            "Fried insect",
            "Pizza",
            "Tacos"
          ],
          "correctAnswer": 1,
          "referenceTime": 36.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q3-slow.mp3"
          }
        },
        {
          "question": "What was Maya's main takeaway regarding the atmosphere of Bangkok's street food scene?",
          "options": [
            "It was boring and uneventful",
            "It was quiet and peaceful",
            "It was vibrant and full of stories",
            "It was too crowded and chaotic"
          ],
          "correctAnswer": 2,
          "referenceTime": 50,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q4-slow.mp3"
          }
        },
        {
          "question": "What health issue did Maya experience after her trip to Bangkok?",
          "options": [
            "A bad cold",
            "A nasty stomach bug",
            "Jet lag",
            "A minor allergic reaction"
          ],
          "correctAnswer": 1,
          "referenceTime": 64.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/3.%20trying%20street%20food%20in%20bangkok/q5-slow.mp3"
          }
        }
      ],
      "4": [
        {
          "question": "What was Maya's role at the company a year ago?",
          "options": [
            "Senior journalist",
            "Intern journalist",
            "Editor-in-chief",
            "Freelance writer"
          ],
          "correctAnswer": 1,
          "referenceTime": 8.1,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q1-slow.mp3"
          }
        },
        {
          "question": "Where was Maya supposed to travel for her first job abroad?",
          "options": [
            "France",
            "Germany",
            "Italy",
            "Spain"
          ],
          "correctAnswer": 1,
          "referenceTime": 14.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q2-slow.mp3"
          }
        },
        {
          "question": "What was the initial problem Maya encountered during her travel?",
          "options": [
            "She lost her passport",
            "Her train was delayed, causing her to miss a connection",
            "She missed her flight",
            "She got lost in Prague"
          ],
          "correctAnswer": 1,
          "referenceTime": 26.7,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q3-slow.mp3"
          }
        },
        {
          "question": "In which city did Maya miss her connecting train?",
          "options": [
            "Prague",
            "Berlin",
            "Dresden",
            "Frankfurt"
          ],
          "correctAnswer": 2,
          "referenceTime": 29.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q4-slow.mp3"
          }
        },
        {
          "question": "What did Maya visit in Dresden that she wouldn't have otherwise?",
          "options": [
            "The Brandenburg Gate",
            "The Eiffel Tower",
            "The Semper Opera",
            "The Colosseum"
          ],
          "correctAnswer": 2,
          "referenceTime": 68.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/4.%20a%20missed%20connection/q5-slow.mp3"
          }
        }
      ],
      "5": [
        {
          "question": "What kind of accommodation does Maya often use to save money?",
          "options": [
            "Luxury hotels",
            "Hostels or guesthouses",
            "Airbnbs exclusively",
            "Resorts"
          ],
          "correctAnswer": 1,
          "referenceTime": 10.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q1-slow.mp3"
          }
        },
        {
          "question": "Where does Maya often eat to save money?",
          "options": [
            "High-end restaurants",
            "Fast food chains",
            "Local markets",
            "Hotel room service"
          ],
          "correctAnswer": 2,
          "referenceTime": 14,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q2-slow.mp3"
          }
        },
        {
          "question": "What is Maya's opinion on food in cheaper places?",
          "options": [
            "It's usually bland and uninteresting",
            "It's much tastier than in expensive ones",
            "It's often unhealthy",
            "She avoids it completely"
          ],
          "correctAnswer": 1,
          "referenceTime": 21.7,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q3-slow.mp3"
          }
        },
        {
          "question": "What does Maya create before each trip?",
          "options": [
            "A detailed itinerary for sightseeing",
            "A list of emergency contacts",
            "A detailed budget",
            "A packing list"
          ],
          "correctAnswer": 2,
          "referenceTime": 37.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q4-slow.mp3"
          }
        },
        {
          "question": "What does Maya use to track her spending?",
          "options": [
            "A notebook and pen",
            "Travel apps",
            "Her bank statements",
            "She doesn't track it"
          ],
          "correctAnswer": 1,
          "referenceTime": 69.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/5.%20family%20across%20borders/q5-slow.mp3"
          }
        }
      ],
      "6": [
        {
          "question": "Where did Maya visit last week to write an article about environmental pollution?",
          "options": [
            "A large city in China",
            "A small coastal village in Vietnam",
            "A desert community in Africa",
            "An island nation in the Pacific"
          ],
          "correctAnswer": 1,
          "referenceTime": 3.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q1-slow.mp3"
          }
        },
        {
          "question": "Who did Maya have a long conversation with about the impact of pollution?",
          "options": [
            "A local farmer",
            "A government official",
            "A local fisherman",
            "A tour guide"
          ],
          "correctAnswer": 2,
          "referenceTime": 18,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q2-slow.mp3"
          }
        },
        {
          "question": "What issues did the fisherman mention regarding pollution?",
          "options": [
            "Rising sea levels and coral bleaching",
            "Declining fish stocks and plastic waste in nets",
            "Oil spills and overfishing",
            "Noise pollution and air pollution"
          ],
          "correctAnswer": 1,
          "referenceTime": 23.9,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q3-slow.mp3"
          }
        },
        {
          "question": "What percentage of the local water supply in the village is clean enough?",
          "options": [
            "50%",
            "75%",
            "20%",
            "100%"
          ],
          "correctAnswer": 2,
          "referenceTime": 38.7,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q4-slow.mp3"
          }
        },
        {
          "question": "How did Maya's newspaper react to her work on environmental concerns?",
          "options": [
            "They were indifferent",
            "They were delighted",
            "They were critical",
            "They asked her to rewrite it"
          ],
          "correctAnswer": 1,
          "referenceTime": 64.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/6.%20budgeting%20for%20adventure/q5-slow.mp3"
          }
        }
      ],
      "7": [
        {
          "question": "Where was the journalist sent to write a story about local crafts?",
          "options": [
            "Italy",
            "Morocco",
            "Germany",
            "Vietnam"
          ],
          "correctAnswer": 1,
          "referenceTime": 3.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q1-slow.mp3"
          }
        },
        {
          "question": "How did the journalist primarily communicate with the old craftsman who didn't speak English?",
          "options": [
            "Through an interpreter",
            "Using a phone's translation app and gestures",
            "By learning some Arabic quickly",
            "She didn't communicate with him"
          ],
          "correctAnswer": 1,
          "referenceTime": 35.6,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q2-slow.mp3"
          }
        },
        {
          "question": "What did the craftsman's father teach him about making leather bags?",
          "options": [
            "How to dye the leather",
            "How to cut the leather so the bag would stay strong",
            "How to stitch patterns",
            "How to sell them at the market"
          ],
          "correctAnswer": 1,
          "referenceTime": 44.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q3-slow.mp3"
          }
        },
        {
          "question": "What challenge did the craftsman mention regarding his craft?",
          "options": [
            "Lack of customers",
            "Special leather was harder to find and younger people were leaving the craft",
            "Too much competition",
            "High cost of tools"
          ],
          "correctAnswer": 1,
          "referenceTime": 56,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q4-slow.mp3"
          }
        },
        {
          "question": "What was the journalist's reaction to missing her next meeting because of the interview?",
          "options": [
            "She was very upset",
            "She didn't care",
            "She rushed to her next meeting",
            "She called her editor to apologize"
          ],
          "correctAnswer": 1,
          "referenceTime": 72.9,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/7.%20discussing%20environmental%20concerns/q5-slow.mp3"
          }
        }
      ],
      "8": [
        {
          "question": "Where do the journalist's parents live?",
          "options": [
            "Italy",
            "Canada",
            "Germany",
            "United States"
          ],
          "correctAnswer": 1,
          "referenceTime": 8.1,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q1-slow.mp3"
          }
        },
        {
          "question": "What is the profession of the journalist's older brother?",
          "options": [
            "Artist",
            "Engineer",
            "Journalist",
            "Teacher"
          ],
          "correctAnswer": 1,
          "referenceTime": 10.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q2-slow.mp3"
          }
        },
        {
          "question": "How does the family primarily stay connected despite being spread across the world?",
          "options": [
            "Sending postcards",
            "Regular video calls, group chat, and voice notes",
            "Meeting in person every month",
            "Emails only"
          ],
          "correctAnswer": 1,
          "referenceTime": 19,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q3-slow.mp3"
          }
        },
        {
          "question": "What did the journalist do when she visited her sister in Italy?",
          "options": [
            "Went sightseeing",
            "Visited her sister's art studio and watched her paint",
            "Attended a concert",
            "Helped her sister move"
          ],
          "correctAnswer": 1,
          "referenceTime": 41.6,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q4-slow.mp3"
          }
        },
        {
          "question": "What does family provide for the journalist, especially with her work keeping her on the move?",
          "options": [
            "Financial support",
            "Steady support and a sense of belonging",
            "New job opportunities",
            "Travel advice"
          ],
          "correctAnswer": 1,
          "referenceTime": 75.5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/8.%20an%20unexpected%20interview/q5-slow.mp3"
          }
        }
      ],
      "9": [
        {
          "question": "Where was the journalist sent to cover a mountain festival?",
          "options": [
            "Andes Mountains",
            "Peruvian highlands",
            "Himalayan mountains",
            "Rocky Mountains"
          ],
          "correctAnswer": 1,
          "referenceTime": 6.2,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q1-slow.mp3"
          }
        },
        {
          "question": "What type of festival was the journalist sent to cover?",
          "options": [
            "A modern music festival",
            "An ancient mountain festival tied to weather, harvests, and ancestral memory",
            "A food festival",
            "A craft fair"
          ],
          "correctAnswer": 1,
          "referenceTime": 8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q2-slow.mp3"
          }
        },
        {
          "question": "How did the villagers initially react to the journalist?",
          "options": [
            "They were very welcoming",
            "They were cautious, looking at the outsider with polite reserve",
            "They ignored her",
            "They asked her to leave"
          ],
          "correctAnswer": 1,
          "referenceTime": 51.6,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q3-slow.mp3"
          }
        },
        {
          "question": "What did the journalist do that seemed to gain the villagers' trust?",
          "options": [
            "She bought many souvenirs",
            "She helped a family set up an altar of corn and coca leaves",
            "She offered them money",
            "She performed a song"
          ],
          "correctAnswer": 1,
          "referenceTime": 56.7,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q4-slow.mp3"
          }
        },
        {
          "question": "What did the elders invite the journalist to do by sunset?",
          "options": [
            "To join the dancers",
            "To sit on the plaza's edge while a line of dancers went toward the mountain",
            "To have dinner with them",
            "To interview them immediately"
          ],
          "correctAnswer": 1,
          "referenceTime": 63.9,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/9.%20the%20mountain%20festival%20part%201/q5-slow.mp3"
          }
        }
      ],
      "10": [
        {
          "question": "What happened under the clear night sky during the festival?",
          "options": [
            "A fireworks display",
            "The festival deepened, with torches lighting paths and drums pounding",
            "A silent meditation",
            "Everyone went to sleep"
          ],
          "correctAnswer": 1,
          "referenceTime": 9.5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q1-slow.mp3"
          }
        },
        {
          "question": "What did the journalist observe about young people during the festival?",
          "options": [
            "They were bored and left early",
            "They were in traditional dress, using smartphones to record moments their grandparents learned by heart",
            "They were singing modern songs",
            "They were performing a dance solo"
          ],
          "correctAnswer": 1,
          "referenceTime": 33.5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q2-slow.mp3"
          }
        },
        {
          "question": "What kind of food was shared communally during the festival?",
          "options": [
            "Pizza and soda",
            "Stews thick with local tubers, roasted corn, and a warm brew",
            "Fast food from the city",
            "Only fruit"
          ],
          "correctAnswer": 1,
          "referenceTime": 43.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q3-slow.mp3"
          }
        },
        {
          "question": "What happened when a dancer performed a solo meant to call rain?",
          "options": [
            "The village erupted in cheers",
            "The village fell into a hush so complete the journalist could hear her own breathing",
            "Everyone started dancing",
            "It immediately started raining"
          ],
          "correctAnswer": 1,
          "referenceTime": 61.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q4-slow.mp3"
          }
        },
        {
          "question": "What did the journalist realize this story was about, beyond documenting rituals?",
          "options": [
            "The beauty of nature",
            "Witnessing continuity, vulnerability, and resilience",
            "The economic impact of tourism",
            "The challenges of remote travel"
          ],
          "correctAnswer": 1,
          "referenceTime": 76.8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/maya/quiz/10.%20the%20mountain%20festival%20part%202/q5-slow.mp3"
          }
        }
      ]
    }
  },
  "hard": {
    "daniel": {
      "1": [
        {
          "question": "How old is Daniel Mercer, and what is his profession?",
          "options": [
            "A travel writer in his early forties",
            "A 52-year-old English businessman",
            "A 48-year-old logistics consultant",
            "A retired entrepreneur in his sixties"
          ],
          "correctAnswer": 1,
          "referenceTime": 4.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q1-slow.mp3"
          }
        },
        {
          "question": "What three things did Daniel use to start his logistics company fifteen years ago?",
          "options": [
            "A bank loan, an office, and a small team",
            "Two laptops, one borrowed van, and a patient spouse",
            "One truck, a warehouse, and three employees",
            "A government grant and an inherited business"
          ],
          "correctAnswer": 1,
          "referenceTime": 10.3,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q2-slow.mp3"
          }
        },
        {
          "question": "What lesson did the rhythm of Daniel's coastal hometown teach him?",
          "options": [
            "That the sea is unpredictable and must always be respected",
            "That community matters more than personal ambition",
            "That timing matters — miss the tide and you wait",
            "That hard physical work builds lasting character"
          ],
          "correctAnswer": 2,
          "referenceTime": 27,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q3-slow.mp3"
          }
        },
        {
          "question": "How does Daniel describe his calm demeanor?",
          "options": [
            "A natural gift he was born with",
            "Inherited from his father's disciplined example",
            "Trained through navigating difficult situations, not gifted",
            "The result of daily meditation and journaling"
          ],
          "correctAnswer": 2,
          "referenceTime": 68.4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q4-slow.mp3"
          }
        },
        {
          "question": "What is Daniel's three-step habit for dealing with problems?",
          "options": [
            "Research solutions, delegate tasks, and review outcomes",
            "Ignore the issue, wait for clarity, then act decisively",
            "Write the problem down, name the worst-case scenario, and design three exits",
            "Call a trusted advisor, make a financial plan, and execute quickly"
          ],
          "correctAnswer": 2,
          "referenceTime": 81.5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/1.%20introducing%20myself/q5-slow.mp3"
          }
        }
      ],
      "2": [
        {
          "question": "What was Daniel's first meaningful contract?",
          "options": [
            "Transporting furniture across the country",
            "Delivering medical equipment to a chain of clinics",
            "Shipping refrigerated goods to supermarkets",
            "Moving office supplies for a government agency"
          ],
          "correctAnswer": 1,
          "referenceTime": 5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q1-slow.mp3"
          }
        },
        {
          "question": "What three problems hit Daniel at the very start of the contract?",
          "options": [
            "A flood, a broken truck, and a lost invoice",
            "A staff strike, a missing shipment, and a client complaint",
            "Diesel prices spiked, a driver quit midweek, and the warehouse roof leaked",
            "A road closure, bad weather, and equipment failure"
          ],
          "correctAnswer": 2,
          "referenceTime": 18,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q2-slow.mp3"
          }
        },
        {
          "question": "When Daniel called his client to declare the problems, what did he ask for?",
          "options": [
            "A higher fee to cover unexpected losses",
            "An early termination of the contract",
            "Schedule flexibility, not a higher fee",
            "A short-term loan to bridge the cash gap"
          ],
          "correctAnswer": 2,
          "referenceTime": 38,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q3-slow.mp3"
          }
        },
        {
          "question": "What did Daniel learn about transparency from this experience?",
          "options": [
            "Transparency should only be used as a last resort",
            "Transparency is always enough on its own to solve problems",
            "Transparency is an asset, but only if paired with a plan",
            "Transparency makes clients lose confidence in you"
          ],
          "correctAnswer": 2,
          "referenceTime": 55,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q4-slow.mp3"
          }
        },
        {
          "question": "What rule did Daniel write in his notebook after this contract ended?",
          "options": [
            "\"Always negotiate the highest possible fee upfront.\"",
            "\"Never trust a client who asks for schedule flexibility.\"",
            "\"Price for volatility. If luck goes bad, can you survive?\"",
            "\"Complaining is cheap; solutions are currency.\""
          ],
          "correctAnswer": 2,
          "referenceTime": 75,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/2.%20the%20deal%20that%20nearly%20broke%20me/q5-slow.mp3"
          }
        }
      ],
      "3": [
        {
          "question": "Why did Daniel really fly to Munich for the logistics conference?",
          "options": [
            "He had been invited as a guest speaker",
            "He organised the conference himself",
            "He needed ideas to keep his business from struggling",
            "He was sent by his investors to scout new partners"
          ],
          "correctAnswer": 2,
          "referenceTime": 12,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q1-slow.mp3"
          }
        },
        {
          "question": "What surprising claim did the keynote speaker make about optimization?",
          "options": [
            "That optimization is mostly about advanced mathematics",
            "That optimization is a human coordination problem disguised by numbers",
            "That optimization requires expensive enterprise software",
            "That optimization is impossible without a large, stable team"
          ],
          "correctAnswer": 1,
          "referenceTime": 30,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q2-slow.mp3"
          }
        },
        {
          "question": "What metaphor did the speaker use after Daniel admitted his staff turnover was high?",
          "options": [
            "\"You're building a house on sand.\"",
            "\"You're running a race with no finish line.\"",
            "\"You're pouring fine wine into paper cups.\"",
            "\"You're planting seeds in frozen ground.\""
          ],
          "correctAnswer": 2,
          "referenceTime": 45,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q3-slow.mp3"
          }
        },
        {
          "question": "What six-month plan did Daniel sketch out in the beer hall after the conference?",
          "options": [
            "Cut costs, automate processes, and reduce staff headcount",
            "Raise baseline wages, rotate weekends, fund driver upskilling, build a loader-to-dispatcher path, add mentor ride-alongs, and tie bonuses to team error rates",
            "Hire new senior managers, upgrade software, and expand the fleet",
            "Outsource logistics, reduce routes, and renegotiate client contracts"
          ],
          "correctAnswer": 1,
          "referenceTime": 65,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q4-slow.mp3"
          }
        },
        {
          "question": "What compass did Munich ultimately give Daniel?",
          "options": [
            "Invest in the latest technology to stay ahead of competitors",
            "Always prioritise revenue growth over people management",
            "Systems succeed at the speed of trust",
            "Math is the only reliable foundation for logistics planning"
          ],
          "correctAnswer": 2,
          "referenceTime": 98,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/3.%20the%20conference%20in%20munich/q5-slow.mp3"
          }
        }
      ],
      "4": [
        {
          "question": "What new area did Daniel's company try to expand into?",
          "options": [
            "International shipping by sea",
            "Drone delivery services",
            "Refrigerated transport",
            "Pharmaceutical courier services"
          ],
          "correctAnswer": 2,
          "referenceTime": 8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q1-slow.mp3"
          }
        },
        {
          "question": "What caused the shipment of artisan cheeses to be spoiled?",
          "options": [
            "The driver took the wrong route and added hours to the journey",
            "The cheeses were packed incorrectly by the supplier",
            "Temperature fluctuations from reefers that weren't working properly",
            "A 24-hour delay at customs held the delivery back"
          ],
          "correctAnswer": 2,
          "referenceTime": 25,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q2-slow.mp3"
          }
        },
        {
          "question": "How did Eliza, the vendor's owner, respond when Daniel called after the spoiled shipment?",
          "options": [
            "She told him to be honest and offered to teach him the craft",
            "She demanded immediate full compensation and threatened legal action",
            "She refused to speak to him and cancelled all future contracts",
            "She was sympathetic and chose to waive the invoice"
          ],
          "correctAnswer": 0,
          "referenceTime": 50,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q3-slow.mp3"
          }
        },
        {
          "question": "What did Daniel do to learn the reefer trade properly after the failure?",
          "options": [
            "He hired an expensive industry consultant",
            "He took an online course in refrigerated logistics",
            "He spent three weekends shadowing a veteran reefer operator",
            "He sent his operations manager to an external training programme"
          ],
          "correctAnswer": 2,
          "referenceTime": 65,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q4-slow.mp3"
          }
        },
        {
          "question": "What policy did Daniel introduce for any new business line after this experience?",
          "options": [
            "A full financial audit before committing any capital",
            "A legal review and insurance assessment",
            "A pilot phase, a mentor, and a humility budget",
            "A six-month trial period with no active client commitments"
          ],
          "correctAnswer": 2,
          "referenceTime": 90,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/4.%20a%20failure%20with%20a%20silver%20lining/q5-slow.mp3"
          }
        }
      ],
      "5": [
        {
          "question": "Where is the single-lane stone bridge Daniel describes located?",
          "options": [
            "On the outskirts of London near his main depot",
            "On the north road out of his hometown, Southampton",
            "Near his first warehouse in the Midlands",
            "On a country road he used while driving through Munich"
          ],
          "correctAnswer": 1,
          "referenceTime": 10,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q1-slow.mp3"
          }
        },
        {
          "question": "What situation did Daniel find when he arrived at the bridge at dawn?",
          "options": [
            "A flooded road blocking all oncoming traffic",
            "Two cars at a standoff over right of way",
            "A removal lorry wedged like a cork with its reverse gear gone",
            "A broken-down tractor spilling its load across the lane"
          ],
          "correctAnswer": 2,
          "referenceTime": 20,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q2-slow.mp3"
          }
        },
        {
          "question": "How did Daniel choose to resolve the deadlock at the bridge?",
          "options": [
            "He called the police and waited for official help to arrive",
            "He honked his horn and forced his way through the gap",
            "He walked the line, named the rules, and coordinated a staggered retreat using hand signals",
            "He turned around, took a detour, and left the others to sort it out"
          ],
          "correctAnswer": 2,
          "referenceTime": 42,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q3-slow.mp3"
          }
        },
        {
          "question": "What lesson did Daniel write in his notebook after the bridge incident?",
          "options": [
            "In deadlocks, hierarchy is less useful than choreography",
            "Always plan an alternative route before setting off on a delivery",
            "Never drive on unfamiliar roads without a navigator",
            "The early morning is the most dangerous time to be on the road"
          ],
          "correctAnswer": 0,
          "referenceTime": 65,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q4-slow.mp3"
          }
        },
        {
          "question": "What broader insight about logistics does Daniel draw from the bridge story?",
          "options": [
            "Logistics is mainly about having the right vehicles for the job",
            "Speed is always the most important factor in logistics",
            "Logistics is seldom about trucks — it's about teaching strangers to share a narrow bridge",
            "The best logistics companies always rely on the newest technology"
          ],
          "correctAnswer": 2,
          "referenceTime": 72,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/5.%20the%20bridge%20at%20low%20tide/q5-slow.mp3"
          }
        }
      ],
      "6": [
        {
          "question": "What originally caused the phantom pallets to appear in the system?",
          "options": [
            "A hacker broke into the Warehouse Management System overnight",
            "A customs broker's typo created duplicate entries, and a scanner glitch made them appear real",
            "A new employee accidentally deleted and then restored shipping records",
            "A client ordered extra pallets and then cancelled without informing the team"
          ],
          "correctAnswer": 1,
          "referenceTime": 18,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q1-slow.mp3"
          }
        },
        {
          "question": "At what time did Daniel's team discover the stock mismatch?",
          "options": [
            "9:30 p.m.",
            "11:45 p.m.",
            "1:12 a.m.",
            "3:00 a.m."
          ],
          "correctAnswer": 2,
          "referenceTime": 38,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q2-slow.mp3"
          }
        },
        {
          "question": "How did Daniel split his team to tackle the crisis?",
          "options": [
            "One group to reconcile physical counts, one to reconstruct the data trail, one to call the client with a plain report and options",
            "One group to call clients, one to fix the software, one to contact the press",
            "One group to find replacement stock, one to delay the shipment, one to renegotiate the contract",
            "One group to file an insurance claim, one to contact customs, one to pause all operations"
          ],
          "correctAnswer": 0,
          "referenceTime": 50,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q3-slow.mp3"
          }
        },
        {
          "question": "By what time did Daniel's team turn the phantom pallets from fiction into reality?",
          "options": [
            "4:00 a.m.",
            "5:30 a.m.",
            "6:40 a.m.",
            "8:15 a.m."
          ],
          "correctAnswer": 2,
          "referenceTime": 62,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q4-slow.mp3"
          }
        },
        {
          "question": "What was the key lesson Daniel drew from the phantom pallets incident?",
          "options": [
            "Systems are always reliable as long as they are maintained properly",
            "One strong leader can solve any logistical crisis alone",
            "Systems fail in plural — recovery requires a choir, not a solo",
            "The best prevention is avoiding clients with complex supply chains"
          ],
          "correctAnswer": 2,
          "referenceTime": 80,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/6.%20night%20of%20the%20phantom%20pallets/q5-slow.mp3"
          }
        }
      ],
      "7": [
        {
          "question": "How does Daniel describe his family at home?",
          "options": [
            "A wife, two sons, and a labrador named Max",
            "A wife, a daughter, a 3-year-old son, and a toy-terrier named Terry",
            "A wife, twin daughters, and a cat",
            "Just a wife and a daughter away at college"
          ],
          "correctAnswer": 1,
          "referenceTime": 4,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q1-slow.mp3"
          }
        },
        {
          "question": "What does Daniel call the regular family meeting he and his wife hold?",
          "options": [
            "A Monday morning briefing",
            "A family debrief session",
            "A Sunday council at the kitchen table",
            "A weekly household check-in"
          ],
          "correctAnswer": 2,
          "referenceTime": 28,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q2-slow.mp3"
          }
        },
        {
          "question": "How does Daniel describe his wife Sandra's relationship with his professional risks?",
          "options": [
            "She strongly disapproves of all financial risk-taking",
            "She is largely indifferent to his business decisions",
            "She once tolerated his risks like a scientist observing a volatile compound, but now co-authors them",
            "She manages the financial side of the company herself"
          ],
          "correctAnswer": 2,
          "referenceTime": 32,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q3-slow.mp3"
          }
        },
        {
          "question": "What does Daniel do on a \"red day\" when work makes him scarce at home?",
          "options": [
            "He says nothing and trusts his family will understand",
            "He tells them where he'll be scarce and when he'll be back, then keeps the promise",
            "He gives his family extra money to compensate for his absence",
            "He cancels his work commitments to prioritise family time"
          ],
          "correctAnswer": 1,
          "referenceTime": 58,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q4-slow.mp3"
          }
        },
        {
          "question": "How does Daniel describe the connection between calm and trust in family life?",
          "options": [
            "Calm is a natural state that requires no conscious effort",
            "Trust is built through generous gifts and family holidays",
            "Calm, like trust, is compound interest",
            "Family calm depends entirely on financial stability"
          ],
          "correctAnswer": 2,
          "referenceTime": 68,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/7.%20family%20weather%20report/q5-slow.mp3"
          }
        }
      ],
      "8": [
        {
          "question": "How does Daniel now answer the question \"How much can a logistics business make?",
          "options": [
            "With the number that matters: enough to sleep well and say no when yes would cost his integrity or his family's patience",
            "With detailed spreadsheets covering utilisation, fuel hedges, and peak season yield",
            "By listing the revenue figures from his best trading year",
            "By explaining quarterly margins and year-on-year growth percentages"
          ],
          "correctAnswer": 0,
          "referenceTime": 8,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q1-slow.mp3"
          }
        },
        {
          "question": "What does Daniel say happens with every extra percentage point of business growth?",
          "options": [
            "The business becomes more stable and its cash flow more predictable",
            "It creates valuable new job opportunities across the team",
            "It invites another layer of fragility — more night calls, brittle clients, and systems that behave until they don't",
            "It directly improves the quality of long-term client relationships"
          ],
          "correctAnswer": 2,
          "referenceTime": 33,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q2-slow.mp3"
          }
        },
        {
          "question": "What line does Daniel keep in his notebook about wealth?",
          "options": [
            "\"Wealth is unused options.\"",
            "\"Wealth is consistent monthly revenue.\"",
            "\"Wealth is the freedom to retire early.\"",
            "\"Wealth is a spreadsheet that never lies.\""
          ],
          "correctAnswer": 0,
          "referenceTime": 48,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q3-slow.mp3"
          }
        },
        {
          "question": "How does Daniel measure his company's financial health these days?",
          "options": [
            "By quarterly profit margins and year-on-year revenue growth",
            "By the total number of active client contracts",
            "By sturdiness: months of payroll in the bank, freedom to comp a client before they ask, and certainty that one bad day won't ruin everything",
            "By comparing his performance against industry benchmarks"
          ],
          "correctAnswer": 2,
          "referenceTime": 60,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q4-slow.mp3"
          }
        },
        {
          "question": "What is Daniel's closing metaphor about money in this story?",
          "options": [
            "\"Money is the destination. Drive as fast as you can.\"",
            "\"Money is a scoreboard. Always aim for the highest number.\"",
            "\"Money's the fuel. The journey is choosing where not to drive.\"",
            "\"Money is a tool. Use it wisely or lose it quickly.\""
          ],
          "correctAnswer": 2,
          "referenceTime": 88,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/8.%20the%20price%20of%20enough/q5-slow.mp3"
          }
        }
      ],
      "9": [
        {
          "question": "How does Daniel describe mixing business travel with family at the start of this story?",
          "options": [
            "As a well-organised adventure that always works out smoothly",
            "As flying three cargoes with one airway bill: the meeting, the marriage, and the memories",
            "As a necessary sacrifice families must make to support entrepreneurs",
            "As a test of whether work and family life can ever truly be separated"
          ],
          "correctAnswer": 1,
          "referenceTime": 5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q1-slow.mp3"
          }
        },
        {
          "question": "Where did the family trip to Spain take them, and what was the business purpose?",
          "options": [
            "Madrid, to attend a major European trade conference",
            "Bilbao to San Sebastián, with a detour to a cold-chain facility outside Vitoria-Gasteiz",
            "Barcelona, to visit the headquarters of a key client",
            "Seville, to inspect a prospective new distribution partner"
          ],
          "correctAnswer": 1,
          "referenceTime": 15,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q2-slow.mp3"
          }
        },
        {
          "question": "What problem arose at Heathrow, and how did Daniel handle it?",
          "options": [
            "A pallet missed a handover; he gave himself thirty minutes to resolve it, then put the phone away",
            "His passport was out of date; he had to rebook on a later flight",
            "A client called to cancel the Spain tour; he renegotiated from the departure lounge",
            "His carry-on was overweight; he repacked everything at the check-in desk"
          ],
          "correctAnswer": 0,
          "referenceTime": 35,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q3-slow.mp3"
          }
        },
        {
          "question": "What rule did Daniel announce aloud to his family at the airport?",
          "options": [
            "\"Family trips always come first — the business can wait a full week.\"",
            "\"We don't let the business colonise the trip. Thirty minutes to resolve, then it waits.\"",
            "\"Everyone is allowed one business call per day during the holiday.\"",
            "\"If the business calls more than twice, the trip ends — no exceptions.\""
          ],
          "correctAnswer": 1,
          "referenceTime": 40,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q4-slow.mp3"
          }
        },
        {
          "question": "What did Daniel's daughter do at the client dinner in Bilbao that surprised him?",
          "options": [
            "She gave an impromptu speech about her father's company",
            "She asked the head of operations about employee retention schemes",
            "She refused to attend and stayed at the hotel instead",
            "She acted as an informal translator for the Spanish clients"
          ],
          "correctAnswer": 1,
          "referenceTime": 70,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/9.%20family%20on%20the%20manifest%20part%20i/q5-slow.mp3"
          }
        }
      ],
      "10": [
        {
          "question": "What was San Sebastián meant to represent for Daniel and his family?",
          "options": [
            "The final client meeting before heading back to London",
            "A shopping day Sandra had planned months in advance",
            "The rest day — the dessert after the vegetables, earned after completing all the work",
            "A city Daniel had always wanted to visit purely for personal reasons"
          ],
          "correctAnswer": 2,
          "referenceTime": 5,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q1-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q1-slow.mp3"
          }
        },
        {
          "question": "What business crisis interrupted the family's rest day in San Sebastián?",
          "options": [
            "A key client cancelled a major contract without any warning",
            "A refrigerated shipment threw a temperature alarm, leaving two hours before the point of no return",
            "One of Daniel's drivers was involved in an accident on a Spanish motorway",
            "The cold-chain facility they had just visited failed its safety inspection"
          ],
          "correctAnswer": 1,
          "referenceTime": 32,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q2-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q2-slow.mp3"
          }
        },
        {
          "question": "What steps did Daniel take from the café vestibule to resolve the crisis?",
          "options": [
            "He rerouted to a closer dock, swapped trailers, approved overtime with hazard pay, and added a video seal check",
            "He delegated everything to his operations manager and rejoined his family immediately",
            "He called the client to request a 24-hour delivery extension and offered a discount",
            "He instructed the driver to reduce speed to protect the temperature-sensitive cargo"
          ],
          "correctAnswer": 0,
          "referenceTime": 52,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q3-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q3-slow.mp3"
          }
        },
        {
          "question": "What did Daniel do before the client had even noticed the problem?",
          "options": [
            "He waited to see if the shipment would recover on its own",
            "He informed his insurance company and started a liability claim",
            "He texted the client, owned the variance, and sent the fix and timestamps as proof",
            "He asked his operations manager to draft a formal written apology"
          ],
          "correctAnswer": 2,
          "referenceTime": 65,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q4-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q4-slow.mp3"
          }
        },
        {
          "question": "What line did Daniel write while walking the wet promenade that evening?",
          "options": [
            "\"Balance is the key to a successful business and family life.\"",
            "\"Never mix business travel with family holidays again.\"",
            "\"Boundaries aren't walls; they're promises with timestamps.\"",
            "\"The business must always come first, or neither side survives.\""
          ],
          "correctAnswer": 2,
          "referenceTime": 92,
          "audio": {
            "fast": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q5-fast.mp3",
            "slow": "https://storage.yandexcloud.net/audioplayer-data/daniel/quiz/10.%20family%20on%20the%20manifest%20part%20ii/q5-slow.mp3"
          }
        }
      ]
    }
  }
};

/** Ordered array of correct option indices for a part, or null if unknown. */
export function getQuizAnswerKey(difficulty, storyId, partNumber) {
  const questions = quizData[difficulty]?.[storyId]?.[partNumber];
  return questions ? questions.map((q) => q.correctAnswer) : null;
}

/** Quiz questions with `correctAnswer` stripped — safe to send to the client. */
export function getPublicQuiz(difficulty, storyId, partNumber) {
  const questions = quizData[difficulty]?.[storyId]?.[partNumber];
  if (!questions) return null;
  return questions.map(({ correctAnswer, ...rest }) => rest);
}
