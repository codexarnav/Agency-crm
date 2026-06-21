import * as XLSX from "xlsx";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SYSTEM_PROMPT } from "./planner-import.prompt.js";
import { PlannerImportSchema } from "./planner-import.schema.js";

/**
 * Normalizes any parsed date string or number to YYYY-MM-DD.
 * If date is just a day number (e.g. 5), uses the client's planning year and month.
 */
export function normalizePostingDate(dateVal, year, month) {
  if (dateVal === undefined || dateVal === null || dateVal === "") return null;
  
  const str = String(dateVal).trim();
  
  // If it's a pure day number (e.g., "5" or "23")
  if (/^\d{1,2}$/.test(str)) {
    const y = String(year).trim();
    const m = String(month).padStart(2, "0");
    const d = String(str).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Check if it already matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Check for Excel serial number
  if (!isNaN(str) && !isNaN(parseFloat(str)) && parseFloat(str) > 20000 && parseFloat(str) < 60000) {
    const serial = parseFloat(str);
    const utcDays = Math.floor(serial - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // General date parse attempt
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // DMY formats like 05/06/2026 or 05-06-2026
  const dm = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dm) {
    const p1 = parseInt(dm[1], 10);
    const p2 = parseInt(dm[2], 10);
    const y = parseInt(dm[3], 10);
    let day = p1;
    let monthVal = p2;
    if (p1 > 12) {
      day = p1;
      monthVal = p2;
    } else if (p2 > 12) {
      day = p2;
      monthVal = p1;
    }
    return `${y}-${String(monthVal).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return str;
}

/**
 * Helper to normalize day name from posting date if missing.
 */
export function getDayOfWeek(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

/**
 * Parses all worksheets of the uploaded Excel file buffer.
 */
export function parseExcelToJSON(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const allRows = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // sheet_to_json with header: 1 to get arrays of cells
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!jsonData || jsonData.length === 0) continue;

    // Find the header row (first row that has non-empty cells)
    let headerRowIdx = -1;
    for (let idx = 0; idx < jsonData.length; idx++) {
      const row = jsonData[idx];
      if (row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
        headerRowIdx = idx;
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    const headers = jsonData[headerRowIdx].map(h => (h !== undefined && h !== null ? String(h).trim() : ""));

    // Extract subsequent data rows
    for (let rowIdx = headerRowIdx + 1; rowIdx < jsonData.length; rowIdx++) {
      const rowArr = jsonData[rowIdx];
      if (!rowArr) continue;

      const isEmpty = rowArr.every(cell => cell === undefined || cell === null || String(cell).trim() === "");
      if (isEmpty) continue; // Skip empty rows

      const rawRow = {};
      headers.forEach((h, colIdx) => {
        if (h) {
          rawRow[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : "";
        }
      });

      allRows.push({
        sheetName,
        rowNumber: rowIdx + 1,
        ...rawRow
      });
    }
  }

  return allRows;
}

/**
 * Service function to process Excel parsing and mapping via Gemini AI.
 */
export async function parsePlannerExcel(fileBuffer, year, month) {
  // 1. Read workbook and convert sheets to JSON
  const rawRows = parseExcelToJSON(fileBuffer);
  if (rawRows.length === 0) {
    return { success: true, rows: [], warnings: ["No valid content rows found in spreadsheet"] };
  }

  // Pre-filter: remove completely empty rows before sending to Gemini
  const rows = rawRows.filter(row => {
    const values = Object.entries(row)
      .filter(([key]) => key !== "sheetName" && key !== "rowNumber")
      .map(([, val]) => val);
    return values.some(val => val !== undefined && val !== null && String(val).trim() !== "");
  });

  console.log(`[Excel Import] Parsed ${rawRows.length} rows, ${rows.length} non-empty rows. Starting Gemini mapping.`);

  if (rows.length === 0) {
    return { success: true, rows: [], warnings: ["All rows in spreadsheet are empty"] };
  }

  // Validate API key config
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured on the backend server.");
  }

  // 2. Chunk rows (groups of 50)
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE));
  }

  // Initialize ChatGoogleGenerativeAI model
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-2.5-flash",
    apiKey,
    maxRetries: 3,
    temperature: 0.1,
  });

  const structuredModel = model.withStructuredOutput(PlannerImportSchema);

  const allExtractedRows = [];
  const warnings = [];

  // 3. Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[Excel Import] Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} rows.`);

    const promptMessage = SYSTEM_PROMPT
      .replace("{{month}}", String(month))
      .replace("{{year}}", String(year));

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let response = null;

    while (attempts < maxAttempts && !success) {
      try {
        attempts++;
        response = await structuredModel.invoke([
          ["system", promptMessage],
          ["user", JSON.stringify(chunk, null, 2)]
        ]);
        success = true;
      } catch (err) {
        console.error(`[Excel Import] Attempt ${attempts} failed for chunk ${i + 1}:`, err);
        if (attempts >= maxAttempts) {
          console.error(`[Excel Import] Logging parsing failure for chunk ${i + 1}`);
          warnings.push(`Failed to parse chunk ${i + 1} after 3 attempts due to Gemini API error.`);
        }
      }
    }

    if (success && response && Array.isArray(response.plannerRows)) {
      allExtractedRows.push(...response.plannerRows);
    }
  }

  console.log(`[Excel Import] Extracted ${allExtractedRows.length} structured rows from Gemini.`);

  const validatedRows = [];
  const seenKeys = new Set();

  // 4. Validate and normalise each row
  for (const extractedRow of allExtractedRows) {
    const rowNum = extractedRow.rowNumber;

    // Check that the row has at least SOME content (title OR description)
    const hasTitle = extractedRow.contentTitle && String(extractedRow.contentTitle).trim() !== "";
    const hasDesc = extractedRow.description && String(extractedRow.description).trim() !== "";
    const hasType = extractedRow.contentType && String(extractedRow.contentType).trim() !== "";

    if (!hasTitle && !hasDesc) {
      // Row has no content at all — skip silently (likely a blank/weekend row)
      continue;
    }

    // Normalize compound content types (e.g., "Reel/Short" → "Reel")
    let contentType = extractedRow.contentType || "";
    if (contentType.includes("/")) {
      contentType = contentType.split("/")[0].trim();
    }
    contentType = contentType.trim();

    // Default contentType to "Reel" if missing but row has content
    if (!contentType) {
      contentType = "Reel";
    }

    // Build description: use contentTitle as primary, description as secondary
    // (Option A from plan — title becomes planner description, longer text is caption)
    const title = hasTitle ? String(extractedRow.contentTitle).trim() : "";
    const desc = hasDesc ? String(extractedRow.description).trim() : "";
    const primaryDescription = title || desc;
    const captionCopy = title && desc ? desc : "";

    // Apply defaults and normalizations
    const normalizedDate = normalizePostingDate(extractedRow.postingDate, year, month);
    const normalizedDay = extractedRow.day || getDayOfWeek(normalizedDate);
    const platform = extractedRow.platform || "Instagram";
    const priority = extractedRow.priority || "Medium";
    
    const formattedRow = {
      postingDate: normalizedDate,
      day: normalizedDay,
      contentType: contentType,
      description: primaryDescription,
      captionCopy: captionCopy,
      assignedTo: extractedRow.assignedTo || "",
      status: extractedRow.status || "todo",
      priority: priority,
      platform: platform,
      fileUrl: extractedRow.fileUrl || "",
      thumbnailUrl: extractedRow.thumbnailUrl || "",
      feedback: extractedRow.feedback || "",
      postLink: extractedRow.postLink || "",
      confidence: typeof extractedRow.confidence === "number" ? extractedRow.confidence : 0.95
    };

    // 5. Duplicate Prevention (by postingDate, description, contentType)
    const dupKey = `${formattedRow.postingDate || ""}_${formattedRow.description}_${formattedRow.contentType}`;
    if (seenKeys.has(dupKey)) {
      continue; // Skip duplicate row
    }
    seenKeys.add(dupKey);

    validatedRows.push(formattedRow);
  }

  console.log(`[Excel Import] Validation completed: ${validatedRows.length} rows accepted, ${warnings.length} warnings.`);

  return {
    success: true,
    rows: validatedRows,
    warnings
  };
}
