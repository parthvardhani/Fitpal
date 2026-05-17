// @ts-nocheck
/**
 * sync-from-notion.ts — scripts/sync-from-notion.ts
 * Run: npx tsx scripts/sync-from-notion.ts
 *
 * Syncs from Notion → App.tsx:
 *   - name, type, emoji, calories, macros, prepTime, tags, imageUrl
 *   - ingredients (pipe-separated: "Name | quantity | category")
 *   - steps (one per line)
 *
 * Notion columns needed:
 *   Recipe ID      → Text
 *   Name           → Title
 *   Meal Type      → Select (Breakfast/Lunch/Snack/Dinner)
 *   Emoji          → Text
 *   Calories (kcal)→ Number
 *   Protein (g)    → Number
 *   Carbs (g)      → Number
 *   Fat (g)        → Number
 *   Prep Time (min)→ Number
 *   Tags           → Multi-select
 *   Image URL      → URL
 *   Ingredients    → Text  (one per line: "Name | quantity | category")
 *   Steps          → Text  (one step per line)
 *   Status         → Select (Active/Draft/Archived)
 */

const fs   = require("fs");
const path = require("path");

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = val;
    }
  }
}

const NOTION_TOKEN = process.env.NOTION_TOKEN       || "";
const DATABASE_ID  = process.env.NOTION_DATABASE_ID || "";

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error("❌  Missing NOTION_TOKEN or NOTION_DATABASE_ID in .env");
  process.exit(1);
}

const APP_PATH = path.resolve(process.cwd(), "src/App.tsx");

// ── Notion REST API via native fetch ──────────────────────────────────────────
async function notionQuery(startCursor) {
  const body = {
    filter: { property: "Status", select: { equals: "Active" } },
    sorts: [
      { property: "Meal Type", direction: "ascending" },
      { property: "Name",      direction: "ascending" },
    ],
    page_size: 100,
  };
  if (startCursor) body.start_cursor = startCursor;

  const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
    method: "POST",
    headers: {
      "Authorization":  `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type":   "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Notion API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllPages() {
  const pages = [];
  let cursor;
  do {
    const data = await notionQuery(cursor);
    pages.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ── Property helpers ──────────────────────────────────────────────────────────
function str(prop) {
  if (!prop) return "";
  if (prop.type === "title")        return prop.title?.[0]?.plain_text    ?? "";
  if (prop.type === "rich_text")    return prop.rich_text?.[0]?.plain_text ?? "";
  if (prop.type === "url")          return prop.url                        ?? "";
  if (prop.type === "select")       return prop.select?.name               ?? "";
  if (prop.type === "number")       return prop.number                     ?? 0;
  if (prop.type === "multi_select") return prop.multi_select.map(s => s.name);
  return "";
}

// ── Parse ingredients from Notion text ───────────────────────────────────────
// Format per line: "Name | quantity | category"
// e.g. "Moong dal (split) | ½ cup | grains"
function parseIngredients(text) {
  if (!text || !text.trim()) return "[]";

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const items = lines.map(line => {
    const parts = line.split("|").map(p => p.trim());
    const n   = (parts[0] || "").replace(/"/g, '\\"');
    const q   = (parts[1] || "").replace(/"/g, '\\"');
    const cat = (parts[2] || "pantry").replace(/"/g, '\\"');
    return `      { n: "${n}", q: "${q}", cat: "${cat}" }`;
  });

  return `[\n${items.join(",\n")},\n    ]`;
}

// ── Parse steps from Notion text ─────────────────────────────────────────────
// One step per line
function parseSteps(text) {
  if (!text || !text.trim()) return "[]";

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const items = lines.map(line => {
    const escaped = line.replace(/"/g, '\\"');
    return `      "${escaped}"`;
  });

  return `[\n${items.join(",\n")},\n    ]`;
}

// ── Map Notion pages to recipe objects ───────────────────────────────────────
function parsePages(pages) {
  const map = {};
  for (const page of pages) {
    const p  = page.properties;
    const id = str(p["Recipe ID"]);
    if (!id) { console.warn("  ⚠️  Skipped — no Recipe ID:", str(p["Name"])); continue; }

    map[id] = {
      id,
      name:        str(p["Name"])             || "Unnamed",
      type:        (str(p["Meal Type"]) || "breakfast").toLowerCase(),
      emoji:       str(p["Emoji"])            || "🍽️",
      calories:    str(p["Calories (kcal)"]) || 0,
      protein:     str(p["Protein (g)"])     || 0,
      carbs:       str(p["Carbs (g)"])       || 0,
      fat:         str(p["Fat (g)"])         || 0,
      prepTime:    str(p["Prep Time (min)"]) || 0,
      tags:        str(p["Tags"])            || [],
      imageUrl:    str(p["Image URL"])       || "",
      ingredients: str(p["Ingredients"])     || "",
      steps:       str(p["Steps"])           || "",
    };
  }
  return map;
}

// ── Parse existing recipes from App.tsx (to preserve data if Notion is empty) ─
function parseExistingRecipes(source) {
  const markerMatch = source.match(
    /\/\/ ── AUTO-GENERATED-RECIPES-START[\s\S]*?const RECIPES: Recipe\[\] = \[([\s\S]*?)\];\n\/\/ ── AUTO-GENERATED-RECIPES-END/
  );
  const plainMatch = source.match(/const RECIPES: Recipe\[\] = \[([\s\S]*?)\];\n/);
  const arrayBody  = markerMatch ? markerMatch[1] : (plainMatch ? plainMatch[1] : "");

  const existing = {};
  const positions = [];
  const idPattern = /id:\s*"(\w+)"/g;
  let m;
  while ((m = idPattern.exec(arrayBody)) !== null) positions.push({ id: m[1], index: m.index });
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end   = i + 1 < positions.length ? positions[i + 1].index : arrayBody.length;
    existing[positions[i].id] = arrayBody.slice(start, end);
  }
  return existing;
}

function extractIngredientsAndSteps(block) {
  const ingMatch   = block.match(/ingredients:\s*(\[[\s\S]*?\]),\s*\n\s*steps:/);
  const stepsMatch = block.match(/steps:\s*(\[[\s\S]*?\]),\s*\n\s*\}/);
  return {
    ingredients: ingMatch   ? ingMatch[1]   : "[]",
    steps:       stepsMatch ? stepsMatch[1] : "[]",
  };
}

// ── Build one recipe entry ────────────────────────────────────────────────────
function buildEntry(r, existingBlock) {
  const tagsStr = Array.isArray(r.tags)
    ? r.tags.map(t => `"${t}"`).join(", ")
    : (r.tags ? `"${r.tags}"` : "");

  // Use Notion ingredients/steps if provided, otherwise fall back to existing code
  let ingredients, steps;

  if (r.ingredients && r.ingredients.trim()) {
    ingredients = parseIngredients(r.ingredients);
  } else if (existingBlock) {
    ingredients = extractIngredientsAndSteps(existingBlock).ingredients;
  } else {
    ingredients = "[]";
  }

  if (r.steps && r.steps.trim()) {
    steps = parseSteps(r.steps);
  } else if (existingBlock) {
    steps = extractIngredientsAndSteps(existingBlock).steps;
  } else {
    steps = "[]";
  }

  return `  {
    id: "${r.id}",
    type: "${r.type}" as const,
    name: "${r.name}",
    calories: ${r.calories},
    protein: ${r.protein},
    carbs: ${r.carbs},
    fat: ${r.fat},
    prepTime: ${r.prepTime},
    tags: [${tagsStr}],
    emoji: "${r.emoji}",
    ingredients: ${ingredients},
    steps: ${steps},
  }`;
}

function buildRecipesBlock(notionMap, existingBlocks) {
  const entries = Object.values(notionMap).map(r => buildEntry(r, existingBlocks[r.id]));
  return [
    "// ── AUTO-GENERATED-RECIPES-START (do not remove this comment) ───────────────",
    "const RECIPES: Recipe[] = [",
    entries.join(",\n"),
    "];",
    "// ── AUTO-GENERATED-RECIPES-END ───────────────────────────────────────────────",
  ].join("\n");
}

function buildPhotosBlock(notionMap) {
  const lines = Object.values(notionMap)
    .filter(r => r.imageUrl)
    .map(r => `  ${r.id}: "${r.imageUrl}", // ${r.name}`);
  return [
    "// ── AUTO-GENERATED-PHOTOS-START (do not remove this comment) ─────────────────",
    "const RECIPE_PHOTOS: Record<string, string> = {",
    ...lines,
    "};",
    "// ── AUTO-GENERATED-PHOTOS-END ─────────────────────────────────────────────────",
  ].join("\n");
}

function replaceBlock(source, startMarker, endMarker, newBlock, fallbackPattern) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx  = new RegExp(esc(startMarker) + "[\\s\\S]*?" + esc(endMarker) + "[^\\n]*");
  if (rx.test(source)) return source.replace(rx, newBlock);
  return source.replace(fallbackPattern, newBlock + "\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log("🔄  Fetching from Notion...");
  const pages     = await fetchAllPages();
  const notionMap = parsePages(pages);
  const notionIds = Object.keys(notionMap);
  console.log(`    ${notionIds.length} active recipes found`);

  if (!notionIds.length) {
    console.warn("⚠️   No active recipes — check Status = 'Active' in Notion."); return;
  }

  const source         = fs.readFileSync(APP_PATH, "utf8");
  const existingBlocks = parseExistingRecipes(source);
  const existingIds    = Object.keys(existingBlocks);
  const added          = notionIds.filter(id => !existingIds.includes(id));
  const removed        = existingIds.filter(id => !notionMap[id]);
  const withIngredients = notionIds.filter(id => notionMap[id].ingredients?.trim());
  const withSteps       = notionIds.filter(id => notionMap[id].steps?.trim());

  console.log(`    Kept: ${notionIds.length - added.length}  |  ✅ Added: ${added.length} (${added.join(", ")||"none"})  |  🗑  Removed: ${removed.length} (${removed.join(", ")||"none"})`);
  console.log(`    📋  Recipes with Notion ingredients: ${withIngredients.length}/${notionIds.length}`);
  console.log(`    📋  Recipes with Notion steps: ${withSteps.length}/${notionIds.length}`);

  let updated = replaceBlock(
    source,
    "// ── AUTO-GENERATED-RECIPES-START (do not remove this comment) ───────────────",
    "// ── AUTO-GENERATED-RECIPES-END ───────────────────────────────────────────────",
    buildRecipesBlock(notionMap, existingBlocks),
    /const RECIPES: Recipe\[\] = \[[\s\S]*?\];\n/
  );
  updated = replaceBlock(
    updated,
    "// ── AUTO-GENERATED-PHOTOS-START (do not remove this comment) ─────────────────",
    "// ── AUTO-GENERATED-PHOTOS-END ─────────────────────────────────────────────────",
    buildPhotosBlock(notionMap),
    /const RECIPE_PHOTOS: Record<string, string> = \{[\s\S]*?\};\n/
  );

  fs.writeFileSync(APP_PATH, updated, "utf8");
  console.log("✅  App.tsx updated — " + new Date().toLocaleTimeString());

  if (added.length) {
    console.log("\n  📝  New recipes added:");
    added.forEach(id => {
      const r = notionMap[id];
      const hasData = r.ingredients?.trim() && r.steps?.trim();
      console.log(`      → ${id}: ${r.name} ${hasData ? "✅ (has ingredients & steps)" : "⚠️  (fill in Ingredients & Steps in Notion)"}`);
    });
  }
})().catch(e => {
  console.error("❌  Error:", e.message);
  process.exit(1);
});