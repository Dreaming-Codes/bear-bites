import type { Ingredient } from './schemas'

const SPICY_CACHE_KEY_PREFIX = 'spicy:'

/**
 * Flatten the recursive Ingredient tree into a single string,
 * excluding "less than 2%" type notes for a cleaner AI signal.
 */
export function flattenIngredients(ingredients: Array<Ingredient>): string {
  const parts: Array<string> = []

  function walk(items: Array<Ingredient>) {
    for (const item of items) {
      // Skip notes like "Contains less than 2% of:"
      if (item.isNote) continue
      parts.push(item.name)
      if (item.children) {
        walk(item.children)
      }
    }
  }

  walk(ingredients)
  return parts.join(', ')
}

/**
 * Get the cached spicy classification for an item, if it exists.
 */
export async function getCachedSpicy(
  itemId: string,
  kv: KVNamespace,
): Promise<boolean | null> {
  const cached = await kv.get(SPICY_CACHE_KEY_PREFIX + itemId)
  if (cached === null) return null
  return cached === 'true'
}

/**
 * Store a spicy classification permanently in KV (no TTL).
 * Each item is only ever classified once.
 */
export async function cacheSpicy(
  itemId: string,
  isSpicy: boolean,
  kv: KVNamespace,
): Promise<void> {
  await kv.put(SPICY_CACHE_KEY_PREFIX + itemId, isSpicy ? 'true' : 'false')
}

/**
 * Classify whether a food item is spicy using Workers AI,
 * based on its name and full ingredient list.
 *
 * Returns the cached result if available; otherwise calls the AI
 * and caches the result permanently.
 */
export async function classifySpicy(
  itemId: string,
  foodName: string,
  ingredients: string,
  kv: KVNamespace,
  ai: Ai,
): Promise<boolean> {
  // Check cache first
  const cached = await getCachedSpicy(itemId, kv)
  if (cached !== null) return cached

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
      messages: [
        {
          role: 'system',
          content:
            'You are a food classification assistant. Given a food name and its ingredients, determine if the dish is spicy. A dish is spicy if it contains ingredients that produce heat/spiciness such as: chili peppers, jalape\u00f1os, habaneros, cayenne, hot sauce, sriracha, crushed red pepper, pepper flakes, chipotle, wasabi, horseradish, gochujang, sambal, or similar spicy ingredients. Mildly flavored items with just black pepper or paprika are NOT considered spicy. Respond with ONLY valid JSON: {"spicy": true} or {"spicy": false}',
        },
        {
          role: 'user',
          content: `Food: ${foodName}\nIngredients: ${ingredients}`,
        },
      ],
      max_tokens: 20,
    })

    const text =
      typeof response === 'string'
        ? response
        : ((response as { response?: string }).response ?? '')

    // Parse the JSON response — be lenient
    const spicy = /\"spicy\"\s*:\s*true/i.test(text)

    await cacheSpicy(itemId, spicy, kv)
    return spicy
  } catch (error) {
    console.error(`AI spicy classification failed for ${foodName}:`, error)
    // Fallback: not spicy — don't cache failures so we can retry later
    return false
  }
}
