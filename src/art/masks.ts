import type { SpriteDef } from './engine';

/* The masquerade: every host of the Velvet Abyss wears a mask. 28 px wide, drawn as the left half. */
export const MASKS: Record<string, SpriteDef> = {
  /* Floor I — Mother Moth: porcelain face, moth wings, closed gilded eyes, red lips */
  moth: { mirror: 'even', rows: ['......a.......', '.......a......', '........a.....', '.........a....', '..........a...', '...........bbb', 'nn.......bbbbb', 'nnnn....bbbbbb', 'nnnnnn.bbbbbbb', 'ntttnnnbbbbbbb', 'ntqtnnbbgggbbb', 'ntttnnbgbgbgbb', 'nnnnnnbbbbbbbb', '.nnnnnbcbbbbbb', '..nnnnbbbbbbbb', '...nnnbbbbbbbn', '.nnnnnnbbbbbbb', 'nnnnnnnbbbbbcc', 'nttnnnnbbbbbbr', 'ntqtnnnnbbbbbb', '.nttnnn.bbbbbb', '..nnnn...bbbbb', '...........bbb'] },
  /* Floor II — Sir Carrion: a crow-beaked helm under black plumage */
  carrion: { mirror: 'even', rows: ['......ssssssss', '....ssssssssss', '...sssssssssss', '..sssaaaaaaaaa', '..ssaaaaaaaaaa', '.ssaaiiaaaaaaa', '.ssaaiiaaaaaaa', '.ssakkkkkaaaaa', '.ssakkckkaaaaa', '.ssakkkkkaaaaa', '.ssaaaaaaaaagg', '..ssaaaaaaaggg', '..ssaaaaaagggg', '...ssaaaaagggy', '....ssaaaagggg', '.....ssaaaaggg', '......ssaaaagg', '.......ssssagg', '............gg', '..ss..ss.....g', '.sssssssss....', 'ssssssssssss..'] },
  /* Floor III — Sister Marrow: hooded, blindfolded, crowned with a halo of bone */
  marrow: { mirror: 'even', rows: [
    '.......bbbbbbb', '.....bbn......', '....bn........', '...bn....ppppp', '...b..pppppppp', '..bn.pppppwwww',
    '..b.ppppwwwwww', '..b.pppwwbbbbb', '..bpppwwbbbbbb', '..bppwwbbbbbbb', '..ppwwtttttttt', '..ppwwttttttqq',
    '..ppwwtttttttt', '..ppwwbbbbbbbb', '..ppwwbbbbbbbn', '..ppwwbbbbbbbb', '..ppwwwbbbbbkk', '..pppwwbbbbbbb',
    '...ppwwwbbbbbb', '...pppwwwbbbbb', '...ppppwwwwbbb', '....pppppwwwww', '....pppppppppp', '...ppppppppppp'] },
  /* Floor IV — the Proprietor: a gilded, horned, grinning mask */
  proprietor: { mirror: 'even', rows: ['s.............', 's.............', 'ss............', '.s............', '.ss...........', '..ss..........', '..sss......ggg', '...sss...ggggg', '....ssgggggggc', '.....sggggggcc', '.....ggggggggc', '....gggggggggg', '....gkkkkggggg', '....ggkkkkkggg', '....gggggggggo', '....gggggggggo', '....gggggggggg', '.....ggggggggg', '.....gkggggggg', '.....ggkkkkkkk', '......gggggggg', '.......ggggggg', '........gggggg', '..........gggg'] },
  /* You — a blank porcelain mask */
  player: { mirror: 'even', rows: [
    '.....bbbbb', '...bbbbbbb', '..bbbbbbbb', '.bbbbbbbbb', '.bbbbbbbbb', 'bbbbbbbbbb', 'bbkkkkbbbb', 'bkkkkkkbbb',
    'bbkkkkbbbb', 'bbbbbbbbbn', 'bbbbbbbbbn', '.bbbbbbbbb', '.bbbbbbbbb', '..bbbbbbkk', '..bbbbbbbb', '...bbbbbbb',
    '....bbbbbb', '......bbbb'] },
};
