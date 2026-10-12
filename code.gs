// =====================================
// 確認・準備アプリ専用 GAS
// K：状態
// L：実出庫数
// M：調整理由
// GET専用API
// =====================================

const SPREADSHEET_ID = "1u8sEHyB04wYUYuOb2GHoUOX22vf_arDsBYgXfYIqU98";
const REQUEST_SHEET = "出庫依頼";


// =====================================
// GET API
// =====================================

function doGet(e) {

  const action = e.parameter.action;

  try {

    if (action === "getWarehouseRequests") {
      return json(getWarehouseRequests(e));
    }

    if (action === "updateWarehouseStatus") {
      return json(updateWarehouseStatus(e));
    }

    return json({
      success: false,
      message: "invalid action"
    });

  } catch (error) {

    return json({
      success: false,
      message: error.toString()
    });

  }
}


// =====================================
// 出庫対象取得
// =====================================

function getWarehouseRequests(e) {

  const targetDate = e.parameter.date || "";
  const keyword = (e.parameter.keyword || "").trim();

  const sheet =
    SpreadsheetApp
      .openById(SPREADSHEET_ID)
      .getSheetByName(REQUEST_SHEET);

  const values = sheet.getDataRange().getValues();

  const result = [];

  for (let i = 1; i < values.length; i++) {

    const r = values[i];

    const item = {

      // A 明細ID
      detailId: r[0],

      // B 申請番号
      requestNo: r[1],

      // C 申請日
      requestDate: r[2],

      // D 出庫希望日
      pickupDate: r[3],

      // E 業者名
      company: r[4],

      // F 出庫者名
      person: r[5],

      // G 分類
      category: r[6],

      // H 品目
      itemName: r[7],

      // I 申請数量
      quantity: r[8],

      // J 単位
      unit: r[9],

      // K 状態
      status: r[10]

    };


    // ---------------------------------
    // 受付済だけを確認対象にする
    // ---------------------------------

    if (item.status !== "受付済") {
      continue;
    }


    // ---------------------------------
    // 出庫希望日
    // ---------------------------------

    if (targetDate) {

      const d = formatDate(item.pickupDate);

      if (d !== targetDate) {
        continue;
      }

    }


    // ---------------------------------
    // 業者名・出庫者名検索
    // ---------------------------------

    if (keyword) {

      const hit =
        String(item.company).includes(keyword) ||
        String(item.person).includes(keyword);

      if (!hit) {
        continue;
      }

    }


    result.push(item);

  }


  return {
    success: true,
    data: result
  };

}


// =====================================
// 出庫結果更新
// =====================================

function updateWarehouseStatus(e) {

  if (!e.parameter.updates) {

    return {
      success: false,
      message: "更新データがありません"
    };

  }


  const updates =
    JSON.parse(
      decodeURIComponent(
        e.parameter.updates
      )
    );


  const sheet =
    SpreadsheetApp
      .openById(SPREADSHEET_ID)
      .getSheetByName(REQUEST_SHEET);


  const values =
    sheet.getDataRange().getValues();


  let count = 0;


  // ===================================
  // 更新
  // ===================================

  updates.forEach(u => {

    for (let i = 1; i < values.length; i++) {

      // A列：明細ID
      if (
        String(values[i][0]) !==
        String(u.id)
      ) {
        continue;
      }


      const requestedQty =
        Number(values[i][8]);


      let actualQty = 0;
      let reason = "";


      // --------------------------------
      // 準備完了
      // --------------------------------

      if (u.status === "準備完了") {

        actualQty = requestedQty;

      }


      // --------------------------------
      // 準備不可
      // --------------------------------

      else if (u.status === "準備不可") {

        actualQty = 0;

      }


      // --------------------------------
      // 数量調整
      // --------------------------------

      else if (u.status === "数量調整") {

        actualQty = Number(u.actualQty);
        reason = String(u.reason || "").trim();


        // 数量チェック
        if (
          !Number.isFinite(actualQty) ||
          actualQty < 0 ||
          actualQty > requestedQty
        ) {

          return;

        }


        // 調整理由必須
        if (!reason) {

          return;

        }

      }


      // --------------------------------
      // 不正な状態
      // --------------------------------

      else {

        return;

      }


      // --------------------------------
      // K列：状態
      // --------------------------------

      sheet
        .getRange(i + 1, 11)
        .setValue(u.status);


      // --------------------------------
      // L列：実出庫数
      // --------------------------------

      sheet
        .getRange(i + 1, 12)
        .setValue(actualQty);


      // --------------------------------
      // M列：調整理由
      // --------------------------------

      sheet
        .getRange(i + 1, 13)
        .setValue(reason);


      count++;

      break;

    }

  });


  return {

    success: true,

    message:
      count + "件更新しました"

  };

}


// =====================================
// 日付フォーマット
// =====================================

function formatDate(value) {

  if (!value) {
    return "";
  }


  if (value instanceof Date) {

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

  }


  return String(value)
    .trim()
    .replace(/\//g, "-");

}


// =====================================
// JSONレスポンス
// =====================================

function json(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}