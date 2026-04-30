import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FolderOpen, FileText, Save, Folder, ChevronRight, ChevronDown, AlertCircle, Info, RefreshCw, Plus, Trash2, Eye, Edit2, Settings, Star, Search, Columns, Moon, Sun, Monitor, Image as ImageIcon } from 'lucide-react';
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

const FileTreeItem = ({ item, level = 0, selectedFile, handleSelectFile, draggedItem, setDraggedItem, handleDropOnItem, starredFiles, toggleStar }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isOver, setIsOver] = useState(false);

  if (item.kind === 'directory') {
    return (
      <div>
        <div 
          className={`file-item ${isOver ? 'drag-over' : ''}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOver(true);
          }}
          onDragLeave={(e) => {
            setIsOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOver(false);
            if (draggedItem && draggedItem.path !== item.path) {
              handleDropOnItem(draggedItem, item);
            }
            setDraggedItem(null);
          }}
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
            draggedItem={draggedItem}
            setDraggedItem={setDraggedItem}
            handleDropOnItem={handleDropOnItem}
            starredFiles={starredFiles}
            toggleStar={toggleStar}
          />
        ))}
      </div>
    );
  }

  const isSelected = selectedFile?.path === item.path;
  const isStarred = starredFiles && starredFiles.includes(item.path);

  return (
    <div 
      className={`file-item ${isSelected ? 'selected' : ''} ${isOver ? 'drag-over' : ''}`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => handleSelectFile(item)}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setDraggedItem(item);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(e) => {
        setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (draggedItem && draggedItem.path !== item.path) {
          handleDropOnItem(draggedItem, item);
        }
        setDraggedItem(null);
      }}
    >
      <div className="file-item-icon">
        <FileText size={14} className="icon-file" />
      </div>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
      {isStarred && <Star size={12} className="star-icon active" style={{ marginLeft: 'auto' }} />}
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
  const [viewMode, setViewMode] = useState('edit'); // 'edit', 'preview', 'split'
  const [tabNames, setTabNames] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [starredFiles, setStarredFiles] = useState([]);
  
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleEditorScroll = (e) => {
    if (viewMode !== 'split' || !previewRef.current) return;
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    isSyncingRight.current = true;
    
    const textarea = e.target;
    const maxScrollTop = textarea.scrollHeight - textarea.clientHeight;
    if (maxScrollTop <= 0) return;
    
    const scrollPercentage = textarea.scrollTop / maxScrollTop;
    const preview = previewRef.current;
    preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  };

  const handlePreviewScroll = (e) => {
    if (viewMode !== 'split' || !textareaRef.current) return;
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    isSyncingLeft.current = true;
    
    const preview = e.target;
    const maxScrollTop = preview.scrollHeight - preview.clientHeight;
    if (maxScrollTop <= 0) return;
    
    const scrollPercentage = preview.scrollTop / maxScrollTop;
    const textarea = textareaRef.current;
    textarea.scrollTop = scrollPercentage * (textarea.scrollHeight - textarea.clientHeight);
  };

  // Settings State
  const [editorSettings, setEditorSettings] = useState({
    fontFamily: 'inherit',
    fontSize: '1rem',
    letterSpacing: 'normal',
    fontColor: 'var(--text-main)',
    tabSize: '2', // '2', '4', 'tab'
    theme: 'system' // 'light', 'dark', 'system'
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(editorSettings);

  // Modal states
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('.md');

  const loadDirectoryData = async (dirHandle) => {
    const tree = await readDir(dirHandle, dirHandle.name, 1);
    
    // Load tabs explicitly
    let savedTabs = await getVal(`tabs_${dirHandle.name}`);
    if (!savedTabs) {
      // First time loading this directory: make all root folders tabs by default
      savedTabs = tree.filter(f => f.kind === 'directory').map(d => d.name);
      await setVal(`tabs_${dirHandle.name}`, savedTabs);
    }
    
    setTabNames(savedTabs);
    setDirectoryHandle(dirHandle);
    setFiles(tree);
  };

  // Restore directory handle on startup and load settings
  useEffect(() => {
    const loadInitData = async () => {
      try {
        const savedSettings = await getVal('editorSettings');
        if (savedSettings) {
          setEditorSettings(savedSettings);
        }
      } catch (e) { console.log(e); }

      try {
        const savedStars = await getVal('starredFiles');
        if (savedStars) setStarredFiles(savedStars);
      } catch (e) { console.log(e); }

      try {
        const handle = await getVal('directoryHandle');
        if (handle) {
          const status = await handle.queryPermission({ mode: 'readwrite' });
          if (status === 'granted') {
            await loadDirectoryData(handle);
          } else {
            setSavedHandle(handle);
          }
        }
      } catch (err) {
        console.log("Failed to load saved handle", err);
      }
    };
    loadInitData();
  }, []);

  // Theme apply
  useEffect(() => {
    if (editorSettings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (editorSettings.theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    }
  }, [editorSettings.theme]);

  const toggleStar = async (filePath) => {
    const newStars = starredFiles.includes(filePath) 
      ? starredFiles.filter(p => p !== filePath)
      : [...starredFiles, filePath];
    setStarredFiles(newStars);
    await setVal('starredFiles', newStars);
  };

  const flattenedFiles = useMemo(() => {
    const flat = [];
    const recurse = (items) => {
      items.forEach(item => {
        if (item.kind === 'file') flat.push(item);
        if (item.children) recurse(item.children);
      });
    };
    recurse(files);
    return flat;
  }, [files]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return flattenedFiles.filter(f => f.name.toLowerCase().includes(lowerQuery));
  }, [searchQuery, flattenedFiles]);

  const handleResumeFolder = async () => {
    if (!savedHandle) return;
    try {
      const status = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (status === 'granted') {
        await loadDirectoryData(savedHandle);
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

  const readDir = async (dirHandle, pathPrefix = '', currentDepth = 1) => {
    if (currentDepth > 5) return []; // Max 5 levels depth

    const items = [];
    for await (const entry of dirHandle.values()) {
      const currentPath = pathPrefix + '/' + entry.name;
      if (entry.kind === 'file') {
        if (entry.name.endsWith('.txt') || entry.name.endsWith('.md')) {
          items.push({ name: entry.name, kind: 'file', handle: entry, path: currentPath, parentHandle: dirHandle });
        }
      } else if (entry.kind === 'directory') {
        const children = await readDir(entry, currentPath, currentDepth + 1);
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
      
      await loadDirectoryData(dirHandle);
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
        setViewMode('split');
      } else {
        setViewMode('edit');
      }
    } catch (err) {
      setError(`ファイルの読み込みに失敗しました: ${err.message}`);
    }
  };

  const handleOpenNewFileModal = () => {
    setNewFileName('');
    setNewFileType('.md');
    setIsNewFileModalOpen(true);
  };

  const handleCloseNewFileModal = () => {
    setIsNewFileModalOpen(false);
  };

  const confirmAddFile = async () => {
    if (!directoryHandle || !newFileName.trim()) return;
    
    const fileName = `${newFileName.trim()}${newFileType}`;
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
      setIsNewFileModalOpen(false);
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
    
    const newTabs = [];
    const rootDirs = files.filter(f => f.kind === 'directory');
    
    // Favorites Tab
    if (starredFiles.length > 0) {
      const favItems = flattenedFiles.filter(f => starredFiles.includes(f.path));
      if (favItems.length > 0) {
        newTabs.push({ name: '★ お気に入り', items: favItems, isSpecial: true });
      }
    }

    // Main tab contains root files and non-tab root directories
    const mainItems = files.filter(f => 
      f.kind === 'file' || (f.kind === 'directory' && !tabNames.includes(f.name))
    );
    
    if (mainItems.length > 0 || tabNames.length === 0) {
      newTabs.push({ name: 'メイン', items: mainItems });
    }
    
    // Explicit tabs
    tabNames.forEach(tabName => {
      const dir = rootDirs.find(d => d.name === tabName);
      if (dir) {
        newTabs.push({ name: dir.name, items: dir.children || [] });
      }
    });
    
    return newTabs;
  }, [files, tabNames, starredFiles, flattenedFiles]);

  useEffect(() => {
    if (tabs.length > 0) {
      if (!activeTabName || !tabs.find(t => t.name === activeTabName)) {
        setActiveTabName(tabs[0].name);
      }
    } else {
      setActiveTabName(null);
    }
  }, [tabs, activeTabName]);

  const [draggedItem, setDraggedItem] = useState(null);

  const handleDropOnItem = async (sourceItem, targetItem) => {
    if (!sourceItem || !targetItem) return;
    if (sourceItem.path === targetItem.path) return;
    if (sourceItem.kind !== 'file') return; // Only files can be dragged for now
    
    try {
      if (targetItem.kind === 'directory') {
        // Move sourceItem INTO targetItem
        const targetDirHandle = targetItem.handle;
        
        // Copy source
        const sourceFile = await sourceItem.handle.getFile();
        const sourceBuffer = await sourceFile.arrayBuffer();
        
        const newSourceHandle = await targetDirHandle.getFileHandle(sourceItem.name, { create: true });
        const sourceWritable = await newSourceHandle.createWritable();
        await sourceWritable.write(sourceBuffer);
        await sourceWritable.close();

        // Delete original
        await sourceItem.parentHandle.removeEntry(sourceItem.name);

      } else if (targetItem.kind === 'file' && sourceItem.kind === 'file') {
        // Group files into a new folder
        const folderName = window.prompt("自動フォルダ化\n新しいフォルダの名前を入力してください:", "新しいフォルダ");
        if (!folderName) return;

        const newDirHandle = await targetItem.parentHandle.getDirectoryHandle(folderName, { create: true });
        
        // Copy target
        const targetFile = await targetItem.handle.getFile();
        const targetBuffer = await targetFile.arrayBuffer();
        const newTargetHandle = await newDirHandle.getFileHandle(targetItem.name, { create: true });
        const targetWritable = await newTargetHandle.createWritable();
        await targetWritable.write(targetBuffer);
        await targetWritable.close();

        // Copy source
        const sourceFile = await sourceItem.handle.getFile();
        const sourceBuffer = await sourceFile.arrayBuffer();
        let sourceName = sourceItem.name;
        if (sourceName === targetItem.name) sourceName = "copy_" + sourceName;
        
        const newSourceHandle = await newDirHandle.getFileHandle(sourceName, { create: true });
        const sourceWritable = await newSourceHandle.createWritable();
        await sourceWritable.write(sourceBuffer);
        await sourceWritable.close();

        // Delete originals
        await targetItem.parentHandle.removeEntry(targetItem.name);
        await sourceItem.parentHandle.removeEntry(sourceItem.name);
      }

      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      setFiles(tree);

      if (selectedFile && (selectedFile.path === sourceItem.path || selectedFile.path === targetItem.path)) {
        setSelectedFile(null);
        setEditorContent('');
      }

    } catch (err) {
      setError(`移動・フォルダ化に失敗しました: ${err.message}`);
    }
  };

  const handleEditorDrop = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    const items = e.dataTransfer.items;
    let imageFile = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') === 0) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (imageFile) {
      try {
        const rootHandle = selectedFile.parentHandle;
        const imagesDir = await rootHandle.getDirectoryHandle('.images', { create: true });
        const imgName = `${Date.now()}_${imageFile.name}`;
        const newImgHandle = await imagesDir.getFileHandle(imgName, { create: true });
        const writable = await newImgHandle.createWritable();
        await writable.write(imageFile);
        await writable.close();

        const imgPath = `./.images/${imgName}`;
        const mdImage = `\n![${imageFile.name}](${imgPath})\n`;
        
        const target = e.target;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newText = editorContent.substring(0, start) + mdImage + editorContent.substring(end);
        
        setEditorContent(newText);
        setIsDirty(true);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + mdImage.length;
          }
        }, 0);
      } catch (err) {
        setError(`画像の保存に失敗しました: ${err.message}`);
      }
    }
  };

  const handleAddTab = async () => {
    if (!directoryHandle) return;
    const tabName = window.prompt("新しいタブ（フォルダ）の名前を入力してください:");
    if (!tabName) return;

    try {
      await directoryHandle.getDirectoryHandle(tabName, { create: true });
      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      
      const newTabs = [...tabNames, tabName];
      await setVal(`tabs_${directoryHandle.name}`, newTabs);
      setTabNames(newTabs);
      
      setFiles(tree);
      setActiveTabName(tabName);
    } catch (err) {
      setError(`タブの作成に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* New File Modal */}
      {isNewFileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">新規メモの作成</h3>
            <div className="modal-input-group">
              <input 
                type="text" 
                className="modal-input" 
                placeholder="ファイル名（拡張子なし）" 
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                autoFocus
              />
              <select 
                className="modal-input" 
                value={newFileType} 
                onChange={e => setNewFileType(e.target.value)}
              >
                <option value=".md">Markdown (.md)</option>
                <option value=".txt">Text (.txt)</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleCloseNewFileModal}>キャンセル</button>
              <button className="btn-primary-solid" onClick={confirmAddFile}>作成</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">エディタ設定</h3>
            <div className="modal-input-group">
              <div>
                <label className="modal-label">フォントファミリー</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.fontFamily} 
                  onChange={e => setTempSettings({...tempSettings, fontFamily: e.target.value})}
                >
                  <option value="inherit">デフォルト (System)</option>
                  <option value="sans-serif">ゴシック体 (Sans-Serif)</option>
                  <option value="serif">明朝体 (Serif)</option>
                  <option value="monospace">等幅 (Monospace)</option>
                </select>
              </div>
              
              <div>
                <label className="modal-label">フォントサイズ</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.fontSize} 
                  onChange={e => setTempSettings({...tempSettings, fontSize: e.target.value})}
                >
                  <option value="0.875rem">小 (14px)</option>
                  <option value="1rem">標準 (16px)</option>
                  <option value="1.125rem">大 (18px)</option>
                  <option value="1.25rem">特大 (20px)</option>
                </select>
              </div>

              <div>
                <label className="modal-label">文字間隔 (Letter Spacing)</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.letterSpacing} 
                  onChange={e => setTempSettings({...tempSettings, letterSpacing: e.target.value})}
                >
                  <option value="normal">標準</option>
                  <option value="0.5px">少し広い (0.5px)</option>
                  <option value="1px">広い (1px)</option>
                  <option value="2px">とても広い (2px)</option>
                </select>
              </div>

              <div>
                <label className="modal-label">フォント色</label>
                <input 
                  type="color" 
                  className="modal-input" 
                  style={{ padding: '4px', height: '40px', cursor: 'pointer' }}
                  value={tempSettings.fontColor} 
                  onChange={e => setTempSettings({...tempSettings, fontColor: e.target.value})}
                />
              </div>

              <div>
                <label className="modal-label">テーマ</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.theme} 
                  onChange={e => setTempSettings({...tempSettings, theme: e.target.value})}
                >
                  <option value="system">OSのシステム設定に合わせる</option>
                  <option value="light">ライトモード</option>
                  <option value="dark">ダークモード</option>
                </select>
              </div>

              <div>
                <label className="modal-label">Tabキーの挙動</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.tabSize} 
                  onChange={e => setTempSettings({...tempSettings, tabSize: e.target.value})}
                >
                  <option value="2">スペース2つ</option>
                  <option value="4">スペース4つ</option>
                  <option value="tab">Tab文字 (\t)</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsSettingsModalOpen(false)}>キャンセル</button>
              <button className="btn-primary-solid" onClick={async () => {
                setEditorSettings(tempSettings);
                await setVal('editorSettings', tempSettings);
                setIsSettingsModalOpen(false);
              }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="header-dot"></div>
          WebMemoNote
        </div>
        
        {directoryHandle && (
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="ファイル名で検索..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

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
              <button onClick={handleOpenNewFileModal} className="btn btn-primary" style={{ flex: 1 }}>
                <Plus size={16} />
                新規メモ
              </button>
              <button onClick={() => {
                setTempSettings(editorSettings);
                setIsSettingsModalOpen(true);
              }} className="btn-icon" title="エディタ設定">
                <Settings size={16} />
              </button>
            </div>
          )}
        </div>

        {/* File List */}
        <div className="file-list">
          {files.length === 0 && !directoryHandle && (
            <div className="empty-state">
              <FolderOpen size={32} className="empty-state-icon" />
              メモが保存されている<br/>フォルダを選択してください
            </div>
          )}
          {tabs.length === 0 && directoryHandle && !searchQuery && (
            <div className="empty-state">
              メモが見つかりません
            </div>
          )}
          
          {searchQuery ? (
            searchResults.length > 0 ? searchResults.map(item => (
              <FileTreeItem 
                key={item.path} 
                item={item} 
                level={0} 
                selectedFile={selectedFile} 
                handleSelectFile={handleSelectFile} 
                draggedItem={draggedItem}
                setDraggedItem={setDraggedItem}
                handleDropOnItem={handleDropOnItem}
                starredFiles={starredFiles}
                toggleStar={toggleStar}
              />
            )) : (
              <div className="empty-state">一致するファイルがありません</div>
            )
          ) : (
            tabs.find(t => t.name === activeTabName)?.items.map(item => (
              <FileTreeItem 
                key={item.path} 
                item={item} 
                level={0} 
                selectedFile={selectedFile} 
                handleSelectFile={handleSelectFile} 
                draggedItem={draggedItem}
                setDraggedItem={setDraggedItem}
                handleDropOnItem={handleDropOnItem}
                starredFiles={starredFiles}
                toggleStar={toggleStar}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="main-area">
        {/* Tabs moved to main area top */}
        {tabs.length > 0 && !searchQuery && (
          <div className="tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTabName(tab.name)}
                className={`tab ${activeTabName === tab.name ? 'active' : ''}`}
                style={tab.isSpecial ? { color: '#FBBF24', fontWeight: 'bold' } : {}}
              >
                {tab.name}
              </button>
            ))}
            <button onClick={handleAddTab} className="btn-add-tab" title="新しいタブ（フォルダ）を追加">
              <Plus size={18} />
            </button>
          </div>
        )}

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
                <button 
                  onClick={() => toggleStar(selectedFile.path)}
                  style={{ background: 'none', border: 'none', padding: 0, display: 'flex', marginLeft: '4px' }}
                >
                  <Star size={16} className={`star-icon ${starredFiles.includes(selectedFile.path) ? 'active' : ''}`} />
                </button>
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
                
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid var(--border-color)', paddingRight: '12px', marginRight: '4px' }}>
                  <button 
                    onClick={() => setViewMode('edit')} 
                    className={`btn-icon ${viewMode === 'edit' ? 'active' : ''}`} 
                    title="編集モード"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode('preview')} 
                    className={`btn-icon ${viewMode === 'preview' ? 'active' : ''}`} 
                    title="プレビューモード"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode('split')} 
                    className={`btn-icon ${viewMode === 'split' ? 'active' : ''}`} 
                    title="2ペイン表示"
                  >
                    <Columns size={16} />
                  </button>
                </div>

                <button 
                  onClick={handleDeleteFile} 
                  className="btn-icon btn-icon-danger" 
                  title="メモを削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className={`editor-content-wrapper ${viewMode === 'split' ? 'split' : ''}`}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <textarea
                  ref={textareaRef}
                  className="editor-textarea"
                  style={{
                    fontFamily: editorSettings.fontFamily,
                    fontSize: editorSettings.fontSize,
                    letterSpacing: editorSettings.letterSpacing,
                    color: editorSettings.fontColor
                  }}
                  value={editorContent}
                  onChange={handleEditorChange}
                  onScroll={handleEditorScroll}
                  onDrop={handleEditorDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const target = e.target;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      const tabStr = editorSettings.tabSize === 'tab' ? '\t' : ' '.repeat(parseInt(editorSettings.tabSize, 10));
                      
                      const newText = editorContent.substring(0, start) + tabStr + editorContent.substring(end);
                      setEditorContent(newText);
                      setIsDirty(true);
                      
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tabStr.length;
                        }
                      }, 0);
                    }
                  }}
                  placeholder="メモを入力... (画像をドラッグ＆ドロップで添付できます)"
                  spellCheck="false"
                />
              )}
              
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div 
                  ref={previewRef}
                  onScroll={handlePreviewScroll}
                  className="markdown-preview" 
                  style={{
                    fontFamily: editorSettings.fontFamily,
                    fontSize: editorSettings.fontSize,
                    letterSpacing: editorSettings.letterSpacing,
                    color: editorSettings.fontColor
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editorContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
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
