"use client";
import { useState, useRef, useEffect } from "react";

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: "Récent",
    emojis: ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "👏", "🔥", "💯"]
  },
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"]
  },
  {
    name: "Animaux",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🐣", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"]
  },
  {
    name: "Nourriture",
    emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍷", "🥂", "🥃", "🍸", "🍹", "🧉", "🍾", "🥄", "🍴", "🍽️", "🥄", "🥡", "🥢", "🧂"]
  },
  {
    name: "Activités",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷️", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹‍♀️", "🤹", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩", "🎨", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥", "📺", "📻", "📷", "📸", "📹", "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "🪔", "📔", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄", "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "🪙", "💴", "💵", "💶", "💷", "🪙", "💳", "🧾", "💸", "🪙", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "🪨", "🪵", "🛖", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🪔", "🎎", "🪆", "🎍", "🎋", "🎊", "🎉", "🎈", "🎂", "🎀", "🪄", "🎁", "🎗️", "🎟️", "🎫", "🎠", "🎡", "🎢", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"]
  }
];

export default function EmojiPicker({ onSelectEmoji, isVisible, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  // Filtrer les emojis basés sur la recherche
  const filteredEmojis = EMOJI_CATEGORIES.map(category => ({
    ...category,
    emojis: category.emojis.filter(emoji => 
      searchQuery === "" || emoji.includes(searchQuery)
    )
  })).filter(category => category.emojis.length > 0);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 bg-[#2f3136] border border-[#23272a] rounded-lg shadow-lg z-20 w-80 max-h-96 overflow-hidden"
    >
      {/* Barre de recherche */}
      <div className="p-3 border-b border-[#40444b]">
        <input
          type="text"
          placeholder="Rechercher un emoji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 bg-[#40444b] text-white rounded text-sm border-none focus:ring-2 focus:ring-[#5865f2] placeholder-gray-400"
        />
      </div>

      {/* Catégories */}
      <div className="flex border-b border-[#40444b]">
        {filteredEmojis.map((category, index) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(index)}
            className={`flex-1 p-2 text-xs transition-colors ${
              selectedCategory === index 
                ? 'bg-[#5865f2] text-white' 
                : 'text-gray-400 hover:bg-[#40444b]'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Emojis */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-2">
          {filteredEmojis[selectedCategory]?.emojis.map((emoji, index) => (
            <button
              key={`${selectedCategory}-${index}`}
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#40444b] rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 