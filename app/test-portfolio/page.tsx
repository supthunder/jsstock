"use client"

import { UserNav } from "@/components/UserNav"
import { PortfolioDialog } from "@/components/PortfolioDialog"
import { Button } from "@/components/ui/button"

export default function TestPortfolioPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Portfolio Test Page</h1>
        <UserNav />
      </div>
      
      <div className="flex flex-col items-center justify-center space-y-4 mt-10">
        <h2 className="text-xl">Test Portfolio Dialog Directly</h2>
        <PortfolioDialog>
          <Button>Open Portfolio</Button>
        </PortfolioDialog>
        
        <p className="mt-4 text-muted-foreground">
          You can also access the portfolio dialog through the user menu in the top right.
        </p>
      </div>
    </div>
  )
} 