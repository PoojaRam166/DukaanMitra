import type { Page } from "../App";
import {
  Package, Receipt, Users, BarChart2, FileText, Lightbulb,
  TrendingDown, CheckCircle, ArrowRight, Store, Star, Shield, Zap,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { LANGUAGE_OPTIONS } from "../i18n/translations";

// ---------------------------------------------------------------------
// Language support (English / Telugu / Telugu+English)
// ---------------------------------------------------------------------
// The landing page uses the same app-wide language choice as the rest of
// DukaanMitra (SettingsContext), so picking a language here carries over
// after login/registration instead of resetting.
// `tr(en, te)` returns the right string for the current language mode:
//  - "en": English only
//  - "te": Telugu only
//  - "bi": both scripts, English then Telugu on its own line (the default,
//    per the requirement that the site opens in Telugu+English)
// Elements that render a `tr()` result use `whitespace-pre-line` so the
// newline used in bilingual mode actually breaks the line.
type Lang = "en" | "te" | "bi";

function makeTr(lang: Lang) {
  return (en: string, te: string) => {
    if (lang === "en") return en;
    if (lang === "te") return te;
    return `${en}\n${te}`;
  };
}

export default function Landing({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { lang, setLanguage } = useSettings();
  const changeLang = (next: Lang) => setLanguage(next);
  const tr = makeTr(lang);

  const features = [
    { icon: Package, title: tr("Smart Inventory", "స్మార్ట్ ఇన్వెంటరీ"), desc: tr("Track products, stock levels, and get low-stock alerts before you run out.", "ఉత్పత్తులు, స్టాక్ స్థాయిలను ట్రాక్ చేయండి మరియు అయిపోకముందే తక్కువ-స్టాక్ హెచ్చరికలు పొందండి.") },
    { icon: Receipt, title: tr("Quick Billing", "త్వరిత బిల్లింగ్"), desc: tr("Create bills in seconds. Print or share receipts digitally with customers.", "సెకన్లలో బిల్లులు సృష్టించండి. కస్టమర్లతో రసీదులను ప్రింట్ చేయండి లేదా డిజిటల్‌గా షేర్ చేయండి.") },
    { icon: Users, title: tr("Customer Management", "కస్టమర్ నిర్వహణ"), desc: tr("Know your customers, their purchase history, and build lasting relationships.", "మీ కస్టమర్లను, వారి కొనుగోలు చరిత్రను తెలుసుకోండి మరియు శాశ్వత సంబంధాలను నిర్మించండి.") },
    { icon: TrendingDown, title: tr("Expense Tracking", "ఖర్చుల ట్రాకింగ్"), desc: tr("Log shop expenses easily and understand where your money goes.", "దుకాణ ఖర్చులను సులభంగా నమోదు చేయండి మరియు మీ డబ్బు ఎక్కడికి వెళుతుందో అర్థం చేసుకోండి.") },
    { icon: BarChart2, title: tr("Sales Analytics", "అమ్మకాల విశ్లేషణ"), desc: tr("See daily, weekly, and monthly sales trends at a glance.", "రోజువారీ, వారపు మరియు నెలవారీ అమ్మకాల ధోరణులను ఒక్క చూపులో చూడండి.") },
    { icon: Lightbulb, title: tr("Smart Insights", "స్మార్ట్ ఇన్‌సైట్స్"), desc: tr("Get restock suggestions and sales forecasts based on your shop data.", "మీ దుకాణ డేటా ఆధారంగా రీస్టాక్ సూచనలు మరియు అమ్మకాల అంచనాలు పొందండి.") },
  ];

  const steps = [
    { num: "01", title: tr("Create your account", "మీ ఖాతాను సృష్టించండి"), desc: tr("Sign up with your shop details in under 2 minutes.", "2 నిమిషాల్లోపు మీ దుకాణ వివరాలతో సైన్ అప్ చేయండి.") },
    { num: "02", title: tr("Add your products", "మీ ఉత్పత్తులను జోడించండి"), desc: tr("Enter your products with prices and stock quantities.", "ధరలు మరియు స్టాక్ పరిమాణాలతో మీ ఉత్పత్తులను నమోదు చేయండి.") },
    { num: "03", title: tr("Start billing", "బిల్లింగ్ ప్రారంభించండి"), desc: tr("Create bills instantly at the counter and track every sale.", "కౌంటర్ వద్ద తక్షణమే బిల్లులు సృష్టించండి మరియు ప్రతి అమ్మకాన్ని ట్రాక్ చేయండి.") },
  ];

  const benefits = [
    tr("No accounting knowledge required", "అకౌంటింగ్ పరిజ్ఞానం అవసరం లేదు"),
    tr("Works on mobile, tablet & desktop", "మొబైల్, టాబ్లెట్ & డెస్క్‌టాప్‌లో పనిచేస్తుంది"),
    tr("Understand your shop in one look", "మీ దుకాణాన్ని ఒక్క చూపులో అర్థం చేసుకోండి"),
    tr("Never run out of stock again", "మళ్లీ ఎప్పుడూ స్టాక్ అయిపోదు"),
    tr("Know exactly where your money goes", "మీ డబ్బు ఎక్కడికి వెళుతుందో ఖచ్చితంగా తెలుసుకోండి"),
    tr("Make better decisions with real data", "నిజమైన డేటాతో మెరుగైన నిర్ణయాలు తీసుకోండి"),
  ];

  const langOptions: { id: Lang; label: string }[] = LANGUAGE_OPTIONS.map(o => ({ id: o.code, label: o.label }));

  return (
    <div className="min-h-screen bg-white text-[#1E2A3B]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E4E7EC]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
              <Store size={16} color="#fff" />
            </div>
            <span className="font-display font-extrabold text-[17px]">DukaanMitra</span>
          </div>
          <div className="hidden md:flex items-center gap-6 ml-8 text-sm text-gray-500">
            <a onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#3B5BDB] cursor-pointer transition-colors">{tr("Features", "ఫీచర్లు")}</a>
            <a onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#3B5BDB] cursor-pointer transition-colors">{tr("How it Works", "ఎలా పనిచేస్తుంది")}</a>
            <a onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#3B5BDB] cursor-pointer transition-colors">{tr("Benefits", "ప్రయోజనాలు")}</a>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Language switcher: English / Telugu / Telugu+English (default) */}
            <div className="hidden sm:flex items-center bg-[#F3F4F6] rounded-lg p-0.5" role="group" aria-label="Language">
              {langOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => changeLang(opt.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${lang === opt.id ? "bg-white text-[#3B5BDB] shadow-sm" : "text-gray-500 hover:text-[#3B5BDB]"}`}
                  aria-pressed={lang === opt.id}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="btn-secondary text-sm py-2 px-4" onClick={() => onNavigate("login")}>{tr("Login", "లాగిన్")}</button>
            <button className="btn-primary text-sm py-2 px-4" onClick={() => onNavigate("register")}>{tr("Get Started", "ప్రారంభించండి")}</button>
          </div>
        </div>
        {/* Language switcher on small screens, shown below the main row */}
        <div className="sm:hidden flex items-center justify-center gap-1 pb-2">
          {langOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => changeLang(opt.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${lang === opt.id ? "bg-[#EEF2FF] text-[#3B5BDB]" : "text-gray-500"}`}
              aria-pressed={lang === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#3B5BDB] text-sm font-semibold px-3 py-1.5 rounded-full mb-6 whitespace-pre-line">
              <Zap size={13} />
              {tr("Made for Indian shop owners", "భారతీయ దుకాణదారుల కోసం రూపొందించబడింది")}
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[1.15] tracking-tight mb-5 whitespace-pre-line">
              {tr("Manage your shop.", "మీ దుకాణాన్ని నిర్వహించండి.")}<br />
              <span className="text-[#3B5BDB]">{tr("Track your stock.", "మీ స్టాక్‌ని ట్రాక్ చేయండి.")}</span><br />
              {tr("Grow your business.", "మీ వ్యాపారాన్ని వృద్ధి చేయండి.")}
            </h1>
            <p className="text-gray-600 text-lg font-medium leading-relaxed mb-8 whitespace-pre-line">
              {tr(
                "DukaanMitra helps small shop owners manage products, inventory, billing, customers, expenses, and sales — all in one simple place.",
                "డుకాన్‌మిత్ర చిన్న దుకాణదారులు ఉత్పత్తులు, ఇన్వెంటరీ, బిల్లింగ్, కస్టమర్లు, ఖర్చులు మరియు అమ్మకాలను ఒకే సులభమైన స్థలంలో నిర్వహించడంలో సహాయపడుతుంది."
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary text-base py-3 px-7 whitespace-pre-line text-center" onClick={() => onNavigate("register")}>
                {tr("Get Started Free", "ఉచితంగా ప్రారంభించండి")} <ArrowRight size={16} />
              </button>
              <button className="btn-secondary text-base py-3 px-7 whitespace-pre-line text-center" onClick={() => onNavigate("login")}>
                {tr("Login to your shop", "మీ దుకాణంలోకి లాగిన్ అవ్వండి")}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4 whitespace-pre-line">{tr("No credit card required. Free to use.", "క్రెడిట్ కార్డ్ అవసరం లేదు. ఉచితంగా వాడుకోవచ్చు.")}</p>
          </div>

          {/* Dashboard preview illustration */}
          <div className="relative">
            <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#E4E7EC] shadow-lg">
              <div className="bg-white rounded-xl p-4 border border-[#E4E7EC] mb-3">
                <div className="text-xs text-gray-400 font-medium mb-1">{tr("Today's Sales", "ఈరోజు అమ్మకాలు")}</div>
                <div className="font-display font-extrabold text-2xl text-[#1E2A3B]">₹24,850</div>
                <div className="text-xs text-green-600 font-semibold mt-1">{tr("↑ 18.4% from yesterday", "↑ నిన్నటి కంటే 18.4%")}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: tr("Products", "ఉత్పత్తులు"), val: "284", color: "#EEF2FF", text: "#3B5BDB" },
                  { label: tr("Low Stock", "తక్కువ స్టాక్"), val: "7", color: "#FEF3C7", text: "#D97706" },
                  { label: tr("Bills Today", "ఈరోజు బిల్లులు"), val: "38", color: "#DCFCE7", text: "#16A34A" },
                ].map(({ label, val, color, text }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: color }}>
                    <div className="font-display font-extrabold text-lg" style={{ color: text }}>{val}</div>
                    <div className="text-[10px] font-medium text-gray-500 whitespace-pre-line">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#F7F8FA] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">{tr("Sales Trend", "అమ్మకాల ధోరణి")}</span>
                  <span className="text-[10px] text-gray-400">{tr("Last 7 days", "గత 7 రోజులు")}</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? "#3B5BDB" : "#BFCBF9" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white border border-[#E4E7EC] rounded-xl px-4 py-3 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#DCFCE7] rounded-lg flex items-center justify-center">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800">{tr("Bill Created!", "బిల్లు సృష్టించబడింది!")}</div>
                  <div className="text-[10px] text-gray-400">₹1,250 · UPI · Now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#F7F8FA] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-extrabold text-3xl mb-3 whitespace-pre-line">{tr("Everything your shop needs", "మీ దుకాణానికి కావలసినవన్నీ")}</h2>
            <p className="text-gray-600 font-medium max-w-lg mx-auto whitespace-pre-line">{tr("One platform to manage all aspects of your business — simple enough for anyone to use from day one.", "మీ వ్యాపారంలోని అన్ని అంశాలను నిర్వహించడానికి ఒకే ప్లాట్‌ఫారమ్ — మొదటి రోజు నుండే ఎవరైనా ఉపయోగించేంత సులభం.")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-[#E4E7EC] hover:border-[#3B5BDB]/30 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-[#3B5BDB]" />
                </div>
                <h3 className="font-display font-bold text-base mb-2 whitespace-pre-line">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-extrabold text-3xl mb-3 whitespace-pre-line">{tr("Up and running in minutes", "నిమిషాల్లో సిద్ధం")}</h2>
            <p className="text-gray-600 font-medium whitespace-pre-line">{tr("No training needed. No complex setup.", "శిక్షణ అవసరం లేదు. సంక్లిష్టమైన సెటప్ లేదు.")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-12 h-12 bg-[#3B5BDB] text-white rounded-full flex items-center justify-center font-display font-extrabold text-lg mx-auto mb-4">
                  {num}
                </div>
                <h3 className="font-display font-bold text-base mb-2 whitespace-pre-line">{title}</h3>
                <p className="text-sm text-gray-500 whitespace-pre-line">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-[#1E2A3B] py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display font-extrabold text-3xl text-white mb-4 whitespace-pre-line">{tr("Built for shop owners, not accountants", "అకౌంటెంట్ల కోసం కాదు, దుకాణదారుల కోసం రూపొందించబడింది")}</h2>
            <p className="text-slate-400 mb-8 whitespace-pre-line">{tr("DukaanMitra speaks your language. No complicated menus, no confusing terms — just the information you need to run your shop well.", "డుకాన్‌మిత్ర మీ భాషలో మాట్లాడుతుంది. సంక్లిష్టమైన మెనూలు లేవు, గందరగోళ పదాలు లేవు — మీ దుకాణాన్ని బాగా నడపడానికి కావలసిన సమాచారం మాత్రమే.")}</p>
            <button className="btn-primary whitespace-pre-line text-center" onClick={() => onNavigate("register")}>
              {tr("Start for free", "ఉచితంగా ప్రారంభించండి")} <ArrowRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                <span className="text-sm text-slate-200 whitespace-pre-line">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Store size={28} className="text-[#3B5BDB]" />
          </div>
          <h2 className="font-display font-extrabold text-3xl mb-4 whitespace-pre-line">{tr("Your shop, smarter and simpler.", "మీ దుకాణం, మరింత తెలివైనది మరియు సులభమైనది.")}</h2>
          <p className="text-gray-500 mb-8 whitespace-pre-line">{tr("Join thousands of shop owners across India who manage their business with DukaanMitra.", "డుకాన్‌మిత్రతో తమ వ్యాపారాన్ని నిర్వహించే భారతదేశవ్యాప్తంగా వేలాది మంది దుకాణదారులతో చేరండి.")}</p>
          <button className="btn-primary text-base py-3 px-8 mx-auto whitespace-pre-line text-center" onClick={() => onNavigate("register")}>
            {tr("Create your free account", "మీ ఉచిత ఖాతాను సృష్టించండి")} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E4E7EC] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3B5BDB] flex items-center justify-center">
              <Store size={14} color="#fff" />
            </div>
            <span className="font-display font-extrabold text-base">DukaanMitra</span>
          </div>
          <p className="text-sm text-gray-400 whitespace-pre-line text-center">{tr("© 2024 DukaanMitra. Your shop, smarter and simpler.", "© 2024 డుకాన్‌మిత్ర. మీ దుకాణం, మరింత తెలివైనది మరియు సులభమైనది.")}</p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield size={13} />
            <span className="whitespace-pre-line">{tr("Your data is safe and private", "మీ డేటా సురక్షితంగా మరియు ప్రైవేట్‌గా ఉంటుంది")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
