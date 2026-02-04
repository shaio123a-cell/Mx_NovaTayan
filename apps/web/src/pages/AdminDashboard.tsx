import { Link } from 'react-router-dom';
import { Server, Activity, Settings, Users, Database, Radio, Key, Zap } from 'lucide-react';

export default function AdminDashboard() {
    const sections = [
        {
            title: "Worker Management",
            items: [
                {
                    icon: Server,
                    label: "Workers",
                    desc: "Manage registered workers, view status, and toggle availability.",
                    path: "/admin/workers",
                    color: "text-blue-400"
                },
                {
                    icon: Users,
                    label: "Groups & Tags",
                    desc: "Define worker groups and manage targeting tags.",
                    path: "/admin/workers", // Redirect to workers for now as tags are managed inline
                    color: "text-indigo-400",
                }
            ]
        },
        {
            title: "System Health",
            items: [
                {
                    icon: Activity,
                    label: "System Status",
                    desc: "Real-time monitoring of API, Database, and Frontend connectivity.",
                    path: "/admin/status", // Placeholder for next phase
                    color: "text-green-400",
                    pending: true
                },
                {
                    icon: Database,
                    label: "Database",
                    desc: "View database metrics, size, and connection pool status.",
                    path: "/admin/database",
                    color: "text-emerald-400",
                    pending: true
                }
            ]
        },
        {
            title: "Configuration",
            items: [
                {
                    icon: Settings,
                    label: "System Settings",
                    desc: "Configure global HTTP success/failure defaults and system rules.",
                    path: "/admin/settings",
                    color: "text-blue-500"
                },
                {
                    icon: Zap,
                    label: "Global Variables",
                    desc: "Manage system-wide constants, secrets, and environment variables.",
                    path: "/admin/variables",
                    color: "text-indigo-500"
                },
                {
                    icon: Key,
                    label: "Access Tokens",
                    desc: "Manage API keys and authentication tokens.",
                    path: "/admin/auth",
                    color: "text-yellow-400",
                    pending: true
                },
                {
                    icon: Radio,
                    label: "Signals",
                    desc: "Configure external signal webhooks and triggers.",
                    path: "/admin/signals",
                    color: "text-orange-400",
                    pending: true
                }
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 tracking-tight">System Control</h1>
            <p className="text-gray-500 mb-10">Manage fleet distribution, global settings, and connectivity.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-6">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-3">
                            {section.title}
                        </h3>
                        <div className="grid gap-5">
                            {section.items.map((item, i) => (
                                <Link
                                    to={item.pending ? '#' : item.path}
                                    key={i}
                                    className={`flex items-start gap-5 p-6 rounded-2xl border transition-all ${item.pending ? 'opacity-40 cursor-not-allowed border-gray-50 bg-gray-50/30' : 'bg-white border-gray-100 hover:border-[#1976D2] hover:shadow-xl hover:-translate-y-1 shadow-sm'}`}
                                >
                                    <div className={`p-3 rounded-xl bg-gray-50 ${item.color.replace('blue-400', '[#1976D2]').replace('indigo-400', 'indigo-600').replace('green-400', 'green-600').replace('emerald-400', 'emerald-600').replace('yellow-400', 'yellow-600').replace('orange-400', 'orange-600')}`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">{item.label}</h4>
                                        <p className="text-sm text-gray-500 mt-1 leading-relaxed font-medium">
                                            {item.desc}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
