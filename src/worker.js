const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ICONIFY_URLS = ['https://api.iconify.design', 'https://api.simplesvg.com'];
const MODEL = 'openai/gpt-oss-20b';
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, ...extraHeaders } });
}

async function iconifySearch(query) {
  for (const host of ICONIFY_URLS) {
    try {
      const response = await fetch(`${host}/search?query=${encodeURIComponent(query)}&limit=24`);
      if (response.ok) return { data: await response.json(), status: response.status };
      if (host === ICONIFY_URLS.at(-1)) return { data: { icons: [] }, status: response.status };
    } catch {
      // Try the next official Iconify endpoint.
    }
  }
  return { data: { icons: [] }, status: 503 };
}

function readOutputText(payload) {
  return payload.choices?.[0]?.message?.content || '';
}

async function understandQuery(query, apiKey) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: [
          'You are a semantic search planner for an open-source icon finder.',
          'Understand Traditional Chinese, colloquial descriptions, typos, and short natural-language requests.',
          'Do not merely translate the input word. Infer the visual concept and produce concise English icon-search terms likely to appear in Iconify icon names.',
          'Use 1 to 5 distinct queries. Keep queries short, lowercase, and useful for icon names.',
          'The explanation must be Traditional Chinese and no longer than 40 Chinese characters.'
        ].join('\n') },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_schema', json_schema: {
        name: 'icon_search_plan', strict: true, schema: {
          type: 'object', properties: {
            search_queries: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
            explanation: { type: 'string' }
          }, required: ['search_queries', 'explanation'], additionalProperties: false
        }
      } }
    })
  });
  const rateLimit = {
    remainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
    remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
    resetRequests: response.headers.get('x-ratelimit-reset-requests'),
    resetTokens: response.headers.get('x-ratelimit-reset-tokens')
  };
  if (!response.ok) {
    const error = new Error(`Groq request failed: ${response.status}`);
    error.upstreamStatus = response.status;
    error.rateLimit = rateLimit;
    throw error;
  }
  const parsed = JSON.parse(readOutputText(await response.json()));
  const queries = Array.isArray(parsed.search_queries)
    ? parsed.search_queries.map((item) => String(item).trim().toLowerCase()).filter(Boolean).slice(0, 5) : [];
  if (!queries.length) throw new Error('No semantic search queries returned');
  return { queries, explanation: String(parsed.explanation || ''), rateLimit };
}

async function semanticSearch(request, env) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ code: 'forbidden_origin' }, 403);
  const clientKey = request.headers.get('cf-connecting-ip') || 'anonymous';
  const rate = await env.SEARCH_RATE_LIMITER.limit({ key: clientKey });
  if (!rate.success) return json({
    code: 'cloudflare_rate_limited',
    message: '搜尋太頻繁，請稍後再試。',
    provider: { name: 'Cloudflare', status: 'rate_limited', httpStatus: 429, retryAfter: 60 }
  }, 429, { 'retry-after': '60' });
  if (!env.GROQ_API_KEY) return json({
    code: 'missing_key', message: '尚未設定 GROQ_API_KEY。',
    provider: { name: 'Groq', status: 'failed', httpStatus: 503 }
  }, 503);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) return json({ code: 'request_too_large', message: '搜尋描述過長。' }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ code: 'invalid_json' }, 400); }
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 200) : '';
  if (!query) return json({ code: 'invalid_query', message: '請輸入搜尋描述。' }, 400);
  try {
    const plan = await understandQuery(query, env.GROQ_API_KEY);
    const responses = await Promise.all(plan.queries.map(iconifySearch));
    const seen = new Set();
    const icons = responses.flatMap((result) => result.data.icons || []).filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name); return true;
    }).slice(0, 60);
    const iconifyStatus = responses.every((result) => result.status >= 200 && result.status < 300) ? 200 : Math.max(...responses.map((result) => result.status));
    return json({ icons, searchQueries: plan.queries, explanation: plan.explanation,
      provider: { name: 'Groq', status: 'connected', httpStatus: 200, rateLimit: plan.rateLimit },
      iconProvider: { name: 'Iconify', status: iconifyStatus === 200 ? 'connected' : 'degraded', httpStatus: iconifyStatus }
    });
  } catch (error) {
    console.error(error);
    const upstreamStatus = error.upstreamStatus || 502;
    return json({ code: 'semantic_search_failed', message: '語意分析暫時失敗，請稍後再試。',
      provider: { name: 'Groq', status: 'failed', httpStatus: upstreamStatus, rateLimit: error.rateLimit }
    }, upstreamStatus === 429 ? 429 : 502);
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
