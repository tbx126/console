import { useState, useEffect } from 'react';
import {
  History, Archive, Download, Upload, RotateCcw, Trash2, Plus,
  ChevronDown, ChevronRight, AlertTriangle, HardDrive, FolderClock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import toast from 'react-hot-toast';
import dataApi from '../../services/dataApi';

const MODULE_LABELS = {
  finance: '财务',
  travel: '旅行',
  portfolio: '投资',
  gaming: '游戏',
  config: '配置',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Module Snapshot Group ──

const ModuleSnapshotGroup = ({ summary, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getModuleSnapshots(summary.module);
      setSnapshots(data);
    } catch {
      toast.error('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && snapshots.length === 0) loadSnapshots();
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`Restore ${summary.module} from this snapshot? Current data will be backed up first.`)) return;
    try {
      await dataApi.restoreSnapshot(filename);
      toast.success(`${MODULE_LABELS[summary.module] || summary.module} restored`);
      onRefresh();
    } catch {
      toast.error('Restore failed');
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm('Delete this snapshot?')) return;
    try {
      await dataApi.deleteSnapshot(filename);
      toast.success('Snapshot deleted');
      loadSnapshots();
      onRefresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FolderClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {MODULE_LABELS[summary.module] || summary.module}
          </span>
          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
            {summary.count} snapshots · {formatBytes(summary.total_size_bytes)}
          </span>
        </div>
        {summary.latest_timestamp && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-2">
            Latest: {formatTime(summary.latest_timestamp)}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="bg-white dark:bg-zinc-900 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Loading...</div>
          ) : snapshots.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-400">No snapshots</div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.filename}
                className="flex items-center gap-3 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span className="flex-1 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                  {formatDate(snap.timestamp)}
                </span>
                <span className="text-xs text-zinc-400">
                  {formatBytes(snap.size_bytes)}
                </span>
                <button
                  onClick={() => handleRestore(snap.filename)}
                  className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(snap.filename)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Archive Row ──

const ArchiveRow = ({ archive, onRefresh }) => {
  const handleRestore = async () => {
    if (!window.confirm('Restore ALL data from this archive? Current data will be backed up first.')) return;
    try {
      const result = await dataApi.restoreArchive(archive.id);
      toast.success(result.message);
      onRefresh();
    } catch {
      toast.error('Restore failed');
    }
  };

  const handleDownload = async () => {
    try {
      const response = await dataApi.downloadArchive(archive.id);
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive_${archive.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this archive?')) return;
    try {
      await dataApi.deleteArchive(archive.id);
      toast.success('Archive deleted');
      onRefresh();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
        <Archive className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {formatDate(archive.created_at)}
          </span>
          <span className="text-xs text-zinc-400">
            {formatBytes(archive.total_size_bytes)}
          </span>
        </div>
        {archive.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {archive.description}
          </p>
        )}
        <div className="flex gap-1 mt-1">
          {archive.modules.map((mod) => (
            <Badge key={mod} variant="default" className="text-[10px] px-1.5 py-0">
              {MODULE_LABELS[mod] || mod}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleRestore}
          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Restore"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ──

const DataManagementTab = () => {
  const [overview, setOverview] = useState(null);
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [archiveDesc, setArchiveDesc] = useState('');

  const loadData = async () => {
    try {
      const [ov, ar] = await Promise.all([
        dataApi.getSnapshotOverview(),
        dataApi.listArchives(),
      ]);
      setOverview(ov);
      setArchives(ar);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateArchive = async () => {
    setCreating(true);
    try {
      await dataApi.createArchive(archiveDesc);
      toast.success('Archive created');
      setArchiveDesc('');
      loadData();
    } catch {
      toast.error('Failed to create archive');
    } finally {
      setCreating(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await dataApi.importArchive(file);
        toast.success('Archive imported');
        loadData();
      } catch {
        toast.error('Import failed: invalid file');
      }
    };
    input.click();
  };

  const handleCleanOrphans = async () => {
    if (!window.confirm('Delete all orphan backups from removed modules?')) return;
    try {
      const result = await dataApi.deleteOrphanSnapshots();
      toast.success(`Deleted ${result.deleted_count} orphan backups`);
      loadData();
    } catch {
      toast.error('Cleanup failed');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      {overview && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <History className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {overview.total_backups} snapshots
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
            <Archive className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-violet-700 dark:text-violet-300">
              {archives.length} archives
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <HardDrive className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatBytes(overview.total_size_bytes + archives.reduce((a, b) => a + b.total_size_bytes, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Auto Snapshots Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          <History className="h-4 w-4" />
          Auto Snapshots
        </h3>
        <div className="space-y-2">
          {overview?.modules.map((mod) => (
            <ModuleSnapshotGroup key={mod.module} summary={mod} onRefresh={loadData} />
          ))}
        </div>

        {/* Orphan Warning */}
        {overview?.orphan_modules.length > 0 && (
          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {overview.orphan_modules.reduce((a, b) => a + b.count, 0)} orphan backups from removed modules:
                {' '}{overview.orphan_modules.map(m => m.module).join(', ')}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCleanOrphans}>
              Clean up
            </Button>
          </div>
        )}
      </div>

      {/* Manual Archives Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          <Archive className="h-4 w-4" />
          Manual Archives
        </h3>

        {/* Create Archive */}
        <div className="flex gap-2 mb-4">
          <Input
            value={archiveDesc}
            onChange={(e) => setArchiveDesc(e.target.value)}
            placeholder="Archive description (optional)"
            className="flex-1"
          />
          <Button onClick={handleCreateArchive} isLoading={creating} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
        </div>

        {/* Archive List */}
        <div className="space-y-2">
          {archives.length === 0 ? (
            <p className="text-center py-6 text-sm text-zinc-400">
              No archives yet. Create one to save a full snapshot of all your data.
            </p>
          ) : (
            archives.map((archive) => (
              <ArchiveRow key={archive.id} archive={archive} onRefresh={loadData} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagementTab;
