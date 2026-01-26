import { DateTime } from 'luxon'
import { formatDateLA, LA_TIMEZONE } from '../timezone'
import type {
  Allergen,
  DayMenu,
  DietaryTag,
  FoodDetail,
  Ingredient,
  Meal,
  MenuItem,
  Nutrition,
} from './schemas'

const FOODPRO_BASE_URL = 'https://foodpro.ucr.edu/foodpro'

const ALLERGEN_MAP: Record<string, Allergen> = {
  'milk.png': 'milk',
  'eggs.png': 'eggs',
  'fish.png': 'fish',
  'crustacean_shellfish.png': 'shellfish',
  'tree_nuts.png': 'tree-nuts',
  'peanuts.png': 'peanuts',
  'wheat.png': 'wheat',
  'soybeans.png': 'soybeans',
  'sesame.png': 'sesame',
}

const DIETARY_MAP: Record<string, DietaryTag> = {
  'vgn_.png': 'vegan',
  'veg_.png': 'vegetarian',
  'gf_.png': 'gluten-free',
}

function parseAllergens(html: string): Array<Allergen> {
  const allergens: Array<Allergen> = []
  const regex = /AllergenImages\/([^"']+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const filename = match[1]
    if (ALLERGEN_MAP[filename]) {
      allergens.push(ALLERGEN_MAP[filename])
    }
  }

  return [...new Set(allergens)] // Remove duplicates
}

function parseDietaryTags(html: string): Array<DietaryTag> {
  const tags: Array<DietaryTag> = []
  const regex = /LegendImages\/([^"']+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const filename = match[1]
    if (DIETARY_MAP[filename]) {
      tags.push(DIETARY_MAP[filename])
    }
  }

  return [...new Set(tags)] // Remove duplicates
}

/**
 * Parse HTML ingredient list into structured data
 * Handles nested ul/li structure from FoodPro
 */
function parseIngredientsHtml(html: string): Array<Ingredient> {
  const ingredients: Array<Ingredient> = []

  // Find the content of the outer <ul>
  const ulMatch = html.match(/<ul>([\s\S]*)<\/ul>/i)
  if (!ulMatch) return ingredients

  const ulContent = ulMatch[1]

  // Parse top-level <li> elements by tracking depth
  let depth = 0
  let currentLi = ''
  let inLi = false
  let i = 0

  while (i < ulContent.length) {
    // Check for opening tags
    if (ulContent.slice(i, i + 4).toLowerCase() === '<li>') {
      if (depth === 0) {
        inLi = true
        currentLi = ''
      } else {
        currentLi += '<li>'
      }
      depth++
      i += 4
      continue
    }

    // Check for closing </li> tags
    if (ulContent.slice(i, i + 5).toLowerCase() === '</li>') {
      depth--
      if (depth === 0 && inLi) {
        // Process this complete li
        const ingredient = parseSingleLi(currentLi.trim())
        if (ingredient) {
          ingredients.push(ingredient)
        }
        inLi = false
        currentLi = ''
      } else {
        currentLi += '</li>'
      }
      i += 5
      continue
    }

    if (inLi) {
      currentLi += ulContent[i]
    }
    i++
  }

  return ingredients
}

/**
 * Parse a single <li> content (which may contain nested <ul>)
 */
function parseSingleLi(content: string): Ingredient | null {
  if (!content) return null

  // Check if there's a nested <ul>
  const nestedMatch = content.match(/^([\s\S]*?)<ul>([\s\S]*)<\/ul>$/i)

  if (nestedMatch) {
    // Has children
    let name = nestedMatch[1].trim()
    // Remove any <em> tags but keep the text
    name = name.replace(/<\/?em>/gi, '')
    const childrenHtml = `<ul>${nestedMatch[2]}</ul>`

    return {
      name,
      children: parseIngredientsHtml(childrenHtml),
    }
  } else {
    // No children
    const isNote = /<em>/i.test(content)
    const name = content.replace(/<\/?em>/gi, '').trim()

    return {
      name,
      isNote,
    }
  }
}

/**
 * Parse ingredients from paragraph text (fallback for older format)
 * Splits by comma while respecting parentheses for sub-ingredients
 */
function parseIngredientsParagraph(text: string): Array<Ingredient> {
  const ingredients: Array<Ingredient> = []
  let current = ''
  let depth = 0

  for (const char of text) {
    if (char === '(') {
      depth++
      current += char
    } else if (char === ')') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      const trimmed = current.trim()
      if (trimmed) {
        ingredients.push(parseIngredientWithParens(trimmed))
      }
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget the last ingredient
  const trimmed = current.trim()
  if (trimmed) {
    ingredients.push(parseIngredientWithParens(trimmed))
  }

  return ingredients
}

/**
 * Parse a single ingredient that may have sub-ingredients in parentheses
 */
function parseIngredientWithParens(text: string): Ingredient {
  const match = text.match(/^([^(]+)\s*\(([^)]+)\)\.?$/)
  if (match) {
    const name = match[1].trim()
    const childrenText = match[2]
    const children = childrenText.split(',').map((c) => ({
      name: c.trim().replace(/\.$/, ''),
    }))
    return { name, children }
  }
  return { name: text.replace(/\.$/, '') }
}

function extractMenuItemId(labelUrl: string): string {
  const match = labelUrl.match(/RecNumAndPort=([^&'"]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function parseShortMenu(
  html: string,
  locationId: string,
  locationName: string,
  dateStr: string,
): DayMenu {
  const meals: Partial<Record<Meal, Array<MenuItem>>> = {}

  // Split by meal headers to process each meal section
  const mealSections = html.split(/<h3 class="shortmenumeals">/i)

  for (let i = 1; i < mealSections.length; i++) {
    const section = mealSections[i]

    const mealNameMatch = section.match(/^(\w+)<\/h3>/i)
    if (!mealNameMatch) continue

    const mealName = mealNameMatch[1].toLowerCase() as Meal
    const items: Array<MenuItem> = []

    // Find the end of this meal section (next meal header or end of main content)
    // Look for the closing table or next section
    const nextMealIndex = section.search(/<h3 class="shortmenumeals">/i)
    const mealContent =
      nextMealIndex > 0 ? section.slice(0, nextMealIndex) : section

    const stationRegex = /<div class="shortmenucats">--\s*(.+?)\s*--<\/div>/gi
    let stationMatch: RegExpExecArray | null

    const stations: Array<{ name: string; position: number }> = []
    while ((stationMatch = stationRegex.exec(mealContent)) !== null) {
      stations.push({
        name: stationMatch[1].trim(),
        position: stationMatch.index,
      })
    }

    // Find all menu item wrappers - each contains the link and icons
    // Structure: <div class="menuItemWrapper">...<a href='label.aspx?...'>Name</a>...<div class="menuItemPieceIcons">icons</div>...</div>
    const wrapperRegex =
      /<div class="menuItemWrapper">([\s\S]*?)<\/div>\s*<\/td>/gi
    let wrapperMatch: RegExpExecArray | null

    while ((wrapperMatch = wrapperRegex.exec(mealContent)) !== null) {
      const wrapperContent = wrapperMatch[1]
      const wrapperPosition = wrapperMatch.index

      const linkMatch = wrapperContent.match(
        /<a href='(label\.aspx\?[^']+)'[^>]*>[\s\n]*([^<]+?)[\s\n]*<\/a>/i,
      )
      if (!linkMatch) continue

      const labelPath = linkMatch[1]
      const itemName = linkMatch[2].trim()
      const itemId = extractMenuItemId(labelPath)

      if (itemId && itemName) {
        let stationName = 'General'
        for (const station of stations) {
          if (station.position < wrapperPosition) {
            stationName = station.name
          } else {
            break
          }
        }

        const dietaryTags = parseDietaryTags(wrapperContent)
        const allergens = parseAllergens(wrapperContent)

        items.push({
          id: itemId,
          name: itemName,
          station: stationName,
          dietaryTags,
          allergens,
          labelUrl: `${FOODPRO_BASE_URL}/${labelPath}`,
        })
      }
    }

    if (items.length > 0) {
      meals[mealName] = items
    }
  }

  return {
    locationId,
    locationName,
    date: dateStr,
    meals,
  }
}

export function parseLabelPage(html: string, itemId: string): FoodDetail {
  // The food name is in an h1 inside content-wrapper, not the header h1
  let name = 'Unknown'
  const namePatterns = [
    /<div class="labelrecipe">([^<]+)<\/div>/i,
    /<div class="content-wrapper">[\s\S]*?<h1>([^<]+)<\/h1>/i,
    /<title>([^<]+)\s*\|/i, // "Classic Cheese Pizza | UC Riverside..." - get text before pipe
  ]
  for (const pattern of namePatterns) {
    const match = html.match(pattern)
    if (match) {
      name = match[1].trim()
      break
    }
  }

  const dietaryTags = parseDietaryTags(html)

  const allergens = parseAllergens(html)

  // Extract the ingredients list HTML (hierarchical structure) for better display
  const ingredientsListMatch = html.match(
    /<div class="ingred-list">\s*([\s\S]*?)\s*<\/div>\s*(?:<\/div>|$)/i,
  )
  // Fallback to paragraph if list not available
  const ingredientsParagraphMatch = html.match(
    /<div class="ingred-paragraph">\s*<p>([^<]+)<\/p>/i,
  )

  let ingredients: Array<Ingredient> = []
  if (ingredientsListMatch) {
    ingredients = parseIngredientsHtml(ingredientsListMatch[1])
  } else if (ingredientsParagraphMatch) {
    ingredients = parseIngredientsParagraph(ingredientsParagraphMatch[1])
  }

  // The nutrition label uses specific CSS classes

  const servingSizeMatch =
    html.match(
      /Serving size<\/h4>\s*<\/div>\s*<div class="nf-right-value">([^<]+)<\/div>/i,
    ) ||
    html.match(
      /Serving size[^<]*<\/h4>\s*<\/div>\s*<div[^>]*>([^<]+)<\/div>/i,
    ) ||
    html.match(
      /<div class="nf-row nf-serving">[\s\S]*?<div class="nf-right-value">([^<]+)<\/div>/i,
    )
  const servingSize = servingSizeMatch
    ? servingSizeMatch[1].trim()
    : '1 serving'

  const caloriesMatch =
    html.match(/<span class="nf-calories-count">(\d+)<\/span>/i) ||
    html.match(/<div class="nf-calorie-count">(\d+)<\/div>/i) ||
    html.match(/Calories\s*<\/span>\s*<span[^>]*>(\d+)/i)
  const calories = caloriesMatch ? parseInt(caloriesMatch[1]) : 0

  // Helper to extract nutrient values
  // The HTML structure is: <div class="nf-row"><div><h4>Name</h4> Value</div><div class="nf-right-value">DV%</div></div>
  const extractNutrient = (
    nutrientName: string,
    unit: string,
  ): { value: number; dv: number } => {
    let value = 0
    let dv = 0

    // Pattern to find: Name</h4> VALUE unit ... DV%
    // This captures the value right after the nutrient name and the DV% that follows
    const pattern = new RegExp(
      `<h4[^>]*>${nutrientName}</h4>\\s*(\\d+(?:\\.\\d+)?)\\s*${unit}[\\s\\S]*?class="nf-right-value"[^>]*>(\\d+(?:\\.\\d+)?)%`,
      'i',
    )
    const match = html.match(pattern)

    if (match) {
      value = parseFloat(match[1])
      dv = parseFloat(match[2])
    } else {
      // Try alternate pattern for lower section nutrients (Vitamin D, Calcium, etc.)
      // Structure: <h4>Name</h4> VALUEunit</div><div class="nf-right">DV%</div>
      const altPattern = new RegExp(
        `<h4>${nutrientName}</h4>\\s*(\\d+(?:\\.\\d+)?)${unit}</div><div class="nf-right">(\\d+(?:\\.\\d+)?)%`,
        'i',
      )
      const altMatch = html.match(altPattern)
      if (altMatch) {
        value = parseFloat(altMatch[1])
        dv = parseFloat(altMatch[2])
      } else {
        // Fallback: just find the value after the name
        const valuePattern = new RegExp(
          `${name}</h4>\\s*(\\d+(?:\\.\\d+)?)\\s*${unit}`,
          'i',
        )
        const valueMatch = html.match(valuePattern)
        if (valueMatch) {
          value = parseFloat(valueMatch[1])
        }
      }
    }

    return { value, dv }
  }

  const totalFat = extractNutrient('Total Fat', 'g')
  const satFat = extractNutrient('Saturated Fat', 'g')
  const transFatMatch =
    html.match(/Trans\s*<\/em>\s*Fat[^\d]*(\d+(?:\.\d+)?)g/i) ||
    html.match(/Trans Fat[^\d]*(\d+(?:\.\d+)?)g/i)
  const transFat = transFatMatch ? parseFloat(transFatMatch[1]) : 0

  const cholesterol = extractNutrient('Cholesterol', 'mg')
  const sodium = extractNutrient('Sodium', 'mg')
  const totalCarbs = extractNutrient('Total Carbohydrate', 'g')
  const fiber = extractNutrient('Dietary Fiber', 'g')

  // Total Sugars - structure: <h4>Total Sugars</h4> VALUEg
  const sugarsMatch = html.match(/<h4>Total Sugars<\/h4>\s*(\d+(?:\.\d+)?)g/i)
  const totalSugars = sugarsMatch ? parseFloat(sugarsMatch[1]) : 0

  // Added Sugars - structure: <h4>Includes VALUEg Added Sugars</h4> ... DV%
  const addedSugarsMatch = html.match(
    /Includes\s*(\d+(?:\.\d+)?)g\s*Added Sugars<\/h4>[\s\S]*?class="nf-right-value"[^>]*>(\d+(?:\.\d+)?)%/i,
  )
  const addedSugars = {
    grams: addedSugarsMatch ? parseFloat(addedSugarsMatch[1]) : 0,
    dailyValue: addedSugarsMatch ? parseFloat(addedSugarsMatch[2]) : 0,
  }

  // Protein - structure: <h4 class="nf-label-heavy">Protein</h4> VALUEg
  const proteinMatch = html.match(/<h4[^>]*>Protein<\/h4>\s*(\d+(?:\.\d+)?)g/i)
  const protein = proteinMatch ? parseFloat(proteinMatch[1]) : 0

  const vitaminD = extractNutrient('Vitamin D', 'mcg')
  const calcium = extractNutrient('Calcium', 'mg')
  const iron = extractNutrient('Iron', 'mg')
  const potassium = extractNutrient('Potassium', 'mg')

  const nutrition: Nutrition = {
    servingSize,
    calories,
    totalFat: {
      grams: totalFat.value,
      dailyValue: totalFat.dv,
    },
    saturatedFat: {
      grams: satFat.value,
      dailyValue: satFat.dv,
    },
    transFat,
    cholesterol: {
      mg: cholesterol.value,
      dailyValue: cholesterol.dv,
    },
    sodium: {
      mg: sodium.value,
      dailyValue: sodium.dv,
    },
    totalCarbs: {
      grams: totalCarbs.value,
      dailyValue: totalCarbs.dv,
    },
    fiber: {
      grams: fiber.value,
      dailyValue: fiber.dv,
    },
    totalSugars,
    addedSugars: {
      grams: addedSugars.grams,
      dailyValue: addedSugars.dailyValue,
    },
    protein,
    vitaminD: {
      mcg: vitaminD.value,
      dailyValue: vitaminD.dv,
    },
    calcium: {
      mg: calcium.value,
      dailyValue: calcium.dv,
    },
    iron: {
      mg: iron.value,
      dailyValue: iron.dv,
    },
    potassium: {
      mg: potassium.value,
      dailyValue: potassium.dv,
    },
  }

  return {
    id: itemId,
    name,
    dietaryTags,
    allergens,
    nutrition,
    ingredients,
  }
}

export function buildMenuUrl(
  locationId: string,
  locationName: string,
  date: Date,
): string {
  const dt = DateTime.fromJSDate(date).setZone(LA_TIMEZONE)
  const month = dt.month
  const day = dt.day
  const year = dt.year
  const dateStr = `${month}/${day}/${year}`

  return `${FOODPRO_BASE_URL}/shortmenu.aspx?sName=University+of+California%2c+Riverside+Dining+Services&locationNum=${locationId}&locationName=${encodeURIComponent(locationName)}&naFlag=1&WeeksMenus=This+Week%27s+Menus&myaction=read&dtdate=${encodeURIComponent(dateStr)}`
}

export function formatDateISO(date: Date): string {
  return formatDateLA(date)
}

export function buildLabelUrl(
  itemId: string,
  locationId: string,
  locationName: string,
  date: Date,
): string {
  const dt = DateTime.fromJSDate(date).setZone(LA_TIMEZONE)
  const month = dt.month
  const day = dt.day
  const year = dt.year
  const dateStr = `${month}/${day}/${year}`

  return `${FOODPRO_BASE_URL}/label.aspx?locationNum=${locationId}&locationName=${encodeURIComponent(locationName)}&dtdate=${encodeURIComponent(dateStr)}&RecNumAndPort=${encodeURIComponent(itemId)}`
}
