// =====================================
// API URL（GASのWebアプリURLに変更）
// =====================================
const API_URL = "https://script.google.com/macros/s/AKfycbwOuDB5f9Z6_CuEqEa3me41y1GrLarSvGV6BaFDedOEvN83-kfs7YJ_-6obI1EUejqX/exec";

// =====================================
// 初期処理
// =====================================
document.addEventListener("DOMContentLoaded", () => {
    setDefaultDate();

    document
        .getElementById("searchButton")
        .addEventListener("click", loadRequests);

    loadRequests();
});

// =====================================
// 次の営業日（土日除外）をセット
// =====================================
function setDefaultDate() {

    const today = new Date();
    let target = new Date(today);

    target.setDate(target.getDate() + 1);

    while (
        target.getDay() === 0 || // 日曜
        target.getDay() === 6    // 土曜
    ) {
        target.setDate(target.getDate() + 1);
    }

    document.getElementById("targetDate").value =
        formatDate(target);
}

// =====================================
// yyyy-MM-dd
// =====================================
function formatDate(date) {

    const y = date.getFullYear();

    const m = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const d = String(
        date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

// =====================================
// 案件取得
// =====================================
async function loadRequests() {

    const loading = document.getElementById("loading");
    const requestList = document.getElementById("requestList");
    const emptyMessage = document.getElementById("emptyMessage");

    loading.classList.remove("hidden");

    requestList.innerHTML = "";
    emptyMessage.classList.add("hidden");

    try {

        const date =
            document.getElementById("targetDate").value;

        const keyword =
            document.getElementById("keyword").value.trim();

        const url =
            `${API_URL}?action=getWarehouseRequests` +
            `&date=${encodeURIComponent(date)}` +
            `&keyword=${encodeURIComponent(keyword)}`;

        const response = await fetch(url);

        const result = await response.json();

        if (!result.success) {
            alert(result.message || "取得に失敗しました");
            return;
        }

        if (result.data.length === 0) {

            emptyMessage.classList.remove("hidden");
            return;
        }

        renderCards(result.data);

    } catch (error) {

        console.error(error);

        alert("データ取得に失敗しました");

    } finally {

        loading.classList.add("hidden");

    }

}

// =====================================
// カード生成
// =====================================
function renderCards(data) {

    const requestList =
        document.getElementById("requestList");

    const groups = {};

    data.forEach(item => {

        const key =
            `${item.pickupDate}_${item.company}_${item.person}`;

        if (!groups[key]) {

            groups[key] = {
                pickupDate: item.pickupDate,
                company: item.company,
                person: item.person,
                items: []
            };

        }

        groups[key].items.push(item);

    });

    Object.values(groups).forEach(group => {

        const card = document.createElement("article");

        card.className = "request-card";

        let html = `
            <div class="card-header">
                <h2>${escapeHtml(group.company)}</h2>
                <p>出庫者：${escapeHtml(group.person)}</p>
                <p>出庫希望日：${escapeHtml(group.pickupDate)}</p>
            </div>
        `;

        group.items.forEach(item => {

            html += `
                <div class="item-block">

                    <div class="item-name">
                        ${escapeHtml(item.itemName)}
                    </div>

                    <div class="item-quantity">
                        数量：${item.quantity}${item.unit}
                    </div>

                    <div class="result-group">

                        <div class="result-option">

                            <input
                                type="radio"
                                id="complete-${item.detailId}"
                                name="item-${item.detailId}"
                                value="準備完了">

                            <label
                                for="complete-${item.detailId}"
                                class="complete-label">

                                準備完了

                            </label>

                        </div>

                        <div class="result-option">

                            <input
                                type="radio"
                                id="unable-${item.detailId}"
                                name="item-${item.detailId}"
                                value="準備不可">

                            <label
                                for="unable-${item.detailId}"
                                class="unable-label">

                                準備不可

                            </label>

                        </div>

                    </div>

                </div>
            `;

        });

        html += `
            <button class="confirm-button">
                確定
            </button>
        `;

        card.innerHTML = html;

        const button =
            card.querySelector(".confirm-button");

        button.addEventListener("click", () => {
            submitGroup(group);
        });

        requestList.appendChild(card);

    });

}

// =====================================
// 更新処理
// =====================================
async function submitGroup(group) {

    const updates = [];

    for (const item of group.items) {

        const selected = document.querySelector(
            `input[name="item-${item.detailId}"]:checked`
        );

        if (!selected) {

            alert(
                "未入力の品目があります。\n" +
                "すべての品目の結果を選択してください。"
            );

            return;
        }

        updates.push({
            id: item.detailId,
            status: selected.value
        });

    }

    const ok = confirm(
        "この内容で更新しますか？"
    );

    if (!ok) {
        return;
    }

    try {

        const url =
            `${API_URL}?action=updateWarehouseStatus` +
            `&updates=${encodeURIComponent(
                JSON.stringify(updates)
            )}`;

        const response = await fetch(url);

        const result = await response.json();

        if (!result.success) {

            alert(
                result.message ||
                "更新に失敗しました"
            );

            return;
        }

        alert(result.message);

        loadRequests();

    } catch (error) {

        console.error(error);

        alert("更新に失敗しました");

    }

}

// =====================================
// HTMLエスケープ
// =====================================
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}