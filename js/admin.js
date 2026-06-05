// js/admin.js
document.addEventListener("DOMContentLoaded", () => {
    // 設定後端 API 的基礎 URL
    const API_BASE_URL = 'http://localhost:5000';

    /* -------------------------------------------------------------
       1. 處理管理員登入 (admin_login.html)
    ------------------------------------------------------------- */
    const loginForm = document.getElementById("adminLoginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const account = document.getElementById("adminAccount").value;
            const password = document.getElementById("adminPassword").value;

            fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account, password })
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error("認證失敗");
                }
                return res.json();
            })
            .then(data => {
                localStorage.setItem("adminUser", data.admin_name || "系統管理員");
                alert("登入成功！跳轉至管理後台...");
                window.location.href = "admin.html";
            })
            .catch(err => {
                console.error(err);
                alert("登入失敗：管理員帳號或密碼錯誤。");
            });
        });
    }

    /* -------------------------------------------------------------
       2. 處理管理員後台介面 (admin.html)
    ------------------------------------------------------------- */
    if (window.location.pathname.endsWith("admin.html")) {
        // 檢查登入狀態
        const currentAdmin = localStorage.getItem("adminUser");
        if (!currentAdmin) {
            alert("安全性拒絕：請先登入系統。");
            window.location.href = "admin_login.html";
            return;
        }
        document.getElementById("currentAdminName").innerText = currentAdmin;

        // 登出功能
        document.getElementById("adminLogoutBtn").addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("adminUser");
            alert("您已安全登出系統。");
            window.location.href = "admin_login.html";
        });

        // 側邊欄選單切換
        const navItems = document.querySelectorAll(".admin-nav li[data-target]");
        const sections = document.querySelectorAll(".content-section");

        navItems.forEach(item => {
            item.addEventListener("click", () => {
                navItems.forEach(nav => nav.classList.remove("active"));
                sections.forEach(sec => sec.style.display = "none");

                item.classList.add("active");
                const targetId = item.getAttribute("data-target");
                document.getElementById(targetId).style.display = "block";

                if (targetId === "reservationSection") {
                    fetchReservations();
                } else if (targetId === "dashboardSection") {
                    fetchStats();
                }
            });
        });

        // 發佈公告表單提交 (UC-10)
        const postAnnForm = document.getElementById("postAnnouncementForm");
        if (postAnnForm) {
            postAnnForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const title = document.getElementById("annTitle").value;
                const category = document.getElementById("annCategory").value;
                const content = document.getElementById("annContent").value;

                fetch(`${API_BASE_URL}/announcements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, category, content })
                })
                .then(res => {
                    if (!res.ok) throw new Error("發布失敗");
                    return res.json();
                })
                .then(data => {
                    alert('系統公告已發佈成功。');
                    postAnnForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("發佈失敗：無法連線至後端伺服器或權限不足。");
                });
            });
        }

        // 修改塔位狀態表單提交 (UC-04)
        const updateSlotForm = document.getElementById("updateSlotForm");
        if (updateSlotForm) {
            updateSlotForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const slotId = document.getElementById("editSlotId").value;
                const status = document.getElementById("editSlotStatus").value;

                fetch(`${API_BASE_URL}/slots/${slotId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: status })
                })
                .then(res => {
                    if (!res.ok) throw new Error("更新失敗");
                    return res.json();
                })
                .then(data => {
                    alert(`塔位 ${slotId} 狀態已更新成功。`);
                    updateSlotForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("更新失敗：無法變更該塔位狀態。");
                });
            });
        }

        // 刪除/取消預約紀錄 (CRUD 刪除操作)
        const reservationTableBody = document.getElementById("reservationTableBody");
        if (reservationTableBody) {
            reservationTableBody.addEventListener("click", (e) => {
                if (e.target.classList.contains("btn-delete-reserve") || e.target.closest(".btn-delete-reserve")) {
                    const button = e.target.classList.contains("btn-delete-reserve") ? e.target : e.target.closest(".btn-delete-reserve");
                    const reserveId = button.getAttribute("data-id");
                    
                    if (confirm(`確定要作廢編號 [${reserveId}] 的預約紀錄嗎？`)) {
                        fetch(`${API_BASE_URL}/reservations/${reserveId}`, {
                            method: 'DELETE'
                        })
                        .then(res => {
                            if (!res.ok) throw new Error("刪除失敗");
                            return res.json();
                        })
                        .then(data => {
                            alert("預約紀錄已成功刪除。");
                            fetchReservations(); 
                        })
                        .catch(err => {
                            console.error(err);
                            alert("刪除失敗：伺服器處理異常或該紀錄已不存在。");
                        });
                    }
                }
            });
        }

        // 初始化載入
        fetchStats();
    }
});

// 獲取儀表板統計數據
function fetchStats() {
    const API_BASE_URL = 'http://localhost:5000';
    
    fetch(`${API_BASE_URL}/api/admin/stats`)
        .then(res => {
            if (!res.ok) throw new Error("讀取統計失敗");
            return res.json();
        })
        .then(data => {
            document.getElementById("statsTotalSlots").innerText = data.total_slots;
            document.getElementById("statsEmptySlots").innerText = data.empty_slots;
            document.getElementById("statsTodayReservations").innerText = data.today_reservations;
            document.getElementById("statsUnpaidBills").innerText = data.unpaid_bills;
        })
        .catch(err => {
            console.error(err);
            document.getElementById("statsTotalSlots").innerText = "NaN";
            document.getElementById("statsEmptySlots").innerText = "NaN";
            document.getElementById("statsTodayReservations").innerText = "NaN";
            document.getElementById("statsUnpaidBills").innerText = "NaN";
        });
}

// 獲取預約總表
function fetchReservations() {
    const API_BASE_URL = 'http://localhost:5000';
    const tbody = document.getElementById("reservationTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">安全資料傳輸中...</td></tr>`;

    fetch(`${API_BASE_URL}/reservations`)
        .then(res => {
            if (!res.ok) throw new Error("獲取列表失敗");
            return res.json();
        })
        .then(data => {
            tbody.innerHTML = "";
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">目前系統中無任何預約紀錄</td></tr>`;
                return;
            }
            data.forEach(resItem => {
                tbody.innerHTML += `
                    <tr>
                        <td>${resItem.reserve_id}</td>
                        <td>${resItem.user_name} (ID: ${resItem.user_id})</td>
                        <td>${resItem.slot_id}</td>
                        <td>${resItem.reserve_date} ${resItem.time_slot}</td>
                        <td>${resItem.parking_spot_id ? resItem.parking_spot_id + ' 號' : '無車位'}</td>
                        <td><span class="status-badge">${resItem.status}</span></td>
                        <td>
                            <button class="btn-delete-reserve" data-id="${resItem.reserve_id}" style="color:red; cursor:pointer; background:none; border:none; font-weight:bold;">
                                刪除紀錄
                            </button>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">資料載入失敗：內部 API 連線異常。</td></tr>`;
        });
}