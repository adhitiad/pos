import { createFileRoute, redirect } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [{ title: `${m.nav_login()} · ${m.app_title()}` }],
  }),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (user?.role === 'OWNER' || user?.role === 'KASIR')
      throw redirect({ to: '/dashboard' })
    if (user) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
  const masuk = () => {
    void authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  }
  const { isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-5/6 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-11 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-1/2" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">{m.login_title()}</h1>
          <p className="text-sm text-neutral-500">{m.login_subtitle()}</p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={masuk}
            className="h-11 w-full"
            aria-label={m.login_google()}
          >
            {m.login_google()}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
