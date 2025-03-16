"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [uploadMode, setUploadMode] = useState("file");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; mimeType: string; size?: string }[]>([]);
  const [showDrive, setShowDrive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  // State for directory navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"delete" | "move" | "createFolder" | "password" | "viewDrive">("delete");
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; mimeType: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordAction, setPasswordAction] = useState<"upload" | "delete" | "move" | "viewDrive">("upload");
  const [passwordError, setPasswordError] = useState("");
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFiles, setFilteredFiles] = useState<typeof driveFiles>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(driveFiles);
      return;
    }
    
    const filtered = driveFiles.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredFiles(filtered);
  }, [searchQuery, driveFiles]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus the new folder input when modal opens
  useEffect(() => {
    if (showModal && modalType === "createFolder" && newFolderInputRef.current) {
      // Use a small timeout to ensure the modal is rendered before focusing
      setTimeout(() => {
        if (newFolderInputRef.current) {
          newFolderInputRef.current.focus();
        }
      }, 50);
    }
  }, [showModal, modalType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setUploadMessage("");
  };

  const triggerFileInput = () => {
    if (uploadMode === "file" && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (uploadMode === "folder" && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadMessage("Please select a file or folder first");
      return;
    }
    
    // Request password confirmation before upload
    setPasswordAction("upload");
    setPassword("");
    setPasswordError("");
    setModalType("password");
    setShowModal(true);
  };
  
  const executeUpload = async () => {
    setShowModal(false);
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage("");

    const formData = new FormData();
    for (let i = 0; i < selectedFiles!.length; i++) {
      formData.append("files", selectedFiles![i]);
      if (uploadMode === "folder") {
        formData.append("relativePaths", selectedFiles![i].webkitRelativePath || "");
      }
    }
    formData.append("uploadMode", uploadMode);
    formData.append("password", password);
    
    // Add currentFolderId to formData if available
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + (90 - prev) / 10;
        });
      }, 500);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const data = await res.json();
      
      if (!res.ok) {
        setUploadMessage(data.message || "Upload failed. Invalid password.");
      } else {
        setUploadMessage(data.message || "Upload successful");
        
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
        setSelectedFiles(null);
        
        if (showDrive) {
          handleListDrive(currentFolderId);
        }
      }
    } catch (error) {
      setUploadMessage("Upload failed. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Modified to support directory navigation with password
  const handleListDrive = async (folderId: string | null = null) => {
  if (!showDrive) {
    // First time viewing drive - request password
    setPasswordAction("viewDrive");
    setPassword("");
    setPasswordError("");
    setModalType("viewDrive");
    setShowModal(true);
    return;
  }
  
  try {
    setLoadingFiles(true);
    setSearchQuery(""); // Reset search when navigating
    
    const queryParams = new URLSearchParams();
    if (folderId) {
      queryParams.append('folderId', folderId);
    }
    queryParams.append('password', password);
    
    const res = await fetch(`/api/list?${queryParams.toString()}`);
    
    if (!res.ok) {
      const data = await res.json();
      setUploadMessage(data.message || "Failed to load files. Invalid password.");
      setLoadingFiles(false);
      return;
    }
    
    const data = await res.json();
    
    setDriveFiles(data.files || []);
    setFilteredFiles(data.files || []);
    setCurrentFolderId(data.currentFolder?.id || null);
    setFolderPath(data.folderPath || []);
  } catch (error) {
    console.error("Failed to fetch files:", error);
    setUploadMessage("Failed to fetch files. Please try again.");
  } finally {
    setLoadingFiles(false);
  }
};

  // Function to handle folder navigation
  const navigateToFolder = (folderId: string) => {
    handleListDrive(folderId);
  };

  // Function to handle file/folder deletion
  const handleDelete = async (fileId: string, name: string, mimeType: string) => {
    setSelectedFile({ id: fileId, name, mimeType });
    setModalType("delete");
    setShowModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    if (!selectedFile) return;
    
    // Request password confirmation before deletion
    setPasswordAction("delete");
    setPassword("");
    setPasswordError("");
    setModalType("password");
    setShowModal(true);
  };
  
  // Execute deletion after password confirmation
  const executeDelete = async () => {
    if (!selectedFile) return;
    
    setShowModal(false);
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId: selectedFile.id,
          password: password
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Item successfully deleted");
        // Refresh file list
        handleListDrive(currentFolderId);
      } else {
        setUploadMessage(data.message || "Failed to delete item");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setUploadMessage("Failed to delete item");
    } finally {
      setSelectedFile(null);
      setLoadingFiles(false);
    }
  };

  // Function to handle file/folder move
  const handleMove = async (fileId: string, name: string, mimeType: string) => {
    setSelectedFile({ id: fileId, name, mimeType });
    setModalType("move");
    
    // Fetch available folders for moving
    try {
      const res = await fetch("/api/list");
      const data = await res.json();
      // Filter to only include folders
      const folders = data.files.filter((file: any) => 
        file.mimeType.includes('folder')
      ).map((folder: any) => ({
        id: folder.id,
        name: folder.name
      }));
      
      setAvailableFolders(folders);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  // Function to confirm move
  const confirmMove = async () => {
    if (!selectedFile || !targetFolderId) return;
    
    // Request password confirmation before move
    setPasswordAction("move");
    setPassword("");
    setPasswordError("");
    setModalType("password");
    setShowModal(true);
  };
  
  // Execute move after password confirmation
  const executeMove = async () => {
    if (!selectedFile || !targetFolderId) return;
    
    setShowModal(false);
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId: selectedFile.id,
          destinationFolderId: targetFolderId,
          password: password
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Item successfully moved");
        // Refresh file list
        handleListDrive(currentFolderId);
      } else {
        setUploadMessage(data.message || "Failed to move item");
      }
    } catch (error) {
      console.error("Move error:", error);
      setUploadMessage("Failed to move item");
    } finally {
      setSelectedFile(null);
      setTargetFolderId(null);
      setLoadingFiles(false);
    }
  };

  // Function to handle creating a new folder
  const handleCreateFolder = () => {
    setModalType("createFolder");
    setNewFolderName("");
    setShowModal(true);
  };

  // Function to confirm folder creation
  const confirmCreateFolder = async () => {
    if (!newFolderName) return;
    
    try {
      setShowModal(false);
      setLoadingFiles(true);
      const res = await fetch("/api/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          folderName: newFolderName,
          parentFolderId: currentFolderId
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Folder successfully created");
        // Refresh file list
        handleListDrive(currentFolderId);
      } else {
        setUploadMessage(data.message || "Failed to create folder");
      }
    } catch (error) {
      console.error("Create folder error:", error);
      setUploadMessage("Failed to create folder");
    } finally {
      setNewFolderName("");
      setLoadingFiles(false);
    }
  };
  
  
  const executeViewDrive = async () => {
  try {
    setLoadingFiles(true);
    
    const queryParams = new URLSearchParams();
    queryParams.append('password', password);
    
    const res = await fetch(`/api/list?${queryParams.toString()}`);
    
    if (!res.ok) {
      const data = await res.json();
      setUploadMessage(data.message || "Failed to load files. Invalid password.");
      setLoadingFiles(false);
      return;
    }
    
    const data = await res.json();
    
    // Set showDrive to true BEFORE updating the other states
    setShowDrive(true);
    setDriveFiles(data.files || []);
    setFilteredFiles(data.files || []);
    setCurrentFolderId(data.currentFolder?.id || null);
    setFolderPath(data.folderPath || []);
  } catch (error) {
    console.error("Failed to fetch files:", error);
    setUploadMessage("Failed to fetch files. Please try again.");
  } finally {
    setLoadingFiles(false);
  }
};

  const handlePasswordSubmit = () => {
  if (!password.trim()) {
    setPasswordError("Password is required");
    return;
  }
  
  // Execute the appropriate action based on passwordAction
  switch (passwordAction) {
    case "upload":
      executeUpload();
      break;
    case "delete":
      executeDelete();
      break;
    case "move":
      executeMove();
      break;
    case "viewDrive":
      setShowModal(false);
      executeViewDrive();  // Use a separate function instead of calling handleListDrive directly
      break;
  }
};

  const handleLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    
    // Hapus semua cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    // Hapus indexedDB databases jika diperlukan
    const databases = await window.indexedDB?.databases();
    databases?.forEach((db) => {
      if (db.name) window.indexedDB.deleteDatabase(db.name);
    });

    // Hapus service workers dan cache
    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registrations.forEach((registration) => registration.unregister());
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => caches.delete(cacheName));
      });
    }

    // Logout dari sesi NextAuth
    await signOut({ redirect: false });
    router.push("/login");
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('video')) return '🎬';
    if (mimeType.includes('audio')) return '🎵';
    return '📄';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Breadcrumb component for folder navigation
  const BreadcrumbNav = () => {
    if (!folderPath || folderPath.length === 0) return null;
    
    return (
      <nav className="flex mb-5 text-sm overflow-x-auto py-1">
        <ol className="flex items-center space-x-1">
          {folderPath.map((folder, index) => (
            <li key={folder.id} className="flex items-center whitespace-nowrap">
              {index > 0 && <span className="mx-1 text-gray-300">/</span>}
              <button
                onClick={() => navigateToFolder(folder.id)}
                className={`hover:text-blue-500 transition-colors ${
                  index === folderPath.length - 1
                    ? "font-medium text-blue-500"
                    : "text-gray-500"
                }`}
              >
                {folder.name}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  // Modal component for confirmation dialogs
  const Modal = () => {
    if (!showModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          {modalType === "delete" && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete "{selectedFile?.name}"?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
          
          {modalType === "move" && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Move "{selectedFile?.name}"</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Destination Folder
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={targetFolderId || ""}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                >
                  <option value="">Select folder...</option>
                  {availableFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  disabled={!targetFolderId}
                  className={`px-4 py-2 ${
                    !targetFolderId
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm font-medium rounded-md transition-colors`}
                >
                  Move
                </button>
              </div>
            </>
          )}
          
          {modalType === "createFolder" && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter folder name"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCreateFolder}
                  disabled={!newFolderName}
                  className={`px-4 py-2 ${
                    !newFolderName
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm font-medium rounded-md transition-colors`}
                >
                  Create Folder
                </button>
              </div>
            </>
          )}
          
          {modalType === "viewDrive" && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                View Google Drive Files
              </h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter admin password to access files
                </label>
                <input
                  type="password"
                  ref={passwordInputRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password}
                  className={`px-4 py-2 ${
                    !password
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm font-medium rounded-md transition-colors`}
                >
                  View Files
                </button>
              </div>
            </>
          )}

          {modalType === "password" && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Password Required
              </h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter admin password to proceed
                </label>
                <input
                  type="password"
                  ref={passwordInputRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password}
                  className={`px-4 py-2 ${
                    !password
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm font-medium rounded-md transition-colors`}
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <motion.div 
          className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center fixed top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto w-full px-6 flex justify-between items-center">
          <div className="flex items-center">
            <svg width="24" height="24" className="text-gray-700 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#0071e3"/>
            </svg>
            <h1 className="text-xl font-medium text-gray-800">Drive Uploader</h1>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#5F6368"/>
              </svg>
            </button>
            
            <AnimatePresence>
              {showDropdown && (
                <motion.div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 ring-1 ring-black ring-opacity-5"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Upload section */}
          <motion.div 
            className="bg-white rounded-xl shadow-sm overflow-hidden mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-6">
              <h2 className="text-xl font-medium text-gray-800 mb-5">Upload to Google Drive</h2>
              
              {/* Upload mode selector */}
              <div className="inline-flex rounded-lg mb-6 bg-gray-100 p-1">
                <button
                  onClick={() => setUploadMode("file")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === "file"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "bg-transparent text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setUploadMode("folder")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === "folder"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "bg-transparent text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Folder Upload
                </button>
              </div>

              {/* Hidden file inputs */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                multiple
                className="hidden"
              />
              <input 
                type="file" 
                ref={folderInputRef as React.RefObject<HTMLInputElement>}
                onChange={handleFileChange} 
                multiple
                // @ts-ignore
                webkitdirectory="true"
                className="hidden"
              />

              {/* Current folder indicator for uploads */}
              {currentFolderId && folderPath.length > 0 && (
                <motion.div 
                  className="mb-4 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-blue-600 flex items-center">
                    <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                    </svg>
                    Uploading to: {folderPath[folderPath.length - 1]?.name || 'Root'}
                  </p>
                </motion.div>
              )}

              {/* Drop zone */}
              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="text-blue-500 mb-4">
                  <motion.svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C8.08 7.14 9.94 6 12 6C14.62 6 16.88 7.86 17.39 10.43L17.69 11.93L19.22 12.04C20.78 12.14 22 13.45 22 15C22 16.65 20.65 18 19 18ZM8 13H10.55V16H13.45V13H16L12 9L8 13Z" fill="#0071e3"/>
                  </motion.svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {uploadMode === "file" 
                      ? "Drag files here or click to select" 
                      : "Click to select a folder"
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    All file types supported
                  </p>
                </div>
                
                {selectedFiles && selectedFiles.length > 0 && (
                  <motion.div 
                    className="mt-4 px-3 py-1 bg-blue-50 rounded-full text-blue-600 text-sm font-medium"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
                  </motion.div>
                )}
              </div>

              {/* Progress bar */}
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <motion.div 
                    className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                  </motion.div>
                  <div className="mt-1 text-right text-xs text-gray-500">
                    {Math.round(uploadProgress)}%
                  </div>
                </div>
              )}

              {/* Upload button and message */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFiles}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    (!selectedFiles || uploading)
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md focus:outline-none"
                  }`}
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : "Upload"}
                </button>
                
                {uploadMessage && (
                  <motion.div 
                    className={`text-sm font-medium ${
                      uploadMessage.includes("failed") || uploadMessage.includes("Please")
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {uploadMessage}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Files section */}
          <motion.div 
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-medium text-gray-800">Google Drive Files</h2>
                
                {showDrive && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateFolder}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Folder
                    </button>
                    <button
                      onClick={() => handleListDrive(currentFolderId)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {showDrive && (
                <div className="mb-5">
                  {/* Search bar */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search files and folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  
                  {/* Breadcrumb navigation */}
                  <BreadcrumbNav />
                </div>
              )}

              {showDrive ? (
                loadingFiles ? (
                  <div className="text-center py-16">
                    <motion.div 
                      className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-gray-500">Loading files...</p>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <div className="overflow-x-auto -mx-6">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredFiles.map((file) => (
                          <motion.tr 
                            key={file.id} 
                            className="hover:bg-gray-50 transition-colors"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="mr-2 text-lg">{getFileIcon(file.mimeType)}</span>
                                {file.mimeType.includes('folder') ? (
                                  <button
                                    onClick={() => navigateToFolder(file.id)}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    {file.name}
                                  </button>
                                ) : (
                                  <span className="text-sm text-gray-700">{file.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {file.mimeType.replace('application/', '').replace('vnd.google-apps.', '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {file.size ? formatFileSize(parseInt(file.size)) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleDelete(file.id, file.name, file.mimeType)}
                                  className="p-1.5 rounded-full hover:bg-red-50 text-red-500 focus:outline-none transition-colors"
                                  title="Delete"
                                >
                                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMove(file.id, file.name, file.mimeType)}
                                  className="p-1.5 rounded-full hover:bg-blue-50 text-blue-500 focus:outline-none transition-colors"
                                  title="Move"
                                >
                                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <motion.svg 
                      width="48" 
                      height="48" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="mx-auto mb-4 text-gray-300"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V6H9.17L11.17 8H20V18ZM14.08 10.62L17.15 13.69L14.08 16.76L12.67 15.34L14.36 13.69L12.66 12.04L14.08 10.62ZM6.92 16.76L9.99 13.69L6.92 10.62L8.34 12.04L10.03 13.69L8.33 15.34L6.92 16.76Z" fill="currentColor"/>
                    </motion.svg>
                    <p className="text-gray-500">
                      {searchQuery.trim() 
                        ? "No files found matching your search" 
                        : "No files found in this folder"}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-16">
                  <motion.button
                    onClick={() => handleListDrive()}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    View Files in Google Drive
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500">
            Drive Uploader &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Modal Dialog */}
      {showModal && <Modal />}
    </div>
  );
}