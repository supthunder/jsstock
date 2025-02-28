# JS Stock Tracker

A real-time stock tracking application built with Next.js that allows users to monitor stock performance, analyze trends, and track their portfolio.

## Features

- Real-time stock price updates via WebSocket connection
- Stock performance tracking with sparkline visualizations
- Filtering and sorting of stocks by various metrics
- User authentication and personalized watchlists
- Detailed stock information with performance metrics

## Technologies

- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- Next Auth for authentication
- Polygon.io API for stock data
- WebSocket for real-time updates

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and add your API keys:
   ```
   POLYGON_API_KEY=your_polygon_api_key
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
   NEXTAUTH_SECRET=your_nextauth_secret
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This project can be easily deployed on Vercel or other Next.js compatible hosting platforms.

## License

[MIT](LICENSE) 