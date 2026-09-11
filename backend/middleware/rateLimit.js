function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  const attempts = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const clientKey = keyGenerator ? keyGenerator(req) : null
    const key = clientKey || req.ip || req.socket.remoteAddress || 'unknown'
    const current = attempts.get(key)

    if (!current || current.expiresAt <= now) {
      attempts.set(key, { count: 1, expiresAt: now + windowMs })
      return next()
    }

    if (current.count >= max) {
      res.set('Retry-After', String(Math.ceil((current.expiresAt - now) / 1000)))
      return res.status(429).json({ ok: false, message })
    }

    current.count += 1
    return next()
  }
}

module.exports = { createRateLimiter }