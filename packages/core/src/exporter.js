import fs from "node:fs";

export function exportScheduleC(categorizedTxns, { venture, year, outFile }) {
  const y = String(year);
  const rows = categorizedTxns.filter((t) => {
    return t.venture === venture && t.date.startsWith(y);
  });

  const header = ["Date","Description","Amount","Category","Venture","Note"];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push([
      r.date,
      csvSafe(r.description),
      r.amount,
      csvSafe(r.category),
      csvSafe(r.venture),
      csvSafe(r.note ?? "")
    ].join(","));
  }

  const csv = lines.join("\n") + "\n";
  if (outFile) fs.writeFileSync(outFile, csv, "utf8");
  return { csv, count: rows.length };
}

export function generateAlerts(categorizedTxns) {
  const uncategorized = categorizedTxns.filter((t) => t.category === "Uncategorized");
  return {
    uncategorizedCount: uncategorized.length,
    uncategorized
  };
}

function csvSafe(s) {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
