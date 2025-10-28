import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImageData } from "../types";

export const recolorImage = async (
  imageData: ImageData,
  colorName: string,
  colorHex: string
): Promise<ImageData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set in environment variables.");
  }

  // Ensure a new instance of GoogleGenAI is created for each API call
  // to pick up the latest API key if it changes via `window.aistudio.openSelectKey()`.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `You are an expert interior designer and professional image editor specializing in photorealistic wall recoloring. Your task is to transform the walls in this interior photo to ${colorName} (HEX: ${colorHex}) with maximum visual impact and realism.

═══════════════════════════════════════════════════════════
TIER 1: CRITICAL INSTRUCTIONS
═══════════════════════════════════════════════════════════
1. Change ALL wall surfaces to ${colorName} (HEX: ${colorHex}) - NO EXCEPTIONS
2. Apply UNIFORM color transformation across 100% of wall areas
3. Preserve authentic lighting, shadows, and 3D depth on walls
4. Maintain original lighting direction and intensity
5. Retain wall texture, grain, and surface details
6. EXCLUDE: furniture, floor, ceiling, windows, doors, decorations, fixtures
7. Ensure saturation and brightness match realistic matte/semi-gloss paint

═══════════════════════════════════════════════════════════
TIER 2: ENHANCED COLOR TRANSFORMATION (OPTION A - Similar Colors)
═══════════════════════════════════════════════════════════
CRITICAL FOR SIMILAR COLOR CONVERSIONS:
- If the new color ${colorHex} is similar to the current wall color, INCREASE saturation
- Apply subtle tone shifting to make the transformation IMMEDIATELY OBVIOUS
- Enhance vibrancy by +15-25% to ensure clear visual distinction
- Use full saturation potential of the target color
- Create obvious color contrast that's unmistakable in before/after comparison
- The result MUST look significantly different, not just a subtle tint

═══════════════════════════════════════════════════════════
TIER 3: REFERENCE TRANSFORMATION (OPTION B - Visibility Standard)
═══════════════════════════════════════════════════════════
TRANSFORMATION STANDARD:
- New wall color MUST be distinctly different from original
- The change should be IMMEDIATELY visible and noticeable
- Target color: ${colorHex} - apply this as the PRIMARY wall color
- Ensure transformation is obvious without needing close inspection
- Goal: Clear before/after visual difference that's unmistakable

═══════════════════════════════════════════════════════════
TIER 4: TECHNICAL IMPLEMENTATION (OPTION C - Advanced Processing)
═══════════════════════════════════════════════════════════
TECHNICAL APPROACH FOR MAXIMUM QUALITY:
1. Semantic Segmentation: Identify and isolate all wall surfaces using edge detection and color clustering
2. Preserve Structure: Maintain wall boundaries, corners, architectural features precisely
3. Color Space Conversion: Convert target HEX ${colorHex} to HSL color space for natural adjustments
   - H (Hue): Apply target hue from ${colorHex}
   - S (Saturation): Boost to maximum realistic paint appearance (80-95%)
   - L (Lightness): Adjust to match wall illumination in image
4. Selective Color Adjustment: Apply transformation only to identified wall pixels
5. Shadow & Light Integration: 
   - Maintain highlight areas (lighter tones keep luminosity)
   - Preserve shadow areas (darker tones remain proportionally darker)
   - Apply color in shadow with reduced saturation for realism
6. Boundary Blending: Smooth transitions at wall edges using feathering (2-3 pixel blend)
7. Anti-Artifact Processing: Remove halos, color bleeding, and edge artifacts
8. Final Enhancement: Apply subtle texture mapping to preserve surface details

═══════════════════════════════════════════════════════════
QUALITY ASSURANCE CHECKLIST
═══════════════════════════════════════════════════════════
✓ Result is PHOTOREALISTIC - indistinguishable from actual paint application
✓ Color transformation is OBVIOUS and UNMISTAKABLE
✓ No painting, filtering, or artificial effects visible
✓ Zero color bleeding or halo effects
✓ Consistent lighting throughout the scene
✓ Fine details preserved (baseboards, molding, wall features)
✓ All wall surfaces uniformly recolored to ${colorHex}
✓ Furniture and non-wall elements untouched
✓ Shadow and depth accurately rendered in new color

═══════════════════════════════════════════════════════════
FINAL OUTPUT REQUIREMENT
═══════════════════════════════════════════════════════════
Deliver: A high-quality, photorealistic recolored image where ALL walls display ${colorName} (${colorHex}) with maximum visual distinction from the original, while maintaining perfect lighting, shadows, and architectural detail.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", // Model for general image generation and editing tasks
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData.base64,
              mimeType: imageData.mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
      },
    });

    const generatedImagePart = response.candidates?.[0]?.content?.parts?.[0];

    if (!generatedImagePart || !generatedImagePart.inlineData) {
      throw new Error("No image data received from Gemini API.");
    }

    const newImageBase64: string = generatedImagePart.inlineData.data;
    const newImageMimeType: string = generatedImagePart.inlineData.mimeType;

    return {
      id: crypto.randomUUID(),
      name: `recolored-${imageData.name}`,
      base64: newImageBase64,
      mimeType: newImageMimeType,
    };
  } catch (error) {
    console.error("Error recoloring image with Gemini API:", error);
    throw new Error(
      `Failed to recolor image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
