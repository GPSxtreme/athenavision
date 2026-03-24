export const PROMPT_A = `Extract all text from this image verbatim. Preserve the original structure, spacing, and line breaks exactly as they appear. Do not interpret, summarize, or reformat. Output only the extracted text, nothing else.`;

export const PROMPT_B = `Perform OCR on this image. Extract all visible text. For any character you are uncertain about, include it but mark it with [?] immediately after the uncertain character. Preserve the original layout and line breaks. Output only the extracted text with uncertainty markers, nothing else.`;
