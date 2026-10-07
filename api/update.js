export default function handler(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  res.status(200).json({
    date,
    total: 0,
    todayCount: 0,
    previousCount: 0,
    wonCount: 0,
    lostCount: 0,
    pendingCount: 0,
    realOddsCount: 0,
    source: 'api/update.js fallback',
    tips: [],
    accas: {}
  });
}
