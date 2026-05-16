import { useState } from "react";

interface UseMutationOptions<T, R> {
  onSuccess?: (data: R) => void;
  onError?: (error: string) => void;
}

export function useMutation<T, R>(
  url: string,
  options?: UseMutationOptions<T, R>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (body: T): Promise<R | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Request failed");
      }

      options?.onSuccess?.(json.data);
      return json.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
      options?.onError?.(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
