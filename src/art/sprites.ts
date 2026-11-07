import type { SpriteDef } from './engine';

/* Every symbol in Velvet Abyss. One palette (engine.ts), auto outline, top-left light.
 * Most icons are 14 px wide before the outline and drawn as their left half (mirror: 'even'). */
const S: Record<string, SpriteDef> = {};

S.skull = { mirror: 'even', rows: [
  '..bbbbb', '.bbbbbb', 'bbbbbbb', 'bbbbbbb', 'bkkkbbb', 'bkkkbbb', 'bbkbbbk', '.bbbbkk', '.bbbbbb', '..bkbkb', '..bkbkb', '...bbbb'] };
S.crown_skull = { mirror: 'even', rows: [
  '......y', '..g...g', '..gg.gg', '..ggggg', '..grggg', '..bbbbb', '.bbbbbb', 'bbbbbbb', 'bkkkbbb', 'bkkkbbb', 'bbkbbbk', '.bbbbkk', '..bkbkb', '...bbbb'] };
S.coin = { mirror: 'even', rows: ['....ggg', '..ggggg', '.ggoooo', '.gogggg', 'ggogggy', 'ggoggyy', 'ggoggyy', 'ggogggy', '.gogggg', '.ggoooo', '..ggggg', '....ggg'] };
const gem: SpriteDef = { mirror: 'even', rows: [
  '...rrrr', '..rcccc', '.rcchcc', 'rrrrrrr', '.rccccc', '..rcccc', '...rccc', '....rcc', '.....rc', '......r'] };
S.ruby = gem;
S.emerald = { ...gem, map: { r: 'M', c: 'm', h: 'l' } };
S.sapphire = { ...gem, map: { r: 'U', c: 'u', h: 'j' } };
S.amethyst = { ...gem, map: { r: 'V', c: 'v', h: 'x' } };
S.diamond = { ...gem, map: { r: 'i', c: 'b', h: 'h' } };
S.chalice = { mirror: 'even', rows: [
  'ggggggg', '.gwwwww', '.gggggg', '..ggggg', '...gggg', '.....gg', '......g', '......g', '....ggg', '..ggggg', '..ooooo'] };
S.eye = { mirror: 'even', rows: ['....bbb', '..bbbbb', '.bbbttt', 'bbbttkk', '.bbbttt', '..bbbbb', '....bbb'] };
S.key = { mirror: 'even', rows: ['....ggg', '...gg..', '...gg..', '....ggg', '......g', '......g', '......g', '......g', '....ggg', '......g', '....ggg', '......g'] };
S.dagger = { mirror: 'even', rows: ['......i', '.....ii', '.....ii', '.....ii', '.....ii', '.....ii', '.....ii', '.gggggg', '.....ww', '.....ww', '.....ww', '....ggg'] };
S.moon = { rows: [
  '....bbbb....', '..bbbbb.....', '.bbbb.......', '.bbb........', 'bbb.........', 'bbb.........', 'bbb.........', 'bbb.........', '.bbb........', '.bbbb.......', '..bbbbb.....', '....bbbb....'] };
S.blood_moon = { ...S.moon, map: { b: 'c' } };
S.heart = { mirror: 'even', rows: ['.ccc...', 'cccccc.', 'ccccccc', 'ccccccc', '.cccccc', '..ccccc', '...cccc', '....ccc', '.....cc', '......c'] };
S.candle = { mirror: 'even', rows: ['......f', '.....ff', '.....fe', '......a', '....bbb', '....bbb', '....bbb', '....bbb', '....bbb', '..ggggg', '....ggg', '...gggg'] };
S.bell = { mirror: 'even', rows: ['......g', '.....gg', '....ggg', '...gggg', '...gggg', '..ggggg', '..ggggg', '.gggggg', 'ggggggg', '......g'] };
S.ring = { mirror: 'even', rows: ['.....cc', '....ccc', '.....gg', '...gggg', '..gg...', '.gg....', '.gg....', '.gg....', '..gg...', '...gggg'] };
S.hourglass = { mirror: 'even', rows: ['ooooooo', '.iiiiii', '..iffff', '...ifff', '....iff', '.....if', '.....if', '....iff', '...ifff', '..iffff', '.iiiiii', 'ooooooo'] };
S.spade_tool = { mirror: 'even', rows: ['......o', '......o', '......o', '......o', '......o', '......o', '....iii', '...iiii', '...iiii', '...iiii', '....iii', '.....ii'] };
S.chest = { mirror: 'even', rows: ['..ooooo', '.oooooo', 'oogoooo', 'ggggggg', 'oogoogy', 'oogooog', 'oogoooo', 'ggggggg'] };
S.tombstone = { mirror: 'even', rows: ['...aaaa', '.aaaaaa', '.aaaaai', '.aaaaii', '.aaaaai', '.aaaaai', '.aaaaaa', '.aaaaaa', 'sssssss'] };
S.door = { mirror: 'even', rows: ['...aaaa', '.aaoooo', '.aooopo', 'aaooopo', 'aaooopo', 'aaooopo', 'aaooopg', 'aaooopo', 'aaooopo', 'aaooopo', 'aaooopo', 'aaaaaaa'] };
S.door_open = { ...S.door, map: { o: 'd', p: 'd', g: 'd' } };
S.tome = { rows: [
  '.wwwwwwwwww.', 'wwwwwwwwwwwb', 'wwwgggggwwwb', 'wwwgwwwgwwwb', 'wwwgwywgwwwb', 'wwwgwwwgwwwb', 'wwwgggggwwwb', 'wwwwwwwwwwwb', 'wwwwwwwwwwwb', 'bbbbbbbbbbbb', '.nnnnnnnnnn.'] };
const vial: SpriteDef = { mirror: 'even', rows: ['.....nn', '.....ii', '.....ii', '...iiii', '..icccc', '.iccccc', '.iccccc', '.iccccc', '..icccc', '...iiii'] };
S.vial_red = vial;
S.vial_green = { ...vial, map: { c: 'm' } };
S.vial_blue = { ...vial, map: { c: 'u' } };
S.vial_violet = { ...vial, map: { c: 'v' } };
S.vial_teal = { ...vial, map: { c: 't' } };
S.rose = { rows: [
  '...cccc...', '..ccrrcc..', '.ccrccrcc.', '.crcrrcrc.', '.ccrrrrcc.', '..cccccc..', '....mm....', '..m.mm....', '..mmmm....', '....mm.m..', '....mmmm..', '....mm....'] };
S.raven = { rows: [
  '......ss......', '.....ssss.....', '....ssscs.....', '....sssssyy...', '...ssssss.....', '..sssssss.....', '.ssssssss.....', 'sssssssss.....', '..sssssss.....', '...sssssss....', '.....ss.ss....', '.....y...y....'] };

/* racers */
S.bat = { mirror: 'even', rows: ['s......', 'ss...a.', 'sss..aa', 'ssssaaa', 'sssaaca', 'ss.aaaa', 's..aaaa', '.....aa'] };
S.ghost = { mirror: 'even', rows: ['...qqqq', '.qqqqqq', '.qqqqqq', 'qqkkqqq', 'qqkkqqq', 'qqqqqkk', 'qqqqqqq', 'qqqqqqq', 'qqqqqqq', 'q.qq.qq'] };
S.spider = { mirror: 'even', rows: ['.a.....', 'a.a....', 'a..a.ss', '.a.ssss', 'aaasscs', '.a.ssss', 'a..a.ss', 'a.a.sss', '.a...ss'] };
S.slime = { mirror: 'even', rows: ['....mmm', '..mmmmm', '.mmmmmm', '.mkmmmm', 'mmkmmmm', 'mmmmmmm', 'mmmmmmm', 'mmmmmmm'] };
S.imp = { mirror: 'even', rows: ['.c.....', '.cc....', '..ccccc', '.cccccc', '.cfkccc', '.cccccc', '..ccckk', '...cccc', '..ccccc', '.cc.ccc', '.c...cc'] };
S.moth = { mirror: 'even', rows: ['....a..', 'n....a.', 'nnn..aa', 'nnnnnaa', 'nnoonaa', 'nnoonaa', 'nnnnnaa', '.nnn.aa', '..nnnaa', '..nn.a.'] };

/* dice faces (no auto light on the pips) */
const die = (pips: number[]): SpriteDef => {
  const g = Array.from({ length: 11 }, () => 'bbbbbbbbbbb'.split(''));
  const spots: Record<number, [number, number][]> = {
    1: [[5, 5]], 2: [[2, 2], [8, 8]], 3: [[2, 2], [5, 5], [8, 8]], 4: [[2, 2], [8, 2], [2, 8], [8, 8]],
    5: [[2, 2], [8, 2], [5, 5], [2, 8], [8, 8]], 6: [[2, 2], [8, 2], [2, 5], [8, 5], [2, 8], [8, 8]],
  };
  for (const [x, y] of spots[pips[0]]) { g[y][x] = 'r'; g[y][x + 1] = 'r'; g[y + 1][x] = 'r'; g[y + 1][x + 1] = 'r'; }
  return { rows: g.map(r => r.join('')) };
};
for (let i = 1; i <= 6; i++) S['die' + i] = die([i]);

/* chips */
S.chip = { mirror: 'even', rows: ['...cccc', '.cbcccc', '.ccrrrr', 'bcrcccc', 'ccrcccb', 'ccrcccc', 'bcrcccc', 'ccrcccb', '.ccrrrr', '.cbcccc', '...cccc'] };

/* card suits (flat, no outline), 7×7 */
S.pip_s = { mirror: 'odd', outline: false, shade: false, rows: ['...p', '..pp', '.ppp', 'pppp', 'pppp', '.p.p', '..pp'] };
S.pip_h = { mirror: 'odd', outline: false, shade: false, rows: ['.rr.', 'rrrr', 'rrrr', 'rrrr', '.rrr', '..rr', '...r'] };
S.pip_d = { mirror: 'odd', outline: false, shade: false, rows: ['...r', '..rr', '.rrr', 'rrrr', '.rrr', '..rr', '...r'] };
S.pip_c = { mirror: 'odd', outline: false, shade: false, rows: ['..pp', '..pp', 'pppp', 'pppp', 'pp.p', '...p', '..pp'] };

/* interface icons, 12 px */
S.i_cards = { rows: ['..bbbbbb....', '..bnnnnb....', 'bbbbbbnb....', 'bnnnnbnb....', 'bnrrnbnb....', 'bnrrnbnb....', 'bnnnnbbb....', 'bnnnnb......', 'bbbbbb......'] };
S.i_scroll = { rows: ['.nbbbbbbbb.', 'nbbbbbbbbbn', '.baaaaaab..', '.bbbbbbbb..', '.baaaaab...', '.bbbbbbbb..', '.baaaab....', '.bbbbbbbb..', 'nbbbbbbbbbn', '.nbbbbbbbb.'] };
S.i_vial = vial;
S.i_book = S.tome;
S.i_mask = { mirror: 'even', rows: ['..bbbbb', '.bbbbbb', 'bbbbbbb', 'bkkkbbb', 'bkkkbbb', 'bbbbbbb', '.bbbbbb', '..bbbbb', '...bbcc', '....bbb'] };
S.i_lock = { mirror: 'even', rows: ['...aaaa', '..a....', '..a....', '.gggggg', '.gggggg', '.ggggok', '.gggggo', '.gggggg'] };
S.i_back = { rows: ['....g.....', '...gg.....', '..ggggggg.', '.gggggggg.', '..ggggggg.', '...gg...g.', '....g...g.', '........g.', '...gggggg.'] };
S.i_info = { mirror: 'odd', rows: ['..gg', '.ggg', 'gggk', 'gggg', 'gggk', 'gggk', '.ggk', '..gg'] };
S.i_gold = S.coin;
S.i_soul = { mirror: 'even', rows: ['......q', '.....qq', '....qqt', '...qqtt', '...qqtt', '..qqttt', '..qqttt', '...qqtt', '....qqt', '.....tt'] };
S.i_hand = { rows: ['..g.g.g...', '..g.g.g.g.', '..g.g.g.g.', '.ggggggggg', 'g.gggggggg', 'gggggggggg', '.ggggggggg', '..gggggggg', '...ggggggg', '....gggggg'] };
S.i_flame = { mirror: 'even', rows: ['......f', '.....ff', '....fef', '...feef', '..feeef', '.feerre', '.ferrre', '.ferrre', '..ferre', '...ffee'] };

export const SPRITES = S;
