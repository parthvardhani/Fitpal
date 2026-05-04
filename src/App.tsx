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
  "https://hvintnhqfkehcainqehm.supabase.co",
  "REMOVED_FROM_HISTORY",  // your full hardcoded key
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
const RECIPES: Recipe[] = [
  // ── BREAKFAST ──────────────────────────────────────────────────────────────
  {
    id: "r1",
    type: "breakfast",
    name: "Moong Dal Cheela",
    calories: 285,
    protein: 18,
    carbs: 32,
    fat: 8,
    prepTime: 15,
    tags: ["high-protein", "vegan", "quick"],
    emoji: "🫓",
    ingredients: [
      { n: "Moong dal (split)", q: "½ cup", cat: "grains" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Green chilli", q: "1", cat: "vegetables" },
      { n: "Ginger", q: "½ inch", cat: "spices" },
      { n: "Cumin seeds", q: "½ tsp", cat: "spices" },
      { n: "Oil", q: "1 tsp", cat: "pantry" },
      { n: "Coriander leaves", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Soak moong dal 2 hrs, drain and grind to smooth batter.",
      "Add chopped onion, chilli, ginger, cumin, salt.",
      "Heat non-stick pan, pour batter and spread thin.",
      "Cook 2-3 min until golden, flip and cook other side.",
      "Serve hot with mint chutney or curd.",
    ],
  },
  {
    id: "r2",
    type: "breakfast",
    name: "Masala Oats Upma",
    calories: 320,
    protein: 12,
    carbs: 48,
    fat: 9,
    prepTime: 10,
    tags: ["quick", "vegan"],
    emoji: "🥣",
    ingredients: [
      { n: "Rolled oats", q: "1 cup", cat: "grains" },
      { n: "Mixed vegetables", q: "½ cup", cat: "vegetables" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Mustard seeds", q: "½ tsp", cat: "spices" },
      { n: "Turmeric", q: "¼ tsp", cat: "spices" },
      { n: "Lemon juice", q: "1 tbsp", cat: "vegetables" },
    ],
    steps: [
      "Dry roast oats 2-3 min, set aside.",
      "Heat oil, add mustard seeds, then onion.",
      "Add vegetables, cook 3 min.",
      "Add turmeric, salt, 1.5 cups water, bring to boil.",
      "Add oats, stir, cook 3 min until thick.",
      "Squeeze lemon, garnish with coriander.",
    ],
  },
  {
    id: "r3",
    type: "breakfast",
    name: "Paneer Paratha",
    calories: 420,
    protein: 22,
    carbs: 45,
    fat: 16,
    prepTime: 20,
    tags: ["high-protein", "filling"],
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
    type: "breakfast",
    name: "Peanut Butter Banana Smoothie",
    calories: 350,
    protein: 14,
    carbs: 52,
    fat: 11,
    prepTime: 5,
    tags: ["quick", "vegan", "no-cook"],
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
    id: "r16",
    type: "breakfast",
    name: "Besan Cheela",
    calories: 300,
    protein: 16,
    carbs: 34,
    fat: 9,
    prepTime: 10,
    tags: ["high-protein", "vegan", "gluten-free", "quick"],
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
    id: "r17",
    type: "breakfast",
    name: "Quinoa Upma",
    calories: 340,
    protein: 14,
    carbs: 50,
    fat: 8,
    prepTime: 20,
    tags: ["high-protein", "vegan", "gluten-free", "superfood"],
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
    type: "breakfast",
    name: "Ragi Uttapam",
    calories: 290,
    protein: 10,
    carbs: 46,
    fat: 7,
    prepTime: 15,
    tags: ["vegan", "gluten-free", "south-indian"],
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
    id: "r18",
    type: "breakfast",
    name: "Dalia Paneer Upma",
    calories: 380,
    protein: 22,
    carbs: 44,
    fat: 11,
    prepTime: 25,
    tags: ["high-protein", "filling", "north-indian"],
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
    id: "r19",
    type: "breakfast",
    name: "Soya Poha",
    calories: 360,
    protein: 20,
    carbs: 46,
    fat: 9,
    prepTime: 15,
    tags: ["high-protein", "quick", "maharashtrian"],
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
    id: "r20",
    type: "breakfast",
    name: "Greek Yogurt Parfait",
    calories: 280,
    protein: 18,
    carbs: 34,
    fat: 6,
    prepTime: 5,
    tags: ["no-cook", "high-protein", "quick", "sweet"],
    emoji: "🍓",
    ingredients: [
      { n: "Greek yogurt", q: "1 cup", cat: "dairy" },
      { n: "Banana", q: "1", cat: "vegetables" },
      { n: "Mixed berries / pomegranate", q: "½ cup", cat: "vegetables" },
      { n: "Granola / muesli", q: "3 tbsp", cat: "grains" },
      { n: "Honey", q: "1 tsp", cat: "pantry" },
      { n: "Chia seeds", q: "1 tsp", cat: "pantry" },
    ],
    steps: [
      "Layer Greek yogurt in a tall glass or bowl.",
      "Add sliced banana and berries.",
      "Top with granola or muesli.",
      "Drizzle honey and sprinkle chia seeds. Serve immediately.",
    ],
  },
  {
    id: "r21",
    type: "breakfast",
    name: "Moong Dal Paneer Chilla",
    calories: 340,
    protein: 24,
    carbs: 30,
    fat: 12,
    prepTime: 20,
    tags: ["high-protein", "filling", "keto-friendly"],
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
    id: "r22",
    type: "breakfast",
    name: "Sprouted Moong Salad",
    calories: 210,
    protein: 15,
    carbs: 30,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein", "vegan", "no-cook", "raw"],
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
  // ── LUNCH ──────────────────────────────────────────────────────────────────
  {
    id: "r5",
    type: "lunch",
    name: "Dal Tadka + Brown Rice",
    calories: 480,
    protein: 24,
    carbs: 72,
    fat: 10,
    prepTime: 30,
    tags: ["high-protein", "vegan", "classic"],
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
    id: "r6",
    type: "lunch",
    name: "Chana Masala",
    calories: 440,
    protein: 21,
    carbs: 68,
    fat: 9,
    prepTime: 25,
    tags: ["high-protein", "vegan", "spicy"],
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
    id: "r7",
    type: "lunch",
    name: "Paneer Bhurji Bowl",
    calories: 520,
    protein: 32,
    carbs: 38,
    fat: 22,
    prepTime: 20,
    tags: ["high-protein", "quick"],
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
    id: "r8",
    type: "lunch",
    name: "Rajma Chawal",
    calories: 500,
    protein: 22,
    carbs: 80,
    fat: 8,
    prepTime: 35,
    tags: ["high-protein", "vegan", "classic"],
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
    id: "r23",
    type: "lunch",
    name: "Soya Chunks Curry",
    calories: 490,
    protein: 38,
    carbs: 48,
    fat: 11,
    prepTime: 25,
    tags: ["highest-protein", "vegan", "muscle-gain"],
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
    id: "r24",
    type: "lunch",
    name: "Kala Chana Masala",
    calories: 420,
    protein: 22,
    carbs: 62,
    fat: 8,
    prepTime: 30,
    tags: ["high-protein", "vegan", "iron-rich"],
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
    id: "r25",
    type: "lunch",
    name: "Matar Paneer",
    calories: 460,
    protein: 26,
    carbs: 42,
    fat: 18,
    prepTime: 25,
    tags: ["high-protein", "classic", "north-indian"],
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
    id: "r26",
    type: "lunch",
    name: "Quinoa Khichdi",
    calories: 430,
    protein: 20,
    carbs: 58,
    fat: 10,
    prepTime: 25,
    tags: ["high-protein", "vegan", "one-pot", "gluten-free"],
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
    id: "r27",
    type: "lunch",
    name: "Lobia Masala",
    calories: 400,
    protein: 20,
    carbs: 62,
    fat: 7,
    prepTime: 30,
    tags: ["high-protein", "vegan", "protein-rich"],
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
    id: "r28",
    type: "lunch",
    name: "Paneer Tikka Masala",
    calories: 540,
    protein: 34,
    carbs: 36,
    fat: 24,
    prepTime: 35,
    tags: ["high-protein", "restaurant-style", "indulgent"],
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
    id: "r29",
    type: "lunch",
    name: "Mixed Dal Khichdi",
    calories: 450,
    protein: 22,
    carbs: 68,
    fat: 9,
    prepTime: 25,
    tags: ["high-protein", "comfort-food", "vegan", "one-pot"],
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
  // ── SNACKS ──────────────────────────────────────────────────────────────────
  {
    id: "r9",
    type: "snack",
    name: "Sprouts Chaat",
    calories: 180,
    protein: 12,
    carbs: 26,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein", "vegan", "quick"],
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
    id: "r10",
    type: "snack",
    name: "Roasted Makhana",
    calories: 150,
    protein: 5,
    carbs: 32,
    fat: 2,
    prepTime: 8,
    tags: ["vegan", "light", "crunchy"],
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
    id: "r11",
    type: "snack",
    name: "Hung Curd with Nuts",
    calories: 160,
    protein: 14,
    carbs: 18,
    fat: 2,
    prepTime: 2,
    tags: ["high-protein", "quick", "no-cook"],
    emoji: "🍯",
    ingredients: [
      { n: "Greek yogurt / Hung curd", q: "1 cup", cat: "dairy" },
      { n: "Honey", q: "1 tsp", cat: "pantry" },
      { n: "Walnuts / Almonds", q: "6-8", cat: "pantry" },
      { n: "Cinnamon", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Place thick yogurt in bowl.",
      "Drizzle honey on top.",
      "Add chopped nuts.",
      "Dust cinnamon, serve immediately.",
    ],
  },
  {
    id: "r30",
    type: "snack",
    name: "Peanut Chikki",
    calories: 200,
    protein: 8,
    carbs: 22,
    fat: 10,
    prepTime: 10,
    tags: ["vegan", "energy-boost", "sweet"],
    emoji: "🍫",
    ingredients: [
      { n: "Roasted peanuts", q: "½ cup", cat: "pantry" },
      { n: "Jaggery", q: "3 tbsp", cat: "pantry" },
      { n: "Cardamom powder", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Melt jaggery in a pan with 1 tbsp water on medium heat.",
      "When it reaches single-thread consistency, add peanuts and cardamom.",
      "Mix quickly and pour onto a greased surface.",
      "Flatten and cut into pieces while warm. Cool completely before storing.",
    ],
  },
  {
    id: "r31",
    type: "snack",
    name: "Dahi Chana Chaat",
    calories: 200,
    protein: 14,
    carbs: 28,
    fat: 4,
    prepTime: 5,
    tags: ["high-protein", "no-cook", "quick", "probiotic"],
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
    id: "r32",
    type: "snack",
    name: "Almond Dates Balls",
    calories: 180,
    protein: 5,
    carbs: 24,
    fat: 9,
    prepTime: 10,
    tags: ["vegan", "no-cook", "energy-ball", "sweet"],
    emoji: "🟤",
    ingredients: [
      { n: "Medjool dates", q: "8-10", cat: "pantry" },
      { n: "Almonds", q: "½ cup", cat: "pantry" },
      { n: "Desiccated coconut", q: "2 tbsp", cat: "pantry" },
      { n: "Cardamom powder", q: "¼ tsp", cat: "spices" },
    ],
    steps: [
      "Pulse almonds in a blender to coarse powder.",
      "Add pitted dates and cardamom, blend until sticky.",
      "Roll into small balls using your hands.",
      "Coat with desiccated coconut.",
      "Refrigerate 30 min. Store up to 1 week.",
    ],
  },
  {
    id: "r33",
    type: "snack",
    name: "Boiled Chana Salad",
    calories: 190,
    protein: 13,
    carbs: 30,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein", "vegan", "no-cook"],
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
  // ── DINNER ──────────────────────────────────────────────────────────────────
  {
    id: "r12",
    type: "dinner",
    name: "Palak Paneer",
    calories: 420,
    protein: 24,
    carbs: 28,
    fat: 18,
    prepTime: 30,
    tags: ["high-protein", "iron-rich", "classic"],
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
    id: "r13",
    type: "dinner",
    name: "Dal Makhani",
    calories: 460,
    protein: 20,
    carbs: 58,
    fat: 14,
    prepTime: 40,
    tags: ["classic", "comfort-food", "high-protein"],
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
    id: "r14",
    type: "dinner",
    name: "Tofu Stir-Fry Bowl",
    calories: 380,
    protein: 22,
    carbs: 52,
    fat: 10,
    prepTime: 20,
    tags: ["vegan", "high-protein", "quick"],
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
  },
  {
    id: "r15",
    type: "dinner",
    name: "Methi Thepla",
    calories: 340,
    protein: 12,
    carbs: 48,
    fat: 9,
    prepTime: 25,
    tags: ["classic", "gujarati", "vegan"],
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
    id: "r34",
    type: "dinner",
    name: "Soya Chunks Pulao",
    calories: 480,
    protein: 36,
    carbs: 58,
    fat: 10,
    prepTime: 30,
    tags: ["highest-protein", "vegan", "one-pot", "muscle-gain"],
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
    id: "r35",
    type: "dinner",
    name: "Paneer Butter Masala",
    calories: 520,
    protein: 28,
    carbs: 34,
    fat: 26,
    prepTime: 30,
    tags: ["high-protein", "restaurant-style", "indulgent"],
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
    id: "r36",
    type: "dinner",
    name: "Baingan Bharta",
    calories: 280,
    protein: 8,
    carbs: 32,
    fat: 12,
    prepTime: 35,
    tags: ["vegan", "smoky", "classic", "low-calorie"],
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
    id: "r37",
    type: "dinner",
    name: "Masoor Dal + Jeera Rice",
    calories: 420,
    protein: 22,
    carbs: 66,
    fat: 8,
    prepTime: 25,
    tags: ["high-protein", "vegan", "quick", "easy"],
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
    id: "r38",
    type: "dinner",
    name: "Chilli Paneer",
    calories: 460,
    protein: 28,
    carbs: 42,
    fat: 18,
    prepTime: 25,
    tags: ["high-protein", "indo-chinese", "spicy", "quick"],
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
    id: "r39",
    type: "dinner",
    name: "Kadhi Pakora",
    calories: 350,
    protein: 14,
    carbs: 40,
    fat: 13,
    prepTime: 35,
    tags: ["classic", "north-indian", "comfort-food"],
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

  // ── MORE BREAKFAST ────────────────────────────────────────────────────────
  {
    id: "r40",
    type: "breakfast",
    name: "Pesarattu (Green Moong Dosa)",
    calories: 310,
    protein: 18,
    carbs: 42,
    fat: 6,
    prepTime: 15,
    tags: ["high-protein", "vegan", "andhra", "gluten-free"],
    emoji: "🟩",
    ingredients: [
      { n: "Whole green moong", q: "1 cup", cat: "grains" },
      { n: "Ginger", q: "1 inch", cat: "spices" },
      { n: "Green chilli", q: "2", cat: "vegetables" },
      { n: "Onion", q: "1 small", cat: "vegetables" },
      { n: "Cumin seeds", q: "1 tsp", cat: "spices" },
      { n: "Coriander", q: "handful", cat: "vegetables" },
    ],
    steps: [
      "Soak whole moong overnight. Drain and grind with ginger and chilli to batter.",
      "Add cumin, salt and thin with water to pouring consistency.",
      "Heat iron tawa, spread thin dosa, scatter chopped onion and coriander.",
      "Cook 3-4 min until edges crisp. No need to flip.",
      "Serve with ginger chutney or coconut chutney.",
    ],
  },
  {
    id: "r41",
    type: "breakfast",
    name: "Sabudana Khichdi",
    calories: 380,
    protein: 6,
    carbs: 70,
    fat: 10,
    prepTime: 20,
    tags: ["vegan", "fasting-friendly", "maharashtrian"],
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
    id: "r42",
    type: "breakfast",
    name: "Multigrain Thalipeeth",
    calories: 340,
    protein: 14,
    carbs: 52,
    fat: 8,
    prepTime: 20,
    tags: ["high-protein", "maharashtrian", "vegan"],
    emoji: "🫓",
    ingredients: [
      { n: "Jowar flour", q: "¼ cup", cat: "grains" },
      { n: "Bajra flour", q: "¼ cup", cat: "grains" },
      { n: "Besan", q: "¼ cup", cat: "grains" },
      { n: "Wheat flour", q: "¼ cup", cat: "grains" },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Coriander + green chilli", q: "handful + 1", cat: "vegetables" },
      { n: "Sesame seeds", q: "1 tsp", cat: "spices" },
    ],
    steps: [
      "Mix all flours with chopped onion, coriander, chilli, sesame and salt.",
      "Add water gradually to form a semi-soft dough.",
      "Place dough ball on greased tawa and pat flat with wet fingers into a thick circle.",
      "Make a hole in centre. Cook on medium heat with oil until golden on both sides.",
      "Serve hot with curd and pickle.",
    ],
  },
  {
    id: "r43",
    type: "breakfast",
    name: "Tofu Bhurji Toast",
    calories: 360,
    protein: 22,
    carbs: 38,
    fat: 14,
    prepTime: 10,
    tags: ["high-protein", "vegan", "fusion", "quick"],
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
    id: "r44",
    type: "breakfast",
    name: "Ragi Porridge",
    calories: 260,
    protein: 8,
    carbs: 46,
    fat: 5,
    prepTime: 10,
    tags: ["vegan", "calcium-rich", "gluten-free", "light"],
    emoji: "🥣",
    ingredients: [
      { n: "Ragi flour", q: "4 tbsp", cat: "grains" },
      { n: "Milk / Oat milk", q: "1.5 cups", cat: "dairy" },
      { n: "Banana", q: "1", cat: "vegetables" },
      { n: "Jaggery", q: "1 tbsp", cat: "pantry" },
      { n: "Cardamom powder", q: "pinch", cat: "spices" },
      { n: "Almonds (sliced)", q: "6", cat: "pantry" },
    ],
    steps: [
      "Dissolve ragi flour in ¼ cup cold milk, ensuring no lumps.",
      "Bring remaining milk to boil in a saucepan.",
      "Pour ragi mixture into boiling milk, stirring continuously.",
      "Cook 5-6 min until thick. Add jaggery and cardamom.",
      "Pour into bowl, top with sliced banana and almonds.",
    ],
  },
  {
    id: "r45",
    type: "breakfast",
    name: "Makhana Smoothie",
    calories: 290,
    protein: 12,
    carbs: 44,
    fat: 7,
    prepTime: 8,
    tags: ["high-protein", "no-cook", "sweet", "calcium-rich"],
    emoji: "🥛",
    ingredients: [
      { n: "Roasted makhana", q: "½ cup", cat: "pantry" },
      { n: "Milk", q: "1.5 cups", cat: "dairy" },
      { n: "Banana", q: "1", cat: "vegetables" },
      { n: "Dates", q: "3", cat: "pantry" },
      { n: "Cardamom powder", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Add all ingredients to blender.",
      "Blend until completely smooth (~90 sec).",
      "Taste and adjust sweetness with dates.",
      "Pour and serve immediately or chill 30 min for a thicker version.",
    ],
  },
  // ── MORE LUNCH ─────────────────────────────────────────────────────────────
  {
    id: "r46",
    type: "lunch",
    name: "Vegetable Biryani",
    calories: 520,
    protein: 14,
    carbs: 82,
    fat: 14,
    prepTime: 45,
    tags: ["festive", "vegan", "one-pot", "aromatic"],
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
    id: "r47",
    type: "lunch",
    name: "Aloo Gobi Sabzi + Roti",
    calories: 420,
    protein: 11,
    carbs: 66,
    fat: 12,
    prepTime: 25,
    tags: ["classic", "vegan", "punjabi"],
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
    id: "r48",
    type: "lunch",
    name: "Moong Dal Soup + Rice",
    calories: 390,
    protein: 22,
    carbs: 58,
    fat: 7,
    prepTime: 20,
    tags: ["high-protein", "vegan", "light", "easy"],
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
    type: "lunch",
    name: "Paneer & Spinach Wrap",
    calories: 470,
    protein: 28,
    carbs: 48,
    fat: 18,
    prepTime: 15,
    tags: ["high-protein", "quick", "fusion"],
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
    id: "r50",
    type: "lunch",
    name: "Chole Kulche",
    calories: 560,
    protein: 20,
    carbs: 84,
    fat: 14,
    prepTime: 30,
    tags: ["street-food", "high-protein", "north-indian"],
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
    id: "r51",
    type: "lunch",
    name: "Rava Dhokla",
    calories: 290,
    protein: 12,
    carbs: 46,
    fat: 7,
    prepTime: 25,
    tags: ["vegan", "gujarati", "steamed", "light"],
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
    id: "r52",
    type: "lunch",
    name: "Stuffed Capsicum",
    calories: 380,
    protein: 18,
    carbs: 44,
    fat: 14,
    prepTime: 30,
    tags: ["high-protein", "baked", "creative"],
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
  // ── MORE SNACKS ────────────────────────────────────────────────────────────
  {
    id: "r53",
    type: "snack",
    name: "Paneer Tikka Skewers",
    calories: 220,
    protein: 18,
    carbs: 8,
    fat: 14,
    prepTime: 20,
    tags: ["high-protein", "keto-friendly", "grilled"],
    emoji: "🍢",
    ingredients: [
      { n: "Paneer", q: "150g", cat: "dairy" },
      { n: "Capsicum + onion", q: "½ each", cat: "vegetables" },
      { n: "Hung curd", q: "3 tbsp", cat: "dairy" },
      { n: "Tikka masala", q: "1 tsp", cat: "spices" },
      { n: "Lemon juice", q: "1 tbsp", cat: "vegetables" },
      { n: "Chaat masala", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Cube paneer and vegetables.",
      "Mix hung curd, tikka masala, lemon juice and salt.",
      "Marinate paneer and veggies 15 min in the curd mix.",
      "Thread onto skewers, alternating paneer and vegetables.",
      "Grill or air fry 10-12 min until charred. Sprinkle chaat masala before serving.",
    ],
  },
  {
    id: "r54",
    type: "snack",
    name: "Roasted Chana",
    calories: 160,
    protein: 10,
    carbs: 24,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein", "vegan", "no-cook", "crunchy"],
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
    id: "r55",
    type: "snack",
    name: "Poha Chivda",
    calories: 190,
    protein: 5,
    carbs: 34,
    fat: 6,
    prepTime: 10,
    tags: ["vegan", "light", "maharashtrian", "crunchy"],
    emoji: "✨",
    ingredients: [
      { n: "Thin poha", q: "1.5 cups", cat: "grains" },
      { n: "Peanuts", q: "3 tbsp", cat: "pantry" },
      { n: "Cashews", q: "10", cat: "pantry" },
      { n: "Curry leaves", q: "8-10", cat: "spices" },
      { n: "Turmeric + red chilli powder", q: "¼ tsp each", cat: "spices" },
      { n: "Sugar", q: "1 tsp", cat: "pantry" },
    ],
    steps: [
      "Dry roast thin poha in a pan 5 min until crispy. Set aside.",
      "In same pan, fry peanuts and cashews until golden.",
      "Add curry leaves, turmeric, chilli powder, salt and sugar.",
      "Toss in the roasted poha and mix well.",
      "Cool completely before storing. Stays crispy for 1 week.",
    ],
  },
  {
    id: "r56",
    type: "snack",
    name: "Oats Banana Cookies",
    calories: 170,
    protein: 5,
    carbs: 28,
    fat: 5,
    prepTime: 15,
    tags: ["vegan", "no-bake", "sweet", "healthy"],
    emoji: "🍪",
    ingredients: [
      { n: "Rolled oats", q: "1 cup", cat: "grains" },
      { n: "Ripe banana", q: "2", cat: "vegetables" },
      { n: "Peanut butter", q: "2 tbsp", cat: "pantry" },
      { n: "Dark chocolate chips", q: "1 tbsp", cat: "pantry" },
      { n: "Cinnamon", q: "½ tsp", cat: "spices" },
    ],
    steps: [
      "Mash bananas well in a bowl.",
      "Add oats, peanut butter, cinnamon and mix thoroughly.",
      "Fold in chocolate chips.",
      "Drop spoonfuls onto a lined tray, flatten slightly.",
      "Bake at 180°C for 12-15 min until golden, or refrigerate 30 min for no-bake version.",
    ],
  },
  {
    id: "r57",
    type: "snack",
    name: "Sweet / Salted Lassi",
    calories: 150,
    protein: 8,
    carbs: 18,
    fat: 5,
    prepTime: 3,
    tags: ["probiotic", "no-cook", "quick", "cooling"],
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
    id: "r58",
    type: "snack",
    name: "Peanut Butter Apple Slices",
    calories: 200,
    protein: 7,
    carbs: 26,
    fat: 9,
    prepTime: 3,
    tags: ["no-cook", "quick", "vegan", "sweet"],
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
  // ── MORE DINNER ────────────────────────────────────────────────────────────
  {
    id: "r59",
    type: "dinner",
    name: "Curd Rice",
    calories: 350,
    protein: 12,
    carbs: 52,
    fat: 10,
    prepTime: 15,
    tags: ["south-indian", "classic", "probiotic", "cooling"],
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
    id: "r60",
    type: "dinner",
    name: "Mushroom Masala",
    calories: 300,
    protein: 12,
    carbs: 30,
    fat: 14,
    prepTime: 20,
    tags: ["vegan", "low-calorie", "quick", "umami"],
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
    id: "r61",
    type: "dinner",
    name: "Lauki Kofta Curry",
    calories: 360,
    protein: 14,
    carbs: 38,
    fat: 16,
    prepTime: 35,
    tags: ["classic", "north-indian", "creative"],
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
    id: "r62",
    type: "dinner",
    name: "Pav Bhaji",
    calories: 420,
    protein: 12,
    carbs: 66,
    fat: 12,
    prepTime: 25,
    tags: ["street-food", "vegan", "classic", "crowd-pleaser"],
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
    id: "r63",
    type: "dinner",
    name: "Miso Tofu Soup + Rice",
    calories: 310,
    protein: 20,
    carbs: 40,
    fat: 8,
    prepTime: 15,
    tags: ["vegan", "high-protein", "fusion", "light"],
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
    id: "r64",
    type: "dinner",
    name: "Vegetable Khow Suey",
    calories: 450,
    protein: 16,
    carbs: 56,
    fat: 18,
    prepTime: 30,
    tags: ["burmese", "fusion", "vegan", "creamy"],
    emoji: "🍜",
    ingredients: [
      { n: "Noodles (egg-free)", q: "100g", cat: "grains" },
      { n: "Coconut milk", q: "1 cup", cat: "pantry" },
      {
        n: "Mixed vegetables (beans, carrot, broccoli)",
        q: "1.5 cups",
        cat: "vegetables",
      },
      { n: "Onion", q: "1", cat: "vegetables" },
      { n: "Turmeric + coriander powder", q: "½ tsp each", cat: "spices" },
      { n: "Lemon + fried onions", q: "1 each", cat: "vegetables" },
    ],
    steps: [
      "Cook noodles as per package. Drain and set aside.",
      "Sauté onion, add vegetables and spices. Cook 5 min.",
      "Add coconut milk and ½ cup water. Simmer 8 min.",
      "Ladle curry over noodles in bowl.",
      "Top with fried onions, squeeze of lemon and coriander.",
    ],
  },
];

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
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
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
              {motiv}
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
interface RecipesScreenProps {
  favorites: string[];
  toggleFav: (id: string) => void;
}
function RecipesScreen({ favorites, toggleFav }: RecipesScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MealType>("all");
  const [selected, setSelected] = useState<Recipe | null>(null);

  const filtered = RECIPES.filter((r) => {
    const mt = filter === "all" || r.type === filter;
    const mq =
      !query ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.includes(query.toLowerCase()));
    return mt && mq;
  });

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <h1
          className="serif"
          style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
        >
          Recipe Library
        </h1>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          65 Indian vegetarian recipes
        </div>
      </div>
      <div style={{ padding: "14px 16px 0" }}>
        <div className="search-bar" style={{ marginBottom: 10 }}>
          <Search size={15} color="var(--muted)" />
          <input
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <span onClick={() => setQuery("")} style={{ cursor: "pointer" }}>
              <X size={14} color="var(--muted)" />
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {(
            ["all", "breakfast", "lunch", "snack", "dinner"] as (
              | "all"
              | MealType
            )[]
          ).map((t) => (
            <div
              key={t}
              className={`chip ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
              style={{ textTransform: "capitalize", flexShrink: 0 }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          {filtered.length} recipes
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="card"
              onClick={() => setSelected(recipe)}
              style={{ cursor: "pointer", overflow: "hidden" }}
            >
              <div style={{ padding: "14px 10px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>
                  {recipe.emoji}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "var(--text)",
                    marginBottom: 3,
                    lineHeight: 1.3,
                  }}
                >
                  {recipe.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    marginBottom: 6,
                    textTransform: "capitalize",
                  }}
                >
                  {recipe.type}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  <span>🔥{recipe.calories}</span>
                  <span>💪{recipe.protein}g</span>
                </div>
              </div>
              <div
                style={{
                  padding: "8px 10px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="tag"
                  style={{ fontSize: 10, padding: "2px 7px" }}
                >
                  {recipe.tags[0]}
                </span>
                <button
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(recipe.id);
                  }}
                  style={{
                    padding: "3px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                  }}
                >
                  <Heart
                    size={13}
                    fill={favorites.includes(recipe.id) ? "#E85454" : "none"}
                    color={
                      favorites.includes(recipe.id) ? "#E85454" : "var(--muted)"
                    }
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <RecipeModal
          meal={selected}
          onClose={() => setSelected(null)}
          isFav={favorites.includes(selected.id)}
          onFav={() => toggleFav(selected.id)}
          onChecked={() => setSelected(null)}
          done={false}
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
