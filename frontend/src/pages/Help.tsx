import { HelpCircle, Mail, Phone, FileText, ExternalLink } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { downloadPdf } from "../utils/pdf";
import { useSettings } from "../context/SettingsContext";

const faqs = [
  {
    q: "How do I add a new product to my inventory?",
    a: "Go to the Inventory page and click the 'Add Product' button in the top right corner. Fill in the product details like Name, SKU, Category, Price, and Stock, then click 'Save'."
  },
  {
    q: "How can I track my daily expenses?",
    a: "Navigate to the Expenses tab. You can view all your recent expenses there. To add a new one, click 'Add Expense', select the category, and enter the amount and description."
  },
  {
    q: "Can I generate a GST report?",
    a: "Yes, go to the Reports section where you can find the 'GST Report' card. Click 'View Report' to see your tax-ready sales and purchase data, or use the 'Export CSV' option to download it."
  },
  {
    q: "What should I do if a product is out of stock?",
    a: "The Insights and Notifications pages will alert you when products are low or out of stock. You can quickly see the status of all products in the Inventory page. When you receive new stock, simply edit the product in Inventory to update its quantity."
  }
];

const downloadUserManual = () => {
  downloadPdf("DukaanMitra_User_Manual", {
    title: "User Manual",
    subtitle: "A quick guide to getting the most out of DukaanMitra",
    sections: [
      {
        heading: "Frequently Asked Questions",
        columns: ["Question", "Answer"],
        rows: faqs.map((f) => [f.q, f.a]),
      },
      {
        heading: "Getting Started",
        columns: ["Step", "What to do"],
        rows: [
          ["1", "Add your products in the Inventory page, including stock and minimum stock levels."],
          ["2", "Create bills for customers from the Billing page as sales happen."],
          ["3", "Track spending in the Expenses page as you pay for rent, stock, or staff."],
          ["4", "Check the Dashboard and Sales pages daily for a quick view of how the shop is doing."],
          ["5", "Use Reports to download PDF summaries whenever you need them."],
        ],
      },
    ],
  });
};

export default function Help() {
  const { t } = useSettings();
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in space-y-6">
      <PageHeader
        title={t("helpTitle")}
        subtitle={t("helpSubtitle")}
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card title="Frequently Asked Questions" noPadding>
            <div className="divide-y divide-[#E4E7EC]">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-5">
                  <h3 className="font-semibold text-[#1E2A3B] text-sm mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </Card>

        </div>

        <div className="space-y-6">
          <Card title="Contact Support">
            <p className="text-sm text-gray-500 mb-5">Need more help? Our support team is available from 9 AM to 6 PM, Monday to Saturday.</p>
            
            <div className="space-y-4">
              <a href="mailto:support@dukaanmitra.in" className="flex items-center gap-3 p-3 rounded-lg border border-[#E4E7EC] hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1E2A3B]">Email Us</div>
                  <div className="text-xs text-gray-500">support@dukaanmitra.in</div>
                </div>
              </a>
              
              <a href="tel:+9118001234567" className="flex items-center gap-3 p-3 rounded-lg border border-[#E4E7EC] hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1E2A3B]">Call Us (Toll Free)</div>
                  <div className="text-xs text-gray-500">1800-123-4567</div>
                </div>
              </a>
            </div>
          </Card>

          <Card title="Documentation">
            <p className="text-sm text-gray-500 mb-4">Read our detailed guides on how to use every feature of the application.</p>
            <button onClick={downloadUserManual} className="btn-secondary w-full justify-center">
              <FileText size={14} /> User Manual <ExternalLink size={12} className="ml-1 opacity-50" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
