# Deployment Readiness

## Vercel Deployment Checklist

1. Set Vercel env vars matching `.env.example`.
2. Redeploy after env changes.
3. Open `/sandbox-test` to confirm `crossOriginIsolated=true`.
4. Open `/arena-live` and run one Safe Mode agent.
5. Confirm portal link or fallback state.

**Do not expose Gemini or Groq keys client-side.**
Only `NEXT_PUBLIC_BROWSERPOD_API_KEY` should be client-exposed.
Ensure `next.config.ts` security headers are not removed or weakened.
