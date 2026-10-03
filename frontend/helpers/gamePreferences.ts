const SHOW_DETAILS_KEY = "othello-show-details";

export function loadShowDetails(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SHOW_DETAILS_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  return false;
}

export function persistShowDetails(on: boolean) {
  localStorage.setItem(SHOW_DETAILS_KEY, on ? "1" : "0");
}
