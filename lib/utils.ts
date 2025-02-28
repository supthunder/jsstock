import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add API keys (these should be moved to environment variables in a real app)
export const POLYGON_API_KEY = "REPLACE_WITH_YOUR_POLYGON_API_KEY"
export const ALPHA_VANTAGE_API_KEY = "REPLACE_WITH_YOUR_ALPHA_VANTAGE_API_KEY"
