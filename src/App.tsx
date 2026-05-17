import { useState, useEffect, useRef } from "react";
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
    id: "r1",
    type: "lunch" as const,
    name: "Chickpea Salad",
    calories: 365,
    protein: 29,
    carbs: 37,
    fat: 11,
    prepTime: 10,
    tags: ["high-protein, light, gut-friendly"],
    emoji: "🥗",
    ingredients: [],
    steps: [],
  },
  {
    id: "r2",
    type: "lunch" as const,
    name: "High Protein Pasta Salad",
    calories: 375,
    protein: 29,
    carbs: 42,
    fat: 11,
    prepTime: 20,
    tags: ["high-protein, fresh, balanced"],
    emoji: "🍝",
    ingredients: [],
    steps: [],
  },
  {
    id: "r20",
    type: "lunch" as const,
    name: "Quinoa Paneer Bowl",
    calories: 370,
    protein: 28,
    carbs: 33,
    fat: 10,
    prepTime: 20,
    tags: [],
    emoji: "🥙",
    ingredients: [],
    steps: [],
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
    id: "r30",
    type: "dinner" as const,
    name: "Black Chana Soup with Paneer Cubes",
    calories: 305,
    protein: 23,
    carbs: 27,
    fat: 7,
    prepTime: 30,
    tags: ["high-protein, warming, gut-friendly"],
    emoji: "🍵",
    ingredients: [],
    steps: [],
  },
  {
    id: "r3",
    type: "dinner" as const,
    name: "Grilled Tofu + Vegetable Soup",
    calories: 325,
    protein: 30,
    carbs: 27,
    fat: 11,
    prepTime: 25,
    tags: ["high-protein, light, gut-friendly"],
    emoji: "🍲",
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
  }
];
// ── AUTO-GENERATED-RECIPES-END ───────────────────────────────────────────────

const getByType = (t: MealType): Recipe[] =>
  RECIPES.filter((r) => r.type === t);

const DEFAULT_PLAN: Plan = {
  breakfast:
    RECIPES.find((r) => r.id === "r16") ??
    RECIPES.find((r) => r.type === "breakfast") ??
    RECIPES[0]!,
  lunch:
    RECIPES.find((r) => r.id === "r1") ??
    RECIPES.find((r) => r.type === "lunch") ??
    RECIPES[0]!,
  snack:
    RECIPES.find((r) => r.id === "r9") ??
    RECIPES.find((r) => r.type === "snack") ??
    RECIPES[0]!,
  dinner:
    RECIPES.find((r) => r.id === "r34") ??
    RECIPES.find((r) => r.type === "dinner") ??
    RECIPES[0]!,
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

const SHOW_TRACKER_PANTRY = false;

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
                const meal = plan[type] ?? DEFAULT_PLAN[type] ?? RECIPES[0]!;
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
  r1: "https://hvintnhqfkehcainqehm.supabase.co/storage/v1/object/public/recipe%20images/Chickpea%20Salad%20(1).png", // Chickpea Salad
  r2: "https://hvintnhqfkehcainqehm.supabase.co/storage/v1/object/public/recipe%20images/High%20protein%20pasta%20bowl%20salad.png", // High Protein Pasta Salad
  r20: "https://hvintnhqfkehcainqehm.supabase.co/storage/v1/object/public/recipe%20images/Qunio%20Paneer%20Bowl%20(1).png", // Quinoa Paneer Bowl
  r23: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80", // Soya Chunks Curry
  r30: "https://hvintnhqfkehcainqehm.supabase.co/storage/v1/object/public/recipe%20images/Black%20Chana%20Soup.png", // Black Chana Soup with Paneer Cubes
  r3: "https://hvintnhqfkehcainqehm.supabase.co/storage/v1/object/public/recipe%20images/Grilled%20Tofu%20with%20Veg%20soup.png", // Grilled Tofu + Vegetable Soup
  r34: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80", // Soya Chunks Pulao
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
  authBarHeight: number;
  tabBarHeight: number;
}

function RecipesScreen({ favorites, toggleFav, authBarHeight, tabBarHeight }: RecipesScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MealType>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [favoritesView, setFavoritesView] = useState(false);

  const MEAL_FILTERS: { id: "all" | MealType; label: string; emoji: string }[] = [
    { id: "all", label: "All", emoji: "🍽️" },
    { id: "breakfast", label: "Breakfast", emoji: "🌅" },
    { id: "lunch", label: "Lunch", emoji: "☀️" },
    { id: "snack", label: "Snack", emoji: "🍎" },
    { id: "dinner", label: "Dinner", emoji: "🌙" },
  ];

  const filtered = RECIPES.filter((r) => {
    const inFavorites = !favoritesView || favorites.includes(r.id);
    const mt = filter === "all" || r.type === filter;
    const mq = !query ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.tags.some((t) => t.includes(query.toLowerCase()));
    return inFavorites && mt && mq;
  }).sort((a, b) => {
    if (sort === "time") return a.prepTime - b.prepTime;
    if (sort === "calorie") return a.calories - b.calories;
    return 0; // recommended = natural order
  });

  return (
    <div
      className="screen"
      style={{
        background: "#F7F5F2",
        height: "100vh",
        minHeight: 0,
        paddingTop: authBarHeight,
        paddingBottom: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          background: "#F7F5F2",
          padding: "8px 16px 0",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 }}>
            {favoritesView ? "Favorites" : "Recipes"}
          </h1>
          <button
            type="button"
            className="btn"
            aria-pressed={favoritesView}
            aria-label={favoritesView ? "Show all recipes" : "Show favorites"}
            onClick={() => setFavoritesView((v) => !v)}
            style={{
              width: 38, height: 38, borderRadius: 19, background: "var(--card)",
              border: favoritesView ? "1.5px solid #E85454" : "1.5px solid var(--border)",
              padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Heart
              size={16}
              fill={favoritesView ? "#E85454" : "none"}
              color={favoritesView ? "#E85454" : "var(--muted)"}
            />
          </button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)", borderRadius: 14,
          padding: "10px 14px", marginBottom: 10,
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
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
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
        <div style={{ display: "flex", gap: 20, paddingBottom: 0, borderBottom: "1.5px solid var(--border)" }}>
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingTop: 14,
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: tabBarHeight,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>
              {favoritesView && favorites.length === 0 ? "❤️" : "🔍"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {favoritesView && favorites.length === 0
                ? "No favorites yet"
                : "No recipes found"}
            </div>
            {favoritesView && favorites.length === 0 && (
              <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                Tap the heart on a recipe to save it here
              </div>
            )}
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

// ── COMING SOON ───────────────────────────────────────────────────────────────
function ComingSoonScreen({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="screen">
      <div style={{ background: "var(--green)", padding: "52px 20px 20px" }}>
        <h1
          className="serif"
          style={{ fontSize: 22, color: "#fff", marginBottom: 4 }}
        >
          {title}
        </h1>
      </div>
      <div
        style={{
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        <div
          className="card"
          style={{
            padding: "32px 24px",
            textAlign: "center",
            maxWidth: 320,
            width: "100%",
          }}
        >
          <div style={{ marginBottom: 16 }}>{icon}</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            Coming soon
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
            We're building this feature. It will be available soon.
          </div>
        </div>
      </div>
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
  const authBarRef = useRef<HTMLDivElement>(null);

  const normalizePlan = (p: Partial<Plan>): Plan => {
    return (['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).reduce(
      (acc, type) => {
        acc[type] = p[type] ?? DEFAULT_PLAN[type] ?? RECIPES[0]!;
        return acc;
      },
      {} as Plan
    );
  };
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [authBarHeight, setAuthBarHeight] = useState(50);
  const [tabBarHeight, setTabBarHeight] = useState(72);

  useEffect(() => {
    const measure = () => {
      if (authBarRef.current) setAuthBarHeight(authBarRef.current.offsetHeight);
      if (tabBarRef.current) setTabBarHeight(tabBarRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (authBarRef.current) ro.observe(authBarRef.current);
    if (tabBarRef.current) ro.observe(tabBarRef.current);
    return () => ro.disconnect();
  }, [user]);

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
        setPlan(normalizePlan(pl));
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
      id: "grocery",
      label: "Grocery",
      icon: <ShoppingCart size={22} color="var(--muted)" />,
      activeIcon: <ShoppingCart size={22} color="var(--green)" />,
    },
    {
      id: "tracker",
      label: "Track",
      icon: <BarChart2 size={22} color="var(--muted)" />,
      activeIcon: <BarChart2 size={22} color="var(--green)" />,
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
        ref={authBarRef}
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
            <img alt=""
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
        style={{
          height: "100vh",
          overflowY: tab === "recipes" ? "hidden" : "auto",
        }}
        className="fade-in"
      >
        {tab !== "recipes" && (
          <div style={{ height: authBarHeight, flexShrink: 0 }} aria-hidden />
        )}
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
          <RecipesScreen
            favorites={favorites}
            toggleFav={toggleFav}
            authBarHeight={authBarHeight}
            tabBarHeight={tabBarHeight}
          />
        )}
        {tab === "tracker" &&
          (SHOW_TRACKER_PANTRY ? (
            <TrackerScreen
              profile={profile}
              plan={plan}
              consumed={consumed}
              setConsumed={saveConsumed}
            />
          ) : (
            <ComingSoonScreen
              title="Track"
              icon={<BarChart2 size={48} color="var(--green)" />}
            />
          ))}
        {tab === "grocery" && <GroceryScreen plan={plan} />}
        {tab === "pantry" &&
          (SHOW_TRACKER_PANTRY ? (
            <PantryScreen />
          ) : (
            <ComingSoonScreen
              title="Pantry"
              icon={<Package size={48} color="var(--green)" />}
            />
          ))}
      </div>
      <div className="tab-bar" ref={tabBarRef}>
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