const EMOJI_DATA = [
  // Faces - Smiling & Happy
  { emoji: '😀', keywords: ['grinning', 'smile', 'happy', 'face'] },
  { emoji: '😃', keywords: ['smiley', 'happy', 'smile', 'big eyes'] },
  { emoji: '😄', keywords: ['smile', 'happy', 'laugh', 'grin'] },
  { emoji: '😁', keywords: ['grin', 'happy', 'beaming', 'teeth'] },
  { emoji: '😆', keywords: ['laughing', 'haha', 'squint', 'xd'] },
  { emoji: '😅', keywords: ['sweat smile', 'nervous', 'relief', 'haha'] },
  { emoji: '🤣', keywords: ['rofl', 'rolling', 'laughing', 'lmao'] },
  { emoji: '😂', keywords: ['laugh', 'funny', 'lol', 'haha', 'tears'] },
  { emoji: '🙂', keywords: ['slightly smiling', 'ok', 'fine', 'nice'] },
  { emoji: '😊', keywords: ['blush', 'happy', 'smile', 'warm'] },
  { emoji: '😇', keywords: ['angel', 'innocent', 'halo', 'blessed'] },

  // Faces - Affection & Love
  { emoji: '🥰', keywords: ['love', 'hearts', 'adore', 'affection'] },
  { emoji: '😍', keywords: ['heart eyes', 'love', 'crush', 'beautiful'] },
  { emoji: '🤩', keywords: ['star eyes', 'starstruck', 'excited', 'wow'] },
  { emoji: '😘', keywords: ['kiss', 'love', 'blow kiss', 'mwah'] },
  { emoji: '😋', keywords: ['yummy', 'delicious', 'tasty', 'tongue'] },

  // Faces - Playful
  { emoji: '😜', keywords: ['wink tongue', 'playful', 'silly', 'joking'] },
  { emoji: '🤪', keywords: ['zany', 'crazy', 'wild', 'goofy'] },
  { emoji: '😝', keywords: ['tongue', 'silly', 'bleh', 'squint'] },
  { emoji: '😏', keywords: ['smirk', 'sly', 'smug', 'suggestive'] },

  // Faces - Neutral & Skeptical
  { emoji: '🤔', keywords: ['thinking', 'hmm', 'consider', 'pondering'] },
  { emoji: '🤨', keywords: ['raised eyebrow', 'skeptical', 'suspicious', 'doubt'] },
  { emoji: '😐', keywords: ['neutral', 'blank', 'meh', 'straight face'] },
  { emoji: '😑', keywords: ['expressionless', 'unamused', 'flat', 'blank'] },
  { emoji: '🙄', keywords: ['eye roll', 'whatever', 'annoyed', 'ugh'] },

  // Faces - Sleepy & Sick
  { emoji: '😴', keywords: ['sleeping', 'tired', 'zzz', 'sleepy'] },
  { emoji: '🤤', keywords: ['drooling', 'hungry', 'yummy', 'want'] },
  { emoji: '😷', keywords: ['mask', 'sick', 'ill', 'covid'] },
  { emoji: '🤒', keywords: ['thermometer', 'fever', 'sick', 'ill'] },
  { emoji: '🤮', keywords: ['vomit', 'sick', 'gross', 'disgusted'] },

  // Faces - Concerned & Sad
  { emoji: '😬', keywords: ['grimace', 'awkward', 'nervous', 'yikes'] },
  { emoji: '😰', keywords: ['anxious', 'sweat', 'worried', 'nervous'] },
  { emoji: '😨', keywords: ['fearful', 'scared', 'shocked', 'afraid'] },
  { emoji: '😱', keywords: ['scream', 'shocked', 'terrified', 'omg'] },
  { emoji: '😢', keywords: ['cry', 'sad', 'tear', 'upset'] },
  { emoji: '😭', keywords: ['sobbing', 'crying', 'bawling', 'sad'] },
  { emoji: '😤', keywords: ['frustrated', 'angry', 'huff', 'steam'] },
  { emoji: '😡', keywords: ['angry', 'mad', 'rage', 'furious'] },

  // Faces - Costume & Special
  { emoji: '😎', keywords: ['sunglasses', 'cool', 'deal with it', 'awesome'] },
  { emoji: '🤓', keywords: ['nerd', 'glasses', 'geek', 'smart'] },
  { emoji: '🥳', keywords: ['party', 'celebration', 'birthday', 'hooray'] },
  { emoji: '🤯', keywords: ['mind blown', 'exploding', 'shocked', 'wow'] },
  { emoji: '🫡', keywords: ['salute', 'respect', 'yes sir', 'honor'] },
  { emoji: '🫠', keywords: ['melting', 'warm', 'embarrassed', 'dissolve'] },
  { emoji: '💀', keywords: ['skull', 'dead', 'dying', 'hilarious'] },
  { emoji: '🤡', keywords: ['clown', 'joke', 'silly', 'foolish'] },
  { emoji: '👻', keywords: ['ghost', 'spooky', 'halloween', 'boo'] },

  // Hand Gestures
  { emoji: '👍', keywords: ['thumbs up', 'like', 'approve', 'yes', 'good'] },
  { emoji: '👎', keywords: ['thumbs down', 'dislike', 'no', 'bad'] },
  { emoji: '👏', keywords: ['clap', 'applause', 'bravo', 'well done'] },
  { emoji: '🙌', keywords: ['raised hands', 'celebration', 'hooray', 'praise'] },
  { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'partnership'] },
  { emoji: '🙏', keywords: ['pray', 'please', 'thanks', 'folded hands', 'namaste'] },
  { emoji: '✌️', keywords: ['peace', 'victory', 'two', 'v sign'] },
  { emoji: '🤞', keywords: ['fingers crossed', 'luck', 'hope', 'wish'] },
  { emoji: '👌', keywords: ['ok', 'perfect', 'fine', 'nice'] },
  { emoji: '🤙', keywords: ['call me', 'shaka', 'hang loose', 'chill'] },
  { emoji: '👋', keywords: ['wave', 'hello', 'goodbye', 'hi', 'bye'] },
  { emoji: '✋', keywords: ['raised hand', 'stop', 'high five', 'halt'] },
  { emoji: '💪', keywords: ['muscle', 'strong', 'flex', 'power', 'strength'] },
  { emoji: '🖕', keywords: ['middle finger', 'rude', 'flip off'] },
  { emoji: '🫶', keywords: ['heart hands', 'love', 'care', 'gratitude'] },
  { emoji: '🤷', keywords: ['shrug', 'idk', 'whatever', 'dunno'] },
  { emoji: '🤦', keywords: ['facepalm', 'smh', 'disappointed', 'doh'] },

  // Hearts & Love
  { emoji: '❤️', keywords: ['heart', 'love', 'like', 'red heart'] },
  { emoji: '🧡', keywords: ['orange heart', 'love', 'warm'] },
  { emoji: '💛', keywords: ['yellow heart', 'love', 'friendship'] },
  { emoji: '💚', keywords: ['green heart', 'love', 'nature'] },
  { emoji: '💙', keywords: ['blue heart', 'love', 'trust'] },
  { emoji: '💜', keywords: ['purple heart', 'love', 'luxury'] },
  { emoji: '🖤', keywords: ['black heart', 'dark', 'love'] },
  { emoji: '💔', keywords: ['broken heart', 'heartbreak', 'sad'] },

  // Symbols & Objects
  { emoji: '🔥', keywords: ['fire', 'hot', 'lit', 'awesome', 'flames'] },
  { emoji: '⭐', keywords: ['star', 'favorite', 'excellent', 'shine'] },
  { emoji: '🌟', keywords: ['glowing star', 'sparkle', 'amazing'] },
  { emoji: '✨', keywords: ['sparkles', 'magic', 'new', 'clean'] },
  { emoji: '💯', keywords: ['hundred', 'perfect', 'score', '100'] },
  { emoji: '✅', keywords: ['check', 'done', 'complete', 'yes', 'correct'] },
  { emoji: '❌', keywords: ['cross', 'no', 'wrong', 'error', 'delete'] },
  { emoji: '⚠️', keywords: ['warning', 'caution', 'alert', 'danger'] },
  { emoji: '❓', keywords: ['question', 'what', 'confused', 'ask'] },
  { emoji: '❗', keywords: ['exclamation', 'important', 'alert', 'attention'] },
  { emoji: '💡', keywords: ['idea', 'lightbulb', 'tip', 'think'] },
  { emoji: '🎯', keywords: ['target', 'bullseye', 'goal', 'direct hit'] },
  { emoji: '🏆', keywords: ['trophy', 'winner', 'champion', 'award'] },
  { emoji: '🎉', keywords: ['celebration', 'party', 'congratulations', 'congrats', 'tada'] },
  { emoji: '🎊', keywords: ['confetti', 'celebration', 'party', 'festive'] },
  { emoji: '🚀', keywords: ['rocket', 'launch', 'fast', 'ship it', 'deploy'] },
  { emoji: '💎', keywords: ['diamond', 'gem', 'precious', 'valuable'] },
  { emoji: '🔑', keywords: ['key', 'important', 'solution', 'unlock'] },
  { emoji: '⏰', keywords: ['alarm', 'clock', 'time', 'deadline'] },
  { emoji: '📌', keywords: ['pin', 'important', 'note', 'bookmark'] },
  { emoji: '📝', keywords: ['memo', 'note', 'write', 'document'] },
  { emoji: '🔗', keywords: ['link', 'chain', 'url', 'connection'] },
  { emoji: '📢', keywords: ['megaphone', 'announce', 'loud', 'attention'] },

  // Animals
  { emoji: '🐶', keywords: ['dog', 'puppy', 'pet', 'cute'] },
  { emoji: '🐱', keywords: ['cat', 'kitten', 'pet', 'meow'] },
  { emoji: '🐻', keywords: ['bear', 'animal', 'teddy', 'cute'] },
  { emoji: '🦄', keywords: ['unicorn', 'magic', 'fantasy', 'rare'] },
  { emoji: '🐍', keywords: ['snake', 'python', 'hiss'] },
  { emoji: '🦀', keywords: ['crab', 'rust', 'pinch', 'seafood'] },

  // Eyes & Looking
  { emoji: '👀', keywords: ['eyes', 'look', 'watching', 'see', 'stare'] },
  { emoji: '👁️', keywords: ['eye', 'see', 'watch', 'observe'] },

  // Food & Drink
  { emoji: '☕', keywords: ['coffee', 'tea', 'hot drink', 'morning'] },
  { emoji: '🍕', keywords: ['pizza', 'food', 'dinner', 'lunch'] },
  { emoji: '🍺', keywords: ['beer', 'drink', 'cheers', 'pub'] },
  { emoji: '🍿', keywords: ['popcorn', 'movie', 'drama', 'watching'] },
  { emoji: '🎂', keywords: ['cake', 'birthday', 'celebration', 'party'] },

  // Nature & Weather
  { emoji: '🌈', keywords: ['rainbow', 'colorful', 'hope', 'beautiful'] },
  { emoji: '☀️', keywords: ['sun', 'sunny', 'bright', 'weather'] },
  { emoji: '🌙', keywords: ['moon', 'night', 'crescent', 'sleep'] },
  { emoji: '⚡', keywords: ['lightning', 'electric', 'fast', 'zap', 'thunder'] },
  { emoji: '💧', keywords: ['water', 'drop', 'tear', 'sweat'] },
];

export const QUICK_EMOJIS = ['👍', '👎', '❤️', '😂', '🎉', '🤔', '👀', '🔥'];
export default EMOJI_DATA;
