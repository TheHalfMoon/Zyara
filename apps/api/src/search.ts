import type { FastifyInstance } from "fastify";
import { search } from "@zyara/search";
import type { PublicProjection } from "@zyara/search";
import type { SearchQuery } from "@zyara/search-contract";

// Synthetic public projections (M011). Browsing is anonymous: no auth, no
// patient context, no raw query retention.
const PROJECTIONS: PublicProjection[] = [
  {
    docId: "doc-olaya-derm", branchId: "b1",
    names: { ar: "عيادة العليا للجلدية", en: "Olaya Dermatology" },
    specialty: "dermatology", service: "consultation", insurer: "TAWUNIYA",
    languages: ["ar", "en"], accessibility: ["wheelchair"],
    verifiedScope: "commercial registration", withdrawn: false, expired: false,
    freshnessDays: 2, lat: 24.7136, lng: 46.6753, nextAvailableIso: "2026-09-20T10:00:00+03:00",
  },
  {
    docId: "doc-olaya-lab", branchId: "b1",
    names: { ar: "مختبر العليا", en: "Olaya Lab" },
    specialty: "pathology", service: "lab_draw", insurer: null,
    languages: ["ar"], accessibility: [],
    verifiedScope: null, withdrawn: false, expired: false,
    freshnessDays: 9, lat: 24.72, lng: 46.68, nextAvailableIso: null,
  },
];

export function registerSearchRoutes(app: FastifyInstance) {
  app.get("/search", async (req) => {
    const q = req.query as Record<string, string>;
    const query: SearchQuery = {
      version: 1,
      locale: ["ar", "en", "fr", "de", "es"].includes(q["locale"] ?? "") ? (q["locale"] as SearchQuery["locale"]) : "ar",
      text: q["text"] ?? "",
      specialty: q["specialty"],
      service: q["service"],
      insurer: q["insurer"],
      sort: q["sort"] === "nearest" || q["sort"] === "soonest" ? q["sort"] : "relevant",
    };
    return search(PROJECTIONS, query, { allowRelax: q["relax"] === "1", symptomNavigationEnabled: false });
  });
}
