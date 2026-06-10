export function generateGoogleAppsScript(): string {
  return `/**
 * Google Apps Script for "ระบบตารางนัดทีม วก. ปีการศึกษา 2570"
 * เพื่อเชื่อมต่อระบบตารางเวลากับ Google Sheets เป็นฐานข้อมูลแบบฟรี (No Cost)
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets (สร้างสเปรดชีตใหม่)
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. ลบโค้ดเดิมออกทั้งหมด และวางโค้ดนี้ลงไป
 * 4. คลิก Save (บันทึก) และคลิก Deploy (ใช้งานได้จริง) > New Deployment (การปรับใช้งานใหม่)
 * 5. เลือกประเภทการปรับใช้งานเป็น "Web App" (เว็บแอป)
 * 6. ตั้งค่า: 
 *    - Execute as: "Me" (ตัวฉันเอง)
 *    - Who has access: "Anyone" (ทุกคน)
 * 7. คลิก Deploy และคัดลอก Web App URL ไปใส่ในระบบหน้าเว็บตารางนัดของเรา!
 */

const PROPERTIES = PropertiesService.getScriptProperties();

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getSchedules") {
    const schedulesDoc = PROPERTIES.getProperty("schedules") || "{}";
    return ContentService.createTextOutput(schedulesDoc)
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getAttachedFiles") {
    const filesDoc = PROPERTIES.getProperty("attachedFiles") || "[]";
    return ContentService.createTextOutput(filesDoc)
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "connected", message: "ระบบเชื่อมต่อ Google Apps Script สำเร็จ" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const bodyText = e.postData.contents;
    const data = JSON.parse(bodyText);
    const action = data.action;
    
    if (action === "saveSchedules") {
      PROPERTIES.setProperty("schedules", JSON.stringify(data.schedules));
      
      // บันทึกสำรอกข้อมูลลง Sheet เพื่อตรวจสอบประวัติ (Time-based Audit Log)
      try {
        logToSheet("การบันทึกเวลา", data.updater || "ระบบ", "บันทึกตารางนัดหมายสำเร็จ");
      } catch (err) {}
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "saveAttachedFiles") {
      PROPERTIES.setProperty("attachedFiles", JSON.stringify(data.files));
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "ไม่พบการจัดซื้อข้อมูลที่ต้องการ" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(actionType, user, details) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AuditLog");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("AuditLog");
    sheet.appendRow(["วันเวลา (Timestamp)", "การปฏิบัติการ", "ผู้ใช้งาน", "รายละเอียด"]);
  }
  sheet.appendRow([new Date(), actionType, user, details]);
}
`;
}
