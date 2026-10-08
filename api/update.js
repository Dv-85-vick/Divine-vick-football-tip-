// /api/update.js - V4.1 OPTIMIZED REAL-ONLY FETCH
export default async function handler(req, res) {
  const { date } = req.query;

  // Get date string formatted for Lagos timezone (YYYY-MM-DD)
  const getLagosDateStr = (d = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  const getMinusDateStr = (baseDateStr, daysToSub) => {
    const d = new Date(baseDateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - daysToSub);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getLagosDateStr();
  const targetDate = date || todayStr;

  const API_KEY = process.env.FOOTBALL_API_KEY || process.env.API_FOOTBALL_KEY || "";
  const USE_REAL = !!API_KEY;

  const HIGH = {
    'Eredivisie': { avg: 3.4, over15: 96, over25: 82, btts: 78, home15: 72, away15: 65, tier: 1 },
    'Bundesliga': { avg: 3.2, over15: 94, over25: 78, btts: 75, home15: 70, away15: 62, tier: 1 },
    'Eerste Divisie': { avg: 3.5, over15: 97, over25: 85, btts: 80, home15: 75, away15: 68, tier: 1 },
    'Premier League': { avg: 2.9, over15: 90, over25: 70, btts: 72, home15: 65, away15: 58, tier: 2 },
    'A-League': { avg: 3.2, over15: 94, over25: 79, btts: 76, home15: 71, away15: 64, tier: 1 },
    'MLS': { avg: 3.0, over15: 92, over25: 75, btts: 74, home15: 68, away15: 60, tier: 2 },
    'Champions League': { avg: 3.0, over15: 92, over25: 75, btts: 74, home15: 68, away15: 60, tier: 1 },
    'Europa League': { avg: 2.9, over15: 90, over25: 72, btts: 72, home15: 66, away15: 58, tier: 2 },
    'La Liga': { avg: 2.8, over15: 89, over25: 68, btts: 70, home15: 64, away15: 56, tier: 2 },
    'Serie A': { avg: 2.8, over15: 88, over25: 66, btts: 68, home15: 62, away15: 54, tier: 2 },
    'Ligue 1': { avg: 2.9, over15: 90, over25: 70, btts: 71, home15: 65, away15: 57, tier: 2 },
  };

  function getStats(name) {
    if (HIGH[name]) return HIGH[name];
    for (const [k, s] of Object.entries(HIGH)) {
      if (name.includes(k)) return s;
    }
    return { avg: 2.6, over15: 85, over25: 62, btts: 68, home15: 60, away15: 52, tier: 3 };
  }

  async function fetchFixtures(dateStr) {
    if (!USE_REAL) {
      return { fixtures: [], error: 'NO_KEY', details: 'FOOTBALL_API_KEY environment variable is missing in Vercel.', remaining: '0', quota: false, noKey: true };
    }
    try {
      const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
        headers: { 'x-apisports-key': API_KEY }
      });
      const remaining = r.headers.get('x-ratelimit-requests-remaining') || 'unknown';
      const limit = r.headers.get('x-ratelimit-requests-limit') || 'unknown';

      if (!r.ok) {
        const txt = await r.text();
        if (r.status === 429 || txt.toLowerCase().includes('limit') || txt.toLowerCase().includes('quota')) {
          return { fixtures: [], error: `QUOTA_EXCEEDED_${r.status}`, details: `Quota finished! Limit ${limit}, Remaining ${remaining}.`, remaining, quota: true };
        }
        return { fixtures: [], error: `HTTP_${r.status}`, details: txt.slice(0, 500), remaining };
      }

      const j = await r.json();
      if (j.errors && Object.keys(j.errors).length > 0) {
        const errStr = JSON.stringify(j.errors);
        if (errStr.toLowerCase().includes('limit') || errStr.toLowerCase().includes('quota')) {
          return { fixtures: [], error: 'QUOTA_EXCEEDED', details: errStr.slice(0, 500), remaining, quota: true };
        }
        return { fixtures: [], error: 'API_ERROR', details: errStr.slice(0, 500), remaining };
      }

      if (!j.response || j.response.length === 0) {
        return { fixtures: [], error: 'NO_FIXTURES', details: `0 fixtures found for ${dateStr}.`, remaining, responseCount: 0 };
      }

      const fixtures = j.response.map(f => {
        const ls = getStats(f.league.name);
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
          dateValue: dateStr,
          timestamp: fd.getTime(),
          fixtureId: f.fixture.id,
          status: f.fixture.status.short,
          goalsHome: f.goals.home,
          goalsAway: f.goals.away,
          date: dateStr
        };
      });

      return { fixtures, error: null, remaining, limit, responseCount: fixtures.length };
    } catch (e) {
      return { fixtures: [], error: e.message, details: e.toString() };
    }
  }

  async function fetchOdds(dateStr) {
    if (!USE_REAL) return { oddsMap: {}, count: 0 };
    try {
      const r = await fetch(`https://v3.football.api-sports.io/odds?date=${dateStr}`, {
        headers: { 'x-apisports-key': API_KEY }
      });
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

  let allOddsMap = {};
  let realCount = 0;
  let tips = [];
  let debugInfo = { apiKeySet: USE_REAL, quotaExceeded: false, errors: [], today: todayStr, requested: targetDate, envKeyExists: USE_REAL, noKey: !USE_REAL };

  // PRIORITIZED DATES: Target date first, then fallback to recent days ONLY if primary returns 0 games.
  const primaryDates = [targetDate];
  if (targetDate !== todayStr) primaryDates.push(todayStr);

  let targetFixturesFound = false;

  for (const dateStr of primaryDates) {
    const [fixRes, oddsRes] = await Promise.all([fetchFixtures(dateStr), fetchOdds(dateStr)]);
    
    debugInfo.errors.push({ date: dateStr, error: fixRes.error, details: fixRes.details || '', remaining: fixRes.remaining, count: fixRes.responseCount || 0 });
    if (fixRes.quota) debugInfo.quotaExceeded = true;
    if (fixRes.noKey) debugInfo.noKey = true;

    allOddsMap = { ...allOddsMap, ...oddsRes.oddsMap };
    realCount += oddsRes.count;

    if (fixRes.fixtures.length > 0) {
      targetFixturesFound = true;
      processFixtures(fixRes.fixtures, dateStr);
    }
  }

  // Fallback to recent history ONLY if target and today returned zero games
  if (!targetFixturesFound && !debugInfo.quotaExceeded && !debugInfo.noKey) {
    const fallbackDates = [getMinusDateStr(targetDate, 1), getMinusDateStr(targetDate, 2)];
    for (const dateStr of fallbackDates) {
      const fixRes = await fetchFixtures(dateStr);
      if (fixRes.fixtures.length > 0) {
        processFixtures(fixRes.fixtures, dateStr);
        break;
      }
    }
  }

  function processFixtures(fixtures, dateStr) {
    for (const f of fixtures) {
      if (tips.length >= 150) break;

      const ro = allOddsMap[f.fixtureId] || {};
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

      if (tips.find(t => t.id === f.fixtureId)) continue;

      tips.push({
        match: `${f.home} vs ${f.away}`,
        home: f.home,
        away: f.away,
        league: f.league,
        time: f.time,
        dateDisplay: f.dateDisplay,
        dateValue: f.dateValue,
        timestamp: f.timestamp,
        date: f.dateValue,
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
        id: f.fixtureId,
        isPreviousDay: dateStr !== targetDate
      });
    }
  }

  if (tips.length === 0) {
    res.setHeader('Cache-Control', 's-maxage=60');
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
      source: `V4.1_REAL_0_GAMES`,
      realOddsCount: 0,
      debug: debugInfo,
      apiKeySet: USE_REAL,
      quotaExceeded: debugInfo.quotaExceeded,
      noKey: debugInfo.noKey,
      error: debugInfo.noKey ? 'NO_API_KEY_SET' : debugInfo.quotaExceeded ? 'QUOTA_EXCEEDED' : 'NO_FIXTURES_REAL'
    });
  }

  // Deduplicate and Sort
  const seen = new Set();
  tips = tips.filter(f => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
  tips.sort((a, b) => a.timestamp - b.timestamp);
  tips = tips.map((t, i) => ({ ...t, number: i + 1 }));

  // Accumulator Builders
  let usedMatchesGlobal = new Set();

  function buildAcca(name, mKey, gCount, offset = 0) {
    let pool = tips.filter(t => t.markets[mKey]).sort((a, b) => b.markets[mKey].winProb - a.markets[mKey].winProb);
    if (pool.length === 0) pool = [...tips]; // Fallback if specific market is empty
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
    todayCount: tips.filter(t => !t.isPreviousDay).length,
    previousCount: tips.filter(t => t.isPreviousDay).length,
    wonCount,
    lostCount,
    pendingCount,
    winRate: tips.length ? Math.round((wonCount / tips.length) * 100) : 0,
    tips,
    accas,
    source: `V4.1_REAL_OPTIMIZED`,
    realOddsCount: realCount,
    debug: debugInfo,
    apiKeySet: USE_REAL,
    quotaExceeded: debugInfo.quotaExceeded
  });
}
