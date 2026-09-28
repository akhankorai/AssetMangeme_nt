import fs from 'fs';

const filePath = 'c:/omega/Asset Management/Asset Management/Asset Management/frontend/src/App.jsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Replace TaskModal
const taskModalRegex = /\{viewedTask \? \([\s\S]*?\n\s*\) : null\}/;
if (taskModalRegex.test(code)) {
  code = code.replace(taskModalRegex, `<TaskModal 
          viewedTask={viewedTask}
          isTaskModalClosing={isTaskModalClosing}
          onClose={handleCloseCompletedTaskView}
        />`);
  console.log("TaskModal replaced");
}

// 2. Replace DailyInspectionModal
const dailyInspectionRegex = /\{dailyInspectionModal \? \([\s\S]*?name="daily-inspection-maintenance"[\s\S]*?<\/section>\n\s*<\/div>\n\s*\) : null\}/;
if (dailyInspectionRegex.test(code)) {
  code = code.replace(dailyInspectionRegex, `<DailyInspectionModal 
          dailyInspectionModal={dailyInspectionModal}
          dailyInspectionDraft={dailyInspectionDraft}
          handleCloseDailyInspectionModal={handleCloseDailyInspectionModal}
          handleToggleDailyCheckpoint={handleToggleDailyCheckpoint}
          setDailyInspectionDraft={setDailyInspectionDraft}
          handleCompleteDailyInspection={handleCompleteDailyInspection}
        />`);
  console.log("DailyInspectionModal replaced");
}

// 3. Replace NotificationModal
const notificationModalRegex = /\{notificationsOpen \? \([\s\S]*?Download Excel[\s\S]*?<\/section>\n\s*<\/div>\n\s*\) : null\}/;
if (notificationModalRegex.test(code)) {
  code = code.replace(notificationModalRegex, `<NotificationModal 
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          unreadNotificationTasks={unreadNotificationTasks}
          markAllNotificationsRead={markAllNotificationsRead}
          notificationInbox={notificationInbox}
          unreadNotificationsByDate={unreadNotificationsByDate}
          readNotificationsByDate={readNotificationsByDate}
          getNotificationTimingLabel={getNotificationTimingLabel}
          downloadModernNotificationExcel={downloadModernNotificationExcel}
          markNotificationAsRead={markNotificationAsRead}
        />`);
  console.log("NotificationModal replaced");
}

// Add imports
if (!code.includes("import TaskModal")) {
    const imports = `import TaskModal from "./components/Modals/TaskModal";\nimport DailyInspectionModal from "./components/Modals/DailyInspectionModal";\nimport NotificationModal from "./components/Modals/NotificationModal";\n`;
    code = code.replace('export default function App() {', imports + 'export default function App() {');
}

fs.writeFileSync(filePath, code);
console.log("App.jsx updated with Modal components!");
