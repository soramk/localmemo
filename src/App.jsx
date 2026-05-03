import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FolderOpen, FileText, Save, Folder, ChevronRight, ChevronDown, AlertCircle, Info, RefreshCw, Plus, Trash2, Eye, Edit2, Settings, Star, Search, Columns, Moon, Sun, Monitor, Image as ImageIcon, FolderPlus, FilePlus, Edit3, ShieldCheck, Lock, ExternalLink, Globe, ArrowUp, Move, Download, FileCode, Clock, Calendar, Link, Table, CheckSquare, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

// IndexedDB Utility
const DB_NAME = 'WebMemoNoteDB';
const STORE_NAME = 'settings';

const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.csv', '.tsv', '.log',
  '.json', '.yml', '.yaml', '.xml', '.toml', '.ini', '.env',
  '.html', '.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.rb', '.php', '.sh', '.bat', '.ps1',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.pdf',
  '.mp4', '.webm', '.mp3', '.wav'
];
const ALLOWED_EXACT_NAMES = ['.gitignore', '.env', '.prettierrc', '.eslintrc'];
const DEFAULT_SETTINGS = {
  fontFamily: 'inherit',
  fontSize: '16',
  letterSpacing: '0',
  lineHeight: '1.8',
  editorPadding: '32',
  maxWidth: '900',
  fontColor: 'var(--text-main)',
  tabSize: 'tab',
  theme: 'system',
  wordWrap: true,
  dynamicSuggestions: true,
  language: 'ja'
};

const TRANSLATIONS = {
  ja: {
    settingsTitle: "エディタ設定",
    fontFamily: "基本フォント",
    fontSize: "サイズ",
    letterSpacing: "文字間",
    lineHeight: "行間",
    padding: "余白",
    maxWidth: "最大幅",
    fontColor: "フォント色",
    theme: "テーマ",
    tabKey: "Tabキー",
    wordWrap: "単語の折り返し",
    dynamicSuggestions: "入力補完（自動提案）",
    language: "言語",
    save: "保存",
    cancel: "キャンセル",
    reset: "リセット",
    system: "システム設定",
    light: "ライト",
    dark: "ダーク",
    tabChar: "Tab文字 (\\t)",
    space2: "スペース2つ",
    space4: "スペース4つ",
    secureLocal: "ローカル専用",
    privacyHelp: "セキュリティとプライバシーについて",
    newMemo: "新規メモ",
    newFolder: "新規フォルダ",
    rename: "名前を変更",
    delete: "削除",
    moveUp: "一階層上に移動",
    moveToFolder: "指定フォルダへ移動",
    moveToTab: "指定タブへ移動",
    searchPlaceholder: "ファイル名で検索...",
    starred: "★ お気に入り",
    allFiles: "すべてのファイル",
    mainTab: "メイン",
    welcomeTitle: "ローカルファイル直接編集モード",
    welcomeDesc: "「PCのフォルダを開く」ボタンから、普段メモを保存しているフォルダを選択してください。テキストファイル（.txt, .md）を直接読み込み、編集・自動保存が可能です。",
    welcomeSecure1: "データはあなたのPC内のみで完結",
    welcomeSecure2: "外部サーバーへの送信なし",
    welcomePrivacyLink: "なぜ安全なのですか？",
    resumeFolder: "前回のフォルダを復元",
    openFolderBtn: "PCのフォルダを開く",
    emptyStateFolder: "メモが保存されている\nフォルダを選択してください",
    emptyStateNoFiles: "メモが見つかりません",
    emptyStateNoSearch: "一致するファイルがありません",
    loadingImage: "画像を読み込み中...",
    default: "デフォルト",
    initialValue: "初期値",
    moveTitle: "の移動先を選択",
    moveTabTitle: "をタブへ移動",
    confirmDelete: "このファイルを削除してもよろしいですか？",
    autoFolderPrompt: "自動フォルダ化\\n新しいフォルダの名前を入力してください:",
    newFolderDefault: "新しいフォルダ",
    downloadSection: "ポータビリティ",
    downloadStandalone: "ポータブルHTML版を書き出し",
    downloadStandaloneDesc: "アプリ全体を1枚のHTMLとして保存します。USBメモリでの持ち運びや、オフライン環境での利用に適しています。"
  },
  en: {
    settingsTitle: "Editor Settings",
    fontFamily: "Base Font",
    fontSize: "Size",
    letterSpacing: "Letter Spacing",
    lineHeight: "Line Height",
    padding: "Padding",
    maxWidth: "Max Width",
    fontColor: "Font Color",
    theme: "Theme",
    tabKey: "Tab Key",
    wordWrap: "Word Wrap",
    dynamicSuggestions: "Dynamic Suggestions",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    reset: "Reset",
    system: "System Default",
    light: "Light",
    dark: "Dark",
    tabChar: "Tab Character (\\t)",
    space2: "2 Spaces",
    space4: "4 Spaces",
    secureLocal: "Secure Local",
    privacyHelp: "About Security & Privacy",
    newMemo: "New Memo",
    newFolder: "New Folder",
    rename: "Rename",
    delete: "Delete",
    moveUp: "Move Up One Level",
    moveToFolder: "Move to Folder",
    moveToTab: "Move to Tab",
    searchPlaceholder: "Search files...",
    starred: "★ Favorites",
    allFiles: "All Files",
    mainTab: "Main",
    welcomeTitle: "Local File Editing Mode",
    welcomeDesc: "Open a folder from your PC to edit and auto-save text files (.txt, .md) directly.",
    welcomeSecure1: "Data stays on your PC",
    welcomeSecure2: "No transmission to servers",
    welcomePrivacyLink: "Why is it secure?",
    resumeFolder: "Resume last folder",
    openFolderBtn: "Open PC Folder",
    emptyStateFolder: "Please select a folder\nto save your memos",
    emptyStateNoFiles: "No memos found",
    emptyStateNoSearch: "No matching files",
    loadingImage: "Loading image...",
    default: "Default",
    initialValue: "Default",
    moveTitle: " - Select destination",
    moveTabTitle: " - Move to tab",
    confirmDelete: "Are you sure you want to delete this file?",
    autoFolderPrompt: "Auto Folder\\nEnter folder name:",
    newFolderDefault: "New Folder",
    downloadSection: "Portability",
    downloadStandalone: "Export Portable HTML",
    downloadStandaloneDesc: "Saves the entire app as a single HTML file. Ideal for offline use or USB drives."
  },
  es: {
    settingsTitle: "Ajustes del Editor",
    fontFamily: "Fuente Base",
    fontSize: "Tamaño",
    letterSpacing: "Espaciado",
    lineHeight: "Interlineado",
    padding: "Margen",
    maxWidth: "Ancho Máximo",
    fontColor: "Color de Fuente",
    theme: "Tema",
    tabKey: "Tecla Tab",
    wordWrap: "Ajuste de línea",
    dynamicSuggestions: "Sugerencias dinámicas",
    language: "Idioma",
    save: "Guardar",
    cancel: "Cancelar",
    reset: "Restablecer",
    system: "Sistema",
    light: "Claro",
    dark: "Oscuro",
    tabChar: "Carácter Tab (\\t)",
    space2: "2 Espacios",
    space4: "4 Espacios",
    secureLocal: "Local Seguro",
    privacyHelp: "Sobre Seguridad y Privacidad",
    newMemo: "Nueva Nota",
    newFolder: "Nueva Carpeta",
    rename: "Renombrar",
    delete: "Eliminar",
    moveUp: "Subir un nivel",
    moveToFolder: "Mover a carpeta",
    moveToTab: "Mover a pestaña",
    searchPlaceholder: "Buscar archivos...",
    starred: "★ Favoritos",
    allFiles: "Todos los archivos",
    mainTab: "Principal",
    welcomeTitle: "Modo de Edición Local",
    welcomeDesc: "Abre una carpeta de tu PC para editar y guardar archivos (.txt, .md) directamente.",
    welcomeSecure1: "Los datos se quedan en tu PC",
    welcomeSecure2: "Sin envío a servidores externos",
    welcomePrivacyLink: "¿Por qué es seguro?",
    resumeFolder: "Reanudar última carpeta",
    openFolderBtn: "Abrir carpeta local",
    emptyStateFolder: "Selecciona una carpeta\npara tus notas",
    emptyStateNoFiles: "No se encontraron notas",
    emptyStateNoSearch: "Sin resultados",
    loadingImage: "Cargando imagen...",
    default: "Por defecto",
    initialValue: "Inicial",
    moveTitle: " - Seleccionar destino",
    moveTabTitle: " - Mover a pestaña",
    confirmDelete: "¿Estás seguro de eliminar este archivo?",
    autoFolderPrompt: "Carpeta automática\\nNombre de la carpeta:",
    newFolderDefault: "Nueva Carpeta",
    downloadSection: "Portabilidad",
    downloadStandalone: "Exportar HTML Portátil",
    downloadStandaloneDesc: "Guarda toda la aplicación como un solo archivo HTML. Ideal para uso sin conexión o unidades USB."
  }
};



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

// Helper to get caret coordinates in a textarea
function getCaretCoordinates(element, position) {
  const style = window.getComputedStyle(element);
  
  const div = document.createElement('div');
  div.style.position = 'fixed'; // viewport基準で固定
  div.style.left = '-9999px';  // 画面の外に飛ばす
  div.style.top = '-9999px';
  div.style.visibility = 'hidden';
  div.style.pointerEvents = 'none';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.width = style.width;
  div.style.fontFamily = style.fontFamily;
  div.style.fontSize = style.fontSize;
  div.style.lineHeight = style.lineHeight;
  div.style.padding = style.padding;
  div.style.border = style.border;
  div.style.boxSizing = style.boxSizing;
  div.style.letterSpacing = style.letterSpacing;
  
  const textBefore = element.value.substring(0, position);
  div.textContent = textBefore;
  
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);
  
  document.body.appendChild(div);
  const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
  document.body.removeChild(div);
  
  const rect = element.getBoundingClientRect();
  
  return {
    x: rect.left + spanLeft - element.scrollLeft,
    y: rect.top + spanTop - element.scrollTop + parseInt(style.lineHeight || 20)
  };
}

const CustomImage = ({ src, alt, selectedFile }) => {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    
    const loadImage = async () => {
      if (!src) return;
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
        setImgSrc(src);
        return;
      }
      
      if (!selectedFile || !selectedFile.parentHandle) {
        setImgSrc(src);
        return;
      }

      try {
        let cleanPath = src;
        if (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
        
        const parts = cleanPath.split('/');
        let currentHandle = selectedFile.parentHandle;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part === '.' || part === '') continue;
          if (part === '..') {
            // Can't easily traverse up via parentHandle, fallback
            throw new Error("Relative path '../' not supported via this simple loader.");
          }
          if (i === parts.length - 1) {
            const fileHandle = await currentHandle.getFileHandle(part);
            const file = await fileHandle.getFile();
            objectUrl = URL.createObjectURL(file);
            setImgSrc(objectUrl);
            return;
          } else {
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }
        }
      } catch (err) {
        console.error("Failed to load local image:", src, err);
        setImgSrc(src); // Fallback to broken src
      }
    };
    
    loadImage();
    
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, selectedFile]);

  if (!imgSrc) return <span style={{color: 'var(--text-muted)'}}>Loading image...</span>;
  
  return <img src={imgSrc} alt={alt} style={{ maxWidth: '100%', borderRadius: '8px' }} />;
};

const FileTreeItem = ({ item, level = 0, selectedFile, handleSelectFile, draggedItem, setDraggedItem, handleDropOnItem, starredFiles, toggleStar, onContextMenu }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isOver, setIsOver] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, item);
    }
  };

  if (item.kind === 'directory') {
    return (
      <div onContextMenu={handleContextMenu}>
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
            onContextMenu={onContextMenu}
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
      onContextMenu={handleContextMenu}
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
  const [viewMode, setViewMode] = useState('edit'); // 'edit', 'preview', 'split', 'media'
  const [mediaData, setMediaData] = useState(null); // { url, type: 'image'|'pdf'|'video'|'audio' }
  const [tabNames, setTabNames] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [starredFiles, setStarredFiles] = useState([]);

  // Completion State
  const [completion, setCompletion] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    trigger: '',
    query: '',
    selectedIndex: 0,
    suggestions: [],
    history: [] // For sub-menus
  });
  
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, targetItem: null });
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
  }, []);

  const closeCompletion = useCallback(() => {
    setCompletion(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
  }, []);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('click', closeCompletion);
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('SW registration failed: ', err);
        });
      });
    }

    return () => window.removeEventListener('click', closeContextMenu);
  }, [closeContextMenu]);

  const handleContextMenu = useCallback((e, item) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.pageX,
      y: e.pageY,
      targetItem: item
    });
  }, []);

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
  const [editorSettings, setEditorSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMoveToTabModalOpen, setIsMoveToTabModalOpen] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState(null);
  const [tempSettings, setTempSettings] = useState(DEFAULT_SETTINGS);

  const t = useCallback((key) => {
    const lang = editorSettings.language || 'ja';
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
  }, [editorSettings.language]);

  const tt = useCallback((key) => {
    const lang = tempSettings.language || 'ja';
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
  }, [tempSettings.language]);

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
          setEditorSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
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

  const allDirectories = useMemo(() => {
    const dirs = [];
    if (directoryHandle) {
      dirs.push({ name: 'ルート', kind: 'directory', handle: directoryHandle, path: directoryHandle.name, isRoot: true });
    }
    const recurse = (items) => {
      items.forEach(item => {
        if (item.kind === 'directory') {
          dirs.push(item);
          if (item.children) recurse(item.children);
        }
      });
    };
    recurse(files);
    return dirs;
  }, [files, directoryHandle]);

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
        const lowerName = entry.name.toLowerCase();
        const ext = lowerName.substring(lowerName.lastIndexOf('.')) || '';
        if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_EXACT_NAMES.includes(lowerName)) {
          items.push({ name: entry.name, kind: 'file', handle: entry, path: currentPath, parentHandle: dirHandle });
        }
      } else if (entry.kind === 'directory') {
        // node_modulesや.gitなどの重いフォルダはスキップ
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.images') {
          const children = await readDir(entry, currentPath, currentDepth + 1);
          items.push({ name: entry.name, kind: 'directory', handle: entry, children, path: currentPath, parentHandle: dirHandle });
        }
      }
    }
    return items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      // 自然順ソート（1, 2, 10, 11 の順になるように設定）
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
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
      const lowerName = fileItem.name.toLowerCase();
      
      // メディア判定
      const isImage = /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(lowerName);
      const isPdf = /\.pdf$/.test(lowerName);
      const isVideo = /\.(mp4|webm)$/.test(lowerName);
      const isAudio = /\.(mp3|wav)$/.test(lowerName);
      const isHtml = /\.html$/.test(lowerName);

      // 以前のObjectURLを解放
      if (mediaData?.url) URL.revokeObjectURL(mediaData.url);

      if (isImage || isPdf || isVideo || isAudio) {
        const url = URL.createObjectURL(file);
        let type = 'image';
        if (isPdf) type = 'pdf';
        if (isVideo) type = 'video';
        if (isAudio) type = 'audio';

        setSelectedFile(fileItem);
        setMediaData({ url, type });
        setEditorContent('');
        setIsDirty(false);
        setLastSaved(null);
        setError(null);
        setViewMode('media');
      } else {
        const buffer = await file.arrayBuffer();
        let text = '';
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(buffer);
        } catch (e) {
          const sjisDecoder = new TextDecoder('shift_jis');
          text = sjisDecoder.decode(buffer);
        }

        setSelectedFile(fileItem);
        setMediaData(isHtml ? { type: 'html' } : null); // HTMLの場合はフラグを立てる
        setEditorContent(text);
        setIsDirty(false);
        setLastSaved(null);
        setError(null);
        
        if (fileItem.name.endsWith('.md') || isHtml) {
          setViewMode('split');
        } else {
          setViewMode('edit');
        }
      }
    } catch (err) {
      setError(`ファイルの読み込みに失敗しました: ${err.message}`);
    }
  };

  const [newFileParentHandle, setNewFileParentHandle] = useState(null);

  const handleOpenNewFileModal = (dirHandle = null) => {
    setNewFileParentHandle(dirHandle instanceof FileSystemDirectoryHandle ? dirHandle : null);
    setNewFileName('');
    setNewFileType('.txt');
    setIsNewFileModalOpen(true);
  };

  const handleCloseNewFileModal = () => {
    setIsNewFileModalOpen(false);
  };

  const confirmAddFile = async () => {
    if (!directoryHandle || !newFileName.trim()) return;
    
    const fileName = `${newFileName.trim()}${newFileType}`;
    let targetDirHandle = newFileParentHandle || directoryHandle;
    
    if (!newFileParentHandle && activeTabName && activeTabName !== 'メイン') {
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

  const handleCreateFolderFromMenu = async () => {
    const item = contextMenu.targetItem;
    if (!item || item.kind !== 'directory') return;
    const folderName = window.prompt("新しいフォルダの名前を入力してください:");
    if (!folderName) return;
    try {
      await item.handle.getDirectoryHandle(folderName, { create: true });
      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      setFiles(tree);
    } catch (err) {
      setError(`フォルダ作成に失敗しました: ${err.message}`);
    }
  };

  const handleRenameFromMenu = async () => {
    const item = contextMenu.targetItem;
    if (!item) return;
    const newName = window.prompt("新しい名前を入力してください:", item.name);
    if (!newName || newName === item.name) return;
    
    try {
      if (item.kind === 'directory') {
        setError("フォルダの名前変更は現在サポートされていません。");
        return;
      }
      
      const file = await item.handle.getFile();
      const buffer = await file.arrayBuffer();
      const newHandle = await item.parentHandle.getFileHandle(newName, { create: true });
      const writable = await newHandle.createWritable();
      await writable.write(buffer);
      await writable.close();
      await item.parentHandle.removeEntry(item.name);
      
      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      setFiles(tree);
      
      if (selectedFile?.path === item.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
    } catch (err) {
      setError(`名前変更に失敗しました: ${err.message}`);
    }
  };

  const handleDeleteFromMenu = async () => {
    const item = contextMenu.targetItem;
    if (!item) return;
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;
    
    try {
      await item.parentHandle.removeEntry(item.name, { recursive: true });
      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      setFiles(tree);
      
      if (selectedFile && selectedFile.path.startsWith(item.path)) {
        setSelectedFile(null);
        setEditorContent('');
      }
    } catch (err) {
      setError(`削除に失敗しました: ${err.message}`);
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
    const value = e.target.value;
    const selectionStart = e.target.selectionStart;
    setEditorContent(value);
    setIsDirty(true);

    // Completion Trigger Logic
    const lastChar = value[selectionStart - 1];
    const textBefore = value.substring(0, selectionStart);
    
    // Check for Slash Command
    if (lastChar === '/') {
      const lineBefore = textBefore.split('\n').pop();
      if (lineBefore === '/') {
        const coords = getCaretCoordinates(e.target, selectionStart);
        const categories = [
          { 
            id: 'basic', label: '基本テキスト', type: 'category', icon: <Type size={14}/>,
            children: [
              { id: 'h1', label: '見出し 1', desc: '# Heading', icon: <Hash size={14}/> },
              { id: 'h2', label: '見出し 2', desc: '## Heading', icon: <Hash size={14}/> },
              { id: 'h3', label: '見出し 3', desc: '### Heading', icon: <Hash size={14}/> },
            ]
          },
          { 
            id: 'insert', label: '挿入', type: 'category', icon: <Plus size={14}/>,
            children: [
              { id: 'today', label: '今日の日付', desc: '/today', icon: <Calendar size={14}/> },
              { id: 'now', label: '現在の時刻', desc: '/now', icon: <Clock size={14}/> },
              { id: 'link', label: 'リンク', desc: '[text](url)', icon: <Link size={14}/> },
            ]
          },
          { 
            id: 'layout', label: 'レイアウト', type: 'category', icon: <Columns size={14}/>,
            children: [
              { id: 'table', label: 'テーブル', desc: '| col | col |', icon: <Table size={14}/> },
              { id: 'todo', label: 'チェックリスト', desc: '- [ ] item', icon: <CheckSquare size={14}/> },
            ]
          },
        ];
        
        setCompletion({
          isOpen: true,
          x: coords.x,
          y: coords.y,
          trigger: '/',
          query: '',
          selectedIndex: 0,
          suggestions: categories,
          history: []
        });
        return;
      }
    }

    // Check for File Link [[
    if (textBefore.endsWith('[[')) {
      const coords = getCaretCoordinates(e.target, selectionStart);
      const fileSuggestions = flattenedFiles
        .filter(f => f.kind === 'file')
        .map(f => ({ id: f.path, label: f.name, desc: f.path, icon: <FileText size={14}/> }));
      
      setCompletion({
        isOpen: true,
        x: coords.x,
        y: coords.y,
        trigger: '[[',
        query: '',
        selectedIndex: 0,
        suggestions: fileSuggestions,
        history: []
      });
      return;
    }

    // Update query if completion is open
    if (completion.isOpen) {
      const currentQuery = textBefore.substring(textBefore.lastIndexOf(completion.trigger) + completion.trigger.length);
      if (currentQuery.includes(' ') || currentQuery.includes('\n')) {
        closeCompletion();
      } else {
        setCompletion(prev => ({ ...prev, query: currentQuery, selectedIndex: 0 }));
      }
      return;
    }

    // Dynamic Word Completion
    if (editorSettings.dynamicSuggestions && lastChar && /[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(lastChar)) {
      const currentWord = textBefore.split(/[\s\n\W]/).pop();
      if (currentWord && currentWord.length >= 2) {
        const words = Array.from(new Set(editorContent.split(/[\s\n\W]/))).filter(w => w.length > 2 && w !== currentWord && w.startsWith(currentWord));
        if (words.length > 0) {
          const coords = getCaretCoordinates(e.target, selectionStart);
          setCompletion({
            isOpen: true,
            x: coords.x,
            y: coords.y,
            trigger: currentWord[0],
            query: currentWord.substring(1),
            selectedIndex: 0,
            suggestions: words.slice(0, 5).map(w => ({ id: w, label: w, desc: '既出の単語', icon: <Edit3 size={14}/> })),
            history: []
          });
          // Update the trigger to the current word's start
          setCompletion(prev => ({ ...prev, trigger: textBefore.substring(0, textBefore.length - currentWord.length + 1).split('').pop() || '', query: currentWord.substring(1) }));
        }
      }
    }
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

  const filteredSuggestions = useMemo(() => {
    if (!completion.isOpen) return [];
    const query = completion.query.toLowerCase();
    return completion.suggestions.filter(s => 
      s.label.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)
    );
  }, [completion.isOpen, completion.query, completion.suggestions]);

  const applyCompletion = useCallback((suggestion) => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    const start = target.selectionStart;
    
    // Find where the current completion segment started
    let textBeforeTrigger = editorContent.substring(0, start).lastIndexOf(completion.trigger);
    // For words, it might be the start of the word
    if (completion.trigger !== '/' && completion.trigger !== '[[') {
      const textBefore = editorContent.substring(0, start);
      const words = textBefore.split(/[\s\n\W]/);
      const lastWord = words[words.length - 1];
      textBeforeTrigger = start - lastWord.length;
    }
    
    let insertText = '';
    let cursorOffset = 0;

    if (completion.trigger === '/') {
      const now = new Date();
      switch (suggestion.id) {
        case 'today': insertText = now.toLocaleDateString(); break;
        case 'now': insertText = now.toLocaleTimeString(); break;
        case 'h1': insertText = '# '; break;
        case 'h2': insertText = '## '; break;
        case 'h3': insertText = '### '; break;
        case 'link': insertText = '[]()'; cursorOffset = 1; break;
        case 'table': insertText = '| Header | Header |\n| :--- | :--- |\n| Content | Content |'; break;
        case 'todo': insertText = '- [ ] '; break;
        default: insertText = suggestion.label;
      }
    } else if (completion.trigger === '[[') {
      insertText = `[[${suggestion.label}]]`;
    } else {
      insertText = suggestion.label;
    }

    const newText = editorContent.substring(0, textBeforeTrigger) + insertText + editorContent.substring(start);
    setEditorContent(newText);
    setIsDirty(true);
    closeCompletion();

    setTimeout(() => {
      target.focus();
      const newPos = textBeforeTrigger + (cursorOffset || insertText.length);
      target.selectionStart = target.selectionEnd = newPos;
    }, 0);
  }, [editorContent, completion, closeCompletion]);

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
        // 同じフォルダにドロップした場合は何もしない
        if (sourceItem.parentHandle && await sourceItem.parentHandle.isSameEntry(targetItem.handle)) {
          return;
        }

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
        const folderName = window.prompt(t('autoFolderPrompt'), t('newFolderDefault'));
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

  const handleMoveToParent = async (item) => {
    if (!item || !item.parentHandle || item.isRoot) return;
    
    // Find parent of parent
    // This is tricky because we don't have parent links in the handles easily.
    // We can use the path to find the target in our 'allDirectories'
    const pathParts = item.path.split('/');
    if (pathParts.length <= 2) return; // Already at root or similar
    
    const grandParentPath = pathParts.slice(0, -2).join('/');
    const grandParent = allDirectories.find(d => d.path === grandParentPath);
    
    if (grandParent) {
      handleDropOnItem(item, grandParent);
    }
  };

  const executeMove = async (sourceItem, targetDirItem) => {
    try {
      // Logic from handleDropOnItem for directory move
      const sourceFile = await sourceItem.handle.getFile();
      const sourceBuffer = await sourceFile.arrayBuffer();
      
      const newSourceHandle = await targetDirItem.handle.getFileHandle(sourceItem.name, { create: true });
      const sourceWritable = await newSourceHandle.createWritable();
      await sourceWritable.write(sourceBuffer);
      await sourceWritable.close();

      await sourceItem.parentHandle.removeEntry(sourceItem.name);

      const tree = await readDir(directoryHandle, directoryHandle.name, 1);
      setFiles(tree);

      if (selectedFile && selectedFile.path === sourceItem.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
      setIsMoveModalOpen(false);
    } catch (err) {
      setError(`移動に失敗しました: ${err.message}`);
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

  const handleExportStandalone = async () => {
    try {
      // Get all styles currently loaded in the document
      let cssText = '';
      try {
        cssText = Array.from(document.styleSheets)
          .map(sheet => {
            try {
              // Only include internal or same-origin styles
              return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            } catch (e) {
              return ''; 
            }
          })
          .join('\n');
      } catch (e) {
        console.warn('Could not extract styles from document');
      }

      const standaloneHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebMemoNote - Portable</title>
    <style>
      ${cssText}
      #root { height: 100vh; overflow: hidden; }
      .portable-overlay {
        position: fixed; inset: 0; background: #0f172a; color: white;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 9999; text-align: center; padding: 20px; font-family: sans-serif;
      }
    </style>
</head>
<body>
    <div id="root">
      <div class="portable-overlay">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">WebMemoNote Portable</h2>
        <p style="max-width: 500px; margin-bottom: 30px; line-height: 1.6; opacity: 0.9;">
          このHTMLファイルは、WebMemoNoteへのクイックアクセス用ポータルです。<br>
          完全にローカルな「アプリ」として利用するには、ブラウザのメニューから<b>「インストール（PWA）」</b>を行うことを強くお勧めします。
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="location.href='${window.location.href.split('#')[0].split('?')[0]}'" style="padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">
            アプリを起動する
          </button>
          <button onclick="if(!window.close()){ alert('ブラウザのセキュリティ制限により閉じられませんでした。タブを直接閉じてください。'); }" style="padding: 12px 24px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            閉じる
          </button>
        </div>
        <p style="margin-top: 40px; font-size: 0.75rem; opacity: 0.5;">
          ※PWAをインストールすると、インターネットがない環境でもデスクトップから直接起動できるようになります。
        </p>
      </div>
    </div>
</body>
</html>`;

      const blob = new Blob([standaloneHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'WebMemoNote-Portable.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e.message);
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
                <option value=".txt">Text (.txt)</option>
                <option value=".md">Markdown (.md)</option>
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
            <h3 className="modal-title">{tt('settingsTitle')}</h3>
            <div className="modal-input-grid">
              <div className="settings-section">
                <label className="modal-label">{tt('fontFamily')} ({tt('default')}: System)</label>
                <select 
                  className="modal-input" 
                  value={tempSettings.fontFamily} 
                  onChange={e => setTempSettings({...tempSettings, fontFamily: e.target.value})}
                >
                  <option value="inherit">{tt('default')} (System)</option>
                  <option value="'Inter', 'Roboto', 'Helvetica Neue', sans-serif">Inter/Roboto</option>
                  <option value="'Yu Gothic', 'Meiryo', sans-serif">Yu Gothic / Meiryo</option>
                  <option value="'Yu Mincho', 'MS Mincho', serif">Yu Mincho / MS Mincho</option>
                  <option value="'BIZ UDPGothic', sans-serif">BIZ UDPGothic</option>
                  <option value="'BIZ UDPMincho', serif">BIZ UDPMincho</option>
                  <option value="monospace">Monospace</option>
                  <option value="'Consolas', 'Monaco', 'Courier New', monospace">Consolas/Monaco</option>
                  <option value="'Fira Code', 'Cascadia Code', monospace">Fira/Cascadia</option>
                </select>
              </div>
              
              <div className="settings-row-triple">
                <div>
                  <label className="modal-label">{tt('fontSize')} (px)</label>
                  <div className="hybrid-input">
                    <input 
                      type="number" 
                      className="modal-input" 
                      placeholder={DEFAULT_SETTINGS.fontSize}
                      value={tempSettings.fontSize} 
                      onChange={e => setTempSettings({...tempSettings, fontSize: e.target.value})}
                    />
                    <div className="preset-select-wrapper">
                      <ChevronDown size={14} className="preset-icon" />
                    </div>
                    <select 
                      className="preset-select" 
                      value={tempSettings.fontSize} 
                      onChange={e => setTempSettings({...tempSettings, fontSize: e.target.value})}
                    >
                      <option value="" disabled></option>
                      {[12, 14, 16, 18, 20, 24, 32].map(v => <option key={v} value={v}>{v === parseInt(DEFAULT_SETTINGS.fontSize) ? `${v} (${tt('initialValue')})` : v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="modal-label">{tt('letterSpacing')} (px)</label>
                  <div className="hybrid-input">
                    <input 
                      type="number" 
                      step="0.1"
                      className="modal-input" 
                      placeholder={DEFAULT_SETTINGS.letterSpacing}
                      value={tempSettings.letterSpacing} 
                      onChange={e => setTempSettings({...tempSettings, letterSpacing: e.target.value})}
                    />
                    <div className="preset-select-wrapper">
                      <ChevronDown size={14} className="preset-icon" />
                    </div>
                    <select 
                      className="preset-select" 
                      value={tempSettings.letterSpacing} 
                      onChange={e => setTempSettings({...tempSettings, letterSpacing: e.target.value})}
                    >
                      <option value="" disabled></option>
                      {[0, 0.5, 1, 1.5, 2].map(v => <option key={v} value={v}>{v === parseFloat(DEFAULT_SETTINGS.letterSpacing) ? `${v} (${tt('initialValue')})` : v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="modal-label">{tt('lineHeight')}</label>
                  <div className="hybrid-input">
                    <input 
                      type="number" 
                      step="0.1"
                      className="modal-input" 
                      placeholder={DEFAULT_SETTINGS.lineHeight}
                      value={tempSettings.lineHeight} 
                      onChange={e => setTempSettings({...tempSettings, lineHeight: e.target.value})}
                    />
                    <div className="preset-select-wrapper">
                      <ChevronDown size={14} className="preset-icon" />
                    </div>
                    <select 
                      className="preset-select" 
                      value={tempSettings.lineHeight} 
                      onChange={e => setTempSettings({...tempSettings, lineHeight: e.target.value})}
                    >
                      <option value="" disabled></option>
                      {[1.2, 1.5, 1.8, 2.0, 2.5].map(v => <option key={v} value={v}>{v === parseFloat(DEFAULT_SETTINGS.lineHeight) ? `${v} (${tt('initialValue')})` : v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-row-double">
                <div>
                  <label className="modal-label">{tt('padding')} (px)</label>
                  <div className="hybrid-input">
                    <input 
                      type="number" 
                      className="modal-input" 
                      placeholder={DEFAULT_SETTINGS.editorPadding}
                      value={tempSettings.editorPadding} 
                      onChange={e => setTempSettings({...tempSettings, editorPadding: e.target.value})}
                    />
                    <div className="preset-select-wrapper">
                      <ChevronDown size={14} className="preset-icon" />
                    </div>
                    <select 
                      className="preset-select" 
                      value={tempSettings.editorPadding} 
                      onChange={e => setTempSettings({...tempSettings, editorPadding: e.target.value})}
                    >
                      <option value="" disabled></option>
                      {[16, 24, 32, 48, 64, 80].map(v => <option key={v} value={v}>{v === parseInt(DEFAULT_SETTINGS.editorPadding) ? `${v} (${tt('initialValue')})` : v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="modal-label">{tt('maxWidth')} (px)</label>
                  <div className="hybrid-input">
                    <input 
                      type="number" 
                      className="modal-input" 
                      placeholder={DEFAULT_SETTINGS.maxWidth}
                      value={tempSettings.maxWidth} 
                      onChange={e => setTempSettings({...tempSettings, maxWidth: e.target.value})}
                    />
                    <div className="preset-select-wrapper">
                      <ChevronDown size={14} className="preset-icon" />
                    </div>
                    <select 
                      className="preset-select" 
                      value={tempSettings.maxWidth} 
                      onChange={e => setTempSettings({...tempSettings, maxWidth: e.target.value})}
                    >
                      <option value="" disabled></option>
                      {[600, 800, 900, 1000, 1200, 2000].map(v => <option key={v} value={v}>{v === parseInt(DEFAULT_SETTINGS.maxWidth) ? `${v} (${tt('initialValue')})` : v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-row-double">
                <div>
                  <label className="modal-label">{tt('fontColor')}</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      className="modal-input" 
                      style={{ padding: '2px', height: '38px', width: '60px', cursor: 'pointer' }}
                      value={tempSettings.fontColor.startsWith('var') ? (tempSettings.theme === 'dark' ? '#F9FAFB' : '#111827') : tempSettings.fontColor} 
                      onChange={e => setTempSettings({...tempSettings, fontColor: e.target.value})}
                    />
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setTempSettings({...tempSettings, fontColor: DEFAULT_SETTINGS.fontColor})}
                    >{tt('reset')}</button>
                  </div>
                </div>
                <div>
                  <label className="modal-label">{tt('theme')}</label>
                  <select 
                    className="modal-input" 
                    value={tempSettings.theme} 
                    onChange={e => setTempSettings({...tempSettings, theme: e.target.value})}
                  >
                    <option value="system">{tt('system')} ({tt('initialValue')})</option>
                    <option value="light">{tt('light')}</option>
                    <option value="dark">{tt('dark')}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row-double">
                <div>
                  <label className="modal-label">{tt('tabKey')}</label>
                  <select 
                    className="modal-input" 
                    value={tempSettings.tabSize} 
                    onChange={e => setTempSettings({...tempSettings, tabSize: e.target.value})}
                  >
                    <option value="tab">{tt('tabChar')} ({tt('initialValue')})</option>
                    <option value="2">{tt('space2')}</option>
                    <option value="4">{tt('space4')}</option>
                  </select>
                </div>
                <div>
                  <label className="modal-label">{tt('language')}</label>
                  <select 
                    className="modal-input" 
                    value={tempSettings.language} 
                    onChange={e => setTempSettings({...tempSettings, language: e.target.value})}
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
              <div className="settings-row-double">
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={!!tempSettings.wordWrap} 
                      onChange={e => setTempSettings({...tempSettings, wordWrap: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tt('wordWrap')}</span>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={!!tempSettings.dynamicSuggestions} 
                      onChange={e => setTempSettings({...tempSettings, dynamicSuggestions: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tt('dynamicSuggestions')}</span>
                  </label>
                </div>
              </div>

              <div className="settings-section" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <label className="modal-label" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                  <Download size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {tt('downloadSection')}
                </label>
                <div style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {tt('downloadStandaloneDesc')}
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ marginTop: '12px', width: '100%', justifyContent: 'center', display: 'flex', gap: '8px' }}
                  onClick={handleExportStandalone}
                >
                  <FileCode size={16} />
                  {tt('downloadStandalone')}
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsSettingsModalOpen(false)}>{tt('cancel')}</button>
              <button className="btn-primary-solid" onClick={async () => {
                setEditorSettings(tempSettings);
                await setVal('editorSettings', tempSettings);
                setIsSettingsModalOpen(false);
              }}>{tt('save')}</button>
            </div>
          </div>
        </div>
      )}


      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="header-dot"></div>
          <span style={{ flex: 1 }}>WebMemoNote</span>
          <div 
            className="security-badge" 
            onClick={() => setIsPrivacyModalOpen(true)}
            title={t('privacyHelp')}
          >
            <ShieldCheck size={14} />
            <span>{t('secureLocal')}</span>
          </div>
        </div>
        
        {directoryHandle && (
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder={t('searchPlaceholder')} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="sidebar-actions">
          <button onClick={handleOpenFolder} className="btn btn-primary">
            <FolderOpen size={16} />
            {t('openFolderBtn')}
          </button>
          
          {savedHandle && !directoryHandle && (
            <button onClick={handleResumeFolder} className="btn btn-resume">
              <RefreshCw size={16} />
              {t('resumeFolder')}
            </button>
          )}

          {directoryHandle && (
            <div className="sidebar-actions-row">
              <button onClick={handleOpenNewFileModal} className="btn btn-primary" style={{ flex: 1 }}>
                <Plus size={16} />
                {t('newMemo')}
              </button>
              <button onClick={() => {
                setTempSettings(editorSettings);
                setIsSettingsModalOpen(true);
              }} className="btn-icon" title={t('settingsTitle')}>
                <Settings size={16} />
              </button>
            </div>
          )}
        </div>


        {/* File List */}
        <div 
          className="file-list"
          onContextMenu={(e) => {
            if (directoryHandle) {
              handleContextMenu(e, { kind: 'directory', handle: directoryHandle, name: 'ルート', isRoot: true });
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedItem && activeTabName) {
              let targetDir = null;
              if (activeTabName === 'メイン') {
                targetDir = { handle: directoryHandle, kind: 'directory', path: directoryHandle.name };
              } else {
                const tabDir = files.find(f => f.kind === 'directory' && f.name === activeTabName);
                if (tabDir) targetDir = tabDir;
              }
              if (targetDir) handleDropOnItem(draggedItem, targetDir);
            }
          }}
        >
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
                onContextMenu={handleContextMenu}
              />
            )) : (
              <div className="empty-state">{t('emptyStateNoSearch')}</div>
            )
          ) : (
            tabs.find(t_item => t_item.name === activeTabName)?.items.map(item => (
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
                onContextMenu={handleContextMenu}
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
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('drag-over');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-over');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  if (draggedItem) {
                    let targetDir = null;
                    if (tab.name === 'メイン') {
                      targetDir = { handle: directoryHandle, kind: 'directory', path: directoryHandle.name };
                    } else if (!tab.isSpecial) {
                      const rootDir = files.find(f => f.kind === 'directory' && f.name === tab.name);
                      if (rootDir) targetDir = rootDir;
                    }
                    if (targetDir) handleDropOnItem(draggedItem, targetDir);
                  }
                }}
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
                    fontSize: `${editorSettings.fontSize}px`,
                    letterSpacing: `${editorSettings.letterSpacing}px`,
                    lineHeight: editorSettings.lineHeight,
                    padding: `${editorSettings.editorPadding}px`,
                    maxWidth: `${editorSettings.maxWidth}px`,
                    margin: '0',
                    color: editorSettings.fontColor,
                    whiteSpace: editorSettings.wordWrap ? 'pre-wrap' : 'pre',
                    overflowX: editorSettings.wordWrap ? 'hidden' : 'auto'
                  }}
                  value={editorContent}
                  onChange={handleEditorChange}
                  onScroll={handleEditorScroll}
                  onDrop={handleEditorDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    // Completion Menu Navigation
                    if (completion.isOpen) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCompletion(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.suggestions.length }));
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCompletion(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.suggestions.length) % prev.suggestions.length }));
                        return;
                      }
                      if (e.key === 'ArrowRight') {
                        const suggestion = filteredSuggestions[completion.selectedIndex];
                        if (suggestion?.type === 'category') {
                          e.preventDefault();
                          setCompletion(prev => ({
                            ...prev,
                            history: [...prev.history, { suggestions: prev.suggestions, selectedIndex: prev.selectedIndex }],
                            suggestions: suggestion.children,
                            selectedIndex: 0,
                            query: ''
                          }));
                        }
                        return;
                      }
                      if (e.key === 'ArrowLeft') {
                        if (completion.history.length > 0) {
                          e.preventDefault();
                          const last = completion.history[completion.history.length - 1];
                          setCompletion(prev => ({
                            ...prev,
                            history: prev.history.slice(0, -1),
                            suggestions: last.suggestions,
                            selectedIndex: last.selectedIndex,
                            query: ''
                          }));
                        }
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const suggestion = filteredSuggestions[completion.selectedIndex];
                        if (suggestion?.type === 'category') {
                          setCompletion(prev => ({
                            ...prev,
                            history: [...prev.history, { suggestions: prev.suggestions, selectedIndex: prev.selectedIndex }],
                            suggestions: suggestion.children,
                            selectedIndex: 0,
                            query: ''
                          }));
                        } else {
                          applyCompletion(suggestion);
                        }
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        closeCompletion();
                        return;
                      }
                    }

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

                    // Smart Brackets and Auto-close
                    const pairMap = { '[': ']', '(': ')', '{': '}', '"': '"', "'": "'" };
                    if (pairMap[e.key]) {
                      const target = e.target;
                      const start = target.selectionStart;
                      const end = target.selectionEnd;
                      
                      e.preventDefault();
                      if (start !== end) {
                        // Wrap selection
                        const selectedText = editorContent.substring(start, end);
                        const newText = editorContent.substring(0, start) + e.key + selectedText + pairMap[e.key] + editorContent.substring(end);
                        setEditorContent(newText);
                        setIsDirty(true);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.selectionStart = start + 1;
                            textareaRef.current.selectionEnd = end + 1;
                          }
                        }, 0);
                      } else {
                        // Auto-close empty
                        const newText = editorContent.substring(0, start) + e.key + pairMap[e.key] + editorContent.substring(end);
                        setEditorContent(newText);
                        setIsDirty(true);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
                          }
                        }, 0);
                      }
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
                    fontSize: `${editorSettings.fontSize}px`,
                    letterSpacing: `${editorSettings.letterSpacing}px`,
                    lineHeight: editorSettings.lineHeight,
                    padding: `${editorSettings.editorPadding}px`,
                    maxWidth: `${editorSettings.maxWidth}px`,
                    margin: '0',
                    color: editorSettings.fontColor,
                    paddingTop: mediaData?.type === 'html' ? 0 : undefined,
                    paddingBottom: mediaData?.type === 'html' ? 0 : undefined,
                    overflow: mediaData?.type === 'html' ? 'hidden' : undefined
                  }}
                >
                  {mediaData?.type === 'html' ? (
                    <iframe 
                      srcDoc={editorContent} 
                      title="html-preview" 
                      style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} 
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({node, ...props}) => <CustomImage {...props} selectedFile={selectedFile} />
                      }}
                    >
                      {editorContent}
                    </ReactMarkdown>
                  )}
                </div>
              )}

              {viewMode === 'media' && mediaData && (
                <div className="media-viewer">
                  {mediaData.type === 'image' && <img src={mediaData.url} alt="preview" />}
                  {mediaData.type === 'pdf' && <iframe src={mediaData.url} title="pdf-preview" width="100%" height="100%" style={{ border: 'none' }} />}
                  {mediaData.type === 'video' && <video src={mediaData.url} controls width="100%" />}
                  {mediaData.type === 'audio' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <audio src={mediaData.url} controls />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="welcome-screen">
            {!directoryHandle ? (
              <div className="welcome-card">
                <Info size={48} color="#4F46E5" style={{ marginBottom: '16px' }} />
                <h2 className="welcome-title">{t('welcomeTitle')}</h2>
                <div className="welcome-security-info">
                  <div className="security-item">
                    <ShieldCheck size={18} className="security-icon" />
                    <span>{t('welcomeSecure1')}</span>
                  </div>
                  <div className="security-item">
                    <Globe size={18} className="security-icon" />
                    <span>{t('welcomeSecure2')}</span>
                  </div>
                </div>

                <p className="welcome-desc">
                  {t('welcomeDesc')}
                </p>

                <div className="welcome-privacy-note" onClick={() => setIsPrivacyModalOpen(true)}>
                  <Lock size={12} /> {t('welcomePrivacyLink')}
                </div>

                {savedHandle && (
                  <button onClick={handleResumeFolder} className="btn-large">
                    <RefreshCw size={18} />
                    {t('resumeFolder')} (「{savedHandle.name}」)
                  </button>
                )}
                
                <button onClick={handleOpenFolder} className="btn-large-primary">
                  <FolderOpen size={18} />
                  {t('openFolderBtn')}
                </button>
              </div>
            ) : (
              <div style={{ color: '#9CA3AF' }}>Please select a file from the sidebar</div>
            )}
          </div>

        )}
      </div>

      {/* Privacy & Security Modal */}
      {isPrivacyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPrivacyModalOpen(false)}>
          <div className="modal-content privacy-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div className="security-icon-large">
                <ShieldCheck size={32} />
              </div>
              <h3 className="modal-title" style={{ margin: 0 }}>プライバシーと安全性</h3>
            </div>
            
            <div className="privacy-content">
              <section>
                <h4><Lock size={16} /> 100% ローカル完結</h4>
                <p>このアプリは「File System Access API」を使用して、あなたのPC上のファイルを直接読み書きします。データが外部のサーバーに送信されたり、クラウドに保存されることはありません。</p>
              </section>

              <section>
                <h4><Globe size={16} /> インターネット通信なし</h4>
                <p>メモの内容や画像データがインターネットへ送信される仕組みは一切ありません。完全にオフラインでも動作します。</p>
              </section>

              <section>
                <h4><Monitor size={16} /> 自分で確認する方法</h4>
                <p>ブラウザの開発者ツール（F12キー）の「ネットワーク」タブを開いたまま操作してみてください。外部への通信が発生していないことが確認できます。</p>
              </section>

              <div className="privacy-footer">
                <ShieldCheck size={14} />
                <span>WebMemoNote は、プライバシー第一の設計です。</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary-solid" onClick={() => setIsPrivacyModalOpen(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Move File Modal */}
      {isMoveModalOpen && moveTargetItem && (
        <div className="modal-overlay" onClick={() => setIsMoveModalOpen(false)}>
          <div className="modal-content move-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">「{moveTargetItem.name}」の移動先を選択</h3>
            <div className="move-folder-list">
              {allDirectories.map(dir => (
                <div 
                  key={dir.path} 
                  className="move-folder-item" 
                  onClick={() => executeMove(moveTargetItem, dir)}
                >
                  <Folder size={16} className="icon-folder" />
                  <span>{dir.isRoot ? 'ルート' : dir.path.split('/').slice(1).join(' / ')}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsMoveModalOpen(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Move To Tab Modal */}
      {isMoveToTabModalOpen && moveTargetItem && (
        <div className="modal-overlay" onClick={() => setIsMoveToTabModalOpen(false)}>
          <div className="modal-content move-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">「{moveTargetItem.name}」をタブへ移動</h3>
            <div className="move-folder-list">
              {tabs.filter(t => !t.isSpecial).map(tab => (
                <div 
                  key={tab.name} 
                  className="move-folder-item" 
                  onClick={async () => {
                    let targetDir = null;
                    if (tab.name === 'メイン') {
                      targetDir = { handle: directoryHandle, kind: 'directory', path: directoryHandle.name };
                    } else {
                      const tabDir = files.find(f => f.kind === 'directory' && f.name === tab.name);
                      if (tabDir) targetDir = tabDir;
                    }
                    if (targetDir) {
                      await executeMove(moveTargetItem, targetDir);
                      setIsMoveToTabModalOpen(false);
                    }
                  }}
                >
                  <Columns size={16} className="icon-file" style={{ color: 'var(--primary)' }} />
                  <span>{tab.name}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsMoveToTabModalOpen(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.targetItem && (
        <div 
          className="context-menu" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetItem.kind === 'directory' && (
            <>
              <div className="context-menu-item" onClick={() => {
                handleOpenNewFileModal(contextMenu.targetItem.handle);
                closeContextMenu();
              }}>
                <FilePlus size={14} /> {t('newMemo')}
              </div>
              <div className="context-menu-item" onClick={() => {
                handleCreateFolderFromMenu();
                closeContextMenu();
              }}>
                <FolderPlus size={14} /> {t('newFolder')}
              </div>
              <div className="context-menu-divider"></div>
            </>
          )}
          {contextMenu.targetItem.kind === 'file' && (
            <>
              <div className="context-menu-item" onClick={() => {
                handleRenameFromMenu();
                closeContextMenu();
              }}>
                <Edit3 size={14} /> {t('rename')}
              </div>
              {!contextMenu.targetItem.isRoot && (
                <>
                  <div className="context-menu-item" onClick={() => {
                    handleMoveToParent(contextMenu.targetItem);
                    closeContextMenu();
                  }}>
                    <ArrowUp size={14} /> {t('moveUp')}
                  </div>
                  <div className="context-menu-item" onClick={() => {
                    setMoveTargetItem(contextMenu.targetItem);
                    setIsMoveModalOpen(true);
                    closeContextMenu();
                  }}>
                    <Move size={14} /> {t('moveToFolder')}
                  </div>
                  <div className="context-menu-item" onClick={() => {
                    setMoveTargetItem(contextMenu.targetItem);
                    setIsMoveToTabModalOpen(true);
                    closeContextMenu();
                  }}>
                    <Columns size={14} /> {t('moveToTab')}
                  </div>
                </>
              )}
            </>
          )}
          {!contextMenu.targetItem.isRoot && (
            <div className="context-menu-item danger" onClick={() => {
              handleDeleteFromMenu();
              closeContextMenu();
            }}>
              <Trash2 size={14} /> {t('delete')}
            </div>
          )}

        </div>
      )}
      {/* Completion Menu */}
      {completion.isOpen && filteredSuggestions.length > 0 && (
        <div 
          className="completion-menu" 
          style={{ left: completion.x, top: completion.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="completion-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {completion.history.length > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const last = completion.history[completion.history.length - 1];
                  setCompletion(prev => ({
                    ...prev,
                    history: prev.history.slice(0, -1),
                    suggestions: last.suggestions,
                    selectedIndex: last.selectedIndex
                  }));
                }}
                className="btn-icon" 
                style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'none' }}
              >
                <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            {completion.trigger === '/' ? 'コマンド' : completion.trigger === '[[' ? 'ファイルリンク' : '候補'}
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <div 
              key={suggestion.id}
              className={`completion-item ${index === completion.selectedIndex ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (suggestion.type === 'category') {
                  setCompletion(prev => ({
                    ...prev,
                    history: [...prev.history, { suggestions: prev.suggestions, selectedIndex: prev.selectedIndex }],
                    suggestions: suggestion.children,
                    selectedIndex: 0,
                    query: ''
                  }));
                } else {
                  applyCompletion(suggestion);
                }
              }}
              onMouseEnter={() => setCompletion(prev => ({ ...prev, selectedIndex: index }))}
            >
              <div className="completion-item-icon">{suggestion.icon}</div>
              <div className="completion-item-label">{suggestion.label}</div>
              {suggestion.type === 'category' ? <ChevronRight size={14} color="var(--text-muted)" /> : <div className="completion-item-desc">{suggestion.desc}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
