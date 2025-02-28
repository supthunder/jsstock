import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get API keys from environment variables with fallbacks for development
export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "sUmkVVwUwhTEMMrNM3t7M6V5jVGpeMVK"
export const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "TP89ZA1SDG5V7UAX"
