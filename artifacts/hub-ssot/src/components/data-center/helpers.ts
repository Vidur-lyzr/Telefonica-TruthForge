type TagType =
  | "promo"
  | "info"
  | "active"
  | "inactive"
  | "success"
  | "warning"
  | "error";

export function clearanceTagType(c: string): TagType {
  switch (c) {
    case "public":
      return "inactive";
    case "internal":
      return "info";
    case "confidential":
      return "warning";
    case "restricted":
      return "error";
    default:
      return "inactive";
  }
}

export function sourceStatusTagType(s: string): TagType {
  switch (s) {
    case "live":
      return "success";
    case "filtered":
      return "info";
    case "manual":
      return "inactive";
    case "to_configure":
      return "warning";
    default:
      return "inactive";
  }
}

export function sourceStatusLabel(s: string) {
  switch (s) {
    case "live":
      return "Live";
    case "filtered":
      return "Filtered · near real-time";
    case "manual":
      return "On demand";
    case "to_configure":
      return "To configure";
    default:
      return s;
  }
}

export function confidenceTagType(c: string): TagType {
  switch (c) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    case "low":
      return "error";
    default:
      return "inactive";
  }
}

export function fieldLabel(field: string) {
  const map: Record<string, string> = {
    confidentiality: "Confidentiality",
    owner: "Owner",
    country: "Country",
    validUntil: "Valid until",
    title: "Title",
    brand: "Brand",
  };
  return map[field] ?? field;
}

export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
