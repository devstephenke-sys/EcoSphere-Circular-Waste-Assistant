import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeWasteItem(base64Image: string, location?: { latitude: number, longitude: number }) {
  const model = "gemini-3-flash-preview";
    const prompt = `
    You are an expert in waste management and circular economy, inspired by the World Bank's "What a Waste 3.0" report.
    Analyze this image of a waste item and provide a structured JSON response.
    
    The response should include:
    1. "itemName": Name of the item.
    2. "category": One of [Organic, Plastic, Paper, Metal, Glass, E-waste, Other].
    3. "circularActions": A list of 3-4 specific suggestions to keep this item in the loop (e.g., Repair, Upcycle, Donate, specific recycling instructions).
    4. "environmentalImpact": A short, punchy fact about the impact of this item if mismanaged (e.g., decomposition time, methane potential, or plastic leakage risk).
    5. "sortingGuide": Clear instructions on how to dispose of it if it can't be reused.
    6. "circularityScore": A number from 1-10 (10 being most circular/easy to reuse).
    7. "nearbyRecyclingAdvice": A brief summary of how to handle this specific item in the user's area.
    8. "detailedLocations": A list of 3 objects, each containing:
       - "name": Name of the recycling center.
       - "hours": Operating hours if available.
       - "contact": Phone number or website if available.
       - "acceptedMaterials": A list of materials they accept.
       - "address": Physical address.

    Additionally, use the Google Maps tool to find the 3 nearest recycling centers or drop-off points for this specific category of waste (especially if it's E-waste, Metal, or Plastic).
    
    Return ONLY the JSON object for the analysis. The Google Maps results will be handled separately by the grounding metadata to provide the direct links.
  `;

  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: location
        }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
          ],
        },
      ],
      config
    });

    const text = response.text || "{}";
    // Manually parse JSON as responseMimeType is not allowed with googleMaps
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    
    // Extract Maps grounding
    const mapsGrounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.maps)
      ?.map((chunk: any) => ({
        title: chunk.maps.title,
        uri: chunk.maps.uri
      })) || [];

    return { ...analysis, nearbyLocations: mapsGrounding };
  } catch (error) {
    console.error("Error analyzing waste:", error);
    throw error;
  }
}
