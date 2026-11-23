export type DiscoverFilters = {
  q: string;
  fanArt: boolean;
  translations: boolean;
  adaptations: boolean;
  commercialUse: boolean;
};

export function parseDiscoverFilters(params: URLSearchParams): DiscoverFilters {
  return {
    q: params.get("q")?.trim().slice(0, 100) ?? "",
    fanArt: params.get("fanArt") === "allowed",
    translations: params.get("translations") === "allowed",
    adaptations: params.get("adaptations") === "allowed",
    commercialUse: params.get("commercialUse") === "allowed"
  };
}
