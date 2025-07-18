// Mapping des emojis textuels vers les emojis Unicode
export const TEXT_EMOJI_MAPPING: { [key: string]: string } = {
  // Smileys basiques
  ':)': '😊',
  ':-)': '😊',
  ':(': '😢',
  ':-(': '😢',
  ':D': '😃',
  ':-D': '😃',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ';)': '😉',
  ';-)': '😉',
  ':O': '😮',
  ':-O': '😮',
  ':o': '😮',
  ':-o': '😮',
  ':S': '😕',
  ':-S': '😕',
  ':s': '😕',
  ':-s': '😕',
  ':|': '😐',
  ':-|': '😐',
  ':/': '😕',
  ':-/': '😕',
  ':\\': '😕',
  ':-\\': '😕',
  ':X': '😶',
  ':-X': '😶',
  ':x': '😶',
  ':-x': '😶',
  
  // Emojis plus avancés
  '<3': '❤️',
  '</3': '💔',
  '>:(': '😠',
  '>:-(': '😠',
  '>:D': '😈',
  '>:-D': '😈',
  '>:P': '😈',
  '>:-P': '😈',
  '>:p': '😈',
  '>:-p': '😈',
  'D:': '😱',
  'D=': '😱',
  'o.O': '😵',
  'O.o': '😵',
  'o.o': '😵',
  'O.O': '😵',
  'v.v': '😵',
  'V.V': '😵',
  'v.V': '😵',
  'V.v': '😵',
  
  // Emojis avec variations
  '=)': '😊',
  '=(': '😢',
  '=D': '😃',
  '=P': '😛',
  '=p': '😛',
  '=O': '😮',
  '=o': '😮',
  '=S': '😕',
  '=s': '😕',
  '=|': '😐',
  '=/': '😕',
  '=\\': '😕',
  '=X': '😶',
  '=x': '😶',
  
  // Emojis spéciaux
  ':*': '😘',
  ':-*': '😘',
  ':3': '😊',
  ':-3': '😊',
  '^_^': '��',
  '^_~': '😉',
  'T_T': '😭',
  'T.T': '😭',
  'T^T': '😭',
  ';_;': '😢',
  ';.;': '😢',
  ';^;': '😢',
  'XD': '😂',
  'xd': '😂',
  'XDD': '😂',
  'xdd': '😂',
  
  // Emojis avec espaces
  ' : )': '😊',
  ' : (': '😢',
  ' : D': '😃',
  ' : P': '😛',
  ' : p': '😛',
  ' ; )': '😉',
  ' : O': '😮',
  ' : o': '😮',
  ' : S': '😕',
  ' : s': '😕',
  ' : |': '😐',
  ' : /': '😕',
  ' : \\': '😕',
  ' : X': '😶',
  ' : x': '😶',
  
  // Emojis avec points
  '..': '😐',
  '...': '😐',
  '....': '😐',
  '.....': '😐',
  
  // Emojis de réaction
  'thumbsup': '👍',
  'thumbsdown': '👎',
  'ok': '👌',
  'peace': '✌️',
  'heart': '❤️',
  'star': '⭐',
  'fire': '🔥',
  '100': '💯',
  'clap': '👏',
  'pray': '🙏',
  'wave': '👋',
  'point': '👆',
  'fist': '✊',
  'rock': '🤘',
  'metal': '🤘',
  
  // Emojis d'émotions
  'happy': '😊',
  'sad': '😢',
  'laugh': '😂',
  'cry': '😭',
  'angry': '😠',
  'surprised': '😮',
  'confused': '😕',
  'cool': '😎',
  'wink': '😉',
  'kiss': '😘',
  'love': '❤️',
  'hate': '😡',
  'sleep': '😴',
  'sick': '🤒',
  'dead': '💀',
  'ghost': '👻',
  'alien': '👽',
  'robot': '🤖',
  'clown': '🤡',
  'poop': '💩',
  
  // Emojis d'activités
  'party': '🎉',
  'birthday': '🎂',
  'gift': '🎁',
  'music': '🎵',
  'game': '🎮',
  'sport': '⚽',
  'food': '🍕',
  'drink': '🍺',
  'coffee': '☕',
  'beer': '🍺',
  'wine': '🍷',
  'cocktail': '🍸',
  'pizza': '🍕',
  'burger': '🍔',
  'fries': '🍟',
  'icecream': '🍦',
  'cake': '🍰',
  'candy': '🍬',
  'chocolate': '🍫',
  'apple': '🍎',
  'banana': '🍌',
  'orange': '🍊',
  'grape': '🍇',
  'strawberry': '🍓',
  'cherry': '🍒',
  'peach': '🍑',
  'lemon': '🍋',
  'lime': '🍋',
  'watermelon': '🍉',
  'pineapple': '🍍',
  'coconut': '🥥',
  'kiwi': '🥝',
  'tomato': '🍅',
  'carrot': '🥕',
  'corn': '🌽',
  'potato': '🥔',
  'onion': '🧅',
  'garlic': '🧄',
  'pepper': '🌶️',
  'mushroom': '🍄',
  'eggplant': '🍆',
  'cucumber': '🥒',
  'lettuce': '🥬',
  'broccoli': '🥦',
  'avocado': '🥑',
  'olive': '🫒',
  'bread': '🍞',
  'cheese': '🧀',
  'egg': '🥚',
  'bacon': '🥓',
  'meat': '🥩',
  'chicken': '🍗',
  'fish': '🐟',
  'shrimp': '🦐',
  'crab': '🦀',
  'lobster': '🦞',
  'oyster': '🦪',
  'sushi': '🍣',
  'rice': '🍚',
  'noodles': '🍜',
  'pasta': '🍝',
  'soup': '🍲',
  'salad': '🥗',
  'taco': '🌮',
  'burrito': '🌯',
  'hotdog': '🌭',
  'sandwich': '🥪',
  'donut': '🍩',
  'cookie': '🍪',
  'muffin': '🧁',
  'cupcake': '🧁',
  'pie': '🥧',
  'pudding': '🍮',
  'jelly': '🍮',
  'honey': '🍯',
  'milk': '🥛',
  'juice': '🧃',
  'soda': '🥤',
  'tea': '🍵',
  'water': '💧',
  'champagne': '🍾',
  'margarita': '🍹',
  'mojito': '🍹',
  'daiquiri': '🍹',
  'martini': '🍸',
  'whiskey': '🥃',
  'vodka': '🥃',
  'rum': '🥃',
  'gin': '🥃',
  'tequila': '🥃',
  'brandy': '🥃',
  'cognac': '🥃',
  'ale': '🍺',
  'lager': '🍺',
  'stout': '🍺',
  'porter': '🍺',
  'wheat': '🍺',
  'ipa': '🍺',
  'pilsner': '🍺',
  'bock': '🍺',
  'doppelbock': '🍺',
  'kolsch': '🍺',
  'hefeweizen': '🍺',
  'saison': '🍺',
  'lambic': '🍺',
  'gueuze': '🍺',
  'kriek': '🍺',
  'framboise': '🍺',
  'peche': '🍺',
  'cassis': '🍺',
};

// Fonction pour remplacer les emojis textuels par des emojis Unicode
export const replaceTextEmojis = (text: string): string => {
  let result = text;
  
  console.log("replaceTextEmojis appelée avec:", text);
  
  // Remplacer les emojis textuels par ordre de longueur (plus longs d'abord)
  const sortedEmojis = Object.keys(TEXT_EMOJI_MAPPING).sort((a, b) => b.length - a.length);
  
  for (const textEmoji of sortedEmojis) {
    // Utiliser une regex différente selon le type d'emoji
    let regex: RegExp;
    
    if (textEmoji.startsWith('<') || textEmoji.startsWith('>')) {
      // Pour les emojis spéciaux comme <3, >:(, etc. - pas de word boundary
      regex = new RegExp(`${textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    } else if (textEmoji.includes('_') || textEmoji.includes('.')) {
      // Pour les emojis comme ^_^, T_T, etc. - pas de word boundary
      regex = new RegExp(`${textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    } else if (textEmoji.includes(':')) {
      // Pour les emojis avec : comme :), :D, etc. - word boundary
      regex = new RegExp(`\\b${textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    } else {
      // Pour les mots-clés comme "happy", "fire", etc. - word boundary
      regex = new RegExp(`\\b${textEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    }
    
    // Ajouter des logs pour debug
    console.log(`Tentative de remplacement: "${textEmoji}" → "${TEXT_EMOJI_MAPPING[textEmoji]}"`);
    console.log(`Regex: ${regex}`);
    console.log(`Texte avant: "${result}"`);
    
    const newResult = result.replace(regex, TEXT_EMOJI_MAPPING[textEmoji]);
    
    if (newResult !== result) {
      console.log(`Remplacement réussi: "${textEmoji}" → "${TEXT_EMOJI_MAPPING[textEmoji]}"`);
      console.log(`Texte après: "${newResult}"`);
    }
    
    result = newResult;
  }
  
  console.log("replaceTextEmojis retourne:", result);
  return result;
};

// Fonction pour détecter si un texte contient des emojis textuels
export const hasTextEmojis = (text: string): boolean => {
  const textEmojis = Object.keys(TEXT_EMOJI_MAPPING);
  return textEmojis.some(emoji => text.toLowerCase().includes(emoji.toLowerCase()));
}; 