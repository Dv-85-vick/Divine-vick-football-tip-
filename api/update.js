export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ date: today, tips: [{match:"No games today - Check tomorrow", tip:"Come back 00:00", confidence:100}] });
    }

    // Take first 50 real matches and create banker tips
    const tipsPool = ["Home Win", "Over 1.5", "Over 2.5", "BTTS Yes", "Double Chance 1X", "Home Win or Draw", "Under 3.5"];
    const tips = data.response.slice(0, 50).map((f, i) => {
      const home = f.teams.home.name;
      const away = f.teams.away.name;
      const tip = tipsPool[Math.floor(Math.random() * tipsPool.length)];
      const conf = 72 + Math.floor(Math.random() * 21);
      return {
        id: i+1,
        match: `${home} vs ${away}`,
        league: f.league.name,
        time: new Date(f.fixture.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        tip: tip,
        confidence: conf
      };
    });

    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ date: today, count: tips.length, tips });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
