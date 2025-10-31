import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Gamepad2, Swords, Flame, Shield, Crown, X, Edit3 } from "lucide-react";
import ProfileImageUpload from "../ui/ProfileImageUpload";
import CountryFlagPicker from "../ui/CountryFlagPicker";
import { USDFG_RELICS, getUnlockedTrophies, getNextTrophy, getTrophyProgress, getTrophyColorClass } from "@/lib/trophies";

// Countries list for flag display - matches CountryFlagPicker
const countries = [
  // North America
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  
  // South America
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  
  // Europe
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "XK", name: "Kosovo", flag: "🇽🇰" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  
  // Asia
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "KP", name: "North Korea", flag: "🇰🇵" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "TL", name: "East Timor", flag: "🇹🇱" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "PS", name: "Palestine", flag: "🇵🇸" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  
  // Africa
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "CG", name: "Republic of the Congo", flag: "🇨🇬" },
  { code: "CD", name: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  
  // Oceania
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "NC", name: "New Caledonia", flag: "🇳🇨" },
  { code: "PF", name: "French Polynesia", flag: "🇵🇫" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
];

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    name: string;
    address: string;
    totalEarned: number;
    winRate: number;
    wins: number;
    losses: number;
    rank?: number;
    wallet?: string;
    displayName?: string;
    country?: string;
    profileImage?: string;
    lastActive?: { seconds: number };
  };
  isCurrentUser?: boolean;
  onEditProfile?: (newName: string) => void;
  onCountryChange?: (country: string | null) => void;
  onProfileImageChange?: (image: string | null) => void;
  onChallengePlayer?: (playerData: any) => void;
  hasActiveChallenge?: boolean;
}

export default function PlayerProfileModal({ 
  isOpen, 
  onClose, 
  player, 
  isCurrentUser = false, 
  onEditProfile,
  onCountryChange,
  onProfileImageChange,
  onChallengePlayer,
  hasActiveChallenge = false
}: PlayerProfileModalProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.displayName || player.name || 'Player');
  const [selectedTrophies, setSelectedTrophies] = useState<string[]>([]);
  const [tempSelectedTrophies, setTempSelectedTrophies] = useState<string[]>([]);
  const [isEditingTrophies, setIsEditingTrophies] = useState(false);
  const [selectedTrophyForPopup, setSelectedTrophyForPopup] = useState<any>(null);
  
  // Stable mock values that don't change on re-render
  const [mockStreak] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [mockIntegrity] = useState(() => (9.0 + Math.random()).toFixed(1));
  
  
  if (!isOpen) return null;

  const handleSaveName = () => {
    if (onEditProfile && editedName.trim()) {
      onEditProfile(editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleTrophyToggle = (trophyId: string) => {
    if (tempSelectedTrophies.includes(trophyId)) {
      setTempSelectedTrophies(tempSelectedTrophies.filter(id => id !== trophyId));
    } else if (tempSelectedTrophies.length < 3) {
      setTempSelectedTrophies([...tempSelectedTrophies, trophyId]);
    }
  };

  const handleSaveTrophySelection = () => {
    setSelectedTrophies([...tempSelectedTrophies]);
    setIsEditingTrophies(false);
    // TODO: Save to backend/database
  };

  const handleCancelTrophySelection = () => {
    setTempSelectedTrophies([...selectedTrophies]);
    setIsEditingTrophies(false);
  };

  const startTrophyEditing = () => {
    setTempSelectedTrophies([...selectedTrophies]);
    setIsEditingTrophies(true);
  };

  const handleTrophyClick = (trophy: any) => {
    if (!isEditingTrophies) {
      setSelectedTrophyForPopup(trophy);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditedName(player.displayName || player.name || 'Player');
      setIsEditingName(false);
    }
  };

        // Calculate additional stats
        const totalGames = (player.wins || 0) + (player.losses || 0);
        const streak = mockStreak; // Stable mock streak
        const integrity = mockIntegrity; // Stable mock integrity rating
        const favoriteGame = "Valorant"; // Mock favorite game
        const rank = player.rank || 1;
        const rankTitle = rank === 1 ? "Mythic Prime" : rank <= 3 ? "Diamond Elite" : rank <= 10 ? "Platinum Pro" : "Gold Warrior";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-5xl max-h-[85vh] rounded-[28px] bg-[#07080C]/95 border border-zinc-800 overflow-y-auto shadow-[0_0_60px_rgba(255,215,130,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <X className="h-5 w-5 text-zinc-400" />
        </button>

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,170,.08),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-[borderPulse_3s_ease-in-out_infinite]" />

        {/* Header / Avatar */}
        <div className="relative z-10 flex flex-col items-center gap-3 pt-10">
          {isCurrentUser ? (
            <ProfileImageUpload
              currentImage={player.profileImage}
              onImageChange={onProfileImageChange || (() => {})}
              size="lg"
            />
          ) : (
            <div className="relative h-28 w-28 rounded-full bg-zinc-900 grid place-items-center ring-2 ring-amber-300/60 overflow-hidden shadow-[0_0_40px_rgba(255,215,130,0.25)]">
              {player.profileImage ? (
                <img
                  src={player.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gamepad2 className="h-10 w-10 text-amber-300" />
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,235,170,.2),transparent_70%)]" />
            </div>
          )}

          {isCurrentUser && isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveName}
                className="text-4xl font-bold tracking-tight text-white bg-transparent border-b-2 border-amber-300 focus:outline-none uppercase text-center"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-amber-300 hover:text-white transition-colors"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div 
              className={`text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,215,130,0.25)] uppercase ${isCurrentUser ? 'cursor-pointer hover:text-amber-300 transition-colors' : ''}`}
              onClick={isCurrentUser ? () => setIsEditingName(true) : undefined}
            >
              {isCurrentUser && (
                <span className="inline-block mr-2 text-amber-300">
                  <Edit3 className="h-6 w-6" />
                </span>
              )}
              {player.displayName || player.name || 'Player'}
            </div>
          )}
          <p className="text-sm text-zinc-400">{player.wallet?.slice(0, 8)}...{player.wallet?.slice(-4)} • {rankTitle}</p>
          
          {/* Country Flag */}
          {isCurrentUser ? (
            <div className="mt-2">
              <CountryFlagPicker
                selectedCountry={player.country}
                onCountrySelect={(country) => onCountryChange?.(country?.code || null)}
                placeholder="Select your country"
                className="w-48"
              />
            </div>
          ) : player.country ? (
            <div className="flex items-center gap-2 mt-2 text-sm text-amber-300">
              <span className="text-2xl">
                {(() => {
                  const country = countries.find(c => c.code === player.country);
                  return country?.flag || '🏳️';
                })()}
              </span>
              <span>
                {(() => {
                  const country = countries.find(c => c.code === player.country);
                  return country?.name || 'Unknown';
                })()}
              </span>
            </div>
          ) : null}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-300">
            <Crown className="h-4 w-4" /> Rank #{rank}
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative z-10 mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-8">
          {[{
            icon: Trophy,
            label: "Wins",
            value: player.wins || 0
          }, {
            icon: Swords,
            label: "Losses",
            value: player.losses || 0
          }, {
            icon: Flame,
            label: "Streak",
            value: `${streak} Wins`
          }, {
            icon: Shield,
            label: "Integrity Rating",
            value: `${integrity} / 10`
          }, {
            icon: Gamepad2,
            label: "Fav Game",
            value: favoriteGame
          }, {
            icon: Crown,
            label: "Win Rate",
            value: `${player.winRate || 0}%`
          }].map((s, i) => (
            <div key={i} className="border border-zinc-800 bg-[#0B0C12]/90 hover:border-amber-300/50 transition rounded-2xl overflow-hidden text-center shadow-[0_0_20px_rgba(255,215,130,0.03)]">
              <div className="p-5 flex flex-col items-center gap-2">
                {React.createElement(s.icon, { className: "h-6 w-6 text-amber-300" })}
                <div className="text-xs text-zinc-400">{s.label}</div>
                <div className="text-lg font-semibold text-zinc-50 tracking-tight">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trophy Showcase */}
        <div className="relative z-10 mt-8 px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Trophy Collection
                </h3>
                <div className="text-sm text-zinc-400">
                  {isCurrentUser && selectedTrophies.length > 0 ? (
                    <span className="text-amber-300">
                      {selectedTrophies.length}/3 selected
                    </span>
                  ) : (
                    <span>Select your best achievements</span>
                  )}
                </div>
              </div>
            </div>
            {isCurrentUser && !isEditingTrophies && (
              <button
                onClick={startTrophyEditing}
                className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-lg text-amber-300 hover:text-amber-200 hover:border-amber-300/60 transition-all text-sm font-medium"
              >
                Select 3
              </button>
            )}
            {isCurrentUser && isEditingTrophies && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTrophySelection}
                  className="px-3 py-1.5 bg-green-500/20 border border-green-400/40 rounded-lg text-green-300 hover:text-green-200 transition-all text-sm font-medium"
                >
                  Done
                </button>
                <button
                  onClick={handleCancelTrophySelection}
                  className="px-3 py-1.5 bg-zinc-500/20 border border-zinc-400/40 rounded-lg text-zinc-300 hover:text-zinc-200 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {USDFG_RELICS.map((trophy) => {
              const gamesPlayed = (player.wins || 0) + (player.losses || 0);
              const isUnlocked = gamesPlayed >= trophy.requiredGames;
              const progress = getTrophyProgress(gamesPlayed, trophy);
              
              return (
                <div
                  key={trophy.id}
                  className="relative group"
                >
                  {/* Selection checkbox */}
                  {isCurrentUser && isEditingTrophies && isUnlocked && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`w-4 h-4 rounded border-2 transition-all ${
                        tempSelectedTrophies.includes(trophy.id)
                          ? 'bg-amber-400 border-amber-400'
                          : 'bg-transparent border-zinc-600 hover:border-amber-400'
                      }`}>
                        {tempSelectedTrophies.includes(trophy.id) && (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-black font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Selection indicator */}
                  {isCurrentUser && !isEditingTrophies && selectedTrophies.includes(trophy.id) && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
                    </div>
                  )}
                  
                  <div 
                    className={`p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                      isUnlocked 
                        ? 'border-zinc-700 hover:border-amber-400/50 bg-zinc-900/30 hover:bg-zinc-900/50' 
                        : 'border-zinc-800 opacity-50'
                    } ${
                      isCurrentUser && selectedTrophies.includes(trophy.id) 
                        ? 'ring-1 ring-amber-400/50' 
                        : ''
                    }`}
                    onClick={() => handleTrophyClick(trophy)}
                  >
                    <div className="flex justify-center mb-2">
                      <img
                        src={trophy.icon}
                        alt={trophy.name}
                        className={`w-12 h-12 object-contain transition-all ${
                          isUnlocked 
                            ? 'opacity-100 group-hover:brightness-110' 
                            : 'opacity-40 grayscale'
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.textContent = '🏆';
                          fallback.className = 'text-2xl';
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-medium ${
                        isUnlocked ? 'text-white' : 'text-zinc-500'
                      }`}>
                        {trophy.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Challenge CTA */}
        <div className="relative z-10 flex flex-col items-center gap-4 mt-12 pb-12">
          <p className="text-sm text-zinc-400">
            Total Earned: <span className="font-bold text-amber-300">{(player.totalEarned || 0).toFixed(0)} USDFG</span> • Last Active: {player.lastActive ? new Date(player.lastActive.seconds * 1000).toLocaleString() : 'Recently'}
          </p>
          {!isCurrentUser && (
            <button 
              onClick={() => {
                if (onChallengePlayer) {
                  onChallengePlayer(player);
                }
              }}
              className="bg-gradient-to-r from-amber-300 to-yellow-200 text-zinc-900 text-sm hover:opacity-90 px-10 py-3 rounded-full shadow-[0_0_30px_rgba(255,215,130,0.25)] transition-all"
            >
              {hasActiveChallenge ? 'Send Challenge' : 'Challenge Player'}
            </button>
          )}
          <p className="text-[11px] text-zinc-500 tracking-wide uppercase">Non-custodial • Skill-Based • Competitive Mode</p>
        </div>
      </motion.div>

      {/* Trophy Popup Modal */}
      {selectedTrophyForPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTrophyForPopup(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#07080C]/95 border border-amber-500/30 rounded-xl p-6 max-w-sm w-full shadow-2xl shadow-amber-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-6">
              <div className="relative">
                <img
                  src={selectedTrophyForPopup.icon}
                  alt={selectedTrophyForPopup.name}
                  className="w-32 h-32 mx-auto animate-bounce-slow drop-shadow-[0_0_20px_rgba(255,215,130,0.6)]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.textContent = '🏆';
                    fallback.className = 'text-6xl';
                    target.parentNode?.appendChild(fallback);
                  }}
                />
                <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-300/20 animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedTrophyForPopup.name}
              </h3>
              <p className="text-amber-200 text-lg leading-relaxed">
                [Hidden Description - Unlock to reveal]
              </p>
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-xl p-6">
                <h3 className="text-amber-400 font-bold text-lg mb-3">Mystery Requirement</h3>
                <p className="text-amber-200 font-bold text-2xl">
                  ??? games played
                </p>
                <p className="text-amber-300 text-sm mt-2 italic">
                  Keep playing to discover the secret!
                </p>
              </div>
              <button
                onClick={() => setSelectedTrophyForPopup(null)}
                className="px-4 py-2 bg-amber-500/20 border border-amber-400/40 rounded-lg text-amber-300 hover:text-amber-200 hover:border-amber-300/60 transition-all text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
