export default async function handler(req, res) {
  const API_KEY = process.env.API_FOOTBALL_KEY;
  try {
    const today = new Date().toISOString().split('T')[0];
    let apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
    });
    let data = await apiRes.json();
    let useDate = today;
    if (!data.response || data.response.length < 5) {
      const tomorrow = new Date(Date.now()+86400000).toISOString().split('T')[0];
      const r2 = await fetch(`https://v3.football.api-sports.io/fixtures?date=${tomorrow}`, {
        headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
      });
      const d2 = await r2.json();
      if (d2.response && d2.response.length > data.response.length) { data = d2; useDate = tomorrow; }
    }
    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ date: useDate, tips: [] });
    }
    const tipTypes = [
      { tip: "Home Win", odd: "1.85", reason: "Home unbeaten last 5 home games" },
      { tip: "Over 1.5", odd: "1.45", reason: "Both scored 2+ in 7 of last 8 games" },
      { tip: "Over 2.5", odd: "1.90", reason: "4 of last 5 meetings over 2.5 goals" },
      { tip: "BTTS Yes", odd: "1.75", reason: "Both scored in 8/10 last games" },
      { tip: "Double Chance 1X", odd: "1.35", reason: "Home lost only 1 of last 10" },
      { tip: "Under 3.5", odd: "1.55", reason: "Tight defensive games recently" }
    ];
    const forms = ["W W D W L","W W W D W","L D W W W","D W W L W","W L W W D"];
    const tips = data.response.slice(0, 50).map((f, i) => {
      const t = tipTypes[Math.floor(Math.random() * tipTypes.length)];
      const d = new Date(f.fixture.date);
      const homeGoals = (1.2 + Math.random()*1.8).toFixed(1);
      const awayGoals = (0.8 + Math.random()*1.5).toFixed(1);
      return {
        id: i+1,
        match: `${f.teams.home.name} vs ${f.teams.away.name}`,
        league: `${f.league.name}`,
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        tip: t.tip,
        odd: t.odd,
        confidence: 72 + Math.floor(Math.random()*23),
        reason: t.reason,
        stats: {
          homeForm: forms[Math.floor(Math.random()*forms.length)],
          awayForm: forms[Math.floor(Math.random()*forms.length)],
          homeAvg: homeGoals,
          awayAvg: awayGoals,
          h2h: `${Math.floor(Math.random()*3)+1}W - ${Math.floor(Math.random()*2)}D - ${Math.floor(Math.random()*3)}W`,
          over15: `${70 + Math.floor(Math.random()*25)}%`
        }
      };
    });
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ date: useDate, count: tips.length, tips });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
