// Shared server-side bot detection for the first-party analytics + feedback
// endpoints. The User-Agent is a request header used only for this check — it is
// never stored, so this stays PII-free. Real browsers always send a UA; an
// empty/missing UA on a beacon is almost always automated, so we drop it too.

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|adsbot|bingpreview|facebookexternalhit|facebot|embedly|quora|pinterest|redditbot|vkshare|whatsapp|telegram|discord|slack|twitter|linkedin|skype|google|yandex|baidu|duckduck|petalbot|applebot|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|monitor|prerender|scrapy|curl|wget|python-requests|python-urllib|httpclient|axios|go-http|node-fetch|okhttp|java\/|libwww|dataprovider|semrush|ahrefs|mj12bot|dotbot/i;

export function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}
