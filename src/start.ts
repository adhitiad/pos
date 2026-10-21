import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

import { cspMiddleware } from '#/lib/csp'
import { galatMiddleware } from '#/server/galatMiddleware'
import { logMiddleware } from '#/server/logMiddleware'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [logMiddleware, csrfMiddleware, cspMiddleware],
  functionMiddleware: [galatMiddleware],
}))
