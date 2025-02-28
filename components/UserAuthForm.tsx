import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import { Github, Google } from "lucide-react"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function onSubmit(provider: string) {
    setIsLoading(true)

    try {
      await signIn(provider, {
        callbackUrl: '/',
      })
    } catch (error) {
      console.error('Authentication error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="grid gap-4">
        <Button 
          variant="outline" 
          onClick={() => onSubmit('github')}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Github className="mr-2 h-4 w-4" />
          )}{" "}
          Continue with Github
        </Button>
        <Button
          variant="outline"
          onClick={() => onSubmit('google')}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Google className="mr-2 h-4 w-4" />
          )}{" "}
          Continue with Google
        </Button>
      </div>
    </div>
  )
} 