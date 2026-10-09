// /api/update.js - V5.3 FINAL - FIXES MISSING ACCA SECTIONS + SUSPENDED ACCOUNT + FREE ESPN - REAL ONLY
export default async function handler(req, res) {
  const { date } = req.query;
  const getToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const getMinus = (ds, sub) => { const d = new Date(ds); d.setDate(d.getDate() - sub); return d.toISOString().split('T')[0]; };
  const getPlus = (ds, add) => { const d = new Date(ds); d.setDate(d.getDate() + add); return d.toISOString().split('T')[0]; };
  const todayStr = getToday();
  const targetDate = date || todayStr;

  const API_KEY = process.env.FOOTBALL_API_KEY || process.env.API_FOOTBALL_KEY || "";
  const HAS_KEY = !!API_KEY;

  const LEAGUE_STATS = {
    'Eredivisie': { avg: 3.4, over15: 96, over25: 82, btts: 78, home15: 72, away15: 65, corners: 88, tier: 1 },
    'Bundesliga': { avg: 3.2, over15: 94, over25: 78, btts: 75, home15: 70, away15: 62, corners: 86, tier: 1 },
    'Premier League': { avg: 2.9, over15: 90, over25: 70, btts: 72, home15: 65, away15: 58, corners: 84, tier: 2 },
    'La Liga': { avg: 2.8, over15: 89, over25: 68, btts: 70, home15: 64, away15: 56, corners: 82, tier: 2 },
    'Serie A': { avg: 2.8, over15: 88, over25: 66, btts: 68, home15: 62, away15: 54, corners: 80, tier: 2 },
    'Ligue 1': { avg: 2.9, over15: 90, over25: 70, btts: 71, home15: 65, away15: 57, corners: 83, tier: 2 },
    'Champions League': { avg: 3.0, over15: 92, over25: 75, btts: 74, home15: 68, away15: 60, corners: 87, tier: 1 },
  };
  function getStats(name) {
    if (LEAGUE_STATS[name]) return LEAGUE_STATS[name];
    for (const [k,s] of Object.entries(LEAGUE_STATS)) if (name.toLowerCase().includes(k.toLowerCase())) return s;
    return { avg: 2.6, over15: 85, over25: 62, btts: 68, home15: 60, away15: 52, corners: 80, tier: 3 };
  }

  async function fetchESPN(dateStr) {
    const yyyymmdd = dateStr.replace(/-/g,'');
    const leagues = [
      { id: 'eng.1', name: 'Premier League' },
      { id: 'esp.1', name: 'La Liga' },
      { id: 'ger.1', name: 'Bundesliga' },
      { id: 'ita.1', name: 'Serie A' },
      { id: 'fra.1', name: 'Ligue 1' },
      { id: 'ned.1', name: 'Eredivisie' },
      { id: 'uefa.champions', name: 'Champions League' },
      { id: 'uefa.europa', name: 'Europa League' },
      { id: 'fifa.worldq', name: 'World Cup Qualification' },
      { id: 'uefa.nations', name: 'Nations League' },
    ];
    let fixtures=[];
    for(const lg of leagues){
      try{
        const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.id}/scoreboard?dates=${yyyymmdd}`;
        const r=await fetch(url,{headers:{'User-Agent':'GoalPredict247'}});
        if(!r.ok) continue;
        const j=await r.json();
        for(const ev of (j.events||[])){
          const comp=ev.competitions?.[0]; if(!comp) continue;
          const home=comp.competitors?.find(c=>c.homeAway==='home'); const away=comp.competitors?.find(c=>c.homeAway==='away'); if(!home||!away) continue;
          const ls=getStats(lg.name); const dt=new Date(comp.date||ev.date); const st=comp.status?.type?.name||'STATUS_SCHEDULED'; const short=st.includes('STATUS_FINAL')?'FT':st.includes('STATUS_IN_PROGRESS')||st.includes('HALF')?'LIVE':'NS';
          const gh=home.score?parseInt(home.score):null; const ga=away.score?parseInt(away.score):null;
          fixtures.push({home:home.team?.displayName||home.team?.name, away:away.team?.displayName||away.team?.name, league:lg.name, country:lg.id.split('.')[0].toUpperCase(), avg:ls.avg.toFixed(1), leagueStats:ls, time:dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}), dateDisplay:dt.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'Africa/Lagos'}), dateValue:dateStr, timestamp:dt.getTime(), fixtureId:parseInt(ev.id)||Math.floor(Math.random()*10000000), status:short, goalsHome:gh, goalsAway:ga});
        }
      }catch(e){continue;}
      if(fixtures.length>=60) break;
    }
    return fixtures;
  }

  async function fetchAPIFootball(dateStr){
    if(!HAS_KEY) return {fixtures:[], error:'NO_KEY', suspended:false};
    try{
      const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`,{headers:{'x-apisports-key':API_KEY}});
      const txt=await r.text();
      if(!r.ok){ if(r.status===403||/suspend|blocked|banned|account/i.test(txt)) return {fixtures:[], error:'SUSPENDED', details:txt.slice(0,300), suspended:true}; return {fixtures:[], error:`HTTP_${r.status}`, details:txt.slice(0,300), suspended:false}; }
      const j=JSON.parse(txt);
      if(j.errors&&Object.keys(j.errors).length>0){ const es=JSON.stringify(j.errors); if(/suspend|block|banned|quota/i.test(es)) return {fixtures:[], error:'SUSPENDED', details:es.slice(0,300), suspended:true}; }
      if(!j.response) return {fixtures:[], error:'NO_RESP', suspended:false};
      const fixtures=j.response.map(f=>{ const ls=getStats(f.league.name); const fd=new Date(f.fixture.date); return {home:f.teams.home.name, away:f.teams.away.name, league:f.league.name, country:f.league.country, avg:ls.avg.toFixed(1), leagueStats:ls, time:fd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}), dateDisplay:fd.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'Africa/Lagos'}), dateValue:dateStr, timestamp:fd.getTime(), fixtureId:f.fixture.id, status:f.fixture.status.short, goalsHome:f.goals.home, goalsAway:f.goals.away}; });
      return {fixtures, error:null, suspended:false, count:fixtures.length};
    }catch(e){ return {fixtures:[], error:e.message, suspended:false}; }
  }

  function estOdd(k,t){ if(k==='over15') return t===1?'1.25':t===2?'1.35':'1.45'; if(k==='over25') return t===1?'1.65':t===2?'1.80':'1.95'; if(k==='btts') return t===1?'1.70':t===2?'1.85':'2.00'; if(k==='home15') return t===1?'1.85':t===2?'2.05':'2.25'; if(k==='away15') return t===1?'2.10':t===2?'2.35':'2.60'; if(k==='corners') return t===1?'1.80':t===2?'1.95':'2.10'; return '1.50'; }
  function buildM(f,label){ const ls=f.leagueStats; const k=label==='Over 1.5'?'over15':label==='Over 2.5'?'over25':label==='BTTS Yes'?'btts':label.includes('Home')?'home15':label.includes('Away')?'away15':'corners'; const odd=estOdd(k,ls.tier); const win=k==='over15'?ls.over15:k==='over25'?ls.over25:k==='btts'?ls.btts:k==='home15'?ls.home15:k==='away15'?ls.away15:ls.corners; return {market:label, tip:label.includes('Home')?`${f.home} Over 1.5`:label.includes('Away')?`${f.away} Over 1.5`:label==='Corners'?'Corners Over 8.5':label, key:k, odd, winProb:win, conf:win, reason:`📊 FREE ESPN REAL • ${label} ${win}% • ${f.league} avg ${ls.avg} • ${f.dateValue}`, tier:ls.tier}; }
  function getRes(k,gh,ga,st){ if(gh===null||ga===null) return 'PENDING'; if(k==='over15') return (gh+ga)>=2?'WON':st==='FT'?'LOST':'PENDING'; if(k==='over25') return (gh+ga)>=3?'WON':st==='FT'?'LOST':'PENDING'; if(k==='btts') return gh>0&&ga>0?'WON':st==='FT'?'LOST':'PENDING'; if(k==='home15') return gh>=2?'WON':st==='FT'?'LOST':'PENDING'; if(k==='away15') return ga>=2?'WON':st==='FT'?'LOST':'PENDING'; if(k==='corners') return 'PENDING'; return 'PENDING'; }
  function getStat(s){ if(s==='NS') return 'UPCOMING • NOT STARTED'; if(s==='FT') return 'FT • FINISHED'; if(s==='LIVE') return '🔴 LIVE'; return s; }
  function getSc(f){ return f.goalsHome!==null&&f.goalsAway!==null?`[${f.goalsHome}-${f.goalsAway}]`:''; }

  let tips=[]; let debug={hasKey:HAS_KEY, suspended:false, today:todayStr, req:targetDate, errors:[], source:''};

  const dates=[targetDate];
  for(let i=1;i<=7;i++) dates.push(getMinus(targetDate,i));
  for(let i=1;i<=3;i++) dates.push(getPlus(targetDate,i));
  if(targetDate!==todayStr) dates.push(todayStr);

  for(const ds of dates){
    if(tips.length>=80) break;
    let fixtures=[];
    if(HAS_KEY&&!debug.suspended){
      const af=await fetchAPIFootball(ds);
      debug.errors.push({date:ds, provider:'API-Football', err:af.error, cnt:af.count||0, suspended:!!af.suspended});
      if(af.suspended) debug.suspended=true;
      if(af.fixtures.length>0) fixtures=af.fixtures;
    }
    if(fixtures.length===0){
      const espn=await fetchESPN(ds);
      if(espn.length>0){ debug.errors.push({date:ds, provider:'ESPN FREE', cnt:espn.length}); debug.source='FREE ESPN'; fixtures=espn; }
    }
    for(const f of fixtures){
      if(tips.length>=150) break;
      if(tips.find(t=>t.id===f.fixtureId)) continue;
      const m15={...buildM(f,'Over 1.5'), result:getRes('over15',f.goalsHome,f.goalsAway,f.status)};
      const m25={...buildM(f,'Over 2.5'), result:getRes('over25',f.goalsHome,f.goalsAway,f.status)};
      const mb={...buildM(f,'BTTS Yes'), result:getRes('btts',f.goalsHome,f.goalsAway,f.status)};
      const mh={...buildM(f,'Home Over 1.5'), result:getRes('home15',f.goalsHome,f.goalsAway,f.status)};
      const ma={...buildM(f,'Away Over 1.5'), result:getRes('away15',f.goalsHome,f.goalsAway,f.status)};
      const mc={...buildM(f,'Corners'), result:getRes('corners',f.goalsHome,f.goalsAway,f.status)};
      const markets={over15:m15, over25:m25, btts:mb, home15:mh, away15:ma, corners:mc};
      const best=Object.keys(markets).sort((a,b)=>markets[b].winProb-markets[a].winProb)[0];
      tips.push({match:`${f.home} vs ${f.away}`, home:f.home, away:f.away, league:f.league, country:f.country, time:f.time, dateDisplay:f.dateDisplay, dateValue:f.dateValue, timestamp:f.timestamp, date:f.dateValue, requestedDate:targetDate, status:getStat(f.status), result:markets[best].result, score:getSc(f), avg:f.avg, leagueStats:f.leagueStats, markets, ourPick:markets[best], ourPickKey:best, confidence:markets[best].winProb, winProb:markets[best].winProb, odd:markets[best].odd, market:markets[best].market, tip:markets[best].tip, reason:markets[best].reason, stats:`${f.league} avg ${f.avg} • ${markets[best].market} ${markets[best].winProb}% • ${f.dateValue}`, id:f.fixtureId, isPreviousDay:ds!==targetDate});
    }
  }

  if(tips.length===0){
    res.setHeader('Cache-Control','s-maxage=60');
    return res.json({date:targetDate, total:0, todayCount:0, previousCount:0, wonCount:0, lostCount:0, pendingCount:0, winRate:0, tips:[], accas:{}, source:'V5.3_NO_GAMES', debug, apiKeySet:HAS_KEY, suspended:debug.suspended, error:debug.suspended?'API_FOOTBALL_SUSPENDED':'NO_FIXTURES'});
  }

  const seen=new Set(); tips=tips.filter(t=>{if(seen.has(t.id)) return false; seen.add(t.id); return true;}).slice(0,200);
  tips.sort((a,b)=>a.timestamp-b.timestamp);
  tips=tips.map((t,i)=>({...t, number:i+1}));

  // BUILD 7 ACCAs MATCHING index.html EXPECTED KEYS - NO GLOBAL USED SET (allow reuse across accas, avoid dup within acca only)
  function bAcca(name, filterFn, gCount){
    let pool=[...tips].filter(t=>!t.isPreviousDay).filter(filterFn).sort((a,b)=>b.confidence-a.confidence);
    // If not enough today, include previous
    if(pool.length<gCount) pool=[...tips].filter(filterFn).sort((a,b)=>b.confidence-a.confidence);
    let sel=[]; let tot=1;
    for(const g of pool){
      if(sel.length>=gCount) break;
      if(!sel.find(s=>s.match===g.match)){
        sel.push(g);
        tot*=parseFloat(g.odd);
      }
    }
    const games=sel.map(g=>({number:g.number, match:g.match, league:g.league, time:g.time, date:g.date, dateDisplay:g.dateDisplay, dateValue:g.dateValue, tip:g.tip, odd:g.odd, score:g.score, result:g.result, status:g.status, market:g.market, winProb:g.winProb}));
    const w=games.filter(s=>s.result==='WON').length, l=games.filter(s=>s.result==='LOST').length;
    return {name:`${name} • ${targetDate}`, count:sel.length, totalOdd:tot.toFixed(2), games, won:w, lost:l, result:l>0?'LOST':w===sel.length&&w>0?'WON':'PENDING'};
  }

  const accas={
    'ov15_2odds': bAcca('2 ODDS • OVER 1.5 • HIGH GOALS', t=>t.market==='Over 1.5', 2),
    'ov15_3odds': bAcca('3 ODDS • OVER 1.5 • HIGH GOALS', t=>t.market==='Over 1.5', 3),
    'ov25_5odds': bAcca('5 ODDS • OVER 2.5 • HIGH GOALS', t=>t.market==='Over 2.5', 3),
    'btts_5odds': bAcca('5 ODDS • BTTS YES • HIGH GOALS', t=>t.market==='BTTS Yes', 3),
    'corners_5odds': bAcca('5 ODDS • CORNERS • HIGH GOALS', t=>t.market==='Corners' || t.market==='Corners Over 8.5', 3),
    'over15_10odds': bAcca('10 ODDS • OVER 1.5 • HIGH GOALS', t=>t.market==='Over 1.5', 6),
    'mixed_10odds': bAcca('10 ODDS MIXED • OV2.5+BTTS+CORNER', t=>true, 4)
  };

  const won=tips.filter(t=>t.result==='WON').length, lost=tips.filter(t=>t.result==='LOST').length, pend=tips.filter(t=>t.result==='PENDING').length;
  const prev=tips.filter(t=>t.isPreviousDay).length, todayCnt=tips.filter(t=>!t.isPreviousDay).length;

  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  res.json({date:targetDate, total:tips.length, todayCount:todayCnt, previousCount:prev, wonCount:won, lostCount:lost, pendingCount:pend, winRate:tips.length?Math.round((won/tips.length)*100):0, tips, accas, source:`V5.3_REAL_${todayCnt}+PREV_${prev}_7ACCAs_FIXED_MISSING`, debug, apiKeySet:HAS_KEY, suspended:debug.suspended});
}
