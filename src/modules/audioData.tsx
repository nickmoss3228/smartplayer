import Leoslife from "../assets/1. Leo/1. Leo's life.mp3";
import Leosmornings from "../assets/1. Leo/2. Leo's mornings.mp3";
import Leosfavoritefood from "../assets/1. Leo/3. Leo's favorite food.mp3";
import Leosfamily from "../assets/1. Leo/4. Leo's family.mp3";
import Leosclothes from "../assets/1. Leo/5. Leo's clothes.mp3";
import Adayatthebeach from "../assets/1. Leo/6. A day at the beach.mp3";
import Acountry from "../assets/1. Leo/7. A Country Leo wants to visit.mp3";
import Leoshobbies from "../assets/1. Leo/8. Leo's hobbies.mp3";
import Meetingafriend from "../assets/1. Leo/9. Meeting a friend.mp3";
import TheLostKitten from "../assets/1. Leo/10. The Lost Kitten.mp3";

import { Subtitle, TimeMarker, QuizQuestion } from "../types";

export interface AudioTrack {
  id: string;
  title: string;
  audio: typeof Leoslife;
  subtitles: Subtitle[];
  timeMarkers: TimeMarker[];
  quiz: QuizQuestion[];
}

export const audioTracks: AudioTrack[] = [
  {
    id: "1",
    title: "Leo's Life",
    audio: Leoslife,
    subtitles: [
      { startTime: 0.1, endTime: 1, text: "Meet Leo." },
      { startTime: 1.5, endTime: 3.3, text: "Leo is a happy young man." },
      { startTime: 4, endTime: 5.5, text: "He is 26 years old." },
      {
        startTime: 6.2,
        endTime: 9,
        text: "He lives in a small flat with his cat, Ginger.",
      },
      { startTime: 9.8, endTime: 11.2, text: "He works at a local shop." },
      {
        startTime: 11.8,
        endTime: 15.5,
        text: "He loves his job because he meets many friendly people every day.",
      },
      {
        startTime: 16.2,
        endTime: 24.5,
        text: "Leo enjoys simple things, like walking in the park, listening to music, and drinking warm tea in the evening. ",
      },
      {
        startTime: 25.2,
        endTime: 29,
        text: "He always has a smile on his face and likes to help others.",
      },
      { startTime: 29.6, endTime: 32, text: "People say Leo is very kind." },
      {
        startTime: 32.6,
        endTime: 36,
        text: "He has a lot of friends and he sees them every weekend.",
      },
      {
        startTime: 36.7,
        endTime: 41.5,
        text: "The story of Leo starts in a small town named Neverland, ",
      },
      {
        startTime: 41.8,
        endTime: 45.7,
        text: "where he was born and lives today.",
      },
      { startTime: 46, endTime: 48, text: "And here is his story…" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 1.5, label: "2", color: "red" },
      { time: 4, label: "3", color: "red" },
      { time: 6.1, label: "4", color: "red" },
      { time: 9.7, label: "5", color: "red" },
      { time: 11.8, label: "6", color: "red" },
      { time: 16, label: "7", color: "red" },
      { time: 24.8, label: "8", color: "red" },
      { time: 29.4, label: "9", color: "red" },
      { time: 32.5, label: "10", color: "red" },
      { time: 36.6, label: "11", color: "red" },
      { time: 45.8, label: "12", color: "red" },
    ],
    quiz: [
      {
        question: "How old is Leo?",
        options: [
          "24 years old",
          "26 years old",
          "28 years old",
          "25 years old",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is the name of Leo's cat?",
        options: ["Tiger", "Ginger", "Fluffy", "Shadow"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Where does Leo work?",
        options: [
          "At a restaurant",
          "At a local shop",
          "At a bank",
          "At a school",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is the name of the town where Leo lives?",
        options: ["Wonderland", "Neverland", "Fairyland", "Dreamland"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo enjoy doing in his free time?",
        options: [
          "Playing video games",
          "Walking in the park and listening to music",
          "Watching movies",
          "Reading books",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "2",
    title: "Leo's Mornings",
    audio: Leosmornings,
    subtitles: [
      { startTime: 0.1, endTime: 2.7, text: "2. Leo's mornings." },
      {
        startTime: 3,
        endTime: 6.2,
        text: "Every morning, Leo wakes up at six o'clock. ",
      },
      {
        startTime: 6.6,
        endTime: 10.8,
        text: "First, he gets out of bed, goes to the kitchen and makes a cup of tea. ",
      },
      {
        startTime: 11.2,
        endTime: 15,
        text: "While his tea cools down, he feeds Ginger, his cat. ",
      },
      {
        startTime: 15.4,
        endTime: 19.8,
        text: "After that, Leo eats breakfast, usually toast with jam.",
      },
      {
        startTime: 20.3,
        endTime: 24.3,
        text: "Then, he brushes his teeth and gets dressed for work at the shop. ",
      },
      { startTime: 24.7, endTime: 27, text: "He wears a shirt and trousers." },
      {
        startTime: 27.6,
        endTime: 31,
        text: "Before he leaves, he always says goodbye to Ginger.",
      },
      {
        startTime: 31.6,
        endTime: 35.4,
        text: "He enjoys his quiet mornings before the busy day starts",
      },
      {
        startTime: 36,
        endTime: 39.7,
        text: "But, one day, the morning didn’t go as planned.",
      },
      {
        startTime: 40.3,
        endTime: 45,
        text: "On one summer Monday morning he woke up late and he didn’t have breakfast. ",
      },
      {
        startTime: 45.6,
        endTime: 51,
        text: "Then, he forgot to feed his cat, Ginger, and even didn’t wear his lucky socks. ",
      },
      {
        startTime: 51.4,
        endTime: 56.2,
        text: "The car didn’t start, so he had to walk to the bus stop.",
      },
      {
        startTime: 56.7,
        endTime: 64.1,
        text: "At work, the boss told him that he was very upset about the progress he had at work.",
      },
      {
        startTime: 64.5,
        endTime: 72.1,
        text: "At the end of the day, he came back home and watched his favorite TV show about animals.",
      },
      { startTime: 72.5, endTime: 74.5, text: "He wanted to relax." },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3, label: "2", color: "red" },
      { time: 6.5, label: "3", color: "red" },
      { time: 11.1, label: "4", color: "red" },
      { time: 15.5, label: "5", color: "red" },
      { time: 20.1, label: "6", color: "red" },
      { time: 24.5, label: "7", color: "red" },
      { time: 27.5, label: "8", color: "red" },
      { time: 31.6, label: "9", color: "red" },
      { time: 35.5, label: "10", color: "red" },
      { time: 40, label: "11", color: "red" },
      { time: 45, label: "12", color: "red" },
      { time: 51.7, label: "13", color: "red" },
      { time: 56.5, label: "14", color: "red" },
      { time: 64.3, label: "15", color: "red" },
      { time: 72.4, label: "16", color: "red" },
    ],
    quiz: [
      {
        question: "What time does Leo wake up every morning?",
        options: [
          "Five o'clock",
          "Six o'clock",
          "Seven o'clock",
          "Eight o'clock",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo do first when he wakes up?",
        options: [
          "Takes a shower",
          "Makes a cup of tea",
          "Feeds his cat",
          "Brushes his teeth",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo usually eat for breakfast?",
        options: [
          "Cereal with milk",
          "Toast with jam",
          "Eggs and bacon",
          "Pancakes",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What happened on the bad morning?",
        options: [
          "He overslept and missed breakfast",
          "He got sick",
          "His car broke down",
          "He forgot his keys",
        ],
        correctAnswer: 0,
        referenceTime: 0,
      },
      {
        question: "How did Leo get to work on the bad day?",
        options: [
          "He drove his car",
          "He walked to the bus stop",
          "He called a taxi",
          "His friend gave him a ride",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "3",
    title: "Leo's Favorite Food",
    audio: Leosfavoritefood,
    subtitles: [
      { startTime: 0.1, endTime: 3.2, text: "3. Leo's favorite food." },
      { startTime: 3.5, endTime: 4.8, text: "Leo loves to eat." },
      { startTime: 5.1, endTime: 7, text: "His favorite food is pizza." },
      {
        startTime: 7.4,
        endTime: 10.3,
        text: "He likes pizza with lots of cheese and tomatoes.",
      },
      {
        startTime: 10.8,
        endTime: 14.4,
        text: "Sometimes, on his day off, he makes pizza at home. ",
      },
      {
        startTime: 14.8,
        endTime: 17.7,
        text: "He buys fresh dough from the bakery where he works.",
      },
      {
        startTime: 18,
        endTime: 20.4,
        text: "He also likes his mother’s apple pie.",
      },
      { startTime: 20.8, endTime: 22.5, text: "She makes it every Sunday." },
      {
        startTime: 23.2,
        endTime: 26.2,
        text: "Leo thinks his mother is the best cook in the world.",
      },
      {
        startTime: 26.7,
        endTime: 31,
        text: "He also enjoys simple snacks like apples and bananas.",
      },
      {
        startTime: 31.5,
        endTime: 37,
        text: "He says eating good food makes him feel happy and full of energy for the day.",
      },
      {
        startTime: 37.7,
        endTime: 42,
        text: "Sometimes, when he is at home – he makes lasagna –",
      },
      {
        startTime: 42.8,
        endTime: 46.7,
        text: "– his cat Ginger really likes this meal.",
      },
      { startTime: 47.5, endTime: 50, text: "He is trying to eat healthily," },
      {
        startTime: 50.6,
        endTime: 55,
        text: "but because of his work, it’s hard to do. ",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3.3, label: "2", color: "red" },
      { time: 5.3, label: "3", color: "red" },
      { time: 7.5, label: "4", color: "red" },
      { time: 10.8, label: "5", color: "red" },
      { time: 14.8, label: "6", color: "red" },
      { time: 18, label: "7", color: "red" },
      { time: 20.8, label: "8", color: "red" },
      { time: 23, label: "9", color: "red" },
      { time: 26.7, label: "9", color: "red" },
      { time: 31.3, label: "9", color: "red" },
      { time: 37.6, label: "9", color: "red" },
      { time: 47.4, label: "9", color: "red" },
    ],
    quiz: [
      {
        question: "What is Leo's favorite food?",
        options: ["Pasta", "Pizza", "Burgers", "Sandwiches"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What toppings does Leo like on his pizza?",
        options: [
          "Cheese and pepperoni",
          "Cheese and tomatoes",
          "Mushrooms and ham",
          "Vegetables only",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Where does Leo buy fresh dough?",
        options: [
          "From the supermarket",
          "From the bakery where he works",
          "From his neighbor",
          "He makes it himself",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo's mother make every Sunday?",
        options: ["Chocolate cake", "Apple pie", "Cookies", "Bread"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Which meal does Leo's cat Ginger really like?",
        options: ["Pizza", "Apple pie", "Lasagna", "Sandwiches"],
        correctAnswer: 2,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "4",
    title: "Leo's Family",
    audio: Leosfamily,
    subtitles: [
      { startTime: 0.1, endTime: 3.4, text: "4. Leo’s Family" },
      {
        startTime: 3.4,
        endTime: 6.2,
        text: "Now, let’s talk about Leo’s family. ",
      },
      {
        startTime: 6.6,
        endTime: 8.8,
        text: "Leo has a small and loving family. ",
      },
      {
        startTime: 9,
        endTime: 12.6,
        text: "He lives alone with his cat, but his parents live in a town nearby. ",
      },
      {
        startTime: 13,
        endTime: 18.3,
        text: "His mother, Anna, is a teacher, and his father, Mark, is an engineer. ",
      },
      { startTime: 18.6, endTime: 21, text: "Leo visits them every weekend. " },
      {
        startTime: 21.3,
        endTime: 24,
        text: "He also has an older sister named Mia.",
      },
      {
        startTime: 24.4,
        endTime: 27.2,
        text: "Mia is a doctor and lives in a big city, ",
      },
      {
        startTime: 27.4,
        endTime: 30,
        text: "so Leo doesn't see her very often",
      },
      {
        startTime: 30.3,
        endTime: 32.6,
        text: "but they talk on the phone every week. ",
      },
      {
        startTime: 32.9,
        endTime: 35.4,
        text: "Leo loves his family very much. ",
      },
      {
        startTime: 35.8,
        endTime: 40.2,
        text: "They always support each other and have fun when they are together. ",
      },
      {
        startTime: 41,
        endTime: 44,
        text: "Sometimes, they go on a trip together,",
      },
      {
        startTime: 44.2,
        endTime: 47.2,
        text: "visiting the nature and camping on a lake. ",
      },
      {
        startTime: 47.6,
        endTime: 51,
        text: "Leo has a very good relationship with his dad,",
      },
      {
        startTime: 51.2,
        endTime: 57,
        text: "they often go fishing together, and sometimes even watch football live. ",
      },
      {
        startTime: 57.8,
        endTime: 61,
        text: "And what about Leo’s personal life? ",
      },
      {
        startTime: 62,
        endTime: 66.5,
        text: "Well, Leo is currently looking for a girlfriend,",
      },
      {
        startTime: 66.9,
        endTime: 70.5,
        text: "he wants to build a strong and happy family, ",
      },
      {
        startTime: 70.9,
        endTime: 76,
        text: "and we hope he will find a girl of his dreams, of course!",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3.2, label: "2", color: "red" },
      { time: 6.4, label: "3", color: "red" },
      { time: 8.7, label: "4", color: "red" },
      { time: 13.1, label: "5", color: "red" },
      { time: 18.5, label: "6", color: "red" },
      { time: 21.2, label: "7", color: "red" },
      { time: 24.4, label: "8", color: "red" },
      { time: 32.7, label: "9", color: "red" },
      { time: 35.6, label: "10", color: "red" },
      { time: 41, label: "11", color: "red" },
      { time: 47.5, label: "12", color: "red" },
      { time: 57.8, label: "13", color: "red" },
      { time: 61.6, label: "14", color: "red" },
    ],
    quiz: [
      {
        question: "What is Leo's mother's job?",
        options: ["Doctor", "Teacher", "Engineer", "Nurse"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is Leo's father's name?",
        options: ["Mike", "Mark", "Matt", "Max"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is Leo's sister's name and profession?",
        options: [
          "Anna, teacher",
          "Mia, doctor",
          "Lisa, engineer",
          "Sara, nurse",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "How often does Leo visit his parents?",
        options: ["Every day", "Every weekend", "Once a month", "Twice a week"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo do with his father?",
        options: [
          "Play tennis and cook",
          "Go fishing and watch football",
          "Go shopping and travel",
          "Play games and read",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "5",
    title: "Leo's Clothes",
    audio: Leosclothes,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "5. Leo’s Clothes" },
      {
        startTime: 3.5,
        endTime: 6,
        text: "Leo isn’t a person who follows the current trends",
      },
      {
        startTime: 6.5,
        endTime: 10,
        text: "or what is popular to and fashionable to wear.",
      },
      {
        startTime: 10.5,
        endTime: 12.5,
        text: "He likes to wear comfortable clothes.",
      },
      {
        startTime: 13.3,
        endTime: 15,
        text: "When he is not working at the bakery,",
      },
      {
        startTime: 15.4,
        endTime: 18,
        text: "he usually wears jeans and a T-shirt.",
      },
      {
        startTime: 18.4,
        endTime: 21.1,
        text: "His favorite T-shirt is a blue one,",
      },
      {
        startTime: 21.4,
        endTime: 23.3,
        text: "without any pictures or prints.",
      },
      {
        startTime: 23.8,
        endTime: 28.5,
        text: "In winter, he wears a warm woolen sweater that his grandmother made for him.",
      },
      { startTime: 28.8, endTime: 30, text: "It's very cozy!" },
      {
        startTime: 30.6,
        endTime: 33.6,
        text: "And when he is at home, he likes wearing the shorts ",
      },
      {
        startTime: 33.7,
        endTime: 39.5,
        text: "and sometimes pyjamas – which is very childish, but still, cozy. ",
      },
      {
        startTime: 39.9,
        endTime: 42.6,
        text: "For work, he has his bakery uniform:",
      },
      {
        startTime: 42.8,
        endTime: 47,
        text: "a white shirt, black trousers, and his special apron.",
      },
      {
        startTime: 47.4,
        endTime: 50,
        text: "Leo thinks it's important to be neat and tidy, ",
      },
      {
        startTime: 50.3,
        endTime: 54.2,
        text: "but comfort is most important for his everyday outfits. ",
      },
      {
        startTime: 54.5,
        endTime: 58,
        text: "He doesn't like shopping for clothes very much.",
      },
      {
        startTime: 58.5,
        endTime: 61.6,
        text: "He thinks that men shouldn’t waste money on clothes ",
      },
      {
        startTime: 61.8,
        endTime: 67.6,
        text: "because only women love buying different clothes of different styles.",
      },
      { startTime: 68, endTime: 69.4, text: "Well, Leo " },
      {
        startTime: 69.8,
        endTime: 73.2,
        text: "– maybe that is why you don’t have a girlfriend?",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3.4, label: "2", color: "red" },
      { time: 10.4, label: "3", color: "red" },
      { time: 13.2, label: "4", color: "red" },
      { time: 18.3, label: "5", color: "red" },
      { time: 23.7, label: "6", color: "red" },
      { time: 28.9, label: "7", color: "red" },
      { time: 30.6, label: "8", color: "red" },
      { time: 39.8, label: "9", color: "red" },
      { time: 47.5, label: "10", color: "red" },
      { time: 54.5, label: "11", color: "red" },
      { time: 58.3, label: "12", color: "red" },
      { time: 67.8, label: "12", color: "red" },
    ],
    quiz: [
      {
        question: "What does Leo usually wear when he's not working?",
        options: [
          "Suits and ties",
          "Jeans and a T-shirt",
          "Shorts and sandals",
          "Sweaters and pants",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What color is Leo's favorite T-shirt?",
        options: ["Red", "Blue", "Green", "Black"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Who made Leo's warm woolen sweater?",
        options: [
          "His mother",
          "His grandmother",
          "His sister",
          "He bought it",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo wear for work?",
        options: [
          "Casual clothes",
          "White shirt, black trousers, and apron",
          "Uniform with logo",
          "Just an apron",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo think about clothes shopping?",
        options: [
          "He loves it",
          "He doesn't like it very much",
          "He does it often",
          "He thinks it's fun",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "6",
    title: "A day at the Beach",
    audio: Adayatthebeach,
    subtitles: [
      { startTime: 0.1, endTime: 3, text: "6. A day at the beach." },
      {
        startTime: 3.2,
        endTime: 6.8,
        text: "Now, let’s go deep inside Leo’s memory ",
      },
      {
        startTime: 7,
        endTime: 10.4,
        text: "and follow his remarkable story about a day at the beach.",
      },
      {
        startTime: 10.6,
        endTime: 13.7,
        text: "Leo remembers a special day from his childhood. ",
      },
      { startTime: 14.5, endTime: 16, text: "When he was ten years old, " },
      { startTime: 16.4, endTime: 18, text: "his family went to the beach." },
      { startTime: 18.4, endTime: 20.3, text: "It was a very sunny day. " },
      {
        startTime: 20.6,
        endTime: 25.1,
        text: "Leo played in the sand and built a big castle with his sister, Mia.  ",
      },
      {
        startTime: 25.6,
        endTime: 28.4,
        text: "Then, his father decided to teach Leo",
      },
      { startTime: 28.5, endTime: 30, text: "how to swim in the sea." },
      {
        startTime: 30.8,
        endTime: 32.8,
        text: "Suddenly, when they were swimming ",
      },
      { startTime: 33.2, endTime: 35, text: " – they saw a shark!" },
      {
        startTime: 35.6,
        endTime: 38.4,
        text: "Everybody started to swim quickly to the shore,",
      },
      {
        startTime: 38.7,
        endTime: 42.8,
        text: "and because of the stress – Leo quickly started to swim ",
      },
      {
        startTime: 43.1,
        endTime: 46,
        text: "– even though he couldn’t do it before!",
      },
      {
        startTime: 46.5,
        endTime: 50.2,
        text: "I guess, Leo was so scared that he taught himself ",
      },
      {
        startTime: 50.3,
        endTime: 53,
        text: "how to swim – thanks to the shark. ",
      },
      {
        startTime: 53.7,
        endTime: 56.5,
        text: "Leo’s dad still remembers this moment ",
      },
      {
        startTime: 56.8,
        endTime: 61.4,
        text: "and sometimes reminds of this moment to Leo.",
      },
      {
        startTime: 62,
        endTime: 66.7,
        text: "He still thinks about that scary day at the beach.",
      },
      { startTime: 67, endTime: 72, text: "And now Leo can swim very well," },
      {
        startTime: 72.3,
        endTime: 78,
        text: "one time he even crossed the river while swimming!",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3, label: "2", color: "red" },
      { time: 11, label: "3", color: "red" },
      { time: 14.4, label: "4", color: "red" },
      { time: 18.4, label: "5", color: "red" },
      { time: 20.6, label: "6", color: "red" },
      { time: 25.5, label: "7", color: "red" },
      { time: 30.8, label: "8", color: "red" },
      { time: 35.3, label: "9", color: "red" },
      { time: 46.5, label: "10", color: "red" },
      { time: 53.7, label: "11", color: "red" },
      { time: 62, label: "12", color: "red" },
      { time: 67.4, label: "13", color: "red" },
    ],
    quiz: [
      {
        question: "How old was Leo when his family went to the beach?",
        options: [
          "Eight years old",
          "Ten years old",
          "Twelve years old",
          "Nine years old",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What did Leo build on the beach with his sister?",
        options: ["A sand house", "A big castle", "A sand sculpture", "A fort"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What did Leo's father want to teach him?",
        options: [
          "How to surf",
          "How to swim in the sea",
          "How to fish",
          "How to sail",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What did they see while swimming?",
        options: ["A dolphin", "A shark", "A whale", "A big fish"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "How did Leo learn to swim?",
        options: [
          "His father taught him slowly",
          "He was scared by the shark and learned quickly",
          "He took swimming lessons",
          "His sister helped him",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },

  {
    id: "7",
    title: "A country Leo wants to visit",
    audio: Acountry,
    subtitles: [
      { startTime: 0.1, endTime: 4, text: "7. A Country Leo Wants to Visit" },
      {
        startTime: 4.3,
        endTime: 7,
        text: "Well, if you followed Leo’s story ",
      },
      {
        startTime: 7.2,
        endTime: 10.3,
        text: "– you know he doesn’t like spending money very much.",
      },
      {
        startTime: 10.6,
        endTime: 13.3,
        text: "But he has many places he would love to visit.",
      },
      {
        startTime: 14,
        endTime: 16.6,
        text: "He dreams of visiting Italy one day. ",
      },
      {
        startTime: 17.1,
        endTime: 21.3,
        text: "He has seen many pictures of Italy in books and on television. ",
      },
      {
        startTime: 21.9,
        endTime: 24.4,
        text: "He wants to see the old buildings in Rome ",
      },
      {
        startTime: 24.6,
        endTime: 26.7,
        text: "and ride a gondola in Venice. ",
      },
      {
        startTime: 27.3,
        endTime: 31.5,
        text: "Leo loves Italian food, especially pizza and pasta,",
      },
      {
        startTime: 31.8,
        endTime: 35.3,
        text: "so he wants to try authentic Italian dishes. ",
      },
      {
        startTime: 36,
        endTime: 38.6,
        text: "He imagines walking through sunny streets, ",
      },
      { startTime: 38.8, endTime: 40.8, text: "eating delicious gelato," },
      {
        startTime: 41.1,
        endTime: 43.4,
        text: "and listening to Italian music.",
      },
      {
        startTime: 44.2,
        endTime: 47.2,
        text: "He is saving a little money each month for his trip.",
      },
      {
        startTime: 47.5,
        endTime: 50.6,
        text: "He hopes his dream will come true soon. ",
      },
      {
        startTime: 51.4,
        endTime: 55,
        text: "One of his friends offered Leo to travel with him to France,",
      },
      { startTime: 55.3, endTime: 58, text: "but Leo says he hates France." },
      {
        startTime: 58.4,
        endTime: 63.6,
        text: "He says it is a dirty and very dangerous country.",
      },
      {
        startTime: 64,
        endTime: 67.8,
        text: "We don’t know why Leo hates France so much, ",
      },
      {
        startTime: 68.2,
        endTime: 74,
        text: "maybe it is because he has a French car which breaks every month. ",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 4, label: "2", color: "red" },
      { time: 10.6, label: "3", color: "red" },
      { time: 14, label: "4", color: "red" },
      { time: 17, label: "5", color: "red" },
      { time: 21.6, label: "6", color: "red" },
      { time: 27.2, label: "7", color: "red" },
      { time: 35.7, label: "8", color: "red" },
      { time: 44, label: "9", color: "red" },
      { time: 47.4, label: "10", color: "red" },
      { time: 51.3, label: "11", color: "red" },
      { time: 58.4, label: "12", color: "red" },
      { time: 63.7, label: "13", color: "red" },
    ],
    quiz: [
      {
        question: "Which country does Leo dream of visiting?",
        options: ["France", "Italy", "Spain", "Germany"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo want to see in Rome?",
        options: [
          "Museums",
          "The old buildings",
          "Modern architecture",
          "Shopping centers",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo want to do in Venice?",
        options: [
          "Take photos",
          "Ride a gondola",
          "Visit churches",
          "Go shopping",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "How does Leo save money for his trip?",
        options: [
          "He works overtime",
          "He saves a little each month",
          "He borrows from family",
          "He doesn't save money",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What does Leo say about France?",
        options: [
          "He loves it",
          "He hates it",
          "He wants to visit it",
          "He's been there",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "8",
    title: "Leo's hobbies",
    audio: Leoshobbies,
    subtitles: [
      { startTime: 0.1, endTime: 2.5, text: "8. Leo’s hobbies " },
      {
        startTime: 2.7,
        endTime: 7.2,
        text: "Now let’s look into Leo’s hobbies and free time activities.",
      },
      { startTime: 7.6, endTime: 10, text: "Leo is a big fan of sports" },
      {
        startTime: 10.2,
        endTime: 13.5,
        text: "– he likes watching and playing different kinds of sports. ",
      },
      {
        startTime: 14,
        endTime: 16.8,
        text: "He and his family are very sporty people. ",
      },
      {
        startTime: 17.2,
        endTime: 21.6,
        text: "As we said before, Leo and his father Mark love football ",
      },
      {
        startTime: 21.9,
        endTime: 24.5,
        text: "– their favorite team is Manchester United. ",
      },
      {
        startTime: 25.3,
        endTime: 29.9,
        text: "Leo even owns a real T-Shirt of Manchester United’s attacker Ronaldo ",
      },
      {
        startTime: 30,
        endTime: 33.3,
        text: "which his sister gifted him on his birthday.",
      },
      { startTime: 34, endTime: 35.6, text: "Every day after work " },
      {
        startTime: 36,
        endTime: 38.6,
        text: "– Leo goes to play football on the sports field ",
      },
      { startTime: 38.8, endTime: 41, text: "in Neverland Sports Center. " },
      {
        startTime: 41.4,
        endTime: 45.7,
        text: "He says it helps him to relax after a stressful day",
      },
      { startTime: 46.3, endTime: 48.2, text: "– and play with his friends." },
      {
        startTime: 49,
        endTime: 52.3,
        text: "Another hobby that Leo likes doing in his free time",
      },
      {
        startTime: 52.5,
        endTime: 56,
        text: "is watching TV series about crime and drama. ",
      },
      {
        startTime: 56.7,
        endTime: 59.6,
        text: "He’s watching Breaking Bad at the moment ",
      },
      { startTime: 60, endTime: 62, text: "– his favorite one." },
      {
        startTime: 62.3,
        endTime: 65.2,
        text: "He says that watching shows with friends ",
      },
      {
        startTime: 65.5,
        endTime: 69,
        text: "and talking about them is very fun. ",
      },
      {
        startTime: 69.7,
        endTime: 73.3,
        text: "He has a big collection of DVD discs ",
      },
      {
        startTime: 73.6,
        endTime: 78,
        text: "with many classic movies of 70s and 80s.",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 2.8, label: "2", color: "red" },
      { time: 7.7, label: "3", color: "red" },
      { time: 13.8, label: "4", color: "red" },
      { time: 17.3, label: "5", color: "red" },
      { time: 25, label: "6", color: "red" },
      { time: 33.8, label: "7", color: "red" },
      { time: 41.7, label: "8", color: "red" },
      { time: 49, label: "9", color: "red" },
      { time: 56.5, label: "10", color: "red" },
      { time: 62.2, label: "11", color: "red" },
      { time: 69.8, label: "12", color: "red" },
    ],
    quiz: [
      {
        question: "What is Leo a big fan of?",
        options: ["Music", "Sports", "Movies", "Books"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is Leo and his father's favorite football team?",
        options: ["Liverpool", "Manchester United", "Arsenal", "Chelsea"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Who gave Leo the Manchester United T-shirt?",
        options: ["His father", "His sister", "His friend", "His mother"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Where does Leo play football after work?",
        options: [
          "At home",
          "Neverland Sports Center",
          "In the park",
          "At school",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What TV series is Leo watching at the moment?",
        options: ["Friends", "Breaking Bad", "Game of Thrones", "The Office"],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "9",
    title: "Meeting a friend",
    audio: Meetingafriend,
    subtitles: [
      { startTime: 0.1, endTime: 4, text: "9. Meeting a Friend" },
      {
        startTime: 4.3,
        endTime: 7.5,
        text: "Yesterday, Leo met his friend Sam for coffee. ",
      },
      {
        startTime: 8,
        endTime: 10.4,
        text: "Sam is Leo’s old friend from school. ",
      },
      {
        startTime: 10.8,
        endTime: 13.4,
        text: "They met at a small cafe near the park.",
      },
      {
        startTime: 13.7,
        endTime: 16.4,
        text: "They talked for a long time about many things ",
      },
      {
        startTime: 16.7,
        endTime: 20.3,
        text: "– their jobs, their hobbies, and their plans for the future.",
      },
      {
        startTime: 20.8,
        endTime: 24.3,
        text: "Leo told Sam about his dream to visit Italy. ",
      },
      {
        startTime: 24.7,
        endTime: 27.3,
        text: "Sam said it was a great idea. ",
      },
      { startTime: 27.8, endTime: 28.8, text: "They laughed a lot " },
      {
        startTime: 29,
        endTime: 32.3,
        text: "and remembered funny stories from their school days. ",
      },
      {
        startTime: 32.6,
        endTime: 36.5,
        text: "For example, when Sam and Leo ran from school for a lunch break ",
      },
      { startTime: 36.8, endTime: 39.5, text: "and ate pizza at Leo’s home. " },
      {
        startTime: 40,
        endTime: 42.6,
        text: "Leo always feels good after talking to Sam. ",
      },
      {
        startTime: 43.3,
        endTime: 46.2,
        text: "Good friends are very important to him.",
      },
      {
        startTime: 46.6,
        endTime: 50.2,
        text: "Sam is an engineer in an international company now, ",
      },
      {
        startTime: 50.5,
        endTime: 54.3,
        text: "and he is going to go to England for a work trip for 2 months. ",
      },
      {
        startTime: 54.7,
        endTime: 58,
        text: "Leo will miss his friend very much. ",
      },
      {
        startTime: 58.8,
        endTime: 60.8,
        text: "When they finished their coffee, ",
      },
      {
        startTime: 61.1,
        endTime: 64.4,
        text: "they said goodbye and went home.  ",
      },
      { startTime: 65, endTime: 67, text: "And on the way home," },
      { startTime: 67.5, endTime: 71, text: "Leo saw something very sad…" },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 4.2, label: "2", color: "red" },
      { time: 7.9, label: "3", color: "red" },
      { time: 10.8, label: "4", color: "red" },
      { time: 13.8, label: "5", color: "red" },
      { time: 20.9, label: "6", color: "red" },
      { time: 24.6, label: "7", color: "red" },
      { time: 27.8, label: "8", color: "red" },
      { time: 32.5, label: "9", color: "red" },
      { time: 39.7, label: "10", color: "red" },
      { time: 43.4, label: "11", color: "red" },
      { time: 46.6, label: "12", color: "red" },
      { time: 54.7, label: "13", color: "red" },
      { time: 58.7, label: "14", color: "red" },
      { time: 65, label: "15", color: "red" },
    ],
    quiz: [
      {
        question: "What is the name of Leo's friend from school?",
        options: ["Tom", "Sam", "Jim", "Bob"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Where did Leo and Sam meet?",
        options: [
          "At Leo's house",
          "At a small cafe near the park",
          "At the sports center",
          "At work",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What did Leo tell Sam about?",
        options: [
          "His work problems",
          "His dream to visit Italy",
          "His new hobby",
          "His cat",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What is Sam's job now?",
        options: [
          "Teacher",
          "Engineer in an international company",
          "Doctor",
          "Shop assistant",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Where is Sam going for a work trip?",
        options: ["France", "England", "Italy", "Germany"],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
  {
    id: "10",
    title: "The Lost Kitten",
    audio: TheLostKitten,
    subtitles: [
      { startTime: 0.1, endTime: 2.7, text: "10. The Lost Kitten" },
      {
        startTime: 3,
        endTime: 7,
        text: "Yesterday, as Leo was walking home from meeting his friend Sam, ",
      },
      { startTime: 7.3, endTime: 9.2, text: "he heard a small meow. " },
      { startTime: 9.5, endTime: 11, text: "He looked around and saw a tiny," },
      {
        startTime: 11.3,
        endTime: 13.5,
        text: "scared kitten hiding under a car. ",
      },
      { startTime: 13.8, endTime: 15.5, text: "It was all alone. " },
      {
        startTime: 16.2,
        endTime: 18,
        text: "Leo gently picked up the kitten. ",
      },
      { startTime: 18.3, endTime: 20, text: "It was very thin and cold. " },
      {
        startTime: 20.4,
        endTime: 23.2,
        text: "He took it home, gave it some warm milk, ",
      },
      {
        startTime: 23.5,
        endTime: 26.2,
        text: "and made a soft bed for it in a box. ",
      },
      {
        startTime: 26.7,
        endTime: 29.7,
        text: "His sister Mia gave Leo the medicine ",
      },
      {
        startTime: 29.8,
        endTime: 33,
        text: "for the kitten because Mia is a veterinarian.",
      },
      {
        startTime: 33.5,
        endTime: 37.3,
        text: "The next day, he put up posters around his neighborhood",
      },
      { startTime: 37.5, endTime: 39, text: "– to find the owners." },
      {
        startTime: 39.2,
        endTime: 44,
        text: "He also posted a photo of a kitten online on his social media profile.",
      },
      {
        startTime: 44.3,
        endTime: 48.4,
        text: "A few days later, a little girl and her mother came to his door. ",
      },
      { startTime: 49.1, endTime: 50.4, text: "It was their kitten!" },
      { startTime: 51, endTime: 52.8, text: "They were so happy. " },
      {
        startTime: 53.1,
        endTime: 57,
        text: "Leo felt wonderful helping the kitten find its home. ",
      },
      {
        startTime: 57.5,
        endTime: 61,
        text: "Now, Leo wants to have his own cat at home.",
      },
    ],
    timeMarkers: [
      { time: 0.1, label: "1", color: "red" },
      { time: 3, label: "2", color: "red" },
      { time: 9.5, label: "3", color: "red" },
      { time: 14, label: "4", color: "red" },
      { time: 16, label: "5", color: "red" },
      { time: 18.1, label: "6", color: "red" },
      { time: 20.4, label: "7", color: "red" },
      { time: 26.8, label: "8", color: "red" },
      { time: 33.7, label: "9", color: "red" },
      { time: 39.2, label: "10", color: "red" },
      { time: 44.5, label: "11", color: "red" },
      { time: 48.8, label: "12", color: "red" },
      { time: 50.9, label: "13", color: "red" },
      { time: 52.9, label: "14", color: "red" },
      { time: 57.4, label: "15", color: "red" },
    ],
    quiz: [
      {
        question: "Where did Leo find the kitten?",
        options: [
          "In a box",
          "Hiding under a car",
          "In the park",
          "On the street",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "What did Leo give the kitten when he took it home?",
        options: ["Cat food", "Warm milk", "Water", "Cookies"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Who gave Leo medicine for the kitten?",
        options: ["His mother", "His sister Mia", "A doctor", "A neighbor"],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "How did Leo try to find the kitten's owners?",
        options: [
          "He asked neighbors",
          "He put up posters and posted online",
          "He called the police",
          "He went to the vet",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
      {
        question: "Who came to get the kitten?",
        options: [
          "An old man",
          "A little girl and her mother",
          "A young couple",
          "Another cat owner",
        ],
        correctAnswer: 1,
        referenceTime: 0,
      },
    ],
  },
];

// Helper function to get a specific track
export const getAudioTrack = (id: string): AudioTrack | undefined => {
  return audioTracks.find((track) => track.id === id);
};








// export const audioTracks: AudioTrack[] = [
//   {
//     id: "tattoo",
//     title: "Tattoo Culture",
//     audio: tattoo,
//     subtitles: [
//         { startTime: 0.1, endTime: 7.2, text: "The cultural status of tattooing has steadily evolved from that of an anti-social activity in the 1960s" },
//         { startTime: 7.5, endTime: 12, text: "to that of a socially acceptable fashion statement today." },
//         { startTime: 13, endTime: 19.5, text: "First adopted and flaunted by influential rock stars like the Rolling Stones in the early 1970s," },
//         { startTime: 20, endTime: 22.8, text: "tattooing had, by the late 1980s,"},
//         { startTime: 23, endTime: 27, text: "become accepted by ever-broader segments of mainstream society." },
//         { startTime: 27.2, endTime:32, text: "Today, tattoos are routinely seen on rock musicians, sports stars " },
//         { startTime: 32.3, endTime: 38.6, text: "and other public figures who play a significant role in setting the culture's behaviour patterns." },
//         { startTime: 39.2, endTime: 45, text: "The market demographics for tattoo services are now skewed heavily toward mainstream customers. " },
//         { startTime: 47, endTime: 51.5, text: "Tattooing today is the sixth fastest-growing retail business in the United States. " },
//         { startTime: 52, endTime: 56.4, text: "The single fastest-growing demographic group seeking tattoo services is, " },
//         { startTime: 56.7, endTime: 60, text: "to the surprise of many, middle-class suburban women." },
//         { startTime: 60.6, endTime: 63.3, text: "The state and local governments of New Jersey, " },
//         { startTime: 63.7, endTime: 66, text: "like those of other regions across the United States," },
//         { startTime: 66.3, endTime: 69, text: "are being forced to alter their attitude and laws" },
//         { startTime: 69.2, endTime: 73.8, text: "in response to the changing cultural status and popularity of tattooing " },
//         { startTime: 74, endTime: 78.4, text: "and have now adopted a more open-minded approach to tattoos." },
//         { startTime: 79.8, endTime: 82, text: "According to one recent journal," },
//         { startTime: 82.1, endTime: 87.3, text: "tattoos were most common among motorcyclists, criminals and gang members. " },
//         { startTime: 87.5, endTime: 93.4, text: "However, these stereotypical associations have changed over the past 20 years " },
//         { startTime: 93.8, endTime: 99, text: "and it is estimated that almost half of the tattoos now being done are on women." },
//     ],
//     timeMarkers: [
//         { time: 0.1, label: "1", color: "red" },
//         { time: 12.8, label: "2", color: "red" },
//         { time: 27.2, label: "3", color: "red" },
//         { time: 39.2, label: "4", color: "red" },
//         { time: 46.7, label: "5", color: "red" },
//         { time: 52, label: "6", color: "red" },
//         { time: 60.6, label: "7", color: "red" },
//         { time: 79.8, label: "8", color: "red" },
//         { time: 87.5, label: "9", color: "red" },
//     ],
//     quiz: [
//         {
//           question: "What is the current status of tattooing in society?",
//           options: [
//             "It remains an anti-social activity",
//             "It's a socially acceptable fashion statement",
//             "It's only popular among criminals",
//             "It's declining in popularity"
//           ],
//           correctAnswer: 1,
//           referenceTime: 7.5 // References the second subtitle
//         },
//         {
//           question: "Which group is the fastest-growing demographic seeking tattoo services?",
//           options: [
//             "Rock musicians",
//             "Sports stars",
//             "Middle-class suburban women",
//             "Motorcyclists"
//           ],
//           correctAnswer: 2,
//           referenceTime: 56.7 // References the related subtitle
//         },
//         {
//           question: "What is the current ranking of tattooing as a retail business in the United States?",
//           options: [
//             "The fastest-growing",
//             "The third fastest-growing",
//             "The sixth fastest-growing",
//             "The tenth fastest-growing"
//           ],
//           correctAnswer: 2,
//           referenceTime: 47 // References the related subtitle
//         }
//       ]
//     },
//   {
//     id: "popular",
//     title: "Popular",
//     audio: popular,
//     subtitles: [
//         { startTime: 0.1, endTime: 3, text: "Would you prefer to be ‘popular’ or ‘well-liked’?" },
//         { startTime: 3.6, endTime: 9, text: "A new study from The Australian National University (ANU) has shown that for Canberra's young people, " },
//         { startTime: 9.4, endTime: 13, text: "being well-liked is much more desirable than being popular, " },
//         { startTime: 13.2, endTime: 16.3, text: "and being popular does not always mean you’re well-liked." },
//         { startTime: 17, endTime: 22.5, text: "The study by Stephanie Hawke, a PhD candidate in clinical psychology at the university, " },
//         { startTime: 22.7, endTime: 27.4, text: "looked at nearly 200 Year 9 and Year 11 students from across Canberra."},
//         { startTime: 28, endTime: 33.3, text: "It found that adolescents saw being popular and being well-liked as two very different things," },
//         { startTime: 33.7, endTime: 38.3, text: "and that young people may not see popularity as a desirable trait." },
//         { startTime: 40, endTime: 43.5, text: "The research has been released as part of National Psychology Week. " },
//         { startTime: 44.2, endTime: 50, text: "It is the first Australian study to address the issue of popularity and what it means to young people. " },

//         { startTime: 51, endTime: 54.2, text: "‘Both boys and girls agreed that many popular teenagers " },
//         { startTime: 54.3, endTime: 57.7, text: "are disliked by the year group as a whole,’ said Ms Hawke. " },
//         { startTime: 57.9, endTime: 61.3, text: "‘This can be for several reasons such as bullying, " },
//         { startTime: 61.7, endTime: 65.5, text: "having an attitude of superiority and disrupting the classroom." },
//         { startTime: 66, endTime: 70.5, text: "Those students who are described as being both popular and well-liked" },
//         { startTime: 71, endTime: 74.6, text: "manage to balance their high social status with positive qualities " },
//         { startTime: 75, endTime: 77, text: "such as being kind and friendly.’" },
//         { startTime: 78.2, endTime: 81.8, text: "The study also found that there was a complicated relationship" },
//         { startTime: 82, endTime: 85.2, text: "between both individual and group popularity," },
//         { startTime: 85.5, endTime: 88.2, text: "and how these were perceived by students." },
//         { startTime: 89, endTime: 93.8, text: "‘One interesting finding is that popular students are likely to belong to popular groups. " },
//         { startTime: 94.8, endTime: 97.9, text: "This was contrasted with well-liked students," },
//         { startTime: 98, endTime: 103.3, text: "who were much less likely to belong to groups of well-liked peers,’ said Ms Hawke. " },

//         { startTime: 104, endTime: 108.8, text: "‘It seems that being popular is about the group that you fit into, " },
//         { startTime: 109.4, endTime: 114.3, text: "whereas being well-liked is about the individual person’s inherent characteristics. " },
//         { startTime: 115, endTime: 120  , text: "Almost all of the students interviewed said that they would prefer to be known" },
//         { startTime: 119, endTime: 123.5, text: "as well-liked, as opposed to popular, " },
//         { startTime: 124, endTime: 127, text: "because this is a reflection of who they are as a person.’" },
//         { startTime: 128.3, endTime: 130.2, text: "She added that the results indicate" },
//         { startTime: 130.3, endTime: 135.5, text: "that ‘popular’ students are not idealised in the way that popular culture sometimes portrays," },
//         { startTime: 135.8, endTime: 142, text: "and that once other students are aware that many ‘popular’ students are not liked by others in their year group," },
//         { startTime: 142.3, endTime: 147.5, text: "it is possible that they will lose the power they are perceived to have." },
//     ],
//     timeMarkers: [
//         { time: 0.1, label: "1", color: "red" },
//         { time: 3.6, label: "2", color: "red" },
//         { time: 16.6, label: "3", color: "red" },
//         { time: 27.5, label: "4", color: "red" },
//         { time: 39, label: "5", color: "red" },
//         { time: 44.2, label: "6", color: "red" },
//         { time: 51, label: "7", color: "red" },
//         { time: 57.7, label: "8", color: "red" },
//         { time: 65.7, label: "9", color: "red" },
//         { time: 78, label: "10", color: "red" },
//         { time: 88.3, label: "11", color: "red" },
//         { time: 94, label: "12", color: "red" },
//         { time: 103.4, label: "13", color: "red" },
//         { time: 114.4, label: "14", color: "red" },
//         { time: 127.5, label: "15", color: "red" },
//     ],
//     quiz: [
//         {
//           question: "According to the ANU study, what did Canberra's young people prefer?",
//           options: [
//             "Being popular over being well-liked",
//             "Being well-liked over being popular",
//             "Being neither popular nor well-liked",
//             "Being both popular and well-liked equally"
//           ],
//           correctAnswer: 1,
//           referenceTime: 9.4 // "being well-liked is much more desirable than being popular"
//         },
//         {
//           question: "What was unique about this study in the Australian context?",
//           options: [
//             "It focused only on Year 9 students",
//             "It was conducted during Psychology Week",
//             "It was the first to study popularity among young people",
//             "It only studied Canberra students"
//           ],
//           correctAnswer: 2,
//           referenceTime: 44.2 // "It is the first Australian study to address the issue of popularity"
//         },
//         {
//           question: "Why were some popular teenagers disliked by their year group?",
//           options: [
//             "Because they were too studious",
//             "Because they were too quiet",
//             "Because of bullying, superiority attitudes, and classroom disruption",
//             "Because they belonged to popular groups"
//           ],
//           correctAnswer: 2,
//           referenceTime: 57.9 // "This can be for several reasons such as bullying..."
//         },
//         {
//           question: "What was found about the relationship between individual popularity and group membership?",
//           options: [
//             "Popular students rarely belonged to groups",
//             "Well-liked students usually belonged to well-liked groups",
//             "Popular students were likely to belong to popular groups",
//             "Group membership had no effect on popularity"
//           ],
//           correctAnswer: 2,
//           referenceTime: 89 // "popular students are likely to belong to popular groups"
//         },
//         {
//           question: "Why did students prefer to be known as well-liked rather than popular?",
//           options: [
//             "Because it made them more successful",
//             "Because it reflected who they were as a person",
//             "Because it gave them more friends",
//             "Because teachers preferred well-liked students"
//           ],
//           correctAnswer: 1,
//           referenceTime: 124 // "because this is a reflection of who they are as a person"
//         }
//       ],
//   },

// ];
