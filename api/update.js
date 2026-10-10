// /api/update.js - V5.9 CLEAN FINAL - 9 OCT 2026 TODAY ONLY - Fallback yesterday only when today 0 - SportDB FREE - 10 ACCAs - CLEAN
export default async function handler(req, res) {
  const { date } = req.query;
  const getToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const getMinus = (ds, sub) => { const d = new Date(ds); d.setDate(d.getDate() - sub); return d.toISOString().split('T')[0]; };
  const todayStr = getToday();
  const targetDate = date || todayStr;
  const yesterday = getMinus(targetDate, 1);

  const LEAGUE_STATS = {
    'English Premier League': { avg: 2.9, over15: 90, over25: 70, btts: 72, home15: 65, away15: 58, corners: 84, tier: 2 },
    'German Bundesliga': { avg: 3.2, over15: 94, over25: 78, btts: 75, home15: 70, away15: 62, corners: 86, tier: 1 },
    'Spanish La Liga': { avg: 2.8, over15: 89, over25: 68, btts: 70, home15: 64, away15: 56, corners: 82, tier: 2 },
    'Italian Serie A': { avg: 2.8, over15: 88, over25: 66, btts: 68, home15: 62, away15: 54, corners: 80, tier: 2 },
    'French Ligue 1': { avg: 2.9, over15: 90, over25: 70, btts: 71, home15: 65, away15: 57, corners: 83, tier: 2 },
    'Dutch Eredivisie': { avg: 3.4, over15: 96, over25: 82, btts: 78, home15: 72, away15: 65, corners: 88, tier: 1 },
  };
  function getStats(name) {
    if (LEAGUE_STATS[name]) return LEAGUE_STATS[name];
    for (const [k,s] of Object.entries(LEAGUE_STATS)) if (name.toLowerCase().includes(k.toLowerCase())) return s;
    return { avg: 2.6, over15: 85, over25: 62, btts: 68, home15: 60, away15: 52, corners: 80, tier: 3 };
  }

  async function fetchSportDB(dateStr) {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}&s=Soccer`;
      const r = await fetch(url, { headers: { 'User-Agent': 'GoalPredict247' } });
      if (!r.ok) return { fixtures: [], count: 0 };
      const j = await r.json();
      const events = j.events || [];
      const fixtures = events.map(ev => {
        const ls = getStats(ev.strLeague || 'Premier League');
        const dt = new Date(`${ev.dateEvent} ${ev.strTime || '15:00:00'}`);
        const gh = ev.intHomeScore ? parseInt(ev.intHomeScore) : null;
        const ga = ev.intAwayScore ? parseInt(ev.intAwayScore) : null;
        let status = ev.strStatus === 'FT' || ev.strStatus === 'Match Finished' ? 'FT' : (gh !== null ? 'LIVE' : 'NS');
        return {
          home: ev.strHomeTeam, away: ev.strAwayTeam, league: ev.strLeague || 'Premier League',
          avg: ls.avg.toFixed(1), leagueStats: ls,
          time: dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }),
          dateValue: dateStr, timestamp: dt.getTime(), fixtureId: parseInt(ev.idEvent) || Math.floor(Math.random()*10000000),
          status, goalsHome: gh, goalsAway: ga
        };
      }).filter(f => f.home && f.away);
      return { fixtures, count: fixtures.length };
    } catch (e) {
      return { fixtures: [], count: 0 };
    }
  }

  function estOdd(k,t){ if(k==='over15') return t===1?'1.25':t===2?'1.35':'1.45'; if(k==='over25') return t===1?'1.65':t===2?'1.80':'1.95'; if(k==='btts') return t===1?'1.70':t===2?'1.85':'2.00'; if(k==='home15') return t===1?'1.85':t===2?'2.05':'2.25'; if(k==='away15') return t===1?'2.10':t===2?'2.35':'2.60'; if(k==='corners') return t===1?'1.80':t===2?'1.95':'2.10'; return '1.50'; }
  function buildM(f,label){ const ls=f.leagueStats; const k=label==='Over 1.5'?'over15':label==='Over 2.5'?'over25':label==='BTTS Yes'?'btts':label.includes('Home')?'home15':label.includes('Away')?'away15':'corners'; const odd=estOdd(k,ls.tier); const win=k==='over15'?ls.over15:k==='over25'?ls.over25:k==='btts'?ls.btts:k==='home15'?ls.home15:k==='away15'?ls.away15:ls.corners; return {market:label, tip:label.includes('Home')?`${f.home} Over 1.5`:label.includes('Away')?`${f.away} Over 1.5`:label==='Corners'?'Corners Over 8.5':label, key:k, odd, winProb:win}; }
  function getRes(k,gh,ga,st){ if(gh===null||ga===null) return 'PENDING'; if(k==='over15') return (gh+ga)>=2?'WON':st==='FT'?'LOST':'PENDING'; if(k==='over25') return (gh+ga)>=3?'WON':st==='FT'?'LOST':'PENDING'; if(k==='btts') return gh>0&&ga>0?'WON':st==='FT'?'LOST':'PENDING'; if(k==='home15') return gh>=2?'WON':st==='FT'?'LOST':'PENDING'; if(k==='away15') return ga>=2?'WON':st==='FT'?'LOST':'PENDING'; return 'PENDING'; }
  function getStat(s){ return s==='NS'?'UPCOMING':s==='FT'?'FT':s==='LIVE'?'LIVE':s; }
  function getSc(f){ return f.goalsHome!==null?`[${f.goalsHome}-${f.goalsAway}]`:''; }

  // TODAY ONLY, fallback to YESTERDAY only when today 0
  const todayResult = await fetchSportDB(targetDate);
  let fixtures = todayResult.fixtures;
  let usedFallback = false;
  let actualDate = targetDate;

  if(fixtures.length===0){
    const yestResult = await fetchSportDB(yesterday);
    if(yestResult.fixtures.length>0){
      fixtures = yestResult.fixtures;
      usedFallback = true;
      actualDate = yesterday;
    }
  }

  let tips=[];
  for(const f of fixtures){
    if(tips.length>=150) break;
    const m15={...buildM(f,'Over 1.5'), result:getRes('over15',f.goalsHome,f.goalsAway,f.status)};
    const m25={...buildM(f,'Over 2.5'), result:getRes('over25',f.goalsHome,f.goalsAway,f.status)};
    const mb={...buildM(f,'BTTS Yes'), result:getRes('btts',f.goalsHome,f.goalsAway,f.status)};
    const mh={...buildM(f,'Home Over 1.5'), result:getRes('home15',f.goalsHome,f.goalsAway,f.status)};
    const ma={...buildM(f,'Away Over 1.5'), result:getRes('away15',f.goalsHome,f.goalsAway,f.status)};
    const mc={...buildM(f,'Corners'), result:getRes('corners',f.goalsHome,f.goalsAway,f.status)};
    const markets={over15:m15, over25:m25, btts:mb, home15:mh, away15:ma, corners:mc};
    const best=Object.keys(markets).sort((a,b)=>markets[b].winProb-markets[a].winProb)[0];
    tips.push({match:`${f.home} vs ${f.away}`, league:f.league, time:f.time, date:f.dateValue, status:getStat(f.status), result:markets[best].result, score:getSc(f), avg:f.avg, markets, ourPick:markets[best], confidence:markets[best].winProb, odd:markets[best].odd, market:markets[best].market, tip:markets[best].tip, id:f.fixtureId, isPreviousDay:usedFallback});
  }

  if(tips.length===0){
    res.setHeader('Cache-Control','s-maxage=60');
    return res.json({date:targetDate, actualDate, total:0, wonCount:0, lostCount:0, pendingCount:0, winRate:0, tips:[], accas:{}, fallbackUsed:usedFallback});
  }

  tips.sort((a,b)=>a.timestamp-b.timestamp);
  tips=tips.map((t,i)=>({...t, number:i+1}));

  function bAcca(name, filterFn, gCount){
    let pool=[...tips].filter(filterFn).sort((a,b)=>b.confidence-a.confidence);
    let sel=[]; let tot=1;
    for(const g of pool){ if(sel.length>=gCount) break; if(!sel.find(s=>s.match===g.match)){ sel.push(g); tot*=parseFloat(g.odd); } }
    const games=sel.map(g=>({match:g.match, league:g.league, time:g.time, date:g.date, tip:g.tip, odd:g.odd, score:g.score, result:g.result, status:g.status}));
    const w=games.filter(s=>s.result==='WON').length, l=games.filter(s=>s.result==='LOST').length;
    return {name, count:sel.length, totalOdd:tot.toFixed(2), games, won:w, lost:l, result:l>0?'LOST':w===sel.length&&w>0?'WON':'PENDING'};
  }

  const accas={
    'ov15_2odds': bAcca('2 ODDS • OVER 1.5', t=>t.market==='Over 1.5', 2),
    'ov15_3odds': bAcca('3 ODDS • OVER 1.5', t=>t.market==='Over 1.5', 3),
    'ov15_5odds': bAcca('5 ODDS • OVER 1.5', t=>t.market==='Over 1.5', 4),
    'ov25_5odds': bAcca('5 ODDS • OVER 2.5', t=>t.market==='Over 2.5', 3),
    'btts_5odds': bAcca('5 ODDS • BTTS YES', t=>t.market==='BTTS Yes', 3),
    'corners_5odds': bAcca('5 ODDS • CORNERS', t=>t.market==='Corners' || t.market==='Corners Over 8.5', 3),
    'home15_5odds': bAcca('5 ODDS • HOME OVER 1.5', t=>t.market.includes('Home Over'), 3),
    'away15_5odds': bAcca('5 ODDS • AWAY OVER 1.5', t=>t.market.includes('Away Over'), 3),
    'mixed_10odds': bAcca('10 ODDS MIXED', t=>true, 5),
    'super_20odds': bAcca('20 ODDS SUPER MIXED', t=>true, 8)
  };

  const won=tips.filter(t=>t.result==='WON').length, lost=tips.filter(t=>t.result==='LOST').length, pend=tips.filter(t=>t.result==='PENDING').length;
  res.setHeader('Cache-Control','s-maxage=60');
  res.json({date:targetDate, actualDate, total:tips.length, todayCount:usedFallback?0:tips.length, previousCount:usedFallback?tips.length:0, wonCount:won, lostCount:lost, pendingCount:pend, winRate:tips.length?Math.round((won/tips.length)*100):0, tips, accas, fallbackUsed:usedFallback});
}
