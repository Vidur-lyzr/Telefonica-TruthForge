export function clearanceBadgeClass(c: string) {
  switch (c) {
    case "public":
      return "bg-muted text-muted-foreground";
    case "internal":
      return "bg-tf-info-bg text-tf-info";
    case "confidential":
      return "bg-tf-warning-bg text-tf-warning";
    case "restricted":
      return "bg-tf-error-bg text-tf-error";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function sourceStatusClass(s: string) {
  switch (s) {
    case "live":
      return "bg-tf-success text-white";
    case "filtered":
      return "bg-tf-blue-tint text-tf-blue";
    case "manual":
      return "bg-muted text-muted-foreground";
    case "to_configure":
      return "bg-tf-warning-bg text-tf-warning";
    default:
      return "bg-muted text-muted-foreground";
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

export function confidenceClass(c: string) {
  switch (c) {
    case "high":
      return "bg-tf-success-bg text-tf-success";
    case "medium":
      return "bg-tf-warning-bg text-tf-warning";
    case "low":
      return "bg-tf-error-bg text-tf-error";
    default:
      return "bg-muted text-muted-foreground";
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
