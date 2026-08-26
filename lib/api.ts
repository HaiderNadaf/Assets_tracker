import axios, { AxiosError } from "axios";
import type {
  Asset,
  AssetQuery,
  FilterOptions,
  ListResponse,
  Stats,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 60000,
});

/** Turns any axios/network failure into a single readable sentence. */
export function apiError(err: unknown, fallback = "Something went wrong"): string {
  const e = err as AxiosError<{ message?: string; errors?: Record<string, string> }>;
  if (e?.response?.data?.errors) {
    return Object.values(e.response.data.errors).join(", ");
  }
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === "ECONNABORTED") return "Request timed out";
  if (e?.message === "Network Error") {
    return `Cannot reach the API at ${API_BASE}. Is the backend running?`;
  }
  return e?.message || fallback;
}

/**
 * Asset ids are FA codes typed by hand, so they can contain spaces or slashes.
 * Encoding here keeps them from breaking the path; the API decodes on the way in.
 */
const codePath = (id: string) => encodeURIComponent(id);

function toParams(query: AssetQuery): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  return params;
}

export async function fetchAssets(query: AssetQuery): Promise<ListResponse> {
  const { data } = await api.get<ListResponse>("/assets", { params: toParams(query) });
  return data;
}

export async function fetchAsset(id: string): Promise<Asset> {
  const { data } = await api.get<{ data: Asset }>(`/assets/${codePath(id)}`);
  return data.data;
}

export async function createAsset(form: FormData): Promise<Asset> {
  const { data } = await api.post<{ data: Asset }>("/assets", form);
  return data.data;
}

export async function updateAsset(id: string, form: FormData): Promise<Asset> {
  const { data } = await api.put<{ data: Asset }>(`/assets/${codePath(id)}`, form);
  return data.data;
}

export async function deleteAsset(id: string): Promise<void> {
  await api.delete(`/assets/${codePath(id)}`);
}

export async function addServiceRecord(id: string, form: FormData): Promise<Asset> {
  const { data } = await api.post<{ data: Asset }>(`/assets/${codePath(id)}/service`, form);
  return data.data;
}

export async function addTransfer(id: string, form: FormData): Promise<Asset> {
  const { data } = await api.post<{ data: Asset }>(`/assets/${codePath(id)}/transfer`, form);
  return data.data;
}

export async function verifyAsset(id: string, form: FormData): Promise<Asset> {
  const { data } = await api.post<{ data: Asset }>(`/assets/${codePath(id)}/verify`, form);
  return data.data;
}

export async function fetchOptions(): Promise<FilterOptions> {
  const { data } = await api.get<{ data: FilterOptions }>("/assets/meta/options");
  return data.data;
}

export async function fetchStats(): Promise<Stats> {
  const { data } = await api.get<{ data: Stats }>("/assets/meta/stats");
  return data.data;
}

/**
 * Fetches a file and saves it through a temporary object URL.
 *
 * A plain <a href> to the API would navigate the tab, so any error response
 * (a 503 while Mongo reconnects, a 404) replaces the app with raw JSON. Some
 * browsers also refuse cross-origin downloads without a `download` attribute.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  let response;
  try {
    response = await axios.get<Blob>(url, {
      responseType: "blob",
      withCredentials: true,
      timeout: 120000,
    });
  } catch (err) {
    // With responseType "blob" the error body is a Blob, not parsed JSON.
    let message: string | null = null;
    const data = (err as AxiosError).response?.data;
    if (data instanceof Blob) {
      const text = await data.text().catch(() => "");
      try {
        message = (JSON.parse(text) as { message?: string })?.message ?? null;
      } catch {
        message = null;
      }
    }
    throw new Error(message ?? apiError(err, "Download failed"));
  }

  const disposition = String(response.headers["content-disposition"] ?? "");
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;

  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to take the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

/** Direct link to a single asset's one-page PDF record. */
export const invoiceUrl = (id: string) =>
  `${API_BASE}/api/assets/${codePath(id)}/invoice`;

/**
 * Direct link to the .xlsx export. Plain navigation rather than a fetch, so the
 * browser handles the download and the Content-Disposition filename.
 */
export function exportUrl(query: AssetQuery): string {
  const params = new URLSearchParams(toParams(query));
  const qs = params.toString();
  return `${API_BASE}/api/assets/export${qs ? `?${qs}` : ""}`;
}
