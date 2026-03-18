import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function CompensationDashboard() {
    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Compensation & Benefits</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage employee benefits, government contributions, and company policies.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href="/compensation/gov-configs" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-emerald-300 transition-all group block">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform">
                            🏛️
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">Government Contribution Settings</h3>
                        <p className="text-slate-600 text-sm">
                            Configure standard rates, percentage shares, brackets, and active active formulas for SSS, Pag-IBIG, and PhilHealth.
                        </p>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
