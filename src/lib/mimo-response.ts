export interface MimoChatResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findJsonValues(rawText: string): unknown[] {
  const text = rawText.replace(/^\uFEFF/, "").trim();
  try {
    return [JSON.parse(text)];
  } catch {
    // Some gateways append a second JSON object or prefix each object with data:.
  }

  const values: unknown[] = [];
  let searchStart = 0;
  while (searchStart < text.length) {
    const objectStart = text.slice(searchStart).search(/[\[{]/);
    if (objectStart < 0) break;

    const start = searchStart + objectStart;
    const opening = text[start];
    const closing = opening === "[" ? "]" : "}";
    let depth = 0;
    let inString = false;
    let escaped = false;
    let foundEnd = false;

    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === opening) {
        depth += 1;
      } else if (character === closing) {
        depth -= 1;
        if (depth === 0) {
          try {
            values.push(JSON.parse(text.slice(start, index + 1)));
          } catch {
            // Continue searching in case the next JSON object is valid.
          }
          searchStart = index + 1;
          foundEnd = true;
          break;
        }
      }
    }

    if (!foundEnd) break;
  }
  return values;
}

export function parseMimoChatResponse(rawText: string): MimoChatResponse {
  const values = findJsonValues(rawText);
  const response = values.find((value): value is MimoChatResponse => {
    if (!isRecord(value) || !Array.isArray(value.choices)) return false;
    return value.choices.some(
      (choice) => isRecord(choice) && isRecord(choice.message),
    );
  }) ?? values[0];

  if (!isRecord(response)) {
    throw new Error("ASR \u670d\u52a1\u8fd4\u56de\u4e86\u65e0\u6cd5\u8bc6\u522b\u7684\u54cd\u5e94\u683c\u5f0f");
  }
  return response as MimoChatResponse;
}
