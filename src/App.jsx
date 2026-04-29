import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderOpen, FileText, Save, Folder, ChevronRight, ChevronDown, AlertCircle, Info, RefreshCw, Plus, Trash2, Eye, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

const FileTreeItem = ({ item, level = 0, selectedFile, handleSelectFile }) => {
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
          <FileTreeItem 
            key={child.path} 
            item={child} 
            level={level + 1} 
            selectedFile={selectedFile} 
            handleSelectFile={handleSelectFile} 
          />
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      } else {
        setError('フォルダへのアクセス権限が拒否されました。「PCのフォルダを開く」から選び直してください。');
        setSavedHandle(null);
      }
    } catch (err) {
      setError(`フォルダの復元に失敗しました (${err.message})。「PCのフォルダを開く」から選び直してください。`);
      setSavedHandle(null);
    }
  };

  const readDir = async (dirHandle, pathPrefix = '') => {
    const items = [];
    for await (const entry of dirHandle.values()) {
      const currentPath = pathPrefix + '/' + entry.name;
      if (entry.kind === 'file') {
        if (entry.name.endsWith('.txt') || entry.name.endsWith('.md')) {
          items.push({ name: entry.name, kind: 'file', handle: entry, path: currentPath, parentHandle: dirHandle });
        }
      } else if (entry.kind === 'directory') {
        const children = await readDir(entry, currentPath);
        items.push({ name: entry.name, kind: 'directory', handle: entry, children, path: currentPath, parentHandle: dirHandle });
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
      const buffer = await file.arrayBuffer();
      
      let text = '';
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch (e) {
        // Fallback to Shift-JIS if UTF-8 decoding fails
        const sjisDecoder = new TextDecoder('shift_jis');
        text = sjisDecoder.decode(buffer);
      }

      setSelectedFile(fileItem);
      setEditorContent(text);
      setIsDirty(false);
      setLastSaved(null);
      setError(null);
      if (fileItem.name.endsWith('.md')) {
        setIsPreviewMode(true);
      } else {
        setIsPreviewMode(false);
      }
    } catch (err) {
      setError(`ファイルの読み込みに失敗しました: ${err.message}`);
    }
  };

  const handleAddFile = async () => {
    if (!directoryHandle) return;
    
    const fileName = window.prompt("新しいメモのファイル名を入力してください（例: memo.md）", "new_memo.md");
    if (!fileName) return;

    let targetDirHandle = directoryHandle;
    if (activeTabName && activeTabName !== 'メイン') {
      const rootDir = files.find(f => f.kind === 'directory' && f.name === activeTabName);
      if (rootDir) targetDirHandle = rootDir.handle;
    }

    try {
      await targetDirHandle.getFileHandle(fileName, { create: true });
      const tree = await readDir(directoryHandle, directoryHandle.name);
      setFiles(tree);
      
      const findFile = (items) => {
        for (const item of items) {
          if (item.kind === 'file' && item.name === fileName && item.parentHandle === targetDirHandle) return item;
          if (item.kind === 'directory') {
            const found = findFile(item.children);
            if (found) return found;
          }
        }
      };
      const newFileItem = findFile(tree);
      if (newFileItem) {
        handleSelectFile(newFileItem);
      }
    } catch (err) {
      setError(`ファイルの作成に失敗しました: ${err.message}`);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile || !selectedFile.parentHandle) return;
    
    const confirm = window.confirm(`「${selectedFile.name}」を完全に削除してもよろしいですか？`);
    if (!confirm) return;

    try {
      await selectedFile.parentHandle.removeEntry(selectedFile.name);
      const tree = await readDir(directoryHandle, directoryHandle.name);
      setFiles(tree);
      setSelectedFile(null);
      setEditorContent('');
    } catch (err) {
      setError(`ファイルの削除に失敗しました: ${err.message}`);
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

          {directoryHandle && (
            <div className="sidebar-actions-row">
              <button onClick={handleAddFile} className="btn btn-primary" style={{ flex: 1 }}>
                <Plus size={16} />
                新規メモ
              </button>
            </div>
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
            <FileTreeItem 
              key={item.path} 
              item={item} 
              level={0} 
              selectedFile={selectedFile} 
              handleSelectFile={handleSelectFile} 
            />
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
              <div className="editor-actions">
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
                
                <button 
                  onClick={() => setIsPreviewMode(!isPreviewMode)} 
                  className="btn-icon" 
                  title={isPreviewMode ? "編集モード" : "プレビュー"}
                >
                  {isPreviewMode ? <Edit2 size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  onClick={handleDeleteFile} 
                  className="btn-icon btn-icon-danger" 
                  title="メモを削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {isPreviewMode ? (
              <div className="markdown-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editorContent}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                className="editor-textarea"
                value={editorContent}
                onChange={handleEditorChange}
                placeholder="メモを入力..."
                spellCheck="false"
              />
            )}
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
