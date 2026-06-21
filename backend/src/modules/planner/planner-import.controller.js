import { parsePlannerExcel } from "./planner-import.service.js";

/**
 * Controller to handle POST /api/planner/import-excel
 */
export async function importPlannerExcel(req, res, next) {
  try {
    const { clientId, month, year } = req.body;
    const file = req.file;

    // Validate inputs
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No Excel file uploaded. Please upload a file with the key 'file'."
      });
    }

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "clientId is required"
      });
    }

    if (!month || isNaN(parseInt(month, 10)) || parseInt(month, 10) < 1 || parseInt(month, 10) > 12) {
      return res.status(400).json({
        success: false,
        message: "A valid month (1-12) is required"
      });
    }

    if (!year || isNaN(parseInt(year, 10)) || parseInt(year, 10) < 2000 || parseInt(year, 10) > 2100) {
      return res.status(400).json({
        success: false,
        message: "A valid year (2000-2100) is required"
      });
    }

    console.log(`[Excel Import Controller] Starting import for clientId: ${clientId}, month: ${month}, year: ${year}`);

    const result = await parsePlannerExcel(file.buffer, year, month);

    return res.status(200).json({
      success: true,
      rows: result.rows,
      warnings: result.warnings
    });
  } catch (error) {
    console.error("❌ Excel Import Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred during Excel parsing."
    });
  }
}
