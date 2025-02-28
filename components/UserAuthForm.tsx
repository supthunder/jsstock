"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "next-auth/react"
import { Github, Mail } from "lucide-react"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState<string>("")
  const [password, setPassword] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(provider: string) {
    setIsLoading(true)
    setError(null)

    try {
      if (provider === 'credentials') {
        const result = await signIn('credentials', {
          redirect: true,
          email,
          password,
          callbackUrl: '/',
        })

        if (result?.error) {
          setError("Invalid email or password")
          setIsLoading(false)
        }
      } else {
        await signIn(provider, {
          callbackUrl: '/',
        })
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setError("An error occurred during authentication")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="grid gap-2">
        <div className="grid gap-1">
          <Label className="sr-only" htmlFor="email">
            Email
          </Label>
          <Input
            id="email"
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Label className="sr-only" htmlFor="password">
            Password
          </Label>
          <Input
            id="password"
            placeholder="Password"
            type="password"
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect="off"
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => onSubmit('credentials')} 
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In with Email"}
        </Button>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          onClick={() => onSubmit('github')}
          disabled={isLoading}
        >
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Github
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => onSubmit('google')}
          disabled={isLoading}
        >
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </>
          )}
        </Button>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        <p>Demo accounts:</p>
        <p>Email: john@example.com / Password: password123</p>
        <p>Email: alice@example.com / Password: password123</p>
      </div>
    </div>
  )
} 