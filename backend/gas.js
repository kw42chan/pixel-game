function doGet(e) {
  const p = e.parameter;
  const action = p.action;
  
  // CORS setup
  const headers = {
    "Access-Control-Allow-Origin": "*"
  };
  
  if (action === 'getQuestions') {
    const count = parseInt(p.count) || 5;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('題目');
    
    if (!sheet) {
       return ContentService.createTextOutput(JSON.stringify({ error: "Cannot find sheet '題目'" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const sheetHeaders = data.shift(); // Remove headers
    
    const idxId = sheetHeaders.indexOf('題號');
    const idxQ = sheetHeaders.indexOf('題目');
    const idxA = sheetHeaders.indexOf('A');
    const idxB = sheetHeaders.indexOf('B');
    const idxC = sheetHeaders.indexOf('C');
    const idxD = sheetHeaders.indexOf('D');
    
    // Shuffle and pick
    data.sort(() => 0.5 - Math.random());
    const selected = data.slice(0, count);
    
    const questions = selected.map(row => ({
      id: row[idxId],
      question: row[idxQ],
      options: {
        A: row[idxA] !== undefined ? row[idxA] : "",
        B: row[idxB] !== undefined ? row[idxB] : "",
        C: row[idxC] !== undefined ? row[idxC] : "",
        D: row[idxD] !== undefined ? row[idxD] : ""
      }
    }));
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, questions }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // We send payload as text/plain from fetch to bypass CORS preflight options
    const payloadStr = e.postData.contents;
    const params = JSON.parse(payloadStr);
    
    const userId = params.id;
    const userAnswers = params.answers; // e.g. { "Q1": "A", "Q2": "C" }
    const passThreshold = parseInt(params.passThreshold, 10) || 0;
    
    // 1. Calculate Score
    const qSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('題目');
    const qData = qSheet.getDataRange().getValues();
    const qHeaders = qData.shift();
    const idxQId = qHeaders.indexOf('題號');
    const idxAns = qHeaders.indexOf('解答');
    
    const correctMap = {};
    qData.forEach(row => {
      correctMap[row[idxQId]] = row[idxAns];
    });
    
    let score = 0;
    for (let qId in userAnswers) {
      if (correctMap[qId] == userAnswers[qId]) {
        score++;
      }
    }
    
    const isPassed = score >= passThreshold;
    
    // 2. Update Answers Sheet "回答"
    const aSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('回答');
    if (!aSheet) throw new Error("Cannot find sheet '回答'");
    
    const aData = aSheet.getDataRange().getValues();
    const aHeaders = aData[0] || ["ID", "闖關次數", "總分", "最高分", "第一次通關分數", "花了幾次通關", "最近遊玩時間"];
    
    // if sheet is totally empty, recreate headers
    if (aData.length <= 1 && (!aData[0] || !aData[0][0])) {
       aSheet.getRange(1, 1, 1, aHeaders.length).setValues([aHeaders]);
    }
    
    let userRowIndex = -1;
    for (let i = 1; i < aData.length; i++) {
        if (aData[i][0] == userId) {
            userRowIndex = i + 1; // 1-based index in sheet
            break;
        }
    }
    
    const now = new Date();
    
    if (userRowIndex > -1) {
        // Update existing user
        const range = aSheet.getRange(userRowIndex, 1, 1, aHeaders.length);
        const rowData = range.getValues()[0];
        
        let playCount = (parseInt(rowData[1]) || 0) + 1;
        let totalScore = (parseInt(rowData[2]) || 0) + score;
        let highestScore = Math.max(parseInt(rowData[3]) || 0, score);
        let firstClearScore = rowData[4];
        let timesToClear = rowData[5];
        
        if (isPassed && !firstClearScore) {
           firstClearScore = score;
           timesToClear = playCount;
        }
        
        const newRowData = [
           userId,
           playCount,
           totalScore,
           highestScore,
           firstClearScore, // Won't overwrite if existing
           timesToClear,    // Won't overwrite if existing
           now
        ];
        range.setValues([newRowData]);
    } else {
        // Insert new user
        const newRow = [
            userId,
            1, // 闖關次數
            score, // 總分
            score, // 最高分
            isPassed ? score : "", // 第一次通關分數
            isPassed ? 1 : "", // 花了幾次通關
            now // 最近遊玩時間
        ];
        aSheet.appendRow(newRow);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
        success: true,
        score: score,
        isPassed: isPassed
     })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
