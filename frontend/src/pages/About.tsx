import { ExternalLink } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { useSettings } from "../context/SettingsContext";

export default function About() {
  const { t } = useSettings();
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-screen-xl mx-auto fade-in space-y-6">
      <PageHeader
        title={t("aboutDukaanMitra")}
        subtitle="Version 1.0.0"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="text-center p-8 flex flex-col items-center justify-center h-full">
           <div className="w-20 h-20 rounded-2xl bg-[#3B5BDB] flex items-center justify-center text-white font-display font-extrabold text-3xl mx-auto mb-5 shadow-lg shadow-blue-500/20">
             DM
           </div>
           <h3 className="font-display font-bold text-2xl mb-1">DukaanMitra</h3>
           <p className="text-sm text-gray-500 mb-6 font-medium">Your comprehensive shop management solution</p>
           <p className="text-sm text-gray-600 leading-relaxed mb-0">
             DukaanMitra is designed to simplify billing, inventory, and customer management for your business. We believe in empowering small and medium business owners with modern, easy-to-use digital tools.
           </p>
        </Card>
        
        <div className="space-y-6">
          <Card title="Legal & Policies">
             <div className="space-y-3 mt-4">
                <a href="#" className="flex items-center justify-between p-3.5 rounded-xl border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors text-sm font-semibold text-[#1E2A3B]">
                   Terms of Service <ExternalLink size={15} className="text-gray-400" />
                </a>
                <a href="#" className="flex items-center justify-between p-3.5 rounded-xl border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors text-sm font-semibold text-[#1E2A3B]">
                   Privacy Policy <ExternalLink size={15} className="text-gray-400" />
                </a>
             </div>
          </Card>
          <Card title="System Information">
             <div className="space-y-3 mt-4 text-sm">
                <div className="flex justify-between border-b border-[#F3F4F6] pb-3">
                   <span className="text-gray-500 font-medium">App Version</span>
                   <span className="font-bold text-[#1E2A3B]">v1.0.0</span>
                </div>
                <div className="flex justify-between border-b border-[#F3F4F6] pb-3">
                   <span className="text-gray-500 font-medium">Environment</span>
                   <span className="font-bold text-[#1E2A3B]">Production</span>
                </div>
                <div className="flex justify-between pb-1">
                   <span className="text-gray-500 font-medium">Platform</span>
                   <span className="font-bold text-[#1E2A3B] capitalize">{navigator.platform || 'Web'}</span>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
