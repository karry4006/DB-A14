// js/admin.js

/* =============================================================
   【需求二】自訂高級網頁彈窗 - 覆寫全域 alert
   ============================================================= */
(function() {
    window.alert = function(message) {
        let overlay = document.getElementById('customAlertOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'customAlertOverlay';
            overlay.className = 'custom-alert-overlay';
            overlay.innerHTML = `
                <div class="custom-alert-box">
                    <div class="custom-alert-header">
                        <span class="icon">📜</span>
                        <span class="title">系統管理提示</span>
                    </div>
                    <div class="custom-alert-body" id="customAlertMessage"></div>
                    <div class="custom-alert-footer">
                        <button class="custom-alert-btn" id="customAlertBtn">確 定</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('customAlertBtn').onclick = () => overlay.classList.remove('active');
            overlay.onclick = (e) => { if(e.target === overlay) overlay.classList.remove('active'); };
        }
        document.getElementById('customAlertMessage').innerText = message;
        overlay.classList.add('active');
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = 'https://mempark-dkfeg8e3f5cmdmcb.japaneast-01.azurewebsites.net';

    /* -------------------------------------------------------------
       1. 處理管理員後台管理介面 (admin.html)
    ------------------------------------------------------------- */
    if (window.location.pathname.endsWith("admin.html")) {
        const currentAdmin = localStorage.getItem("adminUser");
        if (!currentAdmin) {
            alert("安全性拒絕：請先由登入頁進行管理者驗證。");
            window.location.href = "auth.html";
            return;
        }
        document.getElementById("currentAdminName").innerText = currentAdmin;

        // 登出功能
        document.getElementById("adminLogoutBtn").addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("adminUser");
            alert("您已安全登出後端資料庫管理系統。");
            window.location.href = "auth.html";
        });

        // 側邊選單 Tab 切換
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

                // 對齊 SQL 的 admin_id，這裡後端通常可從 Session 取，但我們先封裝好
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
                    alert('系統公告已成功寫入 ANNOUNCEMENT 表。');
                    postAnnForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("發佈失敗：無法連接至後端 API 或權限不足。");
                });
            });
        }

        // 修改塔位狀態與產權變更提交 (UC-04)
        const updateSlotForm = document.getElementById("updateSlotForm");
        if (updateSlotForm) {
            updateSlotForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const slotId = document.getElementById("editSlotId").value;
                const status = document.getElementById("editSlotStatus").value;
                const ownerId = document.getElementById("editSlotOwnerId").value;

                let payload = { status: status };
                if (ownerId) payload.owner_user_id = parseInt(ownerId);

                fetch(`${API_BASE_URL}/slots/${slotId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("更新失敗");
                    return res.json();
                })
                .then(data => {
                    alert(`塔位編號 ${slotId} 資料表交易更新成功。`);
                    updateSlotForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("更新失敗：請確認輸入之會員 ID 是否存在。");
                });
            });
        }

        // 修改會員資歷與基本資料 (UC-09)
        const editUserForm = document.getElementById("editUserForm");
        if (editUserForm) {
            editUserForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const userId = document.getElementById("editUserId").value;
                const name = document.getElementById("editUserName").value;
                const phone = document.getElementById("editUserPhone").value;

                let payload = {};
                if (name) payload.name = name;
                if (phone) payload.phone_number = phone;

                fetch(`${API_BASE_URL}/users/${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("更新家屬資料失敗");
                    return res.json();
                })
                .then(data => {
                    alert(`家屬會員編號 ${userId} 關聯欄位已成功變更。`);
                    editUserForm.reset();
                })
                .catch(err => {
                    console.error(err);
                    alert("更新失敗：找不到該會員編號或連線逾時。");
                });
            });
        }

        // UC-08 預約單篩選
        const filterResForm = document.getElementById("filterReservationForm");
        if (filterResForm) {
            filterResForm.addEventListener("submit", (e) => {
                e.preventDefault();
                fetchReservations();
            });
        }

        // 刪除預約紀錄操作
        const reservationTableBody = document.getElementById("reservationTableBody");
        if (reservationTableBody) {
            reservationTableBody.addEventListener("click", (e) => {
                if (e.target.classList.contains("btn-delete-reserve") || e.target.closest(".btn-delete-reserve")) {
                    const button = e.target.classList.contains("btn-delete-reserve") ? e.target : e.target.closest(".btn-delete-reserve");
                    const reserveId = button.getAttribute("data-id");
                    
                    if (confirm(`警告：確定要永久作廢並刪除預約單編號 [${reserveId}] 嗎？`)) {
                        fetch(`${API_BASE_URL}/reservations/${reserveId}`, {
                            method: 'DELETE'
                        })
                        .then(res => {
                            if (!res.ok) throw new Error("作廢失敗");
                            return res.json();
                        })
                        .then(data => {
                            alert("該預約紀錄已成功從 RESERVATION 關聯表刪除。");
                            fetchReservations(); 
                        })
                        .catch(err => {
                            console.error(err);
                            alert("操作失敗：後端無法順利執行 DELETE 交易。");
                        });
                    }
                }
            });
        }

        // 首次初始化
        fetchStats();
    }
});

// 獲取營運摘要
function fetchStats() {
    const API_BASE_URL = 'https://mempark-dkfeg8e3f5cmdmcb.japaneast-01.azurewebsites.net';
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
        .catch(err => console.error(err));
}

// 獲取預約總表 (對齊 SQL 欄位屬性)
function fetchReservations() {
    const API_BASE_URL = 'https://mempark-dkfeg8e3f5cmdmcb.japaneast-01.azurewebsites.net';
    const tbody = document.getElementById("reservationTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">後端資料嚴密調閱中...</td></tr>`;

    const startDate = document.getElementById("resStartDate")?.value;
    const endDate = document.getElementById("resEndDate")?.value;
    const status = document.getElementById("resStatus")?.value;

    const queryParams = new URLSearchParams();
    if (startDate && endDate) queryParams.append('date_range', `${startDate},${endDate}`);
    if (status) queryParams.append('reservation_status', status);

    fetch(`${API_BASE_URL}/reservations?${queryParams.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error("獲取列表失敗");
            return res.json();
        })
        .then(data => {
            tbody.innerHTML = "";
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">指定篩選條件下查無任何預約數據。</td></tr>`;
                return;
            }
            data.forEach(resItem => {
                // 【相容性優化】同時支援後端傳回 reserve_id 或 id
                const currentResId = resItem.reserve_id || resItem.id;
                tbody.innerHTML += `
                    <tr>
                        <td>${currentResId}</td>
                        <td>${resItem.user || resItem.user_name} (ID: ${resItem.user_id})</td>
                        <td>${resItem.slot_id}</td>
                        <td>${resItem.reserve_date} ${resItem.time_slot}</td>
                        <td>${resItem.parking_spot_id ? resItem.parking_spot_id + ' 號' : '無配置車位'}</td>
                        <td><span class="status-badge">${resItem.status}</span></td>
                        <td>
                            <button class="btn-delete-reserve" data-id="${currentResId}" style="color:var(--primary-color); cursor:pointer; background:none; border:none; font-weight:bold;">
                                取消與作廢
                            </button>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">通訊拒絕：無法載入預約調度紀錄。</td></tr>`;
        });
}