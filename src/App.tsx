import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home,
  BookOpen,
  BarChart2,
  ShoppingCart,
  Package,
  RefreshCw,
  Check,
  Plus,
  Minus,
  Search,
  Heart,
  Clock,
  Flame,
  ChevronRight,
  X,
  Sparkles,
  ChevronLeft,
  Repeat2,
  AlertTriangle,
  Star,
  Leaf,
  Target,
  User,
  Activity,
  Zap,
  ArrowRight,
  Trash2,
  CheckSquare,
  Square,
  MoreHorizontal,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ── STYLES ────────────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, html, #root { height: 100%; background: #F5EFE6; }
  :root {
    --green: #3A6B35; --green-d: #244220; --green-l: #E8F4E7;
    --orange: #E07A3F; --orange-l: #FEF0E7;
    --bg: #F5EFE6; --card: #FFFBF6; --white: #fff;
    --text: #1E2D1B; --muted: #7B8C79; --border: #E2DDD5;
    --red: #D94F4F; --yellow: #E8A020; --purple: #7C5CBF;
    --r: 16px;
  }
  .app { font-family: 'DM Sans', sans-serif; max-width: 430px; margin: 0 auto;
    min-height: 100vh; background: var(--bg); position: relative; overflow: hidden; }
  h1,h2,.serif { font-family: 'Playfair Display', serif; }
  .card { background: var(--card); border-radius: var(--r);
    box-shadow: 0 2px 12px rgba(30,45,27,.07); }
  .btn { border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-weight: 600; border-radius: 12px; transition: all .18s; }
  .btn-primary { background: var(--green); color: #fff; padding: 14px 24px; font-size: 15px; }
  .btn-primary:hover { background: var(--green-d); transform: translateY(-1px); }
  .btn-secondary { background: var(--green-l); color: var(--green); padding: 10px 18px; font-size: 14px; }
  .btn-outline { background: transparent; border: 1.5px solid var(--border);
    color: var(--text); padding: 10px 18px; font-size: 14px; }
  .btn-orange { background: var(--orange); color: #fff; padding: 12px 20px; font-size: 14px; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 500; background: var(--green-l); color: var(--green); }
  .tab-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 430px; background: var(--card);
    border-top: 1px solid var(--border); display: flex;
    box-shadow: 0 -4px 20px rgba(0,0,0,.08); z-index: 100; padding-bottom: env(safe-area-inset-bottom); }
  .tab-item { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 10px 4px 8px; cursor: pointer;
    transition: all .18s; gap: 3px; }
  .tab-item span { font-size: 10px; font-weight: 500; color: var(--muted); }
  .tab-item.active span { color: var(--green); }
  .tab-item.active svg { color: var(--green); }
  .tab-item svg { color: var(--muted); transition: all .18s; }
  .screen { padding: 0 0 90px; min-height: 100vh; }
  .scroll-area { overflow-y: auto; height: 100%; }
  input, textarea { font-family: 'DM Sans', sans-serif; }
  input[type=range] { accent-color: var(--green); }
  .shimmer { animation: shimmer 1.5s infinite; }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton { background: linear-gradient(90deg, #e8e0d6 25%, #f0e9e0 50%, #e8e0d6 75%);
    background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
  .slide-in { animation: slideIn .3s ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn .3s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .pill-select { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill { padding: 8px 16px; border-radius: 20px; border: 1.5px solid var(--border);
    cursor: pointer; font-size: 14px; font-weight: 500; transition: all .15s; background: var(--card); }
  .pill.selected { background: var(--green); color: #fff; border-color: var(--green); }
  .progress-ring-wrap { position: relative; display: inline-flex; 
    align-items: center; justify-content: center; }
  .progress-ring-wrap svg { position: absolute; top: 0; left: 0; }
  .macro-bar { height: 8px; border-radius: 8px; background: var(--border); overflow: hidden; }
  .macro-fill { height: 100%; border-radius: 8px; transition: width .5s ease; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5);
    z-index: 200; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn .2s; }
  .modal-sheet { background: var(--card); border-radius: 24px 24px 0 0;
    max-width: 430px; width: 100%; max-height: 88vh; overflow-y: auto;
    animation: slideUp .3s ease; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .search-bar { display: flex; align-items: center; gap: 10px;
    background: var(--card); border-radius: 14px; padding: 12px 16px;
    border: 1.5px solid var(--border); }
  .search-bar input { border: none; background: none; flex: 1; font-size: 15px;
    color: var(--text); outline: none; }
  .chip { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
    border: 1.5px solid var(--border); cursor: pointer; transition: all .15s;
    white-space: nowrap; background: var(--card); }
  .chip.active { background: var(--green-l); border-color: var(--green); color: var(--green); }
  .qty-row { display: flex; align-items: center; gap: 10px; }
  .qty-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    background: var(--card); font-weight: 700; font-size: 16px; transition: all .15s; }
  .qty-btn:hover { background: var(--green-l); border-color: var(--green); }
  .ai-glow { box-shadow: 0 0 0 0 rgba(58,107,53,0.4); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(58,107,53,.3); }
    50% { box-shadow: 0 0 0 8px rgba(58,107,53,0); } }
  .onboard-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: all .3s; }
  .onboard-dot.active { background: var(--green); width: 22px; border-radius: 4px; }
  .low-stock { border: 1.5px solid #FEE2E2; background: #FFF5F5; }
`;
document.head.appendChild(style);

// ── DATA ──────────────────────────────────────────────────────────────────────
const RECIPES = [
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
    name: "Peanut Butter Smoothie",
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
    tags: ["high-protein", "keto-friendly", "quick"],
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
    id: "r9",
    type: "snack",
    name: "Sprouts Chaat",
    calories: 180,
    protein: 12,
    carbs: 26,
    fat: 3,
    prepTime: 5,
    tags: ["high-protein", "vegan", "no-cook", "quick"],
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
    name: "Peanut Chikki",
    calories: 210,
    protein: 8,
    carbs: 22,
    fat: 11,
    prepTime: 5,
    tags: ["vegan", "energy-boost"],
    emoji: "🍫",
    ingredients: [
      { n: "Roasted peanuts", q: "¼ cup", cat: "pantry" },
      { n: "Jaggery", q: "2 tbsp", cat: "pantry" },
      { n: "Cardamom powder", q: "pinch", cat: "spices" },
    ],
    steps: [
      "Melt jaggery in pan with 1 tbsp water.",
      "Add peanuts and cardamom, mix quickly.",
      "Pour onto greased surface, flatten.",
      "Cut into pieces when cooled.",
    ],
  },
  {
    id: "r12",
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
    id: "r13",
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
      { n: "Cream / cashew paste", q: "2 tbsp", cat: "dairy" },
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
    id: "r14",
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
    id: "r15",
    type: "dinner",
    name: "Tofu Stir-Fry with Rice",
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
      "Stir fry on high heat 3-4 min, keep vegetables crunchy.",
      "Add tofu, pour soy sauce and toss together.",
      "Serve over brown rice with sesame seeds.",
    ],
  },
  {
    id: "r16",
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
];

const getRecipesByType = (t) => RECIPES.filter((r) => r.type === t);

const DEFAULT_PLAN = {
  breakfast: RECIPES[0],
  lunch: RECIPES[4],
  snack: RECIPES[8],
  dinner: RECIPES[12],
};

const DEFAULT_PANTRY = [
  {
    id: "p1",
    name: "Brown rice",
    qty: 500,
    unit: "g",
    cat: "grains",
    low: 100,
  },
  { id: "p2", name: "Toor dal", qty: 300, unit: "g", cat: "grains", low: 100 },
  { id: "p3", name: "Moong dal", qty: 200, unit: "g", cat: "grains", low: 80 },
  { id: "p4", name: "Paneer", qty: 400, unit: "g", cat: "dairy", low: 100 },
  {
    id: "p5",
    name: "Whole wheat flour",
    qty: 1000,
    unit: "g",
    cat: "grains",
    low: 200,
  },
  { id: "p6", name: "Olive oil", qty: 300, unit: "ml", cat: "pantry", low: 50 },
  {
    id: "p7",
    name: "Peanut butter",
    qty: 250,
    unit: "g",
    cat: "pantry",
    low: 50,
  },
  { id: "p8", name: "Makhana", qty: 100, unit: "g", cat: "pantry", low: 50 },
  { id: "p9", name: "Onions", qty: 6, unit: "pcs", cat: "vegetables", low: 2 },
  {
    id: "p10",
    name: "Tomatoes",
    qty: 4,
    unit: "pcs",
    cat: "vegetables",
    low: 2,
  },
];

function calcCalories({
  weight = 70,
  height = 170,
  age = 25,
  gender = "male",
  goal = "maintain",
  activity = "moderate",
}) {
  let bmr =
    gender === "male"
      ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
      : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
  const mult = { sedentary: 1.2, moderate: 1.55, active: 1.725 };
  let tdee = bmr * (mult[activity] || 1.55);
  if (goal === "bulk") tdee += 300;
  if (goal === "cut") tdee -= 300;
  return Math.round(tdee);
}

function groceryFromPlan(plan) {
  const map = {};
  Object.values(plan).forEach((meal) => {
    if (!meal) return;
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

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function Ring({
  val,
  max,
  size = 110,
  stroke = 9,
  color = "#3A6B35",
  label,
  sub,
}) {
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
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1E2D1B" }}>
            {label}
          </div>
        )}
        {sub && <div style={{ fontSize: 10, color: "#7B8C79" }}>{sub}</div>}
      </div>
    </div>
  );
}

function MacroBar({ label, val, max, color }) {
  const pct = Math.min(val / (max || 1), 1) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontSize: 12,
        }}
      >
        <span style={{ color: "#7B8C79", fontWeight: 500 }}>{label}</span>
        <span style={{ color: "#1E2D1B", fontWeight: 600 }}>
          {val}g{" "}
          <span style={{ color: "#7B8C79", fontWeight: 400 }}>/ {max}g</span>
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

function MealTypeIcon({ type }) {
  const icons = { breakfast: "🌅", lunch: "☀️", snack: "🍎", dinner: "🌙" };
  return <span>{icons[type] || "🍽️"}</span>;
}

// ── AI MEAL GENERATION ────────────────────────────────────────────────────────
async function generateAIPlan(profile) {
  const prompt = `You are a nutrition expert specializing in Indian vegetarian cuisine for fitness goals.

User profile:
- Goal: ${profile.goal} (${
    profile.goal === "bulk"
      ? "+300 cal surplus"
      : profile.goal === "cut"
      ? "-300 cal deficit"
      : "maintenance"
  })
- Activity: ${profile.activity}
- Calorie target: ${profile.calorieTarget} kcal/day
- Dietary: ${profile.vegan ? "Vegan" : "Vegetarian"}
- Allergies: ${
    profile.allergies?.length ? profile.allergies.join(", ") : "None"
  }

Generate exactly ONE meal plan for today using authentic Indian vegetarian recipes. Respond ONLY with valid JSON, no markdown, no explanation.

Format:
{
  "breakfast": {"id":"ai-b","type":"breakfast","name":"Recipe Name","emoji":"🫓","calories":350,"protein":18,"carbs":45,"fat":9,"prepTime":15,"tags":["high-protein","vegan"],"ingredients":[{"n":"Item","q":"Amount","cat":"vegetables"}],"steps":["Step 1","Step 2"]},
  "lunch": {"id":"ai-l","type":"lunch","name":"Recipe Name","emoji":"🍛","calories":500,"protein":25,"carbs":65,"fat":12,"prepTime":30,"tags":["classic"],"ingredients":[{"n":"Item","q":"Amount","cat":"grains"}],"steps":["Step 1","Step 2"]},
  "snack": {"id":"ai-s","type":"snack","name":"Recipe Name","emoji":"🥜","calories":180,"protein":10,"carbs":20,"fat":6,"prepTime":5,"tags":["quick"],"ingredients":[{"n":"Item","q":"Amount","cat":"pantry"}],"steps":["Step 1"]},
  "dinner": {"id":"ai-d","type":"dinner","name":"Recipe Name","emoji":"🥘","calories":450,"protein":22,"carbs":55,"fat":13,"prepTime":35,"tags":["iron-rich"],"ingredients":[{"n":"Item","q":"Amount","cat":"vegetables"}],"steps":["Step 1","Step 2"]}
}

Total should be close to ${
    profile.calorieTarget
  } calories. Use ONLY Indian vegetarian ingredients. Include dal, paneer, sabzi, roti, rice, smoothies, chaat etc.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    goal: "maintain",
    activity: "moderate",
    vegan: false,
    allergies: [],
    weight: 70,
    height: 170,
    age: 25,
    gender: "male",
    calorieTarget: null,
  });

  const steps = [
    {
      title: "Your Fitness Goal",
      icon: "🎯",
      content: (
        <div>
          <div className="pill-select">
            {[
              ["bulk", "🏋️ Bulk", "Gain muscle & size"],
              ["maintain", "⚖️ Maintain", "Keep current weight"],
              ["cut", "🔥 Cut", "Lose fat, stay lean"],
            ].map(([v, l, d]) => (
              <div
                key={v}
                className={`pill`}
                style={{
                  flex: "1 0 100%",
                  padding: "14px 16px",
                  background: form.goal === v ? "var(--green)" : "var(--card)",
                  color: form.goal === v ? "#fff" : "var(--text)",
                  borderColor:
                    form.goal === v ? "var(--green)" : "var(--border)",
                }}
                onClick={() => setForm((f) => ({ ...f, goal: v }))}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{d}</div>
              </div>
            ))}
          </div>
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
              ],
              [
                "Activity",
                "activity",
                [
                  ["sedentary", "Sedentary"],
                  ["moderate", "Moderate"],
                  ["active", "Active"],
                ],
              ],
            ].map(([label, key, opts]) => (
              <div key={key}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {opts.map(([v, l]) => (
                    <div
                      key={v}
                      className="pill"
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        background:
                          form[key] === v ? "var(--green)" : "var(--card)",
                        color: form[key] === v ? "#fff" : "var(--text)",
                        borderColor:
                          form[key] === v ? "var(--green)" : "var(--border)",
                      }}
                      onClick={() => setForm((f) => ({ ...f, [key]: v }))}
                    >
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {[
            ["Weight (kg)", "weight", 40, 150],
            ["Height (cm)", "height", 140, 210],
            ["Age", "age", 16, 70],
          ].map(([label, key, min, max]) => (
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
                value={form[key]}
                style={{ width: "100%" }}
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
                cursor: "pointer",
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
              Allergies (select all that apply)
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
          <div
            className="card"
            style={{
              padding: "16px",
              background: "var(--green-l)",
              border: "1.5px solid #C8E4C7",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--green)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              📊 Your Daily Target
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--green)",
                  fontFamily: "'Playfair Display',serif",
                }}
              >
                {calcCalories(form)}
              </span>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>
                kcal/day (auto-calculated)
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              Based on your height, weight, age, and goal
            </div>
          </div>
        </div>
      ),
    },
  ];

  const next = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const target = calcCalories(form);
    onComplete({ ...form, calorieTarget: target });
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
      {/* Header */}
      <div style={{ padding: "48px 24px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🥗</div>
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

      {/* Dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 24,
        }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className={`onboard-dot ${i === step ? "active" : ""}`}
            style={{
              background:
                i < step
                  ? "var(--green)"
                  : i === step
                  ? "var(--green)"
                  : "var(--border)",
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div style={{ flex: 1, padding: "0 20px 24px" }} className="slide-in">
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ fontSize: 22, marginBottom: 8, textAlign: "center" }}>
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

      {/* Footer */}
      <div style={{ padding: "0 20px 40px", display: "flex", gap: 12 }}>
        {step > 0 && (
          <button
            className="btn btn-outline"
            onClick={() => setStep((s) => s - 1)}
            style={{ flex: "0 0 auto", padding: "14px 20px" }}
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

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
function HomeScreen({
  profile,
  plan,
  setPlan,
  consumed,
  setConsumed,
  favorites,
  toggleFav,
}) {
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const totals = {
    calories: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.calories : 0),
      0
    ),
    protein: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.protein : 0),
      0
    ),
    carbs: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.carbs : 0),
      0
    ),
    fat: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.fat : 0),
      0
    ),
  };

  const targets = {
    calories: profile.calorieTarget,
    protein: Math.round((profile.calorieTarget * 0.25) / 4),
    carbs: Math.round((profile.calorieTarget * 0.5) / 4),
    fat: Math.round((profile.calorieTarget * 0.25) / 9),
  };

  const motivations = [
    "You're fueling your goals today! 💪",
    "Great choices for a stronger you! 🌱",
    "Plant power in action! ⚡",
    "Eating clean, living strong! 🏆",
  ];
  const motivate =
    motivations[Math.floor(Date.now() / 86400000) % motivations.length];

  const regenerate = async () => {
    setLoading(true);
    try {
      const newPlan = await generateAIPlan(profile);
      setPlan(newPlan);
      setConsumed({
        breakfast: false,
        lunch: false,
        snack: false,
        dinner: false,
      });
    } catch (e) {
      // Fallback: shuffle from DB
      const types = ["breakfast", "lunch", "snack", "dinner"];
      const fallback = {};
      types.forEach((t) => {
        const pool = getRecipesByType(t);
        fallback[t] = pool[Math.floor(Math.random() * pool.length)];
      });
      setPlan(fallback);
      setConsumed({
        breakfast: false,
        lunch: false,
        snack: false,
        dinner: false,
      });
    }
    setLoading(false);
  };

  const swapMeal = (type) => {
    const pool = getRecipesByType(type).filter((r) => r.id !== plan[type]?.id);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setPlan((p) => ({ ...p, [type]: next }));
    setSwapping(null);
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const pct = Math.round((totals.calories / targets.calories) * 100);

  return (
    <div className="screen" style={{ padding: "0 0 90px" }}>
      {/* Header */}
      <div style={{ background: "var(--green)", padding: "48px 20px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
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
              {motivate}
            </div>
          </div>
          <button
            className="btn"
            onClick={regenerate}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,.2)",
              color: "#fff",
              padding: "10px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
            }}
          >
            <Sparkles
              size={16}
              style={{ animation: loading ? "spin 1s linear infinite" : "" }}
            />
            {loading ? "Generating..." : "AI Plan"}
          </button>
        </div>

        {/* Progress */}
        <div
          className="card"
          style={{
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Ring
            val={totals.calories}
            max={targets.calories}
            label={`${pct}%`}
            sub="of goal"
            size={90}
            stroke={8}
          />
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                <span style={{ color: "var(--muted)" }}>Calories</span>
                <span style={{ fontWeight: 600 }}>
                  {totals.calories} / {targets.calories}
                </span>
              </div>
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

      {/* Meals */}
      <div style={{ padding: "20px" }}>
        {loading
          ? ["breakfast", "lunch", "snack", "dinner"].map((t) => (
              <div
                key={t}
                className="card skeleton"
                style={{ height: 110, marginBottom: 12 }}
              />
            ))
          : ["breakfast", "lunch", "snack", "dinner"].map((type) => {
              const meal = plan[type];
              if (!meal) return null;
              const done = consumed[type];
              return (
                <div
                  key={type}
                  className="card slide-in"
                  onClick={() => setSelectedMeal({ ...meal, mealType: type })}
                  style={{
                    marginBottom: 12,
                    padding: "16px",
                    cursor: "pointer",
                    opacity: done ? 0.7 : 1,
                    transition: "all .2s",
                    borderLeft: `3px solid ${
                      done ? "var(--green)" : "transparent"
                    }`,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div style={{ fontSize: 36, flexShrink: 0 }}>
                      {meal.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            fontWeight: 600,
                          }}
                        >
                          <MealTypeIcon type={type} /> {type}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFav(meal.id);
                            }}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 8,
                              background: favorites.includes(meal.id)
                                ? "#FEE2E2"
                                : "var(--green-l)",
                              color: favorites.includes(meal.id)
                                ? "#E85454"
                                : "var(--green)",
                            }}
                          >
                            <Heart
                              size={13}
                              fill={
                                favorites.includes(meal.id) ? "#E85454" : "none"
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
                              padding: "4px 8px",
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                          >
                            <Repeat2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "var(--text)",
                          marginBottom: 4,
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
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        <span>🔥 {meal.calories} cal</span>
                        <span>💪 {meal.protein}g protein</span>
                        <span>⏱ {meal.prepTime}m</span>
                      </div>
                    </div>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConsumed((c) => ({ ...c, [type]: !c[type] }));
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: done ? "var(--green)" : "var(--card)",
                        border: `2px solid ${
                          done ? "var(--green)" : "var(--border)"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      {done && <Check size={16} color="#fff" />}
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Recipe Modal */}
      {selectedMeal && (
        <RecipeModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          isFav={favorites.includes(selectedMeal.id)}
          onFav={() => toggleFav(selectedMeal.id)}
          onChecked={() => {
            setConsumed((c) => ({
              ...c,
              [selectedMeal.mealType]: !c[selectedMeal.mealType],
            }));
            setSelectedMeal(null);
          }}
          done={consumed[selectedMeal?.mealType]}
        />
      )}
    </div>
  );
}

// ── RECIPE MODAL ──────────────────────────────────────────────────────────────
function RecipeModal({ meal, onClose, isFav, onFav, onChecked, done }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--card)",
            zIndex: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ padding: "6px 12px", borderRadius: 10 }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{meal.name}</div>
          <button
            className="btn"
            onClick={onFav}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: isFav ? "#FEE2E2" : "var(--green-l)",
              color: isFav ? "#E85454" : "var(--green)",
            }}
          >
            <Heart size={16} fill={isFav ? "#E85454" : "none"} />
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ textAlign: "center", fontSize: 64, marginBottom: 12 }}>
            {meal.emoji}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {(meal.tags || []).map((t) => (
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
              padding: "14px",
              marginBottom: 16,
            }}
          >
            {[
              ["🔥", "Calories", meal.calories + " kcal"],
              ["💪", "Protein", meal.protein + "g"],
              ["🍚", "Carbs", meal.carbs + "g"],
              ["🥑", "Fat", meal.fat + "g"],
              ["⏱", "Prep", meal.prepTime + "m"],
            ].map(([em, label, val]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{em}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {val}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 10,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Ingredients
          </h3>
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
          <h3
            style={{
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 10,
              marginTop: 20,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Instructions
          </h3>
          {meal.steps.map((step, i) => (
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
                {step}
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
            {done ? "✓ Marked as Eaten" : "✅ Mark as Eaten"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RECIPES SCREEN ────────────────────────────────────────────────────────────
function RecipesScreen({ favorites, toggleFav }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const types = ["all", "breakfast", "lunch", "snack", "dinner"];
  const filtered = RECIPES.filter((r) => {
    const matchType = filter === "all" || r.type === filter;
    const matchQuery =
      !query ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.tags || []).some((t) => t.includes(query.toLowerCase()));
    return matchType && matchQuery;
  });

  return (
    <div className="screen" style={{ padding: "0 0 90px" }}>
      <div style={{ background: "var(--green)", padding: "48px 20px 20px" }}>
        <h1
          className="serif"
          style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
        >
          Recipe Library
        </h1>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          Indian vegetarian collection
        </div>
      </div>
      <div style={{ padding: "16px 20px 0" }}>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <Search size={16} color="var(--muted)" />
          <input
            placeholder="Search recipes or tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <X
              size={14}
              style={{ cursor: "pointer" }}
              onClick={() => setQuery("")}
            />
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
          {types.map((t) => (
            <div
              key={t}
              className={`chip ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
              style={{ textTransform: "capitalize" }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 20px" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          {filtered.length} recipes
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="card"
              onClick={() => setSelected(recipe)}
              style={{
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div style={{ padding: "16px 12px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>
                  {recipe.emoji}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text)",
                    marginBottom: 4,
                    lineHeight: 1.3,
                  }}
                >
                  {recipe.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginBottom: 8,
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
                  padding: "8px 12px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  <span
                    className="tag"
                    style={{ fontSize: 10, padding: "2px 7px" }}
                  >
                    {recipe.tags[0]}
                  </span>
                </div>
                <button
                  className="btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(recipe.id);
                  }}
                  style={{
                    padding: "4px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "none",
                  }}
                >
                  <Heart
                    size={14}
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

// ── TRACKER SCREEN ────────────────────────────────────────────────────────────
function TrackerScreen({ profile, plan, consumed, setConsumed }) {
  const [view, setView] = useState("daily");

  const mealTotals = (type) =>
    plan[type] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const dailyTotal = {
    calories: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.calories : 0),
      0
    ),
    protein: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.protein : 0),
      0
    ),
    carbs: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.carbs : 0),
      0
    ),
    fat: Object.entries(plan).reduce(
      (s, [k, m]) => s + (consumed[k] ? m.fat : 0),
      0
    ),
  };

  const targets = {
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
    { day: "Today", cal: dailyTotal.calories },
  ];

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "48px 20px 20px" }}>
        <h1
          className="serif"
          style={{ fontSize: 22, color: "#fff", marginBottom: 16 }}
        >
          Calorie Tracker
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {["daily", "weekly"].map((v) => (
            <div
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "8px 20px",
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

      <div style={{ padding: "20px" }}>
        {view === "daily" ? (
          <>
            {/* Big ring */}
            <div
              className="card"
              style={{
                padding: "24px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 16,
              }}
            >
              <Ring
                val={dailyTotal.calories}
                max={targets.calories}
                label={dailyTotal.calories}
                sub="kcal eaten"
                size={110}
                stroke={10}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  {targets.calories - dailyTotal.calories > 0
                    ? `${targets.calories - dailyTotal.calories} kcal remaining`
                    : `${
                        dailyTotal.calories - targets.calories
                      } kcal over goal`}
                </div>
                <MacroBar
                  label="Protein"
                  val={dailyTotal.protein}
                  max={targets.protein}
                  color="#3A6B35"
                />
                <MacroBar
                  label="Carbs"
                  val={dailyTotal.carbs}
                  max={targets.carbs}
                  color="#E07A3F"
                />
                <MacroBar
                  label="Fat"
                  val={dailyTotal.fat}
                  max={targets.fat}
                  color="#7C5CBF"
                />
              </div>
            </div>

            {/* Meal checklist */}
            <div className="card" style={{ padding: "16px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 12,
                  color: "var(--text)",
                }}
              >
                Today's Meals
              </div>
              {["breakfast", "lunch", "snack", "dinner"].map((type) => {
                const meal = plan[type];
                const done = consumed[type];
                if (!meal) return null;
                return (
                  <div
                    key={type}
                    onClick={() =>
                      setConsumed((c) => ({ ...c, [type]: !c[type] }))
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
                        width: 24,
                        height: 24,
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
                      {done && <Check size={14} color="#fff" />}
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
                          fontSize: 12,
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
              })}
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ padding: "16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Weekly Calories
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginBottom: 16,
                }}
              >
                vs. {targets.calories} kcal target
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekData} barSize={28}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#7B8C79" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="cal" radius={[6, 6, 0, 0]}>
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
                gap: 12,
              }}
            >
              {[
                [
                  "Avg Calories",
                  `${Math.round(
                    weekData.reduce((s, d) => s + d.cal, 0) / 7
                  )} kcal`,
                  "🔥",
                ],
                ["Goal Days", "5/7 days", "🎯"],
                ["Streak", "4 days", "🔥"],
                ["On Track", "Yes! 💪", "✅"],
              ].map(([label, val, icon]) => (
                <div
                  key={label}
                  className="card"
                  style={{ padding: "14px", textAlign: "center" }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {val}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
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

// ── GROCERY SCREEN ────────────────────────────────────────────────────────────
function GroceryScreen({ plan }) {
  const [items, setItems] = useState(() => groceryFromPlan(plan));
  const cats = ["vegetables", "dairy", "grains", "spices", "pantry"];
  const catLabels = {
    vegetables: "🥦 Vegetables",
    dairy: "🥛 Dairy",
    grains: "🌾 Grains & Legumes",
    spices: "🌶️ Spices",
    pantry: "🫙 Pantry",
  };

  useEffect(() => {
    setItems(groceryFromPlan(plan));
  }, [plan]);

  const toggle = (id) =>
    setItems((its) =>
      its.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  const clearChecked = () => setItems((its) => its.filter((i) => !i.checked));

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "48px 20px 20px" }}>
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
          {checkedCount > 0 && (
            <button
              className="btn"
              onClick={clearChecked}
              style={{
                background: "rgba(255,255,255,.2)",
                color: "#fff",
                padding: "8px 14px",
                fontSize: 13,
                borderRadius: 10,
              }}
            >
              Clear done ({checkedCount})
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "20px" }}>
        {checkedCount === items.length && items.length > 0 && (
          <div
            className="card"
            style={{
              padding: "20px",
              textAlign: "center",
              marginBottom: 16,
              background: "var(--green-l)",
              border: "1.5px solid #C8E4C7",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 700, color: "var(--green)" }}>
              Shopping complete!
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              All items checked off
            </div>
          </div>
        )}
        {cats.map((cat) => {
          const catItems = items.filter((i) => i.cat === cat);
          if (!catItems.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {catLabels[cat] || cat}
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
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderBottom:
                        i < catItems.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      background: item.checked ? "#F8FFF8" : "transparent",
                      transition: "background .15s",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
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
                      {item.checked && <Check size={13} color="#fff" />}
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
            marginTop: 8,
          }}
        >
          {items.filter((i) => !i.checked).length} items remaining ·{" "}
          {checkedCount} checked
        </div>
      </div>
    </div>
  );
}

// ── PANTRY SCREEN ─────────────────────────────────────────────────────────────
function PantryScreen() {
  const [items, setItems] = useState(DEFAULT_PANTRY);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    qty: 100,
    unit: "g",
    cat: "vegetables",
  });

  const updateQty = (id, delta) =>
    setItems((its) =>
      its.map((i) =>
        i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i
      )
    );
  const remove = (id) => setItems((its) => its.filter((i) => i.id !== id));
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
  const cats = [...new Set(items.map((i) => i.cat))];
  const catLabels = {
    vegetables: "🥦 Vegetables",
    dairy: "🥛 Dairy",
    grains: "🌾 Grains & Legumes",
    spices: "🌶️ Spices",
    pantry: "🫙 Pantry",
  };

  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "48px 20px 20px" }}>
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
              {items.length} items · {lowItems.length} running low
            </div>
          </div>
          <button
            className="btn btn-orange"
            onClick={() => setAdding(true)}
            style={{
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
            }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {lowItems.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
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
                  padding: "12px 16px",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text)",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--red)" }}>
                    Only {item.qty}
                    {item.unit} left!
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
            <div key={cat} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {catLabels[cat] || cat}
              </div>
              <div className="card" style={{ overflow: "hidden" }}>
                {catItems.map((item, i) => {
                  const pct = Math.min(item.qty / (item.low * 5), 1) * 100;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "12px 16px",
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
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "var(--text)",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div className="qty-row">
                            <div
                              className="qty-btn"
                              onClick={() => updateQty(item.id, -10)}
                            >
                              −
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                minWidth: 60,
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
                          <button
                            className="btn"
                            onClick={() => remove(item.id)}
                            style={{
                              padding: "4px",
                              borderRadius: 6,
                              background: "transparent",
                              border: "none",
                              color: "var(--muted)",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="macro-bar">
                        <div
                          className="macro-fill"
                          style={{
                            width: `${pct}%`,
                            background: `hsl(${pct},60%,45%)`,
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

      {/* Add item modal */}
      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div
            className="modal-sheet"
            style={{ borderRadius: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Add Pantry Item
              </div>
              {[
                ["Name", "name", "text"],
                ["Quantity", "qty", "number"],
                ["Unit", "unit", "text"],
              ].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </div>
                  <input
                    value={newItem[key]}
                    onChange={(e) =>
                      setNewItem((n) => ({
                        ...n,
                        [key]:
                          type === "number" ? +e.target.value : e.target.value,
                      }))
                    }
                    type={type}
                    placeholder={label}
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
              ))}
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
                  {["vegetables", "dairy", "grains", "spices", "pantry"].map(
                    (c) => (
                      <div
                        key={c}
                        className={`chip ${newItem.cat === c ? "active" : ""}`}
                        onClick={() => setNewItem((n) => ({ ...n, cat: c }))}
                        style={{ textTransform: "capitalize" }}
                      >
                        {c}
                      </div>
                    )
                  )}
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

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function VegFit() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("home");
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [consumed, setConsumed] = useState({
    breakfast: false,
    lunch: false,
    snack: false,
    dinner: false,
  });
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem("vegfit-profile");
      if (p) setProfile(JSON.parse(p));
      const f = localStorage.getItem("vegfit-favorites");
      if (f) setFavorites(JSON.parse(f));
      const pl = localStorage.getItem("vegfit-plan");
      if (pl) setPlan(JSON.parse(pl));
    } catch (e) {}
    setLoaded(true);
  }, []);

  const saveProfile = (p) => {
    setProfile(p);
    try {
      localStorage.setItem("vegfit-profile", JSON.stringify(p));
    } catch (e) {}
  };

  const toggleFav = (id) => {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("vegfit-favorites", JSON.stringify(next));
    } catch (e) {}
  };

  const savePlan = (p) => {
    setPlan(p);
    try {
      localStorage.setItem("vegfit-plan", JSON.stringify(p));
    } catch (e) {}
  };

  if (!loaded)
    return (
      <div
        className="app"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥗</div>
          <div
            className="serif"
            style={{ fontSize: 20, color: "var(--green)" }}
          >
            VegFit
          </div>
        </div>
      </div>
    );

  if (!profile)
    return (
      <div className="app">
        <Onboarding onComplete={saveProfile} />
      </div>
    );

  const tabs = [
    { id: "home", icon: Home, label: "Plan" },
    { id: "recipes", icon: BookOpen, label: "Recipes" },
    { id: "tracker", icon: BarChart2, label: "Track" },
    { id: "grocery", icon: ShoppingCart, label: "Grocery" },
    { id: "pantry", icon: Package, label: "Pantry" },
  ];

  return (
    <div className="app">
      <div style={{ height: "100vh", overflow: "auto" }}>
        <div className="fade-in">
          {tab === "home" && (
            <HomeScreen
              profile={profile}
              plan={plan}
              setPlan={savePlan}
              consumed={consumed}
              setConsumed={setConsumed}
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
              setConsumed={setConsumed}
            />
          )}
          {tab === "grocery" && <GroceryScreen plan={plan} />}
          {tab === "pantry" && <PantryScreen />}
        </div>
      </div>

      <div className="tab-bar">
        {tabs.map(({ id, icon: Icon, label }) => (
          <div
            key={id}
            className={`tab-item ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
