// fetch-ratings.js
// Runs in GitHub Actions — fetches Bluechip grade for every stablecoin
// and writes data/bluechip-ratings.json
 
const https = require('https');
const fs    = require('fs');
const path  = require('path');
 
// ─── All 50 tickers to query ──────────────────────────────────────────────────
// Matches the coins served by jamie4574.github.io/stablecoin-data
const TICKERS = [
  'USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD', 'USDP', 'GUSD', 'LUSD',
  'USDD', 'XAUT', 'PAXG', 'EURT', 'EURS', 'XSGD', 'FDUSD', 'PYUSD', 'USDE',
  'CRVUSD', 'GHO', 'FRXETH', 'SUSD', 'ALUSD', 'DOLA', 'BEAN', 'USDX', 'CUSD',
  'USDK', 'HUSD', 'ZUSD', 'MUSD', 'OUSD', 'USDN', 'USDJ', 'UST', 'TRIBE',
  'FEI', 'RAI', 'FLOAT', 'USDV', 'USDY', 'BOLD', 'EURC', 'USDGLO', 'RLUSD',
  'NZDS', 'CADC', 'EUROC', 'GBPT', 'TRYB'
];
 
const BC_BASE = 'https://backend.bluechip.org/api/1.2/coins';
 
// Simple promisified HTTPS GET
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}
 
// Sleep to avoid hammering the API
const sleep = ms => new Promise(r => setTimeout(r, ms));
 
async function main() {
  const ratings = {};
  let fetched = 0, missing = 0, errors = 0;
 
  for (const ticker of TICKERS) {
    try {
      const { status, body } = await get(`${BC_BASE}/${ticker}/grade`);
 
      if (status === 200) {
        const data = JSON.parse(body);
        ratings[ticker] = {
          name:  data.name   || null,
          symbol: data.symbol || ticker,
          grade: data.grade  || null,
          url:   data.url    || null,
        };
        fetched++;
        console.log(`✓ ${ticker}: ${data.grade}`);
      } else {
        // 400 = coin not rated by Bluechip
        ratings[ticker] = null;
        missing++;
        console.log(`— ${ticker}: not rated (HTTP ${status})`);
      }
    } catch (err) {
      ratings[ticker] = null;
      errors++;
      console.error(`✗ ${ticker}: ${err.message}`);
    }
 
    // Be polite — 200ms between requests
    await sleep(200);
  }
 
  // Write output
  const out = {
    generated_at: new Date().toISOString(),
    fetched,
    missing,
    errors,
    ratings,   // { USDC: { name, symbol, grade, url }, USDT: null, ... }
  };
 
  const outPath = path.join(__dirname, 'data', 'bluechip-ratings.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
 
  console.log(`\nDone — ${fetched} rated, ${missing} unrated, ${errors} errors`);
  console.log(`Written to ${outPath}`);
}
 
main().catch(err => { console.error(err); process.exit(1); });
