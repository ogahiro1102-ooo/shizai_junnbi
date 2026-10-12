// =====================================
// API URL（GASのWebアプリURLに変更）
// =====================================
const API_URL = "https://script.google.com/macros/s/AKfycbwbuHEYq_Zl16t3rXKlG2QKaaO2Ocbn3y3UmQbP-megZbJR72wLLt38O5qRIP6jjyk/exec";


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
        target.getDay() === 0 ||
        target.getDay() === 6
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

    const loading =
        document.getElementById("loading");

    const requestList =
        document.getElementById("requestList");

    const emptyMessage =
        document.getElementById("emptyMessage");


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


        // =================================
        // 通信
        // 最大2回まで試行
        // =================================

        let response = null;
        let lastError = null;

        for (let attempt = 1; attempt <= 2; attempt++) {

            try {

                response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `HTTP error: ${response.status}`
                    );
                }

                break;

            } catch (error) {

                lastError = error;

                console.error(
                    `データ取得失敗（${attempt}回目）`,
                    error
                );

                // 1回目だけ少し待って再試行
                if (attempt < 2) {
                    await new Promise(resolve =>
                        setTimeout(resolve, 500)
                    );
                }

            }

        }


        // 2回とも失敗
        if (!response) {

            throw lastError ||
                new Error("データ取得に失敗しました");

        }


        const result =
            await response.json();


        // =================================
        // GAS側エラー
        // =================================

        if (!result.success) {

            alert(
                result.message ||
                "取得に失敗しました"
            );

            return;

        }


        // =================================
        // データなし
        // =================================

        if (
            !result.data ||
            result.data.length === 0
        ) {

            emptyMessage.classList.remove("hidden");

            return;

        }


        // =================================
        // 表示
        // =================================

        renderCards(result.data);


    } catch (error) {

        console.error(error);

        alert(
            "データ取得に失敗しました"
        );


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

        const card =
            document.createElement("article");


        card.className =
            "request-card";


        let html = `

            <div class="card-header">

                <h2>
                    ${escapeHtml(group.company)}
                </h2>

                <p>
                    出庫者：
                    ${escapeHtml(group.person)}
                </p>

                <p>
                    出庫希望日：
                    ${escapeHtml(group.pickupDate)}
                </p>

            </div>

        `;


        group.items.forEach(item => {

            html += `

                <div
                    class="item-block"
                    data-detail-id="${escapeHtml(item.detailId)}"
                >

                    <div class="item-name">

                        ${escapeHtml(item.itemName)}

                    </div>


                    <div class="item-quantity">

                        申請数量：
                        ${escapeHtml(item.quantity)}
                        ${escapeHtml(item.unit)}

                    </div>


                    <div class="result-group">


                        <!-- 準備完了 -->

                        <div class="result-option">

                            <input
                                type="radio"
                                id="complete-${item.detailId}"
                                name="item-${item.detailId}"
                                value="準備完了"
                            >

                            <label
                                for="complete-${item.detailId}"
                                class="complete-label"
                            >
                                準備完了
                            </label>

                        </div>


                        <!-- 準備不可 -->

                        <div class="result-option">

                            <input
                                type="radio"
                                id="unable-${item.detailId}"
                                name="item-${item.detailId}"
                                value="準備不可"
                            >

                            <label
                                for="unable-${item.detailId}"
                                class="unable-label"
                            >
                                準備不可
                            </label>

                        </div>


                        <!-- 数量調整 -->

                        <div class="result-option">

                            <input
                                type="radio"
                                id="adjust-${item.detailId}"
                                name="item-${item.detailId}"
                                value="数量調整"
                            >

                            <label
                                for="adjust-${item.detailId}"
                                class="adjust-label"
                            >
                                数量調整
                            </label>

                        </div>


                    </div>


                    <!-- ==========================
                         数量調整入力
                    =========================== -->

                    <div
                        class="adjust-area hidden"
                        id="adjust-area-${item.detailId}"
                    >

                        <div class="adjust-item">

                            <label
                                for="actual-${item.detailId}"
                            >
                                実出庫数
                            </label>

                            <input
                                type="number"
                                id="actual-${item.detailId}"
                                min="0"
                                max="${item.quantity}"
                                step="1"
                                placeholder="実際に用意できる数量"
                            >

                            <span>
                                ${escapeHtml(item.unit)}
                            </span>

                        </div>


                        <div class="adjust-item">

                            <label
                                for="reason-${item.detailId}"
                            >
                                調整理由
                            </label>

                            <input
                                type="text"
                                id="reason-${item.detailId}"
                                placeholder="例：倉庫在庫不足"
                            >

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


        // =================================
        // 数量調整選択時の入力欄表示
        // =================================

        group.items.forEach(item => {

            const radios =
                card.querySelectorAll(
                    `input[name="item-${item.detailId}"]`
                );


            const adjustArea =
                card.querySelector(
                    `#adjust-area-${item.detailId}`
                );


            radios.forEach(radio => {

                radio.addEventListener(
                    "change",
                    () => {

                        if (
                            radio.value ===
                            "数量調整" &&
                            radio.checked
                        ) {

                            adjustArea
                                .classList
                                .remove("hidden");

                        } else {

                            adjustArea
                                .classList
                                .add("hidden");

                        }

                    }
                );

            });

        });


        // =================================
        // 確定ボタン
        // =================================

        const button =
            card.querySelector(
                ".confirm-button"
            );


        button.addEventListener(
            "click",
            () => {
                submitGroup(group);
            }
        );


        requestList.appendChild(card);

    });

}


// =====================================
// 更新処理
// =====================================
async function submitGroup(group) {

    const updates = [];


    for (const item of group.items) {

        const selected =
            document.querySelector(
                `input[name="item-${item.detailId}"]:checked`
            );


        // --------------------------------
        // 未選択
        // --------------------------------

        if (!selected) {

            alert(
                "未入力の品目があります。\n" +
                "すべての品目の結果を選択してください。"
            );

            return;

        }


        let actualQty = 0;

        let reason = "";


        // --------------------------------
        // 準備完了
        // --------------------------------

        if (
            selected.value ===
            "準備完了"
        ) {

            actualQty =
                Number(item.quantity);

        }


        // --------------------------------
        // 準備不可
        // --------------------------------

        else if (
            selected.value ===
            "準備不可"
        ) {

            actualQty = 0;

        }


        // --------------------------------
        // 数量調整
        // --------------------------------

        else if (
            selected.value ===
            "数量調整"
        ) {

            const actualInput =
                document.getElementById(
                    `actual-${item.detailId}`
                );


            const reasonInput =
                document.getElementById(
                    `reason-${item.detailId}`
                );


            actualQty =
                Number(actualInput.value);


            reason =
                reasonInput.value.trim();


            // 実出庫数チェック

            if (
                actualInput.value === "" ||
                !Number.isInteger(actualQty) ||
                actualQty < 0
            ) {

                alert(
                    `${item.itemName}\n` +
                    "実出庫数を正しく入力してください。"
                );

                actualInput.focus();

                return;

            }


            if (
                actualQty >
                Number(item.quantity)
            ) {

                alert(
                    `${item.itemName}\n` +
                    "実出庫数が申請数量を超えています。"
                );

                actualInput.focus();

                return;

            }


            // 調整理由チェック

            if (!reason) {

                alert(
                    `${item.itemName}\n` +
                    "調整理由を入力してください。"
                );

                reasonInput.focus();

                return;

            }

        }


        updates.push({

            id: item.detailId,

            status: selected.value,

            actualQty: actualQty,

            reason: reason

        });

    }


    // =================================
    // 最終確認
    // =================================

    const ok =
        confirm(
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


        const response =
            await fetch(url);


        const result =
            await response.json();


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

        alert(
            "更新に失敗しました"
        );

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