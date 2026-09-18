export default function handler(req, res) {
  const teams = [
    ["Man City","Arsenal"],["Barcelona","Real Madrid"],["Bayern Munich","Dortmund"],
    ["PSG","Marseille"],["Liverpool","Chelsea"],["Juventus","AC Milan"],
    ["Inter Milan","Napoli"],["Atletico Madrid","Sevilla"],["Man United","Tottenham"],
    ["Arsenal","Liverpool"],["Real Madrid","Villarreal"],["Ajax","PSV"],
    ["Benfica","Porto"],["Celtic","Rangers"],["Galatasaray","Fenerbahce"],
    ["Club Brugge","Anderlecht"],["RB Leipzig","Bayer Leverkusen"],["Roma","Lazio"],
    ["Athletic Bilbao","Real Sociedad"],["Newcastle","Aston Villa"],["Brighton","West Ham"],
    ["Leicester","Everton"],["Valencia","Villarreal"],["Monaco","Lyon"],
    ["Milan","Atalanta"],["Bologna","Fiorentina"],["Sporting CP","Braga"],
    ["Feyenoord","AZ Alkmaar"],["Lille","Rennes"],["West Ham","Crystal Palace"],
    ["Fulham","Brentford"],["Getafe","Osasuna"],["Real Betis","Valencia"],
    ["Nice","Marseille"],["Frankfurt","Stuttgart"],["Wolfsburg","Hoffenheim"],
    ["Sassuolo","Torino"],["Udinese","Empoli"],["Bournemouth","Wolves"],
    ["Alaves","Celta Vigo"],["Montpellier","Reims"],["Union Berlin","Mainz"],
    ["Trabzonspor","Besiktas"],["PAOK","AEK Athens"],["Sparta Prague","Slavia Prague"],
    ["Dinamo Zagreb","Hajduk Split"],["Red Star","Partizan"],["Young Boys","Basel"],
    ["Copenhagen","Brondby"],["Rangers","Hearts"],["Aberdeen","Hibernian"]
  ];
  const markets = [
    {m:"Over 2.5 Goals", c:"85%"},
    {m:"BTTS Yes", c:"78%"},
    {m:"Home Win", c:"82%"},
    {m:"Over 1.5 Goals", c:"88%"},
    {m:"Double Chance 1X", c:"90%"},
    {m:"Under 3.5 Goals", c:"80%"}
  ];
  const today = new Date().toISOString().slice(0,10);
  const tips = teams.slice(0,50).map((t,i) => {
    const market = markets[i % markets.length];
    return { id: i+1, match: `${t[0]} vs ${t[1]}`, tip: market.m, confidence: market.c, date: today };
  });
  res.status(200).json({ date: today, total: 50, tips });
}
