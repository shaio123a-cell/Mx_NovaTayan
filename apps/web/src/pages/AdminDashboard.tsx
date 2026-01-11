import { Link } from 'react-router-dom';
import { Server, Activity, Settings, Users, Database, Radio, Key } from 'lucide-react';

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
            <h1 className="text-3xl font-bold mb-2">Administration</h1>
            <p className="text-gray-400 mb-8">Manage system settings, workers, and configurations.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2">
                            {section.title}
                        </h3>
                        <div className="grid gap-4">
                            {section.items.map((item, i) => (
                                <Link
                                    to={item.pending ? '#' : item.path}
                                    key={i}
                                    className={`flex items-start gap-4 p-4 rounded-xl border border-gray-800 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-700 transition-all ${item.pending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-lg'}`}
                                >
                                    <div className={`p-3 rounded-lg bg-gray-900 ${item.color}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-200">{item.label}</h4>
                                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
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
