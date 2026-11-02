// A fixed time zone keeps server and browser output identical during hydration.
const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDate(date: Date) {
  return formatter.format(new Date(date));
}
