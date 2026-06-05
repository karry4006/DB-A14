// js/main.js
const API_BASE_URL = 'http://localhost:5000';

document.addEventListener("DOMContentLoaded", () => {

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
                        <p>無法載入公告列表，請確認 API 服務是否啟動。</p>
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
            const payload = {
                account: document.getElementById("regAccount").value,
                password: document.getElementById("regPassword").value,
                name: document.getElementById("regName").value,
                id_number: document.getElementById("regIdNumber").value
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

        // 預設載入
        loadMemberSlots(userId);

        // 預約實體祭拜 (UC-03)
        const reserveForm = document.getElementById("reserveForm");
        if(reserveForm) {
            reserveForm.addEventListener("submit", (e) => {
                e.preventDefault();
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
                    alert(`預約排程已成功登錄！系統已排他性配置車位號碼: ${data.parking_spot_id}`);
                    reserveForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("預約失敗：該時段或塔位可能存在排程衝突，請修正後重試。");
                });
            });
        }

        // 數位追思留言 (UC-05)
        const messageForm = document.getElementById("messageForm");
        if(messageForm) {
            messageForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const payload = {
                    deceased_id: parseInt(document.getElementById("msgDeceasedId").value),
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
                    alert('數位追思紀錄已成功寫入線上追思牆資料表。');
                    messageForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("留言失敗：無法傳輸資料，請確認後端服務。");
                    messageForm.reset();
                });
            });
        }
    }

});

// 獲取名下塔位與親友 (UC-07)
function loadMemberSlots(userId) {
    const tbody = document.getElementById("memberSlotsBody");
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">安全憑證驗證與讀取中...</td></tr>`;
    
    fetch(`${API_BASE_URL}/users/${userId}/slots`)
        .then(res => {
            if (!res.ok) throw new Error("讀取名下數據失敗");
            return res.json();
        })
        .then(data => {
            tbody.innerHTML = "";
            if(data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">經查關聯資料表，您名下目前無登記塔位。</td></tr>`;
                return;
            }
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.slot_id}</td>
                        <td>${item.floor}樓 ${item.zone}區 ${item.cabinet}號</td>
                        <td>${item.deceased_name ? item.deceased_name : '未進駐'}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">通訊中斷：無法載入名下資料。</td></tr>`;
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
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">目前無未清償或应繳之管理費帳單。</td></tr>`;
                return;
            }
            data.forEach(bill => {
                tbody.innerHTML += `
                    <tr>
                        <td>${bill.bill_year} 年度</td>
                        <td>$${bill.amount.toLocaleString()}</td>
                        <td>${bill.due_date}</td>
                        <td><span class="badge">${bill.status}</span></td>
                        <td>${bill.status === '未繳費' ? '<button style="cursor:pointer; font-weight:bold;">線上核銷</button>' : '已沖銷'}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">通訊中斷：無法載入應繳帳單。</td></tr>`;
        });
}