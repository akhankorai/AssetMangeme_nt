import sys

def fix_emergency_table(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    target_start = '<div className="scheduleTaskCardsContainer"'
    
    # Find first instance
    s1 = content.find(target_start)
    if s1 == -1:
        print("First block not found!")
        return
        
    # Find second instance
    s2 = content.find(target_start, s1 + 1)
    if s2 == -1:
        print("Second block not found! The file doesn't have two copies.")
        return

    # Find the end of the second block. It ends with '</div>\n        </>' or '</div>\n        </div>\n      )}'
    # Actually, we can just replace 'maintenanceTasks' and 'activeMaintenanceTab' 
    # starting from s2 to the end of the file, because there are no other maintenanceTasks usages after the schedule tabs.
    # Wait, let's find the boundary to be safe.
    # The block ends right before the pending creations modal, which is:
    end_boundary = content.find('{showPendingCreationsModal && (', s2)
    if end_boundary == -1:
         end_boundary = len(content)

    second_block = content[s2:end_boundary]
    
    # Replace the variables
    second_block = second_block.replace('maintenanceTasks', 'emergencyRepairTasks')
    second_block = second_block.replace('activeMaintenanceTab', 'activeEmergencyTab')
    
    # Reassemble
    content = content[:s2] + second_block + content[end_boundary:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Successfully fixed emergency table variables!")

fix_emergency_table('C:/omega/Asset Management/Asset Management/Asset Management/frontend/src/pages/ScheduleWorkspace/ScheduleWorkspace.jsx')
