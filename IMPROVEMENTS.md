# LeadFlow CRM — 25 Improvement Suggestions

> **Context**: This CRM is primarily a **lead tracking** tool — not a calling platform. Teams use it to track business leads, monitor statuses, manage follow-ups, and visualize conversion metrics. All suggestions below are evaluated through that lens.

---

## 🔴 Critical / High-Priority

### 1. No Bulk Status Update
Currently you can only update one lead's status at a time. If you import 500 leads, there is no way to mark 100 of them as "Not Interested" at once. A simple checkbox selection + bulk action bar would save hours of manual work.

### 2. Dashboard Stats Are Partially Hardcoded
On Dashboard.tsx, the trend numbers (+12%, -5%, +8%, +15%) and the performance stats (Follow-up Success: 64%, Avg. Rating (Converted): 4.8) are hardcoded static values. They mean nothing and must be computed from real data week-over-week.

### 3. No Lead Deduplication Beyond place_id
The import logic skips duplicate leads only if they share the same `place_id`. But manually added leads (via the "Add Lead" modal) have no `place_id`, meaning you can accidentally create multiple entries for the same business name and phone number with zero warning.

### 4. Pagination Default is Only 10 Leads
The paginator shows 10 leads per page with no option to change the page size. When tracking 2000 leads, navigating 200 pages is unusable. Adding a page size selector (25 / 50 / 100) would significantly improve the experience.

### 5. No "Assigned To" / Team Member Feature
All leads fall into a shared pool with no ownership tracking. If you have multiple team members, there is no way to assign specific leads to specific people, or see which team member moved a lead forward.

---

## 🟠 Medium Priority

### 6. No Date Range Filter on the Leads Table
You can filter by status or search by name/phone, but there is no way to filter by when a lead was added or last updated. This makes auditing imports and doing time-based reporting impossible.

### 7. The "Generate Report" Button Does Nothing
On the Dashboard, there is a prominent "Generate Report" button that has no onClick handler. This should generate a downloadable PDF or CSV summary of the current pipeline stats.

### 8. Status Column Shows Underscore Values
The table shows raw database values like `not_called`, `follow_up`, `called_no_response` instead of human-readable labels like "Not Called", "Follow Up". This looks unpolished.

### 9. No Activity / Audit Log Per Lead
There is no history of who changed what on a lead. If a lead's status changes from "Interested" to "Not Interested", there is no record of when this happened or why.

### 10. Backend Has No NOT NULL Constraint on Phone
The `phone` field is required in the frontend modal but the backend `leads` table has no NOT NULL constraint. API imports can create phoneless records that look broken in the UI.

### 11. No Sorting on Leads Table Columns
There is a sort icon in the table headers but no ability to sort by any other column besides rating — no sorting by Name, Status, Date Added, or Reviews.

### 12. No Confirmation Before Deleting a Lead
Clicking the trash icon immediately deletes the lead. There is no "Are you sure?" dialog. This is a serious UX problem — one misclick and the entire lead history is permanently gone.

### 13. Dashboard Chart Date Range Selector is Non-functional
The dropdown to switch between "Last 7 Days" and "Last 30 Days" on the call activity chart has no onChange handler. It is a visual-only control.

### 14. No Mobile-Optimized Leads Table
The leads table with all its columns (Status, Rating, Category, Address, Actions) is very hard to read on a mobile screen. A swipeable card view or simplified mobile layout would make the app usable in the field.

### 15. No Search Persistence / URL State
When you search or filter leads, the state lives only in React memory. Refreshing the page clears all filters. Persisting filters to the URL (?status=interested&search=tech) would let you bookmark and share specific views.

---

## 🟡 Improvements & Polish

### 16. Kanban Board Only Shows 100 Leads
The Kanban fetches a maximum of 100 leads. If you have 5000 leads, the board is unreliable as a full pipeline view. It should show counts per stage and link to filtered table views.

### 17. Notes Are Not Timestamped or Multi-User
The notes field on each lead is a single text area. When multiple team members leave notes over time, there is no way to know who wrote what and when. Notes should be individual log entries with author and timestamp.

### 18. No Way to Archive / Soft-Delete Leads
Deleting a lead is permanent. For removed leads (e.g., businesses that shut down), you should be able to archive them so they disappear from the active list but the history is preserved.

### 19. Import History Panel Is Not Clickable
The import history panel shows filenames and counts, but clicking on a past import does nothing. You should be able to click a past import to see exactly which leads were added during that session.

### 20. No Email Field in Add / Edit Lead Modals
The database has an `email` column but neither the Add Lead modal nor the Edit Lead modal includes this field. Email is a core contact field and needs to be exposed.

### 21. Dashboard Has No "New Leads This Week" Metric
The top stats show total leads, calls today, interested, and converted. But there is no metric for new leads added today/this week, which is the most important daily KPI for a tracking team.

### 22. Map View Has No Error Handling
The map on the lead detail page uses the address in a Google Maps URL. If the address has special characters or is incomplete, it can break with no graceful fallback.

### 23. No Password Reset / Forgot Password Flow
Users can register and log in, but there is no "Forgot Password?" flow. If a user loses their password, they are permanently locked out with no self-service recovery.

### 24. No Custom Lead Tags / Labels
Beyond the pipeline status, there is no way to attach custom labels to a lead (e.g., "VIP", "Hot Lead", "Priority", "Competitor"). Tags are critical for flexible filtering in a tracking workflow.

### 25. No Centralized Toast Notification System
When an API call fails, most components silently console.error() or show a plain alert box. A proper toast notification system (for import success, delete confirmation, save success) would make the app feel polished and production-ready.

---

## Summary Table

| # | Improvement | Priority |
|---|-------------|----------|
| 1 | Bulk status updates for multiple leads | Critical |
| 2 | Fix hardcoded dashboard trend numbers | Critical |
| 3 | Deduplication for manually added leads | Critical |
| 4 | Page size selector (10/25/50/100) | Critical |
| 5 | "Assigned To" team member field | Critical |
| 6 | Date range filter on leads table | Medium |
| 7 | Wire up "Generate Report" button | Medium |
| 8 | Human-readable status labels in table | Medium |
| 9 | Per-lead activity / audit log | Medium |
| 10 | Backend NOT NULL constraint on phone | Medium |
| 11 | Multi-column sortable table headers | Medium |
| 12 | Confirmation dialog before delete | Medium |
| 13 | Fix dashboard date range selector | Medium |
| 14 | Mobile-optimized leads table layout | Medium |
| 15 | Persist filters / search in URL params | Medium |
| 16 | Kanban pagination / load more | Polish |
| 17 | Timestamped, multi-user notes | Polish |
| 18 | Archive / soft-delete for leads | Polish |
| 19 | Clickable import history entries | Polish |
| 20 | Email field in Add/Edit Lead modals | Polish |
| 21 | "New leads this week" dashboard stat | Polish |
| 22 | Robust map view error handling | Polish |
| 23 | Forgot Password / reset flow | Polish |
| 24 | Custom lead tags / labels | Polish |
| 25 | Toast notification system | Polish |
