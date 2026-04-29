import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderOpen, FileText, Save, Folder, ChevronRight, ChevronDown, AlertCircle, Info, RefreshCw } from 'lucide-react';
import './index.css';

// IndexedDB Utility
const DB_NAME = 'WebMemoNoteDB';
const STORE_NAME = 'settings';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setVal(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getVal(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(tx.error);
  });
}

export default function App() {
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [savedHandle, setSavedHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeTabName, setActiveTabName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);

  // Restore directory handle on startup
  useEffect(() => {
    const loadSavedHandle = async () => {
      try {
        const handle = await getVal('directoryHandle');
        if (handle) {
          const status = await handle.queryPermission({ mode: 'readwrite' });
          if (status === 'granted') {
            const tree = await readDir(handle, handle.name);
            setDirectoryHandle(handle);
            setFiles(tree);
          } else {
            setSavedHandle(handle);
          }
        }
      } catch (err) {
        console.log("Failed to load saved handle", err);
      }
    };
    loadSavedHandle();
  }, []);

  const handleResumeFolder = async () => {
    if (!savedHandle) return;
    try {
      const status = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (status === 'granted') {
        const tree = await readDir(savedHandle, savedHandle.name);
        setDirectoryHandle(savedHandle);
        setFiles(tree);
        setSavedHandle(null);
        setError(null);
      }
    } catch (err) {
      setError(`フォルダの再接続に失敗しました: ${err.message}`);
    }
  };

  const readDir = async (dirHandle, pathPrefix = '') => {
    const items = [];
    for await (const entry of dirHandle.values()) {
      const currentPath = pathPrefix + '/' + entry.name;
      if (entry.kind === 'file') {
        if (entry.name.endsWith('.txt') || entry.name.endsWith('.md')) {
          items.push({ name: entry.name, kind: 'file', handle: entry, path: currentPath });
        }
      } else if (entry.kind === 'directory') {
        const children = await readDir(entry, currentPath);
        if (children.length > 0) {
          items.push({ name: entry.name, kind: 'directory', handle: entry, children, path: currentPath });
        }
      }
    }
    return items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const handleOpenFolder = async () => {
    setError(null);
    if (!('showDirectoryPicker' in window)) {
      setError('お使いのブラウザは File System Access API をサポートしていません。PC版の Chrome または Edge でお試しください。');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await setVal('directoryHandle', dirHandle);
      
      const tree = await readDir(dirHandle, dirHandle.name);
      setDirectoryHandle(dirHandle);
      setFiles(tree);
      setSelectedFile(null);
      setEditorContent('');
    } catch (err) {
      if (err.name === 'SecurityError') {
        setError('セキュリティ制限によりフォルダを開けませんでした。');
      } else if (err.name !== 'AbortError') {
        setError(`エラーが発生しました: ${err.message}`);
      }
    }
  };

  const handleSelectFile = async (fileItem) => {
    if (isDirty) {
      const confirmSave = window.confirm("保存されていない変更があります。破棄して別のファイルを開きますか？");
      if (!confirmSave) return;
    }

    try {
      const file = await fileItem.handle.getFile();
      const text = await file.text();
      setSelectedFile(fileItem);
      setEditorContent(text);
      setIsDirty(false);
      setLastSaved(null);
      setError(null);
    } catch (err) {
      setError(`ファイルの読み込みに失敗しました: ${err.message}`);
    }
  };

  const handleEditorChange = (e) => {
    setEditorContent(e.target.value);
    setIsDirty(true);
  };

  const saveFile = useCallback(async (fileItem, content) => {
    if (!fileItem) return;
    try {
      const writable = await fileItem.handle.createWritable();
      await writable.write(content);
      await writable.close();
      setIsDirty(false);
      setLastSaved(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('保存に失敗しました。書き込み権限がない可能性があります。');
    }
  }, []);

  useEffect(() => {
    if (!isDirty || !selectedFile) return;
    const timer = setTimeout(() => {
      saveFile(selectedFile, editorContent);
    }, 1000);
    return () => clearTimeout(timer);
  }, [editorContent, isDirty, selectedFile, saveFile]);

  const tabs = useMemo(() => {
    if (!files.length) return [];
    const rootFiles = files.filter(f => f.kind === 'file');
    const rootDirs = files.filter(f => f.kind === 'directory');
    
    const newTabs = [];
    if (rootFiles.length > 0) {
      newTabs.push({ name: 'メイン', items: rootFiles });
    }
    rootDirs.forEach(dir => {
      newTabs.push({ name: dir.name, items: dir.children || [] });
    });
    return newTabs;
  }, [files]);

  useEffect(() => {
    if (tabs.length > 0) {
      if (!activeTabName || !tabs.find(t => t.name === activeTabName)) {
        setActiveTabName(tabs[0].name);
      }
    } else {
      setActiveTabName(null);
    }
  }, [tabs, activeTabName]);

  const FileTreeItem = ({ item, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (item.kind === 'directory') {
      return (
        <div>
          <div 
            className="file-item"
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="file-item-icon">
              {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              <Folder size={14} className="icon-folder" style={{ marginLeft: '4px' }} />
            </div>
            <span>{item.name}</span>
          </div>
          {isOpen && item.children.map(child => (
            <FileTreeItem key={child.path} item={child} level={level + 1} />
          ))}
        </div>
      );
    }

    const isSelected = selectedFile?.path === item.path;
    return (
      <div 
        className={`file-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 12 + 24}px` }}
        onClick={() => handleSelectFile(item)}
      >
        <div className="file-item-icon">
          <FileText size={14} className="icon-file" />
        </div>
        <span>{item.name}</span>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="header-dot"></div>
          WebMemoNote
        </div>
        
        <div className="sidebar-actions">
          <button onClick={handleOpenFolder} className="btn btn-primary">
            <FolderOpen size={16} />
            PCのフォルダを開く
          </button>
          
          {savedHandle && !directoryHandle && (
            <button onClick={handleResumeFolder} className="btn btn-resume">
              <RefreshCw size={16} />
              前回のフォルダを復元
            </button>
          )}
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTabName(tab.name)}
                className={`tab ${activeTabName === tab.name ? 'active' : ''}`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* File List */}
        <div className="file-list">
          {files.length === 0 && !directoryHandle && (
            <div className="empty-state">
              <FolderOpen size={32} className="empty-state-icon" />
              メモが保存されている<br/>フォルダを選択してください
            </div>
          )}
          {tabs.length === 0 && directoryHandle && (
            <div className="empty-state">
              メモが見つかりません
            </div>
          )}
          
          {tabs.find(t => t.name === activeTabName)?.items.map(item => (
            <FileTreeItem key={item.path} item={item} level={0} />
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="main-area">
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} color="#EF4444" />
            <div className="error-text">{error}</div>
          </div>
        )}

        {selectedFile ? (
          <>
            <div className="editor-header">
              <div className="editor-path">
                <FileText size={16} color="#9CA3AF" />
                {selectedFile.path.split('/').join(' / ')}
              </div>
              <div className="editor-status">
                {isDirty ? (
                  <span className="status-dirty">
                    <div className="pulse-dot" style={{ display: 'inline-block', marginRight: '6px' }}></div>
                    未保存...
                  </span>
                ) : lastSaved ? (
                  <span className="status-saved">
                    <Save size={14} style={{ marginRight: '4px' }} />
                    {lastSaved.toLocaleTimeString()} に自動保存済
                  </span>
                ) : null}
              </div>
            </div>
            
            <textarea
              className="editor-textarea"
              value={editorContent}
              onChange={handleEditorChange}
              placeholder="メモを入力..."
              spellCheck="false"
            />
          </>
        ) : (
          <div className="welcome-screen">
            {!directoryHandle ? (
              <div className="welcome-card">
                <Info size={48} color="#4F46E5" style={{ marginBottom: '16px' }} />
                <h2 className="welcome-title">ローカルファイル直接編集モード</h2>
                <p className="welcome-desc">
                  「PCのフォルダを開く」ボタンから、普段メモを保存しているフォルダを選択してください。<br/>
                  テキストファイル（.txt, .md）を直接読み込み、編集・自動保存が可能です。
                </p>
                {savedHandle && (
                  <button onClick={handleResumeFolder} className="btn-large">
                    <RefreshCw size={18} />
                    前回のフォルダ「{savedHandle.name}」を復元
                  </button>
                )}
              </div>
            ) : (
              <div style={{ color: '#9CA3AF' }}>左のツリーからファイルを選択してください</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
