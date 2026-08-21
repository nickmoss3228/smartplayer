# Dream School: new game concept
---
# Part 1 — The decisions I can't make for you

## 1. The pitch

The current "Room" changes into a game where we have a Dream School. Get rid of the 3d view and the building of the interior for now, or simplify it a lot. Do the 2D dollhouse or isometric school. Keep the new game in a dreamy style, do not try to design it like a serious business, more like a chill game to spend your currencies and see your progress by collecting the words/phrases from the listening. The collection for now isn't set up in the main app, but you can add it later.

## 2. What's wrong with it now

It's boring, really, doesn't solve the problem of the motivation for the student in its current form.

## 3. The core loop

The player earns the bitaward and other bit coins - and then spends them to their own school.

A good core loop:
1. Complete a listening lesson.
2. Receive the three coin types.
3. Build, upgrade, or decorate the school.
4. Tap characters and objects to see short animations or hear learned phrases.
5. Unlock new rooms and campus areas over time.

The progression is up to debate.

## 4. How it connects to listening

- I want the progress to be tied to the room a lot! I want to describe it in more detail.

Each room can represent a different part of the app:
- Listening Lab: replay collected audio and unlock audio equipment.
- Library: display vocabulary as books or collectible cards.
- Theatre: create little scenes using learned phrases.
- Classroom: customise desks, boards, teachers, and students.
- Cafeteria: collect food and conversation scenes.
- Art Room: unlock colours, posters, and creative decorations.
- Playground: spend coins on entertaining interactions.
- Garden: slow, relaxing visual progression.
The Theatre could be especially valuable: students select learned phrases for characters, arrange them on a stage, and play a short conversation.


## 5. Winning, progressing, ending

- A player is working towards a score/collection and an ever-growing space.
- There essentially can be an end state, but as we will add more stories to listen to - it also can be unlimited. 
- Earning coins and being consistent.
- A player can't fall behind, undo the progress or lose things, but must be acknowledged by the game that he/she is doing very well/not very well.

## 6. The economy

*Today: **BitAward** is spent in the shop; **BitWord** and **BitPhrase** are
earned but have nothing to spend on.*

Main coins: New rooms, building expansions, floors, and outdoor areas
Vocabulary coins: Furniture, decorations, books, plants, outfits, and objects
Phrase coins: Character actions, conversations, animations, and interactive events

- Source: answering the questions/completing the stories. Sinks: shops for school's interior and exterior, animations etc.
- Prices should feel expensive - to get the feeling that you are working towards something big. The important and a big ones must have that, the smaller things are cheaper.
- Everything's a permanent unlock for now, if you have any ideas - suggest them.

## 7. Scope of the change

Replacement!

The data existing becomes meaningless, know that.

---

# Part 2 — Sharpening it

## 8. The space itself

Questions below are your questions, and I answer them below.

- *Still one room? Multiple rooms, floors, a building, an outdoor area?*
- A building, with an outdoor area, floors with rooms. 
- *Does it grow? What triggers growth — money, achievements, story progress?*
- It grows - and it is getting triggered mainly by the money, sometimes by achievements and a story progress - when it is you can decide yourself.
- *Do furniture slots stay fixed, or does placement become free-form / grid-based?*
- Keep the furniture fixed, let's evade the need of the free forming or grid-locking the things. 
- *Does anything in the room DO something now, rather than just being decoration?*
- Yes, make the things dynamic by nature, their functionality is described above (with room types).

## 9. The character

- *Still just an avatar you dress up, or does it gain a role?*
Just an avatar to dress up.

- *Does it act on its own — work, study, idle animations, react to things?*
It has its own things, you can't really control them. The things they do is different from room to room - if we navigate into the library - the character does the "reading" animation etc. 

- *Is it "you", or a pet/companion you look after?*
It is "me" - my game avatar representation that lives inside of the dream school that is also a recollection of things that I've learned in the app.

- *Does anything about it change with progress?*
It can change, but you must spend the coins.

## 10. Time and pacing

- *How long is a good session — one minute of check-in, or fifteen of play?*
It is around 5-10 minutes just to check, but it also can become the repetition hub, so think about it in terms of 10-15.
- *Does anything happen while the player is away (growth, income, decay)?*
Show with the animation of the character that we can't control that it missed the player or has been bored. Income will fully depend on the coins for now. 
- *Anything on a daily or weekly cadence?*
Announcements, but not now. Maybe announcements of the new set of stories.
- *Any timers, cooldowns, or streaks?*
Yes, but I can't tell you for now why, but definitely need them too.

## 11. Other players

*Today: you can look up a player and view a read-only snapshot of their room.*

- *Does the new concept stay solo, or lean social?*
Lean social - but just to see other player's progression by looking at the furniture and the achievements.
- *Visiting, gifting, trading, competing, leaderboards, co-op?*
Visiting, gifting, leaderboards are welcome. 
- *Anything a player would want to show off — and where would they show it?*
Show off in the rooms, as a furniture piece. For example - complete all the stories perfectly (with all answers correct) and get a golden statue (maybe even Leo as a character?). Or something else. 

## 12. Risk and scarcity

- *Can a player make a bad decision, or lose something?*
No
- *Is anything limited, seasonal, or one-time-only?*
Can be, probably sets of stories.
- *Should there be tension, or is this a relaxing, no-stakes space?*
It should be motivating rather than cause tension or relax them too much. It should feel like a stop over after a long day on the road. Like a place that you always are happy to come back to.

## 13. Look and feel

- *Mood in three adjectives.*
Magical, intellectual, motivating.
- *Keep the current voxel look, or change it?*
Change the voxel into the version I mentioned above at the start.

## 14. Content

- *Who creates the things in the game — you, in a config file, like the current catalogs? Admins via a builder? Players themselves?*
Things in the game must be created by you.
- *Roughly how many items/levels/whatever at launch?*
As many as you can, but enough for showing the Proof of Concept.
- *Does any of this connect to the Story Builder?*
In part. The story builder is a helper that makes it easier for me to produce stories and post them. Probably it is neccessary to track stories if we want to tie them to the achievements in the rooms and then save some phrases/words in the rooms.

# Part 3 — Practical

## 15. Non-goals
Not a competitive game, but can be if you check the leaderboards. Not real-time, based on the snapshots of people's schools.

## 16. Constraints

- *Must it work on mobile / offline / in a PWA?*
It will be transferred into the React Native later, so keep it in mind, but for now it is fully web/PWA.
- *Anything about it that must not slow the app down or blow up bundle size?*
If the size gets too big - separate the load of the game from the rest of the app. Like it is now - I keep the three.js code away and only load it when click on the Room icon.

## 17. First version vs later

*If you can only have one slice of this working first, which slice?*
The school's looks from the outside and a first set of accessible rooms with animations and a character having some animations too. Probably also should start with the character creation. And then into the game with the introduction explaining all. 

## 18. Open questions

The open questions are for now: the order in which these rooms become accessible or just are accessible at all times, the viewport and how will we show the rooms - I think it is easy to do as a fullscreen solution. Do not create the menus on the screen, but instead do them as a popup or sliding out of the side of the screen.

---

## Notes for me
 None for now.
