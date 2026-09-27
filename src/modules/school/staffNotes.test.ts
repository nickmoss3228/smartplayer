import { describe, expect, it } from 'vitest';
import en from '../../locales/en/translation.json';
import ru from '../../locales/ru/translation.json';
import { NoteContext, noteAt, noteRota, speakersFor } from './staffNotes';

const base: NoteContext = {
  owned: ['classroom'],
  learnedWords: [],
  hour: 10,
  season: 'autumn',
  canBuild: false,
};

const everyRoom = [
  'classroom', 'corridor', 'library', 'lab', 'courtyard', 'hall', 'lobby', 'forecourt',
  'classroomB', 'cafeteria', 'classroomC', 'gym', 'archive', 'staffRoom', 'musicRoom',
  'office', 'studyHall', 'garden', 'classroomD', 'classroomE',
];

type Tree = { school: { notes: { names: Record<string, string>; lines: Record<string, string> } } };

describe('notes from the staff', () => {
  it('only hears from people whose room has been built', () => {
    expect(speakersFor(['classroom']).map((s) => s.id)).toEqual(['parker']);
    const all = speakersFor(everyRoom).map((s) => s.id);
    expect(all).toContain('cook');
    expect(all).toContain('coach');
    expect(all).toContain('head');
    expect(speakersFor(['classroom', 'corridor', 'library']).map((s) => s.id)).not.toContain('cook');
  });

  it('always has something to say, from the very first classroom', () => {
    expect(noteAt(base, 0)).not.toBeNull();
    expect(noteAt(base, 10_000)).not.toBeNull();
    expect(noteAt(base, -3)).not.toBeNull();
  });

  it('takes turns rather than letting one person hold the floor', () => {
    const rota = noteRota({ ...base, owned: everyRoom });
    const firstRound = rota.slice(0, speakersFor(everyRoom).length).map((n) => n.speaker.id);
    expect(new Set(firstRound).size).toBe(firstRound.length);
  });

  it("quotes the player's own words, and only when there are some", () => {
    expect(noteRota(base).some((n) => n.line === 'word')).toBe(false);
    const withWords = noteRota({ ...base, learnedWords: ['journey', 'whisper'] });
    const word = withWords.find((n) => n.line === 'word');
    expect(word?.params.word).toMatch(/journey|whisper/);
  });

  it('only mentions another room when one is affordable', () => {
    const ctx = { ...base, owned: everyRoom };
    expect(noteRota(ctx).some((n) => n.line === 'anotherRoom')).toBe(false);
    expect(noteRota({ ...ctx, canBuild: true }).some((n) => n.line === 'anotherRoom')).toBe(true);
  });

  it('has every line and every name in both languages', () => {
    const lines = new Set<string>();
    const names = new Set<string>();
    for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
      for (const hour of [8, 14, 20]) {
        for (const n of noteRota({ owned: everyRoom, learnedWords: ['word'], hour, season, canBuild: true })) {
          lines.add(n.line);
          names.add(n.speaker.id);
        }
      }
    }
    for (const [lang, tree] of [['en', en], ['ru', ru]] as const) {
      const notes = (tree as unknown as Tree).school.notes;
      for (const line of lines) expect(notes.lines[line], `${lang}: line ${line}`).toBeTruthy();
      for (const name of names) expect(notes.names[name], `${lang}: name ${name}`).toBeTruthy();
    }
  });
});
