/* -------------------------------------------------------------
   PM MY CAR - CORE APPLICATION LOGIC
   ------------------------------------------------------------- */

// --- 1. CONFIGURATION & STATE ---
const CONFIG = {
    DB_NAME: "PM_My_Car_Local_Cache",
    DB_VERSION: 1,
    DEFAULT_FILE_NAME: "pm_my_car_db.json"
};

// Global App State
const state = {
    car: {
        name: "รถของฉัน",
        plate: "",
        mileage: 0
    },
    parts: [], // { id, name, category, description, lastServiceDate, lastServiceMileage, dueType, dueMonths, dueIntervalMileage }
    history: [], // { id, partId, partName, date, mileage, cost, mechanic, notes, receipt }
    mileageLog: [], // { date, mileage }
    lastUpdated: 0,
    
    // Sync States
    syncMode: 'none', // 'none' | 'local' | 'cloud'
    localFileHandle: null,
    cloudUser: null,
    cloudClientId: localStorage.getItem('pm_my_car_client_id') || '',
    cloudToken: null,
    cloudLastSynced: 0
};

// Flatpickr calendar instances
let fpLastDateInstance = null;
let fpTargetDateInstance = null;
let fpHistDateInstance = null;
let fpAddMileageDateInstance = null;

// Default Demo Data
const DEMO_DATA = {
    car: {
        name: "Honda Civic Sedan",
        plate: "กข 9999 กรุงเทพฯ",
        mileage: 82400
    },
    mileageLog: [
        { date: "2026-01-01", mileage: 75000 },
        { date: "2026-02-15", mileage: 77000 },
        { date: "2026-04-01", mileage: 79200 },
        { date: "2026-05-15", mileage: 81400 },
        { date: "2026-06-03", mileage: 82400 }
    ],
    parts: [
        {
            id: "part-1",
            name: "น้ำมันเครื่อง & กรองน้ำมันเครื่อง",
            category: "engine",
            description: "ใช้สังเคราะห์แท้ 0W-20 หรือ 5W-30 เกรด 10,000 กม.",
            lastServiceDate: "2026-01-10",
            lastServiceMileage: 76000,
            dueType: "both",
            dueMonths: 6,
            dueIntervalMileage: 10000
        },
        {
            id: "part-2",
            name: "ยางรถยนต์ 4 เส้น",
            category: "wheels",
            description: "ขนาดยาง 215/50R17 สลับยางทุก 10,000 กม. เปลี่ยนใหม่ทุก 50,000 กม.",
            lastServiceDate: "2024-05-15",
            lastServiceMileage: 45000,
            dueType: "both",
            dueMonths: 36,
            dueIntervalMileage: 50000
        },
        {
            id: "part-3",
            name: "ไส้กรองแอร์ (Cabin Filter)",
            category: "engine",
            description: "กรองอากาศห้องโดยสาร ป้องกันฝุ่น PM 2.5",
            lastServiceDate: "2025-11-20",
            lastServiceMileage: 74200,
            dueType: "both",
            dueMonths: 12,
            dueIntervalMileage: 20000
        },
        {
            id: "part-4",
            name: "เบี้ยประกันภัยรถยนต์ (ชั้น 1)",
            category: "documents",
            description: "ต่ออายุก่อนวันที่ 15 สิงหาคม ของทุกปี บริษัทวิริยะประกันภัย",
            lastServiceDate: "2025-08-15",
            lastServiceMileage: 68000,
            dueType: "time",
            dueMonths: 12,
            dueIntervalMileage: 0
        },
        {
            id: "part-5",
            name: "ภาษีรถยนต์ประจำปี + พรบ.",
            category: "documents",
            description: "ตรวจสภาพรถก่อนชำระภาษีสะสม",
            lastServiceDate: "2025-09-01",
            lastServiceMileage: 69500,
            dueType: "time",
            dueMonths: 12,
            dueIntervalMileage: 0
        },
        {
            id: "part-6",
            name: "ผ้าเบรกหน้า",
            category: "wheels",
            description: "เช็คความหนาผ้าเบรกทุกครั้งที่สลับยาง",
            lastServiceDate: "2023-10-05",
            lastServiceMileage: 38000,
            dueType: "mileage",
            dueMonths: 0,
            dueIntervalMileage: 60000
        }
    ],
    history: [
        {
            id: "hist-1",
            partId: "part-1",
            partName: "น้ำมันเครื่อง & กรองน้ำมันเครื่อง",
            date: "2026-01-10",
            mileage: 76000,
            cost: 1850.00,
            mechanic: "ศูนย์บริการมาตรฐาน H-Drive",
            notes: "ใช้น้ำมันเครื่องสังเคราะห์แท้ 0W-20 ฟรีค่าแรงเช็คระยะ",
            receipt: ""
        },
        {
            id: "hist-2",
            partId: "part-4",
            partName: "เบี้ยประกันภัยรถยนต์ (ชั้น 1)",
            date: "2025-08-15",
            mileage: 68000,
            cost: 16500.00,
            mechanic: "วิริยะประกันภัย โบรกเกอร์ออนไลน์",
            notes: "ทุนประกัน 450,000 บาท ไม่มีค่าเสียหายส่วนแรก",
            receipt: ""
        },
        {
            id: "hist-3",
            partId: "part-3",
            partName: "ไส้กรองแอร์ (Cabin Filter)",
            date: "2025-11-20",
            mileage: 74200,
            cost: 350.00,
            mechanic: "ซื้อออนไลน์ เปลี่ยนเอง",
            notes: "เปลี่ยนไส้กรองยี่ห้อ Sakura OEM ถอดเปลี่ยนเองง่ายๆ ใต้เก๊ะเก็บของ",
            receipt: ""
        }
    ],
    lastUpdated: Date.now()
};

// Temporary in-memory attachments across modules
let currentSelectedAttachments = []; // Service History attachments
let currentPartAttachments = [];     // Parts Management attachments
let currentCarDocuments = [];        // Car Info & Official Documents
let currentSelectedReceiptBase64 = "";
let currentSelectedReceiptName = "";

// Active context for compressor helper ('history', 'part', 'car', 'standalone')
let activeCompressorContext = 'history';
let activeCompressorTargetAttachment = null;

// Helper to normalize attachments from a history record (supports both single receipt and multiple attachments)
function getRecordAttachments(record) {
    if (!record) return [];
    if (Array.isArray(record.attachments) && record.attachments.length > 0) {
        return record.attachments;
    }
    if (record.receipt) {
        return [{
            id: 'att-legacy-' + (record.id || '1'),
            name: record.receiptName || 'ไฟล์แนบ',
            data: record.receipt,
            type: record.receipt.startsWith('data:image/') ? 'image' : 'doc'
        }];
    }
    return [];
}

// --- 2. INDEXEDDB FOR PERSISTENCE & FILE HANDLE CACHE ---
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        
        request.onupgradeneeded = function(e) {
            const dbInstance = e.target.result;
            if (!dbInstance.objectStoreNames.contains("stateCache")) {
                dbInstance.createObjectStore("stateCache");
            }
        };

        request.onsuccess = function(e) {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = function(e) {
            console.error("IndexedDB Open Error:", e.target.error);
            reject(e.target.error);
        };
    });
}

function saveStateToCache() {
    if (!db) return;
    const transaction = db.transaction(["stateCache"], "readwrite");
    const store = transaction.objectStore("stateCache");
    
    // Save data state
    const dataToSave = {
        car: state.car,
        parts: state.parts,
        history: state.history,
        mileageLog: state.mileageLog,
        lastUpdated: state.lastUpdated
    };
    store.put(dataToSave, "appData");
    
    // Save file handle if exists (File handles can be stored in IndexedDB in modern browsers!)
    if (state.localFileHandle) {
        store.put(state.localFileHandle, "fileHandle");
    }
}

function loadStateFromCache() {
    return new Promise((resolve) => {
        if (!db) return resolve(false);
        const transaction = db.transaction(["stateCache"], "readonly");
        const store = transaction.objectStore("stateCache");
        
        const dataReq = store.get("appData");
        const handleReq = store.get("fileHandle");
        
        transaction.oncomplete = function() {
            if (dataReq.result) {
                state.car = dataReq.result.car || state.car;
                state.parts = dataReq.result.parts || state.parts;
                state.history = dataReq.result.history || state.history;
                state.mileageLog = dataReq.result.mileageLog || [];
                state.lastUpdated = dataReq.result.lastUpdated || Date.now();
            }
            if (handleReq.result) {
                state.localFileHandle = handleReq.result;
                state.syncMode = 'local';
            }
            resolve(true);
        };
        
        transaction.onerror = function() {
            resolve(false);
        };
    });
}

function clearCache() {
    if (!db) return;
    const transaction = db.transaction(["stateCache"], "readwrite");
    const store = transaction.objectStore("stateCache");
    store.clear();
}

// --- 3. MICROSOFT MSAL (ONEDRIVE SYNC FOR MOBILE/CLOUD) ---
let msalClient = null;

function setupMSAL() {
    if (!state.cloudClientId) {
        setSyncBadge("offline", "ยังไม่ได้ผูก Client ID สำหรับ Cloud");
        return;
    }

    const msalConfig = {
        auth: {
            clientId: state.cloudClientId,
            authority: "https://login.microsoftonline.com/common",
            redirectUri: window.location.origin + window.location.pathname
        },
        cache: {
            cacheLocation: "localStorage",
            storeAuthStateInCookie: true
        }
    };

    try {
        msalClient = new msal.PublicClientApplication(msalConfig);
        
        // Handle redirect or check active accounts
        const accounts = msalClient.getAllAccounts();
        if (accounts.length > 0) {
            state.cloudUser = accounts[0];
            state.syncMode = 'cloud';
            setSyncBadge("online", `คลาวด์: ${state.cloudUser.username}`);
            toggleCloudButtons(true);
            
            // Check OneDrive for updates silently
            syncWithCloudOneDrive(true);
        } else {
            setSyncBadge("offline", "เข้าสู่ระบบคลาวด์เพื่อซิงก์");
            toggleCloudButtons(false);
        }
    } catch (e) {
        console.error("MSAL Config Error:", e);
        setSyncBadge("offline", "เกิดข้อผิดพลาดในการตั้งค่า MSAL");
    }
}

async function getCloudToken() {
    if (!msalClient || !state.cloudUser) return null;
    
    const tokenRequest = {
        scopes: ["Files.ReadWrite"],
        account: state.cloudUser
    };
    
    try {
        const response = await msalClient.acquireTokenSilent(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.warn("Silent token acquisition failed. Prompting popup...", error);
        if (error instanceof msal.InteractionRequiredAuthError) {
            try {
                const response = await msalClient.acquireTokenPopup(tokenRequest);
                return response.accessToken;
            } catch (popupError) {
                console.error("Popup token acquisition failed:", popupError);
            }
        }
    }
    return null;
}

async function loginCloud() {
    if (!msalClient) {
        alert("กรุณากรอก Client ID ในแท็บตั้งค่าและบันทึกก่อนเชื่อมต่อคลาวด์");
        return;
    }
    
    const loginRequest = {
        scopes: ["Files.ReadWrite"]
    };
    
    try {
        const response = await msalClient.loginPopup(loginRequest);
        state.cloudUser = response.account;
        state.syncMode = 'cloud';
        setSyncBadge("online", `คลาวด์: ${state.cloudUser.username}`);
        toggleCloudButtons(true);
        
        // Download data from Cloud immediately after login
        await syncWithCloudOneDrive(false);
    } catch (error) {
        console.error("MSAL Login Error:", error);
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    }
}

function logoutCloud() {
    if (!msalClient) return;
    const logoutRequest = {
        account: msalClient.getAccountByUsername(state.cloudUser.username)
    };
    msalClient.logoutPopup(logoutRequest).then(() => {
        state.cloudUser = null;
        state.syncMode = 'none';
        setSyncBadge("offline", "ออกจากระบบคลาวด์แล้ว");
        toggleCloudButtons(false);
        saveStateToCache();
        renderAll();
    });
}

// Push local data to OneDrive Cloud
async function pushDataToCloud() {
    const token = await getCloudToken();
    if (!token) {
        alert("ไม่สามารถรับสิทธิ์การแก้ไขไฟล์ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
    }

    setSyncBadge("loading", "กำลังอัปโหลดฐานข้อมูลขึ้นคลาวด์...");
    
    const fileContent = JSON.stringify({
        car: state.car,
        parts: state.parts,
        history: state.history,
        mileageLog: state.mileageLog,
        lastUpdated: state.lastUpdated
    }, null, 2);

    // Path in OneDrive: /AntiGravity/PM My Car/pm_my_car_db.json
    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/AntiGravity/PM%20My%20Car/pm_my_car_db.json:/content";
    
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: fileContent
        });

        if (response.ok) {
            state.cloudLastSynced = Date.now();
            setSyncBadge("online", `ซิงก์ล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`);
            alert("บันทึกข้อมูลขึ้น OneDrive สำเร็จแล้ว!");
        } else {
            const errText = await response.text();
            throw new Error(`Upload Failed: ${errText}`);
        }
    } catch (error) {
        console.error("Upload to OneDrive failed:", error);
        setSyncBadge("offline", "อัปโหลดล้มเหลว");
        alert("อัปโหลดไฟล์ล้มเหลว: " + error.message);
    }
}

// Check OneDrive and optionally download
async function syncWithCloudOneDrive(silent = false) {
    const token = await getCloudToken();
    if (!token) return;

    if (!silent) {
        setSyncBadge("loading", "กำลังดึงข้อมูลจาก OneDrive Cloud...");
    }

    const url = "https://graph.microsoft.com/v1.0/me/drive/root:/AntiGravity/PM%20My%20Car/pm_my_car_db.json";
    
    try {
        // Step 1: Check metadata to compare timestamp
        const metaRes = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (metaRes.status === 404) {
            // File does not exist yet
            if (!silent) {
                if (confirm("ไม่พบไฟล์ฐานข้อมูลใน OneDrive ต้องการอัปโหลดข้อมูลปัจจุบันขึ้นไปเลยหรือไม่?")) {
                    await pushDataToCloud();
                }
            } else {
                setSyncBadge("online", "พร้อมอัปโหลดฐานข้อมูลก้อนแรก");
            }
            return;
        }

        if (!metaRes.ok) {
            throw new Error("ล้มเหลวในการอ่านไฟล์เมตาดาต้า");
        }

        // Step 2: Download file contents
        const contentRes = await fetch(`${url}:/content`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (contentRes.ok) {
            const cloudDb = await contentRes.json();
            
            // Compare timestamps
            if (cloudDb.lastUpdated && cloudDb.lastUpdated > state.lastUpdated) {
                if (silent && state.lastUpdated > 0) {
                    // Show a toast banner instead of intrusive confirm dialog if we have existing local data
                    document.getElementById('cloud-toast').style.display = 'flex';
                } else {
                    // Automatically load if local state is empty/new
                    applyCloudData(cloudDb);
                }
            } else if (cloudDb.lastUpdated && cloudDb.lastUpdated < state.lastUpdated && !silent) {
                if (confirm("ข้อมูลบนคอมพิวเตอร์ของคุณใหม่กว่าข้อมูลใน OneDrive Cloud ต้องการทับข้อมูลบน Cloud หรือไม่?")) {
                    await pushDataToCloud();
                } else {
                    applyCloudData(cloudDb);
                }
            } else {
                if (!silent) {
                    alert("ข้อมูลของคุณตรงกับใน OneDrive คลาวด์แล้ว");
                }
                setSyncBadge("online", `ข้อมูลตรงกับคลาวด์`);
            }
        }
    } catch (error) {
        console.error("Cloud OneDrive Sync failed:", error);
        setSyncBadge("offline", "เชื่อมต่อคลาวด์ล้มเหลว");
        if (!silent) {
            alert("ดึงข้อมูลไม่สำเร็จ: " + error.message);
        }
    }
}

function applyCloudData(cloudDb) {
    state.car = cloudDb.car || state.car;
    state.parts = cloudDb.parts || state.parts;
    state.history = cloudDb.history || state.history;
    state.mileageLog = cloudDb.mileageLog || [];
    state.lastUpdated = cloudDb.lastUpdated || Date.now();
    
    saveStateToCache();
    renderAll();
    setSyncBadge("online", `ซิงก์สำเร็จ: ${new Date().toLocaleTimeString('th-TH')}`);
    document.getElementById('cloud-toast').style.display = 'none';
}

// --- 4. LOCAL FILE SYSTEM ACCESS API (PC ONEDRIVE SYNC) ---
async function verifyLocalFilePermissions(fileHandle, readWrite) {
    const options = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

async function selectLocalFile() {
    try {
        const pickerOpts = {
            types: [{
                description: 'JSON Database File',
                accept: { 'application/json': ['.json'] }
            }],
            excludeAcceptAllOption: true,
            multiple: false
        };

        const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
        state.localFileHandle = fileHandle;
        state.syncMode = 'local';
        
        await readFromLocalFile();
        saveStateToCache();
    } catch (e) {
        console.error("File selection aborted or failed:", e);
    }
}

async function readFromLocalFile() {
    if (!state.localFileHandle) return;
    
    try {
        const isPermitted = await verifyLocalFilePermissions(state.localFileHandle, false);
        if (!isPermitted) {
            setSyncBadge("offline", "ขาดสิทธิ์ในการอ่านไฟล์ในเครื่อง");
            return;
        }

        const file = await state.localFileHandle.getFile();
        const text = await file.text();
        
        if (text.trim() === '') {
            // Empty file, ready to populate
            setSyncBadge("local-file", "ไฟล์ว่างเปล่า (รอการบันทึก)");
            return;
        }

        const localDb = JSON.parse(text);
        
        // Load data in
        state.car = localDb.car || state.car;
        state.parts = localDb.parts || state.parts;
        state.history = localDb.history || state.history;
        state.mileageLog = localDb.mileageLog || [];
        state.lastUpdated = localDb.lastUpdated || Date.now();

        setSyncBadge("local-file", `เชื่อมโยงไฟล์เครื่องสำเร็จ`);
        document.getElementById('local-file-path-display').innerText = `เชื่อมต่อกับ: ${state.localFileHandle.name}`;
        
        renderAll();
    } catch (error) {
        console.error("Read local file failed:", error);
        setSyncBadge("offline", "อ่านไฟล์ผิดพลาด");
        alert("ไม่สามารถอ่านไฟล์ได้: " + error.message);
    }
}

async function writeToLocalFile() {
    if (!state.localFileHandle) return;

    try {
        const isPermitted = await verifyLocalFilePermissions(state.localFileHandle, true);
        if (!isPermitted) {
            setSyncBadge("offline", "ขาดสิทธิ์เขียนทับไฟล์ในเครื่อง");
            return;
        }

        const writable = await state.localFileHandle.createWritable();
        const data = {
            car: state.car,
            parts: state.parts,
            history: state.history,
            mileageLog: state.mileageLog,
            lastUpdated: state.lastUpdated
        };
        
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        
        setSyncBadge("local-file", `เซฟลงเครื่องสำเร็จ (${new Date().toLocaleTimeString('th-TH')})`);
    } catch (error) {
        console.error("Write local file failed:", error);
        setSyncBadge("offline", "เขียนข้อมูลลงไฟล์ล้มเหลว");
    }
}

// Try to auto-connect to stored handle on boot
async function attemptRestoreLocalFile() {
    if (state.localFileHandle) {
        try {
            await readFromLocalFile();
        } catch (e) {
            console.warn("Could not auto-restore file handle access:", e);
        }
    }
}

// --- 5. DATA MUTATIONS & AUTO SAVE ---
function updateState(updaterFn) {
    updaterFn();
    state.lastUpdated = Date.now();
    
    // Save to Cache
    saveStateToCache();
    
    // Trigger Sync based on mode
    if (state.syncMode === 'local' && state.localFileHandle) {
        writeToLocalFile();
    } else if (state.syncMode === 'cloud' && state.cloudUser) {
        // Send asynchronously to cloud
        pushDataToCloud();
    }
    
    renderAll();
}

// --- 6. PDF & IMAGE COMPRESSION ENGINE (PDF24 STYLE - CLIENT-SIDE) ---

// Robust PDF processing libraries loader & validator (PDF.js + PDF-Lib)
let pdfLibrariesPromise = null;

function ensurePdfLibraries() {
    if (window.pdfjsLib && window.PDFLib) {
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        return Promise.resolve(true);
    }

    if (pdfLibrariesPromise) {
        return pdfLibrariesPromise;
    }

    pdfLibrariesPromise = (async () => {
        const loadScript = (primaryUrl, fallbackUrl) => {
            return new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = primaryUrl;
                s.crossOrigin = 'anonymous';
                s.onload = () => resolve(true);
                s.onerror = () => {
                    console.warn(`[PDF Engine] Primary CDN failed: ${primaryUrl}, trying fallback: ${fallbackUrl}`);
                    const fb = document.createElement('script');
                    fb.src = fallbackUrl;
                    fb.crossOrigin = 'anonymous';
                    fb.onload = () => resolve(true);
                    fb.onerror = () => {
                        console.error(`[PDF Engine] Fallback CDN failed: ${fallbackUrl}`);
                        resolve(false);
                    };
                    document.head.appendChild(fb);
                };
                document.head.appendChild(s);
            });
        };

        // 1. Ensure PDF.js
        if (!window.pdfjsLib) {
            await loadScript(
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
                'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
            );
        }
        if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // 2. Ensure PDFLib
        if (!window.PDFLib) {
            await loadScript(
                'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
                'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
            );
        }

        if (!window.pdfjsLib || !window.PDFLib) {
            pdfLibrariesPromise = null;
            throw new Error("ไม่สามารถโหลดไลบรารีประมวลผล PDF ได้ กรุณาเชื่อมต่ออินเทอร์เน็ต");
        }
        return true;
    })();

    return pdfLibrariesPromise;
}

// Prefetch PDF engine in background
if (typeof window !== 'undefined') {
    setTimeout(() => {
        ensurePdfLibraries().catch(e => console.warn("[PDF Engine] Prefetch notice:", e.message));
    }, 1200);
}

// Format byte size into readable string (B, KB, MB)
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Convert Data URI string into Uint8Array buffer
function dataUriToUint8Array(dataUri) {
    const base64 = dataUri.split(',')[1] || dataUri;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Image compression via HTML5 Canvas (HD 1280px, quality: 0.68)
function compressImage(fileOrDataUrl, options = {}) {
    const {
        maxDimension = 1280,
        quality = 0.68
    } = options;

    return new Promise((resolve, reject) => {
        const processDataUrl = (dataUrl, origSize) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                const compressedSize = Math.round((compressedBase64.length * 3) / 4);
                const originalSize = origSize || Math.round((dataUrl.length * 3) / 4);
                const savings = originalSize > compressedSize ? Math.round(((originalSize - compressedSize) / originalSize) * 100) : 0;

                resolve({
                    dataUrl: compressedBase64,
                    originalSize: originalSize,
                    compressedSize: compressedSize,
                    savingsPercent: savings,
                    thumbnail: compressedBase64
                });
            };
            img.onerror = (err) => reject(err);
        };

        if (typeof fileOrDataUrl === 'string') {
            processDataUrl(fileOrDataUrl, Math.round((fileOrDataUrl.length * 3) / 4));
        } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => processDataUrl(e.target.result, fileOrDataUrl.size);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(fileOrDataUrl);
        } else {
            reject(new Error("Unsupported image input"));
        }
    });
}

// PDF compression via PDF.js rendering & PDF-Lib reassembly (Pure client-side, PDF24 style)
async function compressPdf(fileOrDataUrl, options = {}) {
    const {
        maxDimension = 1280,
        quality = 0.70,
        onProgress = null
    } = options;

    await ensurePdfLibraries();

    // Convert input to ArrayBuffer
    let arrayBuffer;
    let originalSize = 0;

    if (fileOrDataUrl instanceof ArrayBuffer) {
        arrayBuffer = fileOrDataUrl;
        originalSize = arrayBuffer.byteLength;
    } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
        originalSize = fileOrDataUrl.size;
        arrayBuffer = await fileOrDataUrl.arrayBuffer();
    } else if (typeof fileOrDataUrl === 'string') {
        const bytes = dataUriToUint8Array(fileOrDataUrl);
        originalSize = bytes.byteLength;
        arrayBuffer = bytes.buffer;
    } else {
        throw new Error("Unsupported PDF source");
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // Create new lightweight PDF using pdf-lib
    const newPdfDoc = await PDFLib.PDFDocument.create();
    let firstPageThumbnail = null;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (onProgress) {
            onProgress(pageNum, numPages);
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewportUnscaled = page.getViewport({ scale: 1.0 });

        // Calculate scale to maintain sharp legibility while capping max dimensions
        let scale = 1.5; // Base 144 DPI sharp scale for crisp Thai typography
        const maxDim = Math.max(viewportUnscaled.width, viewportUnscaled.height);
        if (maxDim * scale > maxDimension) {
            scale = maxDimension / maxDim;
        }
        if (scale < 1.0) scale = 1.0;

        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        const pageJpgDataUrl = canvas.toDataURL('image/jpeg', quality);

        if (pageNum === 1) {
            firstPageThumbnail = pageJpgDataUrl;
        }

        const embeddedImage = await newPdfDoc.embedJpg(pageJpgDataUrl);
        const pdfPage = newPdfDoc.addPage([viewportUnscaled.width, viewportUnscaled.height]);
        pdfPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: viewportUnscaled.width,
            height: viewportUnscaled.height
        });
    }

    const compressedPdfBytes = await newPdfDoc.save();
    const compressedPdfBase64 = await newPdfDoc.saveAsBase64({ dataUri: true });
    const compressedSize = compressedPdfBytes.byteLength;

    // If compressed size is actually smaller, use it; otherwise fallback to original
    const useCompressed = compressedSize < originalSize;
    const finalDataUrl = useCompressed ? compressedPdfBase64 : (typeof fileOrDataUrl === 'string' ? fileOrDataUrl : compressedPdfBase64);
    const finalSize = useCompressed ? compressedSize : originalSize;
    const savings = originalSize > finalSize ? Math.round(((originalSize - finalSize) / originalSize) * 100) : 0;

    return {
        dataUrl: finalDataUrl,
        originalSize: originalSize,
        compressedSize: finalSize,
        pageCount: numPages,
        thumbnail: firstPageThumbnail,
        savingsPercent: savings
    };
}

// Auto-compress legacy uncompressed attachments in memory / database
async function optimizeExistingAttachments() {
    let modified = false;
    try {
        await ensurePdfLibraries();
        const checkAndCompress = async (att) => {
            if (!att || !att.data) return false;
            const isPdf = (att.name && att.name.toLowerCase().endsWith('.pdf')) || (att.data && att.data.startsWith('data:application/pdf')) || att.docType === 'pdf';
            if (isPdf && (!att.compressedSize || (att.originalSize && att.compressedSize === att.originalSize && att.originalSize > 200 * 1024))) {
                console.log(`[Auto-Optimizer] Optimizing legacy PDF: ${att.name || 'document'}`);
                const res = await compressPdf(att.data, { maxDimension: 1280, quality: 0.70 });
                att.data = res.dataUrl;
                att.thumbnail = res.thumbnail;
                att.docType = 'pdf';
                att.pageCount = res.pageCount;
                att.originalSize = res.originalSize;
                att.compressedSize = res.compressedSize;
                att.savingsPercent = res.savingsPercent;
                return true;
            }
            return false;
        };

        if (state.history && Array.isArray(state.history)) {
            for (const h of state.history) {
                const atts = getRecordAttachments(h);
                for (const a of atts) {
                    if (await checkAndCompress(a)) modified = true;
                }
            }
        }
        if (state.parts && Array.isArray(state.parts)) {
            for (const p of state.parts) {
                if (p.attachments && Array.isArray(p.attachments)) {
                    for (const a of p.attachments) {
                        if (await checkAndCompress(a)) modified = true;
                    }
                }
            }
        }
        if (state.car && state.car.documents && Array.isArray(state.car.documents)) {
            for (const a of state.car.documents) {
                if (await checkAndCompress(a)) modified = true;
            }
        }

        if (modified) {
            console.log("[Auto-Optimizer] All legacy attachments successfully compressed and optimized!");
            saveStateToCache();
        }
    } catch (e) {
        console.warn("[Auto-Optimizer] Notice:", e.message);
    }
}

// Universal attachment processor across modules
async function processAttachmentFiles(files, targetArray, previewRenderFn, statusElemId, context = 'history') {
    if (!files || files.length === 0) return;
    const statusElem = document.getElementById(statusElemId);
    if (statusElem) {
        statusElem.style.display = 'flex';
        statusElem.innerHTML = `<span class="spinner">⏳</span> กำลังประมวลผลและบีบอัดไฟล์ (สไตล์ PDF24)...`;
    }

    const MAX_MB = 20; // Support up to 20MB scans because client-side compression reduces to ~100KB!
    for (const file of files) {
        if (file.size > MAX_MB * 1024 * 1024) {
            alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (${(file.size / (1024 * 1024)).toFixed(1)} MB)\nกรุณาเลือกไฟล์ขนาดไม่เกิน ${MAX_MB} MB`);
            continue;
        }

        const attachId = 'att-' + Math.random().toString(36).substr(2, 9);
        const lowerName = file.name.toLowerCase();

        if (file.type.startsWith('image/')) {
            try {
                if (statusElem) {
                    statusElem.innerHTML = `<span class="spinner">⏳</span> กำลังบีบอัดรูปภาพ "${file.name}" (HD)...`;
                }
                const res = await compressImage(file);
                targetArray.push({
                    id: attachId,
                    name: file.name,
                    data: res.dataUrl,
                    thumbnail: res.thumbnail,
                    type: 'image',
                    originalSize: res.originalSize,
                    compressedSize: res.compressedSize,
                    savingsPercent: res.savingsPercent
                });
            } catch (err) {
                console.error("Image compression error:", err);
                alert(`เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: ${file.name}`);
            }
        } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
            try {
                if (statusElem) {
                    statusElem.innerHTML = `<span class="spinner">⏳</span> กำลังบีบอัด PDF "${file.name}" อัตโนมัติ (HD คมชัดประหยัดพื้นที่)...`;
                }
                await ensurePdfLibraries();
                const res = await compressPdf(file, {
                    maxDimension: 1280,
                    quality: 0.70,
                    onProgress: (curr, total) => {
                        if (statusElem) {
                            statusElem.innerHTML = `<span class="spinner">⏳</span> กำลังบีบอัด PDF "${file.name}" หน้า ${curr}/${total}...`;
                        }
                    }
                });
                targetArray.push({
                    id: attachId,
                    name: file.name,
                    data: res.dataUrl,
                    thumbnail: res.thumbnail,
                    type: 'doc',
                    docType: 'pdf',
                    pageCount: res.pageCount,
                    originalSize: res.originalSize,
                    compressedSize: res.compressedSize,
                    savingsPercent: res.savingsPercent
                });
            } catch (err) {
                console.error("PDF compression error:", err);
                alert(`เกิดข้อผิดพลาดในการบีบอัดไฟล์ PDF "${file.name}":\n${err.message}\n\n* เพื่อความปลอดภัยและประหยัดพื้นที่ระยะยาว ระบบจะรับเฉพาะไฟล์ PDF ที่ผ่านการบีบอัดแล้วเท่านั้น`);
            }
        } else {
            // Other office documents
            await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    targetArray.push({
                        id: attachId,
                        name: file.name,
                        data: e.target.result,
                        type: 'doc',
                        originalSize: file.size,
                        compressedSize: file.size
                    });
                    resolve();
                };
                reader.onerror = () => {
                    alert(`ไม่สามารถอ่านไฟล์: ${file.name}`);
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }
    }

    if (statusElem) {
        statusElem.style.display = 'none';
    }
    if (typeof previewRenderFn === 'function') {
        previewRenderFn();
    }
}

// --- 7. MAINTENANCE BUSINESS LOGIC (CALCULATE DUES) ---

// Calculate average daily driving distance in km
function calculateAverageDailyKm() {
    if (!state.mileageLog || state.mileageLog.length < 2) {
        return 30; // Fallback default value (30 km/day)
    }
    
    // Filter out invalid records (e.g. mileage is 0 or non-numeric)
    const validLogs = state.mileageLog.filter(log => log && log.date && typeof log.mileage === 'number' && log.mileage > 0);
    
    if (validLogs.length < 2) {
        return 30;
    }
    
    // Sort chronologically
    const sortedLogs = [...validLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Clean up chronological regressions by scanning backwards from the latest entry
    const cleanedLogs = [];
    let lastValidMileage = Infinity;
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
        const log = sortedLogs[i];
        if (log.mileage < lastValidMileage) {
            cleanedLogs.unshift(log);
            lastValidMileage = log.mileage;
        }
    }
    
    if (cleanedLogs.length < 2) {
        return 30;
    }
    
    // Calculate based on recent history (up to the last 5 entries to represent recent behavior)
    const recentLogs = cleanedLogs.slice(-5);
    const earliest = recentLogs[0];
    const latest = recentLogs[recentLogs.length - 1];
    
    let distanceDiff = latest.mileage - earliest.mileage;
    let timeDiffMs = new Date(latest.date) - new Date(earliest.date);
    let timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
    
    // Fallback if recent calculation yields invalid values (e.g. all on the same day)
    if (timeDiffDays <= 0 || distanceDiff <= 0) {
        const globalEarliest = cleanedLogs[0];
        const globalLatest = cleanedLogs[cleanedLogs.length - 1];
        distanceDiff = globalLatest.mileage - globalEarliest.mileage;
        timeDiffMs = new Date(globalLatest.date) - new Date(globalEarliest.date);
        timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
    }
    
    if (timeDiffDays <= 0 || distanceDiff <= 0) {
        return 30;
    }
    
    const avg = distanceDiff / timeDiffDays;
    
    // Bound the average between 2 km/day and 500 km/day to keep predictions sensible
    return Math.min(500, Math.max(2, avg));
}

// Log a mileage point to history
function logMileagePoint(date, mileage, silent = false) {
    if (!state.mileageLog) state.mileageLog = [];
    
    // Check if record for this date already exists
    const existingIdx = state.mileageLog.findIndex(log => log.date === date);
    
    if (existingIdx !== -1) {
        // Update if the new mileage is higher or newer
        if (mileage >= state.mileageLog[existingIdx].mileage) {
            state.mileageLog[existingIdx].mileage = mileage;
        }
    } else {
        state.mileageLog.push({ date, mileage });
    }
    
    // Sort logs chronologically
    state.mileageLog.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Ensure state car mileage is updated if logged mileage is higher
    if (mileage > state.car.mileage) {
        state.car.mileage = mileage;
    }
    
    if (!silent) {
        updateState(() => {});
    }
}

// Format predicted date helper
function formatThaiDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function calculatePartStatus(part, currentMileage) {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const lastDate = new Date(part.lastServiceDate);
    lastDate.setHours(0,0,0,0);
    
    const avgDailyKm = calculateAverageDailyKm();
    
    let daysRemaining = Infinity;
    let timePercent = 1.0;
    let nextDueDate = null;
    
    // 1. Time-based calculation (recurring interval)
    if (part.dueType === 'time' || part.dueType === 'both') {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + parseInt(part.dueMonths || 0));
        nextDueDate = nextDate;
        
        const msDiff = nextDate - today;
        daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        
        const totalDurationDays = Math.max(1, (parseInt(part.dueMonths) || 1) * 30.4);
        timePercent = Math.max(0, daysRemaining / totalDurationDays);
    } 
    // 1.2 Target Date calculation (fixed target date/expiration)
    else if (part.dueType === 'target_date' || part.dueType === 'target_both') {
        if (part.targetDate) {
            const targetDateObj = new Date(part.targetDate);
            targetDateObj.setHours(0,0,0,0);
            nextDueDate = targetDateObj;
            
            const msDiff = targetDateObj - today;
            daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
            
            let totalDurationDays = 365;
            if (!isNaN(lastDate.getTime()) && targetDateObj > lastDate) {
                totalDurationDays = Math.max(1, Math.ceil((targetDateObj - lastDate) / (1000 * 60 * 60 * 24)));
            }
            timePercent = Math.max(0, daysRemaining / totalDurationDays);
        } else {
            daysRemaining = 0;
            timePercent = 0;
        }
    }
    
    let mileageRemaining = Infinity;
    let mileagePercent = 1.0;
    let nextDueMileage = null;
    let predictedDueDate = null;
    let predictedDays = Infinity;
    
    // 2. Mileage-based calculation (recurring interval)
    if (part.dueType === 'mileage' || part.dueType === 'both') {
        nextDueMileage = parseInt(part.lastServiceMileage || 0) + parseInt(part.dueIntervalMileage || 0);
        mileageRemaining = nextDueMileage - currentMileage;
        
        const interval = Math.max(100, parseInt(part.dueIntervalMileage) || 10000);
        mileagePercent = Math.max(0, mileageRemaining / interval);
        
        // Calculate predicted date based on mileage usage rate
        if (mileageRemaining > 0 && avgDailyKm > 0) {
            predictedDays = Math.ceil(mileageRemaining / avgDailyKm);
            const predDate = new Date(today);
            predDate.setDate(predDate.getDate() + predictedDays);
            predictedDueDate = predDate;
        } else if (mileageRemaining <= 0) {
            predictedDays = 0;
            predictedDueDate = today;
        }
    } 
    // 2.2 Target Mileage calculation (fixed target odometer)
    else if (part.dueType === 'target_mileage' || part.dueType === 'target_both') {
        nextDueMileage = parseInt(part.targetMileage) || 0;
        mileageRemaining = nextDueMileage - currentMileage;
        
        const lastKm = parseInt(part.lastServiceMileage) || 0;
        const totalInterval = Math.max(100, nextDueMileage - lastKm);
        mileagePercent = Math.max(0, mileageRemaining / totalInterval);
        
        if (mileageRemaining > 0 && avgDailyKm > 0) {
            predictedDays = Math.ceil(mileageRemaining / avgDailyKm);
            const predDate = new Date(today);
            predDate.setDate(predDate.getDate() + predictedDays);
            predictedDueDate = predDate;
        } else if (mileageRemaining <= 0) {
            predictedDays = 0;
            predictedDueDate = today;
        }
    }
    
    // 3. Combined status & explanations
    let percent = 1.0;
    let status = 'healthy'; // 'healthy' | 'warning' | 'overdue'
    let explanation = '';
    
    if (part.dueType === 'time') {
        percent = timePercent;
        if (daysRemaining <= 0) {
            status = 'overdue';
            explanation = `เลยกำหนดแล้ว (${Math.abs(daysRemaining)} วัน)`;
        } else if (daysRemaining <= 30 || percent <= 0.2) {
            status = 'warning';
            explanation = `เหลืออีก ${daysRemaining} วัน (ประมาณ ${formatThaiDate(nextDueDate)})`;
        } else {
            status = 'healthy';
            explanation = `เหลืออีก ${daysRemaining} วัน (ประมาณ ${formatThaiDate(nextDueDate)})`;
        }
    } else if (part.dueType === 'target_date') {
        percent = timePercent;
        if (!part.targetDate) {
            status = 'warning';
            explanation = 'ยังไม่ได้ระบุวันที่เป้าหมาย';
        } else if (daysRemaining <= 0) {
            status = 'overdue';
            explanation = `เลยกำหนดเป้าหมายแล้ว (${Math.abs(daysRemaining)} วัน)`;
        } else if (daysRemaining <= 30 || percent <= 0.2) {
            status = 'warning';
            explanation = `เหลืออีก ${daysRemaining} วัน (เป้าหมาย: ${formatThaiDate(nextDueDate)})`;
        } else {
            status = 'healthy';
            explanation = `เหลืออีก ${daysRemaining} วัน (เป้าหมาย: ${formatThaiDate(nextDueDate)})`;
        }
    } else if (part.dueType === 'mileage') {
        percent = mileagePercent;
        if (mileageRemaining <= 0) {
            status = 'overdue';
            explanation = `เลยกำหนดแล้ว (${Math.abs(mileageRemaining).toLocaleString('th-TH')} กม.)`;
        } else {
            const dateStr = predictedDueDate ? `คาดว่าถึง: ${formatThaiDate(predictedDueDate)}` : '';
            if (mileageRemaining <= 1000 || percent <= 0.2) {
                status = 'warning';
                explanation = `เหลืออีก ${mileageRemaining.toLocaleString('th-TH')} กม. (${dateStr})`;
            } else {
                status = 'healthy';
                explanation = `เหลืออีก ${mileageRemaining.toLocaleString('th-TH')} กม. (${dateStr})`;
            }
        }
    } else if (part.dueType === 'target_mileage') {
        percent = mileagePercent;
        if (!part.targetMileage || parseInt(part.targetMileage) <= 0) {
            status = 'warning';
            explanation = 'ยังไม่ได้ระบุเลขไมล์เป้าหมาย';
        } else if (mileageRemaining <= 0) {
            status = 'overdue';
            explanation = `เลยเลขไมล์เป้าหมายแล้ว (${Math.abs(mileageRemaining).toLocaleString('th-TH')} กม.)`;
        } else {
            const dateStr = predictedDueDate ? ` (คาดว่าถึง: ${formatThaiDate(predictedDueDate)})` : '';
            if (mileageRemaining <= 1000 || percent <= 0.2) {
                status = 'warning';
                explanation = `เหลืออีก ${mileageRemaining.toLocaleString('th-TH')} กม. (เป้าหมาย: ${nextDueMileage.toLocaleString('th-TH')} กม.)${dateStr}`;
            } else {
                status = 'healthy';
                explanation = `เหลืออีก ${mileageRemaining.toLocaleString('th-TH')} กม. (เป้าหมาย: ${nextDueMileage.toLocaleString('th-TH')} กม.)${dateStr}`;
            }
        }
    } else if (part.dueType === 'target_both') {
        percent = Math.min(timePercent, mileagePercent);
        const isTimeOverdue = daysRemaining <= 0;
        const isMileageOverdue = mileageRemaining <= 0;
        
        if (isTimeOverdue || isMileageOverdue) {
            status = 'overdue';
            if (isTimeOverdue && isMileageOverdue) {
                explanation = `เลยกำหนดทั้งเป้าหมายวันที่และเลขไมล์`;
            } else if (isTimeOverdue) {
                explanation = `เลยเป้าหมายวันที่แล้ว (${Math.abs(daysRemaining)} วัน)`;
            } else {
                explanation = `เลยเป้าหมายเลขไมล์แล้ว (${Math.abs(mileageRemaining).toLocaleString('th-TH')} กม.)`;
            }
        } else {
            const isTimeWarning = daysRemaining <= 30 || timePercent <= 0.2;
            const isMileageWarning = mileageRemaining <= 1000 || mileagePercent <= 0.2;
            if (isTimeWarning || isMileageWarning) {
                status = 'warning';
            }
            if (nextDueDate && predictedDueDate) {
                if (nextDueDate < predictedDueDate) {
                    explanation = `เหลือ ${daysRemaining} วัน (เป้าหมาย ${formatThaiDate(nextDueDate)} - ถึงก่อนเลขไมล์)`;
                } else {
                    explanation = `เหลือ ${mileageRemaining.toLocaleString('th-TH')} กม. (คาดว่าถึง ${formatThaiDate(predictedDueDate)} - ถึงก่อนวันที่)`;
                }
            } else {
                explanation = `เหลือ ${daysRemaining} วัน หรือ ${mileageRemaining.toLocaleString('th-TH')} กม.`;
            }
        }
    } else { // both (recurring)
        percent = Math.min(timePercent, mileagePercent);
        
        const isTimeOverdue = daysRemaining <= 0;
        const isMileageOverdue = mileageRemaining <= 0;
        
        if (isTimeOverdue || isMileageOverdue) {
            status = 'overdue';
            if (isTimeOverdue && isMileageOverdue) {
                explanation = `เลยกำหนดทั้งเวลาและระยะทาง`;
            } else if (isTimeOverdue) {
                explanation = `เลยกำหนดเวลาแล้ว (${Math.abs(daysRemaining)} วัน)`;
            } else {
                explanation = `เลยกำหนดระยะทางแล้ว (${Math.abs(mileageRemaining).toLocaleString('th-TH')} กม.)`;
            }
        } else {
            const isTimeWarning = daysRemaining <= 30 || timePercent <= 0.2;
            const isMileageWarning = mileageRemaining <= 1000 || mileagePercent <= 0.2;
            
            if (isTimeWarning || isMileageWarning) {
                status = 'warning';
            }
            
            // Compare which one comes first
            if (nextDueDate && predictedDueDate) {
                if (nextDueDate < predictedDueDate) {
                    explanation = `เหลือ ${daysRemaining} วัน (คาดว่าถึง ${formatThaiDate(nextDueDate)} - ถึงกำหนดก่อนระยะทาง)`;
                } else {
                    explanation = `เหลือ ${mileageRemaining.toLocaleString('th-TH')} กม. (คาดว่าถึง ${formatThaiDate(predictedDueDate)} - ถึงกำหนดก่อนเวลา)`;
                }
            } else {
                explanation = `เหลือ ${daysRemaining} วัน หรือ ${mileageRemaining.toLocaleString('th-TH')} กม.`;
            }
        }
    }
    
    return {
        percent: Math.min(1, Math.max(0, percent)),
        status,
        explanation,
        nextDueDate: nextDueDate || predictedDueDate,
        nextDueMileage
    };
}

// Calculate total overall health of the car
function getCarOverallHealth() {
    if (state.parts.length === 0) return 100;
    
    let totalScore = 0;
    state.parts.forEach(part => {
        const calc = calculatePartStatus(part, state.car.mileage);
        totalScore += calc.percent * 100;
    });
    
    return Math.round(totalScore / state.parts.length);
}

// --- 8. UI RENDER ENGINE ---

// Utility category helper
const CATEGORIES = {
    engine: "เครื่องยนต์ & ของเหลว",
    wheels: "ช่วงล่าง & ยาง",
    electrical: "ไฟ & ระบบไฟฟ้า",
    documents: "ประกัน & ภาษี & พรบ",
    other: "หมวดหมู่อื่นๆ"
};

function renderAll() {
    renderHeader();
    renderDashboard();
    renderTracker();
    renderHistory();
    populatePartSelectDropdowns();
    renderMileageHistory();

    // If part history modal is currently open, refresh its content in-place
    const partHistModal = document.getElementById('modal-part-history');
    if (partHistModal && partHistModal.classList.contains('active') && currentPartHistoryId) {
        showPartHistory(currentPartHistoryId);
    }
}

function renderHeader() {
    document.getElementById('disp-current-mileage').innerText = state.car.mileage.toLocaleString('th-TH');
    document.getElementById('car-quick-name').innerText = `${state.car.name} ${state.car.plate ? `(${state.car.plate})` : ''}`;
    
    // Settings forms values
    document.getElementById('set-car-name').value = state.car.name;
    document.getElementById('set-car-plate').value = state.car.plate;
    document.getElementById('set-car-mileage').value = state.car.mileage;

    // Load car documents into working memory
    currentCarDocuments = (state.car.documents && Array.isArray(state.car.documents)) ? JSON.parse(JSON.stringify(state.car.documents)) : [];
    renderCarDocsPreview();
}

function renderDashboard() {
    let overdueCount = 0;
    let warningCount = 0;
    let healthyCount = 0;
    
    const urgentListContainer = document.getElementById('urgent-items-list');
    urgentListContainer.innerHTML = '';
    
    const urgentItems = [];

    state.parts.forEach(part => {
        const analysis = calculatePartStatus(part, state.car.mileage);
        if (analysis.status === 'overdue') {
            overdueCount++;
            urgentItems.push({ part, analysis });
        } else if (analysis.status === 'warning') {
            warningCount++;
            urgentItems.push({ part, analysis });
        } else {
            healthyCount++;
        }
    });

    // Sort urgent items (overdue first, then lower percentage first)
    urgentItems.sort((a, b) => {
        if (a.analysis.status === 'overdue' && b.analysis.status !== 'overdue') return -1;
        if (a.analysis.status !== 'overdue' && b.analysis.status === 'overdue') return 1;
        return a.analysis.percent - b.analysis.percent;
    });

    document.getElementById('count-overdue').innerText = overdueCount;
    document.getElementById('count-warning').innerText = warningCount;
    document.getElementById('count-healthy').innerText = healthyCount;

    // Render health gauge circle SVG
    const overallHealth = getCarOverallHealth();
    document.getElementById('health-percent').innerText = `${overallHealth}%`;
    const dashOffset = 314 - (314 * overallHealth / 100);
    const fillGauge = document.getElementById('gauge-health-fill');
    fillGauge.setAttribute('stroke-dashoffset', dashOffset);
    
    // Adjust health gauge color dynamically
    if (overallHealth > 75) {
        fillGauge.style.stroke = "var(--success)";
    } else if (overallHealth > 40) {
        fillGauge.style.stroke = "var(--warning)";
    } else {
        fillGauge.style.stroke = "var(--danger)";
    }

    // Quick documents summary on dashboard side card
    const insurancePart = state.parts.find(p => p.category === 'documents' && p.name.includes('ประกัน'));
    const taxPart = state.parts.find(p => p.category === 'documents' && (p.name.includes('ภาษี') || p.name.includes('พรบ')));

    updateDocumentSummaryText('summary-insurance', insurancePart);
    updateDocumentSummaryText('summary-tax', taxPart);

    // Render Urgent Items List
    if (urgentItems.length === 0) {
        urgentListContainer.innerHTML = `
            <div class="empty-state">
                <span class="icon">🎉</span>
                <p>รถของคุณอยู่ในสภาพสมบูรณ์ ไม่มีอะไหล่ครบกำหนดเปลี่ยน!</p>
            </div>
        `;
    } else {
        urgentItems.forEach(({ part, analysis }) => {
            const urgencyClass = analysis.status === 'overdue' ? 'tag-overdue' : 'tag-warning';
            const itemHTML = `
                <div class="urgent-item">
                    <div class="item-left">
                        <span class="title">${part.name}</span>
                        <span class="sub">${analysis.explanation}</span>
                    </div>
                    <div class="item-right">
                        <span class="status-tag ${urgencyClass}">${analysis.status === 'overdue' ? 'เลยกำหนด' : 'เตือน'}</span>
                        <button class="btn btn-sm btn-primary mt-2" onclick="openLogReplacement('${part.id}')">เปลี่ยนแล้ว</button>
                    </div>
                </div>
            `;
            urgentListContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }
}

function updateDocumentSummaryText(elementId, part) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!part) {
        el.innerText = "ยังไม่ได้เปิดติดตาม";
        el.className = "status-tag tag-inactive";
        return;
    }
    const calc = calculatePartStatus(part, state.car.mileage);
    el.innerText = calc.explanation;
    el.className = `status-tag tag-${calc.status}`;

    // Find any attached PDF or document in the part or in history records
    let docAttachment = null;
    if (part.attachments && Array.isArray(part.attachments) && part.attachments.length > 0) {
        docAttachment = part.attachments[0];
    } else {
        const histRecords = state.history.filter(h => h.partId === part.id);
        for (const h of histRecords) {
            const atts = getRecordAttachments(h);
            if (atts && atts.length > 0) {
                docAttachment = atts[0];
                break;
            }
        }
    }

    let quickBtn = el.parentElement.querySelector('.doc-quick-btn');
    if (!quickBtn) {
        quickBtn = document.createElement('span');
        quickBtn.className = 'doc-quick-btn';
        el.parentElement.appendChild(quickBtn);
    }

    if (docAttachment) {
        const isPdf = (docAttachment.name && docAttachment.name.toLowerCase().endsWith('.pdf')) || docAttachment.docType === 'pdf';
        const label = isPdf ? '📕 เปิดดู PDF' : '👁️ เปิดดูเอกสาร';
        quickBtn.innerHTML = `
            <button type="button" class="btn btn-xs btn-outline-cyan" style="margin-left: 8px; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px;" onclick="viewQuickDoc('${part.id}')" title="เปิดดู ${docAttachment.name || 'เอกสาร'}">
                ${label}
            </button>
        `;
    } else {
        quickBtn.innerHTML = '';
    }
}

function renderTracker() {
    const grid = document.getElementById('parts-tracker-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('tracker-search').value.toLowerCase();
    const categoryFilter = document.getElementById('tracker-filter-category').value;

    const filteredParts = state.parts.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchQuery) || part.description.toLowerCase().includes(searchQuery);
        const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredParts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state col-span-full">
                <span class="icon">🔍</span>
                <p>ไม่พบรายการอะไหล่ที่คุณกำลังค้นหา</p>
            </div>
        `;
        return;
    }

    filteredParts.forEach(part => {
        const calc = calculatePartStatus(part, state.car.mileage);
        let progressPercent = Math.round(calc.percent * 100);
        
        let colorVar = '--success';
        if (calc.status === 'overdue') colorVar = '--danger';
        else if (calc.status === 'warning') colorVar = '--warning';

        const lastServiceFormatted = new Date(part.lastServiceDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        
        // Progress Labels
        let progressLabel = `${progressPercent}%`;
        let targetText = '';
        if (part.dueType === 'time') {
            targetText = `ทุก ${part.dueMonths} เดือน`;
        } else if (part.dueType === 'mileage') {
            targetText = `ทุก ${parseInt(part.dueIntervalMileage || 0).toLocaleString('th-TH')} กม.`;
        } else if (part.dueType === 'target_date') {
            targetText = part.targetDate ? `เป้าหมาย: ${formatThaiDate(part.targetDate)}` : 'ยังไม่ได้ระบุ';
        } else if (part.dueType === 'target_mileage') {
            targetText = `เป้าหมาย: ${parseInt(part.targetMileage || 0).toLocaleString('th-TH')} กม.`;
        } else if (part.dueType === 'target_both') {
            const dateStr = part.targetDate ? formatThaiDate(part.targetDate) : '-';
            targetText = `${parseInt(part.targetMileage || 0).toLocaleString('th-TH')} กม. / ${dateStr}`;
        } else {
            targetText = `ทุก ${parseInt(part.dueIntervalMileage || 0).toLocaleString('th-TH')} กม. / ${part.dueMonths || 0} ด.`;
        }

        const partHistories = state.history.filter(h => h.partId === part.id);
        const histCount = partHistories.length;

        const cardHTML = `
            <div class="glass-card part-card">
                <div class="part-card-header">
                    <div class="part-title-box">
                        <h4>${part.name}</h4>
                        <span class="part-category">${CATEGORIES[part.category] || part.category}</span>
                    </div>
                    <span class="status-tag tag-${calc.status}">${calc.status === 'overdue' ? 'ถึงกำหนด' : calc.status === 'warning' ? 'ใกล้ถึง' : 'ปกติ'}</span>
                </div>
                
                <p class="part-desc">${part.description || 'ไม่มีรายละเอียดอะไหล่'}</p>

                <div class="progress-box">
                    <div class="progress-label-row">
                        <span>สภาพคงเหลือ: ${calc.explanation}</span>
                        <span>${progressLabel}</span>
                    </div>
                    <div class="progress-bar-outer">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%; background-color: var(${colorVar});"></div>
                    </div>
                </div>

                <div class="part-info-metrics">
                    <div class="metric-item">
                        <span class="lbl">เปลี่ยนล่าสุด</span>
                        <span class="val">${lastServiceFormatted}</span>
                    </div>
                    <div class="metric-item">
                        <span class="lbl">ระยะวิ่งล่าสุด</span>
                        <span class="val">${parseInt(part.lastServiceMileage).toLocaleString('th-TH')} กม.</span>
                    </div>
                    <div class="metric-item">
                        <span class="lbl">${part.dueType && part.dueType.startsWith('target_') ? 'กำหนดเป้าหมาย' : 'รอบเตือนถัดไป'}</span>
                        <span class="val">${targetText}</span>
                    </div>
                    <div class="metric-item">
                        <span class="lbl">สถานะรายละเอียด</span>
                        <span class="val" style="color: var(${colorVar});">${calc.status === 'overdue' ? 'ต้องตรวจเปลี่ยน' : 'สภาพดี'}</span>
                    </div>
                </div>

                ${part.attachments && Array.isArray(part.attachments) && part.attachments.length > 0 ? `
                    <div class="part-attachments-bar">
                        <span class="attach-label">📎 เอกสาร/ใบรับประกันแนบ (${part.attachments.length} ไฟล์):</span>
                        <div class="part-attach-pills">
                            ${part.attachments.map((att, attIdx) => {
                                const isPdf = (att.name && att.name.toLowerCase().endsWith('.pdf')) || att.docType === 'pdf';
                                const icon = att.type === 'image' ? '🖼️' : (isPdf ? '📕' : '📄');
                                const sizeStr = att.compressedSize ? ` <small>(${formatFileSize(att.compressedSize)})</small>` : '';
                                return `
                                    <button type="button" class="attach-pill" onclick="viewPartAttachment('${part.id}', ${attIdx})" title="คลิกเพื่อเปิดดู ${att.name || 'เอกสาร'}">
                                        <span>${icon} ${att.name || 'เอกสาร'}${sizeStr}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="part-card-footer">
                    <button type="button" class="btn btn-sm btn-outline-cyan btn-part-history" onclick="showPartHistory('${part.id}')" title="คลิกเพื่อดูประวัติการซ่อม/เปลี่ยนทั้งหมดของ ${part.name}">
                        📜 ประวัติ (${histCount})
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="openEditPart('${part.id}')" title="แก้ไขสเปกหรือรอบบำรุงรักษา">
                        แก้ไขสเปก
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="openLogReplacement('${part.id}')" style="flex-grow:1;" title="บันทึกการเปลี่ยนอะไหล่">
                        บันทึกการเปลี่ยน
                    </button>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function renderHistory() {
    const list = document.getElementById('history-records-list');
    list.innerHTML = '';

    const searchQuery = document.getElementById('history-search').value.toLowerCase();
    const filterPart = document.getElementById('history-filter-part').value;

    const filteredHistory = state.history.filter(record => {
        const matchesSearch = record.partName.toLowerCase().includes(searchQuery) || (record.notes || "").toLowerCase().includes(searchQuery) || (record.mechanic || "").toLowerCase().includes(searchQuery);
        const matchesPart = filterPart === 'all' || record.partId === filterPart;
        return matchesSearch && matchesPart;
    });

    // Sort chronologically (latest service first)
    filteredHistory.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (filteredHistory.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="icon">📜</span>
                <p>ไม่พบประวัติการเปลี่ยนอะไหล่บำรุงรักษา</p>
            </div>
        `;
        return;
    }

    filteredHistory.forEach(record => {
        const dateFormatted = new Date(record.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const attachments = getRecordAttachments(record);
        let receiptHTML = '';
        if (attachments.length > 0) {
            let itemsHTML = '';
            attachments.forEach((att, attIdx) => {
                const name = att.name || 'เอกสารแนบ';
                const lowerName = name.toLowerCase();
                const isPdf = lowerName.endsWith('.pdf') || att.docType === 'pdf';
                const sizeText = att.compressedSize ? formatFileSize(att.compressedSize) : '';

                if (att.type === 'image') {
                    itemsHTML += `
                        <div class="timeline-attach-thumb" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดูรูป (${name})">
                            <img src="${att.data}" alt="${name}">
                            ${sizeText ? `<span class="attach-size-badge">${sizeText}</span>` : ''}
                        </div>
                    `;
                } else if (isPdf && att.thumbnail) {
                    itemsHTML += `
                        <div class="timeline-attach-thumb is-pdf-thumb" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดู PDF (${name})">
                            <img src="${att.thumbnail}" alt="${name}">
                            <span class="pdf-tag-overlay">📕 PDF</span>
                            ${sizeText ? `<span class="attach-size-badge">${sizeText}</span>` : ''}
                        </div>
                    `;
                } else {
                    let icon = '📄';
                    let typeName = 'เอกสาร';
                    if (isPdf) {
                        icon = '📕';
                        typeName = 'PDF';
                    } else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
                        icon = '📊';
                        typeName = 'Excel';
                    } else if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
                        icon = '📝';
                        typeName = 'Word';
                    }
                    itemsHTML += `
                        <div class="doc-attachment-badge" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดู (${name})" style="cursor: pointer;">
                            <span class="doc-badge-icon">${icon}</span>
                            <div class="doc-badge-info">
                                <span class="doc-badge-name">${name}</span>
                                <span class="doc-badge-action">👁️ เปิดดู ${typeName} ${sizeText ? `(${sizeText})` : ''} ↗</span>
                            </div>
                        </div>
                    `;
                }
            });
            receiptHTML = `
                <div class="timeline-receipt-area">
                    <div class="timeline-attachments-gallery">
                        ${itemsHTML}
                    </div>
                </div>
            `;
        }

        const costDisplay = record.cost ? `${parseFloat(record.cost).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท` : 'ไม่ระบุค่าใช้จ่าย';

        const cardHTML = `
            <div class="timeline-card">
                <div class="timeline-main-info">
                    <div class="timeline-header">
                        <h4 class="timeline-title">${record.partName}</h4>
                        <div style="display: flex; gap: 12px;">
                            <button type="button" class="btn btn-sm btn-text" onclick="openEditHistory('${record.id}')" style="color:var(--primary); padding:0; min-height: auto;">แก้ไข</button>
                            <button type="button" class="btn btn-sm btn-text" onclick="deleteHistoryRecord('${record.id}')" style="color:var(--danger); padding:0; min-height: auto;">ลบประวัติ</button>
                        </div>
                    </div>
                    <div class="timeline-meta">
                        <span>📅 ${dateFormatted}</span>
                        <span>🚗 ${record.mileage > 0 ? `${parseInt(record.mileage).toLocaleString('th-TH')} กม.` : 'ไม่ระบุไมล์'}</span>
                        <span>💰 ${costDisplay}</span>
                    </div>
                    ${record.mechanic ? `<span style="font-size:0.85rem; color:var(--text-muted);">📍 อู่/ศูนย์: ${record.mechanic}</span>` : ''}
                    ${record.notes ? `<p class="timeline-notes">${record.notes}</p>` : ''}
                </div>
                ${receiptHTML}
            </div>
        `;
        list.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function populatePartSelectDropdowns() {
    // 1. Populate parts list filter inside History tab
    const historyFilter = document.getElementById('history-filter-part');
    const selectedHistoryFilter = historyFilter.value;
    historyFilter.innerHTML = '<option value="all">ทุกอะไหล่</option>';
    
    // 2. Populate parts list selection inside add maintenance history modal
    const historyModalSelect = document.getElementById('hist-part-id');
    historyModalSelect.innerHTML = '<option value="" disabled selected>-- เลือกอะไหล่ --</option>';

    state.parts.forEach(part => {
        historyFilter.insertAdjacentHTML('beforeend', `<option value="${part.id}">${part.name}</option>`);
        historyModalSelect.insertAdjacentHTML('beforeend', `<option value="${part.id}">${part.name}</option>`);
    });

    // Add general repair options
    historyFilter.insertAdjacentHTML('beforeend', '<option value="general-repair">งานซ่อมบำรุงทั่วไป</option>');
    historyModalSelect.insertAdjacentHTML('beforeend', '<option value="general-repair">🔧 งานซ่อมบำรุงทั่วไป (ไม่ได้เปลี่ยนอะไหล่)</option>');

    historyFilter.value = selectedHistoryFilter;
}

window.openEditHistory = function(id) {
    const record = state.history.find(h => h.id === id);
    if (!record) return;
    
    document.getElementById('form-history').reset();
    document.getElementById('hist-id').value = record.id;
    document.getElementById('hist-part-id').value = record.partId;
    
    const customGroup = document.getElementById('hist-custom-name-group');
    const customInput = document.getElementById('hist-custom-name');
    if (record.partId === 'general-repair') {
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.value = record.partName;
    } else {
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
    
    if (fpHistDateInstance) fpHistDateInstance.setDate(record.date);
    document.getElementById('hist-mileage').value = record.mileage;
    document.getElementById('hist-cost').value = record.cost || '';
    document.getElementById('hist-mechanic').value = record.mechanic || '';
    document.getElementById('hist-notes').value = record.notes || '';
    
    currentSelectedAttachments = JSON.parse(JSON.stringify(getRecordAttachments(record)));
    renderAttachmentsPreview();
    document.getElementById('compression-status').style.display = 'none';
    
    document.getElementById('modal-history-title').innerText = "แก้ไขประวัติการบำรุงรักษา";
    openModal('modal-history');
};

function renderMileageHistory() {
    const list = document.getElementById('mileage-history-list');
    if (!list) return;
    list.innerHTML = '';
    
    const avg = calculateAverageDailyKm();
    document.getElementById('mileage-avg-display').innerText = avg.toFixed(1);
    
    if (!state.mileageLog || state.mileageLog.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 10px;"><p style="font-size: 0.8rem;">ไม่มีประวัติการบันทึกเลขไมล์</p></div>`;
        return;
    }
    
    // Sort chronologically desc
    const sortedLogs = [...state.mileageLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedLogs.forEach(log => {
        const dateFormatted = new Date(log.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const logHTML = `
            <div class="detail-row" style="margin-bottom: 6px; padding: 4px 8px; background: rgba(255,255,255,0.02); border-radius: var(--border-radius-sm); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
                <span>📅 ${dateFormatted}</span>
                <span style="font-weight: 600; color: var(--primary);">🚗 ${log.mileage.toLocaleString('th-TH')} กม.</span>
                <button type="button" class="btn btn-sm btn-text" onclick="deleteMileageLog('${log.date}')" style="color: var(--danger); padding: 0; font-size: 0.75rem; min-height: auto;">ลบ</button>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', logHTML);
    });
}

window.deleteMileageLog = function(date) {
    if (!confirm("ยืนยันที่จะลบประวัติเลขไมล์ประจำวันที่ " + formatThaiDate(date) + "?")) return;
    updateState(() => {
        state.mileageLog = state.mileageLog.filter(log => log.date !== date);
    });
};

// Toggle cloud buttons on/off based on login state
function toggleCloudButtons(isLoggedIn) {
    document.getElementById('btn-cloud-login').style.display = isLoggedIn ? 'none' : 'inline-flex';
    document.getElementById('btn-cloud-logout').style.display = isLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('btn-cloud-pull').style.display = isLoggedIn ? 'inline-flex' : 'none';
    document.getElementById('btn-cloud-push').style.display = isLoggedIn ? 'inline-flex' : 'none';
}

function setSyncBadge(status, text) {
    const badge = document.getElementById('sync-status-badge');
    const badgeText = document.getElementById('sync-status-text');
    
    badge.className = `sync-badge ${status}`;
    badgeText.innerText = text;
}

// --- 9. INTERACTIVE HANDLERS (MODALS & TABS) ---

// Tab switching
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = `tab-${btn.dataset.tab}`;
        document.getElementById(tabId).classList.add('active');
        
        // Update header title
        const titles = {
            dashboard: "แดชบอร์ดสรุปความคุ้มครอง",
            tracker: "อะไหล่และชำระบริการ",
            history: "ประวัติบันทึกการเปลี่ยน",
            settings: "ตั้งค่าระบบคลาวด์ OneDrive"
        };
        document.getElementById('current-tab-title').innerText = titles[btn.dataset.tab] || "PM My Car";
        
        // Special rendering updates
        if (btn.dataset.tab === 'tracker') renderTracker();
        if (btn.dataset.tab === 'history') renderHistory();
    });
});

// Modal helpers
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Toggle Client ID Guide card
document.getElementById('btn-toggle-guide').addEventListener('click', (e) => {
    e.preventDefault();
    const card = document.getElementById('client-id-guide-card');
    card.style.display = card.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('btn-close-guide').addEventListener('click', () => {
    document.getElementById('client-id-guide-card').style.display = 'none';
});

// Function to toggle due input visibility based on due-type selection
function updateDueInputsVisibility(val) {
    const timeBox = document.getElementById('due-time-input-group');
    const mileageBox = document.getElementById('due-mileage-input-group');
    const targetDateBox = document.getElementById('due-target-date-group');
    const targetMileageBox = document.getElementById('due-target-mileage-group');
    
    if (timeBox) timeBox.style.display = (val === 'time' || val === 'both') ? 'block' : 'none';
    if (mileageBox) mileageBox.style.display = (val === 'mileage' || val === 'both') ? 'block' : 'none';
    if (targetDateBox) targetDateBox.style.display = (val === 'target_date' || val === 'target_both') ? 'block' : 'none';
    if (targetMileageBox) targetMileageBox.style.display = (val === 'target_mileage' || val === 'target_both') ? 'block' : 'none';
}

// Part Modal controls
document.getElementById('btn-open-add-part-modal').addEventListener('click', () => {
    document.getElementById('form-part').reset();
    document.getElementById('part-id').value = '';
    document.getElementById('modal-part-title').innerText = "เพิ่มอะไหล่ใหม่ที่ต้องการติดตาม";
    
    // Set default dates & values
    if (fpLastDateInstance) fpLastDateInstance.setDate(new Date());
    if (fpTargetDateInstance) fpTargetDateInstance.setDate('');
    document.getElementById('part-last-mileage').value = state.car.mileage;
    document.getElementById('part-target-mileage').value = '';
    
    // Reset attachments
    currentPartAttachments = [];
    renderPartAttachmentsPreview();
    const compStatus = document.getElementById('part-compression-status');
    if (compStatus) compStatus.style.display = 'none';

    // Toggle default inputs
    const defaultRadio = document.getElementById('radio-due-time');
    if (defaultRadio) {
        defaultRadio.checked = true;
        updateDueInputsVisibility('time');
    }
    openModal('modal-part');
});
document.getElementById('btn-close-part-modal').addEventListener('click', () => closeModal('modal-part'));
document.getElementById('btn-cancel-part').addEventListener('click', () => closeModal('modal-part'));

// Due setting radios toggle input displays
document.getElementsByName('due-type').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateDueInputsVisibility(e.target.value);
    });
});

// Part drop zone trigger click
const partDropZone = document.getElementById('part-drop-zone');
if (partDropZone) {
    partDropZone.addEventListener('click', () => {
        document.getElementById('part-receipt-file').click();
    });
}

// Part file input change handler
const partFileInput = document.getElementById('part-receipt-file');
if (partFileInput) {
    partFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await processAttachmentFiles(files, currentPartAttachments, renderPartAttachmentsPreview, 'part-compression-status', 'part');
        e.target.value = '';
    });
}

// Render attachments preview gallery inside Part Modal
function renderPartAttachmentsPreview() {
    const grid = document.getElementById('part-attachments-preview-grid');
    const countSpan = document.getElementById('part-files-count');
    if (!grid) return;
    grid.innerHTML = '';

    if (!currentPartAttachments || currentPartAttachments.length === 0) {
        grid.style.display = 'none';
        if (countSpan) countSpan.innerText = '';
        return;
    }

    grid.style.display = 'grid';
    if (countSpan) countSpan.innerText = `(แนบแล้ว ${currentPartAttachments.length} ไฟล์)`;

    currentPartAttachments.forEach((att, idx) => {
        let itemHTML = '';
        const lowerName = (att.name || '').toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || att.docType === 'pdf';
        const sizeStr = att.compressedSize ? formatFileSize(att.compressedSize) : '';

        if (att.thumbnail || att.type === 'image') {
            const imgSrc = att.thumbnail || att.data;
            itemHTML = `
                <div class="attach-item is-image" onclick="openDocumentViewer(currentPartAttachments[${idx}], 'เอกสารอะไหล่', '${att.name || ''}')" title="คลิกเพื่อเปิดดู (${att.name || 'เอกสาร'})">
                    <img src="${imgSrc}" alt="${att.name || 'เอกสาร'}">
                    ${isPdf ? '<span class="pdf-tag-overlay">📕 PDF</span>' : ''}
                    ${sizeStr ? `<span class="attach-size-badge">${sizeStr}</span>` : ''}
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removePartAttachment(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        } else {
            let icon = '📄';
            let desc = 'เอกสาร';
            if (isPdf) { icon = '📕'; desc = 'PDF'; }
            else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) { icon = '📊'; desc = 'Excel'; }
            else if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) { icon = '📝'; desc = 'Word'; }

            itemHTML = `
                <div class="attach-item is-doc" onclick="openDocumentViewer(currentPartAttachments[${idx}], 'เอกสารอะไหล่', '${att.name || ''}')" style="cursor: pointer;">
                    <span class="attach-doc-icon">${icon}</span>
                    <span class="attach-doc-name" title="${att.name}">${att.name}</span>
                    <span class="attach-doc-type">${desc} ${sizeStr ? `(${sizeStr})` : ''}</span>
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removePartAttachment(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        }
        grid.insertAdjacentHTML('beforeend', itemHTML);
    });
}

window.removePartAttachment = function(idx) {
    if (idx >= 0 && idx < currentPartAttachments.length) {
        currentPartAttachments.splice(idx, 1);
        renderPartAttachmentsPreview();
    }
};

window.viewPartAttachment = function(partId, attIdx) {
    const part = state.parts.find(p => p.id === partId);
    if (!part || !part.attachments || !part.attachments[attIdx]) return;
    openDocumentViewer(part.attachments[attIdx], part.name, `เอกสารอะไหล่ / ใบรับประกัน`);
};

// Save Part Form Submit
document.getElementById('form-part').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('part-id').value;
    const name = document.getElementById('part-name').value;
    const category = document.getElementById('part-category').value;
    const description = document.getElementById('part-description').value;
    const lastDate = document.getElementById('part-last-date').value;
    const lastMileage = parseInt(document.getElementById('part-last-mileage').value) || 0;
    
    const dueTypeRadio = document.querySelector('input[name="due-type"]:checked');
    const dueType = dueTypeRadio ? dueTypeRadio.value : 'time';
    const dueMonths = parseInt(document.getElementById('part-due-months').value) || 0;
    const dueIntervalMileage = parseInt(document.getElementById('part-due-interval-mileage').value) || 0;
    const targetDate = document.getElementById('part-target-date').value || '';
    const targetMileage = parseInt(document.getElementById('part-target-mileage').value) || 0;

    updateState(() => {
        if (id) {
            // Edit existing
            const idx = state.parts.findIndex(p => p.id === id);
            if (idx !== -1) {
                state.parts[idx] = { 
                    id, name, category, description, 
                    lastServiceDate: lastDate, 
                    lastServiceMileage: lastMileage, 
                    dueType, dueMonths, dueIntervalMileage,
                    targetDate, targetMileage,
                    attachments: currentPartAttachments
                };
            }
        } else {
            // Add new
            const newId = 'part-' + Math.random().toString(36).substr(2, 9);
            state.parts.push({ 
                id: newId, name, category, description, 
                lastServiceDate: lastDate, 
                lastServiceMileage: lastMileage, 
                dueType, dueMonths, dueIntervalMileage,
                targetDate, targetMileage,
                attachments: currentPartAttachments
            });
        }
    });

    closeModal('modal-part');
});

// Edit existing part specs
window.openEditPart = function(id) {
    const part = state.parts.find(p => p.id === id);
    if (!part) return;
    
    document.getElementById('part-id').value = part.id;
    document.getElementById('part-name').value = part.name;
    document.getElementById('part-category').value = part.category;
    document.getElementById('part-description').value = part.description;
    if (fpLastDateInstance) fpLastDateInstance.setDate(part.lastServiceDate);
    document.getElementById('part-last-mileage').value = part.lastServiceMileage;
    
    const targetRadio = document.querySelector(`input[name="due-type"][value="${part.dueType}"]`) || document.getElementById('radio-due-time');
    if (targetRadio) {
        targetRadio.checked = true;
        updateDueInputsVisibility(targetRadio.value);
    }
    document.getElementById('part-due-months').value = (part.dueMonths !== undefined && part.dueMonths !== null) ? part.dueMonths : 6;
    document.getElementById('part-due-interval-mileage').value = (part.dueIntervalMileage !== undefined && part.dueIntervalMileage !== null) ? part.dueIntervalMileage : 10000;
    if (fpTargetDateInstance) fpTargetDateInstance.setDate(part.targetDate || '');
    document.getElementById('part-target-mileage').value = (part.targetMileage !== undefined && part.targetMileage !== null && part.targetMileage !== 0) ? part.targetMileage : '';

    // Load attachments
    currentPartAttachments = (part.attachments && Array.isArray(part.attachments)) ? JSON.parse(JSON.stringify(part.attachments)) : [];
    renderPartAttachmentsPreview();
    const compStatus = document.getElementById('part-compression-status');
    if (compStatus) compStatus.style.display = 'none';
    
    document.getElementById('modal-part-title').innerText = "แก้ไขข้อมูลสเปกอะไหล่";
    openModal('modal-part');
};

// --- PART-SPECIFIC SERVICE HISTORY MODAL CONTROLS ---
let currentPartHistoryId = null;

window.showPartHistory = function(partId) {
    const part = state.parts.find(p => p.id === partId);
    if (!part) return;

    currentPartHistoryId = partId;
    const titleEl = document.getElementById('part-hist-title');
    const subTitleEl = document.getElementById('part-hist-subtitle');
    const countEl = document.getElementById('part-hist-count');
    const costEl = document.getElementById('part-hist-total-cost');
    const lastDateEl = document.getElementById('part-hist-last-date');
    const lastMileEl = document.getElementById('part-hist-last-mileage');
    const listEl = document.getElementById('part-history-records-list');

    if (titleEl) titleEl.innerText = `ประวัติการซ่อมบำรุง: ${part.name}`;
    if (subTitleEl) subTitleEl.innerText = `${CATEGORIES[part.category] || part.category} • ${part.description || 'ไม่มีรายละเอียดอะไหล่'}`;

    // Filter all history records matching this part
    const partRecords = state.history.filter(h => h.partId === partId);
    partRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary calculations
    const totalCount = partRecords.length;
    let totalCost = 0;
    partRecords.forEach(r => {
        if (r.cost) totalCost += parseFloat(r.cost) || 0;
    });

    if (countEl) countEl.innerText = `${totalCount} ครั้ง`;
    if (costEl) costEl.innerText = `฿ ${totalCost.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    if (totalCount > 0) {
        const latest = partRecords[0];
        const latestDateFormatted = new Date(latest.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        if (lastDateEl) lastDateEl.innerText = latestDateFormatted;
        if (lastMileEl) lastMileEl.innerText = latest.mileage > 0 ? `${parseInt(latest.mileage).toLocaleString('th-TH')} กม.` : '-';
    } else {
        if (lastDateEl) lastDateEl.innerText = '-';
        if (lastMileEl) lastMileEl.innerText = '-';
    }

    if (!listEl) return;
    listEl.innerHTML = '';

    if (totalCount === 0) {
        listEl.innerHTML = `
            <div class="empty-state" style="padding: 35px 20px;">
                <span class="icon" style="font-size: 2.5rem; display: block; margin-bottom: 8px;">📜</span>
                <p style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">ยังไม่มีประวัติการเปลี่ยน/ซ่อมสำหรับ "${part.name}"</p>
                <span style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 16px;">
                    คุณสามารถกดปุ่มด้านล่างเพื่อเริ่มบันทึกประวัติการเปลี่ยนครั้งแรกได้ทันที
                </span>
                <button type="button" class="btn btn-sm btn-primary" onclick="closeModal('modal-part-history'); openLogReplacement('${part.id}')">
                    ➕ บันทึกการเปลี่ยนอะไหล่นี้ครั้งแรก
                </button>
            </div>
        `;
    } else {
        partRecords.forEach(record => {
            const dateFormatted = new Date(record.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            const attachments = getRecordAttachments(record);
            let receiptHTML = '';

            if (attachments.length > 0) {
                let itemsHTML = '';
                attachments.forEach((att, attIdx) => {
                    const name = att.name || 'เอกสารแนบ';
                    const lowerName = name.toLowerCase();
                    const isPdf = lowerName.endsWith('.pdf') || att.docType === 'pdf';
                    const sizeText = att.compressedSize ? formatFileSize(att.compressedSize) : '';

                    if (att.type === 'image') {
                        itemsHTML += `
                            <div class="timeline-attach-thumb" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดูรูป (${name})">
                                <img src="${att.data}" alt="${name}">
                                ${sizeText ? `<span class="attach-size-badge">${sizeText}</span>` : ''}
                            </div>
                        `;
                    } else if (isPdf && att.thumbnail) {
                        itemsHTML += `
                            <div class="timeline-attach-thumb is-pdf-thumb" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดู PDF (${name})">
                                <img src="${att.thumbnail}" alt="${name}">
                                <span class="pdf-tag-overlay">📕 PDF</span>
                                ${sizeText ? `<span class="attach-size-badge">${sizeText}</span>` : ''}
                            </div>
                        `;
                    } else {
                        itemsHTML += `
                            <div class="doc-attachment-badge" onclick="zoomAttachment('${record.id}', ${attIdx})" title="คลิกเพื่อเปิดดู (${name})" style="cursor: pointer;">
                                <span class="doc-badge-icon">${isPdf ? '📕' : '📄'}</span>
                                <div class="doc-badge-info">
                                    <span class="doc-badge-name">${name}</span>
                                    <span class="doc-badge-action">👁️ เปิดดู ${sizeText ? `(${sizeText})` : ''} ↗</span>
                                </div>
                            </div>
                        `;
                    }
                });
                receiptHTML = `
                    <div class="timeline-receipt-area" style="margin-top: 10px;">
                        <div class="timeline-attachments-gallery">
                            ${itemsHTML}
                        </div>
                    </div>
                `;
            }

            const costDisplay = record.cost ? `${parseFloat(record.cost).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท` : 'ไม่ระบุค่าใช้จ่าย';

            const cardHTML = `
                <div class="timeline-card" style="margin-bottom: 12px;">
                    <div class="timeline-main-info">
                        <div class="timeline-header">
                            <span class="timeline-date-badge">📅 ${dateFormatted}</span>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" class="btn btn-sm btn-text" onclick="closeModal('modal-part-history'); openEditHistory('${record.id}')" style="color:var(--primary); padding:0; min-height: auto;">✏️ แก้ไข</button>
                                <button type="button" class="btn btn-sm btn-text" onclick="deleteHistoryRecord('${record.id}'); if(currentPartHistoryId) showPartHistory(currentPartHistoryId);" style="color:var(--danger); padding:0; min-height: auto;">🗑️ ลบ</button>
                            </div>
                        </div>
                        <div class="timeline-meta" style="margin-top: 8px;">
                            <span>🚗 ไมล์: ${record.mileage > 0 ? `${parseInt(record.mileage).toLocaleString('th-TH')} กม.` : 'ไม่ระบุ'}</span>
                            <span>💰 ค่าใช้จ่าย: <strong class="text-cyan">${costDisplay}</strong></span>
                        </div>
                        ${record.mechanic ? `<div style="font-size:0.85rem; color:var(--text-muted); margin-top: 4px;">📍 สถานที่/อู่: <span style="color:var(--text-main);">${record.mechanic}</span></div>` : ''}
                        ${record.notes ? `<p class="timeline-notes" style="margin-top: 6px;">${record.notes}</p>` : ''}
                    </div>
                    ${receiptHTML}
                </div>
            `;
            listEl.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    openModal('modal-part-history');
};

// Part History Modal button listeners
const btnClosePartHist = document.getElementById('btn-close-part-history');
if (btnClosePartHist) btnClosePartHist.addEventListener('click', () => closeModal('modal-part-history'));

const btnClosePartHistFooter = document.getElementById('btn-close-part-history-footer');
if (btnClosePartHistFooter) btnClosePartHistFooter.addEventListener('click', () => closeModal('modal-part-history'));

const btnPartHistAddNew = document.getElementById('btn-part-hist-add-new');
if (btnPartHistAddNew) {
    btnPartHistAddNew.addEventListener('click', () => {
        if (!currentPartHistoryId) return;
        const targetId = currentPartHistoryId;
        closeModal('modal-part-history');
        openLogReplacement(targetId);
    });
}

const btnPartHistViewAll = document.getElementById('btn-part-hist-view-all');
if (btnPartHistViewAll) {
    btnPartHistViewAll.addEventListener('click', () => {
        if (!currentPartHistoryId) return;
        const targetId = currentPartHistoryId;
        closeModal('modal-part-history');

        // Switch to history tab
        document.querySelectorAll('.nav-menu .nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        const histNavBtn = document.getElementById('btn-tab-history');
        const histTab = document.getElementById('tab-history');
        if (histNavBtn) histNavBtn.classList.add('active');
        if (histTab) histTab.classList.add('active');

        // Pre-filter history dropdown to this part
        const filterDropdown = document.getElementById('history-filter-part');
        if (filterDropdown) {
            filterDropdown.value = targetId;
        }
        renderHistory();
    });
}

// Log Replacement Modal Controls
window.openLogReplacement = function(partId) {
    const part = state.parts.find(p => p.id === partId);
    
    document.getElementById('form-history').reset();
    document.getElementById('hist-id').value = '';
    currentSelectedAttachments = [];
    currentSelectedReceiptBase64 = "";
    currentSelectedReceiptName = "";
    
    // Clear custom name input
    document.getElementById('hist-custom-name-group').style.display = 'none';
    document.getElementById('hist-custom-name').required = false;
    document.getElementById('hist-custom-name').value = '';

    // Clear attachments preview
    renderAttachmentsPreview();
    document.getElementById('compression-status').style.display = 'none';

    if (fpHistDateInstance) fpHistDateInstance.setDate(new Date());
    document.getElementById('hist-mileage').value = state.car.mileage;
    
    if (part) {
        document.getElementById('hist-part-id').value = part.id;
    }
    
    document.getElementById('modal-history-title').innerText = "บันทึกการเปลี่ยนอะไหล่/บำรุงรักษา";
    openModal('modal-history');
};

// Edit existing service history record
window.openEditHistory = function(id) {
    const record = state.history.find(h => h.id === id);
    if (!record) return;
    
    document.getElementById('form-history').reset();
    document.getElementById('hist-id').value = record.id;
    
    // Check if it's general repair or linked to part
    const partSelect = document.getElementById('hist-part-id');
    const customGroup = document.getElementById('hist-custom-name-group');
    const customInput = document.getElementById('hist-custom-name');
    
    if (record.partId === 'general-repair') {
        partSelect.value = 'general-repair';
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.value = record.partName;
    } else {
        partSelect.value = record.partId;
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }

    if (fpHistDateInstance) fpHistDateInstance.setDate(record.date);
    document.getElementById('hist-mileage').value = record.mileage || '';
    document.getElementById('hist-cost').value = record.cost || '';
    document.getElementById('hist-mechanic').value = record.mechanic || '';
    document.getElementById('hist-notes').value = record.notes || '';
    
    currentSelectedAttachments = JSON.parse(JSON.stringify(getRecordAttachments(record)));
    renderAttachmentsPreview();
    document.getElementById('compression-status').style.display = 'none';
    
    document.getElementById('modal-history-title').innerText = "แก้ไขประวัติการบำรุงรักษา";
    openModal('modal-history');
};

// Open standalone service history log modal
document.getElementById('btn-open-add-history-modal').addEventListener('click', () => {
    openLogReplacement(null);
});
document.getElementById('btn-close-history-modal').addEventListener('click', () => closeModal('modal-history'));
document.getElementById('btn-cancel-history').addEventListener('click', () => closeModal('modal-history'));

// Upload file picker trigger click
document.getElementById('receipt-drop-zone').addEventListener('click', () => {
    document.getElementById('hist-receipt-file').click();
});

// Render attachments preview gallery inside Service History modal
function renderAttachmentsPreview() {
    const grid = document.getElementById('attachments-preview-grid');
    const countSpan = document.getElementById('hist-files-count');
    if (!grid) return;
    grid.innerHTML = '';

    if (!currentSelectedAttachments || currentSelectedAttachments.length === 0) {
        grid.style.display = 'none';
        if (countSpan) countSpan.innerText = '';
        return;
    }

    grid.style.display = 'grid';
    if (countSpan) countSpan.innerText = `(แนบแล้ว ${currentSelectedAttachments.length} ไฟล์)`;

    currentSelectedAttachments.forEach((att, idx) => {
        let itemHTML = '';
        const lowerName = (att.name || '').toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || att.docType === 'pdf';
        const sizeStr = att.compressedSize ? formatFileSize(att.compressedSize) : '';

        if (att.thumbnail || att.type === 'image') {
            const imgSrc = att.thumbnail || att.data;
            itemHTML = `
                <div class="attach-item is-image" onclick="openDocumentViewer(currentSelectedAttachments[${idx}], 'ใบเสร็จ / หลักฐาน', '${att.name || ''}')" title="คลิกเพื่อเปิดดู (${att.name || 'รูปภาพ'})">
                    <img src="${imgSrc}" alt="${att.name || 'รูปภาพ'}">
                    ${isPdf ? '<span class="pdf-tag-overlay">📕 PDF</span>' : ''}
                    ${sizeStr ? `<span class="attach-size-badge">${sizeStr}</span>` : ''}
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removeAttachment(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        } else {
            let icon = '📄';
            let desc = 'เอกสาร';
            if (isPdf) { icon = '📕'; desc = 'PDF'; }
            else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) { icon = '📊'; desc = 'Excel'; }
            else if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) { icon = '📝'; desc = 'Word'; }

            itemHTML = `
                <div class="attach-item is-doc" onclick="openDocumentViewer(currentSelectedAttachments[${idx}], 'ใบเสร็จ / หลักฐาน', '${att.name || ''}')" style="cursor: pointer;">
                    <span class="attach-doc-icon">${icon}</span>
                    <span class="attach-doc-name" title="${att.name}">${att.name}</span>
                    <span class="attach-doc-type">${desc} ${sizeStr ? `(${sizeStr})` : ''}</span>
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removeAttachment(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        }
        grid.insertAdjacentHTML('beforeend', itemHTML);
    });
}

window.removeAttachment = function(idx) {
    if (idx >= 0 && idx < currentSelectedAttachments.length) {
        currentSelectedAttachments.splice(idx, 1);
        renderAttachmentsPreview();
    }
};

window.zoomImagePreview = function(attId) {
    const att = currentSelectedAttachments.find(a => a.id === attId);
    if (att && att.data) {
        openDocumentViewer(att, 'ดูเอกสารแนบ', att.name);
    }
};

// File input change handler for history receipts
document.getElementById('hist-receipt-file').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    await processAttachmentFiles(files, currentSelectedAttachments, renderAttachmentsPreview, 'compression-status', 'history');
    e.target.value = '';
});

// Save Service History Record
document.getElementById('form-history').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('hist-id').value;
    const partId = document.getElementById('hist-part-id').value;
    const date = document.getElementById('hist-date').value;
    const mileage = parseInt(document.getElementById('hist-mileage').value) || 0;
    const cost = parseFloat(document.getElementById('hist-cost').value) || 0;
    const mechanic = document.getElementById('hist-mechanic').value;
    const notes = document.getElementById('hist-notes').value;
    
    let partName = '';
    if (partId === 'general-repair') {
        partName = document.getElementById('hist-custom-name').value.trim() || 'งานซ่อมบำรุงทั่วไป';
    } else {
        const part = state.parts.find(p => p.id === partId);
        if (!part) {
            alert("กรุณาเลือกรายการอะไหล่");
            return;
        }
        partName = part.name;
    }

    updateState(() => {
        if (id) {
            // Edit existing history record
            const idx = state.history.findIndex(h => h.id === id);
            if (idx !== -1) {
                state.history[idx] = {
                    id,
                    partId,
                    partName,
                    date,
                    mileage,
                    cost,
                    mechanic,
                    notes,
                    attachments: currentSelectedAttachments,
                    receipt: currentSelectedAttachments[0]?.data || "",
                    receiptName: currentSelectedAttachments[0]?.name || ""
                };
            }
        } else {
            // Add new history record
            const newHistId = 'hist-' + Math.random().toString(36).substr(2, 9);
            state.history.push({
                id: newHistId,
                partId,
                partName,
                date,
                mileage,
                cost,
                mechanic,
                notes,
                attachments: currentSelectedAttachments,
                receipt: currentSelectedAttachments[0]?.data || "",
                receiptName: currentSelectedAttachments[0]?.name || ""
            });
        }

        // UPDATE THE PART'S LAST SERVICE RECORD METRICS IMMEDIATELY (if it's a tracked part)
        if (partId !== 'general-repair') {
            const partIdx = state.parts.findIndex(p => p.id === partId);
            if (partIdx !== -1) {
                state.parts[partIdx].lastServiceDate = date;
                // Only update part's last service mileage if user actually specified a value > 0
                if (mileage > 0) {
                    state.parts[partIdx].lastServiceMileage = mileage;
                }
            }
        }

        // Auto update car overall mileage if logged service mileage is higher
        if (mileage > 0 && mileage > state.car.mileage) {
            state.car.mileage = mileage;
        }

        // Auto-log mileage point for this service date only if specified
        if (mileage > 0) {
            logMileagePoint(date, mileage, true);
        }
    });

    closeModal('modal-history');
});

// Delete history logs
window.deleteHistoryRecord = function(id) {
    if (!confirm("คุณต้องการลบประวัติรายการนี้จริงหรือไม่? (ข้อมูลถาวรจะไม่ได้รับการกู้คืน)")) return;
    
    updateState(() => {
        state.history = state.history.filter(h => h.id !== id);
    });
};

// --- UNIVERSAL DOCUMENT & PDF VIEWER CONTROLS ---
let currentViewerDoc = null;
let currentViewerPdfInstance = null;
let currentViewerPage = 1;
let currentViewerTotalPages = 1;
let currentViewerScale = 1.0;

async function openDocumentViewer(att, title = "ดูเอกสารแนบ", meta = "") {
    if (!att || !att.data) return;
    currentViewerDoc = att;
    currentViewerPage = 1;
    currentViewerScale = 1.0;

    const modalTitle = document.getElementById('doc-viewer-title');
    const modalMeta = document.getElementById('doc-viewer-meta');
    const badgeEl = document.getElementById('doc-viewer-compress-badge');
    const imgEl = document.getElementById('receipt-zoom-img');
    const canvasEl = document.getElementById('pdf-viewer-canvas');
    const iframeEl = document.getElementById('doc-viewer-iframe');
    const pdfControls = document.getElementById('pdf-nav-controls');
    const zoomText = document.getElementById('zoom-level-text');

    if (modalTitle) modalTitle.innerText = title;
    if (modalMeta) {
        const sizeInfo = att.compressedSize ? `ขนาด: ${formatFileSize(att.compressedSize)}` : (att.originalSize ? `ขนาด: ${formatFileSize(att.originalSize)}` : '');
        modalMeta.innerText = `${att.name || ''} ${sizeInfo}`;
    }
    if (badgeEl) {
        if (att.savingsPercent && att.savingsPercent > 0) {
            badgeEl.innerText = `⚡ บีบอัด HD แล้ว (ลดลง ${att.savingsPercent}%)`;
            badgeEl.style.display = 'inline-flex';
        } else if (att.compressedSize) {
            badgeEl.innerText = `⚡ บีบอัด HD ประหยัดพื้นที่แล้ว`;
            badgeEl.style.display = 'inline-flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }
    if (zoomText) zoomText.innerText = '100%';

    const isPdf = (att.name && att.name.toLowerCase().endsWith('.pdf')) || (att.data && att.data.startsWith('data:application/pdf')) || att.docType === 'pdf';

    if (isPdf) {
        imgEl.style.display = 'none';
        iframeEl.style.display = 'none';
        canvasEl.style.display = 'block';
        if (pdfControls) pdfControls.style.display = 'flex';

        // Auto-optimize legacy uncompressed PDF if detected
        if (!att.compressedSize || (att.originalSize && att.compressedSize === att.originalSize && att.originalSize > 200 * 1024)) {
            try {
                await ensurePdfLibraries();
                const res = await compressPdf(att.data, { maxDimension: 1280, quality: 0.70 });
                att.data = res.dataUrl;
                att.thumbnail = res.thumbnail;
                att.docType = 'pdf';
                att.pageCount = res.pageCount;
                att.originalSize = res.originalSize;
                att.compressedSize = res.compressedSize;
                att.savingsPercent = res.savingsPercent;
                if (modalMeta) {
                    modalMeta.innerText = `${att.name || ''} ขนาด: ${formatFileSize(att.compressedSize)}`;
                }
                if (badgeEl) {
                    badgeEl.innerText = `⚡ บีบอัด HD แล้ว (ลดลง ${att.savingsPercent}%)`;
                    badgeEl.style.display = 'inline-flex';
                }
                saveStateToCache();
            } catch (e) {
                console.warn("[PDF Engine] Auto-compress notice:", e.message);
            }
        }

        try {
            await ensurePdfLibraries();
            const bytes = dataUriToUint8Array(att.data);
            const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
            currentViewerPdfInstance = await loadingTask.promise;
            currentViewerTotalPages = currentViewerPdfInstance.numPages;
            await renderViewerPdfPage(currentViewerPage);
        } catch (err) {
            console.error("PDF viewer render error:", err);
            canvasEl.style.display = 'none';
            iframeEl.style.display = 'block';
            iframeEl.src = att.data;
            if (pdfControls) pdfControls.style.display = 'none';
        }
    } else if (att.type === 'image' || (att.data && att.data.startsWith('data:image/'))) {
        canvasEl.style.display = 'none';
        iframeEl.style.display = 'none';
        if (pdfControls) pdfControls.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = att.data;
        imgEl.style.transform = `scale(1.0)`;
    } else {
        // Other docs (iframe view)
        canvasEl.style.display = 'none';
        imgEl.style.display = 'none';
        iframeEl.style.display = 'block';
        iframeEl.src = att.data;
        if (pdfControls) pdfControls.style.display = 'none';
    }

    openModal('modal-receipt-view');
}

async function renderViewerPdfPage(pageNum) {
    if (!currentViewerPdfInstance) return;
    const canvas = document.getElementById('pdf-viewer-canvas');
    if (!canvas) return;
    const page = await currentViewerPdfInstance.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentViewerScale * 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    const pageInfo = document.getElementById('pdf-page-info');
    if (pageInfo) pageInfo.innerText = `หน้า ${pageNum} / ${currentViewerTotalPages}`;
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.innerText = `${Math.round(currentViewerScale * 100)}%`;
}

// Viewer PDF page navigation
document.getElementById('btn-pdf-prev').addEventListener('click', () => {
    if (currentViewerPage > 1) {
        currentViewerPage--;
        renderViewerPdfPage(currentViewerPage);
    }
});
document.getElementById('btn-pdf-next').addEventListener('click', () => {
    if (currentViewerPage < currentViewerTotalPages) {
        currentViewerPage++;
        renderViewerPdfPage(currentViewerPage);
    }
});

// Viewer Zoom controls
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    currentViewerScale = Math.min(3.0, currentViewerScale + 0.25);
    const imgEl = document.getElementById('receipt-zoom-img');
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.innerText = `${Math.round(currentViewerScale * 100)}%`;
    if (imgEl && imgEl.style.display !== 'none') {
        imgEl.style.transform = `scale(${currentViewerScale})`;
    } else {
        renderViewerPdfPage(currentViewerPage);
    }
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    currentViewerScale = Math.max(0.5, currentViewerScale - 0.25);
    const imgEl = document.getElementById('receipt-zoom-img');
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.innerText = `${Math.round(currentViewerScale * 100)}%`;
    if (imgEl && imgEl.style.display !== 'none') {
        imgEl.style.transform = `scale(${currentViewerScale})`;
    } else {
        renderViewerPdfPage(currentViewerPage);
    }
});

document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    currentViewerScale = 1.0;
    const imgEl = document.getElementById('receipt-zoom-img');
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.innerText = '100%';
    if (imgEl && imgEl.style.display !== 'none') {
        imgEl.style.transform = `scale(1.0)`;
    } else {
        renderViewerPdfPage(currentViewerPage);
    }
});

// Viewer Actions: Download, Open in new tab, Recompress
document.getElementById('btn-doc-download').addEventListener('click', () => {
    if (!currentViewerDoc || !currentViewerDoc.data) return;
    const a = document.createElement('a');
    a.href = currentViewerDoc.data;
    a.download = currentViewerDoc.name || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
});

document.getElementById('btn-doc-open-tab').addEventListener('click', () => {
    if (!currentViewerDoc || !currentViewerDoc.data) return;
    try {
        const parts = currentViewerDoc.data.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bytes = dataUriToUint8Array(currentViewerDoc.data);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    } catch (e) {
        window.open(currentViewerDoc.data, '_blank');
    }
});

const btnDocCompressTune = document.getElementById('btn-doc-compress-tune');
if (btnDocCompressTune) {
    btnDocCompressTune.addEventListener('click', () => {
        if (!currentViewerDoc) return;
        closeModal('modal-receipt-view');
        openCompressorHelper(currentViewerDoc, 'viewer');
    });
}

// Zoom Receipt / Attachment Modal Controls (backward compatible)
window.zoomAttachment = function(recordId, attachIdx = 0) {
    const record = state.history.find(h => h.id === recordId);
    if (!record) return;
    const attachments = getRecordAttachments(record);
    const att = attachments[attachIdx];
    if (att && att.data) {
        openDocumentViewer(att, record.partName, `ใบเสร็จ วันที่ ${record.date}`);
    }
};

window.zoomReceipt = function(recordId) {
    window.zoomAttachment(recordId, 0);
};

document.getElementById('btn-close-receipt-zoom').addEventListener('click', () => closeModal('modal-receipt-view'));
document.getElementById('btn-close-receipt-zoom-footer').addEventListener('click', () => closeModal('modal-receipt-view'));

// Dashboard quick document view
window.viewQuickDoc = function(partId) {
    const part = state.parts.find(p => p.id === partId);
    if (!part) return;

    let docAtt = null;
    if (part.attachments && part.attachments.length > 0) {
        docAtt = part.attachments[0];
    } else {
        const histRecords = state.history.filter(h => h.partId === part.id);
        for (const h of histRecords) {
            const atts = getRecordAttachments(h);
            if (atts && atts.length > 0) {
                docAtt = atts[0];
                break;
            }
        }
    }

    if (docAtt) {
        openDocumentViewer(docAtt, part.name, `เอกสารกรมธรรม์ / ภาษี`);
    } else {
        alert("ไม่พบเอกสารแนบสำหรับรายการนี้");
    }
};

// --- PDF & FILE COMPRESSOR HELPER (PDF24 STYLE) CONTROLS ---
let compHelperCurrentAtt = null;
let compHelperQuality = 0.70;
let compHelperMaxDim = 1280;
let compHelperPage = 1;
let compHelperTotalPages = 1;
let compHelperResult = null;
let compHelperPdfInstance = null;

async function openCompressorHelper(targetAttachment, context = 'standalone') {
    activeCompressorContext = context;
    compHelperCurrentAtt = targetAttachment;
    compHelperPage = 1;
    compHelperQuality = 0.70;
    compHelperMaxDim = 1280;
    compHelperResult = null;

    // Reset preset buttons to Medium (Recommended)
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    const medBtn = document.getElementById('preset-medium');
    if (medBtn) medBtn.classList.add('active');
    const qSlider = document.getElementById('compressor-quality-slider');
    if (qSlider) qSlider.value = 70;
    const qVal = document.getElementById('compressor-quality-val');
    if (qVal) qVal.innerText = '70%';

    const standaloneArea = document.getElementById('compressor-standalone-drop');
    const applyBtn = document.getElementById('btn-apply-compressed');

    if (!targetAttachment) {
        // Opened without pre-existing attachment
        if (standaloneArea) standaloneArea.style.display = 'block';
        if (applyBtn) applyBtn.style.display = 'none';
        document.getElementById('comp-file-name').innerText = 'ยังไม่ได้เลือกไฟล์';
        document.getElementById('comp-orig-size').innerText = '-';
        document.getElementById('comp-new-size').innerText = '-';
        document.getElementById('comp-savings').innerText = '-';
        document.getElementById('compressor-preview-canvas').style.display = 'none';
        document.getElementById('compressor-preview-img').style.display = 'none';
        document.getElementById('comp-page-nav').style.display = 'none';
        openModal('modal-compressor-helper');
        return;
    }

    if (standaloneArea) standaloneArea.style.display = 'none';
    if (applyBtn) applyBtn.style.display = (context === 'viewer' || context === 'standalone') ? 'none' : 'inline-block';

    openModal('modal-compressor-helper');
    await runCompressionInHelper();
}

async function runCompressionInHelper() {
    if (!compHelperCurrentAtt || !compHelperCurrentAtt.data) return;

    const spinner = document.getElementById('comp-loading-spinner');
    const canvas = document.getElementById('compressor-preview-canvas');
    const imgEl = document.getElementById('compressor-preview-img');
    const pageNav = document.getElementById('comp-page-nav');

    if (spinner) spinner.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
    if (imgEl) imgEl.style.display = 'none';

    document.getElementById('comp-file-name').innerText = compHelperCurrentAtt.name || 'เอกสาร';
    const origSize = compHelperCurrentAtt.originalSize || Math.round((compHelperCurrentAtt.data.length * 3) / 4);
    document.getElementById('comp-orig-size').innerText = formatFileSize(origSize);

    const isPdf = (compHelperCurrentAtt.name && compHelperCurrentAtt.name.toLowerCase().endsWith('.pdf')) || (compHelperCurrentAtt.data && compHelperCurrentAtt.data.startsWith('data:application/pdf')) || compHelperCurrentAtt.docType === 'pdf';

    try {
        if (isPdf) {
            compHelperResult = await compressPdf(compHelperCurrentAtt.data, {
                maxDimension: compHelperMaxDim,
                quality: compHelperQuality
            });
            compHelperTotalPages = compHelperResult.pageCount || 1;

            // Load compressed PDF for preview
            await ensurePdfLibraries();
            const bytes = dataUriToUint8Array(compHelperResult.dataUrl);
            const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
            compHelperPdfInstance = await loadingTask.promise;
            await renderCompressorHelperPage(compHelperPage);

            if (pageNav) {
                pageNav.style.display = compHelperTotalPages > 1 ? 'flex' : 'none';
                const pageInd = document.getElementById('comp-page-indicator');
                if (pageInd) pageInd.innerText = `หน้า ${compHelperPage} / ${compHelperTotalPages}`;
            }
        } else {
            // Image
            compHelperResult = await compressImage(compHelperCurrentAtt.data, {
                maxDimension: compHelperMaxDim,
                quality: compHelperQuality
            });
            compHelperTotalPages = 1;
            if (pageNav) pageNav.style.display = 'none';

            if (imgEl) {
                imgEl.src = compHelperResult.dataUrl;
                imgEl.style.display = 'block';
            }
        }

        document.getElementById('comp-new-size').innerText = formatFileSize(compHelperResult.compressedSize);
        document.getElementById('comp-savings').innerText = `ลดลง ${compHelperResult.savingsPercent}%`;
    } catch (err) {
        console.error("Helper compression error:", err);
        alert("เกิดข้อผิดพลาดในการบีบอัดเอกสาร: " + err.message);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

async function renderCompressorHelperPage(pageNum) {
    if (!compHelperPdfInstance) return;
    const canvas = document.getElementById('compressor-preview-canvas');
    if (!canvas) return;
    const page = await compHelperPdfInstance.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    canvas.style.display = 'block';

    const pageInd = document.getElementById('comp-page-indicator');
    if (pageInd) pageInd.innerText = `หน้า ${pageNum} / ${compHelperTotalPages}`;
}

// Compressor helper page navigation
document.getElementById('comp-prev-page').addEventListener('click', async () => {
    if (compHelperPage > 1) {
        compHelperPage--;
        await renderCompressorHelperPage(compHelperPage);
    }
});
document.getElementById('comp-next-page').addEventListener('click', async () => {
    if (compHelperPage < compHelperTotalPages) {
        compHelperPage++;
        await renderCompressorHelperPage(compHelperPage);
    }
});

// Compressor Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.dataset.preset;
        const slider = document.getElementById('compressor-quality-slider');
        const valSpan = document.getElementById('compressor-quality-val');

        if (preset === 'low') {
            compHelperMaxDim = 1000;
            compHelperQuality = 0.55;
            if (slider) slider.value = 55;
            if (valSpan) valSpan.innerText = '55%';
        } else if (preset === 'medium') {
            compHelperMaxDim = 1280;
            compHelperQuality = 0.70;
            if (slider) slider.value = 70;
            if (valSpan) valSpan.innerText = '70%';
        } else if (preset === 'high') {
            compHelperMaxDim = 1600;
            compHelperQuality = 0.82;
            if (slider) slider.value = 82;
            if (valSpan) valSpan.innerText = '82%';
        }

        await runCompressionInHelper();
    });
});

// Compressor Slider & Recompress
const compSlider = document.getElementById('compressor-quality-slider');
if (compSlider) {
    compSlider.addEventListener('input', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const qVal = parseInt(e.target.value);
        compHelperQuality = qVal / 100;
        document.getElementById('compressor-quality-val').innerText = `${qVal}%`;
    });
}
document.getElementById('btn-recompress').addEventListener('click', () => {
    runCompressionInHelper();
});

// Compressor Apply to Active Context
document.getElementById('btn-apply-compressed').addEventListener('click', () => {
    if (!compHelperResult || !compHelperCurrentAtt) {
        closeModal('modal-compressor-helper');
        return;
    }

    compHelperCurrentAtt.data = compHelperResult.dataUrl;
    compHelperCurrentAtt.thumbnail = compHelperResult.thumbnail || compHelperResult.dataUrl;
    compHelperCurrentAtt.compressedSize = compHelperResult.compressedSize;
    compHelperCurrentAtt.savingsPercent = compHelperResult.savingsPercent;

    if (activeCompressorContext === 'history') {
        renderAttachmentsPreview();
    } else if (activeCompressorContext === 'part') {
        renderPartAttachmentsPreview();
    } else if (activeCompressorContext === 'car') {
        renderCarDocsPreview();
    }

    closeModal('modal-compressor-helper');
});

// Compressor Download
document.getElementById('btn-download-compressed').addEventListener('click', () => {
    if (!compHelperResult || !compHelperResult.dataUrl) return;
    const a = document.createElement('a');
    a.href = compHelperResult.dataUrl;
    const baseName = compHelperCurrentAtt ? compHelperCurrentAtt.name : 'compressed_document';
    a.download = `compressed_${baseName}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
});

document.getElementById('btn-close-compressor-helper').addEventListener('click', () => closeModal('modal-compressor-helper'));
document.getElementById('btn-cancel-compressor-helper').addEventListener('click', () => closeModal('modal-compressor-helper'));

// Standalone drop area inside compressor helper
const standaloneDropArea = document.getElementById('compressor-standalone-area');
const standaloneInput = document.getElementById('compressor-standalone-input');
if (standaloneDropArea && standaloneInput) {
    standaloneDropArea.addEventListener('click', () => standaloneInput.click());
    standaloneInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            compHelperCurrentAtt = {
                id: 'comp-file-' + Date.now(),
                name: file.name,
                data: evt.target.result,
                originalSize: file.size,
                type: file.type.startsWith('image/') ? 'image' : 'doc'
            };
            document.getElementById('compressor-standalone-drop').style.display = 'none';
            await runCompressionInHelper();
        };
        reader.readAsDataURL(file);
    });
}

// Quick Compressor Header / Sidebar triggers
document.getElementById('btn-header-compressor').addEventListener('click', () => {
    openCompressorHelper(null, 'standalone');
});
const btnSidebarCompressor = document.getElementById('btn-sidebar-compressor');
if (btnSidebarCompressor) {
    btnSidebarCompressor.addEventListener('click', () => {
        openCompressorHelper(null, 'standalone');
    });
}

// Contextual Helper buttons
const btnHelperHist = document.getElementById('btn-helper-history');
if (btnHelperHist) {
    btnHelperHist.addEventListener('click', () => {
        const target = currentSelectedAttachments.length > 0 ? currentSelectedAttachments[currentSelectedAttachments.length - 1] : null;
        openCompressorHelper(target, 'history');
    });
}
const btnHelperPart = document.getElementById('btn-helper-part');
if (btnHelperPart) {
    btnHelperPart.addEventListener('click', () => {
        const target = currentPartAttachments.length > 0 ? currentPartAttachments[currentPartAttachments.length - 1] : null;
        openCompressorHelper(target, 'part');
    });
}
const btnHelperCar = document.getElementById('btn-helper-car');
if (btnHelperCar) {
    btnHelperCar.addEventListener('click', () => {
        const target = currentCarDocuments.length > 0 ? currentCarDocuments[currentCarDocuments.length - 1] : null;
        openCompressorHelper(target, 'car');
    });
}

// --- CAR DOCUMENTS CONTROLS (SETTINGS MODULE) ---
const carDocDropZone = document.getElementById('car-doc-drop-zone');
const carDocFile = document.getElementById('car-doc-file');
if (carDocDropZone && carDocFile) {
    carDocDropZone.addEventListener('click', () => carDocFile.click());
    carDocFile.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        await processAttachmentFiles(files, currentCarDocuments, renderCarDocsPreview, 'car-doc-compression-status', 'car');
        e.target.value = '';
    });
}

function renderCarDocsPreview() {
    const grid = document.getElementById('car-docs-preview-grid');
    const countSpan = document.getElementById('car-docs-count');
    if (!grid) return;
    grid.innerHTML = '';

    if (!currentCarDocuments || currentCarDocuments.length === 0) {
        grid.style.display = 'none';
        if (countSpan) countSpan.innerText = '';
        return;
    }

    grid.style.display = 'grid';
    if (countSpan) countSpan.innerText = `(แนบแล้ว ${currentCarDocuments.length} ไฟล์)`;

    currentCarDocuments.forEach((att, idx) => {
        let itemHTML = '';
        const lowerName = (att.name || '').toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || att.docType === 'pdf';
        const sizeStr = att.compressedSize ? formatFileSize(att.compressedSize) : '';

        if (att.thumbnail || att.type === 'image') {
            const imgSrc = att.thumbnail || att.data;
            itemHTML = `
                <div class="attach-item is-image" onclick="openDocumentViewer(currentCarDocuments[${idx}], 'เอกสารประจำรถ', '${att.name || ''}')" title="คลิกเพื่อเปิดดู (${att.name || 'เอกสาร'})">
                    <img src="${imgSrc}" alt="${att.name || 'เอกสาร'}">
                    ${isPdf ? '<span class="pdf-tag-overlay">📕 PDF</span>' : ''}
                    ${sizeStr ? `<span class="attach-size-badge">${sizeStr}</span>` : ''}
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removeCarDoc(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        } else {
            let icon = '📄';
            let desc = 'เอกสาร';
            if (isPdf) { icon = '📕'; desc = 'PDF'; }
            else if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) { icon = '📊'; desc = 'Excel'; }
            else if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) { icon = '📝'; desc = 'Word'; }

            itemHTML = `
                <div class="attach-item is-doc" onclick="openDocumentViewer(currentCarDocuments[${idx}], 'เอกสารประจำรถ', '${att.name || ''}')" style="cursor: pointer;">
                    <span class="attach-doc-icon">${icon}</span>
                    <span class="attach-doc-name" title="${att.name}">${att.name}</span>
                    <span class="attach-doc-type">${desc} ${sizeStr ? `(${sizeStr})` : ''}</span>
                    <button type="button" class="btn-remove-attach" onclick="event.stopPropagation(); removeCarDoc(${idx});" title="ลบไฟล์นี้">&times;</button>
                </div>
            `;
        }
        grid.insertAdjacentHTML('beforeend', itemHTML);
    });
}

window.removeCarDoc = function(idx) {
    if (idx >= 0 && idx < currentCarDocuments.length) {
        currentCarDocuments.splice(idx, 1);
        renderCarDocsPreview();
    }
};

// Mileage Quick Update Form
document.getElementById('btn-quick-mileage').addEventListener('click', () => {
    document.getElementById('quick-mileage-val').value = state.car.mileage;
    openModal('modal-mileage');
});
document.getElementById('btn-close-mileage-modal').addEventListener('click', () => closeModal('modal-mileage'));
document.getElementById('btn-cancel-mileage').addEventListener('click', () => closeModal('modal-mileage'));

document.getElementById('form-quick-mileage').addEventListener('submit', (e) => {
    e.preventDefault();
    const mileage = parseInt(document.getElementById('quick-mileage-val').value);
    
    if (mileage < state.car.mileage) {
        if (!confirm("เลขไมล์ที่กรอกมีค่าน้อยกว่าเลขไมล์ที่มีอยู่ปัจจุบัน ยืนยันที่จะปรับลดหรือไม่?")) {
            return;
        }
    }

    updateState(() => {
        state.car.mileage = mileage;
        logMileagePoint(new Date().toISOString().split('T')[0], mileage, true);
    });
    
    closeModal('modal-mileage');
});

// Car info page form submit
document.getElementById('form-car-info').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('set-car-name').value;
    const plate = document.getElementById('set-car-plate').value;
    const mileage = parseInt(document.getElementById('set-car-mileage').value) || 0;

    updateState(() => {
        state.car.name = name;
        state.car.plate = plate;
        state.car.mileage = mileage;
        state.car.documents = currentCarDocuments;
        logMileagePoint(new Date().toISOString().split('T')[0], mileage, true);
    });
    
    alert("บันทึกข้อมูลรถยนต์เรียบร้อยแล้ว");
});

// Dashboard redirect helpers
document.getElementById('btn-goto-tracker').addEventListener('click', () => {
    document.getElementById('btn-tab-tracker').click();
});

// Sync Conflict Toast Banner reload button
document.getElementById('btn-toast-reload').addEventListener('click', () => {
    syncWithCloudOneDrive(false);
});

// Search & Filter listeners
document.getElementById('tracker-search').addEventListener('input', renderTracker);
document.getElementById('tracker-filter-category').addEventListener('change', renderTracker);
document.getElementById('history-search').addEventListener('input', renderHistory);
document.getElementById('history-filter-part').addEventListener('change', renderHistory);

// Dropdown change listener for custom repair logging name
document.getElementById('hist-part-id').addEventListener('change', (e) => {
    const val = e.target.value;
    const customGroup = document.getElementById('hist-custom-name-group');
    const customInput = document.getElementById('hist-custom-name');
    if (val === 'general-repair') {
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.focus();
    } else {
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
});

// Settings - File System Access button click
document.getElementById('btn-select-local-file').addEventListener('click', () => {
    selectLocalFile();
});

// Settings - Add Mileage Log Form Submit
document.getElementById('form-add-mileage-log').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('add-mileage-date').value;
    const mileage = parseInt(document.getElementById('add-mileage-val').value);
    
    if (!date || isNaN(mileage)) return;
    
    logMileagePoint(date, mileage);
    
    // Reset form inputs
    document.getElementById('add-mileage-val').value = '';
    if (fpAddMileageDateInstance) fpAddMileageDateInstance.setDate(new Date());
});

// Settings - Save Microsoft App Client ID
document.getElementById('btn-save-client-id').addEventListener('click', () => {
    const val = document.getElementById('set-client-id').value.trim();
    state.cloudClientId = val;
    localStorage.setItem('pm_my_car_client_id', val);
    alert("บันทึก Client ID เรียบร้อยแล้ว กำลังเริ่มต้นระบบเชื่อมต่อ...");
    setupMSAL();
});

// Settings - Microsoft Login/Logout buttons
document.getElementById('btn-cloud-login').addEventListener('click', loginCloud);
document.getElementById('btn-cloud-logout').addEventListener('click', logoutCloud);
document.getElementById('btn-cloud-pull').addEventListener('click', () => syncWithCloudOneDrive(false));
document.getElementById('btn-cloud-push').addEventListener('click', pushDataToCloud);

// Settings - Backup buttons
document.getElementById('btn-manual-export').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        car: state.car,
        parts: state.parts,
        history: state.history,
        mileageLog: state.mileageLog,
        lastUpdated: state.lastUpdated
    }, null, 2));
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pm_my_car_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('btn-manual-import-trigger').addEventListener('click', () => {
    document.getElementById('input-manual-import-file').click();
});

document.getElementById('input-manual-import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (!parsed.car || !parsed.parts || !parsed.history) {
                throw new Error("โครงสร้างไฟล์ไม่ถูกต้อง (ขาดข้อมูลรถ อะไหล่ หรือประวัติ)");
            }
            
            if (confirm("ต้องการนำเข้าฐานข้อมูลนี้ทับข้อมูลปัจจุบันหรือไม่? (ข้อมูลเก่าทั้งหมดจะหายไป)")) {
                updateState(() => {
                    state.car = parsed.car;
                    state.parts = parsed.parts;
                    state.history = parsed.history;
                    state.mileageLog = parsed.mileageLog || [];
                    state.lastUpdated = parsed.lastUpdated || Date.now();
                });
                alert("นำเข้าฐานข้อมูลสำเร็จ!");
            }
        } catch (err) {
            alert("ไฟล์ JSON ไม่ถูกต้อง: " + err.message);
        }
    };
});

// Demo Data Loader
document.getElementById('btn-load-demo-data').addEventListener('click', () => {
    if (confirm("ต้องการโหลดข้อมูลจำลองมาทดสอบหรือไม่? (ข้อมูลปัจจุบันจะถูกเขียนทับ)")) {
        updateState(() => {
            state.car = JSON.parse(JSON.stringify(DEMO_DATA.car));
            state.parts = JSON.parse(JSON.stringify(DEMO_DATA.parts));
            state.history = JSON.parse(JSON.stringify(DEMO_DATA.history));
            state.lastUpdated = Date.now();
        });
        alert("โหลดข้อมูลจำลองเรียบร้อยแล้ว!");
    }
});

// Clear DB Loader
document.getElementById('btn-clear-db').addEventListener('click', () => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลในเครื่องทั้งหมด? (หากไม่ได้เซฟลง OneDrive ข้อมูลจะสูญหายถาวร)")) {
        clearCache();
        updateState(() => {
            state.car = { name: "รถของฉัน", plate: "", mileage: 0 };
            state.parts = [];
            state.history = [];
            state.mileageLog = [];
            state.lastUpdated = 0;
        });
        alert("ล้างข้อมูลระบบเสร็จสิ้น");
    }
});

// --- 10. INITIALIZATION BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', async () => {
    // Fill client ID input from memory
    document.getElementById('set-client-id').value = state.cloudClientId;

    try {
        await initIndexedDB();
        
        // Try to load cached data
        const cacheLoaded = await loadStateFromCache();
        
        if (!cacheLoaded) {
            // Default initial state if completely empty
            state.car = { name: "รถของฉัน", plate: "", mileage: 0 };
            state.parts = [];
            state.history = [];
            state.mileageLog = [];
            state.lastUpdated = 0;
        }
        
        // Attempt to auto-grant File System Access if previously chosen
        await attemptRestoreLocalFile();
        
        // Initialize Flatpickr calendar elements
        fpLastDateInstance = flatpickr("#part-last-date", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "th",
            defaultDate: new Date()
        });

        fpTargetDateInstance = flatpickr("#part-target-date", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "th"
        });

        fpHistDateInstance = flatpickr("#hist-date", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "th",
            defaultDate: new Date()
        });

        fpAddMileageDateInstance = flatpickr("#add-mileage-date", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "d/m/Y",
            locale: "th",
            defaultDate: new Date()
        });

        // Initialize MSAL OneDrive Cloud integration
        setupMSAL();
        
        // Initial render
        renderAll();

        // Background auto-optimization for any legacy uncompressed attachments
        setTimeout(() => {
            optimizeExistingAttachments();
        }, 2500);
    } catch (e) {
        console.error("App Booting failed:", e);
    }
});
