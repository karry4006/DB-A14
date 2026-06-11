// js/main.js
const API_BASE_URL = 'http://localhost:5000';

document.addEventListener("DOMContentLoaded", () => {

    /* =============================================================
       0. 會員登入/註冊分頁切換 (auth.html)
       ============================================================= */
    function switchTab(tab) {
        const tabLogin = document.getElementById('tabLogin');
        const tabRegister = document.getElementById('tabRegister');
        const publicLoginForm = document.getElementById('publicLoginForm');
        const publicRegisterForm = document.getElementById('publicRegisterForm');

        if (tabLogin && tabRegister && publicLoginForm && publicRegisterForm) {
            tabLogin.classList.remove('active');
            tabRegister.classList.remove('active');
            publicLoginForm.style.display = 'none';
            publicRegisterForm.style.display = 'none';

            if (tab === 'login') {
                tabLogin.classList.add('active');
                publicLoginForm.style.display = 'block';
            } else {
                tabRegister.classList.add('active');
                publicRegisterForm.style.display = 'block';
            }
        }
    }

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => switchTab('login'));
        tabRegister.addEventListener('click', () => switchTab('register'));
    }


    /* =============================================================
       1. 載入園區公告 (announcements.html) (UC-10)
    ============================================================= */
    const annContainer = document.getElementById("announcementListContainer");
    if (annContainer) {
        annContainer.innerHTML = `<p style="text-align:center;">系統公告載入中...</p>`;

        fetch(`${API_BASE_URL}/announcements`)
            .then(res => {
                if (!res.ok) throw new Error("讀取公告失敗");
                return res.json();
            })
            .then(data => {
                annContainer.innerHTML = ""; 
                if (data.length === 0) {
                    annContainer.innerHTML = `
                        <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 8px;">
                            <h3 style="color: var(--secondary-color); margin-bottom: 10px;">目前尚無最新公告</h3>
                        </div>
                    `;
                    return;
                }
                data.forEach(ann => {
                    annContainer.innerHTML += `
                        <div class="announcement-card" style="background:#fff; padding:20px; margin-bottom:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                            <span style="background:var(--primary-color); color:#fff; padding:3px 8px; border-radius:4px; font-size:0.8rem;">${ann.category}</span>
                            <h3 style="margin: 10px 0; color:var(--secondary-color);">${ann.title}</h3>
                            <p style="color:#555;">${ann.content}</p>
                            <small style="color:#999;">發佈日期: ${ann.publish_date}</small>
                        </div>
                    `;
                });
            })
            .catch(err => {
                console.error(err);
                annContainer.innerHTML = `
                    <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 8px; color: red;">
                        <h3>系統異常</h3>
                        <p>無法載入公告列表，請確認 API 服務是否開啟。</p>
                    </div>
                `;
            });
    }

    /* =============================================================
       2. 塔位查詢 (slots.html) (UC-02)
    ============================================================= */
    const slotSearchForm = document.getElementById("searchSlotForm");
    if (slotSearchForm) {
        slotSearchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const floor = document.getElementById("searchFloor").value;
            const budget = document.getElementById("searchBudget").value;
            const tbody = document.getElementById("slotResults");
            
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">資料庫嚴密檢索中...</td></tr>`;

            const queryParams = new URLSearchParams();
            if (floor) queryParams.append('floor', floor);
            if (budget) queryParams.append('budget', budget);

            fetch(`${API_BASE_URL}/slots?${queryParams.toString()}`)
                .then(res => {
                    if (!res.ok) throw new Error("搜尋失敗");
                    return res.json();
                })
                .then(data => {
                    tbody.innerHTML = "";
                    if (data.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">查無符合條件之塔位數據</td></tr>`;
                        return;
                    }
                    data.forEach(slot => {
                        tbody.innerHTML += `
                            <tr>
                                <td>${slot.slot_id}</td>
                                <td>${slot.floor} 樓</td>
                                <td>${slot.zone} 區</td>
                                <td>${slot.cabinet} 號</td>
                                <td>$${slot.price.toLocaleString()}</td>
                                <td><span class="status">${slot.status}</span></td>
                                <td>${slot.deceased_name ? slot.deceased_name : '無'}</td> 
                            </tr>
                        `;
                    });
                })
                .catch(err => {
                    console.error(err);
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">檢索失敗：無法建立與後端資料庫的連線。</td></tr>`;
                });
        });
    }

    /* =============================================================
       3. 會員註冊與登入 (auth.html) (UC-01)
    ============================================================= */
    const publicRegisterForm = document.getElementById("publicRegisterForm");
    if (publicRegisterForm) {
        publicRegisterForm.addEventListener("submit", (e) => {
            e.preventDefault();
            // 對齊同學 SQL 的 id_card_num 欄位
            const payload = {
                account: document.getElementById("regAccount").value,
                password: document.getElementById("regPassword").value,
                name: document.getElementById("regName").value,
                id_card_num: document.getElementById("regIdNumber").value
            };

            fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error("註冊失敗");
                return res.json();
            })
            .then(data => {
                alert("帳號註冊成功！系統已將資料寫入關聯表，請進行登入。");
                if (typeof switchTab === 'function') switchTab('login');
            })
            .catch(err => {
                console.error(err);
                alert("註冊失敗：連線異常或身分證號/帳號已重複存在。");
            });
        });
    }

    const publicLoginForm = document.getElementById("publicLoginForm");
    if (publicLoginForm) {
        publicLoginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const account = document.getElementById("loginAccount").value;
            const password = document.getElementById("loginPassword").value;

            fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account, password })
            })
            .then(res => {
                if (!res.ok) throw new Error("登入失敗");
                return res.json();
            })
            .then(data => {
                if (data.role === "管理員") {
                    localStorage.setItem("adminUser", data.user_name);
                    alert("認證成功：管理授權通過，跳轉中...");
                    window.location.href = "admin.html";
                } else {
                    localStorage.setItem("memberUserId", data.user_id); 
                    localStorage.setItem("memberUserName", data.user_name);
                    alert("認證成功：會員中心登入成功。");
                    window.location.href = "member.html";
                }
            })
            .catch(err => {
                console.error(err);
                alert("安全拒絕：帳號或密碼不正確，或外部網路未連線。");
            });
        });
    }

    /* =============================================================
       4. 會員後台各項功能 (member.html)
    ============================================================= */
    if (window.location.pathname.endsWith("member.html")) {
        const userId = localStorage.getItem("memberUserId");
        if (!userId) {
            alert("安全性阻擋：未授權用戶請先進行身分驗證。");
            window.location.href = "auth.html";
            return;
        }
        document.getElementById("currentMemberName").innerText = localStorage.getItem("memberUserName");

        const navItems = document.querySelectorAll("#memberNav li");
        const sections = document.querySelectorAll(".content-section");

        navItems.forEach(item => {
            item.addEventListener("click", () => {
                navItems.forEach(n => n.classList.remove("active"));
                sections.forEach(s => s.style.display = "none");
                
                item.classList.add("active");
                const target = item.getAttribute("data-target");
                document.getElementById(target).style.display = "block";

                if (target === "memberSlotsSection") loadMemberSlots(userId);
                else if (target === "memberBillsSection") loadMemberBills(userId);
            });
        });

        // 預設載入名下資料
        loadMemberSlots(userId);

        // 預約實體祭拜 (UC-03)
        const reserveForm = document.getElementById("reserveForm");
        if(reserveForm) {
            reserveForm.addEventListener("submit", (e) => {
                e.preventDefault();
                // 【核心修改】精準對齊同學 SQL 的 RESERVATION 欄位 amount_of_people
                const payload = {
                    user_id: parseInt(userId),
                    slot_id: parseInt(document.getElementById("reserveSlotId").value),
                    reserve_date: document.getElementById("reserveDate").value,
                    time_slot: document.getElementById("reserveTime").value,
                    amount_of_people: parseInt(document.getElementById("reservePeople").value)
                };

                fetch(`${API_BASE_URL}/reservations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("預約寫入失敗");
                    return res.json();
                })
                .then(data => {
                    alert(`預約排程已成功登錄！系統已配置車位號碼: ${data.parking_spot_id ? data.parking_spot_id : '無'}`);
                    reserveForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("預約失敗：該時段或塔位可能存在排程衝突，請更換時間重試。");
                });
            });
        }

        // 數位追思留言 (UC-05)
        const messageForm = document.getElementById("messageForm");
        if(messageForm) {
            messageForm.addEventListener("submit", (e) => {
                e.preventDefault();
                
                const deceasedSelect = document.getElementById("msgDeceasedId");
                const deceasedName = deceasedSelect.options[deceasedSelect.selectedIndex].text;
                
                const payload = {
                    member_id: parseInt(userId),
                    deceased_id: parseInt(deceasedSelect.value),
                    item_type: document.getElementById("msgItem").value,
                    content: document.getElementById("msgContent").value
                };

                fetch(`${API_BASE_URL}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("發送留言失敗");
                    return res.json();
                })
                .then(data => {
                    // 1. 觸發祭拜完成動畫
                    const overlay = document.getElementById('worshipOverlay');
                    if(overlay) overlay.classList.add('active');

                    // 2. 即時更新追思牆
                    addMessageToBoard({
                        name: deceasedName,
                        item: payload.item_type,
                        content: payload.content,
                        time: new Date().toLocaleString()
                    });

                    messageForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("留言失敗：請確認是否已選擇正確的親友對象。");
                });
            });
        }

        // 預設載入追思牆
        loadMemorialMessages();
    }

});

/**
 * 將追思訊息渲染至追思牆 (動態留言板)
 * @param {Object} data - 包含姓名、祭品、內容與時間的物件
 */
function addMessageToBoard(data) {
    const board = document.getElementById("memorialBoard");
    if (!board) return;

    // 如果是第一條留言，移除「目前尚無紀錄」的文字
    if (board.querySelector('p')) {
        board.innerHTML = "";
    }

    const card = document.createElement("div");
    card.className = "memorial-card";
    card.style.opacity = "0"; // 初始透明以觸發 CSS 動畫

    card.innerHTML = `
        <div class="memorial-card-header">
            <span class="memorial-card-name">致：${data.name}</span>
            <span class="memorial-card-item">${data.item !== '無' ? '獻上' + data.item : '誠心追思'}</span>
        </div>
        <div class="memorial-card-content">${data.content}</div>
        <small class="memorial-card-time">${data.time}</small>
    `;

    // 插入到最前面，讓最新的思念顯示在最上方
    board.insertBefore(card, board.firstChild);
    
    // 觸發動畫
    setTimeout(() => card.style.opacity = "1", 50);
}

/**
 * 模擬從 API 載入歷史追思紀錄 (UC-05 延伸)
 */
function loadMemorialMessages() {
    // 實務上應從 API 獲取，此處示範前端動態生成的擴充性
    const board = document.getElementById("memorialBoard");
    if(!board) return;

    // 模擬一些既有的追思紀錄，增加畫面豐富度
    const demoMessages = [
        { name: "王老先生", item: "鮮花", content: "父親，家裡的桔子樹開花了，我們都很想您。", time: "2026/06/10 下午 2:30:15" },
        { name: "李奶奶", item: "水果", content: "端午節快到了，今年我們會準備您最愛的豆沙粽。", time: "2026/06/09 上午 10:15:00" }
    ];

    demoMessages.forEach(msg => addMessageToBoard(msg));
}

// 獲取名下塔位與已故親友關係 (UC-07)
function loadMemberSlots(userId) {
    const tbody = document.getElementById("memberSlotsBody");
    const deceasedSelect = document.getElementById("msgDeceasedId");
    
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">安全憑證驗證與讀取中...</td></tr>`;
    
    fetch(`${API_BASE_URL}/users/${userId}/slots`)
        .then(res => {
            if (!res.ok) throw new Error("讀取名下數據失敗");
            return res.json();
        })
        .then(data => {
            if (tbody) {
                tbody.innerHTML = "";
                if(!data.slots || data.slots.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">經查關聯資料表，您名下目前無登記塔位。</td></tr>`;
                } else {
                    data.slots.forEach(item => {
                        tbody.innerHTML += `
                            <tr>
                                <td>${item.slot_id}</td>
                                <td>${item.floor}樓 ${item.zone}區 ${item.cabinet}號</td>
                                <td>${item.deceased_name ? item.deceased_name : '未進駐'}</td>
                            </tr>
                        `;
                    });
                }
            }

            if (deceasedSelect) {
                deceasedSelect.innerHTML = `<option value="">請選擇追思對象...</option>`;
                if (data.deceased && data.deceased.length > 0) {
                    data.deceased.forEach(person => {
                        deceasedSelect.innerHTML += `<option value="${person.deceased_id}">${person.name}</option>`;
                    });
                } else {
                    deceasedSelect.innerHTML = `<option value="">尚無進駐親友資料</option>`;
                }
            }
        })
        .catch(err => {
            console.error(err);
            if(tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">通訊中斷：無法載入名下資料。</td></tr>`;
        });
}

// 獲取管理費帳單 (UC-06)
function loadMemberBills(userId) {
    const tbody = document.getElementById("memberBillsBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">帳務關聯表檢索中...</td></tr>`;

    fetch(`${API_BASE_URL}/bills?user_id=${userId}`)
        .then(res => {
            if (!res.ok) throw new Error("讀取帳單失敗");
            return res.json();
        })
        .then(data => {
            tbody.innerHTML = "";
            if(data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">目前無未清償或應繳之管理費帳單。</td></tr>`;
                return;
            }
            data.forEach(bill => {
                tbody.innerHTML += `
                    <tr>
                        <td>${bill.bill_year} 年度</td>
                        <td>$${bill.amount.toLocaleString()}</td>
                        <td>${bill.due_date}</td>
                        <td><span class="badge">${bill.status}</span></td>
                        <td>${bill.status === '未繳' ? '<button style="cursor:pointer; font-weight:bold;">線上核銷</button>' : '已沖銷'}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">通訊中斷：無法載入應繳帳單。</td></tr>`;
        });
}