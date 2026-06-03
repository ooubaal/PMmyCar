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

// Temporary in-memory compressed receipt image
let currentSelectedReceiptBase64 = "";

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

// --- 6. IMAGE COMPRESSION (HD REDUCED SIZE CANVAS) ---
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Max size HD (1280px)
                const MAX_SIZE = 1280;
                
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export as compressed Jpeg (quality: 0.65)
                const base64Data = canvas.toDataURL('image/jpeg', 0.65);
                
                resolve(base64Data);
            };
            
            img.onerror = function(err) {
                reject(err);
            };
        };
        
        reader.onerror = function(err) {
            reject(err);
        };
    });
}

// --- 7. MAINTENANCE BUSINESS LOGIC (CALCULATE DUES) ---

// Calculate average daily driving distance in km
function calculateAverageDailyKm() {
    if (!state.mileageLog || state.mileageLog.length < 2) {
        return 30; // Fallback default value (30 km/day)
    }
    
    // Sort chronologically
    const sortedLogs = [...state.mileageLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const earliest = sortedLogs[0];
    const latest = sortedLogs[sortedLogs.length - 1];
    
    const distanceDiff = latest.mileage - earliest.mileage;
    const timeDiffMs = new Date(latest.date) - new Date(earliest.date);
    const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
    
    if (timeDiffDays <= 0 || distanceDiff <= 0) {
        return 30; // Fallback if dates are identical or distance went backwards
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
    
    // 1. Time-based calculation
    if (part.dueType === 'time' || part.dueType === 'both') {
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + parseInt(part.dueMonths));
        nextDueDate = nextDate;
        
        const msDiff = nextDate - today;
        daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        
        const totalDurationDays = part.dueMonths * 30.4;
        timePercent = Math.max(0, daysRemaining / totalDurationDays);
    }
    
    let mileageRemaining = Infinity;
    let mileagePercent = 1.0;
    let nextDueMileage = null;
    let predictedDueDate = null;
    let predictedDays = Infinity;
    
    // 2. Mileage-based calculation
    if (part.dueType === 'mileage' || part.dueType === 'both') {
        nextDueMileage = parseInt(part.lastServiceMileage) + parseInt(part.dueIntervalMileage);
        mileageRemaining = nextDueMileage - currentMileage;
        
        mileagePercent = Math.max(0, mileageRemaining / part.dueIntervalMileage);
        
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
    
    // 3. Combined status
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
    } else { // Both
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
}

function renderHeader() {
    document.getElementById('disp-current-mileage').innerText = state.car.mileage.toLocaleString('th-TH');
    document.getElementById('car-quick-name').innerText = `${state.car.name} ${state.car.plate ? `(${state.car.plate})` : ''}`;
    
    // Settings forms values
    document.getElementById('set-car-name').value = state.car.name;
    document.getElementById('set-car-plate').value = state.car.plate;
    document.getElementById('set-car-mileage').value = state.car.mileage;
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
    if (!part) {
        el.innerText = "ยังไม่ได้เปิดติดตาม";
        el.className = "status-tag tag-inactive";
        return;
    }
    const calc = calculatePartStatus(part, state.car.mileage);
    el.innerText = calc.explanation;
    el.className = `status-tag tag-${calc.status}`;
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
            targetText = `ทุก ${part.dueIntervalMileage.toLocaleString('th-TH')} กม.`;
        } else {
            targetText = `ทุก ${part.dueIntervalMileage.toLocaleString('th-TH')} กม. / ${part.dueMonths} ด.`;
        }

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
                        <span class="lbl">รอบเตือนถัดไป</span>
                        <span class="val">${targetText}</span>
                    </div>
                    <div class="metric-item">
                        <span class="lbl">สถานะรายละเอียด</span>
                        <span class="val" style="color: var(${colorVar});">${calc.status === 'overdue' ? 'ต้องตรวจเปลี่ยน' : 'สภาพดี'}</span>
                    </div>
                </div>

                <div class="part-card-footer">
                    <button class="btn btn-sm btn-secondary" onclick="openEditPart('${part.id}')">แก้ไขสเปก</button>
                    <button class="btn btn-sm btn-primary" onclick="openLogReplacement('${part.id}')" style="flex-grow:1;">
                        บันทึกการเปลี่ยนอะไหล่
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
        
        let receiptHTML = '';
        if (record.receipt) {
            receiptHTML = `
                <div class="timeline-receipt-area">
                    <div class="receipt-thumbnail" onclick="zoomReceipt('${record.id}')">
                        <img src="${record.receipt}" alt="Receipt image">
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
                        <span>🚗 ${parseInt(record.mileage).toLocaleString('th-TH')} กม.</span>
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

    historyFilter.value = selectedHistoryFilter;
}

window.openEditHistory = function(id) {
    const record = state.history.find(h => h.id === id);
    if (!record) return;
    
    document.getElementById('form-history').reset();
    document.getElementById('hist-id').value = record.id;
    document.getElementById('hist-part-id').value = record.partId;
    
    if (fpHistDateInstance) fpHistDateInstance.setDate(record.date);
    document.getElementById('hist-mileage').value = record.mileage;
    document.getElementById('hist-cost').value = record.cost || '';
    document.getElementById('hist-mechanic').value = record.mechanic || '';
    document.getElementById('hist-notes').value = record.notes || '';
    
    currentSelectedReceiptBase64 = record.receipt || "";
    
    // Set up receipt preview
    if (record.receipt) {
        document.getElementById('receipt-preview-img').src = record.receipt;
        document.getElementById('receipt-preview-container').style.display = 'flex';
        document.getElementById('receipt-upload-placeholder').style.display = 'none';
    } else {
        document.getElementById('receipt-preview-container').style.display = 'none';
        document.getElementById('receipt-upload-placeholder').style.display = 'flex';
    }
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

// Part Modal controls
document.getElementById('btn-open-add-part-modal').addEventListener('click', () => {
    document.getElementById('form-part').reset();
    document.getElementById('part-id').value = '';
    document.getElementById('modal-part-title').innerText = "เพิ่มอะไหล่ใหม่ที่ต้องการติดตาม";
    
    // Set default dates
    if (fpLastDateInstance) fpLastDateInstance.setDate(new Date());
    document.getElementById('part-last-mileage').value = state.car.mileage;
    
    // Toggle correct inputs
    document.getElementById('radio-due-time').click();
    openModal('modal-part');
});
document.getElementById('btn-close-part-modal').addEventListener('click', () => closeModal('modal-part'));
document.getElementById('btn-cancel-part').addEventListener('click', () => closeModal('modal-part'));

// Due setting radios toggle input displays
document.getElementsByName('due-type').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        const timeBox = document.getElementById('due-time-input-group');
        const mileageBox = document.getElementById('due-mileage-input-group');
        
        if (val === 'time') {
            timeBox.style.display = 'block';
            mileageBox.style.display = 'none';
        } else if (val === 'mileage') {
            timeBox.style.display = 'none';
            mileageBox.style.display = 'block';
        } else {
            timeBox.style.display = 'block';
            mileageBox.style.display = 'block';
        }
    });
});

// Save Part Form Submit
document.getElementById('form-part').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('part-id').value;
    const name = document.getElementById('part-name').value;
    const category = document.getElementById('part-category').value;
    const description = document.getElementById('part-description').value;
    const lastDate = document.getElementById('part-last-date').value;
    const lastMileage = parseInt(document.getElementById('part-last-mileage').value) || 0;
    
    const dueType = document.querySelector('input[name="due-type"]:checked').value;
    const dueMonths = parseInt(document.getElementById('part-due-months').value) || 0;
    const dueIntervalMileage = parseInt(document.getElementById('part-due-interval-mileage').value) || 0;

    updateState(() => {
        if (id) {
            // Edit existing
            const idx = state.parts.findIndex(p => p.id === id);
            if (idx !== -1) {
                state.parts[idx] = { id, name, category, description, lastServiceDate: lastDate, lastServiceMileage: lastMileage, dueType, dueMonths, dueIntervalMileage };
            }
        } else {
            // Add new
            const newId = 'part-' + Math.random().toString(36).substr(2, 9);
            state.parts.push({ id: newId, name, category, description, lastServiceDate: lastDate, lastServiceMileage: lastMileage, dueType, dueMonths, dueIntervalMileage });
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
    
    document.querySelector(`input[name="due-type"][value="${part.dueType}"]`).click();
    document.getElementById('part-due-months').value = part.dueMonths;
    document.getElementById('part-due-interval-mileage').value = part.dueIntervalMileage;
    
    document.getElementById('modal-part-title').innerText = "แก้ไขข้อมูลสเปกอะไหล่";
    openModal('modal-part');
};

// Log Replacement Modal Controls
window.openLogReplacement = function(partId) {
    const part = state.parts.find(p => p.id === partId);
    
    document.getElementById('form-history').reset();
    document.getElementById('hist-id').value = '';
    currentSelectedReceiptBase64 = "";
    
    // Clear receipt preview
    document.getElementById('receipt-preview-container').style.display = 'none';
    document.getElementById('receipt-upload-placeholder').style.display = 'flex';
    document.getElementById('compression-status').style.display = 'none';

    if (fpHistDateInstance) fpHistDateInstance.setDate(new Date());
    document.getElementById('hist-mileage').value = state.car.mileage;
    
    if (part) {
        document.getElementById('hist-part-id').value = part.id;
    }
    
    document.getElementById('modal-history-title').innerText = "บันทึกการเปลี่ยนอะไหล่/บำรุงรักษา";
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

// Image file input change handler with Canvas compression
document.getElementById('hist-receipt-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show compression progress
    document.getElementById('compression-status').style.display = 'flex';
    document.getElementById('receipt-upload-placeholder').style.display = 'none';

    try {
        const compressedBase64 = await compressImage(file);
        currentSelectedReceiptBase64 = compressedBase64;
        
        // Show Preview
        document.getElementById('receipt-preview-img').src = compressedBase64;
        document.getElementById('receipt-preview-container').style.display = 'flex';
    } catch (err) {
        console.error("Image compression error:", err);
        alert("บีบอัดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง");
        document.getElementById('receipt-upload-placeholder').style.display = 'flex';
    } finally {
        document.getElementById('compression-status').style.display = 'none';
    }
});

// Remove receipt preview image
document.getElementById('btn-remove-receipt').addEventListener('click', (e) => {
    e.stopPropagation(); // Stop click from triggering parent file picker
    currentSelectedReceiptBase64 = "";
    document.getElementById('hist-receipt-file').value = '';
    document.getElementById('receipt-preview-container').style.display = 'none';
    document.getElementById('receipt-upload-placeholder').style.display = 'flex';
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
    
    const part = state.parts.find(p => p.id === partId);
    if (!part) {
        alert("กรุณาเลือกรายการอะไหล่");
        return;
    }

    updateState(() => {
        if (id) {
            // Edit existing history record
            const idx = state.history.findIndex(h => h.id === id);
            if (idx !== -1) {
                state.history[idx] = {
                    id,
                    partId,
                    partName: part.name,
                    date,
                    mileage,
                    cost,
                    mechanic,
                    notes,
                    receipt: currentSelectedReceiptBase64
                };
            }
        } else {
            // Add new history record
            const newHistId = 'hist-' + Math.random().toString(36).substr(2, 9);
            state.history.push({
                id: newHistId,
                partId,
                partName: part.name,
                date,
                mileage,
                cost,
                mechanic,
                notes,
                receipt: currentSelectedReceiptBase64
            });
        }

        // UPDATE THE PART'S LAST SERVICE RECORD METRICS IMMEDIATELY!
        const partIdx = state.parts.findIndex(p => p.id === partId);
        if (partIdx !== -1) {
            // Update mileage only if the new logged service is higher or newer than existing
            state.parts[partIdx].lastServiceDate = date;
            state.parts[partIdx].lastServiceMileage = mileage;
        }

        // Auto update car overall mileage if logged service mileage is higher
        if (mileage > state.car.mileage) {
            state.car.mileage = mileage;
        }

        // Auto-log mileage point for this service date
        logMileagePoint(date, mileage, true);
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

// Zoom Receipt Modal Controls
window.zoomReceipt = function(recordId) {
    const record = state.history.find(h => h.id === recordId);
    if (!record || !record.receipt) return;
    
    document.getElementById('receipt-zoom-img').src = record.receipt;
    openModal('modal-receipt-view');
};
document.getElementById('btn-close-receipt-zoom').addEventListener('click', () => closeModal('modal-receipt-view'));
document.getElementById('btn-close-receipt-zoom-footer').addEventListener('click', () => closeModal('modal-receipt-view'));

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
    } catch (e) {
        console.error("App Booting failed:", e);
    }
});
