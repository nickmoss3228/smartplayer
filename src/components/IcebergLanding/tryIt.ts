// Where the landing's main buttons go: the level picker, in "try it" mode.
// A visitor picks their own level there, and the glass opens part 1 of that
// level's first story straight in the player — not the shelf, and not the easy
// level chosen for them (it used to be part 1 of «Приключения Лео» for
// everyone, which was the wrong first taste for anyone past beginner).
//
// Part 1 of each first story is inside the free allowance, so a guest hears
// it without signing up. The player reads `fromLanding` to offer
// «Слишком легко? Сменить уровень», which comes back here in the same mode.
export const TRY_IT_PATH = '/levels';
export const TRY_IT_STATE = { tryIt: true } as const;

/** The story each level starts with: the first of its main character's. */
export const FIRST_STORY = { easy: 'leo', medium: 'maya', hard: 'daniel' } as const;

export const firstPartPath = (level: keyof typeof FIRST_STORY) => `/levels/${level}/${FIRST_STORY[level]}/1`;
export const PLAYER_FROM_TRY_IT_STATE = { fromLanding: true } as const;

export const isTryIt = (state: unknown) => Boolean((state as { tryIt?: boolean } | null)?.tryIt);
