import React, { useState } from 'react';
import type { Transaction } from '../types';
import { Download, Trash2, Edit2 } from 'lucide-react';
import Papa from 'papaparse';

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit }) => {
    // Export CSV State
    const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const handleExportCSV = () => {
        let dataToExport = [...transactions];

        // Filter by month if set
        if (filterMonth) {
            dataToExport = dataToExport.filter(t => {
                const tDate = t.date.replace(/\//g, '-'); // Standardize to YYYY-MM-DD
                return tDate.startsWith(filterMonth);
            });
        }

        if (dataToExport.length === 0) {
            alert('沒有符合條件的資料可匯出');
            return;
        }

        // Format for CSV: 記錄日期,來源項目,目的帳目,異動金額,摘要,收付人,專案代號,發票號碼
        const csvData = dataToExport.map(t => ({
            '記錄日期': t.date,
            '來源項目': t.source,
            '目的帳目': t.destination,
            '異動金額': t.amount,
            '摘要': t.summary,
            '收付人': t.payer || '',
            '專案代號': t.projectCode || '',
            '發票號碼': t.invoiceNumber || '',
        }));

        const csv = Papa.unparse(csvData);
        // Add BOM (\uFEFF) so Excel opens it correctly with Chinese characters
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `記帳資料_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-12 bg-[#faf9f6] p-6 md:p-8 shadow-lg border-2 border-gray-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-4 border-black pb-4">
                <h2 className="text-xl font-black text-black tracking-widest flex items-center gap-2">
                    <span className="w-2 h-6 bg-black block"></span>
                    HISTORY 歷史紀錄
                </h2>

                <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                    <div className="flex items-center gap-3 border-b-2 border-black pb-1 relative">
                        <span className="text-xs font-black text-black tracking-widest uppercase">Filter</span>

                        <button
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                            className="text-xs font-mono font-bold text-black hover:text-[#8B001D] transition flex items-center gap-2"
                        >
                            {filterMonth}
                        </button>

                        {isPickerOpen && (
                            <div className="absolute top-8 left-0 z-50 bg-[#faf9f6] border-2 border-black shadow-xl p-4 w-64">
                                {/* Year Navigator */}
                                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-200 pb-2">
                                    <button
                                        onClick={() => {
                                            const [y, m] = filterMonth.split('-');
                                            setFilterMonth(`${parseInt(y) - 1}-${m}`);
                                        }}
                                        className="text-black hover:text-[#8B001D] font-black"
                                    >
                                        &lt;
                                    </button>
                                    <span className="font-black text-lg">{filterMonth.split('-')[0]}</span>
                                    <button
                                        onClick={() => {
                                            const [y, m] = filterMonth.split('-');
                                            setFilterMonth(`${parseInt(y) + 1}-${m}`);
                                        }}
                                        className="text-black hover:text-[#8B001D] font-black"
                                    >
                                        &gt;
                                    </button>
                                </div>

                                {/* Month Grid */}
                                <div className="grid grid-cols-4 gap-2">
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const m = (i + 1).toString().padStart(2, '0');
                                        const isSelected = filterMonth.endsWith(`-${m}`);
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    const [y] = filterMonth.split('-');
                                                    setFilterMonth(`${y}-${m}`);
                                                    setIsPickerOpen(false);
                                                }}
                                                className={`p-2 text-xs font-bold font-mono transition border-2 ${isSelected
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-transparent text-black border-transparent hover:border-black'
                                                    }`}
                                            >
                                                {i + 1}月
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 pt-2 border-t-2 border-gray-200 text-center">
                                    <button
                                        onClick={() => {
                                            setFilterMonth(new Date().toISOString().slice(0, 7));
                                            setIsPickerOpen(false);
                                        }}
                                        className="text-[10px] font-black tracking-widest text-[#8B001D] hover:underline uppercase"
                                    >
                                        Back to Today
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 text-black hover:text-[#8B001D] transition text-xs font-black tracking-widest whitespace-nowrap border-b-2 border-black hover:border-[#8B001D] pb-1 uppercase"
                    >
                        <Download size={14} className="stroke-[3px]" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 border-b-2 border-black text-[10px] uppercase tracking-widest">
                            <th className="py-4 px-2 font-black text-black">Date</th>
                            <th className="py-4 px-2 font-black text-black">Source</th>
                            <th className="py-4 px-2 font-black text-black">Category</th>
                            <th className="py-4 px-2 font-black text-black text-right">Amount</th>
                            <th className="py-4 px-2 font-black text-black">Note</th>
                            <th className="py-4 px-2 font-black text-black w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {transactions
                            .filter(t => !filterMonth || t.date.replace(/\//g, '-').startsWith(filterMonth))
                            .slice().reverse().map(t => (
                                <tr key={t.id} className="hover:bg-[#ebe9e4] transition border-b border-gray-300 last:border-0 group">
                                    <td className="py-4 px-2 text-black whitespace-nowrap font-mono text-xs tracking-wide font-bold">{t.date}</td>
                                    <td className="py-4 px-2 text-black font-bold">{t.source}</td>
                                    <td className="py-4 px-2 text-black font-bold">{t.destination}</td>
                                    <td className="py-4 px-2 font-mono font-black text-right text-black">{t.amount}</td>
                                    <td className="py-4 px-2 text-gray-600 truncate max-w-xs text-xs font-bold">{t.summary}</td>
                                    <td className="py-4 px-2 text-center flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onEdit(t)}
                                            className="text-gray-400 hover:text-black transition p-1"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(t.id)}
                                            className="text-gray-400 hover:text-black transition p-1"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-400 tracking-wider text-xs">NO DATA 目前沒有紀錄</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionList;
