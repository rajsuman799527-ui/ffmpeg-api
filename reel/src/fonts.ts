import { loadFont as poppins } from '@remotion/google-fonts/Poppins';
import { loadFont as playfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as anton } from '@remotion/google-fonts/Anton';
import { loadFont as inter } from '@remotion/google-fonts/Inter';
import { loadFont as outfit } from '@remotion/google-fonts/Outfit';
import { loadFont as cormorant } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as deva } from '@remotion/google-fonts/NotoSansDevanagari';

const sub = { subsets: ['latin'] as ['latin'] };
export const F = {
  poppins: poppins('normal', { weights: ['500', '600', '700', '800'], ...sub }).fontFamily,
  poppinsItalic: poppins('italic', { weights: ['500', '600', '700'], ...sub }).fontFamily,
  playfair: playfair('normal', { weights: ['700', '800', '900'], ...sub }).fontFamily,
  anton: anton('normal', { weights: ['400'], ...sub }).fontFamily,
  inter: inter('normal', { weights: ['400', '500', '600', '700', '800'], ...sub }).fontFamily,
  outfit: outfit('normal', { weights: ['600', '700', '800'], ...sub }).fontFamily,
  cormorant: cormorant('normal', { weights: ['500', '600'], ...sub }).fontFamily,
  cormorantItalic: cormorant('italic', { weights: ['500', '600'], ...sub }).fontFamily,
  // Hindi (Devanagari) text: without this the captions turn into empty boxes
  deva: deva('normal', { weights: ['500', '700'], subsets: ['devanagari'] }).fontFamily,
};
