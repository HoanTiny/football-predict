const BASE = "https://www.fotmob.com/api/data";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function inspect(matchId) {
  try {
    const res = await fetch(BASE + `/matchDetails?matchId=${matchId}`, {
      headers: { "User-Agent": UA }
    });
    const j = await res.json();
    console.log("Header Status:", JSON.stringify(j.header?.status, null, 2));
  } catch (err) {
    console.error(err);
  }
}

async function test() {
  await inspect("4043980");
}
test();
