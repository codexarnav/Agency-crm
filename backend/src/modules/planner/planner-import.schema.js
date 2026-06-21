import { z } from "zod";

export const PlannerImportSchema = z.object({
  plannerRows: z.array(
    z.object({
      postingDate: z.string().optional().describe("YYYY-MM-DD posting date mapped from Date column. Use the target month and year of the plan to construct YYYY-MM-DD if the date is just a day number."),
      day: z.string().optional().describe("Day of the week (e.g. Mon, Tue) mapped from Day column"),
      contentTitle: z.string().optional().describe("Short content title or topic mapped from Content / Title / Topic / Idea column. This is the brief name of the content piece."),
      contentType: z.string().optional().describe("Content type mapped from Type / Content Type / Format column. If value contains a slash like 'Reel/Short', extract only the first type ('Reel')."),
      description: z.string().optional().describe("Longer content description, caption, or creative brief mapped from Content Description / Caption / Brief / Copy column"),
      assignedTo: z.string().optional().describe("Name of the assignee mapped from Assigned / Owner / Team column"),
      status: z.string().optional().describe("Status mapped from Status column"),
      priority: z.string().optional().describe("Priority mapped from Priority column, default is 'Medium' if missing"),
      platform: z.string().optional().describe("Social media platform mapped from Platform / Channel column, default is 'Instagram' if missing"),
      fileUrl: z.string().optional().describe("File link or drive URL mapped from File / Drive / Link column"),
      thumbnailUrl: z.string().optional().describe("Thumbnail URL or reference mapped from Thumbnail column"),
      feedback: z.string().optional().describe("Client feedback or notes mapped from Feedback / Notes / Comments column"),
      postLink: z.string().optional().describe("Live link to the published post mapped from Post Link / Live Link / Published Link / Reference Link column"),
      rowNumber: z.number().optional().describe("The Excel rowNumber of the source row being mapped"),
      confidence: z.number().optional().describe("Confidence score of extraction/mapping between 0.0 and 1.0")
    })
  )
});
