const OPENAI_URL = 'https://api.openai.com/v1/responses';
const ICONIFY_URLS = ['https://api.iconify.design', 'https://api.simplesvg.com'];
const MODEL = 'gpt-4o-mini';
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers }); }

async function iconifySearch(query) {
  for (const host of ICONIFY_URLS) {
    try {
      const response = await fetch(`${host}/search?query=${encodeURIComponent(query)}&limit=24`);
      if (response.ok) return response.json();
    } catch {
      // Try the next official Iconify endpoint.
    }
  }
  return { icons: [] };
}

function readOutputText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  return (payload.output || []).flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text').map((part) => part.text || '').join('');
}

async function understandQuery(query, apiKey) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      instructions: [
        'You are a semantic search planner for an open-source icon finder.',
        'Understand Traditional Chinese, colloquial descriptions, typos, and short natural-language requests.',
        'Do not merely translate the input word. Infer the visual concept and produce concise English icon-search terms likely to appear in Iconify icon names.',
        'Return JSON only: {"search_queries": string[], "explanation": string}.',
        'Use 1 to 5 distinct queries. Keep queries short, lowercase, and useful for icon names. Do not include punctuation, code, or prose in search_queries.',
        'The explanation must be Traditional Chinese and no longer than 40 Chinese characters.'
      ].join('\n'),
      input: query,
      text: { format: { type: 'json_schema', name: 'icon_search_plan', strict: true, schema: {
        type: 'object', properties: {
          search_queries: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
          explanation: { type: 'string' }
        }, required: ['search_queries', 'explanation'], additionalProperties: false
      } } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const parsed = JSON.parse(readOutputText(await response.json()));
  const queries = Array.isArray(parsed.search_queries)
    ? parsed.search_queries.map((item) => String(item).trim().toLowerCase()).filter(Boolean).slice(0, 5) : [];
  if (!queries.length) throw new Error('No semantic search queries returned');
  return { queries, explanation: String(parsed.explanation || '') };
}

async function semanticSearch(request, env) {
  if (!env.OPENAI_API_KEY) return json({ code: 'missing_key', message: '尚未設定 OPENAI_API_KEY。' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ code: 'invalid_json' }, 400); }
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 200) : '';
  if (!query) return json({ code: 'invalid_query', message: '請輸入搜尋描述。' }, 400);
  try {
    const plan = await understandQuery(query, env.OPENAI_API_KEY);
    const responses = await Promise.all(plan.queries.map(iconifySearch));
    const seen = new Set();
    const icons = responses.flatMap((result) => result.icons || []).filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name); return true;
    }).slice(0, 60);
    return json({ icons, searchQueries: plan.queries, explanation: plan.explanation });
  } catch (error) {
    console.error(error);
    return json({ code: 'semantic_search_failed', message: '語意分析暫時失敗，請稍後再試。' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/semantic-search') {
      if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405);
      return semanticSearch(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
