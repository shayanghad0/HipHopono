import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../context/SettingsContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/ui/toast.tsx';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';
import { api } from '../lib/api.ts';
import {
  Settings as SettingsIcon,
  Bot,
  Shield,
  User,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  Globe,
  Zap,
  Terminal,
  FileText,
  Clock,
  Eye,
  EyeOff,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import Footer from '../components/Footer.tsx';

type Tab = 'model' | 'agent' | 'account';

export default function Settings() {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { user, changePassword, updateProfile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('model');
  const [providerLabel, setProviderLabel] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic' | 'other'>('openai');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [autoApproveReads, setAutoApproveReads] = useState(true);
  const [autoApproveWrites, setAutoApproveWrites] = useState(false);
  const [autoApproveCommands, setAutoApproveCommands] = useState(false);
  const [commandTimeoutMs, setCommandTimeoutMs] = useState(30000);
  const [useQueryAuth, setUseQueryAuth] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setNewDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    if (settings) {
      setProviderLabel(settings.providerLabel || '');
      setModelName(settings.modelName || '');
      setApiBaseUrl(settings.apiBaseUrl || '');
      setApiFormat(settings.apiFormat || 'openai');
      setTemperature(settings.temperature ?? 0.2);
      setMaxTokens(settings.maxTokens ?? 8192);
      setSystemPrompt(settings.systemPrompt || '');
      setAutoApproveReads(settings.autoApproveReads ?? true);
      setAutoApproveWrites(settings.autoApproveWrites ?? false);
      setAutoApproveCommands(settings.autoApproveCommands ?? false);
      setCommandTimeoutMs(settings.commandTimeoutMs ?? 30000);
      setUseQueryAuth(settings.customHeaders?.['X-Auth-As-Query'] === 'true');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings({
        providerLabel,
        modelName,
        apiBaseUrl,
        apiFormat,
        temperature,
        maxTokens,
        systemPrompt,
        autoApproveReads,
        autoApproveWrites,
        autoApproveCommands,
        commandTimeoutMs,
        customHeaders: useQueryAuth ? { 'X-Auth-As-Query': 'true' } : {},
      });
      if (apiToken) {
        await api.settings.update({ apiToken });
      }
      addToast('success', 'Settings saved successfully!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await updateSettings({
        providerLabel,
        modelName,
        apiBaseUrl,
        apiFormat,
        temperature,
        maxTokens,
        systemPrompt,
        autoApproveReads,
        autoApproveWrites,
        autoApproveCommands,
        commandTimeoutMs,
        customHeaders: useQueryAuth ? { 'X-Auth-As-Query': 'true' } : {},
      });
      if (apiToken) {
        await api.settings.update({ apiToken });
      }
      const result = await api.settings.testConnection();
      setTestResult(result);
      if (result.ok) {
        addToast('success', 'API connection successful!');
      } else {
        addToast('error', result.error || 'Connection failed');
      }
    } catch (err) {
      const message = (err as Error).message;
      setTestResult({ ok: false, error: message });
      addToast('error', message);
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) return;
    try {
      await updateProfile(newUsername, newDisplayName || undefined);
      addToast('success', 'Profile updated successfully!');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      const message = (err as Error).message;
      addToast('error', message);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      addToast('success', 'Password changed successfully!');
    } catch (err) {
      const message = (err as Error).message;
      addToast('error', message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleReset = async () => {
    if (!confirm('RESET EVERYTHING?\n\nThis will delete ALL data:\n- All chats & messages\n- All projects\n- All settings\n- Your password\n\nA new admin password will be generated.\n\nThis CANNOT be undone.')) return;
    setResetting(true);
    try {
      const result = await api.settings.reset() as { username: string; password: string };
      addToast('warning', `Reset complete! New credentials: ${result.username} / ${result.password}`);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      addToast('error', 'Reset failed. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } finally {
      setResetting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'model', label: 'Model & API', icon: <Bot className="w-4 h-4" /> },
    { id: 'agent', label: 'Agent Behavior', icon: <Terminal className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
  ];

  const inputBase = 'w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-sm transition-all duration-150';
  const labelBase = 'block text-sm text-text-muted mb-1.5 font-medium';
  const fieldGroup = 'space-y-3';

  return (
    <motion.div
      className="relative flex flex-col min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <BackgroundPaths />
      <div className="relative z-10 max-w-5xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/project')}
              className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm transition-colors"
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home Page
            </motion.button>
            <div className="h-5 w-px bg-border" />
            <h1 className="text-xl font-bold text-text-bright flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-accent" />
              Settings
            </h1>
          </div>
          {user && (
            <div className="text-sm text-text-muted">
              Logged in as <span className="text-text font-mono">{user.username}</span>
            </div>
          )}
        </motion.div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <motion.nav
            className="hidden md:flex flex-col gap-1 w-48 flex-shrink-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-text-muted hover:text-text hover:bg-bg-secondary border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </motion.nav>

          {/* Mobile Tab Bar */}
          <motion.div
            className="md:hidden flex gap-2 w-full mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-text-muted hover:text-text bg-bg-secondary border border-border'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'model' && (
                <motion.div
                  key="model"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Provider Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Provider</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelBase}>Provider Label</label>
                        <input
                          type="text"
                          value={providerLabel}
                          onChange={(e) => setProviderLabel(e.target.value)}
                          placeholder="OpenAI"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>API Format</label>
                        <select
                          value={apiFormat}
                          onChange={(e) => setApiFormat(e.target.value as 'openai' | 'anthropic' | 'other')}
                          className={inputBase}
                        >
                          <option value="openai">OpenAI Compatible</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="other">Other (Custom)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelBase}>Model Name</label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="gpt-4o"
                        className={`${inputBase} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={labelBase}>API Base URL</label>
                      <input
                        type="text"
                        value={apiBaseUrl}
                        onChange={(e) => setApiBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className={`${inputBase} font-mono`}
                      />
                    </div>
                  </section>

                  {/* Token Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Authentication</h2>
                    </div>

                    <div>
                      <label className={labelBase}>
                        API Token
                        {settings?.apiTokenSet && (
                          <span className="ml-2 inline-flex items-center gap-1 text-success text-xs bg-success/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {settings.apiTokenPreview}
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={apiToken}
                          onChange={(e) => setApiToken(e.target.value)}
                          placeholder={settings?.apiTokenSet ? 'Enter new token to replace...' : 'Enter API token...'}
                          className={`${inputBase} pr-10 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1 rounded transition-colors"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          checked={useQueryAuth}
                          onChange={(e) => setUseQueryAuth(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-bg-tertiary border border-border rounded-full peer-checked:bg-accent/20 peer-checked:border-accent/50 transition-colors" />
                        <div className="absolute inset-0.5 bg-text-muted rounded-full peer-checked:translate-x-4 peer-checked:bg-accent transition-transform" />
                      </div>
                      <div>
                        <span className="text-sm text-text group-hover:text-text-bright transition-colors">
                          Send API key as query parameter
                        </span>
                        <p className="text-xs text-text-muted mt-0.5">
                          Use <code className="font-mono text-accent/80">?api_key=...</code> instead of Authorization header
                        </p>
                      </div>
                    </label>
                  </section>

                  {/* Model Params Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Model Parameters</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className={labelBase}>Temperature</label>
                          <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
                            {temperature.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-accent"
                        />
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div>
                        <label className={labelBase}>Max Tokens</label>
                        <input
                          type="number"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                          className={inputBase}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Test Connection */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    <AnimatePresence mode="wait">
                      {testResult !== null && (
                        <motion.div
                          key={testResult.ok ? 'ok' : 'err'}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          className={`flex items-center gap-1.5 text-sm ${testResult.ok ? 'text-success' : 'text-danger'}`}
                        >
                          {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {testResult.ok ? 'Connected' : testResult.error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {activeTab === 'agent' && (
                <motion.div
                  key="agent"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* System Prompt Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">System Prompt</h2>
                    </div>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={8}
                      placeholder="You are a helpful coding assistant..."
                      className={`${inputBase} font-mono text-xs resize-y min-h-[160px]`}
                    />
                    <div className="text-xs text-text-muted text-right">
                      {systemPrompt.length} characters
                    </div>
                  </section>

                  {/* Auto-approve Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Auto-approve Actions</h2>
                    </div>

                    {[
                      { key: 'reads', label: 'Read operations', desc: 'Allow file reads without confirmation', checked: autoApproveReads, set: setAutoApproveReads },
                      { key: 'writes', label: 'Write operations', desc: 'Allow file edits and creations without confirmation', checked: autoApproveWrites, set: setAutoApproveWrites },
                      { key: 'commands', label: 'Terminal commands', desc: 'Run shell commands without confirmation', checked: autoApproveCommands, set: setAutoApproveCommands },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex-1">
                          <div className="text-sm text-text group-hover:text-text-bright transition-colors font-medium">
                            {item.label}
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
                        </div>
                        <div className="relative ml-4 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => item.set(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-bg-tertiary border border-border rounded-full peer-checked:bg-success/20 peer-checked:border-success/50 transition-colors" />
                          <div className="absolute inset-0.5 bg-text-muted rounded-full peer-checked:translate-x-4 peer-checked:bg-success transition-transform" />
                        </div>
                      </label>
                    ))}
                  </section>

                  {/* Timeout Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Command Timeout</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={commandTimeoutMs}
                        onChange={(e) => setCommandTimeoutMs(parseInt(e.target.value))}
                        className={`${inputBase} w-32 font-mono`}
                      />
                      <span className="text-sm text-text-muted">milliseconds</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Max time to wait for a terminal command to complete before timing out.
                    </p>
                  </section>
                </motion.div>
              )}

              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Change Profile Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Change Profile</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelBase}>Username</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Display Name</label>
                        <input
                          type="text"
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                          placeholder="Optional"
                          className={inputBase}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateProfile}
                      className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      {profileSaved ? 'Saved!' : 'Update Profile'}
                    </button>
                  </section>

                  {/* Change Password Card */}
                  <section className="bg-bg-secondary border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-accent" />
                      <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Change Password</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <label className={labelBase}>Current Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`${inputBase} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-7 text-text-muted hover:text-text p-1 rounded transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <label className={labelBase}>New Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`${inputBase} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-7 text-text-muted hover:text-text p-1 rounded transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword}
                      className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded-lg transition-all text-sm disabled:opacity-50"
                    >
                      Change Password
                    </button>
                  </section>

                  {/* Danger Zone */}
                  <section className="bg-danger/5 border border-danger/20 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-danger" />
                      <h2 className="text-sm font-semibold text-danger uppercase tracking-wide">Danger Zone</h2>
                    </div>
                    <p className="text-sm text-text-muted">
                      Reset all data including chats, projects, settings, and credentials. A new admin account will be generated.
                    </p>
                    <button
                      onClick={handleReset}
                      disabled={resetting}
                      className="flex items-center gap-2 px-4 py-2 bg-danger/15 hover:bg-danger/25 text-danger rounded-lg transition-all text-sm disabled:opacity-50 border border-danger/20"
                    >
                      {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      {resetting ? 'Resetting...' : 'Reset Everything'}
                    </button>
                  </section>

                  {/* Logout */}
                  <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-xl p-5">
                    <div>
                      <div className="text-sm text-text font-medium">Sign Out</div>
                      <div className="text-xs text-text-muted mt-0.5">Return to the project picker screen</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded-lg transition-all text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save bar */}
            {(activeTab === 'model' || activeTab === 'agent') && (
              <motion.div
                className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {error && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-danger text-sm"
                  >
                    {error}
                  </motion.span>
                )}
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded-lg transition-all text-sm disabled:opacity-50"
                  whileHover={{ scale: !saving ? 1.02 : 1, boxShadow: !saving ? '0 0 20px rgba(88,166,255,0.3)' : 'none' }}
                  whileTap={{ scale: !saving ? 0.98 : 1 }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </motion.div>
  );
}
