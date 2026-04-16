import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Gamepad2, Swords, Flame, Shield, Crown, X, Edit3, Users } from "lucide-react";
import ProfileImageUpload from "../ui/ProfileImageUpload";
import CountryFlagPicker from "../ui/CountryFlagPicker";
import ElegantButton from "@/components/ui/ElegantButton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip";
import { USDFG_RELICS, getUnlockedTrophies, getNextTrophy, getTrophyProgress, getTrophyColorClass, checkPlayerHasOgFirst1k, checkPlayerHasFounderChallenge } from "@/lib/trophies";
import {
  getTeamByMember,
  joinTeam,
  leaveTeam,
  removeTeamMember,
  getPlayerEarningsByChallenge,
  type TeamStats,
  type PlayerEarningByChallenge,
} from "@/lib/firebase/firestore";

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
  onProfileImageChange?: (image: string | null, file?: File | null) => void;
  onChallengePlayer?: (playerData: any) => void;
  hasActiveChallenge?: boolean;
  currentWallet?: string | null;
  onTeamUpdated?: () => void;
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
  hasActiveChallenge = false,
  currentWallet,
  onTeamUpdated
}: PlayerProfileModalProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(player.displayName || player.name || 'Player');
  const [selectedTrophies, setSelectedTrophies] = useState<string[]>([]);
  const [tempSelectedTrophies, setTempSelectedTrophies] = useState<string[]>([]);
  const [isEditingTrophies, setIsEditingTrophies] = useState(false);
  const [selectedTrophyForPopup, setSelectedTrophyForPopup] = useState<any>(null);
  const [specialTrophiesUnlocked, setSpecialTrophiesUnlocked] = useState<Set<string>>(new Set());
  const [userTeam, setUserTeam] = useState<TeamStats | null>(null);
  const [viewerTeam, setViewerTeam] = useState<TeamStats | null>(null);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [isInvitingToTeam, setIsInvitingToTeam] = useState(false);
  const [isRemovingFromTeam, setIsRemovingFromTeam] = useState(false);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [teamActionSuccess, setTeamActionSuccess] = useState<string | null>(null);
  const [earningsByChallenge, setEarningsByChallenge] = useState<PlayerEarningByChallenge[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const wallet = player.wallet || player.address;

  // Check special trophies, team info, and earnings-by-challenge when modal opens
  useEffect(() => {
    if (isOpen && wallet) {
      const checkTrophies = async () => {
        const unlocked = new Set<string>();
        const hasOgFirst1k = await checkPlayerHasOgFirst1k(wallet);
        if (hasOgFirst1k) unlocked.add('og-1k');
        const hasFounderChallenge = await checkPlayerHasFounderChallenge(wallet);
        if (hasFounderChallenge) unlocked.add('founder-challenge');
        setSpecialTrophiesUnlocked(unlocked);
      };

      const fetchTeam = async () => {
        const team = await getTeamByMember(wallet);
        setUserTeam(team);
      };

      const fetchEarnings = async () => {
        setLoadingEarnings(true);
        try {
          const list = await getPlayerEarningsByChallenge(wallet, 20);
          setEarningsByChallenge(list);
        } finally {
          setLoadingEarnings(false);
        }
      };

      checkTrophies();
      fetchTeam();
      fetchEarnings();
    }
  }, [isOpen, wallet]);

  useEffect(() => {
    if (isOpen && currentWallet) {
      const fetchViewerTeam = async () => {
        try {
          const team = await getTeamByMember(currentWallet);
          setViewerTeam(team);
        } catch (error) {
          console.error('Failed to fetch viewer team:', error);
        }
      };

      fetchViewerTeam();
    } else {
      setViewerTeam(null);
    }
  }, [isOpen, currentWallet]);

  useEffect(() => {
    if (isOpen) {
      setTeamActionError(null);
      setTeamActionSuccess(null);
    }
  }, [isOpen, player.wallet]);
  
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

  const handleJoinViewedTeam = async () => {
    if (!currentWallet) {
      setTeamActionError('Connect your wallet to join this team');
      return;
    }

    if (!userTeam) {
      setTeamActionError('Team details are unavailable right now');
      return;
    }

    const targetWallet = player.wallet;
    if (!targetWallet) {
      setTeamActionError('Player wallet unavailable');
      return;
    }

    try {
      setTeamActionError(null);
      setTeamActionSuccess(null);
      setIsJoiningTeam(true);
      const teamId = userTeam.teamId || userTeam.teamKey;
      await joinTeam(teamId, currentWallet);
      const updatedViewerTeam = await getTeamByMember(currentWallet);
      setViewerTeam(updatedViewerTeam);
      const refreshedPlayerTeam = await getTeamByMember(targetWallet);
      setUserTeam(refreshedPlayerTeam);
      setTeamActionSuccess('Joined team successfully');
      onTeamUpdated?.();
    } catch (error: any) {
      setTeamActionError(error.message || 'Failed to join team');
    } finally {
      setIsJoiningTeam(false);
    }
  };

  const handleInvitePlayerToViewerTeam = async () => {
    if (!currentWallet || !viewerTeam) {
      setTeamActionError('You need to be the team key holder to invite players');
      return;
    }

    const targetWallet = player.wallet;
    if (!targetWallet) {
      setTeamActionError('Player wallet unavailable');
      return;
    }

    if (!viewerIsTeamKey) {
      setTeamActionError('Only the team key holder can add members');
      return;
    }

    if (viewerTeam.members.includes(targetWallet)) {
      setTeamActionError('Player is already on your team');
      return;
    }

    if (viewerTeam.members.length >= 69) {
      setTeamActionError('Your team is full (69 members max)');
      return;
    }

    if (userTeam && userTeam.teamKey === targetWallet) {
      setTeamActionError('Player is the key holder of their current team. Ask them to transfer leadership first.');
      return;
    }

    try {
      setTeamActionError(null);
      setTeamActionSuccess(null);
      setIsInvitingToTeam(true);

      if (userTeam && userTeam.teamId && userTeam.members.includes(targetWallet)) {
        await leaveTeam(userTeam.teamId, targetWallet);
      }

      const teamId = viewerTeam.teamId || viewerTeam.teamKey;
      await joinTeam(teamId, targetWallet);
      const updatedViewerTeam = await getTeamByMember(currentWallet);
      setViewerTeam(updatedViewerTeam);
      const refreshedPlayerTeam = await getTeamByMember(targetWallet);
      setUserTeam(refreshedPlayerTeam);
      setTeamActionSuccess('Player added to your team');
      onTeamUpdated?.();
    } catch (error: any) {
      setTeamActionError(error.message || 'Failed to add player to your team');
    } finally {
      setIsInvitingToTeam(false);
    }
  };

  const handleRemoveMemberFromTeam = async () => {
    if (!currentWallet || !viewerTeam) {
      setTeamActionError('You need to be the team key holder to manage members');
      return;
    }

    const targetWallet = player.wallet;
    if (!targetWallet) {
      setTeamActionError('Player wallet unavailable');
      return;
    }

    try {
      setTeamActionError(null);
      setTeamActionSuccess(null);
      setIsRemovingFromTeam(true);
      const teamId = viewerTeam.teamId || viewerTeam.teamKey;
      await removeTeamMember(teamId, targetWallet, currentWallet);
      const updatedViewerTeam = await getTeamByMember(currentWallet);
      setViewerTeam(updatedViewerTeam);
      const refreshedPlayerTeam = await getTeamByMember(targetWallet);
      setUserTeam(refreshedPlayerTeam);
      setTeamActionSuccess('Player removed from team');
      onTeamUpdated?.();
    } catch (error: any) {
      setTeamActionError(error.message || 'Failed to remove team member');
    } finally {
      setIsRemovingFromTeam(false);
    }
  };

        // Calculate additional stats from real data
          const totalGames = (player.wins || 0) + (player.losses || 0);
          const streak = 0; // TODO: Track actual win streak in Firestore
          const trust = (player as { trustScore?: number }).trustScore;
          const integrity = typeof trust === 'number' ? trust : 0;
          const favoriteGame = null; // TODO: Calculate from gameStats
          const rank = player.rank || 1;
          const rankTitle = rank === 1 ? "Mythic Prime" : rank <= 3 ? "Diamond Elite" : rank <= 10 ? "Platinum Pro" : "Gold Warrior";

  const playerWallet = player.wallet || player.address;
  const isTeamFull = userTeam ? userTeam.members.length >= 69 : false;
  const viewerIsTeamKey = viewerTeam && currentWallet ? viewerTeam.teamKey === currentWallet : false;
  const isSameTeam = viewerTeam && userTeam ? viewerTeam.teamId === userTeam.teamId : false;
  const canJoinViewedTeam = Boolean(
    !isCurrentUser &&
    userTeam &&
    currentWallet &&
    !viewerTeam &&
    !isTeamFull &&
    !userTeam.members.includes(currentWallet)
  );
  const canInviteToMyTeam = Boolean(
    !isCurrentUser &&
    viewerTeam &&
    viewerIsTeamKey &&
    playerWallet &&
    !viewerTeam.members.includes(playerWallet) &&
    viewerTeam.members.length < 69
  );
  const canRemoveFromTeam = Boolean(
    viewerIsTeamKey &&
    isSameTeam &&
    playerWallet &&
    viewerTeam &&
    userTeam &&
    userTeam.members.includes(playerWallet) &&
    playerWallet !== viewerTeam.teamKey
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-5xl max-h-[85vh] rounded-[28px] bg-[#07080C]/95 border border-white/10 overflow-y-auto ring-1 ring-purple-500/15 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>

        {/* Ambient wash */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.08),transparent_72%)] pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/35 to-transparent" />

        {/* Header / Avatar */}
        <div className="relative z-10 flex flex-col items-center gap-2 pt-6">
          {isCurrentUser ? (
            <ProfileImageUpload
              currentImage={player.profileImage}
              onImageChange={onProfileImageChange || (() => {})}
              size="lg"
            />
          ) : (
            <div className="relative h-24 w-24 rounded-full bg-zinc-900 grid place-items-center ring-2 ring-purple-500/45 overflow-hidden shadow-none">
              {player.profileImage ? (
                <img
                  src={player.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gamepad2 className="h-8 w-8 text-purple-300" />
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_70%)]" />
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
                className="text-2xl font-bold tracking-tight text-white bg-transparent border-b-2 border-purple-400/60 focus:outline-none uppercase text-center"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-purple-300 hover:text-white transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div 
              className={`text-2xl font-bold tracking-tight text-white uppercase ${isCurrentUser ? 'cursor-pointer hover:text-purple-200 transition-colors' : ''}`}
              onClick={isCurrentUser ? () => setIsEditingName(true) : undefined}
            >
              {isCurrentUser && (
                <span className="inline-block mr-1.5 text-purple-300">
                  <Edit3 className="h-4 w-4" />
                </span>
              )}
              {player.displayName || player.name || 'Player'}
            </div>
          )}
          <p className="text-xs text-zinc-400">{player.wallet?.slice(0, 8)}...{player.wallet?.slice(-4)} • {rankTitle}</p>
          
          {/* Country Flag */}
          {isCurrentUser ? (
            <div className="mt-1.5">
              <CountryFlagPicker
                selectedCountry={player.country}
                onCountrySelect={(country) => onCountryChange?.(country?.code || null)}
                placeholder="Select your country"
                className="w-48"
              />
            </div>
          ) : player.country ? (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/70">
              <span className="text-lg">
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
          
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-purple-200/90">
            <Crown className="h-3.5 w-3.5 text-purple-400/90" /> Rank #{rank}
          </div>
        </div>

          {(teamActionError || teamActionSuccess) && (
            <div
              className={`relative z-10 mt-6 mx-6 p-3 rounded-lg border ${
                teamActionError
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <p className="text-xs">{teamActionError ?? teamActionSuccess}</p>
            </div>
          )}

        {/* Team Info Section - Elite & Eye-Catching */}
        {userTeam && (
          <div className="relative z-10 mt-6 px-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg border border-white/10 bg-[#0B0C12]/85 shadow-none ring-1 ring-purple-500/10 backdrop-blur-sm transition-all duration-200 hover:border-white/15"
            >
              <div className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:items-center sm:gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/35 bg-purple-500/15 text-purple-100">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-1">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <span className="text-sm font-semibold uppercase tracking-tight text-white/90">
                          {userTeam.teamName}
                        </span>
                        {userTeam.teamKey === player.wallet && (
                          <span className="rounded-full border border-purple-500/35 px-2 py-0.5 text-[10px] uppercase tracking-wide text-purple-200/85">
                            Key Holder
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/55 sm:justify-start">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {userTeam.members.length}/69 Members
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {userTeam.wins} Wins
                        </span>
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          {userTeam.winRate.toFixed(1)}% WR
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-1 text-right">
                    <span className="text-[10px] uppercase tracking-wide text-white/45">Total Earned</span>
                    <span className="text-base font-semibold text-white">{userTeam.totalEarned.toFixed(1)} USDFG</span>
                  </div>
                </div>
                {(canJoinViewedTeam || canInviteToMyTeam || canRemoveFromTeam) && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {canJoinViewedTeam && (
                      <ElegantButton
                        onClick={handleJoinViewedTeam}
                        variant="secondary"
                        className="w-full sm:w-auto text-sm"
                        disabled={isJoiningTeam || isTeamFull}
                      >
                        {isJoiningTeam ? 'Joining...' : isTeamFull ? 'Team Full' : 'Join Team'}
                      </ElegantButton>
                    )}
                    {canInviteToMyTeam && (
                      <ElegantButton
                        onClick={handleInvitePlayerToViewerTeam}
                        variant="primary"
                        className="w-full sm:w-auto text-sm"
                        disabled={isInvitingToTeam}
                      >
                        {isInvitingToTeam ? 'Adding...' : 'Add to My Team'}
                      </ElegantButton>
                    )}
                    {canRemoveFromTeam && (
                      <ElegantButton
                        onClick={handleRemoveMemberFromTeam}
                        variant="danger"
                        className="w-full sm:w-auto text-sm"
                        disabled={isRemovingFromTeam}
                      >
                        {isRemovingFromTeam ? 'Removing...' : 'Remove From Team'}
                      </ElegantButton>
                    )}
                  </div>
                )}
                </div>
            </motion.div>
          </div>
        )}

        {/* Stats Section */}
        <TooltipProvider>
          <div className="relative z-10 mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-6">
            {[{
              icon: Trophy,
              label: "Wins",
              value: player.wins || 0,
              tooltip: "Total number of challenges won. Earned by defeating opponents in competitive matches."
            }, {
              icon: Swords,
              label: "Losses",
              value: player.losses || 0,
              tooltip: "Total number of challenges lost. Every match is a learning opportunity to improve your skills."
            }, {
              icon: Flame,
              label: "Streak",
              value: streak > 0 ? `${streak} Wins` : '0 Wins',
              tooltip: "Current consecutive win streak. Build momentum by winning multiple matches in a row."
            }, {
              icon: Shield,
              label: "Integrity Rating",
              value: integrity > 0 ? `${integrity.toFixed(1)} / 10` : '0 / 10',
              tooltip: "Trust score based on reviews from opponents. Rated 0-10 based on honesty, fairness, and sportsmanship. Higher ratings show you're a reliable and respected player."
            }, {
              icon: Gamepad2,
              label: "Fav Game",
              value: favoriteGame,
              tooltip: "Your most played game category. Shows where you've competed the most in the Arena."
            }, {
              icon: Crown,
              label: "Win Rate",
              value: `${player.winRate || 0}%`,
              tooltip: "Percentage of matches won. Calculated as (Wins / Total Matches) × 100. Higher win rates show consistent competitive performance."
            }].map((s, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div className="border border-zinc-800/50 bg-[#0B0C12]/90 hover:border-purple-500/35 transition rounded-lg overflow-hidden text-center shadow-none cursor-help">
                    <div className="p-3 flex flex-col items-center gap-1.5">
                      {React.createElement(s.icon, { className: "h-4 w-4 text-purple-400/80" })}
                      <div className="text-[10px] text-zinc-400">{s.label}</div>
                      <div className="text-sm font-semibold text-zinc-50 tracking-tight">{s.value}</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs bg-[#0B0C12] border border-white/10 text-white/90 text-xs px-3 py-2 shadow-lg ring-1 ring-purple-500/15">
                  <p>{s.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Trophy Showcase */}
        <div className="relative z-10 mt-6 px-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500/90 to-orange-500/90 rounded-lg flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Trophy Collection
                </h3>
                <div className="text-xs text-zinc-400">
                  {isCurrentUser && selectedTrophies.length > 0 ? (
                    <span className="text-purple-300">
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
                className="px-2 py-1 bg-purple-600/20 border border-purple-500/45 rounded-lg text-purple-100 hover:text-white hover:border-purple-400/55 transition-all text-xs font-medium"
              >
                Select 3
              </button>
            )}
            {isCurrentUser && isEditingTrophies && (
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveTrophySelection}
                  className="px-2 py-1 bg-green-500/20 border border-green-400/40 rounded-lg text-green-300 hover:text-green-200 transition-all text-xs font-medium"
                >
                  Done
                </button>
                <button
                  onClick={handleCancelTrophySelection}
                  className="px-2 py-1 bg-zinc-500/20 border border-zinc-400/40 rounded-lg text-zinc-300 hover:text-zinc-200 transition-all text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {USDFG_RELICS.map((trophy) => {
              const gamesPlayed = (player.wins || 0) + (player.losses || 0);
              // Check if unlocked by the viewed player: games-based OR special condition
              const isGamesUnlocked = gamesPlayed >= trophy.requiredGames;
              const isSpecialUnlocked = trophy.specialCondition && specialTrophiesUnlocked.has(trophy.id);
              const isUnlocked = isGamesUnlocked || isSpecialUnlocked;
              
              // Showcase concept: When viewing another player's profile, show trophies they've unlocked
              // This creates inspiration - you can see what they've achieved
              // When viewing your own profile, only show unlocked trophies
              const isVisible = isUnlocked || trophy.id === 'og-1k'; // Show if unlocked by the viewed player (or OG trophy)
              
              const progress = trophy.specialCondition ? (isSpecialUnlocked ? 100 : 0) : getTrophyProgress(gamesPlayed, trophy);
              
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
                          ? 'bg-purple-500 border-purple-400'
                          : 'bg-transparent border-zinc-600 hover:border-purple-500/50'
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
                      <div className="w-4 h-4 bg-purple-500 rounded-full ring-1 ring-purple-400/40"></div>
                    </div>
                  )}
                  
                  <div 
                    className={`p-2 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                      isVisible 
                        ? isUnlocked
                          ? 'border-zinc-700/50 hover:border-purple-500/35 bg-zinc-900/30 hover:bg-zinc-900/50'
                          : 'border-zinc-700/30 hover:border-purple-500/25 bg-zinc-900/20 hover:bg-zinc-900/30' // Lighter when not unlocked but visible (showcase)
                        : 'border-zinc-800/50 opacity-50'
                    } ${
                      isCurrentUser && selectedTrophies.includes(trophy.id) 
                        ? 'ring-1 ring-purple-500/40' 
                        : ''
                    } ${
                      trophy.id === 'og-1k' && !isUnlocked 
                        ? 'border-orange-500/35 bg-orange-950/20' 
                        : ''
                    }`}
                    onClick={() => handleTrophyClick(trophy)}
                  >
                    <div className="flex justify-center mb-1.5">
                      <img
                        src={trophy.icon}
                        alt={trophy.name}
                        className={`w-10 h-10 object-contain transition-all ${
                          isVisible 
                            ? isUnlocked 
                              ? 'opacity-100 group-hover:brightness-110' 
                              : 'opacity-70 grayscale hover:opacity-80' // Visible but grayscale when not unlocked (showcase concept)
                            : 'opacity-40 grayscale'
                        }`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error(`❌ Failed to load trophy image: ${trophy.icon} for trophy: ${trophy.name}`);
                          // Try alternative paths for 21k trophy
                          if (trophy.id === 'og-1k') {
                            if (trophy.icon.includes('/assets/trophies/')) {
                              target.src = '/assets/categories/usdfg-21k.png';
                              return;
                            } else if (trophy.icon.includes('/assets/categories/')) {
                              target.src = '/assets/trophies/usdfg-21k.png';
                              return;
                            }
                          }
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.textContent = '🏆';
                          fallback.className = 'text-lg';
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] font-medium ${
                        isVisible ? (isUnlocked ? 'text-white' : 'text-zinc-400') : 'text-zinc-500'
                      }`}>
                        {trophy.name}
                      </div>
                      {/* Show description for OG trophy when not unlocked */}
                      {trophy.id === 'og-1k' && !isUnlocked && (
                        <div className="text-[9px] text-orange-300/80 mt-0.5 line-clamp-2">
                          {trophy.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earnings by challenge */}
        <div className="relative z-10 w-full mt-4 px-1">
          <h3 className="text-xs font-semibold text-purple-200/90 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Earnings per challenge
          </h3>
          {loadingEarnings ? (
            <p className="text-[11px] text-zinc-500">Loading…</p>
          ) : earningsByChallenge.length === 0 ? (
            <p className="text-[11px] text-zinc-500">No completed challenges yet.</p>
          ) : (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-black/20 py-1.5 px-2 space-y-1.5">
              {earningsByChallenge.slice(0, 10).map((e) => (
                  <div key={e.challengeId} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-white/90 truncate flex-1 min-w-0">{e.game || e.title || "Challenge"}</span>
                    <span className="text-white font-semibold shrink-0">{e.amount} USDFG</span>
                    <span className="text-zinc-500 shrink-0">{e.completedAt.toLocaleDateString()}</span>
                  </div>
                ))}
              {earningsByChallenge.length > 10 && (
                <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                  +{earningsByChallenge.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Challenge CTA */}
        <div className="relative z-10 flex flex-col items-center gap-2 mt-6 pb-6">
          <p className="text-xs text-zinc-400">
            Total Earned: <span className="font-bold text-purple-200">{(player.totalEarned || 0).toFixed(0)} USDFG</span> • Last Active: {player.lastActive ? new Date(player.lastActive.seconds * 1000).toLocaleString() : 'Recently'}
          </p>
          {!isCurrentUser && (
            <button 
              onClick={() => {
                if (onChallengePlayer) {
                  onChallengePlayer(player);
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs hover:brightness-110 px-6 py-2 rounded-full shadow-[0_0_14px_rgba(124,58,237,0.3)] transition-all border border-white/10"
            >
              {hasActiveChallenge ? 'Send Challenge' : 'Challenge Player'}
            </button>
          )}
          <p className="text-[10px] text-zinc-500 tracking-wide uppercase">Non-custodial • Skill-Based • Competitive Mode</p>
        </div>
      </motion.div>

      {/* Trophy Popup Modal */}
      {selectedTrophyForPopup && (() => {
        const gamesPlayed = (player.wins || 0) + (player.losses || 0);
        const isGamesUnlocked = gamesPlayed >= selectedTrophyForPopup.requiredGames;
        const isSpecialUnlocked = selectedTrophyForPopup.specialCondition && specialTrophiesUnlocked.has(selectedTrophyForPopup.id);
        const isUnlocked = isGamesUnlocked || isSpecialUnlocked;
        const progress = selectedTrophyForPopup.specialCondition ? (isSpecialUnlocked ? 100 : 0) : getTrophyProgress(gamesPlayed, selectedTrophyForPopup);
        
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setSelectedTrophyForPopup(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-[#07080C]/95 border border-white/10 rounded-xl p-3 max-w-sm w-full ring-1 ring-purple-500/15 shadow-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-3">
                <div className="relative">
                  <img
                    src={selectedTrophyForPopup.icon}
                    alt={selectedTrophyForPopup.name}
                    className={`w-24 h-24 mx-auto animate-bounce-slow drop-shadow-[0_0_12px_rgba(124,58,237,0.35)] ${
                      isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'
                    }`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error(`❌ Failed to load trophy image in popup: ${selectedTrophyForPopup.icon} for trophy: ${selectedTrophyForPopup.name}`);
                      // Try alternative paths for 21k trophy
                      if (selectedTrophyForPopup.id === 'og-1k') {
                        if (selectedTrophyForPopup.icon.includes('/assets/trophies/')) {
                          target.src = '/assets/categories/usdfg-21k.png';
                          return;
                        } else if (selectedTrophyForPopup.icon.includes('/assets/categories/')) {
                          target.src = '/assets/trophies/usdfg-21k.png';
                          return;
                        }
                      }
                      target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.textContent = '🏆';
                      fallback.className = 'text-4xl';
                      target.parentNode?.appendChild(fallback);
                    }}
                  />
                  <div className={`absolute inset-0 w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-purple-500/15 to-orange-400/15 ${isUnlocked ? 'animate-pulse' : ''}`}></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">
                  {selectedTrophyForPopup.name}
                </h3>
                {isUnlocked ? (
                  <>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {selectedTrophyForPopup.description}
                    </p>
                    {selectedTrophyForPopup.specialCondition ? (
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/30 rounded-xl p-3">
                        <h3 className="text-green-400 font-bold text-sm mb-1">✅ Unlocked</h3>
                        <p className="text-green-200 text-xs">
                          {selectedTrophyForPopup.id === 'founder-challenge' 
                            ? 'Participated in a Founder Challenge' 
                            : 'Special achievement unlocked'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#0B0C12]/90 border border-white/10 rounded-xl p-3 ring-1 ring-purple-500/15">
                        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-300 font-bold text-sm mb-2">Requirement</h3>
                        <p className="text-white font-bold text-lg">
                          {selectedTrophyForPopup.requiredGames} games played
                        </p>
                        <p className="text-green-300 text-xs mt-1.5">
                          ✅ You've completed this!
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-white/80 text-sm leading-relaxed">
                      [Hidden Description - Unlock to reveal]
                    </p>
                    {selectedTrophyForPopup.specialCondition ? (
                      <div className="bg-[#0B0C12]/90 border border-white/10 rounded-xl p-3 ring-1 ring-purple-500/15">
                        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-300 font-bold text-sm mb-2">Mystery Requirement</h3>
                        <p className="text-white font-bold text-lg">
                          ??? special condition
                        </p>
                        <p className="text-purple-200/80 text-xs mt-1.5 italic">
                          Keep playing to discover the secret!
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#0B0C12]/90 border border-white/10 rounded-xl p-3 ring-1 ring-purple-500/15">
                        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-orange-300 font-bold text-sm mb-2">Mystery Requirement</h3>
                        <p className="text-white font-bold text-lg">
                          ??? games played
                        </p>
                        <p className="text-purple-200/80 text-xs mt-1.5 italic">
                          Keep playing to discover the secret!
                        </p>
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => setSelectedTrophyForPopup(null)}
                  className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/45 rounded-lg text-purple-100 hover:text-white hover:border-purple-400/55 transition-all text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </motion.div>
  );
}
