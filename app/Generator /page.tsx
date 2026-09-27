"use client"
import React, { useState, useMemo } from 'react';
import { Copy, Trash2, Plus, Share2, ExternalLink, FileText, Info, Hash } from 'lucide-react';

interface Game {
  id: string;
  home: string;
  away: string;
  league: string;
  tip: string;
  odd: number;
}
interface Ticket {
  id: string;
  category: string;
  date: string;
  games: Game[];
  totalOdds: number;
  bookingCode: string;
  bookmaker: 'SportyBet' | 'Bet365';
  status: 'Ready' | 'Winning' | 'Live';
  createdAt: string;
}

const LEAGUES = ["【entity-Premier League¦canonical_name=Premier League】","La Liga","【entity-Serie A¦canonical_name=Serie A】","【entity-Bundesliga¦canonical_name=Bundesliga】","Ligue 1","Super League Greece 2","Greek Cup","Championship"];
const TIPS = ["Over 1.5","Over 2.5","BTTS Yes","1X","X2","Home Win","Away Win","Under 2.5","Over 1.5 Goals"];
const CATEGORIES = ["10 ACCA - OVER 1.5","84 GAMES WINNING TICKET","TOMORROW - BET AHEAD","V11 WINNING TICKET 100 GAMES","5 ODDS BANKER"];

function generateCode(bookmaker: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  const short = () => { let r=""; for(let i=0;i<6;i++) r+=chars[Math.floor(Math.random()*chars.length)]; return r; };
  const four = () => { let r=""; for(let i=0;i<4;i++) r+=chars[Math.floor(Math.random()*chars.length)]; return r; };
  if (bookmaker === "SportyBet") return short();
  return `BET365-GP247-${four()}`;
}
function calcTotalOdds(games: Game[]) {
  if (!games.length) return 0;
  return games.reduce((acc, g) => acc * g.odd, 1);
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 't1',
      category: '10 ACCA - OVER 1.5',
      date: '2026-09-28',
      games: [
        { id: 'g1', home: 'Kallithea', away: 'Asteras Tripolis II', league: 'Super League Greece 2', tip: 'Over 1.5', odd: 1.32 },
        { id: 'g2', home: 'Markos', away: 'Panthrakikos', league: 'Greek Cup', tip: 'Over 1.5', odd: 1.35 },
      ],
      totalOdds: 1.78,
      bookingCode: '8K3M9P',
      bookmaker: 'SportyBet',
      status: 'Winning',
      createdAt: 'Today'
    }
  ]);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [league, setLeague] = useState(LEAGUES[0]);
  const [tip, setTip] = useState(TIPS[0]);
  const [odd, setOdd] = useState('1.35');
  const [builderGames, setBuilderGames] = useState<Game[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [bookmaker, setBookmaker] = useState<'SportyBet' | 'Bet365'>('SportyBet');
  const [toast, setToast] = useState<string | null>(null);

  const builderTotal = useMemo(() => calcTotalOdds(builderGames), [builderGames]);
  const showToast = (m:string) => { setToast(m); setTimeout(()=>setToast(null),2500) }

  const addGame = () => {
    if (!homeTeam ||!awayTeam) return showToast('Enter both teams');
    const o = parseFloat(odd);
    if (isNaN(o)) return showToast('Invalid odd');
    setBuilderGames([...builderGames, { id: Date.now().toString(), home: homeTeam, away: awayTeam, league, tip, odd: o }]);
    setHomeTeam(''); setAwayTeam('');
    showToast('Game added');
  };

  const generateTicket = () => {
    if (!builderGames.length) return showToast('Add at least 1 game');
    const newTicket: Ticket = {
      id: Date.now().toString(),
      category, date: new Date().toISOString().slice(0,10),
      games: builderGames, totalOdds: builderTotal,
      bookingCode: generateCode(bookmaker), bookmaker,
      status: 'Ready', createdAt: 'Just now'
    };
    setTickets([newTicket,...tickets]);
    setBuilderGames([]);
    showToast(`Code ${newTicket.bookingCode} generated!`);
  };

  const copyCode = (code:string) => { navigator.clipboard.writeText(code); showToast(`Copied ${code}`); }
  const sportyUrl = (code:string) => `https://www.sportybet.com/ng/m/betslip/share?code=${code}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-3">
      <div className="max-w-[1320px] mx-auto">
        <h1 className="text-[18px] font-bold mb-4">GoalPredict247 • SportyBet + Bet365 Generator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* ADMIN */}
          <div className="bg-[#141414] border border-[#222] rounded-[16px] p-4 h-fit">
            <h2 className="font-bold mb-3">Create Ticket</h2>
            <div className="flex gap-2 mb-3">
              {(['SportyBet','Bet365'] as const).map(b=>(
                <button key={b} onClick={()=>setBookmaker(b)} className={`flex-1 h-9 rounded-[8px] text-[12px] font-bold ${bookmaker===b?'bg-[#00c853] text-black':'bg-[#1e1e1e] text-[#888]'}`}>{b}</button>
              ))}
            </div>
            <input value={homeTeam} onChange={e=>setHomeTeam(e.target.value)} placeholder="Home Team" className="w-full h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-3 mb-2 text-[13px]" />
            <input value={awayTeam} onChange={e=>setAwayTeam(e.target.value)} placeholder="Away Team" className="w-full h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-3 mb-2 text-[13px]" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={league} onChange={e=>setLeague(e.target.value)} className="h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-2 text-[12px]">{LEAGUES.map(l=><option key={l}>{l}</option>)}</select>
              <select value={tip} onChange={e=>setTip(e.target.value)} className="h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-2 text-[12px]">{TIPS.map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <input value={odd} onChange={e=>setOdd(e.target.value)} placeholder="Odd e.g 1.35" className="w-full h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-3 mb-3 text-[13px]" />
            <button onClick={addGame} className="w-full h-10 bg-[#222] border border-[#333] rounded-[10px] font-bold text-[12px] mb-3"><Plus className="inline h-4 w-4 mr-1"/> Add to Ticket</button>

            {builderGames.length>0 && (
              <div className="mb-3">
                {builderGames.map(g=>(
                  <div key={g.id} className="flex justify-between text-[11px] py-1 border-b border-[#1e1e1e]"><span>{g.home} vs {g.away} - {g.tip} @{g.odd}</span><button onClick={()=>setBuilderGames(builderGames.filter(x=>x.id!==g.id))}><Trash2 className="h-3 w-3"/></button></div>
                ))}
                <div className="text-[12px] font-bold mt-2 text-[#00c853]">Total: {builderTotal.toFixed(2)}</div>
              </div>
            )}
            <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full h-9 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] px-2 text-[12px] mb-3">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            <button onClick={generateTicket} className="w-full h-11 bg-[#00c853] text-black rounded-[10px] font-bold text-[13px]">Generate {bookmaker} Booking Code</button>
          </div>

          {/* PUBLIC */}
          <div>
            {tickets.map(ticket=>(
              <div key={ticket.id} className="bg-[#141414] border border-[#1e1e1e] rounded-[16px] mb-3 overflow-hidden">
                <div className="p-3 flex justify-between items-center bg-[#101010] border-b border-[#1e1e1e]">
                  <div><div className="text-[11px] text-[#888]">{ticket.category}</div><div className="text-[13px] font-bold">Code: {ticket.bookingCode} • {ticket.bookmaker} • {ticket.totalOdds.toFixed(2)} odds</div></div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${ticket.bookmaker==='SportyBet'?'bg-[#00c853] text-black':'bg-white text-black'}`}>{ticket.bookmaker}</span>
                </div>
                <div className="p-3">
                  {ticket.games.map((g,i)=><div key={g.id} className="text-[12px] py-1 flex justify-between"><span>{i+1}. {g.home} vs {g.away} - {g.tip}</span><span className="text-[#00c853] font-bold">@{g.odd}</span></div>)}
                </div>
                <div className="p-3 flex gap-2 bg-[#0f0f0f] border-t border-[#1e1e1e]">
                  {ticket.bookmaker==='SportyBet'? (
                    <>
                      <a href={sportyUrl(ticket.bookingCode)} target="_blank" className="flex-1 h-10 bg-[#00c853] text-black rounded-[10px] flex items-center justify-center gap-1 text-[12px] font-bold"><ExternalLink className="h-4 w-4"/> Open in SportyBet</a>
                      <button onClick={()=>copyCode(ticket.bookingCode)} className="h-10 px-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] text-[12px] font-bold"><Copy className="h-4 w-4 inline mr-1"/> COPY</button>
                    </>
                  ) : (
                    <>
                      <button onClick={()=>{ navigator.clipboard.writeText(ticket.games.map(g=>`${g.home} vs ${g.away} - ${g.tip} @ ${g.odd}`).join('\n')); showToast('Copied for Bet365'); }} className="flex-1 h-10 bg-white text-black rounded-[10px] text-[12px] font-bold"><FileText className="h-4 w-4 inline mr-1"/> Copy for Bet365</button>
                      <button onClick={()=>copyCode(ticket.bookingCode)} className="h-10 px-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] text-[12px] font-bold">COPY CODE</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-full text-[12px]">{toast}</div>}
    </div>
  );
}
