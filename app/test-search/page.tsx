"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiInfo, setApiInfo] = useState({
    url: "",
    status: 0,
    timing: 0,
  });

  const handleSearch = async () => {
    if (!query || query.length < 2) {
      setError("Please enter at least 2 characters");
      return;
    }

    setLoading(true);
    setError("");
    const startTime = performance.now();

    try {
      const url = `/api/stocks/search?q=${encodeURIComponent(query)}`;
      setApiInfo(prev => ({ ...prev, url }));
      
      const response = await fetch(url);
      setApiInfo(prev => ({ ...prev, status: response.status }));
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to search");
      setResults([]);
    } finally {
      const endTime = performance.now();
      setApiInfo(prev => ({ ...prev, timing: Math.round(endTime - startTime) }));
      setLoading(false);
    }
  };

  // Direct test for Alpaca assets
  const testAlpacaAssets = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/test-alpaca?endpoint=assets");
      const data = await response.json();
      console.log("Alpaca Assets Response:", data);
      setResults(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Alpaca assets");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Stock Search API Test</h1>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search for a stock (e.g., apple)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
        <Button variant="outline" onClick={testAlpacaAssets} disabled={loading}>
          Test Alpaca Assets
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
        <div>API URL: {apiInfo.url || "Not called yet"}</div>
        <div>Status: {apiInfo.status || "N/A"}</div>
        <div>Response Time: {apiInfo.timing}ms</div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Results ({results.length})</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((stock, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{stock.symbol}</CardTitle>
              <CardDescription>{stock.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Type: {stock.type || "N/A"}</p>
              <p>Market: {stock.market || "N/A"}</p>
              {stock.currency && <p>Currency: {stock.currency}</p>}
            </CardContent>
            <CardFooter>
              <pre className="text-xs bg-gray-100 p-2 rounded w-full overflow-auto">
                {JSON.stringify(stock, null, 2)}
              </pre>
            </CardFooter>
          </Card>
        ))}
      </div>

      {results.length === 0 && !loading && (
        <div className="text-center p-8 bg-gray-50 rounded">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
} 