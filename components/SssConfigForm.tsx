import { useState } from 'react';

export default function SssConfigForm({ data, onSave }: { data: any[], onSave: (data: any[]) => void }) {
    const [rows, setRows] = useState(data || []);

    const addRow = () => {
        setRows([...rows, {
            range_start: 0,
            range_end: 0,
            msc: 0,
            er_share: 0,
            ee_share: 0,
            ec: 10
        }]);
    };

    const updateRow = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: Number(value) };
        setRows(newRows);
        onSave(newRows);
    };

    const deleteRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
        onSave(newRows);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-slate-700">SSS Contribution Brackets</h4>
                <button type="button" onClick={addRow} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-md transition-colors">+ Add Bracket</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 font-medium text-slate-600">Min Salary</th>
                            <th className="px-4 py-3 font-medium text-slate-600">Max Salary</th>
                            <th className="px-4 py-3 font-medium text-slate-600">MSC</th>
                            <th className="px-4 py-3 font-medium text-slate-600">ER Share</th>
                            <th className="px-4 py-3 font-medium text-slate-600">EE Share</th>
                            <th className="px-4 py-3 font-medium text-slate-600">EC</th>
                            <th className="px-4 py-3 font-medium text-slate-600">Total</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td className="p-2"><input type="number" value={r.range_start} onChange={e => updateRow(i, 'range_start', e.target.value)} className="w-24 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.range_end} onChange={e => updateRow(i, 'range_end', e.target.value)} className="w-24 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.msc} onChange={e => updateRow(i, 'msc', e.target.value)} className="w-24 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.er_share} onChange={e => updateRow(i, 'er_share', e.target.value)} className="w-24 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.ee_share} onChange={e => updateRow(i, 'ee_share', e.target.value)} className="w-24 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="p-2"><input type="number" value={r.ec} onChange={e => updateRow(i, 'ec', e.target.value)} className="w-20 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none" /></td>
                                <td className="px-4 py-2 font-medium text-slate-700 bg-slate-50">{(Number(r.er_share) + Number(r.ee_share) + Number(r.ec)).toFixed(2)}</td>
                                <td className="p-2 text-center">
                                    <button type="button" onClick={() => deleteRow(i)} className="text-rose-500 hover:text-rose-700">🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400">No brackets configured. Add one to start.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">* Use a very large number (e.g., 9999999) for the Max Salary of the final bracket if it spans to infinity.</p>
        </div>
    );
}
