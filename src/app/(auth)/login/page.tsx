'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setLoginError('Invalid email or password')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setLoginError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.jsdelivr.net/gh/devalok-design/devalok-brand-assets@main/Logo/PNG/COLOR/COLOR%20-%20Monogram%20%2B%20Wordmark-01.png"
            alt="Devalok"
            width={180}
            height={54}
            className="mx-auto"
          />
          <div className="space-y-1">
            <div className="w-px h-6 bg-border mx-auto" />
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
              <span className="text-primary">Payroll</span> Management System
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {(error || loginError) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error === 'CredentialsSignin'
                  ? 'Invalid email or password'
                  : loginError || 'An error occurred'}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@devalok.in"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t pt-6">
          <p className="text-xs text-muted-foreground">
            Devalok Design Private Limited
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
