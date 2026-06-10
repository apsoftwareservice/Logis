export const CLOSE_DASHBOARD_DROPDOWNS_EVENT = 'logis:close-dashboard-dropdowns'

export function closeDashboardDropdowns() {
  window.dispatchEvent(new Event(CLOSE_DASHBOARD_DROPDOWNS_EVENT))
}
