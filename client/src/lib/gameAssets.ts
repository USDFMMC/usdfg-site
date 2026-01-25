export const extractGameFromTitle = (title: string) => {
  if (!title) return 'Gaming';
  const gameKeywords = [
    'FIFA 24',
    'FC 26',
    'EA Sports FC 26',
    'Madden NFL 24',
    'NBA 2K25',
    'Street Fighter 6',
    'Tekken 8',
    'Mortal Kombat',
    'Call of Duty',
    'Valorant',
    'Forza Horizon',
    'UFC 25',
    'EA Sports UFC 5',
    'EA Sports UFC 4',
    'EA Sports UFC 3',
    'EA UFC 5',
    'EA UFC 4',
    'EA UFC 3',
  ];

  for (const game of gameKeywords) {
    if (title.includes(game)) {
      return game;
    }
  }

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('nba 2k26') || lowerTitle.includes('nba2k26')) return 'NBA 2K26';
  if (lowerTitle.includes('nba 2k25') || lowerTitle.includes('nba2k25')) return 'NBA 2K25';
  if (lowerTitle.includes('ufc 25') || lowerTitle.includes('ufc25')) return 'UFC 25';
  if (lowerTitle.includes('ea sports ufc 5') || lowerTitle.includes('ea sports ufc5')) return 'EA Sports UFC 5';
  if (lowerTitle.includes('ea sports ufc 4') || lowerTitle.includes('ea sports ufc4')) return 'EA Sports UFC 4';
  if (lowerTitle.includes('ea sports ufc 3') || lowerTitle.includes('ea sports ufc3')) return 'EA Sports UFC 3';
  if (lowerTitle.includes('ea ufc 5') || lowerTitle.includes('eaufc5')) return 'EA UFC 5';
  if (lowerTitle.includes('ea ufc 4') || lowerTitle.includes('eaufc4')) return 'EA UFC 4';
  if (lowerTitle.includes('ea ufc 3') || lowerTitle.includes('eaufc3')) return 'EA UFC 3';
  if (lowerTitle.includes('ea sports fc') || lowerTitle.includes('fc 26') || lowerTitle.includes('fc26')) return 'FC 26';
  if (lowerTitle.includes('fifa')) return 'FIFA 24';
  if (lowerTitle.includes('madden')) return 'Madden NFL 24';
  if (lowerTitle.includes('nba') || lowerTitle.includes('2k')) return 'NBA 2K26';
  if (lowerTitle.includes('street fighter')) return 'Street Fighter 6';
  if (lowerTitle.includes('tekken')) return 'Tekken 8';
  if (lowerTitle.includes('mortal kombat')) return 'Mortal Kombat';
  if (lowerTitle.includes('call of duty') || lowerTitle.includes('cod')) return 'Call of Duty';
  if (lowerTitle.includes('valorant')) return 'Valorant';
  if (lowerTitle.includes('forza')) return 'Forza Horizon';
  if (lowerTitle.includes('ufc') || lowerTitle.includes('ea sports ufc')) return 'UFC 25';

  return 'Gaming';
};

export const getGameCategory = (game: string) => {
  if (!game || game === 'Gaming' || game === 'Other/Custom') {
    return 'Sports';
  }

  const normalizedGame = game.trim();

  if (['EA Sports UFC 6', 'EA Sports UFC 5', 'EA Sports UFC 4', 'EA Sports UFC 3', 'EA UFC 6', 'EA UFC 5', 'EA UFC 4', 'EA UFC 3'].includes(normalizedGame)) {
    return 'UFC';
  }

  if (['Madden NFL 26', 'Madden NFL 24', 'Madden NFL 23', 'Madden NFL 22', 'NFL Blitz', 'Mutant Football League', 'Retro Bowl', 'Axis Football'].includes(normalizedGame)) {
    return 'Football';
  }

  if (['Chess.com', 'Lichess', 'Chess Ultra', '8 Ball Pool', 'Pool Hall', 'PBA Bowling Challenge', 'Brunswick Pro Bowling', 'Checkers', 'Backgammon', 'Monopoly Plus', 'Uno', 'Scrabble'].includes(normalizedGame)) {
    return 'BoardGames';
  }

  if (['NBA 2K25', 'FIFA 24'].includes(normalizedGame)) return 'Sports';
  if (['Street Fighter 6', 'Tekken 8', 'Mortal Kombat', 'Mortal Kombat 1', 'Mortal Kombat 11'].includes(normalizedGame)) return 'Fighting';
  if (['Call of Duty', 'Valorant'].includes(normalizedGame)) return 'Shooting';
  if (['Forza Horizon', 'Gran Turismo 7', 'Forza Motorsport'].includes(normalizedGame)) return 'Racing';

  const lowerGame = normalizedGame.toLowerCase();
  if (lowerGame.includes('ufc') || lowerGame.includes('ea sports ufc')) return 'UFC';
  if (lowerGame.includes('madden') || lowerGame.includes('nfl') || lowerGame.includes('retro bowl') || lowerGame.includes('axis football') || lowerGame.includes('mutant football')) return 'Football';
  if (lowerGame.includes('chess') || lowerGame.includes('pool') || lowerGame.includes('bowling') || lowerGame.includes('checkers') || lowerGame.includes('backgammon') || lowerGame.includes('monopoly') || lowerGame.includes('uno') || lowerGame.includes('scrabble')) return 'BoardGames';
  if (lowerGame.includes('nba') || lowerGame.includes('fifa') || lowerGame.includes('fc') || lowerGame.includes('sports')) return 'Sports';
  if (lowerGame.includes('street fighter') || lowerGame.includes('tekken') || lowerGame.includes('mortal kombat') || lowerGame.includes('guilty gear') || lowerGame.includes('fighting')) return 'Fighting';
  if (lowerGame.includes('call of duty') || lowerGame.includes('cod') || lowerGame.includes('valorant') || lowerGame.includes('shooting')) return 'Shooting';
  if (lowerGame.includes('forza') || lowerGame.includes('gran turismo') || lowerGame.includes('f1') || lowerGame.includes('mario kart') || lowerGame.includes('racing')) return 'Racing';

  return 'Sports';
};

export const getGameImage = (game: string) => {
  if (!game || game === 'Gaming') {
    return '/assets/categories/basketball.png';
  }

  const lowerGame = game.toLowerCase().trim();

  if (lowerGame === 'valorant' || lowerGame.includes('valorant')) {
    return '/assets/categories/valorant.png';
  }

  if (lowerGame.includes('fortnite')) {
    return '/assets/categories/fortnite.png';
  }

  if (lowerGame.includes('ufc') || lowerGame.includes('ea sports ufc')) {
    return '/assets/categories/ufc.png';
  }

  if (lowerGame.includes('madden') ||
      lowerGame.includes('nfl') ||
      lowerGame.includes('retro bowl') ||
      lowerGame.includes('axis football') ||
      lowerGame.includes('mutant football')) {
    return '/assets/categories/football.png';
  }

  if (lowerGame.includes('nba 2k26') || lowerGame.includes('nba2k26')) {
    return '/assets/categories/basketball.png';
  }
  if (lowerGame.includes('nba') ||
      lowerGame.includes('2k') ||
      lowerGame.includes('basketball')) {
    return '/assets/categories/basketball.png';
  }

  if (lowerGame.includes('fifa') ||
      lowerGame.startsWith('fc') ||
      lowerGame.includes('fc 26') ||
      lowerGame.includes('fc26') ||
      lowerGame.includes('fc ') ||
      lowerGame.includes('ea sports fc') ||
      lowerGame.includes('soccer')) {
    return '/assets/categories/soccer.png';
  }

  if (lowerGame.includes('street fighter')) {
    return '/assets/categories/tekken.png';
  }

  if (lowerGame.includes('tekken')) {
    return '/assets/categories/tekken.png';
  }

  if (lowerGame.includes('mortal kombat')) {
    return '/assets/categories/tekken.png';
  }

  if (lowerGame.includes('battlefield')) {
    return '/assets/categories/battlefield.png';
  }

  if (lowerGame.includes('gta')) {
    return '/assets/categories/gta.png';
  }

  if (lowerGame.includes('cod') || lowerGame.includes('call of duty')) {
    return '/assets/categories/cod.png';
  }

  if (lowerGame.includes('boxing') ||
      lowerGame.includes('fight night') ||
      lowerGame.includes('creed') ||
      lowerGame.includes('undisputed') ||
      lowerGame.includes('esports boxing')) {
    return '/assets/categories/boxing.png';
  }

  if (lowerGame.includes('mlb') ||
      lowerGame.includes('baseball') ||
      lowerGame.includes('the show')) {
    return '/assets/categories/baseball.png';
  }

  if ((lowerGame.includes('golf') || lowerGame.includes('pga')) && !lowerGame.includes('mario')) {
    return '/assets/categories/golf.png';
  }

  if (lowerGame.includes('tennis') || lowerGame.includes('topspin') || lowerGame.includes('matchpoint')) {
    return '/assets/categories/tennis.png';
  }

  if (lowerGame.includes('nba street') ||
      lowerGame.includes('playgrounds') ||
      lowerGame.includes('street hoops') ||
      lowerGame.includes('street basketball') ||
      lowerGame.includes('nba the run')) {
    return '/assets/categories/nbastreet.png';
  }

  if (!lowerGame.includes('mario') &&
      (lowerGame.includes('forza') ||
       lowerGame.includes('gran turismo') ||
       lowerGame.includes('f1') ||
       lowerGame.includes('assetto corsa') ||
       lowerGame.includes('project cars') ||
       lowerGame.includes('iracing') ||
       lowerGame.includes('need for speed') ||
       lowerGame.includes('the crew'))) {
    return '/assets/categories/racing.png';
  }

  const category = getGameCategory(game);

  switch (category) {
    case 'UFC':
      return '/assets/categories/ufc.png';
    case 'Football':
      return '/assets/categories/football.png';
    case 'BoardGames':
      return '/assets/categories/boardgames.png';
    case 'Sports':
      return '/assets/categories/basketball.png';
    case 'Racing':
      return '/assets/categories/racing.png';
    case 'Shooting':
      return '/assets/categories/cod.png';
    case 'Fighting':
      return '/assets/categories/tekken.png';
    default:
      return '/assets/categories/basketball.png';
  }
};

export const resolveGameName = (game?: string | null, title?: string | null) => {
  let gameName = game || extractGameFromTitle(title || '') || 'Gaming';
  const lowerGame = gameName.toLowerCase();
  if (lowerGame.includes('nba') && (lowerGame.includes('2k') || lowerGame.includes('2 k'))) {
    if (lowerGame.includes('2k26') || lowerGame.includes('2k 26') || lowerGame.includes('2 k 26')) {
      gameName = 'NBA 2K26';
    } else if (lowerGame.includes('2k25') || lowerGame.includes('2k 25') || lowerGame.includes('2 k 25')) {
      gameName = 'NBA 2K25';
    } else {
      gameName = 'NBA 2K26';
    }
  }
  return gameName;
};
