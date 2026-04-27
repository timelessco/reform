const BOT_RE =
  /bot|crawl|spider|slurp|scrape|headless|preview|monitor|fetch|curl|wget|python-requests|externalhit|facebookcatalog|embedly|whatsapp|telegram/i;

/** Returns true if the user-agent matches a known bot/crawler/automated-tool pattern. */
export const isBotUserAgent = (ua: string | null | undefined): boolean => {
  if (!ua) {
    return true;
  }
  return BOT_RE.test(ua);
};
