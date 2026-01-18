import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface DashboardProps {
    transactions: Transaction[];
    accounts: string[];
    initialBalances?: { [key: string]: number };
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts, initialBalances = {} }) => {

    // Calculate Balances
    const stats = useMemo(() => {
        const balances: Record<string, number> = {};
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Initialize accounts with initial balances
        accounts.forEach(acc => {
            balances[acc] = initialBalances[acc] || 0;
        });

        transactions.forEach(t => {
            const amount = Number(t.amount);
            const isCurrentMonth = t.date.replace(/\//g, '-').startsWith(currentMonth);

            if (!t.type || t.type === 'EXPENSE') {
                // Expense: Source decreases
                if (t.source) balances[t.source] = (balances[t.source] || 0) - amount;

                if (isCurrentMonth) monthlyExpense += amount;
            } else if (t.type === 'INCOME') {
                // Income: Destination increases
                if (t.destination) balances[t.destination] = (balances[t.destination] || 0) + amount;

                if (isCurrentMonth) monthlyIncome += amount;
            } else if (t.type === 'TRANSFER') {
                // Transfer: Source decreases, Destination increases
                if (t.source) balances[t.source] = (balances[t.source] || 0) - amount;
                if (t.destination) balances[t.destination] = (balances[t.destination] || 0) + amount;
            }
        });

        // Calculate Total Assets
        const totalAssets = Object.values(balances).reduce((acc, val) => acc + val, 0);

        return { balances, totalAssets, monthlyIncome, monthlyExpense };
    }, [transactions, accounts, initialBalances]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Assets Card */}
            <div className="bg-black text-white p-6 shadow-xl border-2 border-black flex flex-col justify-between">
                <div>
                    <h3 className="text-xs font-black tracking-widest uppercase opacity-70 mb-1">Total Assets</h3>
                    <h2 className="text-3xl font-mono font-bold tracking-tighter">
                        $ {stats.totalAssets.toLocaleString()}
                    </h2>
                </div>
                <div className="mt-4 flex items-center gap-2 opacity-50">
                    <Wallet size={16} />
                    <span className="text-xs font-bold tracking-wider">NET WORTH</span>
                </div>
            </div>

            {/* Monthly Stats */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                {/* Income */}
                <div className="bg-[#faf9f6] p-6 shadow-lg border-2 border-[#8B001D] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-black tracking-widest uppercase text-[#8B001D] mb-1">Monthly Income</h3>
                            <h2 className="text-2xl font-mono font-bold text-[#8B001D] tracking-tighter">
                                + $ {stats.monthlyIncome.toLocaleString()}
                            </h2>
                        </div>
                        <ArrowDownCircle className="text-[#8B001D]" size={24} />
                    </div>
                </div>

                {/* Expense */}
                <div className="bg-[#faf9f6] p-6 shadow-lg border-2 border-black flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xs font-black tracking-widest uppercase text-black mb-1">Monthly Expense</h3>
                            <h2 className="text-2xl font-mono font-bold text-black tracking-tighter">
                                - $ {stats.monthlyExpense.toLocaleString()}
                            </h2>
                        </div>
                        <ArrowUpCircle className="text-black" size={24} />
                    </div>
                </div>
            </div>

            {/* Account Balances List */}
            <div className="md:col-span-3 bg-[#faf9f6] border-2 border-gray-300 p-6 shadow-lg">
                <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 border-b-2 border-black pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-black block"></span>
                    Account Balances 帳戶餘額
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {accounts.map(account => (
                        <div key={account} className="flex justify-between items-center p-3 bg-white border-2 border-gray-200 hover:border-black transition group">
                            <span className="font-bold text-sm text-gray-600 group-hover:text-black">{account}</span>
                            <span className={`font-mono font-bold ${stats.balances[account] < 0 ? 'text-red-600' : 'text-black'}`}>
                                $ {(stats.balances[account] || 0).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
