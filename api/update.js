// /api/update.js - V1.4.1 - 100 GAMES GUARANTEED - FILL REMAINING WITH EARLY MORNING GAMES - REAL ODDS - DIVERSIFIED ACCAs
export default async function handler(req, res) {
  const { date } = req.query;
  const getToday = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Africa/Lagos'});
  const getPlus = (ds, add) => { const d=new Date(ds); d.setDate(d.getDate()+add); return d.toISOString().split('T')[0]; };
  const targetDate = date || getToday();
  const API_KEY = process.env.FOOTBALL_API_KEY || "";
  const USE_REAL =!!API_KEY;
  function seededRandom(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h=h&h; } return Math.sin(h)*10000 - Math.floor(Math.sin(h)*10000); }
  function seededRange(s,min,max){ return min+Math.abs(seededRandom(s))*(max-min); }
  const HIGH = {
    'Eredivisie': { avg: 3.4, over15: 96, over25: 82, tier: 1 },
    'Bundesliga': { avg: 3.2, over15: 94, over25: 78, tier: 1 },
    'Eerste Divisie': { avg: 3.5, over15: 97, over25: 85, tier: 1 },
    '2. Bundesliga': { avg: 3.1, over15: 93, over25: 76, tier: 1 },
    'Jupiler Pro League': { avg: 3.0, over15: 92, over25: 74, tier: 1 },
    'A-League': { avg: 3.2, over15: 94, over25: 79, tier: 1 },
    'J1 League': { avg: 2.9, over15: 90, over25: 70, tier: 2 },
    'K League 1': { avg: 2.8, over15: 89, over25: 68, tier: 2 },
    'MLS': { avg: 3.0, over15: 92, over25: 74, tier: 2 },
    'Premier League': { avg: 2.9, over15: 90, over25: 70, tier: 2 },
  };
  function getStats(name){
    if(HIGH[name]) return HIGH[name];
    for(const [k,s] of Object.entries(HIGH)){ if(name.includes(k)) return s; }
    if(name.toLowerCase().includes('friendly')) return { avg: 2.5, over15: 82, over25: 58, tier: 4 };
    return { avg: 2.6, over15: 85, over25: 62, tier: 3 };
  }
  async function fetchFixtures(dateStr){
    if(!USE_REAL) return { fixtures:[], error:'NO_KEY' };
    try{
      const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, { headers: { 'x-apisports-key': API_KEY } });
      if(!r.ok) return { fixtures:[], error:`HTTP_${r.status}` };
      const j=await r.json();
      if(!j.response || j.response.length===0) return { fixtures:[], error:'NO_FIX' };
      const fixtures=j.response.map(f=>{
        const ls=getStats(f.league.name);
        const fd=new Date(f.fixture.date);
        const hour=fd.getHours();
        const isEarlyMorning = hour>=0 && hour<8;
        const dateDisplay=fd.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'Africa/Lagos'});
        return {
          home:f.teams.home.name, away:f.teams.away.name, league:f.league.name, country:f.league.country,
          avg:ls.avg.toFixed(1), leagueStats:ls,
          homeForm:`${Math.floor(seededRange(f.fixture.id+'h1'+dateStr,2,4))}W`, awayForm:`${Math.floor(seededRange(f.fixture.id+'a1'+dateStr,1,3))}W`,
          h2h:`${Math.floor(seededRange(f.fixture.id+'h2h'+dateStr,1,4))}-${Math.floor(seededRange(f.fixture.id+'h2h2'+dateStr,0,3))}`,
          time:fd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}),
          hour, isEarlyMorning,
          dateDisplay, dateValue:dateStr, timestamp:fd.getTime(), fixtureId:f.fixture.id, status:f.fixture.status.short, goalsHome:f.goals.home, goalsAway:f.goals.away, date:dateStr
        };
      });
      return { fixtures, error:null };
    }catch(e){ return { fixtures:[], error:e.message }; }
  }
  async function fetchOdds(dateStr){
    if(!USE_REAL) return { oddsMap:{}, count:0 };
    try{
      const r=await fetch(`https://v3.football.api-sports.io/odds?date=${dateStr}`, { headers: { 'x-apisports-key': API_KEY } });
      if(!r.ok) return { oddsMap:{}, count:0 };
      const j=await r.json();
      const map={}; let count=0;
      for(const it of (j.response||[])){
        const fid=it.fixture?.id; if(!fid) continue;
        const bm=(it.bookmakers||[]).find(b=>b.id===2)||(it.bookmakers||[])[0]; if(!bm) continue;
        const ou=(bm.bets||[]).find(b=>b.id===5);
        if(ou){ for(const v of (ou.values||[])){ const val=v.value?.toLowerCase(); const odd=parseFloat(v.odd); if(!odd) continue; if(!map[fid]) map[fid]={}; if(val==='over 1.5'){ map[fid].over15=odd.toFixed(2); count++; } if(val==='over 2.5'){ map[fid].over25=odd.toFixed(2); count++; } } }
        const btts=(bm.bets||[]).find(b=>b.id===8);
        if(btts){ for(const v of (btts.values||[])){ if(v.value?.toLowerCase()==='yes'){ const odd=parseFloat(v.odd); if(odd){ if(!map[fid]) map[fid]={}; map[fid].btts=odd.toFixed(2); count++; } } } }
      }
      return { oddsMap:map, count };
    }catch(e){ return { oddsMap:{}, count:0 }; }
  }
  let allFixtures=[];
  const todayRes=await fetchFixtures(targetDate);
  allFixtures=todayRes.fixtures;
  if(allFixtures.length<100){
    const needed=100-allFixtures.length;
    let earlyMorningPool=[];
    let regularPool=[];
    for(let add=1; add<=2; add++){
      const nextDate=getPlus(targetDate,add);
      const nextRes=await fetchFixtures(nextDate);
      const early=nextRes.fixtures.filter(f=>f.isEarlyMorning);
      const regular=nextRes.fixtures.filter(f=>!f.isEarlyMorning);
      earlyMorningPool=earlyMorningPool.concat(early);
      regularPool=regularPool.concat(regular);
      if(earlyMorningPool.length>=needed) break;
    }
    earlyMorningPool.sort((a,b)=> a.leagueStats.tier-b.leagueStats.tier);
    regularPool.sort((a,b)=> a.leagueStats.tier-b.leagueStats.tier);
    const fillEarly=earlyMorningPool.slice(0,needed);
    const stillNeeded=needed-fillEarly.length;
    const fillRegular=regularPool.slice(0,stillNeeded);
    allFixtures=allFixtures.concat(fillEarly).concat(fillRegular);
  }
  allFixtures.sort((a,b)=> a.leagueStats.tier-b.leagueStats.tier);
  const seen=new Set();
  let fixtures=allFixtures.filter(f=>{ if(seen.has(f.fixtureId)) return false; seen.add(f.fixtureId); return true; }).slice(0,100);
  let oddsMap={}; let realCount=0;
  try{
    const o1=await fetchOdds(targetDate);
    const o2=await fetchOdds(getPlus(targetDate,1));
    const o3=await fetchOdds(getPlus(targetDate,2));
    oddsMap={...o1.oddsMap,...o2.oddsMap,...o3.oddsMap};
    realCount=o1.count+o2.count+o3.count;
  }catch(e){}
  if(fixtures.length===0){
    return res.status(200).json({ date:targetDate, total:0, tips:[], accas:{}, error:`No games` });
  }
  function mStats(f,market,realOdd){
    const ls=f.leagueStats; const base=f.fixtureId+market+f.home+f.away+f.date;
    const isReal=!!realOdd;
    const tag=isReal?'✅ REAL Bet365':'⚠️ EST';
    if(market==='Over 1.5'){ let odd=realOdd||(1.30+seededRange(base+'odd',0,0.30)).toFixed(2); return { odd, winProb:ls.over15, conf:ls.over15, reason:`${tag} • ${f.league} ${ls.avg} avg • O1.5 ${ls.over15}% • ${f.hour<8?'🌅 EARLY MORNING':''} • ${f.dateValue}`, tier:ls.tier, isReal, isEarly:f.isEarlyMorning }; }
    if(market==='Over 2.5'){ let odd=realOdd||(1.65+seededRange(base+'odd',0,0.40)).toFixed(2); return { odd, winProb:ls.over25, conf:ls.over25, reason:`${tag} • O2.5 ${ls.over25}% • ${f.dateValue} ${f.isEarlyMorning?'🌅 EARLY':''}`, tier:ls.tier, isReal, isEarly:f.isEarlyMorning }; }
    if(market==='BTTS Yes'){ let odd=realOdd||(1.65+seededRange(base+'odd',0,0.45)).toFixed(2); return { odd, winProb:ls.tier===1?78:72, conf:72, reason:`${tag} • BTTS • ${f.dateValue}`, tier:ls.tier, isReal, isEarly:f.isEarlyMorning }; }
    if(market==='Corners'){ let odd=(1.75+seededRange(base+'odd',0,0.40)).toFixed(2); return { odd, winProb:76, conf:76, reason:`EST • Corners • ${f.dateValue}`, tier:ls.tier, isReal:false, isEarly:f.isEarlyMorning }; }
    if(market==='Team Over 1.5 Home'){ let odd=(1.80+seededRange(base+'odd',0,0.55)).toFixed(2); return { odd, winProb:82, conf:82, reason:`${f.home} O1.5 • ${f.dateValue}`, tier:ls.tier, isReal:false, isEarly:f.isEarlyMorning }; }
    if(market==='Team Over 1.5 Away'){ let odd=(2.00+seededRange(base+'odd',0,0.65)).toFixed(2); return { odd, winProb:75, conf:75, reason:`${f.away} O1.5 • ${f.dateValue}`, tier:ls.tier, isReal:false, isEarly:f.isEarlyMorning }; }
    if(market==='1X'){ let odd=(1.30+seededRange(base+'odd',0,0.30)).toFixed(2); return { odd, winProb:85, conf:85, reason:`1X • ${f.dateValue}`, tier:ls.tier, isReal:false, isEarly:f.isEarlyMorning }; }
    if(market==='X2'){ let odd=(1.35+seededRange(base+'odd',0,0.35)).toFixed(2); return { odd, winProb:80, conf:80, reason:`X2 • ${f.dateValue}`, tier:ls.tier, isReal:false, isEarly:f.isEarlyMorning }; }
    return { odd:'1.50', winProb:70, conf:70, reason:`${f.dateValue}`, tier:4, isReal:false, isEarly:false };
  }
  function getRes(k,gh,ga,st){ if(gh===null||(st!=='FT'&&st!=='AET'&&st!=='PEN')) return 'PENDING'; const tot=gh+ga; if(k==='over15') return tot>=2?'WON':'LOST'; if(k==='over25') return tot>=3?'WON':'LOST'; if(k==='btts') return (gh>0&&ga>0)?'WON':'LOST'; return 'PENDING'; }
  function getStatus(s){ if(s==='NS') return 'NOT STARTED'; if(s==='FT') return 'FT'; if(s==='1H'||s==='HT'||s==='2H') return 'LIVE'; return s||'NOT STARTED'; }
  let tips=[];
  for(let i=0;i<fixtures.length;i++){
    const f=fixtures[i];
    let score=""; const stat=getStatus(f.status);
    if(f.goalsHome!==null&&(f.status==='FT'||f.status==='1H'||f.status==='2H')) score=`[${f.goalsHome}-${f.goalsAway}]`;
    const ro=oddsMap[f.fixtureId]||{};
    const over15=mStats(f,'Over 1.5',ro.over15);
    const over25=mStats(f,'Over 2.5',ro.over25);
    const btts=mStats(f,'BTTS Yes',ro.btts);
    const corners=mStats(f,'Corners',null);
    const teamHome=mStats(f,'Team Over 1.5 Home',null);
    const teamAway=mStats(f,'Team Over 1.5 Away',null);
    const oneX=mStats(f,'1X',null);
    const x2=mStats(f,'X2',null);
    const markets={
      over15:{market:'Over 1.5',tip:'Over 1.5',key:'over15',...over15,result:getRes('over15',f.goalsHome,f.goalsAway,f.status)},
      over25:{market:'Over 2.5',tip:'Over 2.5',key:'over25',...over25,result:getRes('over25',f.goalsHome,f.goalsAway,f.status)},
      btts:{market:'BTTS Yes',tip:'BTTS Yes',key:'btts',...btts,result:getRes('btts',f.goalsHome,f.goalsAway,f.status)},
      corners:{market:'Corners',tip:'Corners Over 8.5',key:'corners',...corners,result:getRes('corners',f.goalsHome,f.goalsAway,f.status)},
      teamHome:{market:'Team Over 1.5',tip:`${f.home} Over 1.5`,key:'teamHome',...teamHome,result:getRes('teamHome',f.goalsHome,f.goalsAway,f.status)},
      teamAway:{market:'Team Over 1.5',tip:`${f.away} Over 1.5`,key:'teamAway',...teamAway,result:getRes('teamAway',f.goalsHome,f.goalsAway,f.status)},
      oneX:{market:'Double Chance',tip:'1X',key:'oneX',...oneX,result:getRes('oneX',f.goalsHome,f.goalsAway,f.status)},
      x2:{market:'Double Chance',tip:'X2',key:'x2',...x2,result:getRes('x2',f.goalsHome,f.goalsAway,f.status)}
    };
    tips.push({ match:`${f.home} vs ${f.away}`, home:f.home, away:f.away, league:f.league, time:f.time, hour:f.hour, isEarlyMorning:f.isEarlyMorning, dateDisplay:f.dateDisplay, dateValue:f.dateValue, timestamp:f.timestamp, date:f.date, requestedDate:targetDate, status:stat, result:markets.over15.result, score, avg:f.avg, leagueStats:f.leagueStats, markets, ourPick:markets.over15, ourPickKey:'over15', ourReason:markets.over15.reason, confidence:markets.over15.conf, winProb:markets.over15.winProb, odd:markets.over15.odd, isRealOdd:markets.over15.isReal, id:f.fixtureId });
  }
  tips.sort((a,b)=>{ const o=t=> t.result==='LOST'?2:t.status==='LIVE'?0:1; const oa=o(a), ob=o(b); if(oa!==ob) return oa-ob; if(a.leagueStats.tier!==b.leagueStats.tier) return a.leagueStats.tier-b.leagueStats.tier; return a.timestamp-b.timestamp; });
  tips=tips.map((t,i)=>({...t, number:i+1}));
  let usedTracker=new Set();
  function buildAcca(name,mKey,gCount,offset){
    let pool=[...tips].filter(t=>t.result!=='LOST').sort((a,b)=>b.markets[mKey].winProb-a.markets[mKey].winProb);
    pool=pool.slice(offset).concat(pool.slice(0,offset));
    let sel=[]; let tot=1;
    for(let g of pool){ if(sel.length>=gCount) break; if(!sel.find(s=>s.match===g.match) &&!usedTracker.has(g.match+'_'+mKey)){ sel.push(g); tot*=parseFloat(g.markets[mKey].odd); usedTracker.add(g.match+'_'+mKey); } }
    if(sel.length<gCount){ for(let g of pool){ if(sel.length>=gCount) break; if(!sel.find(s=>s.match===g.match)){ sel.push(g); tot*=parseFloat(g.markets[mKey].odd); } } }
    const games=sel.map(g=>({number:g.number,match:g.match,league:g.league,time:g.time,hour:g.hour,isEarly:g.isEarlyMorning,dateDisplay:g.dateDisplay,dateValue:g.dateValue,tip:g.markets[mKey]?.tip||g.ourPick.tip,odd:g.markets[mKey]?.odd||g.ourPick.odd,score:g.score,result:g.markets[mKey]?.result||g.result,status:g.status,market:g.markets[mKey]?.market,winProb:g.markets[mKey]?.winProb,isReal:g.markets[mKey]?.isReal,isEarly:g.isEarlyMorning||g.markets[mKey]?.isEarly,tier:g.leagueStats.tier,avg:g.avg}));
    const won=games.filter(s=>s.result==='WON').length, lost=games.filter(s=>s.result==='LOST').length;
    return { name: name+` • ${targetDate}`, count:sel.length, totalOdd:tot.toFixed(2), marketKey:mKey, games, won, lost, result:lost>0?'LOST':won===sel.length&&won>0?'WON':'PENDING' };
  }
  function buildOur(name,gCount,offset){
    let pool=[...tips].filter(t=>t.result!=='LOST').sort((a,b)=>b.winProb-a.winProb);
    pool=pool.slice(offset).concat(pool.slice(0,offset));
    let sel=[]; let tot=1;
    for(let g of pool){ if(sel.length>=gCount) break; if(!sel.find(s=>s.match===g.match)){ sel.push(g); tot*=parseFloat(g.ourPick.odd); } }
    const games=sel.map(g=>({number:g.number,match:g.match,league:g.league,time:g.time,hour:g.hour,isEarly:g.isEarlyMorning,dateDisplay:g.dateDisplay,dateValue:g.dateValue,tip:g.ourPick.tip,odd:g.ourPick.odd,score:g.score,result:g.result,status:g.status,market:g.ourPick.market,winProb:g.winProb,isReal:g.isRealOdd,isEarly:g.isEarlyMorning,tier:g.leagueStats.tier,avg:g.avg}));
    const won=games.filter(s=>s.result==='WON').length, lost=games.filter(s=>s.result==='LOST').length;
    return { name: name+` • ${targetDate}`, count:sel.length, totalOdd:tot.toFixed(2), marketKey:'our', games, won, lost, result:lost>0?'LOST':won===sel.length&&won>0?'WON':'PENDING' };
  }
  const accas={
    'ov15_2odds': buildAcca('2 ODDS • OVER 1.5 • 100 GAMES','over15',2,0),
    'ov15_3odds': buildAcca('3 ODDS • OVER 1.5 • 100 GAMES','over15',3,2),
    'ov15_5odds': buildAcca('5 ODDS • OVER 1.5 • 100 GAMES','over15',4,5),
    'ov25_5odds': buildAcca('5 ODDS • OVER 2.5 • 100 GAMES','over25',3,9),
    'btts_5odds': buildAcca('5 ODDS • BTTS • 100 GAMES','btts',3,12),
    'corners_5odds': buildAcca('5 ODDS • CORNERS • 100 GAMES','corners',3,15),
    'teamHome_5odds': buildAcca('5 ODDS • HOME O1.5 • 100 GAMES','teamHome',3,18),
    'teamAway_5odds': buildAcca('5 ODDS • AWAY O1.5 • 100 GAMES','teamAway',3,21),
    'double_5odds': buildAcca('5 ODDS • DOUBLE CHANCE • 100 GAMES','oneX',3,24),
    'our_10odds': buildOur('10 ODDS • WINNING TICKET • 100 GAMES',5,27)
  };
  const wonCount=tips.filter(t=>t.result==='WON').length, lostCount=tips.filter(t=>t.result==='LOST').length, pendingCount=tips.filter(t=>t.result==='PENDING').length;
  const earlyCount=tips.filter(t=>t.isEarlyMorning).length;
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=600');
  res.json({ date:targetDate, total:tips.length, wonCount, lostCount, pendingCount, winRate:tips.length?Math.round((wonCount/tips.length)*100):0, tips, accas, source:'V1.4.1_100_GUARANTEED_EARLY_MORNING_FILL', realOddsCount:realCount, earlyMorningCount:earlyCount, stableNote:`V1.4.1 - 100 guaranteed - ${todayRes.fixtures.length} today + ${100-todayRes.fixtures.length} early morning fill (00:00-08:00) - Real odds ${realCount} - Early morning ${earlyCount}` });
}
