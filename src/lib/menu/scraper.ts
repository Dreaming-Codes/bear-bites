import type {
  Allergen,
  DayMenu,
  DietaryTag,
  FoodDetail,
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

function parseAllergens(html: string): Allergen[] {
  const allergens: Allergen[] = []
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

function parseDietaryTags(html: string): DietaryTag[] {
  const tags: DietaryTag[] = []
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
  const meals: Partial<Record<Meal, MenuItem[]>> = {}

  // Split by meal headers to process each meal section
  const mealSections = html.split(/<h3 class="shortmenumeals">/i)

  for (let i = 1; i < mealSections.length; i++) {
    const section = mealSections[i]

    const mealNameMatch = section.match(/^(\w+)<\/h3>/i)
    if (!mealNameMatch) continue

    const mealName = mealNameMatch[1].toLowerCase() as Meal
    const items: MenuItem[] = []

    // Find the end of this meal section (next meal header or end of main content)
    // Look for the closing table or next section
    const nextMealIndex = section.search(/<h3 class="shortmenumeals">/i)
    const mealContent =
      nextMealIndex > 0 ? section.slice(0, nextMealIndex) : section

    const stationRegex = /<div class="shortmenucats">--\s*(.+?)\s*--<\/div>/gi
    let stationMatch: RegExpExecArray | null

    const stations: { name: string; position: number }[] = []
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
  let name = 'Unknown'
  const namePatterns = [
    /<div class="labelrecipe">([^<]+)<\/div>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<]+)<\/title>/i,
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

  const ingredientsMatch = html.match(
    /<div class="ingred-paragraph">\s*<p>([^<]+)<\/p>/i,
  )
  const ingredients = ingredientsMatch ? ingredientsMatch[1].trim() : ''

  // The nutrition label uses specific CSS classes

  // Serving size - look for "Serving Size" text
  const servingSizeMatch =
    html.match(/Serving Size[^<]*<\/span>\s*([^<]+)/i) ||
    html.match(/<div class="nf-right-value">([^<]+)<\/div>/i)
  const servingSize = servingSizeMatch
    ? servingSizeMatch[1].trim()
    : '1 serving'

  const caloriesMatch =
    html.match(/<span class="nf-calories-count">(\d+)<\/span>/i) ||
    html.match(/<div class="nf-calorie-count">(\d+)<\/div>/i) ||
    html.match(/Calories\s*<\/span>\s*<span[^>]*>(\d+)/i)
  const calories = caloriesMatch ? parseInt(caloriesMatch[1]) : 0

  // Helper to extract nutrient values
  const extractNutrient = (
    name: string,
    unit: string,
  ): { value: number; dv: number } => {
    // Pattern: nutrient name followed by value and optional DV
    const pattern = new RegExp(
      `${name}[^\\d]*(\\d+(?:\\.\\d+)?)\\s*${unit}[^%]*(\\d+(?:\\.\\d+)?)?\\s*%?`,
      'i',
    )
    const match = html.match(pattern)
    return {
      value: match ? parseFloat(match[1]) : 0,
      dv: match && match[2] ? parseFloat(match[2]) : 0,
    }
  }

  const totalFat = extractNutrient('Total Fat', 'g')
  const satFat = extractNutrient('Saturated Fat', 'g')
  const transFatMatch =
    html.match(/Trans\s*<\/em>\s*Fat[^\\d]*(\\d+(?:\\.\\d+)?)g/i) ||
    html.match(/Trans Fat[^\\d]*(\\d+(?:\\.\\d+)?)g/i)
  const transFat = transFatMatch ? parseFloat(transFatMatch[1]) : 0

  const cholesterol = extractNutrient('Cholesterol', 'mg')
  const sodium = extractNutrient('Sodium', 'mg')
  const totalCarbs = extractNutrient('Total Carbohydrate', 'g')
  const fiber = extractNutrient('Dietary Fiber', 'g')

  const sugarsMatch = html.match(/Total Sugars[^\\d]*(\\d+(?:\\.\\d+)?)g/i)
  const totalSugars = sugarsMatch ? parseFloat(sugarsMatch[1]) : 0

  const addedSugars = extractNutrient('Added Sugars', 'g')

  const proteinMatch = html.match(/Protein[^\\d]*(\\d+(?:\\.\\d+)?)g/i)
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
      grams: addedSugars.value,
      dailyValue: addedSugars.dv,
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
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()
  const dateStr = `${month}/${day}/${year}`

  return `${FOODPRO_BASE_URL}/shortmenu.aspx?sName=University+of+California%2c+Riverside+Dining+Services&locationNum=${locationId}&locationName=${encodeURIComponent(locationName)}&naFlag=1&WeeksMenus=This+Week%27s+Menus&myaction=read&dtdate=${encodeURIComponent(dateStr)}`
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}
