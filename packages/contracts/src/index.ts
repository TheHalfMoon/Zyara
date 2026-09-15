// Shared API contracts safe for apps to import (M001).
export interface ReadyResponse {
  status: "healthy" | "not_ready";
  database: "reachable" | "unavailable";
  build: string;
  version: string;
}

export interface LiveResponse {
  alive: true;
}
