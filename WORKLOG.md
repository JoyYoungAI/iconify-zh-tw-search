# Work Log

## 2026-10-26

### Completed

- 建立正體中文 Iconify 圖示搜尋工具並公開至 GitHub：`JoyYoungAI/iconify-zh-tw-search`。
- 完成自然語句語意搜尋：使用 Groq Chat Completions API 理解正體中文需求，再查詢 Iconify 圖示。
- 完成搜尋優先 UI/UX：緊湊搜尋模式、自然語句建議、`⌘K`／`Ctrl+K`、清除搜尋、右側預覽面板與手機底部抽屜。
- 加入 Groq、Iconify 與 Cloudflare 的連線狀態、HTTP status、剩餘額度資訊與錯誤提示。
- 加入 Cloudflare Worker Rate Limiting：同一來源每 60 秒最多 10 次語意搜尋。
- 加入安全 headers、CSP、來源檢查與 request body 大小限制。
- 加入品牌 favicon。
- 綁定並驗證自訂網域：`https://icons.tonny.tw/`。
- 加入前端、README 與第三方 notices 的服務、授權、責任與 AI 協作揭露。

### Commits and deployments

- GitHub repository 已建立為公開 repository。
- 重要 commits：`d1f2fe7`、`61daa5e`、`675d9aa`、`a5f6ea7`、`76fcf37`。
- Cloudflare Workers Static Assets 已多次部署至 production。

### Verification

- `npm run check` 通過。
- `npm run build` 通過。
- Groq production semantic search 回應 HTTP 200。
- Iconify production search 回應 HTTP 200。
- `icons.tonny.tw` HTTPS、首頁、favicon、安全 headers 與語意搜尋 API 均已驗證。
- Groq 回傳的 rate-limit headers 已確認可傳至前端。

### Remaining

- 若要啟用網域層級的 Bot Fight Mode，需在 Cloudflare Security 控制台確認並開啟。
- 若需要更嚴格的跨地區全域限流，需評估 Durable Objects；目前 Worker Rate Limiting 為近似、區域性限制。
- 可持續收集社團使用者回饋，改善語意搜尋排序與圖示結果品質。
