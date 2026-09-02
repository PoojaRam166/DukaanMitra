// ---------------------------------------------------------------------
// DukaanMitra translations
// ---------------------------------------------------------------------
// The app supports exactly three language modes, matching what's offered
// in Settings > Preferences and on the public landing page:
//   - "en": English only
//   - "te": Telugu only
//   - "bi": English + Telugu together (the default)
//
// `dict` holds short, single-line strings for app chrome (sidebar, page
// headers, form labels, buttons). In bilingual mode these are shown as
// "English / తెలుగు" so they still fit on one line inside nav items,
// buttons, and table headers.
//
// Longer marketing copy (landing page hero/feature copy) uses its own
// `trLong` helper (see LanguageContext) which stacks English then Telugu
// on separate lines instead, since that reads better for paragraphs.

export type LangCode = "en" | "te" | "bi";

export const LANGUAGE_OPTIONS: { code: LangCode; label: string; dbValue: string }[] = [
  { code: "en", label: "English", dbValue: "English" },
  { code: "te", label: "తెలుగు", dbValue: "Telugu" },
  { code: "bi", label: "English + తెలుగు", dbValue: "English+Telugu" },
];

export function dbValueToCode(dbValue: string | undefined | null): LangCode {
  const match = LANGUAGE_OPTIONS.find((o) => o.dbValue === dbValue);
  return match ? match.code : "en";
}

export function codeToDbValue(code: LangCode): string {
  return LANGUAGE_OPTIONS.find((o) => o.code === code)?.dbValue || "English";
}

type Entry = { en: string; te: string };

export const dict: Record<string, Entry> = {
  // Sidebar / navigation
  dashboard: { en: "Dashboard", te: "డాష్‌బోర్డ్" },
  inventory: { en: "Inventory", te: "ఇన్వెంటరీ" },
  billing: { en: "Billing", te: "బిల్లింగ్" },
  customers: { en: "Customers", te: "కస్టమర్లు" },
  expenses: { en: "Expenses", te: "ఖర్చులు" },
  sales: { en: "Sales", te: "అమ్మకాలు" },
  reports: { en: "Reports", te: "నివేదికలు" },
  insights: { en: "Insights", te: "అంతర్దృష్టులు" },
  notifications: { en: "Notifications", te: "నోటిఫికేషన్లు" },
  settings: { en: "Settings", te: "సెట్టింగ్‌లు" },
  help: { en: "Help", te: "సహాయం" },
  logout: { en: "Logout", te: "లాగ్ అవుట్" },
  profile: { en: "Profile", te: "ప్రొఫైల్" },
  aboutDukaanMitra: { en: "About DukaanMitra", te: "దుకాణమిత్ర గురించి" },
  shopManagementTagline: { en: "Shop Management", te: "దుకాణ నిర్వహణ" },

  // Common actions
  save: { en: "Save", te: "సేవ్ చేయండి" },
  saveChanges: { en: "Save Changes", te: "మార్పులను సేవ్ చేయండి" },
  savePreferences: { en: "Save Preferences", te: "ప్రాధాన్యతలను సేవ్ చేయండి" },
  cancel: { en: "Cancel", te: "రద్దు చేయండి" },
  changesSaved: { en: "Changes saved successfully!", te: "మార్పులు విజయవంతంగా సేవ్ చేయబడ్డాయి!" },

  // Settings page
  settingsTitle: { en: "Settings", te: "సెట్టింగ్‌లు" },
  settingsSubtitle: { en: "Manage your account and shop preferences", te: "మీ ఖాతా మరియు దుకాణ ప్రాధాన్యతలను నిర్వహించండి" },
  tabProfile: { en: "Profile", te: "ప్రొఫైల్" },
  tabShopInfo: { en: "Shop Info", te: "దుకాణ సమాచారం" },
  tabSecurity: { en: "Security", te: "భద్రత" },
  tabPreferences: { en: "Preferences", te: "ప్రాధాన్యతలు" },
  tabNotifications: { en: "Notifications", te: "నోటిఫికేషన్లు" },

  profileInformation: { en: "Profile Information", te: "ప్రొఫైల్ సమాచారం" },
  changePhoto: { en: "Change Photo", te: "ఫోటో మార్చండి" },
  uploading: { en: "Uploading...", te: "అప్‌లోడ్ అవుతోంది..." },
  photoHint: { en: "JPG or PNG, max 2MB (optional)", te: "JPG లేదా PNG, గరిష్టంగా 2MB (ఐచ్ఛికం)" },
  fullName: { en: "Full Name", te: "పూర్తి పేరు" },
  emailAddress: { en: "Email Address", te: "ఇమెయిల్ చిరునామా" },

  shopInformation: { en: "Shop Information", te: "దుకాణ సమాచారం" },
  shopName: { en: "Shop Name", te: "దుకాణం పేరు" },
  phoneNumber: { en: "Phone Number", te: "ఫోన్ నంబర్" },
  gstNumberOptional: { en: "GST Number (optional)", te: "GST నంబర్ (ఐచ్ఛికం)" },
  shopAddress: { en: "Shop Address", te: "దుకాణం చిరునామా" },
  upiId: { en: "UPI / PhonePe ID", te: "UPI / ఫోన్‌పే ఐడి" },

  changePassword: { en: "Change Password", te: "పాస్‌వర్డ్ మార్చండి" },
  currentPassword: { en: "Current Password", te: "ప్రస్తుత పాస్‌వర్డ్" },
  newPassword: { en: "New Password", te: "కొత్త పాస్‌వర్డ్" },
  confirmNewPassword: { en: "Confirm New Password", te: "కొత్త పాస్‌వర్డ్‌ను నిర్ధారించండి" },
  updatePasswordBtn: { en: "Update Password", te: "పాస్‌వర్డ్ నవీకరించండి" },

  preferencesTitle: { en: "Preferences", te: "ప్రాధాన్యతలు" },
  language: { en: "Language", te: "భాష" },
  currency: { en: "Currency", te: "కరెన్సీ" },
  theme: { en: "Theme", te: "థీమ్" },
  themeLight: { en: "Light", te: "లైట్" },
  themeDark: { en: "Dark", te: "డార్క్" },
  themeSystem: { en: "System Default", te: "సిస్టమ్ డిఫాల్ట్" },
  dateFormat: { en: "Date Format", te: "తేదీ ఫార్మాట్" },

  notificationPreferences: { en: "Notification Preferences", te: "నోటిఫికేషన్ ప్రాధాన్యతలు" },

  // Page headers
  inventorySubtitle: { en: "Manage your products and stock levels", te: "మీ ఉత్పత్తులు మరియు స్టాక్ స్థాయిలను నిర్వహించండి" },
  billingSubtitle: { en: "Create and manage customer bills", te: "కస్టమర్ బిల్లులను సృష్టించండి మరియు నిర్వహించండి" },
  customersSubtitle: { en: "View and manage your customer relationships", te: "మీ కస్టమర్ సంబంధాలను చూడండి మరియు నిర్వహించండి" },
  expensesSubtitle: { en: "Track and manage your shop expenses", te: "మీ దుకాణ ఖర్చులను ట్రాక్ చేసి నిర్వహించండి" },
  salesSubtitle: { en: "Track and analyze your sales performance", te: "మీ అమ్మకాల పనితీరును ట్రాక్ చేసి విశ్లేషించండి" },
  reportsSubtitle: { en: "Generate and download shop reports", te: "దుకాణ నివేదికలను రూపొందించి డౌన్‌లోడ్ చేయండి" },
  insightsSubtitle: { en: "Smart suggestions based on your shop data", te: "మీ దుకాణ డేటా ఆధారంగా స్మార్ట్ సూచనలు" },
  notificationsSubtitle: { en: "Stay updated on important shop events", te: "ముఖ్యమైన దుకాణ సంఘటనలపై అప్‌డేట్‌గా ఉండండి" },
  helpSubtitle: { en: "Guides, FAQs, and support for your shop", te: "మీ దుకాణం కోసం గైడ్‌లు, FAQలు మరియు మద్దతు" },
  helpTitle: { en: "Help & Support", te: "సహాయం & మద్దతు" },

  // Login page
  backToHome: { en: "Back to home", te: "హోమ్‌కు తిరిగి వెళ్ళండి" },
  welcomeBack: { en: "Welcome back", te: "తిరిగి స్వాగతం" },
  signInSubtitle: { en: "Sign in to manage your shop", te: "మీ దుకాణాన్ని నిర్వహించడానికి సైన్ ఇన్ చేయండి" },
  password: { en: "Password", te: "పాస్‌వర్డ్" },
  enterYourPassword: { en: "Enter your password", te: "మీ పాస్‌వర్డ్ నమోదు చేయండి" },
  forgotPassword: { en: "Forgot password?", te: "పాస్‌వర్డ్ మర్చిపోయారా?" },
  rememberMe: { en: "Remember me", te: "నన్ను గుర్తుంచుకో" },
  signInToMyShop: { en: "Sign in to my shop", te: "నా దుకాణంలోకి సైన్ ఇన్ అవ్వండి" },
  signingIn: { en: "Signing in...", te: "సైన్ ఇన్ అవుతోంది..." },
  dontHaveAccount: { en: "Don't have an account?", te: "ఖాతా లేదా?" },
  createAccount: { en: "Create account", te: "ఖాతా సృష్టించండి" },

  // Register page
  createYourAccount: { en: "Create your account", te: "మీ ఖాతాను సృష్టించండి" },
  registerSubtitle: { en: "Set up DukaanMitra for your shop — takes less than 2 minutes", te: "మీ దుకాణం కోసం డుకాన్‌మిత్రను సెటప్ చేయండి — 2 నిమిషాల కంటే తక్కువ సమయం పడుతుంది" },
  personalInformation: { en: "Personal Information", te: "వ్యక్తిగత సమాచారం" },
  email: { en: "Email", te: "ఇమెయిల్" },
  confirmPassword: { en: "Confirm Password", te: "పాస్‌వర్డ్‌ను నిర్ధారించండి" },
  createPassword: { en: "Create password", te: "పాస్‌వర్డ్ సృష్టించండి" },
  repeatPassword: { en: "Repeat password", te: "పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి" },
  passwordsDontMatch: { en: "Passwords do not match", te: "పాస్‌వర్డ్‌లు సరిపోలడం లేదు" },
  createMyShopAccount: { en: "Create my shop account", te: "నా దుకాణ ఖాతాను సృష్టించండి" },
  creatingAccount: { en: "Creating account...", te: "ఖాతా సృష్టించబడుతోంది..." },
  alreadyHaveAccount: { en: "Already have an account?", te: "ఇప్పటికే ఖాతా ఉందా?" },
  signIn: { en: "Sign in", te: "సైన్ ఇన్ చేయండి" },
  pwWeak: { en: "Weak", te: "బలహీనం" },
  pwFair: { en: "Fair", te: "సాధారణం" },
  pwGood: { en: "Good", te: "మంచిది" },
  pwStrong: { en: "Strong", te: "బలమైనది" },
  pw8Chars: { en: "8+ characters", te: "8+ అక్షరాలు" },
  pwUppercase: { en: "Uppercase letter", te: "పెద్ద అక్షరం" },
  pwNumber: { en: "Number", te: "సంఖ్య" },
  pwSpecialChar: { en: "Special character", te: "ప్రత్యేక అక్షరం" },

  // Dashboard
  goodMorning: { en: "Good morning", te: "శుభోదయం" },
  goodAfternoon: { en: "Good afternoon", te: "శుభ మధ్యాహ్నం" },
  goodEvening: { en: "Good evening", te: "శుభ సాయంత్రం" },
  dashboardSubtitle: { en: "Here's what's happening with your shop today.", te: "ఈరోజు మీ దుకాణంలో ఏమి జరుగుతుందో ఇక్కడ ఉంది." },
  todaysSales: { en: "Today's Sales", te: "ఈరోజు అమ్మకాలు" },
  yesterdaysSales: { en: "Yesterday's Sales", te: "నిన్నటి అమ్మకాలు" },
  totalProducts: { en: "Total Products", te: "మొత్తం ఉత్పత్తులు" },
  lowStockItems: { en: "Low Stock Items", te: "తక్కువ స్టాక్ వస్తువులు" },
  billsToday: { en: "Bills Today", te: "ఈరోజు బిల్లులు" },
  estProfit: { en: "Est. Profit", te: "అంచనా లాభం" },
  outOfStock: { en: "out of stock", te: "స్టాక్ లేదు" },
  needsAttention: { en: "Needs attention", te: "శ్రద్ధ అవసరం" },
  allTime: { en: "All time", te: "అన్ని సమయాల్లో" },
  salesOverview: { en: "Sales Overview", te: "అమ్మకాల అవలోకనం" },
  dailyRevenueThisWeek: { en: "Daily revenue this week", te: "ఈ వారం రోజువారీ ఆదాయం" },
  filterToday: { en: "Today", te: "ఈరోజు" },
  filter7Days: { en: "7 Days", te: "7 రోజులు" },
  filter30Days: { en: "30 Days", te: "30 రోజులు" },
  filterCustom: { en: "Custom", te: "అనుకూలం" },
  quickActions: { en: "Quick Actions", te: "త్వరిత చర్యలు" },
  createBill: { en: "Create Bill", te: "బిల్లు సృష్టించండి" },
  addProduct: { en: "Add Product", te: "ఉత్పత్తి జోడించండి" },
  addCustomer: { en: "Add Customer", te: "కస్టమర్‌ను జోడించండి" },
  addExpense: { en: "Add Expense", te: "ఖర్చు జోడించండి" },
  lowStockAlert: { en: "Low Stock Alert", te: "తక్కువ స్టాక్ హెచ్చరిక" },
  itemsLeft: { en: "left", te: "మిగిలి ఉన్నాయి" },
  allWellStocked: { en: "All products are well stocked.", te: "అన్ని ఉత్పత్తులు తగినంత స్టాక్‌లో ఉన్నాయి." },
  stockAttentionTitle: { en: "Stock needs your attention", te: "స్టాక్‌కు మీ దృష్టి అవసరం" },
  reviewInventory: { en: "Review Inventory", te: "ఇన్వెంటరీని సమీక్షించండి" },
  outOfStockShort: { en: "out of stock", te: "అయిపోయాయి" },
  lowOnStockShort: { en: "running low", te: "తక్కువగా ఉన్నాయి" },
  topSellingProducts: { en: "Top Selling Products", te: "అత్యధికంగా అమ్ముడైన ఉత్పత్తులు" },
  viewAll: { en: "View all", te: "అన్నీ చూడండి" },
  tblProduct: { en: "Product", te: "ఉత్పత్తి" },
  tblUnits: { en: "Units", te: "యూనిట్లు" },
  tblRevenue: { en: "Revenue", te: "ఆదాయం" },
  noSalesDataYet: { en: "No sales data yet.", te: "ఇంకా అమ్మకాల డేటా లేదు." },
  recentBills: { en: "Recent Bills", te: "ఇటీవలి బిల్లులు" },
  newBill: { en: "New bill", te: "కొత్త బిల్లు" },
  tblBillNo: { en: "Bill #", te: "బిల్లు #" },
  tblCustomer: { en: "Customer", te: "కస్టమర్" },
  tblAmount: { en: "Amount", te: "మొత్తం" },
  tblStatus: { en: "Status", te: "స్థితి" },
  walkIn: { en: "Walk-in", te: "వాక్-ఇన్" },
  paid: { en: "Paid", te: "చెల్లించారు" },
  noBillsYet: { en: "No bills created yet.", te: "ఇంకా బిల్లులు సృష్టించలేదు." },
};

/** Compact single-line translator for app chrome (nav, buttons, labels). */
export function translate(key: keyof typeof dict | string, lang: LangCode): string {
  const entry = dict[key as string];
  if (!entry) return key as string;
  if (lang === "en") return entry.en;
  if (lang === "te") return entry.te;
  return `${entry.en} / ${entry.te}`;
}
