import { useState, useEffect } from "react";

export function useApi<T>(
  url: string,
  options?: RequestInit
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Request failed");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, options, refreshKey]);

  return {
    data,
    loading,
    error,
    refetch: async () => {
      setLoading(true);
      setError(null);
      setRefreshKey((v) => v + 1);
    },
  };
}
