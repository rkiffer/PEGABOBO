const SHEET_NAME = 'spots';

function setupSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['map', 'json', 'updatedAt']);
  }
  return sheet;
}

function doGet(e) {
  const sheet = setupSheet_();
  const callback = e.parameter.callback || 'callback';
  const mapName = e.parameter.map || '';
  const data = {};
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (!mapName || values[i][0] === mapName) {
      try { data[values[i][0]] = JSON.parse(values[i][1] || '[]'); }
      catch (err) { data[values[i][0]] = []; }
    }
  }
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify({ ok: true, data })})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  const sheet = setupSheet_();
  const mapName = e.parameter.map;
  const json = e.parameter.json || '[]';
  if (!mapName) return ContentService.createTextOutput('missing map');

  const values = sheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === mapName) { row = i + 1; break; }
  }
  if (row === -1) sheet.appendRow([mapName, json, new Date()]);
  else sheet.getRange(row, 1, 1, 3).setValues([[mapName, json, new Date()]]);

  return ContentService.createTextOutput('ok');
}
