// /api/update.js - V4.5 ACTIVE LEAGUES FETCH WITH SEASON & LEAGUE-ID FALLBACK
export default async function handler(req, res) {
  const { date } = req.query;

  // Format date to Lagos timezone string (YYYY-MM-DD)
  const getLagosDateStr = (d = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  const todayStr = getLagosDateStr();
  const targetDate = date || todayStr;

  const API_KEY = process.env.FOOTBALL_API_KEY || process.env.API_FOOTBALL_KEY || "";
  const USE_REAL = !!API_KEY;

  // Active leagues mapped with benchmark statistics
  const HIGH = {
    'Veikkausliiga': { avg: 3.1, over15: 93, over25: 75, btts: 72, home15: 68, away15: 60, tier: 1 },
    'Serie A': { avg: 2.8, over15: 88, over25: 66, btts: 68, home15: 62, away15: 54, tier: 2 },
    'Liga 1': { avg: 2.7, over15: 86, over25: 64, btts: 65, home15: 60, away15: 52, tier: 2 },
    'Primera A': { avg: 2.6, over15: 84, over25: 60, btts: 62, home15: 58, away15: 50, tier: 3 },
    'Eredivisie': { avg: 3.4, over15: 96, over25: 82, btts: 78, home15: 72, away15: 65, tier: 1 },
    'Bundesliga': { avg: 3.2, over15: 94, over25: 78, btts: 75, home15: 70, away15: 62, tier: 1 },
    'Premier League': { avg: 2.9, over15: 90, over25: 70, btts: 72, home15: 65, away15: 58, tier: 2 },
    'A-League': { avg: 3.2, over15: 94, over25: 79, btts: 76, home15: 71, away15: 64, tier: 1 },
    'MLS': { avg: 3.0, over15: 92, over25: 75, btts: 74, home15: 68, away15: 60, tier: 2 },
  };

  // Specific API-Football League IDs playing today to query directly if standard fetch returns 0
  const ACTIVE_LEAGUE_IDS = [
    { id: 71, name: 'Serie A (Brazil)' },
    { id: 244, name: 'Veikkausliiga (Finland)' },
    { id: 283, name: 'Liga 1 (Romania)' },
    { id: 239, name: 'Primera A (Colombia)' },
    { id: 281, name: 'Liga 1 (Peru)' }
  ];

  function getStats(name) {
    if (!name) return { avg: 2.6, over15: 85, over25: 62, btts: 68, home15: 60, away15: 52, tier: 3 };
    if (HIGH[name]) return HIGH[name];
    for (const [k, s] of Object.entries(HIGH)) {
      if (name.includes(k)) return s;
    }
    return { avg: 2.6, over15: 85, over25: 62, btts: 68, home15: 60, away15: 52, tier: 3 };
  }

  function getHeaders() {
    const isRapid = API_KEY.length > 40;
    if (isRapid) {
      return {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      };
    }
    return {
      'x-apisports-key': API_KEY
    };
  }

  function getBaseUrl() {
    return API_KEY.length > 40 
      ? 'https://api-football-v1.p.rapidapi.com/v3'
      : 'https://v3.football.api-sports.io';
  }

  async function fetchFixturesByUrl(url) {
    if (!USE_REAL) return { fixtures: [], error: 'NO_KEY' };
    try {
      const headers = getHeaders();
      const r = await fetch(url, { headers });
      const remaining = r.headers.get('x-ratelimit-requests-remaining') || 'unknown';

      if (!r.ok) {
        const txt = await r.text();
        return { fixtures: [], error: `HTTP_${r.status}`, details: txt.slice(0, 500), remaining };
      }

      const j = await r.json();
      if (!j.response || j.response.length === 0) {
        return { fixtures: [], error: 'NO_FIXTURES', remaining };
      }

      const fixtures = j.response.map(f => {
        const ls = getStats(f.league?.name || '');
        const fd = new Date(f.fixture.date);
        return {
          home: f.teams.home.name,
          away: f.teams.away.name,
          league: f.league.name,
          country: f.league.country,
          avg: ls.avg.toFixed(1),
          leagueStats: ls,
          time: fd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }),
          dateDisplay: fd.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Africa/Lagos' }),
          dateValue: targetDate,
          timestamp: fd.getTime(),
          fixtureId: f.fixture.id,
          status: f.fixture.status.short,
          goalsHome: f.goals.home,
          goalsAway: f.goals.away,
          date: targetDate
        };
      });

      return { fixtures, error: null, remaining };
    } catch (e) {
      return { fixtures: [], error: e.message };
    }
  }

  async function fetchFixtures(dateStr) {
    const baseUrl = getBaseUrl();
    
    // 1. First attempt standard date query
    let result = await fetchFixturesByUrl(`${baseUrl}/fixtures?date=${dateStr}&timezone=Africa/Lagos`);
    
    // 2. If standard date search yields zero fixtures, fallback to querying active leagues directly
    if (result.fixtures.length === 0) {
      const year = dateStr.split('-')[0];
      let aggregatedFixtures = [];

      for (const lg of ACTIVE_LEAGUE_IDS) {
        const leagueUrl = `${baseUrl}/fixtures?league=${lg.id}&season=${year}&date=${dateStr}`;
        const leagueRes = await fetchFixturesByUrl(leagueUrl);
        if (leagueRes.fixtures.length > 0) {
          aggregatedFixtures = [...aggregatedFixtures, ...leagueRes.fixtures];
        }
      }

      if (aggregatedFixtures.length > 0) {
        result.fixtures = aggregatedFixtures;
        result.error = null;
      }
    }

    return result;
  }

  async function fetchOdds(dateStr) {
    if (!USE_REAL) return { oddsMap: {}, count: 0 };
    try {
      const headers = getHeaders();
      const baseUrl = getBaseUrl();

      const r = await fetch(`${baseUrl}/odds?date=${dateStr}`, { headers });
      if (!r.ok) return { oddsMap: {}, count: 0 };

      const j = await r.json();
      const map = {};
      let count = 0;

      for (const it of (j.response || [])) {
        const fid = it.fixture?.id;
        if (!fid) continue;
        const bm = (it.bookmakers || []).find(b => b.id === 2) || (it.bookmakers || [])[0];
        if (!bm) continue;

        const bets = bm.bets || [];
        const ou = bets.find(b => b.id === 5);
        if (ou) {
          for (const v of (ou.values || [])) {
            const val = v.value?.toLowerCase();
            const odd = parseFloat(v.odd);
            if (!odd) continue;
            if (!map[fid]) map[fid] = {};
            if (val === 'over 1.5') { map[fid].over15 = odd.toFixed(2); count++; }
            if (val === 'over 2.5') { map[fid].over25 = odd.toFixed(2); count++; }
          }
        }

        const btts = bets.find(b => b.id === 8);
        if (btts) {
          for (const v of (btts.values || [])) {
            if (v.value?.toLowerCase() === 'yes') {
              const odd = parseFloat(v.odd);
              if (odd) {
                if (!map[fid]) map[fid] = {};
                map[fid].btts = odd.toFixed(2);
                count++;
              }
            }
          }
        }

        if (!map[fid]) map[fid] = {};
        if (!map[fid].home15 && map[fid].over15) {
          map[fid].home15 = (parseFloat(map[fid].over15) * 1.45).toFixed(2);
        }
        if (!map[fid].away15 && map[fid].over15) {
          map[fid].away15 = (parseFloat(map[fid].over15) * 1.55).toFixed(2);
        }
      }
      return { oddsMap: map, count };
    } catch (e) {
      return { oddsMap: {}, count: 0 };
    }
  }

  function getEstimatedOdd(market, tier) {
    if (market === 'over15') return tier === 1 ? '1.25' : tier === 2 ? '1.35' : '1.45';
    if (market === 'over25') return tier === 1 ? '1.65' : tier === 2 ? '1.80' : '1.95';
    if (market === 'btts') return tier === 1 ? '1.70' : tier === 2 ? '1.85' : '2.00';
    if (market === 'home15') return tier === 1 ? '1.85' : tier === 2 ? '2.05' : '2.25';
    if (market === 'away15') return tier === 1 ? '2.10' : tier === 2 ? '2.35' : '2.60';
    return '1.50';
  }

  function mStats(f, market, realOdd) {
    const ls = f.leagueStats;
    const odd = realOdd || getEstimatedOdd(
      market === 'Over 1.5' ? 'over15' : market === 'Over 2.5' ? 'over25' : market === 'BTTS Yes' ? 'btts' : market === 'Home Over 1.5' ? 'home15' : 'away15',
      ls.tier
    );
    const isReal = !!realOdd;
    if (market === 'Over 1.5') return { odd, winProb: ls.over15, conf: ls.over15, reason: `${isReal ? '✅ REAL Bet365' : '📊 EST'} O1.5 ${ls.over15}%`, tier: ls.tier, isReal };
    if (market === 'Over 2.5') return { odd, winProb: ls.over25, conf: ls.over25, reason: `O2.5 ${ls.over25}%`, tier: ls.tier, isReal };
    if (market === 'BTTS Yes') return { odd, winProb: ls.btts, conf: ls.btts, reason: `BTTS ${ls.btts}%`, tier: ls.tier, isReal };
    if (market === 'Home Over 1.5') return { odd, winProb: ls.home15, conf: ls.home15, reason: `HOME O1.5 ${ls.home15}%`, tier: ls.tier, isReal };
    if (market === 'Away Over 1.5') return { odd, winProb: ls.away15, conf: ls.away15, reason: `AWAY O1.5 ${ls.away15}%`, tier: ls.tier, isReal };
    return null;
  }

  function getRes(k, gh, ga, st) {
    if (gh === null || ga === null) return 'PENDING';
    const tot = gh + ga;
    const isFT = st === 'FT' || st === 'AET' || st === 'PEN' || String(st).includes('FT');
    if (k === 'over15') return tot >= 2 ? 'WON' : isFT ? 'LOST' : 'PENDING';
    if (k === 'over25') return tot >= 3 ? 'WON' : isFT ? 'LOST' : 'PENDING';
    if (k === 'btts') return (gh > 0 && ga > 0) ? 'WON' : isFT ? 'LOST' : 'PENDING';
    if (k === 'home15') return gh >= 2 ? 'WON' : isFT ? 'LOST' : 'PENDING';
    if (k === 'away15') return ga >= 2 ? 'WON' : isFT ? 'LOST' : 'PENDING';
    return 'PENDING';
  }

  function getStatus(s) {
    if (s === 'NS') return 'UPCOMING • NOT STARTED';
    if (s === 'FT') return 'FT • FINISHED';
    if (s === '1H') return 'LIVE • 1H';
    if (s === 'HT') return 'LIVE • HT';
    if (s === '2H') return 'LIVE • 2H';
    return s || 'NOT STARTED';
  }

  function getRealScore(f) {
    if (f.goalsHome !== null && f.goalsAway !== null) return `[${f.goalsHome}-${f.goalsAway}]`;
    return "";
  }

  let tips = [];
  let debugInfo = { apiKeySet: USE_REAL, errors: [], today: todayStr, requested: targetDate };

  const [fixRes, oddsRes] = await Promise.all([fetchFixtures(targetDate), fetchOdds(targetDate)]);

  if (fixRes.fixtures.length > 0) {
    for (const f of fixRes.fixtures) {
      if (tips.length >= 150) break;

      const ro = oddsRes.oddsMap[f.fixtureId] || {};
      const over15 = mStats(f, 'Over 1.5', ro.over15);
      const over25 = mStats(f, 'Over 2.5', ro.over25);
      const btts = mStats(f, 'BTTS Yes', ro.btts);
      const home15 = mStats(f, 'Home Over 1.5', ro.home15);
      const away15 = mStats(f, 'Away Over 1.5', ro.away15);

      const markets = {};
      if (over15) markets.over15 = { market: 'Over 1.5', tip: 'Over 1.5', key: 'over15', ...over15, result: getRes('over15', f.goalsHome, f.goalsAway, f.status) };
      if (over25) markets.over25 = { market: 'Over 2.5', tip: 'Over 2.5', key: 'over25', ...over25, result: getRes('over25', f.goalsHome, f.goalsAway, f.status) };
      if (btts) markets.btts = { market: 'BTTS Yes', tip: 'BTTS Yes', key: 'btts', ...btts, result: getRes('btts', f.goalsHome, f.goalsAway, f.status) };
      if (home15) markets.home15 = { market: 'Home Over 1.5', tip: `${f.home} Over 1.5`, key: 'home15', ...home15, result: getRes('home15', f.goalsHome, f.goalsAway, f.status) };
      if (away15) markets.away15 = { market: 'Away Over 1.5', tip: `${f.away} Over 1.5`, key: 'away15', ...away15, result: getRes('away15', f.goalsHome, f.goalsAway, f.status) };

      const keys = Object.keys(markets);
      if (keys.length === 0) continue;

      const bestKey = keys.sort((a, b) => markets[b].winProb - markets[a].winProb)[0];
      const ourPick = markets[bestKey];

      tips.push({
        match: `${f.home} vs ${f.away}`,
        home: f.home,
        away: f.away,
        league: f.league,
        time: f.time,
        dateDisplay: f.dateDisplay,
        dateValue: targetDate,
        timestamp: f.timestamp,
        date: targetDate,
        requestedDate: targetDate,
        status: getStatus(f.status),
        result: ourPick.result,
        score: getRealScore(f),
        avg: f.avg,
        leagueStats: f.leagueStats,
        markets,
        ourPick,
        ourPickKey: bestKey,
        confidence: ourPick.winProb,
        winProb: ourPick.winProb,
        odd: ourPick.odd,
        id: f.fixtureId
      });
    }
  }

  if (tips.length === 0) {
    res.setHeader('Cache-Control', 's-maxage=30');
    return res.json({
      date: targetDate,
      total: 0,
      todayCount: 0,
      previousCount: 0,
      wonCount: 0,
      lostCount: 0,
      pendingCount: 0,
      winRate: 0,
      tips: [],
      accas: {},
      source: `V4.5_ACTIVE_LEAGUES_FALLBACK`,
      realOddsCount: 0,
      debug: debugInfo,
      apiKeySet: USE_REAL
    });
  }

  tips.sort((a, b) => a.timestamp - b.timestamp);
  tips = tips.map((t, i) => ({ ...t, number: i + 1 }));

  let usedMatchesGlobal = new Set();

  function buildAcca(name, mKey, gCount, offset = 0) {
    let pool = tips.filter(t => t.markets[mKey]).sort((a, b) => b.markets[mKey].winProb - a.markets[mKey].winProb);
    if (pool.length === 0) pool = [...tips];
    pool = pool.slice(offset).concat(pool.slice(0, offset));

    let sel = [];
    let tot = 1;
    for (let g of pool) {
      if (sel.length >= gCount) break;
      if (!sel.find(s => s.match === g.match) && !usedMatchesGlobal.has(g.match)) {
        sel.push(g);
        tot *= parseFloat(g.markets[mKey]?.odd || g.ourPick.odd);
        usedMatchesGlobal.add(g.match);
      }
    }

    const games = sel.map(g => ({
      number: g.number, match: g.match, league: g.league, time: g.time,
      dateDisplay: g.dateDisplay, dateValue: g.dateValue, tip: g.markets[mKey]?.tip || g.ourPick.tip,
      odd: g.markets[mKey]?.odd || g.ourPick.odd, score: g.score, result: g.markets[mKey]?.result || g.result,
      status: g.status, market: g.markets[mKey]?.market || g.ourPick.market, winProb: g.markets[mKey]?.winProb || g.winProb
    }));

    const won = games.filter(s => s.result === 'WON').length;
    const lost = games.filter(s => s.result === 'LOST').length;

    return {
      name: `${name} • ${targetDate} • ${games.length} games`,
      count: sel.length,
      totalOdd: tot.toFixed(2),
      marketKey: mKey,
      games,
      won,
      lost,
      result: lost > 0 ? 'LOST' : won === sel.length && won > 0 ? 'WON' : 'PENDING'
    };
  }

  const accas = {
    'ov15_2odds': buildAcca('2 ODDS • OVER 1.5', 'over15', 3, 0),
    'ov15_3odds': buildAcca('3 ODDS • OVER 1.5', 'over15', 4, 1),
    'ov15_5odds': buildAcca('5 ODDS • OVER 1.5', 'over15', 6, 2),
    'ov25_5odds': buildAcca('5 ODDS • OVER 2.5', 'over25', 4, 0),
    'btts_5odds': buildAcca('5 ODDS • BTTS YES', 'btts', 4, 0),
    'home15_5odds': buildAcca('5 ODDS • HOME O1.5', 'home15', 4, 0),
    'away15_5odds': buildAcca('5 ODDS • AWAY O1.5', 'away15', 4, 0)
  };

  const wonCount = tips.filter(t => t.result === 'WON').length;
  const lostCount = tips.filter(t => t.result === 'LOST').length;
  const pendingCount = tips.filter(t => t.result === 'PENDING').length;

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.json({
    date: targetDate,
    total: tips.length,
    todayCount: tips.length,
    previousCount: 0,
    wonCount,
    lostCount,
    pendingCount,
    winRate: tips.length ? Math.round((wonCount / tips.length) * 100) : 0,
    tips,
    accas,
    source: `V4.5_ACTIVE_LEAGUES_FALLBACK`,
    realOddsCount: oddsRes.count,
    debug: debugInfo,
    apiKeySet: USE_REAL
  });
}
