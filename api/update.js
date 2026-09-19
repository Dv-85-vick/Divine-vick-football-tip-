export default async function handler(req, res) {
  const API_KEY = process.env.API_FOOTBALL_KEY;
  if(!API_KEY) return res.status(500).json({error:"Missing API_FOOTBALL_KEY"});
  try {
    const TOP_LEAGUES = [39,78,88,140,135,144,103,113,203,71];
    let allFixtures = [];
    for (let id of TOP_LEAGUES) {
      try{
        const r = await fetch(`https://v3.football.api-sports.io/fixtures?league=${id}&season=2025&next=10`, {
          headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
        });
        const d = await r.json();
        if(d.response) allFixtures = allFixtures.concat(d.response);
      }catch(e){}
    }
    const unique = [...new Map(allFixtures.map(f => [f.fixture.id, f])).values()].slice(0,35);
    async function getRealStats(teamId){
      try{
        const r = await fetch(`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=4`, {
          headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
        });
        const d = await r.json();
        if(!d.response || d.response.length===0) return null;
        let scored=0, totalGoals=0, over15=0, over25=0, form=[];
        d.response.forEach(m=>{
          const isHome = m.teams.home.id === teamId;
          const gf = isHome? m.goals.home : m.goals.away;
          const ga = isHome? m.goals.away : m.goals.home;
          if(gf===null) return;
          scored+=gf; totalGoals+=(gf+ga);
          if((gf+ga)>=2) over15++; if((gf+ga)>=3) over25++;
          if(gf>ga) form.push("W"); else if(gf===ga) form.push("D"); else form.push("L");
        });
        return { avgScored: (scored/d.response.length).toFixed(1), avgTotal: (totalGoals/d.response.length).toFixed(1), form: form.reverse().join(" "), over15, over25, count: d.response.length };
      }catch(e){ return null; }
    }
    let tips = [];
    for(let f of unique){
      const homeStats = await getRealStats(f.teams.home.id);
      const awayStats = await getRealStats(f.teams.away.id);
      if(!homeStats ||!awayStats) continue;
      let tipObj, reason;
      const combinedAvg = (parseFloat(homeStats.avgTotal) + parseFloat(awayStats.avgTotal))/2;
      if(combinedAvg >= 3.0 || (homeStats.over25>=3 && awayStats.over25>=2)){
        tipObj = { tip: "Over 2.5 Goals", odd: "1.78", market: "over25" };
        reason = `OVER 2.5 BANKER: ${f.teams.home.name} Over 2.5 in ${homeStats.over25}/4 (avg ${homeStats.avgTotal} goals) + ${f.teams.away.name} Over 2.5 in ${awayStats.over25}/4`;
      } else if(homeStats.over15>=3 && awayStats.over15>=3){
        tipObj = { tip: "Over 1.5 Goals", odd: "1.32", market: "over15" };
        reason = `OVER 1.5 SAFE: ${homeStats.over15}/4 & ${awayStats.over15}/4 hit Over 1.5, avg ${homeStats.avgScored} & ${awayStats.avgScored}`;
      } else if(parseFloat(homeStats.avgScored) >= 1.5){
        tipObj = { tip: "Home Over 1.5", odd: "2.10", market: "team15" };
        reason = `HOME OVER 1.5: ${f.teams.home.name} scored 2+ in ${homeStats.over25}/4 last (avg ${homeStats.avgScored}, form ${homeStats.form})`;
      } else if(parseFloat(awayStats.avgScored) >= 1.2){
        tipObj = { tip: "Away Over 1.5", odd: "2.40", market: "team15" };
        reason = `AWAY OVER 1.5: ${f.teams.away.name} scored ${awayStats.avgScored} avg in last 4 (form ${awayStats.form})`;
      } else {
        tipObj = { tip: "Over 1.5 Goals", odd: "1.32", market: "over15" };
        reason = `OVER 1.5: ${f.teams.home.name} ${homeStats.form} avg ${homeStats.avgTotal}, ${f.teams.away.name} ${awayStats.form}`;
      }
      const d = new Date(f.fixture.date);
      const hg = f.goals.home?? null; const ag = f.goals.away?? null;
      const isFT = f.fixture.status.short === "FT";
      let result="PENDING";
      if(isFT && hg!==null){
        const total = hg+ag;
        if(tipObj.tip.includes("Over 1.5") && total>=2) result="WIN";
        else if(tipObj.tip.includes("Over 2.5") && total>=3) result="WIN";
        else if(tipObj.tip.includes("Home Over") && hg>=2) result="WIN";
        else if(tipObj.tip.includes("Away Over") && ag>=2) result="WIN";
        else result="LOSS";
      }
      tips.push({ id: f.fixture.id, match: `${f.teams.home.name} vs ${f.teams.away.name}`, league: f.league.name, country: f.league.country, date: d.toLocaleDateString(), time: d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), tip: tipObj.tip, odd: tipObj.odd, market: tipObj.market, confidence: 75 + (homeStats.over15+awayStats.over15)*3, reason, status: f.fixture.status.short, score: isFT?`${hg}-${ag}`:"vs", result });
    }
    function buildAcca(filterMarket, target=10){
      let pool = tips.filter(t=>filterMarket.includes(t.market)).sort((a,b)=>b.confidence-a.confidence);
      let acc=[], total=1;
      for(let t of pool){ if(total>=target) break; acc.push(t); total*=parseFloat(t.odd); }
      return { games: acc, totalOdd: total.toFixed(2), count: acc.length };
    }
    const accas = { over15: buildAcca(["over15","mix"],10), over25: buildAcca(["over25","mix"],10), mix: buildAcca(["mix","over15","over25","team15"],10), team15: buildAcca(["team15","over15"],10), corners: buildAcca(["corners","over15"],10) };
    res.setHeader('Cache-Control', 's-maxage=43200');
    return res.status(200).json({ date: new Date().toISOString().split('T')[0], tips, accas });
  }catch(e){ return res.status(500).json({ error: e.message }); }
}
