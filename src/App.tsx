import { useState, useEffect } from "react";
import {
  Home,
  BookOpen,
  BarChart2,
  ShoppingCart,
  Package,
  Check,
  Search,
  Heart,
  X,
  ChevronLeft,
  Repeat2,
  Trash2,
  Plus,
  Sparkles,
  LogOut,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { createClient, User } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      flowType: 'implicit',
    }
  }
);

async function fsSet(uid: string, key: string, val: unknown): Promise<void> {
  try {
    await supabase
      .from("user_data")
      .upsert({ uid, [key]: JSON.stringify(val) }, { onConflict: "uid" });
  } catch {}
}

async function fsGet<T>(uid: string, key: string, fallback: T): Promise<T> {
  try {
    const { data } = (await Promise.race([
      supabase.from("user_data").select(key).eq("uid", uid).single(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      ),
    ])) as { data: Record<string, string> | null };
    return data?.[key] ? JSON.parse(data[key]) : fallback;
  } catch {}
  return fallback;
}

// ── TYPES ─────────────────────────────────────────────────────────────────────
type MealType = "breakfast" | "lunch" | "snack" | "dinner";
type Goal = "bulk" | "cut" | "maintain";
type Activity = "sedentary" | "moderate" | "active";
type Gender = "male" | "female";
type Category = "vegetables" | "dairy" | "grains" | "spices" | "pantry";

interface Ingredient {
  n: string;
  q: string;
  cat: Category;
}

interface Recipe {
  id: string;
  type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  tags: string[];
  emoji: string;
  ingredients: Ingredient[];
  steps: string[];
}

interface Profile {
  goal: Goal;
  activity: Activity;
  vegan: boolean;
  allergies: string[];
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  calorieTarget: number;
  calorieOverride?: number;
}

type Plan = Record<MealType, Recipe>;
type Consumed = Record<MealType, boolean>;

interface PantryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  cat: Category;
  low: number;
}

interface GroceryItem {
  id: string;
  name: string;
  qty: string;
  cat: Category;
  checked: boolean;
}

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styleEl = document.createElement("style");
styleEl.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body,html,#root{height:100%;background:#F5EFE6}
  :root{
    --green:#3A6B35;--green-d:#244220;--green-l:#E8F4E7;
    --orange:#E07A3F;--bg:#F5EFE6;--card:#FFFBF6;
    --text:#1E2D1B;--muted:#7B8C79;--border:#E2DDD5;
    --red:#D94F4F;--r:16px;
  }
  .serif{font-family:'Playfair Display',serif}
  .app{font-family:'DM Sans',sans-serif;max-width:430px;margin:0 auto;min-height:100vh;background:var(--bg)}
  .card{background:var(--card);border-radius:var(--r);box-shadow:0 2px 12px rgba(30,45,27,.07)}
  .btn{border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;border-radius:12px;transition:all .18s}
  .btn-primary{background:var(--green);color:#fff;padding:14px 24px;font-size:15px}
  .btn-primary:active{background:var(--green-d)}
  .btn-outline{background:transparent;border:1.5px solid var(--border);color:var(--text);padding:10px 18px;font-size:14px}
  .tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;background:var(--green-l);color:var(--green)}
  .tab-bar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--card);border-top:1px solid var(--border);display:flex;box-shadow:0 -4px 20px rgba(0,0,0,.08);z-index:100;padding-bottom:env(safe-area-inset-bottom,0px)}
  .tab-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;cursor:pointer;gap:3px;background:none;border:none;font-family:'DM Sans',sans-serif}
  .tab-item span{font-size:10px;font-weight:500;color:var(--muted)}
  .tab-item.active span{color:var(--green)}
  .screen{padding:0 0 90px;min-height:100vh}
  .macro-bar{height:8px;border-radius:8px;background:var(--border);overflow:hidden;margin-bottom:6px}
  .macro-fill{height:100%;border-radius:8px;transition:width .5s ease}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s}
  .modal-sheet{background:var(--card);border-radius:24px 24px 0 0;max-width:430px;width:100%;max-height:88vh;overflow-y:auto;animation:slideUp .3s ease}
  .search-bar{display:flex;align-items:center;gap:10px;background:var(--card);border-radius:14px;padding:12px 16px;border:1.5px solid var(--border)}
  .search-bar input{border:none;background:none;flex:1;font-size:15px;color:var(--text);outline:none;font-family:'DM Sans',sans-serif}
  .chip{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:500;border:1.5px solid var(--border);cursor:pointer;white-space:nowrap;background:var(--card)}
  .chip.active{background:var(--green-l);border-color:var(--green);color:var(--green)}
  .qty-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--card);font-weight:700;font-size:16px;line-height:1}
  .low-stock{border:1.5px solid #FEE2E2;background:#FFF5F5}
  .onboard-dot{width:8px;height:8px;border-radius:50%;display:inline-block;transition:all .3s}
  .onboard-dot.active{width:22px;border-radius:4px}
  .pill{padding:8px 16px;border-radius:20px;border:1.5px solid var(--border);cursor:pointer;font-size:14px;font-weight:500;transition:all .15s;background:var(--card)}
  .skeleton{background:linear-gradient(90deg,#e8e0d6 25%,#f0e9e0 50%,#e8e0d6 75%);background-size:800px 100%;animation:shimmer 1.5s infinite;border-radius:8px}
  input[type=range]{accent-color:var(--green);width:100%}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .slide-in{animation:slideIn .3s ease}
  .fade-in{animation:fadeIn .3s ease}
`;
document.head.appendChild(styleEl);

// ── DATA ──────────────────────────────────────────────────────────────────────
// ── AUTO-GENERATED-RECIPES-START (do not remove this comment) ───────────────
const RECIPES: Recipe[] = [
  {
    id: "r16",
    type: "breakfast" as const,
    name: "Besan Cheela",
    calories: 300,
    protein: 16,
    carbs: 34,
    fat: 9,
    prepTime: 10,
    tags: ["high-protein, vegan, gluten-free, quick"],
    emoji: "🥞",
    ingredients: [
      { n: "Besan (gram flour)", q: "1 cup", cat: "grains" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Turmeric", q: "¼ tsp", cat: "spices" },
      { n: "Ajwain", q: "½ tsp", cat: "spices" },
      { n: "Oil", q: "1 tsp", cat: "pantry" },
    ],
    steps: [
      "Mix besan with water to form a smooth pourable batter.",
      "Add chopped onion, tomato, chilli, turmeric, ajwain and salt.",
      "Heat non-stick pan and grease lightly.",
      "Pour a ladle of batter and spread like a pancake.",
      "Cook 3 min on each side until golden. Serve with green chutney.",
    ],
  },
  {
    id: "r18",
    type: "breakfast" as const,
    name: "Dalia Paneer Upma",
    calories: 380,
    protein: 22,
    carbs: 44,
    fat: 11,
    prepTime: 25,
    tags: ["high-protein, filling, north-indian"],
    emoji: "🥘",
    ingredients: [
      { n: "Broken wheat (dalia)", q: "½ cup", cat: "grains" },
      { n: "Paneer (cubed)", q: "100g", cat: "dairy" },
      { n: "Mixed vegetables", q: "½ cup", cat: "vegetables" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Cumin seeds", q: "1 tsp", cat: "spices" },
      { n: "Ghee", q: "1 tsp", cat: "dairy" },
    ],
    steps: [
      "Dry roast dalia until fragrant, set aside.",
      "Heat ghee, add cumin, sauté onion golden.",
      "Add vegetables and paneer, cook 3 min.",
      "Add roasted dalia and 2 cups water.",
      "Pressure cook 2 whistles or simmer 15 min. Season with salt and lemon.",
    ],
  },
  {
    id: "r21",
    type: "breakfast" as const,
    name: "Moong Dal Paneer Chilla",
    calories: 340,
    protein: 24,
    carbs: 30,
    fat: 12,
    prepTime: 20,
    tags: ["high-protein, filling, keto-friendly"],
    emoji: "🥙",
    ingredients: [
      { n: "Moong dal (soaked)", q: "½ cup", cat: "grains" },
      { n: "Paneer (grated)", q: "80g", cat: "dairy" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Ginger", q: "½ inch", cat: "spices" },
      { n: "Cumin seeds", q: "½ tsp", cat: "spices" },
      { n: "Coriander leaves", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Grind soaked moong dal to smooth batter.",
      "Mix in grated paneer, chilli, ginger, cumin, salt.",
      "Heat pan, spread batter thin, cook 3 min each side.",
      "The paneer makes it extra crispy and protein-rich.",
      "Serve with mint chutney or yogurt dip.",
    ],
  },
  {
    id: "r3",
    type: "breakfast" as const,
    name: "Paneer Paratha",
    calories: 420,
    protein: 22,
    carbs: 45,
    fat: 16,
    prepTime: 20,
    tags: ["high-protein, filling"],
    emoji: "🫔",
    ingredients: [
      { n: "Whole wheat flour", q: "1 cup", cat: "grains" },
      { n: "Paneer (crumbled)", q: "100g", cat: "dairy" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Garam masala", q: "¼ tsp", cat: "spices" },
      { n: "Ghee", q: "1 tsp", cat: "dairy" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Knead flour with water, rest 15 min.",
      "Mix paneer with chilli, garam masala, coriander, salt.",
      "Roll dough, place filling in centre, seal and re-roll.",
      "Cook on hot tawa with ghee until golden on both sides.",
      "Serve with yogurt or pickle.",
    ],
  },
  {
    id: "r4",
    type: "breakfast" as const,
    name: "Peanut Butter Banana Smoothie",
    calories: 350,
    protein: 14,
    carbs: 52,
    fat: 11,
    prepTime: 5,
    tags: ["quick, vegan, no-cook"],
    emoji: "🥤",
    ingredients: [
      { n: "Banana", q: "2 medium", cat: "vegetables" },
      { n: "Peanut butter", q: "2 tbsp", cat: "pantry" },
      { n: "Milk / Soy milk", q: "1.5 cups", cat: "dairy" },
      { n: "Flaxseeds", q: "1 tbsp", cat: "pantry" },
      { n: "Honey", q: "1 tsp", cat: "pantry" },
    ],
    steps: [
      "Add all ingredients into a blender.",
      "Blend until smooth (~60 sec).",
      "Add ice and blend briefly if desired.",
      "Pour and serve immediately.",
    ],
  },
  {
    id: "r17",
    type: "breakfast" as const,
    name: "Quinoa Upma",
    calories: 340,
    protein: 14,
    carbs: 50,
    fat: 8,
    prepTime: 20,
    tags: ["high-protein, vegan, gluten-free, superfood"],
    emoji: "🌾",
    ingredients: [
      { n: "Quinoa", q: "½ cup", cat: "grains" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Carrot", q: "1", cat: "vegetables" },
      { n: "Green peas", q: "¼ cup", cat: "vegetables" },
      { n: "Mustard seeds", q: "½ tsp", cat: "spices" },
      { n: "Curry leaves", q: "6-8", cat: "spices" },
      { n: "Roasted peanuts", q: "2 tbsp", cat: "pantry" },
    ],
    steps: [
      "Rinse quinoa well, dry roast 2 min, set aside.",
      "Heat oil, add mustard seeds and curry leaves.",
      "Add onion, sauté 3 min. Add carrot and peas.",
      "Add quinoa and 1.5 cups water, bring to boil.",
      "Simmer 15 min until cooked. Top with peanuts and lemon juice.",
    ],
  },
  {
    id: "r17b",
    type: "breakfast" as const,
    name: "Ragi Uttapam",
    calories: 290,
    protein: 10,
    carbs: 46,
    fat: 7,
    prepTime: 15,
    tags: ["vegan, gluten-free, south-indian"],
    emoji: "🫓",
    ingredients: [
      { n: "Ragi flour", q: "½ cup", cat: "grains" },
      { n: "Rice flour", q: "¼ cup", cat: "grains" },
      { n: "Buttermilk", q: "1 cup", cat: "dairy" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Mix ragi and rice flour with buttermilk, salt, and a pinch of baking soda.",
      "Rest batter 5 min.",
      "Pour thick batter on a hot tawa.",
      "Scatter chopped onion, tomato, chilli and coriander on top.",
      "Cook 3 min, flip, cook 2 min more. Serve with sambar or coconut chutney.",
    ],
  },
  {
    id: "r41",
    type: "breakfast" as const,
    name: "Sabudana Khichdi",
    calories: 380,
    protein: 6,
    carbs: 70,
    fat: 10,
    prepTime: 20,
    tags: ["vegan, fasting-friendly, maharashtrian"],
    emoji: "🫧",
    ingredients: [
      { n: "Sabudana (tapioca pearls)", q: "¾ cup", cat: "grains" },
      { n: "Roasted peanuts (crushed)", q: "¼ cup", cat: "pantry" },
      { n: "Potato", q: "1 medium", cat: "vegetables" },
      { n: "Green chilli", q: "2", cat: "vegetables" },
      { n: "Cumin seeds", q: "1 tsp", cat: "spices" },
      { n: "Ghee", q: "1 tbsp", cat: "dairy" },
      { n: "Lemon juice", q: "1 tbsp", cat: "vegetables" },
    ],
    steps: [
      "Soak sabudana in water 4-6 hrs until soft. Drain completely.",
      "Boil and cube potato. Crush peanuts coarsely.",
      "Heat ghee, add cumin, then diced potato. Cook 3 min.",
      "Add sabudana, chilli, peanuts, salt. Mix gently.",
      "Cook 5-7 min stirring until translucent. Finish with lemon juice.",
    ],
  },
  {
    id: "r19",
    type: "breakfast" as const,
    name: "Soya Poha",
    calories: 360,
    protein: 20,
    carbs: 46,
    fat: 9,
    prepTime: 15,
    tags: ["high-protein, quick, maharashtrian"],
    emoji: "🍱",
    ingredients: [
      { n: "Thick poha (flattened rice)", q: "1 cup", cat: "grains" },
      { n: "Soya granules", q: "¼ cup", cat: "pantry" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Mustard seeds + curry leaves", q: "½ tsp each", cat: "spices" },
      { n: "Turmeric", q: "¼ tsp", cat: "spices" },
      { n: "Roasted peanuts", q: "2 tbsp", cat: "pantry" },
    ],
    steps: [
      "Soak soya granules in hot water 10 min, squeeze out water.",
      "Rinse poha and let drain.",
      "Heat oil, add mustard and curry leaves, sauté onion.",
      "Add soya granules, poha, turmeric, salt. Mix gently.",
      "Toss in peanuts, squeeze lemon, garnish with coriander.",
    ],
  },
  {
    id: "r22",
    type: "breakfast" as const,
    name: "Sprouted Moong Salad",
    calories: 210,
    protein: 15,
    carbs: 30,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein, vegan, no-cook, raw"],
    emoji: "🌱",
    ingredients: [
      { n: "Sprouted moong beans", q: "1.5 cups", cat: "vegetables" },
      { n: "Cucumber", q: "½", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      { n: "Onion", q: "¼", cat: "vegetables" },
      { n: "Lemon juice", q: "2 tbsp", cat: "vegetables" },
      { n: "Chaat masala", q: "½ tsp", cat: "spices" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Rinse and drain sprouted moong.",
      "Dice cucumber, tomato, and onion finely.",
      "Mix everything together in a large bowl.",
      "Season with chaat masala, black salt, and lemon juice.",
      "Toss well and serve immediately for maximum crunch.",
    ],
  },
  {
    id: "r43",
    type: "breakfast" as const,
    name: "Tofu Bhurji Toast",
    calories: 360,
    protein: 22,
    carbs: 38,
    fat: 14,
    prepTime: 10,
    tags: ["high-protein, vegan, fusion, quick"],
    emoji: "🍳",
    ingredients: [
      { n: "Firm tofu", q: "200g", cat: "dairy" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Capsicum", q: "½", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      { n: "Turmeric + cumin powder", q: "½ tsp each", cat: "spices" },
      { n: "Whole wheat bread", q: "2 slices", cat: "grains" },
    ],
    steps: [
      "Crumble tofu finely with your hands.",
      "Sauté onion 2 min, add capsicum and tomato.",
      "Add turmeric, cumin powder, and salt. Cook 2 min.",
      "Add crumbled tofu, mix well and cook 4 min.",
      "Toast bread, top generously with tofu bhurji. Serve hot.",
    ],
  },
  {
    id: "r47",
    type: "lunch" as const,
    name: "Aloo Gobi Sabzi + Roti",
    calories: 420,
    protein: 11,
    carbs: 66,
    fat: 12,
    prepTime: 25,
    tags: ["classic, vegan, punjabi"],
    emoji: "🥔",
    ingredients: [
      { n: "Potato", q: "2 medium", cat: "vegetables" },
      { n: "Cauliflower", q: "½ head", cat: "vegetables" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Tomato", q: "2", cat: "vegetables" },
      { n: "Cumin + coriander + garam masala", q: "1 tsp each", cat: "spices" },
      { n: "Whole wheat roti", q: "3", cat: "grains" },
    ],
    steps: [
      "Cut potato and cauliflower into florets. Par-boil potato 5 min.",
      "Heat oil, add cumin seeds. Sauté onion golden.",
      "Add tomatoes and all spices, cook until oil separates.",
      "Add potato and cauliflower. Cover and cook 15 min.",
      "Finish with coriander leaves. Serve with hot roti.",
    ],
  },
  {
    id: "r6",
    type: "lunch" as const,
    name: "Chana Masala",
    calories: 440,
    protein: 21,
    carbs: 68,
    fat: 9,
    prepTime: 25,
    tags: ["high-protein, vegan, spicy"],
    emoji: "🥘",
    ingredients: [
      { n: "Chickpeas (boiled)", q: "1.5 cups", cat: "grains" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Chana masala powder", q: "2 tsp", cat: "spices" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Sauté onions in oil until deep golden.",
      "Add ginger-garlic paste, cook 2 min.",
      "Add pureed tomatoes, cook until oil separates.",
      "Add spices, then chickpeas and 1 cup water.",
      "Simmer 15 min, garnish with coriander and lemon.",
    ],
  },
  {
    id: "r50",
    type: "lunch" as const,
    name: "Chole Kulche",
    calories: 560,
    protein: 20,
    carbs: 84,
    fat: 14,
    prepTime: 30,
    tags: ["street-food, high-protein, north-indian"],
    emoji: "🫓",
    ingredients: [
      { n: "Chickpeas (boiled)", q: "1.5 cups", cat: "grains" },
      { n: "Kulche / naan", q: "2", cat: "grains" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "3", cat: "vegetables" },
      { n: "Amchur + anardana powder", q: "1 tsp each", cat: "spices" },
      { n: "Chole masala", q: "2 tsp", cat: "spices" },
    ],
    steps: [
      "Deep-cook onions until dark brown. Add ginger-garlic paste.",
      "Add blended tomatoes, chole masala, cook until thick.",
      "Add chickpeas with ½ cup water, simmer 20 min.",
      "Finish with amchur and anardana for tanginess.",
      "Toast kulche on tawa with butter. Serve chole alongside.",
    ],
  },
  {
    id: "r5",
    type: "lunch" as const,
    name: "Dal Tadka + Brown Rice",
    calories: 480,
    protein: 24,
    carbs: 72,
    fat: 10,
    prepTime: 30,
    tags: ["high-protein, vegan, classic"],
    emoji: "🍲",
    ingredients: [
      { n: "Toor/arhar dal", q: "½ cup", cat: "grains" },
      { n: "Brown rice", q: "½ cup", cat: "grains" },
      { n: "Tomato", q: "2", cat: "vegetables" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Ghee", q: "1 tbsp", cat: "dairy" },
      { n: "Cumin seeds", q: "1 tsp", cat: "spices" },
      { n: "Turmeric + chilli powder", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Pressure cook dal with tomatoes and turmeric (3-4 whistles).",
      "Cook brown rice 1:2 water ratio.",
      "Heat ghee, add cumin, sauté onions golden.",
      "Add tomatoes and spices, cook till oil separates.",
      "Pour tadka over dal, serve over rice.",
    ],
  },
  {
    id: "r24",
    type: "lunch" as const,
    name: "Kala Chana Masala",
    calories: 420,
    protein: 22,
    carbs: 62,
    fat: 8,
    prepTime: 30,
    tags: ["high-protein, vegan, iron-rich"],
    emoji: "🫘",
    ingredients: [
      { n: "Kala chana", q: "¾ cup dry", cat: "grains" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Amchur powder", q: "½ tsp", cat: "spices" },
      { n: "Chana masala", q: "2 tsp", cat: "spices" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
    ],
    steps: [
      "Soak kala chana overnight, pressure cook 6 whistles.",
      "Sauté onions until deep golden.",
      "Add ginger-garlic paste and tomatoes, cook till oil separates.",
      "Add all spices, then cooked chana.",
      "Simmer 10 min, finish with amchur and coriander.",
    ],
  },
  {
    id: "r27",
    type: "lunch" as const,
    name: "Lobia Masala",
    calories: 400,
    protein: 20,
    carbs: 62,
    fat: 7,
    prepTime: 30,
    tags: ["high-protein, vegan, protein-rich"],
    emoji: "🫘",
    ingredients: [
      { n: "Lobia (black-eyed peas)", q: "¾ cup dry", cat: "grains" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Coriander + cumin powder", q: "1 tsp each", cat: "spices" },
      { n: "Kasuri methi", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Soak lobia 4-6 hrs, pressure cook 4 whistles.",
      "Sauté onions golden in oil. Add ginger-garlic paste.",
      "Add tomatoes, cook until oil separates. Add all spices.",
      "Add cooked lobia with water. Simmer 12 min.",
      "Garnish with kasuri methi and fresh coriander.",
    ],
  },
  {
    id: "r25",
    type: "lunch" as const,
    name: "Matar Paneer",
    calories: 460,
    protein: 26,
    carbs: 42,
    fat: 18,
    prepTime: 25,
    tags: ["high-protein, classic, north-indian"],
    emoji: "🟢",
    ingredients: [
      { n: "Paneer", q: "200g", cat: "dairy" },
      { n: "Green peas", q: "1 cup", cat: "vegetables" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Cashew paste", q: "2 tbsp", cat: "pantry" },
      { n: "Garam masala + coriander powder", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Blend onion and tomato to a smooth puree.",
      "Fry puree in oil until it thickens and oil separates.",
      "Add cashew paste and all spices, cook 3 min.",
      "Add peas and ¾ cup water, simmer 5 min.",
      "Add paneer cubes, cook 5 more min. Serve with roti or naan.",
    ],
  },
  {
    id: "r29",
    type: "lunch" as const,
    name: "Mixed Dal Khichdi",
    calories: 450,
    protein: 22,
    carbs: 68,
    fat: 9,
    prepTime: 25,
    tags: ["high-protein, comfort-food, vegan, one-pot"],
    emoji: "🍲",
    ingredients: [
      { n: "Rice", q: "½ cup", cat: "grains" },
      {
        n: "Mixed dals (toor, moong, masoor)",
        q: "½ cup total",
        cat: "grains",
      },
      { n: "Ghee", q: "1 tbsp", cat: "dairy" },
      { n: "Cumin seeds + bay leaf", q: "1 tsp + 1", cat: "spices" },
      { n: "Turmeric + salt", q: "½ tsp each", cat: "spices" },
      { n: "Curd / raita", q: "½ cup", cat: "dairy" },
    ],
    steps: [
      "Wash rice and dals together 2-3 times.",
      "Heat ghee, add cumin and bay leaf.",
      "Add rice and dals, sauté 2 min.",
      "Add 3 cups water, turmeric, salt. Pressure cook 3 whistles.",
      "Serve with curd and a drizzle of ghee on top.",
    ],
  },
  {
    id: "r48",
    type: "lunch" as const,
    name: "Moong Dal Soup + Rice",
    calories: 390,
    protein: 22,
    carbs: 58,
    fat: 7,
    prepTime: 20,
    tags: ["high-protein, vegan, light, easy"],
    emoji: "🍵",
    ingredients: [
      { n: "Yellow moong dal", q: "½ cup", cat: "grains" },
      { n: "Brown rice", q: "¼ cup", cat: "grains" },
      { n: "Spinach", q: "1 cup", cat: "vegetables" },
      { n: "Garlic", q: "4 cloves", cat: "spices" },
      { n: "Ginger", q: "1 inch", cat: "spices" },
      { n: "Cumin seeds + turmeric", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Pressure cook moong dal with turmeric and garlic (3 whistles).",
      "Cook brown rice separately.",
      "Blend half the dal for a creamy texture. Stir back.",
      "Add spinach and ginger, simmer 5 min.",
      "Season with salt, cumin tadka. Serve dal soup alongside rice.",
    ],
  },
  {
    id: "r49",
    type: "lunch" as const,
    name: "Paneer & Spinach Wrap",
    calories: 470,
    protein: 28,
    carbs: 48,
    fat: 18,
    prepTime: 15,
    tags: ["high-protein, quick, fusion"],
    emoji: "🌯",
    ingredients: [
      { n: "Paneer", q: "150g", cat: "dairy" },
      { n: "Spinach leaves", q: "1 cup", cat: "vegetables" },
      { n: "Whole wheat roti", q: "2", cat: "grains" },
      { n: "Hung curd", q: "3 tbsp", cat: "dairy" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Chaat masala", q: "½ tsp", cat: "spices" },
      { n: "Green chutney", q: "2 tbsp", cat: "pantry" },
    ],
    steps: [
      "Slice paneer and pan-grill until golden on both sides.",
      "Mix hung curd with chaat masala and salt.",
      "Warm roti on tawa.",
      "Spread green chutney, then curd mix on roti.",
      "Layer spinach, paneer slices and sliced onion. Roll tight and serve.",
    ],
  },
  {
    id: "r7",
    type: "lunch" as const,
    name: "Paneer Bhurji Bowl",
    calories: 520,
    protein: 32,
    carbs: 38,
    fat: 22,
    prepTime: 20,
    tags: ["high-protein, quick"],
    emoji: "🧆",
    ingredients: [
      { n: "Paneer", q: "200g", cat: "dairy" },
      { n: "Capsicum", q: "1", cat: "vegetables" },
      { n: "Onion", q: "1 large", cat: "vegetables" },
      { n: "Tomato", q: "2", cat: "vegetables" },
      { n: "Cumin + turmeric + garam masala", q: "1 tsp each", cat: "spices" },
      { n: "Roti", q: "2", cat: "grains" },
    ],
    steps: [
      "Crumble paneer and set aside.",
      "Heat oil, add cumin, sauté onions.",
      "Add capsicum, cook 2 min, add tomatoes.",
      "Add all spices, mix well.",
      "Add paneer, toss gently, cook 4 min.",
      "Serve with roti or over rice.",
    ],
  },
  {
    id: "r28",
    type: "lunch" as const,
    name: "Paneer Tikka Masala",
    calories: 540,
    protein: 34,
    carbs: 36,
    fat: 24,
    prepTime: 35,
    tags: ["high-protein, restaurant-style, indulgent"],
    emoji: "🔥",
    ingredients: [
      { n: "Paneer", q: "250g", cat: "dairy" },
      { n: "Onion", q: "2 large", cat: "vegetables" },
      { n: "Tomatoes", q: "3", cat: "vegetables" },
      { n: "Fresh cream", q: "3 tbsp", cat: "dairy" },
      { n: "Tikka masala powder", q: "2 tsp", cat: "spices" },
      { n: "Kashmiri chilli powder", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Marinate paneer in curd + tikka masala + salt, rest 20 min.",
      "Grill or pan-fry paneer until charred.",
      "Blend onion and tomatoes to smooth sauce and cook until thick.",
      "Add cream and spices, simmer 5 min.",
      "Add grilled paneer, cook 5 min. Serve with naan or jeera rice.",
    ],
  },
  {
    id: "r26",
    type: "lunch" as const,
    name: "Quinoa Khichdi",
    calories: 430,
    protein: 20,
    carbs: 58,
    fat: 10,
    prepTime: 25,
    tags: ["high-protein, vegan, one-pot, gluten-free"],
    emoji: "🫕",
    ingredients: [
      { n: "Quinoa", q: "½ cup", cat: "grains" },
      { n: "Moong dal (yellow)", q: "¼ cup", cat: "grains" },
      { n: "Mixed vegetables", q: "1 cup", cat: "vegetables" },
      { n: "Ghee", q: "1 tbsp", cat: "dairy" },
      { n: "Cumin + turmeric + asafoetida", q: "1 tsp each", cat: "spices" },
      { n: "Ginger", q: "1 inch", cat: "spices" },
    ],
    steps: [
      "Rinse quinoa and dal together.",
      "Heat ghee, add cumin and asafoetida.",
      "Add vegetables, sauté 2 min.",
      "Add quinoa, dal, turmeric, ginger and 2.5 cups water.",
      "Pressure cook 2 whistles. Serve with curd and pickle.",
    ],
  },
  {
    id: "r8",
    type: "lunch" as const,
    name: "Rajma Chawal",
    calories: 500,
    protein: 22,
    carbs: 80,
    fat: 8,
    prepTime: 35,
    tags: ["high-protein, vegan, classic"],
    emoji: "🍛",
    ingredients: [
      { n: "Rajma (kidney beans)", q: "½ cup dried", cat: "grains" },
      { n: "Rice", q: "½ cup", cat: "grains" },
      { n: "Onion", q: "1 large", cat: "vegetables" },
      { n: "Tomatoes", q: "3", cat: "vegetables" },
      { n: "Rajma masala", q: "2 tsp", cat: "spices" },
    ],
    steps: [
      "Soak rajma overnight, pressure cook 6-8 whistles.",
      "Sauté onions golden, add ginger-garlic paste.",
      "Add tomatoes, cook until mushy. Add masala and salt.",
      "Add rajma with water, simmer 20 min.",
      "Serve over fluffy rice.",
    ],
  },
  {
    id: "r51",
    type: "lunch" as const,
    name: "Rava Dhokla",
    calories: 290,
    protein: 12,
    carbs: 46,
    fat: 7,
    prepTime: 25,
    tags: ["vegan, gujarati, steamed, light"],
    emoji: "🟨",
    ingredients: [
      { n: "Semolina (suji)", q: "1 cup", cat: "grains" },
      { n: "Curd", q: "½ cup", cat: "dairy" },
      { n: "Eno fruit salt", q: "1 tsp", cat: "pantry" },
      { n: "Mustard seeds + curry leaves", q: "½ tsp each", cat: "spices" },
      { n: "Green chilli", q: "2", cat: "vegetables" },
      { n: "Sesame seeds", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Mix suji with curd, salt, green chilli paste and water. Rest 15 min.",
      "Just before steaming, add eno and mix gently.",
      "Pour into greased plate, steam 12-15 min until firm.",
      "Temper mustard, curry leaves and sesame in oil. Pour over dhokla.",
      "Cut into squares. Serve with green chutney.",
    ],
  },
  {
    id: "r23",
    type: "lunch" as const,
    name: "Soya Chunks Curry",
    calories: 490,
    protein: 38,
    carbs: 48,
    fat: 11,
    prepTime: 25,
    tags: ["highest-protein, vegan, muscle-gain"],
    emoji: "💪",
    ingredients: [
      { n: "Soya chunks", q: "1 cup dry", cat: "pantry" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Curd", q: "3 tbsp", cat: "dairy" },
      { n: "Garam masala + coriander powder", q: "1 tsp each", cat: "spices" },
      { n: "Rice / Roti", q: "1 cup / 2 pcs", cat: "grains" },
    ],
    steps: [
      "Boil soya chunks 5 min, drain and squeeze out water.",
      "Sauté onions golden, add ginger-garlic paste.",
      "Add tomatoes, cook until mushy. Add spices and curd.",
      "Cook 3 min, add soya chunks and ½ cup water.",
      "Simmer 10 min. Serve with rice or roti.",
    ],
  },
  {
    id: "r52",
    type: "lunch" as const,
    name: "Stuffed Capsicum",
    calories: 380,
    protein: 18,
    carbs: 44,
    fat: 14,
    prepTime: 30,
    tags: ["high-protein, baked, creative"],
    emoji: "🫑",
    ingredients: [
      { n: "Capsicum (large, halved)", q: "3", cat: "vegetables" },
      { n: "Paneer (crumbled)", q: "150g", cat: "dairy" },
      { n: "Corn kernels", q: "½ cup", cat: "vegetables" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Cooked rice", q: "½ cup", cat: "grains" },
      { n: "Biryani masala", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Halve capsicums, remove seeds. Rub with oil and bake 10 min at 200°C.",
      "Sauté onion, add paneer, corn, rice and masala. Cook 5 min.",
      "Fill capsicum halves generously with mixture.",
      "Bake 15 min until capsicum softens.",
      "Serve warm with coriander chutney.",
    ],
  },
  {
    id: "r46",
    type: "lunch" as const,
    name: "Vegetable Biryani",
    calories: 520,
    protein: 14,
    carbs: 82,
    fat: 14,
    prepTime: 45,
    tags: ["festive, vegan, one-pot, aromatic"],
    emoji: "🍚",
    ingredients: [
      { n: "Basmati rice", q: "¾ cup", cat: "grains" },
      {
        n: "Mixed vegetables (potato, carrot, peas)",
        q: "2 cups",
        cat: "vegetables",
      },
      { n: "Onion (fried golden)", q: "2 large", cat: "vegetables" },
      { n: "Whole spices (bay leaf, cardamom)", q: "2-3 each", cat: "spices" },
      { n: "Biryani masala", q: "2 tsp", cat: "spices" },
      { n: "Saffron + warm milk", q: "pinch + 3 tbsp", cat: "dairy" },
      { n: "Ghee", q: "2 tbsp", cat: "dairy" },
    ],
    steps: [
      "Par-cook soaked basmati rice to 70%. Set aside.",
      "Sauté whole spices, add onion until deep golden.",
      "Add vegetables and biryani masala, cook 5 min.",
      "Layer rice over vegetable gravy in a heavy pot.",
      "Pour saffron milk and ghee on top. Cover tight, cook 20 min on low (dum).",
    ],
  },
  {
    id: "r33",
    type: "snack" as const,
    name: "Boiled Chana Salad",
    calories: 190,
    protein: 13,
    carbs: 30,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein, vegan, no-cook"],
    emoji: "🥗",
    ingredients: [
      { n: "Kala / kabuli chana (boiled)", q: "1 cup", cat: "grains" },
      { n: "Onion", q: "½", cat: "vegetables" },
      { n: "Cucumber", q: "½", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      { n: "Lemon juice", q: "2 tbsp", cat: "vegetables" },
      { n: "Cumin powder + chilli", q: "½ tsp each", cat: "spices" },
    ],
    steps: [
      "Mix all chopped vegetables with boiled chana in a bowl.",
      "Season with cumin powder, chilli, black salt, and lemon juice.",
      "Toss well and garnish with coriander.",
      "Eat fresh for maximum crunch.",
    ],
  },
  {
    id: "r31",
    type: "snack" as const,
    name: "Dahi Chana Chaat",
    calories: 200,
    protein: 14,
    carbs: 28,
    fat: 4,
    prepTime: 5,
    tags: ["high-protein, no-cook, quick, probiotic"],
    emoji: "🫙",
    ingredients: [
      { n: "Boiled chickpeas", q: "¾ cup", cat: "grains" },
      { n: "Thick curd", q: "½ cup", cat: "dairy" },
      { n: "Tamarind chutney", q: "1 tsp", cat: "pantry" },
      { n: "Chaat masala", q: "½ tsp", cat: "spices" },
      { n: "Onion", q: "¼", cat: "vegetables" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Place chickpeas in a bowl.",
      "Spoon thick curd generously on top.",
      "Drizzle a little tamarind chutney.",
      "Sprinkle chaat masala, garnish with onion and coriander. Serve immediately.",
    ],
  },
  {
    id: "r58",
    type: "snack" as const,
    name: "Peanut Butter Apple Slices",
    calories: 200,
    protein: 7,
    carbs: 26,
    fat: 9,
    prepTime: 3,
    tags: ["no-cook, quick, vegan, sweet"],
    emoji: "🍎",
    ingredients: [
      { n: "Apple", q: "1 large", cat: "vegetables" },
      { n: "Peanut butter", q: "2 tbsp", cat: "pantry" },
      { n: "Cinnamon", q: "pinch", cat: "spices" },
      { n: "Pumpkin seeds", q: "1 tsp", cat: "pantry" },
    ],
    steps: [
      "Core and slice apple into thin rounds or wedges.",
      "Arrange on a plate.",
      "Dollop peanut butter on each slice.",
      "Sprinkle cinnamon and pumpkin seeds on top.",
      "Eat immediately for best texture.",
    ],
  },
  {
    id: "r54",
    type: "snack" as const,
    name: "Roasted Chana",
    calories: 160,
    protein: 10,
    carbs: 24,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein, vegan, no-cook, crunchy"],
    emoji: "🫘",
    ingredients: [
      { n: "Roasted chana (bhuna chana)", q: "½ cup", cat: "pantry" },
      { n: "Chaat masala", q: "½ tsp", cat: "spices" },
      { n: "Lemon juice", q: "1 tsp", cat: "vegetables" },
      { n: "Red chilli powder", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Place roasted chana in a bowl.",
      "Squeeze lemon juice over it.",
      "Sprinkle chaat masala and red chilli powder.",
      "Toss well and serve immediately.",
      "Store leftover in an airtight jar for up to a week.",
    ],
  },
  {
    id: "r10",
    type: "snack" as const,
    name: "Roasted Makhana",
    calories: 150,
    protein: 5,
    carbs: 32,
    fat: 2,
    prepTime: 8,
    tags: ["vegan, light, crunchy"],
    emoji: "🍿",
    ingredients: [
      { n: "Makhana (fox nuts)", q: "2 cups", cat: "pantry" },
      { n: "Ghee", q: "1 tsp", cat: "dairy" },
      { n: "Black pepper", q: "½ tsp", cat: "spices" },
      { n: "Himalayan salt", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Heat ghee in pan on low flame.",
      "Add makhana, roast stirring continuously for 6-7 min.",
      "Season with pepper and salt when crispy.",
      "Cool before serving or storing.",
    ],
  },
  {
    id: "r9",
    type: "snack" as const,
    name: "Sprouts Chaat",
    calories: 180,
    protein: 12,
    carbs: 26,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein, vegan, quick"],
    emoji: "🥗",
    ingredients: [
      { n: "Mixed sprouts", q: "1 cup", cat: "vegetables" },
      { n: "Onion", q: "¼", cat: "vegetables" },
      { n: "Tomato", q: "1 small", cat: "vegetables" },
      { n: "Lemon juice", q: "1 tbsp", cat: "vegetables" },
      { n: "Chaat masala", q: "½ tsp", cat: "spices" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Rinse sprouts, place in bowl.",
      "Add chopped onion and tomato.",
      "Season with chaat masala, salt, and lemon.",
      "Toss and garnish with coriander.",
    ],
  },
  {
    id: "r57",
    type: "snack" as const,
    name: "Sweet / Salted Lassi",
    calories: 150,
    protein: 8,
    carbs: 18,
    fat: 5,
    prepTime: 3,
    tags: ["probiotic, no-cook, quick, cooling"],
    emoji: "🥛",
    ingredients: [
      { n: "Thick curd", q: "1 cup", cat: "dairy" },
      { n: "Cold water", q: "½ cup", cat: "dairy" },
      { n: "Sugar / salt", q: "1 tsp", cat: "pantry" },
      { n: "Cardamom powder", q: "pinch", cat: "spices" },
      { n: "Rose water (optional)", q: "½ tsp", cat: "pantry" },
    ],
    steps: [
      "Add curd to blender with water.",
      "Add sugar for sweet lassi or salt + roasted cumin for salted.",
      "Blend 30 seconds until frothy.",
      "Pour into glass over ice.",
      "Garnish with a pinch of cardamom.",
    ],
  },
  {
    id: "r36",
    type: "dinner" as const,
    name: "Baingan Bharta",
    calories: 280,
    protein: 8,
    carbs: 32,
    fat: 12,
    prepTime: 35,
    tags: ["vegan, smoky, classic, low-calorie"],
    emoji: "🍆",
    ingredients: [
      { n: "Brinjal (large)", q: "2", cat: "vegetables" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Green peas", q: "¼ cup", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Garam masala + coriander powder", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Roast whole brinjal directly on flame until charred. Cool and peel.",
      "Mash the roasted flesh with a fork.",
      "Sauté onions golden, add ginger-garlic paste.",
      "Add tomatoes, peas, spices. Cook until oil separates.",
      "Add mashed brinjal, mix well. Finish with coriander and lemon.",
    ],
  },
  {
    id: "r38",
    type: "dinner" as const,
    name: "Chilli Paneer",
    calories: 460,
    protein: 28,
    carbs: 42,
    fat: 18,
    prepTime: 25,
    tags: ["high-protein, indo-chinese, spicy, quick"],
    emoji: "🌶️",
    ingredients: [
      { n: "Paneer", q: "250g", cat: "dairy" },
      { n: "Capsicum", q: "2", cat: "vegetables" },
      { n: "Onion", q: "1 large", cat: "vegetables" },
      { n: "Soy sauce", q: "2 tbsp", cat: "pantry" },
      { n: "Cornflour", q: "3 tbsp", cat: "grains" },
      { n: "Garlic", q: "6 cloves", cat: "spices" },
      { n: "Green chillies", q: "3", cat: "vegetables" },
    ],
    steps: [
      "Cut paneer into cubes. Toss in cornflour and salt, pan-fry until crispy.",
      "Sauté garlic and green chillies on high heat.",
      "Add diced onion and capsicum, stir fry 3 min (keep crunchy).",
      "Add soy sauce and a splash of water. Toss in paneer.",
      "Stir fry 2 min on high heat. Serve as starter or with fried rice.",
    ],
  },
  {
    id: "r59",
    type: "dinner" as const,
    name: "Curd Rice",
    calories: 350,
    protein: 12,
    carbs: 52,
    fat: 10,
    prepTime: 15,
    tags: ["south-indian, classic, probiotic, cooling"],
    emoji: "🍚",
    ingredients: [
      { n: "Cooked rice", q: "1 cup", cat: "grains" },
      { n: "Thick curd", q: "¾ cup", cat: "dairy" },
      { n: "Milk", q: "3 tbsp", cat: "dairy" },
      { n: "Mustard seeds + curry leaves", q: "½ tsp each", cat: "spices" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Grated ginger", q: "½ tsp", cat: "spices" },
      { n: "Pomegranate", q: "2 tbsp", cat: "vegetables" },
    ],
    steps: [
      "Mash warm rice slightly, mix with curd and milk until creamy.",
      "Heat oil, add mustard seeds, curry leaves, green chilli and ginger.",
      "Pour tadka over curd rice and mix.",
      "Garnish with pomegranate seeds.",
      "Serve at room temperature or chilled.",
    ],
  },
  {
    id: "r13",
    type: "dinner" as const,
    name: "Dal Makhani",
    calories: 460,
    protein: 20,
    carbs: 58,
    fat: 14,
    prepTime: 40,
    tags: ["classic, comfort-food, high-protein"],
    emoji: "🫕",
    ingredients: [
      { n: "Black lentils (urad dal)", q: "½ cup", cat: "grains" },
      { n: "Rajma", q: "2 tbsp", cat: "grains" },
      { n: "Tomato puree", q: "½ cup", cat: "vegetables" },
      { n: "Butter", q: "2 tbsp", cat: "dairy" },
      { n: "Cream", q: "3 tbsp", cat: "dairy" },
      { n: "Kashmiri chilli powder", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Soak urad dal and rajma overnight, pressure cook 8-10 whistles.",
      "Melt butter, add ginger-garlic paste.",
      "Add tomato puree and spices, cook until butter separates.",
      "Add dal mixture, simmer 20-30 min.",
      "Finish with cream, serve with naan or rice.",
    ],
  },
  {
    id: "r39",
    type: "dinner" as const,
    name: "Kadhi Pakora",
    calories: 350,
    protein: 14,
    carbs: 40,
    fat: 13,
    prepTime: 35,
    tags: ["classic, north-indian, comfort-food"],
    emoji: "🟡",
    ingredients: [
      { n: "Besan (gram flour)", q: "½ cup", cat: "grains" },
      { n: "Curd", q: "1.5 cups", cat: "dairy" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Spinach / methi leaves", q: "½ cup", cat: "vegetables" },
      { n: "Mustard seeds + curry leaves", q: "½ tsp each", cat: "spices" },
      { n: "Turmeric + red chilli powder", q: "½ tsp each", cat: "spices" },
    ],
    steps: [
      "Mix besan + onion + spinach + spices, form small pakoras. Fry until crispy.",
      "Whisk curd with besan, turmeric, and 2 cups water.",
      "Cook mixture on medium heat stirring constantly until thickened.",
      "Temper with mustard seeds, curry leaves and dried chillies. Pour over kadhi.",
      "Add pakoras, simmer 5 min. Serve with steamed rice.",
    ],
  },
  {
    id: "r61",
    type: "dinner" as const,
    name: "Lauki Kofta Curry",
    calories: 360,
    protein: 14,
    carbs: 38,
    fat: 16,
    prepTime: 35,
    tags: ["classic, north-indian, creative"],
    emoji: "🫙",
    ingredients: [
      { n: "Bottle gourd (lauki)", q: "300g", cat: "vegetables" },
      { n: "Besan", q: "4 tbsp", cat: "grains" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Cashew paste", q: "2 tbsp", cat: "pantry" },
      { n: "Garam masala + coriander powder", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Grate lauki, squeeze out water. Mix with besan, salt and cumin. Form balls.",
      "Fry or air-fry koftas until golden. Set aside.",
      "Sauté onions, add tomatoes and all spices. Cook until thick.",
      "Add cashew paste and ¾ cup water. Simmer 8 min.",
      "Gently drop koftas in gravy 5 min before serving. Serve with roti.",
    ],
  },
  {
    id: "r37",
    type: "dinner" as const,
    name: "Masoor Dal + Jeera Rice",
    calories: 420,
    protein: 22,
    carbs: 66,
    fat: 8,
    prepTime: 25,
    tags: ["high-protein, vegan, quick, easy"],
    emoji: "🫗",
    ingredients: [
      { n: "Red lentils (masoor dal)", q: "½ cup", cat: "grains" },
      { n: "Rice", q: "½ cup", cat: "grains" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Tomato", q: "2", cat: "vegetables" },
      { n: "Cumin seeds", q: "1.5 tsp", cat: "spices" },
      { n: "Turmeric + coriander powder", q: "½ tsp each", cat: "spices" },
    ],
    steps: [
      "Pressure cook masoor dal with turmeric (2-3 whistles).",
      "Cook rice with cumin seeds for jeera rice.",
      "Sauté onions, add tomatoes and spices. Mix into cooked dal.",
      "Simmer together 5 min for flavours to blend.",
      "Serve dal over jeera rice with pickle and papad.",
    ],
  },
  {
    id: "r15",
    type: "dinner" as const,
    name: "Methi Thepla",
    calories: 340,
    protein: 12,
    carbs: 48,
    fat: 9,
    prepTime: 25,
    tags: ["classic, gujarati, vegan"],
    emoji: "🫓",
    ingredients: [
      { n: "Whole wheat flour", q: "1.5 cups", cat: "grains" },
      { n: "Fresh methi leaves", q: "1 cup", cat: "vegetables" },
      { n: "Yogurt", q: "2 tbsp", cat: "dairy" },
      { n: "Cumin-coriander powder", q: "1 tsp", cat: "spices" },
      { n: "Turmeric", q: "¼ tsp", cat: "spices" },
      { n: "Oil", q: "2 tsp", cat: "pantry" },
    ],
    steps: [
      "Chop methi, mix with salt and squeeze out water.",
      "Combine flour, methi, yogurt, spices and oil.",
      "Add water gradually, form a soft dough.",
      "Roll out thin and cook on hot tawa with minimal oil.",
      "Serve warm with yogurt and pickle.",
    ],
  },
  {
    id: "r63",
    type: "dinner" as const,
    name: "Miso Tofu Soup + Rice",
    calories: 310,
    protein: 20,
    carbs: 40,
    fat: 8,
    prepTime: 15,
    tags: ["vegan, high-protein, fusion, light"],
    emoji: "🫕",
    ingredients: [
      { n: "Firm tofu", q: "150g", cat: "dairy" },
      { n: "Miso paste", q: "2 tbsp", cat: "pantry" },
      { n: "Spinach", q: "½ cup", cat: "vegetables" },
      { n: "Spring onion", q: "2", cat: "vegetables" },
      { n: "Mushrooms", q: "½ cup", cat: "vegetables" },
      { n: "Cooked rice", q: "½ cup", cat: "grains" },
    ],
    steps: [
      "Bring 3 cups water to boil. Add mushrooms, cook 3 min.",
      "Cube tofu and add to soup. Simmer 3 min.",
      "Remove from heat. Dissolve miso paste in ladle of stock and stir back in.",
      "Add spinach and spring onion.",
      "Serve alongside a small bowl of steamed rice.",
    ],
  },
  {
    id: "r60",
    type: "dinner" as const,
    name: "Mushroom Masala",
    calories: 300,
    protein: 12,
    carbs: 30,
    fat: 14,
    prepTime: 20,
    tags: ["vegan, low-calorie, quick, umami"],
    emoji: "🍄",
    ingredients: [
      { n: "Button mushrooms", q: "250g", cat: "vegetables" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "2", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Kashmiri chilli + garam masala", q: "1 tsp each", cat: "spices" },
      { n: "Kasuri methi", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Clean and halve mushrooms.",
      "Sauté onions golden, add ginger-garlic paste.",
      "Add tomatoes and all spices, cook until oil separates.",
      "Add mushrooms and ¼ cup water. Cook 8-10 min.",
      "Crush kasuri methi and add at end. Serve with roti or rice.",
    ],
  },
  {
    id: "r12",
    type: "dinner" as const,
    name: "Palak Paneer",
    calories: 420,
    protein: 24,
    carbs: 28,
    fat: 18,
    prepTime: 30,
    tags: ["high-protein, iron-rich, classic"],
    emoji: "🥬",
    ingredients: [
      { n: "Spinach (palak)", q: "300g", cat: "vegetables" },
      { n: "Paneer", q: "200g", cat: "dairy" },
      { n: "Onion", q: "1 large", cat: "vegetables" },
      { n: "Tomato", q: "2", cat: "vegetables" },
      { n: "Ginger-garlic paste", q: "1 tbsp", cat: "spices" },
      { n: "Cream", q: "2 tbsp", cat: "dairy" },
      { n: "Roti", q: "2", cat: "grains" },
    ],
    steps: [
      "Blanch spinach in boiling water 2 min, cool and puree.",
      "Sauté onions golden, add ginger-garlic paste.",
      "Add tomatoes, cook soft. Add spices.",
      "Add spinach puree, simmer 5 min.",
      "Add paneer and cream, cook 5 min more.",
      "Serve with warm roti.",
    ],
  },
  {
    id: "r35",
    type: "dinner" as const,
    name: "Paneer Butter Masala",
    calories: 520,
    protein: 28,
    carbs: 34,
    fat: 26,
    prepTime: 30,
    tags: ["high-protein, restaurant-style, indulgent"],
    emoji: "🧡",
    ingredients: [
      { n: "Paneer", q: "250g", cat: "dairy" },
      { n: "Butter", q: "2 tbsp", cat: "dairy" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "3", cat: "vegetables" },
      { n: "Cashews", q: "10-12", cat: "pantry" },
      { n: "Fresh cream", q: "3 tbsp", cat: "dairy" },
      { n: "Kashmiri chilli + garam masala", q: "1 tsp each", cat: "spices" },
    ],
    steps: [
      "Blend onion, tomatoes, and cashews to smooth puree.",
      "Cook puree in butter until thick and oil separates.",
      "Add Kashmiri chilli and garam masala, cook 2 min.",
      "Add cream and water, simmer 5 min.",
      "Add paneer, cook 5 min. Serve with butter naan or jeera rice.",
    ],
  },
  {
    id: "r62",
    type: "dinner" as const,
    name: "Pav Bhaji",
    calories: 420,
    protein: 12,
    carbs: 66,
    fat: 12,
    prepTime: 25,
    tags: ["street-food, vegan, classic, crowd-pleaser"],
    emoji: "🍞",
    ingredients: [
      {
        n: "Mixed vegetables (potato, cauliflower, peas, carrot)",
        q: "2 cups",
        cat: "vegetables",
      },
      { n: "Butter", q: "2 tbsp", cat: "dairy" },
      { n: "Pav bhaji masala", q: "2 tsp", cat: "spices" },
      { n: "Onion", q: "2", cat: "vegetables" },
      { n: "Tomatoes", q: "3", cat: "vegetables" },
      { n: "Whole wheat pav / dinner rolls", q: "4", cat: "grains" },
    ],
    steps: [
      "Pressure cook all vegetables together (3 whistles). Mash well.",
      "Heat butter, sauté onion until golden. Add tomatoes and pav bhaji masala.",
      "Add mashed vegetables, mix and cook 10 min mashing continuously.",
      "Toast pav on tawa with butter until golden.",
      "Serve bhaji topped with onion, butter and lemon wedge.",
    ],
  },
  {
    id: "r34",
    type: "dinner" as const,
    name: "Soya Chunks Pulao",
    calories: 480,
    protein: 36,
    carbs: 58,
    fat: 10,
    prepTime: 30,
    tags: ["highest-protein, vegan, one-pot, muscle-gain"],
    emoji: "🍚",
    ingredients: [
      { n: "Basmati rice", q: "½ cup", cat: "grains" },
      { n: "Soya chunks", q: "1 cup dry", cat: "pantry" },
      { n: "Onion", q: "1 large", cat: "vegetables" },
      { n: "Tomato", q: "1", cat: "vegetables" },
      {
        n: "Whole spices (bay leaf, cardamom, clove)",
        q: "2-3 each",
        cat: "spices",
      },
      { n: "Mint leaves", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Soak soya chunks in hot water 10 min, squeeze dry.",
      "Fry whole spices in oil, add onion until golden.",
      "Add tomato, cook 3 min. Add soya chunks and sauté.",
      "Add washed rice, 1.5 cups water, salt, and mint.",
      "Cover and cook 15 min on low heat. Serve with raita.",
    ],
  },
  {
    id: "r14",
    type: "dinner" as const,
    name: "Tofu Stir-Fry Bowl",
    calories: 380,
    protein: 22,
    carbs: 52,
    fat: 10,
    prepTime: 20,
    tags: ["vegan, high-protein, quick"],
    emoji: "🥦",
    ingredients: [
      { n: "Firm tofu", q: "200g", cat: "dairy" },
      { n: "Broccoli", q: "1 cup", cat: "vegetables" },
      { n: "Capsicum", q: "1", cat: "vegetables" },
      { n: "Soy sauce", q: "2 tbsp", cat: "pantry" },
      { n: "Sesame oil", q: "1 tsp", cat: "pantry" },
      { n: "Brown rice (cooked)", q: "1 cup", cat: "grains" },
    ],
    steps: [
      "Press tofu, cube and pan-fry until golden.",
      "Heat sesame oil in wok, add broccoli and capsicum.",
      "Stir fry on high heat 3-4 min.",
      "Add tofu, pour soy sauce and toss together.",
      "Serve over brown rice with sesame seeds.",
    ],
  }
];
// ── AUTO-GENERATED-RECIPES-END ───────────────────────────────────────────────

const getByType = (t: MealType): Recipe[] =>
  RECIPES.filter((r) => r.type === t);

const DEFAULT_PLAN: Plan = {
  breakfast: RECIPES.find((r) => r.id === "r1")!,
  lunch: RECIPES.find((r) => r.id === "r5")!,
  snack: RECIPES.find((r) => r.id === "r9")!,
  dinner: RECIPES.find((r) => r.id === "r12")!,
};

const DEFAULT_PANTRY: PantryItem[] = [
  {
    id: "p1",
    name: "Brown rice",
    qty: 500,
    unit: "g",
    cat: "grains",
    low: 100,
  },
  { id: "p2", name: "Toor dal", qty: 300, unit: "g", cat: "grains", low: 100 },
  { id: "p3", name: "Paneer", qty: 400, unit: "g", cat: "dairy", low: 100 },
  {
    id: "p4",
    name: "Whole wheat flour",
    qty: 1000,
    unit: "g",
    cat: "grains",
    low: 200,
  },
  {
    id: "p5",
    name: "Peanut butter",
    qty: 250,
    unit: "g",
    cat: "pantry",
    low: 50,
  },
  { id: "p6", name: "Makhana", qty: 100, unit: "g", cat: "pantry", low: 50 },
  { id: "p7", name: "Onions", qty: 6, unit: "pcs", cat: "vegetables", low: 2 },
  {
    id: "p8",
    name: "Tomatoes",
    qty: 4,
    unit: "pcs",
    cat: "vegetables",
    low: 2,
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function calcCalories(p: Omit<Profile, "calorieTarget">): number {
  // Mifflin-St Jeor BMR (unchanged — this is correct)
  const bmr = p.gender === "male"
    ? 88.36 + 13.4 * p.weight + 4.8 * p.height - 5.7 * p.age
    : 447.6  +  9.2 * p.weight + 3.1 * p.height - 4.3 * p.age;

  // Activity multipliers (refined)
  const activityMultiplier: Record<Activity, number> = {
    sedentary: 1.2,   // desk job, little or no exercise
    moderate:  1.55,  // exercise 3-5x/week
    active:    1.725, // hard exercise 6-7x/week
  };

  const tdee = bmr * activityMultiplier[p.activity];

  // Goal-based adjustment — percentage of TDEE (more scientifically accurate)
  const goalAdjustment: Record<Goal, number> = {
    bulk:     0.10,   // +10% surplus for lean muscle gain
    cut:     -0.15,   // -15% deficit for fat loss (more aggressive than bulk)
    maintain: 0,
  };

  const adjusted = tdee * (1 + goalAdjustment[p.goal]);

  // Safety floors — never go below these minimums
  const safetyFloor = p.gender === "male" ? 1500 : 1200;
  return Math.round(Math.max(adjusted, safetyFloor));
}

function groceryFromPlan(plan: Plan): GroceryItem[] {
  const map: Record<string, GroceryItem> = {};
  (Object.values(plan) as Recipe[]).forEach((meal) => {
    meal.ingredients.forEach((ing) => {
      const key = ing.n.toLowerCase();
      if (!map[key])
        map[key] = {
          id: `g-${key}`,
          name: ing.n,
          qty: ing.q,
          cat: ing.cat,
          checked: false,
        };
    });
  });
  return Object.values(map);
}

// ── RING ──────────────────────────────────────────────────────────────────────
interface RingProps {
  val: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
}
function Ring({
  val,
  max,
  size = 110,
  stroke = 9,
  color = "#3A6B35",
  label,
  sub,
}: RingProps) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(val / (max || 1), 1);
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E2DDD5"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {label && (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E2D1B" }}>
            {label}
          </div>
        )}
        {sub && <div style={{ fontSize: 10, color: "#7B8C79" }}>{sub}</div>}
      </div>
    </div>
  );
}

interface MacroBarProps {
  label: string;
  val: number;
  max: number;
  color: string;
}
function MacroBar({ label, val, max, color }: MacroBarProps) {
  const pct = Math.min(val / (max || 1), 1) * 100;
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
          fontSize: 12,
        }}
      >
        <span style={{ color: "#7B8C79", fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#1E2D1B", fontWeight: 600 }}>
          {val}g
          <span style={{ color: "#7B8C79", fontWeight: 400 }}>/{max}g</span>
        </span>
      </div>
      <div className="macro-bar">
        <div
          className="macro-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
interface OnboardingProps {
  onComplete: (p: Profile) => void;
}
function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Omit<Profile, "calorieTarget">>({
    goal: "maintain",
    activity: "moderate",
    vegan: false,
    allergies: [],
    weight: 70,
    height: 170,
    age: 25,
    gender: "male",
  });

  const steps = [
    {
      title: "Your Fitness Goal",
      icon: "🎯",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(
            [
              ["bulk", "🏋️ Bulk", "Gain muscle & size"],
              ["maintain", "⚖️ Maintain", "Keep current weight"],
              ["cut", "🔥 Cut", "Lose fat, stay lean"],
            ] as [Goal, string, string][]
          ).map(([v, l, d]) => (
            <div
              key={v}
              onClick={() => setForm((f) => ({ ...f, goal: v }))}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: `2px solid ${
                  form.goal === v ? "var(--green)" : "var(--border)"
                }`,
                background: form.goal === v ? "var(--green)" : "var(--card)",
                color: form.goal === v ? "#fff" : "var(--text)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{l}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {d}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "About You",
      icon: "👤",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {[
              [
                "Gender",
                "gender",
                [
                  ["male", "Male"],
                  ["female", "Female"],
                ],
              ] as ["Gender", "gender", [string, string][]],
              [
                "Activity",
                "activity",
                [
                  ["sedentary", "Sedentary"],
                  ["moderate", "Moderate"],
                  ["active", "Active"],
                ],
              ] as ["Activity", "activity", [string, string][]],
            ].map(([label, key, opts]) => (
              <div key={key}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
                {opts.map(([v, l]) => (
                  <div
                    key={v}
                    onClick={() => setForm((f) => ({ ...f, [key]: v }))}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${
                        (form as Record<string, unknown>)[key] === v
                          ? "var(--green)"
                          : "var(--border)"
                      }`,
                      background:
                        (form as Record<string, unknown>)[key] === v
                          ? "var(--green)"
                          : "var(--card)",
                      color:
                        (form as Record<string, unknown>)[key] === v
                          ? "#fff"
                          : "var(--text)",
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 6,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {(
            [
              ["Weight (kg)", "weight", 40, 150],
              ["Height (cm)", "height", 140, 210],
              ["Age", "age", 16, 70],
            ] as [
              string,
              keyof Omit<
                Profile,
                | "calorieTarget"
                | "goal"
                | "activity"
                | "gender"
                | "vegan"
                | "allergies"
              >,
              number,
              number
            ][]
          ).map(([label, key, min, max]) => (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--green)",
                  }}
                >
                  {form[key]}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={form[key] as number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: +e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Diet Preferences",
      icon: "🥗",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="card"
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => setForm((f) => ({ ...f, vegan: !f.vegan }))}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Vegan 🌱</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                No dairy or animal products
              </div>
            </div>
            <div
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                background: form.vegan ? "var(--green)" : "var(--border)",
                position: "relative",
                transition: "background .2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  position: "absolute",
                  top: 3,
                  left: form.vegan ? 24 : 4,
                  transition: "left .2s",
                }}
              />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              Allergies
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Dairy", "Nuts", "Gluten", "Soy"].map((a) => {
                const low = a.toLowerCase();
                const sel = form.allergies.includes(low);
                return (
                  <div
                    key={a}
                    className={`chip ${sel ? "active" : ""}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        allergies: sel
                          ? f.allergies.filter((x) => x !== low)
                          : [...f.allergies, low],
                      }))
                    }
                  >
                    {a}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card" style={{ padding:"16px",background:"var(--green-l)",border:"1.5px solid #C8E4C7" }}>
  <div style={{ fontSize:13,color:"var(--green)",fontWeight:600,marginBottom:8 }}>📊 Your Daily Target</div>
  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
    <input
      type="number"
      value={form.calorieOverride ?? calcCalories(form)}
      onChange={e => setForm(f => ({ ...f, calorieOverride: Math.max(1200, +e.target.value) }))}
      style={{
        fontSize:28,fontWeight:700,color:"var(--green)",
        background:"transparent",border:"none",borderBottom:"2px solid var(--green)",
        width:100,outline:"none",fontFamily:"'Playfair Display',serif",
      }}
    />
    <span style={{ fontSize:13,color:"var(--muted)" }}>kcal/day</span>
  </div>
  <div style={{ fontSize:12,color:"var(--muted)" }}>
    Auto-calculated · tap to edit &nbsp;
    {form.calorieOverride && (
      <span
        onClick={() => setForm(f => ({ ...f, calorieOverride: undefined }))}
        style={{ color:"var(--green)",cursor:"pointer",textDecoration:"underline" }}>
        reset
      </span>
    )}
  </div>
</div>
        </div>
      ),
    },
  ];

  const next = () => {
    if (step < steps.length - 1) { setStep(s => s + 1); return; }
    onComplete({
      ...form,
      calorieTarget: form.calorieOverride ?? calcCalories(form),
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "52px 24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🥗</div>
        <h1
          className="serif"
          style={{ fontSize: 28, color: "var(--text)", marginBottom: 4 }}
        >
          VegFit
        </h1>
        <div style={{ fontSize: 14, color: "var(--muted)" }}>
          Indian Vegetarian Fitness Planner
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 20,
        }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className={`onboard-dot ${i === step ? "active" : ""}`}
            style={{ background: i <= step ? "var(--green)" : "var(--border)" }}
          />
        ))}
      </div>
      <div style={{ flex: 1, padding: "0 20px 20px" }} className="slide-in">
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>
            {steps[step].icon}
          </div>
          <h2
            className="serif"
            style={{ fontSize: 20, marginBottom: 20, textAlign: "center" }}
          >
            {steps[step].title}
          </h2>
          {steps[step].content}
        </div>
      </div>
      <div style={{ padding: "0 20px 44px", display: "flex", gap: 12 }}>
        {step > 0 && (
          <button
            className="btn btn-outline"
            onClick={() => setStep((s) => s - 1)}
            style={{ padding: "14px 18px" }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={next}
          style={{ flex: 1, fontSize: 16 }}
        >
          {step < steps.length - 1 ? "Continue →" : "🚀 Start My Journey"}
        </button>
      </div>
    </div>
  );
}

// ── RECIPE MODAL ──────────────────────────────────────────────────────────────
interface RecipeModalProps {
  meal: Recipe;
  onClose: () => void;
  isFav: boolean;
  onFav: () => void;
  onChecked: () => void;
  done: boolean;
}
function RecipeModal({
  meal,
  onClose,
  isFav,
  onFav,
  onChecked,
  done,
}: RecipeModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--card)",
            zIndex: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ padding: "7px 12px", borderRadius: 10 }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{meal.name}</div>
          <button
            className="btn"
            onClick={onFav}
            style={{
              padding: "7px 12px",
              borderRadius: 10,
              background: isFav ? "#FEE2E2" : "var(--green-l)",
              color: isFav ? "#E85454" : "var(--green)",
            }}
          >
            <Heart
              size={16}
              fill={isFav ? "#E85454" : "none"}
              color={isFav ? "#E85454" : "var(--green)"}
            />
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ textAlign: "center", fontSize: 60, marginBottom: 10 }}>
            {meal.emoji}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            {meal.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-around",
              padding: "12px",
              marginBottom: 16,
            }}
          >
            {(
              [
                ["🔥", "Cal", meal.calories],
                ["💪", "Pro", `${meal.protein}g`],
                ["🍚", "Carbs", `${meal.carbs}g`],
                ["🥑", "Fat", `${meal.fat}g`],
                ["⏱", "Prep", `${meal.prepTime}m`],
              ] as [string, string, string | number][]
            ).map(([em, label, val]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14 }}>{em}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {val}
                </div>
                <div style={{ fontSize: 9, color: "var(--muted)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 8,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Ingredients
          </div>
          {meal.ingredients.map((ing, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--text)" }}>{ing.n}</span>
              <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                {ing.q}
              </span>
            </div>
          ))}
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 8,
              marginTop: 18,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Instructions
          </div>
          {meal.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: "var(--green)",
                  color: "#fff",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text)",
                  lineHeight: 1.6,
                  paddingTop: 2,
                }}
              >
                {s}
              </p>
            </div>
          ))}
          <button
            className="btn"
            onClick={onChecked}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              marginTop: 16,
              fontSize: 15,
              fontWeight: 700,
              background: done ? "var(--border)" : "var(--green)",
              color: done ? "var(--text)" : "#fff",
            }}
          >
            {done ? "✓ Already Eaten" : "✅ Mark as Eaten"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI PLAN GENERATION ────────────────────────────────────────────────────────
async function generateAIPlan(profile: Profile): Promise<Plan> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a nutrition expert specializing in Indian vegetarian cuisine.
User: Goal=${profile.goal}, Activity=${profile.activity}, Calories=${profile.calorieTarget}kcal, Vegan=${profile.vegan}
Generate a full day Indian vegetarian meal plan. Respond ONLY with valid JSON (no markdown):
{"breakfast":{"id":"ai-b","type":"breakfast","name":"","emoji":"","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"tags":[],"ingredients":[{"n":"","q":"","cat":"grains"}],"steps":[""]},"lunch":{"id":"ai-l","type":"lunch","name":"","emoji":"","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"tags":[],"ingredients":[{"n":"","q":"","cat":"grains"}],"steps":[""]},"snack":{"id":"ai-s","type":"snack","name":"","emoji":"","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"tags":[],"ingredients":[{"n":"","q":"","cat":"grains"}],"steps":[""]},"dinner":{"id":"ai-d","type":"dinner","name":"","emoji":"","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"tags":[],"ingredients":[{"n":"","q":"","cat":"grains"}],"steps":[""]}}
Total ≈ ${profile.calorieTarget} kcal. Only authentic Indian recipes.`,
        },
      ],
    }),
  });
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim()) as Plan;
}

// ── HOME ──────────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface DateStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  loggedDates: Set<string>;
}
function DateStrip({ selectedDate, onDateChange, loggedDates }: DateStripProps) {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = Array.from({ length: 16 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as "touch", scrollbarWidth: "none" as "none", margin: "0 -20px", padding: "0 20px" }}>
      <div style={{ display: "flex", gap: 4, width: "max-content", paddingBottom: 2 }}>
        {days.map((d) => {
          const dateStr = d.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr();
          const isFuture = d > new Date() && !isToday;
          const hasLog = loggedDates.has(dateStr);
          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onDateChange(dateStr)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "5px 7px 6px", borderRadius: 8, minWidth: 36,
                border: isSelected ? "1.5px solid #fff" : "1.5px solid transparent",
                background: isSelected ? "#fff" : "transparent",
                color: isSelected ? "var(--green)" : isFuture ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.7)",
                cursor: isFuture ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {isToday ? "Today" : DAY_NAMES[d.getDay()]}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
                {d.getDate()}
              </span>
              <span style={{
                width: 3, height: 3, borderRadius: "50%",
                background: isSelected ? (hasLog ? "var(--green)" : "rgba(58,107,53,.3)") : hasLog ? "#7BC67A" : "rgba(255,255,255,.2)",
              }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface HomeScreenProps {
  profile: Profile;
  plan: Plan;
  setPlan: (p: Plan) => void;
  consumed: Consumed;
  setConsumed: (c: Consumed) => void;
  favorites: string[];
  toggleFav: (id: string) => void;
}
function HomeScreen({
  profile,
  plan,
  setPlan,
  consumed,
  setConsumed,
  favorites,
  toggleFav,
}: HomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<
    (Recipe & { mealType: MealType }) | null
  >(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const isToday = selectedDate === todayStr();

  useEffect(() => {
    const hasTodayLog = Object.values(consumed).some(Boolean);
    if (hasTodayLog) {
      setLoggedDates((prev) => new Set([...prev, todayStr()]));
    }
  }, [consumed]);

  const totals: Macros = {
    calories: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].calories : 0),
      0
    ),
    protein: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].protein : 0),
      0
    ),
    carbs: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].carbs : 0),
      0
    ),
    fat: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].fat : 0),
      0
    ),
  };
  const targets: Macros = {
    calories: profile.calorieTarget,
    protein: Math.round((profile.calorieTarget * 0.25) / 4),
    carbs: Math.round((profile.calorieTarget * 0.5) / 4),
    fat: Math.round((profile.calorieTarget * 0.25) / 9),
  };

  const regenerate = async () => {
    setLoading(true);
    try {
      setPlan(await generateAIPlan(profile));
      setConsumed({
        breakfast: false,
        lunch: false,
        snack: false,
        dinner: false,
      });
    } catch {
      const types: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
      const fb = {} as Plan;
      types.forEach((t) => {
        const pool = getByType(t);
        fb[t] = pool[Math.floor(Math.random() * pool.length)];
      });
      setPlan(fb);
      setConsumed({
        breakfast: false,
        lunch: false,
        snack: false,
        dinner: false,
      });
    }
    setLoading(false);
  };

  const swapMeal = (type: MealType) => {
    const pool = getByType(type).filter((r) => r.id !== plan[type]?.id);
    setPlan({ ...plan, [type]: pool[Math.floor(Math.random() * pool.length)] });
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const motivations = [
    "You're fueling your goals! 💪",
    "Plant power in action! ⚡",
    "Eating clean, living strong! 🏆",
    "Great choices today! 🌱",
  ];
  const motiv =
    motivations[Math.floor(Date.now() / 86400000) % motivations.length];
  const mealIcons: Record<MealType, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    snack: "🍎",
    dinner: "🌙",
  };
  const pct = Math.round((totals.calories / targets.calories) * 100);

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "16px 20px 24px" }}>
        <DateStrip
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          loggedDates={loggedDates}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
            marginTop: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.7)",
                marginBottom: 4,
              }}
            >
              {today}
            </div>
            <h1
              className="serif"
              style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
            >
              Your Meal Plan
            </h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)" }}>
              {isToday ? motiv : "Viewing past day"}
            </div>
          </div>
          <button
            className="btn"
            onClick={regenerate}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,.2)",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              border: "none",
            }}
          >
            <Sparkles
              size={15}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            {loading ? "..." : "AI Plan"}
          </button>
        </div>
        <div
          className="card"
          style={{
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Ring
            val={totals.calories}
            max={targets.calories}
            label={`${pct}%`}
            sub="of goal"
            size={88}
            stroke={8}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}
            >
              {targets.calories - totals.calories > 0
                ? `${targets.calories - totals.calories} kcal remaining`
                : `${totals.calories - targets.calories} kcal over`}
            </div>
            <MacroBar
              label="Protein"
              val={totals.protein}
              max={targets.protein}
              color="#3A6B35"
            />
            <MacroBar
              label="Carbs"
              val={totals.carbs}
              max={targets.carbs}
              color="#E07A3F"
            />
            <MacroBar
              label="Fat"
              val={totals.fat}
              max={targets.fat}
              color="#7C5CBF"
            />
          </div>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {!isToday ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 0", gap: 10 }}>
            <div style={{ fontSize: 40 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>No meals recorded</div>
            <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>No meal plan was saved for this day.</div>
          </div>
        ) : (
          <>
            {loading
          ? (["breakfast", "lunch", "snack", "dinner"] as MealType[]).map(
              (t) => (
                <div
                  key={t}
                  className="skeleton"
                  style={{ height: 90, marginBottom: 12 }}
                />
              )
            )
          : (["breakfast", "lunch", "snack", "dinner"] as MealType[]).map(
              (type) => {
                const meal = plan[type];
                const done = consumed[type];
                return (
                  <div
                    key={type}
                    className="card slide-in"
                    onClick={() => setSelected({ ...meal, mealType: type })}
                    style={{
                      marginBottom: 12,
                      padding: "14px",
                      cursor: "pointer",
                      opacity: done ? 0.75 : 1,
                      borderLeft: `3px solid ${
                        done ? "var(--green)" : "transparent"
                      }`,
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 10, alignItems: "center" }}
                    >
                      <div style={{ fontSize: 34, flexShrink: 0 }}>
                        {meal.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 3,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              fontWeight: 600,
                            }}
                          >
                            {mealIcons[type]} {type}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFav(meal.id);
                              }}
                              style={{
                                padding: "4px 7px",
                                borderRadius: 8,
                                background: favorites.includes(meal.id)
                                  ? "#FEE2E2"
                                  : "var(--green-l)",
                                border: "none",
                              }}
                            >
                              <Heart
                                size={12}
                                fill={
                                  favorites.includes(meal.id)
                                    ? "#E85454"
                                    : "none"
                                }
                                color={
                                  favorites.includes(meal.id)
                                    ? "#E85454"
                                    : "var(--green)"
                                }
                              />
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                swapMeal(type);
                              }}
                              style={{
                                padding: "4px 7px",
                                borderRadius: 8,
                                fontSize: 11,
                              }}
                            >
                              <Repeat2 size={12} color="var(--muted)" />
                            </button>
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--text)",
                            marginBottom: 3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {meal.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            fontSize: 11,
                            color: "var(--muted)",
                          }}
                        >
                          <span>🔥 {meal.calories}</span>
                          <span>💪 {meal.protein}g</span>
                          <span>⏱ {meal.prepTime}m</span>
                        </div>
                      </div>
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConsumed({ ...consumed, [type]: !done });
                        }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          flexShrink: 0,
                          padding: 0,
                          border: `2px solid ${
                            done ? "var(--green)" : "var(--border)"
                          }`,
                          background: done ? "var(--green)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {done && <Check size={14} color="#fff" />}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </>
        )}
      </div>

      {selected && (
        <RecipeModal
          meal={selected}
          onClose={() => setSelected(null)}
          isFav={favorites.includes(selected.id)}
          onFav={() => toggleFav(selected.id)}
          onChecked={() => {
            setConsumed({
              ...consumed,
              [selected.mealType]: !consumed[selected.mealType],
            });
            setSelected(null);
          }}
          done={consumed[selected.mealType]}
        />
      )}
    </div>
  );
}

// ── RECIPES ───────────────────────────────────────────────────────────────────

// Curated Unsplash food photo map keyed by recipe id
// ── AUTO-GENERATED-PHOTOS-START (do not remove this comment) ─────────────────
const RECIPE_PHOTOS: Record<string, string> = {
  r16: "https://commons.wikimedia.org/wiki/Special:FilePath/Gram_flour_Chilla_(Besan_ka_Cheela).JPG?width=400", // Besan Cheela
  r18: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=80", // Dalia Paneer Upma
  r21: "https://commons.wikimedia.org/wiki/Special:FilePath/Moong_dal_chilla.JPG?width=400", // Moong Dal Paneer Chilla
  r3: "https://commons.wikimedia.org/wiki/Special:FilePath/Paneer_paratha.jpg?width=400", // Paneer Paratha
  r4: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80", // Peanut Butter Banana Smoothie
  r17: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80", // Quinoa Upma
  r17b: "https://commons.wikimedia.org/wiki/Special:FilePath/Uttapam.jpg?width=400", // Ragi Uttapam
  r41: "https://commons.wikimedia.org/wiki/Special:FilePath/Sabudana_Khichdi_with_Sweet_curd.JPG?width=400", // Sabudana Khichdi
  r19: "https://commons.wikimedia.org/wiki/Special:FilePath/Poha.jpg?width=400", // Soya Poha
  r22: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", // Sprouted Moong Salad
  r43: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80", // Tofu Bhurji Toast
  r47: "https://commons.wikimedia.org/wiki/Special:FilePath/Aloo_gobi.jpg?width=400", // Aloo Gobi Sabzi + Roti
  r6: "https://commons.wikimedia.org/wiki/Special:FilePath/Chana_masala.jpg?width=400", // Chana Masala
  r50: "https://commons.wikimedia.org/wiki/Special:FilePath/Chole_kulche.jpg?width=400", // Chole Kulche
  r5: "https://commons.wikimedia.org/wiki/Special:FilePath/Dal_tadka.jpg?width=400", // Dal Tadka + Brown Rice
  r24: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&q=80", // Kala Chana Masala
  r27: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&q=80", // Lobia Masala
  r25: "https://commons.wikimedia.org/wiki/Special:FilePath/Matar_paneer.jpg?width=400", // Matar Paneer
  r29: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80", // Mixed Dal Khichdi
  r48: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&q=80", // Moong Dal Soup + Rice
  r49: "https://images.unsplash.com/photo-1618449840665-9ed506d73a34?w=400&q=80", // Paneer & Spinach Wrap
  r7: "https://commons.wikimedia.org/wiki/Special:FilePath/Paneer_bhurji.jpg?width=400", // Paneer Bhurji Bowl
  r28: "https://commons.wikimedia.org/wiki/Special:FilePath/Paneer_tikka_masala.jpg?width=400", // Paneer Tikka Masala
  r26: "https://commons.wikimedia.org/wiki/Special:FilePath/Khichdi.jpg?width=400", // Quinoa Khichdi
  r8: "https://commons.wikimedia.org/wiki/Special:FilePath/Rajma_chawal.jpg?width=400", // Rajma Chawal
  r51: "https://commons.wikimedia.org/wiki/Special:FilePath/Dhokla.jpg?width=400", // Rava Dhokla
  r23: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80", // Soya Chunks Curry
  r52: "https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?w=400&q=80", // Stuffed Capsicum
  r46: "https://commons.wikimedia.org/wiki/Special:FilePath/Biryani_-_Veg_Biryani.jpg?width=400", // Vegetable Biryani
  r33: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80", // Boiled Chana Salad
  r31: "https://commons.wikimedia.org/wiki/Special:FilePath/Dahi_chana_chaat.jpg?width=400", // Dahi Chana Chaat
  r58: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80", // Peanut Butter Apple Slices
  r54: "https://cdn.pixabay.com/photo/2018/06/17/17/40/peanuts-3480143_640.jpg", // Roasted Chana
  r10: "https://commons.wikimedia.org/wiki/Special:FilePath/Makhana.jpg?width=400", // Roasted Makhana
  r9: "https://commons.wikimedia.org/wiki/Special:FilePath/Sprouts_chaat.jpg?width=400", // Sprouts Chaat
  r57: "https://commons.wikimedia.org/wiki/Special:FilePath/Lassi.jpg?width=400", // Sweet / Salted Lassi
  r36: "https://commons.wikimedia.org/wiki/Special:FilePath/Baingan_bharta.jpg?width=400", // Baingan Bharta
  r38: "https://commons.wikimedia.org/wiki/Special:FilePath/Chilli_paneer.jpg?width=400", // Chilli Paneer
  r59: "https://commons.wikimedia.org/wiki/Special:FilePath/Curd_rice.jpg?width=400", // Curd Rice
  r13: "https://commons.wikimedia.org/wiki/Special:FilePath/Dal_makhani.jpg?width=400", // Dal Makhani
  r39: "https://commons.wikimedia.org/wiki/Special:FilePath/Kadhi_pakora.jpg?width=400", // Kadhi Pakora
  r61: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80", // Lauki Kofta Curry
  r37: "https://commons.wikimedia.org/wiki/Special:FilePath/Masoor_dal.jpg?width=400", // Masoor Dal + Jeera Rice
  r15: "https://commons.wikimedia.org/wiki/Special:FilePath/Methi_thepla.jpg?width=400", // Methi Thepla
  r63: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", // Miso Tofu Soup + Rice
  r60: "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=400&q=80", // Mushroom Masala
  r12: "https://commons.wikimedia.org/wiki/Special:FilePath/Cottage_cheese_in_spinach_gravy(palak_paneer).jpg?width=400", // Palak Paneer
  r35: "https://commons.wikimedia.org/wiki/Special:FilePath/Paneer_butter_masala.jpg?width=400", // Paneer Butter Masala
  r62: "https://commons.wikimedia.org/wiki/Special:FilePath/Pav_Bhaji_With_Shallots_and_Mint_Chutney.png?width=400", // Pav Bhaji
  r34: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80", // Soya Chunks Pulao
  r14: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80", // Tofu Stir-Fry Bowl
};
// ── AUTO-GENERATED-PHOTOS-END ─────────────────────────────────────────────────

function healthScore(r: Recipe): number {
  // Simple heuristic: protein ratio + low fat + low calories
  const score = Math.min(10, Math.round(
    (r.protein / (r.calories / 100)) * 1.5 +
    (r.fat < 15 ? 1 : 0) +
    (r.calories < 400 ? 1 : 0) +
    (r.tags.includes("vegan") ? 0.5 : 0)
  ));
  return Math.max(5, Math.min(10, score));
}

function healthLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Very Good";
  if (score >= 5) return "Good";
  return "Moderate";
}

// Detailed recipe modal matching Calbye design
function RecipeDetailModal({ recipe, isFav, onFav, onClose }: {
  recipe: Recipe;
  isFav: boolean;
  onFav: () => void;
  onClose: () => void;
}) {
  const score = healthScore(recipe);
  const photo = RECIPE_PHOTOS[recipe.id] ?? null;
  const mealTypeLabel = recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Header bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--card)", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <button className="btn btn-outline" onClick={onClose}
            style={{ padding: "7px 12px", borderRadius: 10 }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{
            fontSize: 14, fontWeight: 700,
            background: "var(--green-l)", color: "var(--green)",
            padding: "4px 12px", borderRadius: 20, border: "1.5px solid var(--green)",
          }}>
            {mealTypeLabel}
          </div>
          <button className="btn" onClick={onFav} style={{
            padding: "7px 12px", borderRadius: 10,
            background: isFav ? "#FEE2E2" : "var(--green-l)", border: "none",
          }}>
            <Heart size={16} fill={isFav ? "#E85454" : "none"} color={isFav ? "#E85454" : "var(--green)"} />
          </button>
        </div>

        <div style={{ padding: "16px 16px 100px" }}>
          {/* ── Hero row: photo + title */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
            <img
              src={photo}
              alt={recipe.name}
              style={{ width: 110, height: 110, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 8 }}>
                {recipe.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>⚖️</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>1 serving</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>⏱️</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{recipe.prepTime} min</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {recipe.tags.slice(0, 2).map(t => (
                  <span key={t} className="tag" style={{ fontSize: 10, padding: "2px 8px" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Calorie banner */}
          <div style={{
            background: "linear-gradient(135deg, #FFF8E7 0%, #FFF3CC 100%)",
            border: "1.5px solid #FFE082",
            borderRadius: 16, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 14, marginBottom: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #FF9800, #FF6D00)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>🔥</div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#1E2D1B" }}>{recipe.calories}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#7B6B30" }}>kcal</span>
              </div>
              <div style={{ fontSize: 12, color: "#9C7F2E", marginTop: 1 }}>
                {recipe.protein}g protein · {recipe.carbs}g carbs · {recipe.fat}g fat
              </div>
            </div>
          </div>

          {/* ── Macro tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { icon: "🥩", label: "Protein", val: recipe.protein, unit: "g", color: "#E8F4E7" },
              { icon: "🥑", label: "Fats", val: recipe.fat, unit: "g", color: "#FFF8E7" },
              { icon: "🍞", label: "Carbs", val: recipe.carbs, unit: "g", color: "#FFF0F0" },
            ].map(m => (
              <div key={m.label} style={{
                background: m.color, borderRadius: 12, padding: "12px 8px",
                textAlign: "center", border: "1px solid rgba(0,0,0,.05)",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{m.val}{m.unit}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* ── Health score */}
          <div style={{
            background: "#F0FFF0", border: "1.5px solid #C8E6C9",
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>Healthy Score</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: "var(--green)", borderRadius: 20,
                padding: "3px 10px", fontSize: 13, fontWeight: 700, color: "#fff",
              }}>
                {score}.0/10
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700, fontStyle: "italic",
                color: score >= 8 ? "var(--green)" : score >= 6 ? "#E07A3F" : "var(--red)",
              }}>
                {healthLabel(score)}
              </span>
            </div>
          </div>

          {/* ── Ingredients */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              Ingredients
            </div>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "9px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--green)", flexShrink: 0, marginRight: 12,
                }} />
                <span style={{ flex: 1, fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{ing.n}</span>
                <span style={{
                  borderBottom: "1.5px dashed var(--border)",
                  flex: 1, margin: "0 10px", height: 1,
                }} />
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, flexShrink: 0 }}>{ing.q}</span>
              </div>
            ))}
          </div>

          {/* ── Cooking directions */}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
              Cooking Directions
            </div>
            {recipe.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 13,
                  background: "var(--green)", color: "#fff",
                  flexShrink: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, paddingTop: 3 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sticky bottom CTA */}
        <div style={{
          position: "sticky", bottom: 0,
          background: "var(--card)", padding: "12px 16px 24px",
          borderTop: "1px solid var(--border)",
        }}>
          <button className="btn btn-primary" style={{
            width: "100%", padding: "15px",
            borderRadius: 16, fontSize: 15, fontWeight: 700,
            background: "#1E2D1B", color: "#fff",
          }}>
            Add to Today's Plan
          </button>
        </div>
      </div>
    </div>
  );
}

type SortMode = "recommended" | "time" | "calorie";

interface RecipesScreenProps {
  favorites: string[];
  toggleFav: (id: string) => void;
}
function RecipesScreen({ favorites, toggleFav }: RecipesScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MealType>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<Recipe | null>(null);

  const MEAL_FILTERS: { id: "all" | MealType; label: string; emoji: string }[] = [
    { id: "all", label: "All", emoji: "🍽️" },
    { id: "breakfast", label: "Breakfast", emoji: "🌅" },
    { id: "lunch", label: "Lunch", emoji: "☀️" },
    { id: "snack", label: "Snack", emoji: "🍎" },
    { id: "dinner", label: "Dinner", emoji: "🌙" },
  ];

  const filtered = RECIPES.filter((r) => {
    const mt = filter === "all" || r.type === filter;
    const mq = !query ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.includes(query.toLowerCase()));
    return mt && mq;
  }).sort((a, b) => {
    if (sort === "time") return a.prepTime - b.prepTime;
    if (sort === "calorie") return a.calories - b.calories;
    return 0; // recommended = natural order
  });

  return (
    <div className="screen" style={{ background: "#F7F5F2" }}>
      {/* ── Top header */}
      <div style={{
        background: "#F7F5F2", padding: "16px 16px 0",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 14,
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 }}>
            Recipes
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{
              width: 38, height: 38, borderRadius: 19, background: "var(--card)",
              border: "1.5px solid var(--border)", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Search size={16} color="var(--muted)" />
            </button>
            <button className="btn" style={{
              width: 38, height: 38, borderRadius: 19, background: "var(--card)",
              border: "1.5px solid var(--border)", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Heart size={16} color="var(--muted)" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)", borderRadius: 14,
          padding: "10px 14px", marginBottom: 12,
          border: "1.5px solid var(--border)",
        }}>
          <Search size={15} color="var(--muted)" />
          <input
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: "none", background: "none", flex: 1,
              fontSize: 14, color: "var(--text)", outline: "none",
              fontFamily: "'DM Sans',sans-serif",
            }}
          />
          {query && <X size={14} color="var(--muted)" onClick={() => setQuery("")} style={{ cursor: "pointer" }} />}
        </div>

        {/* Meal type filter chips with emojis */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
          {MEAL_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 20, flexShrink: 0,
                border: filter === f.id ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                background: filter === f.id ? "var(--green-l)" : "var(--card)",
                color: filter === f.id ? "var(--green)" : "var(--text)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              <span>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Sort tabs */}
        <div style={{ display: "flex", gap: 20, paddingBottom: 10, borderBottom: "1.5px solid var(--border)" }}>
          {(["recommended", "time", "calorie"] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: sort === s ? 700 : 500,
                color: sort === s ? "var(--text)" : "var(--muted)",
                paddingBottom: 8, fontFamily: "'DM Sans',sans-serif",
                borderBottom: sort === s ? "2px solid var(--text)" : "2px solid transparent",
                textTransform: "capitalize",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {s === "recommended" ? "Recommended" : s === "time" ? "Cooking time ↑" : "Calorie ↑"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Recipe grid */}
      <div style={{ padding: "14px 14px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No recipes found</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map((recipe) => {
              const photo = RECIPE_PHOTOS[recipe.id] ?? null;
              const isFav = favorites.includes(recipe.id);
              return (
                <div
                  key={recipe.id}
                  onClick={() => setSelected(recipe)}
                  style={{
                    background: "var(--card)", borderRadius: 16,
                    overflow: "hidden", cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(30,45,27,.07)",
                    transition: "transform .12s",
                  }}
                >
                  {/* Photo */}
                  <div style={{ position: "relative" }}>
                    <img
                      src={photo}
                      alt={recipe.name}
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                        (t.parentElement as HTMLElement).style.background = "var(--bg)";
                        (t.parentElement as HTMLElement).style.height = "140px";
                        (t.parentElement as HTMLElement).innerHTML =
                          `<div style="height:140px;display:flex;align-items:center;justify-content:center;font-size:40px;background:var(--bg)">${recipe.emoji}</div>`;
                      }}
                    />
                    {/* Fav button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFav(recipe.id); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        width: 30, height: 30, borderRadius: 15,
                        background: "rgba(255,255,255,.9)",
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 6px rgba(0,0,0,.15)",
                      }}
                    >
                      <Heart size={14} fill={isFav ? "#E85454" : "none"} color={isFav ? "#E85454" : "#999"} />
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: "var(--text)",
                      lineHeight: 1.35, marginBottom: 8,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {recipe.name}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        background: "#FFF5EC", borderRadius: 20,
                        padding: "3px 8px", fontSize: 11, fontWeight: 500,
                        color: "#9E5A00", border: "1px solid #FFE0B2",
                      }}>
                        ⏱ {recipe.prepTime} min
                      </span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        background: "#FFF0F0", borderRadius: 20,
                        padding: "3px 8px", fontSize: 11, fontWeight: 500,
                        color: "#C62828", border: "1px solid #FFCDD2",
                      }}>
                        🔥 {recipe.calories} kcal
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail modal */}
      {selected && (
        <RecipeDetailModal
          recipe={selected}
          isFav={favorites.includes(selected.id)}
          onFav={() => toggleFav(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── TRACKER ───────────────────────────────────────────────────────────────────
interface TrackerProps {
  profile: Profile;
  plan: Plan;
  consumed: Consumed;
  setConsumed: (c: Consumed) => void;
}
function TrackerScreen({ profile, plan, consumed, setConsumed }: TrackerProps) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const totals: Macros = {
    calories: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].calories : 0),
      0
    ),
    protein: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].protein : 0),
      0
    ),
    carbs: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].carbs : 0),
      0
    ),
    fat: (Object.keys(plan) as MealType[]).reduce(
      (s, k) => s + (consumed[k] ? plan[k].fat : 0),
      0
    ),
  };
  const targets: Macros = {
    calories: profile.calorieTarget,
    protein: Math.round((profile.calorieTarget * 0.25) / 4),
    carbs: Math.round((profile.calorieTarget * 0.5) / 4),
    fat: Math.round((profile.calorieTarget * 0.25) / 9),
  };
  const weekData = [
    { day: "Mon", cal: Math.round(targets.calories * 0.92) },
    { day: "Tue", cal: Math.round(targets.calories * 1.01) },
    { day: "Wed", cal: Math.round(targets.calories * 0.87) },
    { day: "Thu", cal: Math.round(targets.calories * 1.05) },
    { day: "Fri", cal: Math.round(targets.calories * 0.95) },
    { day: "Sat", cal: Math.round(targets.calories * 0.78) },
    { day: "Today", cal: totals.calories },
  ];

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <h1
          className="serif"
          style={{ fontSize: 22, color: "#fff", marginBottom: 14 }}
        >
          Calorie Tracker
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {(["daily", "weekly"] as const).map((v) => (
            <div
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: view === v ? "#fff" : "rgba(255,255,255,.2)",
                color: view === v ? "var(--green)" : "#fff",
                textTransform: "capitalize",
              }}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        {view === "daily" ? (
          <>
            <div
              className="card"
              style={{
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 14,
              }}
            >
              <Ring
                val={totals.calories}
                max={targets.calories}
                label={String(totals.calories)}
                sub="kcal"
                size={100}
                stroke={9}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  {targets.calories - totals.calories > 0
                    ? `${targets.calories - totals.calories} kcal left`
                    : `${totals.calories - targets.calories} kcal over`}
                </div>
                <MacroBar
                  label="Protein"
                  val={totals.protein}
                  max={targets.protein}
                  color="#3A6B35"
                />
                <MacroBar
                  label="Carbs"
                  val={totals.carbs}
                  max={targets.carbs}
                  color="#E07A3F"
                />
                <MacroBar
                  label="Fat"
                  val={totals.fat}
                  max={targets.fat}
                  color="#7C5CBF"
                />
              </div>
            </div>
            <div className="card" style={{ padding: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                Meal Checklist
              </div>
              {(["breakfast", "lunch", "snack", "dinner"] as MealType[]).map(
                (type) => {
                  const meal = plan[type];
                  const done = consumed[type];
                  return (
                    <div
                      key={type}
                      onClick={() =>
                        setConsumed({ ...consumed, [type]: !done })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${
                            done ? "var(--green)" : "var(--border)"
                          }`,
                          background: done ? "var(--green)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {done && <Check size={13} color="#fff" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: done ? 400 : 600,
                            textDecoration: done ? "line-through" : "none",
                            color: done ? "var(--muted)" : "var(--text)",
                          }}
                        >
                          {meal.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {type}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: done ? "var(--muted)" : "var(--text)",
                        }}
                      >
                        {meal.calories} kcal
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ padding: "16px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Weekly Calories
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 14,
                }}
              >
                vs {targets.calories} kcal target
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekData} barSize={26}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#7B8C79" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="cal" radius={[5, 5, 0, 0]}>
                    {weekData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 6
                            ? "var(--green)"
                            : entry.cal > targets.calories
                            ? "var(--orange)"
                            : "#C8E4C7"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {(
                [
                  [
                    "Avg Calories",
                    `${Math.round(
                      weekData.reduce((s, d) => s + d.cal, 0) / 7
                    )} kcal`,
                    "🔥",
                  ],
                  ["Goal Days", "5/7", "🎯"],
                  ["Streak", "4 days", "🔥"],
                  ["On Track", "Yes! 💪", "✅"],
                ] as [string, string, string][]
              ).map(([label, val, icon]) => (
                <div
                  key={label}
                  className="card"
                  style={{ padding: "14px", textAlign: "center" }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── GROCERY ───────────────────────────────────────────────────────────────────
interface GroceryProps {
  plan: Plan;
}
function GroceryScreen({ plan }: GroceryProps) {
  const makeItems = (p: Plan): GroceryItem[] => groceryFromPlan(p);
  const [items, setItems] = useState<GroceryItem[]>(() => makeItems(plan));
  useEffect(() => setItems(makeItems(plan)), [plan]);

  const toggle = (id: string) =>
    setItems((its) =>
      its.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  const clearDone = () => setItems((its) => its.filter((i) => !i.checked));
  const checked = items.filter((i) => i.checked).length;
  const cats: Category[] = [
    "vegetables",
    "dairy",
    "grains",
    "spices",
    "pantry",
  ];
  const catLabels: Record<Category, string> = {
    vegetables: "🥦 Vegetables",
    dairy: "🥛 Dairy",
    grains: "🌾 Grains",
    spices: "🌶️ Spices",
    pantry: "🫙 Pantry",
  };

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h1
              className="serif"
              style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
            >
              Grocery List
            </h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              From today's meal plan
            </div>
          </div>
          {checked > 0 && (
            <button
              className="btn"
              onClick={clearDone}
              style={{
                background: "rgba(255,255,255,.2)",
                color: "#fff",
                padding: "8px 14px",
                fontSize: 13,
                borderRadius: 10,
                border: "none",
              }}
            >
              Clear ({checked})
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        {cats.map((cat) => {
          const catItems = items.filter((i) => i.cat === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {catLabels[cat]}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {catItems.map((item, i) => (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      cursor: "pointer",
                      borderBottom:
                        i < catItems.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      background: item.checked ? "#F8FFF8" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        border: `2px solid ${
                          item.checked ? "var(--green)" : "var(--border)"
                        }`,
                        background: item.checked
                          ? "var(--green)"
                          : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.checked && <Check size={11} color="#fff" />}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textDecoration: item.checked ? "line-through" : "none",
                        color: item.checked ? "var(--muted)" : "var(--text)",
                        fontSize: 14,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        fontWeight: 500,
                      }}
                    >
                      {item.qty}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {items.filter((i) => !i.checked).length} remaining · {checked} checked
          ✓
        </div>
      </div>
    </div>
  );
}

// ── PANTRY ────────────────────────────────────────────────────────────────────
function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>(() => {
    try {
      const v = localStorage.getItem("vegfit-pantry");
      return v ? JSON.parse(v) : DEFAULT_PANTRY;
    } catch {
      return DEFAULT_PANTRY;
    }
  });
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PantryItem, "id" | "low">>({
    name: "",
    qty: 100,
    unit: "g",
    cat: "vegetables",
  });

  useEffect(() => {
    try {
      localStorage.setItem("vegfit-pantry", JSON.stringify(items));
    } catch {}
  }, [items]);

  const updateQty = (id: string, delta: number) =>
    setItems((its) =>
      its.map((i) =>
        i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i
      )
    );
  const remove = (id: string) =>
    setItems((its) => its.filter((i) => i.id !== id));
  const add = () => {
    if (!newItem.name) return;
    setItems((its) => [
      ...its,
      { ...newItem, id: `p${Date.now()}`, low: Math.round(newItem.qty * 0.2) },
    ]);
    setNewItem({ name: "", qty: 100, unit: "g", cat: "vegetables" });
    setAdding(false);
  };

  const lowItems = items.filter((i) => i.qty <= i.low);
  const cats: Category[] = [
    "vegetables",
    "dairy",
    "grains",
    "spices",
    "pantry",
  ];
  const catLabels: Record<Category, string> = {
    vegetables: "🥦 Vegetables",
    dairy: "🥛 Dairy",
    grains: "🌾 Grains",
    spices: "🌶️ Spices",
    pantry: "🫙 Pantry",
  };

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h1
              className="serif"
              style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
            >
              Pantry
            </h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              {items.length} items · {lowItems.length} low
            </div>
          </div>
          <button
            className="btn"
            onClick={() => setAdding(true)}
            style={{
              background: "var(--orange)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
            }}
          >
            <Plus size={15} color="#fff" /> Add
          </button>
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        {lowItems.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "var(--red)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              ⚠️ Running Low
            </div>
            {lowItems.map((item) => (
              <div
                key={item.id}
                className="card low-stock"
                style={{
                  padding: "12px 14px",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--red)" }}>
                    Only {item.qty}
                    {item.unit} left
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 12,
                    background: "#FEE2E2",
                    color: "var(--red)",
                    fontWeight: 600,
                  }}
                >
                  Reorder
                </span>
              </div>
            ))}
          </div>
        )}
        {cats.map((cat) => {
          const catItems = items.filter((i) => i.cat === cat && i.qty > i.low);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {catLabels[cat]}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {catItems.map((item, i) => {
                  const pct = Math.min(item.qty / (item.low * 5), 1) * 100;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "12px 14px",
                        borderBottom:
                          i < catItems.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {item.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              className="qty-btn"
                              onClick={() => updateQty(item.id, -10)}
                            >
                              −
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                minWidth: 55,
                                textAlign: "center",
                              }}
                            >
                              {item.qty}
                              {item.unit}
                            </span>
                            <div
                              className="qty-btn"
                              onClick={() => updateQty(item.id, 10)}
                            >
                              +
                            </div>
                          </div>
                          <div
                            onClick={() => remove(item.id)}
                            style={{ cursor: "pointer", padding: "4px" }}
                          >
                            <Trash2 size={13} color="var(--muted)" />
                          </div>
                        </div>
                      </div>
                      <div className="macro-bar">
                        <div
                          className="macro-fill"
                          style={{
                            width: `${pct}%`,
                            background: `hsl(${pct},55%,42%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Add Item
              </div>
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Name
                </div>
                <input
                  value={newItem.name}
                  placeholder="Item name"
                  onChange={(e) =>
                    setNewItem((n) => ({ ...n, name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: "1.5px solid var(--border)",
                    fontSize: 15,
                    outline: "none",
                    background: "var(--card)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    Quantity
                  </div>
                  <input
                    type="number"
                    value={newItem.qty}
                    onChange={(e) =>
                      setNewItem((n) => ({ ...n, qty: +e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 10,
                      border: "1.5px solid var(--border)",
                      fontSize: 15,
                      outline: "none",
                      background: "var(--card)",
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    Unit
                  </div>
                  <input
                    value={newItem.unit}
                    placeholder="g / ml / pcs"
                    onChange={(e) =>
                      setNewItem((n) => ({ ...n, unit: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 10,
                      border: "1.5px solid var(--border)",
                      fontSize: 15,
                      outline: "none",
                      background: "var(--card)",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  Category
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(
                    [
                      "vegetables",
                      "dairy",
                      "grains",
                      "spices",
                      "pantry",
                    ] as Category[]
                  ).map((c) => (
                    <div
                      key={c}
                      className={`chip ${newItem.cat === c ? "active" : ""}`}
                      onClick={() => setNewItem((n) => ({ ...n, cat: c }))}
                      style={{ textTransform: "capitalize" }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setAdding(false)}
                  style={{ flex: 1, padding: "14px" }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={add}
                  style={{ flex: 1, padding: "14px" }}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SIGN IN SCREEN ────────────────────────────────────────────────────────────
function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>🥗</div>
        <h1
          className="serif"
          style={{ fontSize: 36, color: "var(--text)", marginBottom: 8 }}
        >
          VegFit
        </h1>
        <div style={{ fontSize: 15, color: "var(--muted)" }}>
          Indian Vegetarian Fitness Planner
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: "32px 24px",
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          Welcome back 👋
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
          Sign in to sync your meal plans,
          <br />
          progress and favourites across devices
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            border: "1.5px solid var(--border)",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            opacity: loading ? 0.7 : 1,
            transition: "all .2s",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5C9.7 39.7 16.3 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"
            />
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--red)" }}>
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            fontSize: 11,
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          By signing in, your data is securely stored
          <br />
          in the cloud and synced across all your devices.
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
type TabId = "home" | "recipes" | "tracker" | "grocery" | "pantry";

export default function VegFit() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<TabId>("home");
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);
  const [consumed, setConsumed] = useState<Consumed>({
    breakfast: false,
    lunch: false,
    snack: false,
    dinner: false,
  });
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setDataLoading(true);
        const [prof, pl, cons, favs] = await Promise.all([
          fsGet<Profile | null>(u.id, "profile", null),
          fsGet<Plan>(u.id, "plan", DEFAULT_PLAN),
          fsGet<Consumed>(u.id, "consumed", {
            breakfast: false,
            lunch: false,
            snack: false,
            dinner: false,
          }),
          fsGet<string[]>(u.id, "favorites", []),
        ]);
        setProfile(prof);
        setPlan(pl);
        setConsumed(cons);
        setFavorites(favs);
        setDataLoading(false);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveProfile = async (p: Profile) => {
    setProfile(p);
    if (user) await fsSet(user.id, "profile", p);
  };
  const savePlan = async (p: Plan) => {
    setPlan(p);
    if (user) await fsSet(user.id, "plan", p);
  };
  const saveConsumed = async (c: Consumed) => {
    setConsumed(c);
    if (user) await fsSet(user.id, "consumed", c);
  };
  const toggleFav = async (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(next);
    if (user) await fsSet(user.id, "favorites", next);
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPlan(DEFAULT_PLAN);
    setConsumed({
      breakfast: false,
      lunch: false,
      snack: false,
      dinner: false,
    });
    setFavorites([]);
  };

  // Loading spinner
  if (authLoading || dataLoading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🥗</div>
        <div style={{ fontSize: 14, color: "var(--muted)" }}>
          {authLoading ? "Loading..." : "Syncing your data..."}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border)",
            borderTopColor: "var(--green)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );

  // Not signed in
  if (!user)
    return (
      <div className="app">
        <SignInScreen onSignIn={() => {}} />
      </div>
    );

  // Signed in but no profile yet → onboarding
  if (!profile)
    return (
      <div className="app">
        <Onboarding onComplete={saveProfile} />
      </div>
    );

  const tabs: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
  }[] = [
    {
      id: "home",
      label: "Plan",
      icon: <Home size={22} color="var(--muted)" />,
      activeIcon: <Home size={22} color="var(--green)" />,
    },
    {
      id: "recipes",
      label: "Recipes",
      icon: <BookOpen size={22} color="var(--muted)" />,
      activeIcon: <BookOpen size={22} color="var(--green)" />,
    },
    {
      id: "tracker",
      label: "Track",
      icon: <BarChart2 size={22} color="var(--muted)" />,
      activeIcon: <BarChart2 size={22} color="var(--green)" />,
    },
    {
      id: "grocery",
      label: "Grocery",
      icon: <ShoppingCart size={22} color="var(--muted)" />,
      activeIcon: <ShoppingCart size={22} color="var(--green)" />,
    },
    {
      id: "pantry",
      label: "Pantry",
      icon: <Package size={22} color="var(--muted)" />,
      activeIcon: <Package size={22} color="var(--green)" />,
    },
  ];

  return (
    <div className="app">
      {/* User avatar + sign out bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          zIndex: 200,
          background: "rgba(58,107,53,0.95)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          paddingTop: "max(10px, env(safe-area-inset-top))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,.4)",
              }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(255,255,255,.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(user.user_metadata?.full_name ?? user.email ?? "U")[0]}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              color: "#fff",
              fontWeight: 600,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.user_metadata?.full_name ?? user.email}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: "rgba(255,255,255,.2)",
            border: "none",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <LogOut size={13} color="#fff" /> Sign out
        </button>
      </div>

      <div
        style={{ height: "100vh", overflowY: "auto", paddingTop: 50 }}
        className="fade-in"
      >
        {tab === "home" && (
          <HomeScreen
            profile={profile}
            plan={plan}
            setPlan={savePlan}
            consumed={consumed}
            setConsumed={saveConsumed}
            favorites={favorites}
            toggleFav={toggleFav}
          />
        )}
        {tab === "recipes" && (
          <RecipesScreen favorites={favorites} toggleFav={toggleFav} />
        )}
        {tab === "tracker" && (
          <TrackerScreen
            profile={profile}
            plan={plan}
            consumed={consumed}
            setConsumed={saveConsumed}
          />
        )}
        {tab === "grocery" && <GroceryScreen plan={plan} />}
        {tab === "pantry" && <PantryScreen />}
      </div>
      <div className="tab-bar">
        {tabs.map(({ id, label, icon, activeIcon }) => (
          <button
            key={id}
            className={`tab-item ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {tab === id ? activeIcon : icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}