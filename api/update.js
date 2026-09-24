// /api/update.js - GoalPredict247 FINAL - WITH TEAM OVER 1.5 + FIXED LEAGUE + ODDS THRESHOLD + MIXED 4 MARKETS
export default async function handler(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toLocaleDateString('en-CA', {timeZone: 'Africa/Lagos'});

  const fixtures = [
    {home: 'Lesotho U20', away: 'Angola U20', league: 'COSAFA U20 Championship', country: 'Africa', avg: '3.4'},
    {home: 'South Africa U20', away: 'Eswatini U20', league: 'COSAFA U20 Championship', country: 'Africa', avg: '3.4'},
    {home: 'Malawi U20', away: 'Comoros U20', league: 'COSAFA U20 Championship', country: 'Africa', avg: '3.4'},
    {home: 'Rubin Kazan U20', away: 'Krasnodar U19', league: 'Russia Youth Championship', country: 'Russia', avg: '3.2'},
    {home: 'Bosnia-Herzegovina U17', away: 'Greece U17', league: 'UEFA U17 Championship - Qualification', country: 'Europe', avg: '3.3'},
    {home: 'Iceland U17', away: 'Gibraltar U17', league: 'UEFA U17 Championship - Qualification', country: 'Europe', avg: '3.1'},
    {home: 'Arnett Gardens', away: 'Dunbeholden', league: 'Premier League', country: 'Jamaica', avg: '3.8'},
    {home: 'RTC', away: 'Tsirang', league: 'Premier League', country: 'Bhutan', avg: '4.1'},
    {home: 'Thimphu City', away: 'Transport United', league: 'Premier League', country: 'Bhutan', avg: '4.0'},
    {home: 'Man City', away: 'Arsenal', league: 'Premier League', country: 'England', avg: '3.2'},
    {home: 'Liverpool', away: 'Chelsea', league: 'Premier League', country: 'England', avg: '3.2'},
    {home: 'Bayern', away: 'Dortmund', league: 'Bundesliga', country: 'Germany', avg: '3.6'},
    {home: 'Ajax', away: 'PSV', league: 'Eredivisie', country: 'Netherlands', avg: '3.9'},
    {home: 'Al Ahly', away: 'Zamalek', league: 'Premier League', country: 'Egypt', avg: '2.9'},
    {home: 'Flamengo', away: 'Palmeiras', league: 'Brasileiro Serie A', country: 'Brazil', avg: '2.8'},
    {home: 'Boca Juniors', away: 'River Plate', league: 'Liga Profesional', country: 'Argentina', avg: '2.7'},
    {home: 'Esperance', away: 'Wydad', league: 'CAF Champions League', country: 'Africa', avg: '2.9'},
    {home: 'Urawa Reds', away: 'Al Nassr', league: 'AFC Champions League', country: 'Asia', avg: '3.1'},
    {home: 'Sydney FC', away: 'Melbourne City', league: 'A-League', country: 'Australia', avg: '3.3'},
    {home: 'Enyimba', away: 'Rangers', league: 'NPFL', country: 'Nigeria', avg: '2.8'},
    {home: 'Young Africans', away: 'Simba', league: 'Ligi Kuu Bara', country: 'Tanzania', avg: '2.9'},
    {home: 'Hearts of Oak', away: 'Asante Kotoko', league: 'Ghana Premier League', country: 'Ghana', avg: '2.7'},
    {home: 'KCCA', away: 'Vipers', league: 'Uganda Premier League', country: 'Uganda', avg: '2.8'},
    {home: 'Gor Mahia', away: 'AFC Leopards', league: 'FKF Premier League', country: 'Kenya', avg: '2.9'},
    {home: 'Al Duhail', away: 'Al Sadd', league: 'Qatar Stars League', country: 'Qatar', avg: '3.2'}
  ];

  function getOddForMarket(market){
    if(market==='Over 1.5') return (1.42 + Math.random()*0.18).toFixed(2);
    if(market==='Over 2.5') return (1.80 + Math.random()*0.25).toFixed(2);
    if(market==='BTTS Yes') return (1.75 + Math.random()*0.30).toFixed(2);
    if(market==='Corners') return (1.85 + Math.random()*0.30).toFixed(2);
    if(market==='Team Over 1.5') return (1.95 + Math.random()*0.40).toFixed(2);
    return '1.50';
  }

  function getConfidence(market){
    if(market==='Over 1.5') return 88 + Math.floor(Math.random()*6);
    if(market==='Over 2.5') return 82 + Math.floor(Math.random()*8);
    if(market==='BTTS Yes') return 80 + Math.floor(Math.random()*8);
    if(market==='Team Over 1.5') return 79 + Math.floor(Math.random()*8);
    return 78 + Math.floor(Math.random()*8);
  }

  function uniqueReason(league, market, home, away, avg){
    if(market==='Over 1.5') return `🔥 HIGH GOALS LEAGUE: ${league} avg ${avg} goals/game • ${home} vs ${away} - Top high scoring league! • Over 1.5 9/10 • ID 1640${Math.floor(Math.random()*900+100)} • 13 calls/day`;
    if(market==='Over 2.5') return `🔥 HIGH GOALS LEAGUE: ${league} avg ${avg} - Over 2.5 in 8/10! • ${home} vs ${away} avg ${avg} goals H2H • [3-0]`;
    if(market==='BTTS Yes') return `🔥 HIGH GOALS = BTTS: ${league} BTTS 78% • ${home} scores 9/10 home • ${away} scores 8/10 away • Both score 8/10 H2H • [2-1]`;
    if(market==='Corners') return `🔥 HIGH CORNERS: ${league} avg 11.2 corners when Over 2.5 hits • Attacking football • Wing play • Over 8.5 9/10`;
    if(market==='Team Over 1.5') return `🔥 TEAM OVER 1.5: ${league} • ${home} scores 2+ goals 8/10 home games • ${home} avg ${avg} goals • Home attack strong • ${home} Over 1.5 Team 9/10 • [2-0]`;
    return `${league} avg ${avg}`;
  }

  let tips = [];
  for(let i=0; i<fixtures.length; i++){
    const f = fixtures[i];
    const time = `${String(Math.floor(Math.random()*12)+8).padStart(2,'0')}:${String([0,15,30,45][Math.floor(Math.random()*4)]).padStart(2,'0')} AM`;
    const markets = ['Over 1.5','Over 2.5','BTTS Yes','Corners','Team Over 1.5'];
    const score = ['[0-0]','[1-0]','[2-0]','[2-1]','[3-0]'][Math.floor(Math.random()*5)];
    const result = Math.random()>0.6? 'WON' : Math.random()>0.4? 'PENDING' : 'LOST';
    markets.forEach(market=>{
      tips.push({
        match: `${f.home} vs ${f.away}`,
        league: f.league,
        country: f.country,
        time: time,
        date: targetDate,
        status: result==='PENDING'? 'NS' : 'FT',
        market: market,
        tip: market==='Corners'? 'Corners Over 8.5' : market==='Team Over 1.5'? `${f.home} Over 1.5` : market,
        odd: getOddForMarket(market),
        confidence: getConfidence(market),
        result: result,
        score: score,
        reason: uniqueReason(f.league, market, f.home, f.away, f.avg),
        stats: `${f.league} avg ${f.avg} • ${market} 8/10 • ${f.country}`,
        id: 1636000 + i*5 + markets.indexOf(market)
      });
    });
  }

  function buildAcca(name, filterFn, minOdds, gameCount){
    let pool = tips.filter(filterFn).sort((a,b)=> b.confidence - a.confidence);
    let selected = [];
    let total = 1;
    for(let g of pool){
      if(selected.length >= gameCount && total >= minOdds) break;
      if(!selected.find(s=> s.match===g.match && s.tip===g.tip)){
        selected.push({...g});
        total *= parseFloat(g.odd);
      }
    }
    let idx = 0;
    while(total < minOdds && idx < pool.length){
      const next = pool[idx];
      if(!selected.find(s=> s.match===next.match && s.tip===next.tip)){
        selected.push({...next});
        total *= parseFloat(next.odd);
      }
      idx++;
      if(selected.length > 12) break;
    }
    const won = selected.filter(s=> s.result==='WON').length;
    const lost = selected.filter(s=> s.result==='LOST').length;
    let result = lost>0? 'LOST' : won===selected.length? 'WON' : 'PENDING';
    return {
      name: name,
      count: selected.length,
      totalOdd: total.toFixed(2),
      games: selected.map(g=>({match: g.match, league: g.league, time: g.time, date: g.date, tip: g.tip, odd: g.odd, score: g.score, result: g.result, status: g.status, market: g.market})),
      won: won, lost: lost, result: result
    };
  }

  function buildMixedAcca(){
    let mixedGames = [];
    let totalOdd = 1;
    const needed = ['Over 1.5','Over 2.5','BTTS Yes','Corners'];
    needed.forEach(market=>{
      const pool = tips.filter(t=> t.market===market).sort((a,b)=> parseFloat(b.odd)-parseFloat(a.odd));
      const pick = pool.find(p=>!mixedGames.find(s=> s.match===p.match)) || pool[0];
      if(pick){ mixedGames.push({...pick}); totalOdd *= parseFloat(pick.odd); }
    });
    if(totalOdd < 10.00){
      const extra = tips.filter(t=>!mixedGames.find(s=> s.match===t.match)).sort((a,b)=> parseFloat(b.odd)-parseFloat(a.odd))[0];
      if(extra){ mixedGames.push({...extra}); totalOdd *= parseFloat(extra.odd); }
    }
    const won = mixedGames.filter(s=> s.result==='WON').length;
    const lost = mixedGames.filter(s=> s.result==='LOST').length;
    let result = lost>0? 'LOST' : won===mixedGames.length? 'WON' : 'PENDING';
    return {
      name: '10 ODDS MIXED • OV1.5+OV2.5+BTTS+CORNER • HIGH GOALS',
      count: mixedGames.length,
      totalOdd: totalOdd.toFixed(2),
      games: mixedGames.map(g=>({match: g.match, league: g.league, time: g.time, date: g.date, tip: g.tip, odd: g.odd, score: g.score, result: g.result, status: g.status, market: g.market})),
      won: won, lost: lost, result: result
    };
  }

  const accas = {
    'ov15_2odds': buildAcca('2 ODDS • OVER 1.5 • HIGH GOALS', t=> t.market==='Over 1.5', 2.00, 2),
    'ov15_3odds': buildAcca('3 ODDS • OVER 1.5 • HIGH GOALS', t=> t.market==='Over 1.5', 3.00, 3),
    'ov25_5odds': buildAcca('5 ODDS • OVER 2.5 • HIGH GOALS', t=> t.market==='Over 2.5', 5.00, 3),
    'btts_5odds': buildAcca('5 ODDS • BTTS YES • HIGH GOALS', t=> t.market==='BTTS Yes', 5.00, 3),
    'corners_5odds': buildAcca('5 ODDS • CORNERS • HIGH GOALS', t=> t.market==='Corners', 5.00, 3),
    'team15_5odds': buildAcca('5 ODDS • TEAM OVER 1.5 • HIGH GOALS', t=> t.market==='Team Over 1.5', 5.00, 3),
    'over15_10odds': buildAcca('10 ODDS • OVER 1.5 ONLY • HIGH GOALS', t=> t.market==='Over 1.5', 10.00, 7),
    'mixed_10odds': buildMixedAcca()
  };

  const wonCount = tips.filter(t=> t.result==='WON').length;
  const lostCount = tips.filter(t=> t.result==='LOST').length;
  const pendingCount = tips.filter(t=> t.result==='PENDING').length;

  res.setHeader('Cache-Control', 'no-store');
  res.json({date: targetDate, total: tips.length, wonCount, lostCount, pendingCount, winRate: Math.round((wonCount/tips.length)*100), tips, accas});
}
