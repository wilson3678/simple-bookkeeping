import { useState, useEffect, useRef } from 'react';
import type { Transaction, AppSettings } from './types';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import SettingsDialog from './components/SettingsDialog';
import Dashboard from './components/Dashboard';
import { dropboxService } from './services/dropbox';
import { Wallet, LogIn, LogOut, Settings, Edit2, Trash2, ChevronDown } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  commonSources: ['國泰PLAY(街口)', '現金', '中信LINE PAY', '台新GoGo', '聯邦賴點卡'],
  commonDestinations: ['早餐', '午餐', '晚餐', '飲料', '交通', '超市', '房租', '娛樂', '醫療', '其他'],
  commonIncomeSources: ['薪資', '獎金', '投資', '回饋', '其他'],
  commonNotes: ['早餐', '午餐', '晚餐', '飲料', '交通']
};

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Profile State
  const [profiles, setProfiles] = useState<string[]>(['Default']);
  const [currentProfile, setCurrentProfile] = useState<string>('Default');

  // Still keep "recent" based on actual data
  const [recentSources, setRecentSources] = useState<string[]>([]);
  const [recentDestinations, setRecentDestinations] = useState<string[]>([]);

  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const initAuth = async () => {
      // 1. Check if we are returning from redirect
      const params = new URLSearchParams(window.location.search);
      const hasCode = params.has('code');

      if (hasCode) {
        setIsLoading(true);
        const success = await dropboxService.handleRedirect();
        setIsLoading(false);
        if (success) {
          setIsAuthenticated(true);
          await loadProfiles(); // Load profiles first
          await loadDataAndSettings();
          // url cleaning is done in handleRedirect
          return;
        } else {
          // If loop happens here, it's because success is false
        }
      }

      // 2. Check local storage for existing session
      const savedToken = localStorage.getItem('dropbox_token');

      if (savedToken) {
        setIsAuthenticated(true);
        await loadProfiles(); // Load profiles first
        await loadDataAndSettings();
      }
    };

    initAuth();
  }, []);

  const loadProfiles = async () => {
    const list = await dropboxService.getProfiles();
    setProfiles(list);
    const current = dropboxService.getProfile();
    setCurrentProfile(current);
  };

  const handleLogin = async () => {
    try {
      dropboxService.initializeAuth(); // Uses default CLIENT_ID
      const authUrl = await dropboxService.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login prep failed', error);
      alert('無法啟動登入流程');
    }
  };

  const handleLogout = async () => {
    if (confirm('確定要登出嗎？這將會移除本機的連線紀錄。')) {
      await dropboxService.logout();
      setIsAuthenticated(false);
      setTransactions([]);

      // Ask if they want to logout from Dropbox provider as well
      if (confirm('已清除本機登入資訊。\n\n是否要同時開啟 Dropbox 官網登出頁面？\n(若在公用電腦上使用，建議執行此步驟以完全登出)')) {
        window.open('https://www.dropbox.com/logout', '_blank');
      }
    }
  };

  const loadDataAndSettings = async () => {
    setIsLoading(true);
    try {
      // Load Transactions
      let exists = false;
      try {
        exists = await dropboxService.checkFileExists('bookkeeping_data.json');
      } catch (error: any) {
        console.error('Check file existence failed:', error);

        const status = error.status || (error.reponse && error.response.status);
        if (status === 401 || status === 400) {
          alert('授權已過期，請重新登入 Dropbox。');
          handleLogout();
          return;
        }

        alert('無法檢查檔案狀態 (可能是網路或 Dropbox 連線問題)。\n為保護您的資料，將暫停載入。\n請重新整理再試。');
        setIsLoading(false);
        return; // STOP here to protect data
      }

      if (exists) {
        const data = await dropboxService.downloadFile<Transaction[]>('bookkeeping_data.json');
        if (data) {
          setTransactions(data);
          updateSuggestions(data);
        }
      } else {
        // Only if we are SURE it doesn't exist do we create a new one
        console.log('No existing data file found, creating new one.');
        await dropboxService.uploadFile([], 'bookkeeping_data.json');
        setTransactions([]);
      }

      // Load Settings
      try {
        const settingsExists = await dropboxService.checkFileExists('settings.json');
        if (settingsExists) {
          const loadedSettings = await dropboxService.loadSettings();
          if (loadedSettings) {
            setSettings(loadedSettings);
          }
        } else {
          // New profile might not have settings yet, use defaults
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.warn('Settings load check failed, using defaults', error);
        // Settings are less critical, can proceed or just warn
        setSettings(DEFAULT_SETTINGS);
      }

    } catch (error: any) {
      console.error('Failed to load data', error);

      // Check for Auth Error (401) or Invalid Token
      // The Dropbox SDK might return error.status or error.error.error_summary
      const status = error.status || (error.reponse && error.response.status);
      const errorTag = error.error?.['.tag'];

      // If unauthorized or bad token, force logout so user can re-login
      if (status === 401 || status === 400 || errorTag === 'invalid_access_token') {
        alert('授權已過期，請重新登入 Dropbox。');
        handleLogout(); // This cleans up local storage and state
      } else {
        alert('載入資料時發生錯誤');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSuggestions = (data: Transaction[]) => {
    const sources = Array.from(new Set(data.map(t => t.source))).slice(0, 10);
    const dests = Array.from(new Set(data.map(t => t.destination))).slice(0, 10);
    setRecentSources(sources);
    setRecentDestinations(dests);
  };

  const handleAddTransaction = async (newTransactions: Transaction[]) => {
    let updated;

    // Check if we are updating a single existing transaction
    if (editingTransaction && newTransactions.length === 1) {
      // Update mode
      updated = transactions.map(t => t.id === newTransactions[0].id ? newTransactions[0] : t);
      setEditingTransaction(null); // Clear edit mode
      alert('修改完成！');
    } else {
      // Create mode (or split which is effectively create new ones for now)
      updated = [...transactions, ...newTransactions];
    }

    setTransactions(updated);
    updateSuggestions(updated);

    try {
      await dropboxService.uploadFile(updated, 'bookkeeping_data.json');
    } catch (error: any) {
      console.error('Save error', error);
      const msg = error.error_summary || error.message || JSON.stringify(error);
      alert(`儲存失敗！資料未同步到 Dropbox\n錯誤代碼: ${msg}`);
    }
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;

    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);

    try {
      await dropboxService.uploadFile(updated, 'bookkeeping_data.json');
    } catch (error) {
      console.error('Save error', error);
      alert('刪除失敗！資料未同步到 Dropbox');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await dropboxService.saveSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('設定儲存失敗，無法同步至 Dropbox');
    }
  };

  const handleCreateProfile = async () => {
    const name = prompt('請輸入新帳本名稱 (例如: 公司帳):');
    if (name && name.trim()) {
      const cleanName = name.trim();
      if (profiles.includes(cleanName)) {
        alert('此帳本已存在');
        return;
      }
      await dropboxService.addProfile(cleanName);
      setProfiles(prev => [...prev, cleanName]);
      await handleSwitchProfile(cleanName);
    }
  };

  const handleRenameProfile = async () => {
    if (currentProfile === 'Default') return;
    const newName = prompt('請輸入新的帳本名稱:', currentProfile);
    if (newName && newName.trim() && newName !== currentProfile) {
      if (profiles.includes(newName)) {
        alert('此名稱已存在');
        return;
      }
      setIsLoading(true);
      try {
        await dropboxService.renameProfile(currentProfile, newName);
        setProfiles(prev => prev.map(p => p === currentProfile ? newName : p));
        setCurrentProfile(newName);
        alert('修改成功');
      } catch (e) {
        console.error(e);
        alert('修改失敗');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteProfile = async () => {
    if (currentProfile === 'Default') return;
    if (!confirm(`確定要刪除「${currentProfile}」這個帳本嗎？\n此動作將會永久刪除該帳本的所有記帳資料與設定，無法復原！`)) return;

    // Double confirm
    const input = prompt(`請輸入 "${currentProfile}" 以確認刪除:`);
    if (input !== currentProfile) {
      alert('確認文字不符，已取消刪除');
      return;
    }

    setIsLoading(true);
    try {
      await dropboxService.deleteProfile(currentProfile);
      setProfiles(prev => prev.filter(p => p !== currentProfile));
      await handleSwitchProfile('Default');
      alert('已刪除帳本');
    } catch (e) {
      console.error(e);
      alert('刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchProfile = async (name: string) => {
    setIsLoading(true);
    dropboxService.setProfile(name);
    setCurrentProfile(name);

    // Reset state before loading new
    setTransactions([]);
    setSettings(DEFAULT_SETTINGS);

    await loadDataAndSettings();
    setIsLoading(false);
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">處理登入中 / 載入資料中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f0eb] p-4 text-[#4a4a4a]">
        <div className="bg-white p-10 rounded shadow-sm border-t-4 border-[#7F0019] max-w-sm w-full text-center">

          <h1 className="text-3xl font-bold tracking-widest mb-2 font-serif text-[#2c2c2c]">簡單記帳</h1>
          <p className="text-gray-500 mb-10 text-sm tracking-wide">Simple Bookkeeping</p>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full bg-[#7F0019] hover:bg-[#99001e] text-white font-normal py-3 px-6 transition-all flex items-center justify-center gap-3 tracking-widest text-sm"
            >
              <LogIn size={16} />
              連結 Dropbox
            </button>
          </div>
          <p className="mt-12 text-xs text-gray-300 font-light tracking-wider">
            POWERED BY DROPBOX
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4 md:p-8 font-sans text-[#454545]">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row items-center gap-4 mb-8 pt-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start text-center md:text-left relative">
            <div className="w-8 h-8 flex items-center justify-center bg-[#8B001D] text-white rounded-sm shadow-sm shrink-0">
              <Wallet size={18} />
            </div>
            <h1 className="text-xl font-bold text-black tracking-widest font-serif whitespace-nowrap">簡單記帳</h1>
          </div>

          <div className="flex items-center justify-center gap-3 w-full md:w-auto flex-wrap">
            {/* Profile Selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <select
                  value={currentProfile}
                  onChange={(e) => {
                    if (e.target.value === 'CREATE_NEW') {
                      handleCreateProfile();
                    } else {
                      handleSwitchProfile(e.target.value);
                    }
                  }}
                  className="bg-[#faf9f6] appearance-none pl-1 pr-7 border-b-2 border-gray-300 focus:border-black font-bold text-sm py-1 focus:outline-none cursor-pointer transition max-w-[120px] text-ellipsis"
                >
                  {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value="CREATE_NEW">+ 建立新帳本...</option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>

              {currentProfile !== 'Default' && (
                <div className="flex gap-1">
                  <button
                    onClick={handleRenameProfile}
                    className="p-1 text-gray-400 hover:text-black transition"
                    title="修改帳本名稱"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={handleDeleteProfile}
                    className="p-1 text-gray-400 hover:text-[#8B001D] transition"
                    title="刪除此帳本"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-600 hover:text-black transition p-2 rounded-full hover:bg-gray-100"
                title="設定"
              >
                <Settings size={20} />
              </button>

              <div className="text-xs text-[#8B001D] bg-[#faf9f6] border-2 border-gray-400 px-3 py-1 tracking-wider font-bold whitespace-nowrap">
                {isLoading ? 'SYNC' : `${transactions.length} 筆`}
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-black transition p-2 rounded-full hover:bg-gray-100"
                title="登出"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-8">
          <Dashboard
            transactions={transactions}
            accounts={settings.commonSources}
            initialBalances={settings.initialBalances}
          />

          <TransactionForm
            onSubmit={handleAddTransaction}
            initialSources={recentSources.length > 0 ? [...settings.commonSources, ...recentSources] : settings.commonSources}
            initialDestinations={recentDestinations.length > 0 ? [...settings.commonDestinations, ...recentDestinations] : settings.commonDestinations}
            initialIncomeSources={settings.commonIncomeSources}
            initialNotes={settings.commonNotes}
            editingTransaction={editingTransaction}
            onCancelEdit={() => setEditingTransaction(null)}
          />

          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            onEdit={handleEditTransaction}
          />
        </main>

        <footer className="mt-16 text-center text-gray-500 text-xs pb-8 tracking-widest font-medium">
          <p>SIMPLE BOOKKEEPING · DROPBOX</p>
        </footer>
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
