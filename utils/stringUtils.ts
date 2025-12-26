/**
 * Converts snake_case string to Title Case
 * @param snakeCaseStr - String in snake_case format (e.g., "task_name")
 * @returns String in Title Case format (e.g., "Task Name")
 */
export const formatTaskName = (snakeCaseStr: string): string => {
  return snakeCaseStr
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
