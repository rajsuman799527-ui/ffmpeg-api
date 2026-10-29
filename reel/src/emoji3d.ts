// 3D emoji (Microsoft Fluent Emoji, MIT licence). Files live in reel/public/emoji3d/.
import { staticFile } from 'remotion';

export const EMOJI3D: Record<string, string> = {
 "\ud83d\udd25": "fire.png",
 "\ud83d\udcb0": "money_bag.png",
 "\u2705": "check_mark_button.png",
 "\ud83d\ude80": "rocket.png",
 "\ud83d\udca1": "light_bulb.png",
 "\ud83d\udcaf": "hundred_points.png",
 "\u2b50": "star.png",
 "\u2764\ufe0f": "red_heart.png",
 "\u2764": "red_heart.png",
 "\ud83c\udfc6": "trophy.png",
 "\ud83d\udcc8": "chart_increasing.png",
 "\ud83e\udde0": "brain.png",
 "\ud83d\udc40": "eyes.png",
 "\ud83d\udc4d": "thumbs_up.png",
 "\ud83c\udf89": "party_popper.png",
 "\u26a0\ufe0f": "warning.png",
 "\u26a0": "warning.png",
 "\ud83d\udc8e": "gem_stone.png",
 "\ud83d\udc51": "crown.png",
 "\ud83d\udce3": "megaphone.png",
 "\ud83d\udc4f": "clapping_hands.png",
 "\ud83e\udd14": "thinking_face.png",
 "\u2728": "sparkles.png",
 "\ud83d\udd14": "bell.png",
 "\ud83d\udd12": "locked.png",
 "\ud83d\udd11": "key.png",
 "\u2699\ufe0f": "gear.png",
 "\u2699": "gear.png",
 "\ud83d\udcf1": "mobile_phone.png",
 "\ud83d\udcbb": "laptop.png",
 "\ud83d\udcc5": "calendar.png",
 "\ud83d\udcb8": "money_with_wings.png",
 "\ud83d\udcaa": "flexed_biceps.png",
 "\ud83d\ude0e": "smiling_face_with_sunglasses.png"
};

/** Returns the URL of the 3D picture for an emoji, or null when we do not have one. */
export const emoji3dSrc = (emoji: string): string | null => {
  const f = EMOJI3D[emoji] || EMOJI3D[emoji.replace(/\uFE0F/g, '')];
  return f ? staticFile('emoji3d/' + f) : null;
};
