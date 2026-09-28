import { useState } from 'react';

export function useTasks() {
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [dailyInspectionRecordsByDate, setDailyInspectionRecordsByDate] = useState({});
  const [allDailyInspectionRecords, setAllDailyInspectionRecords] = useState([]);
  const [resolvedInspectionRecordIds, setResolvedInspectionRecordIds] = useState([]);

  return {
    scheduleTasks, setScheduleTasks,
    completedTasks, setCompletedTasks,
    dailyInspectionRecordsByDate, setDailyInspectionRecordsByDate,
    allDailyInspectionRecords, setAllDailyInspectionRecords,
    resolvedInspectionRecordIds, setResolvedInspectionRecordIds
  };
}
