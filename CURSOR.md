# ClockifyManager – Next.js + shadcn/ui App (Cursor Prompts)

This document contains step-by-step prompts to scaffold a Next.js dashboard for bulk-editing Clockify time entries, including automatic task creation.

## 1️⃣ Bootstrap the Project
```
Create a Next.js 14 (App Router, TypeScript) project named clockify-dashboard.  
Add TailwindCSS and shadcn/ui with dark mode enabled.  
Install axios, react-hook-form, zod, @tanstack/react-table, react-csv, papaparse, zustand, and lucide-react.  
Set up a base layout with a sidebar and top navbar.
```

## 2️⃣ Add shadcn/ui Components
```
Add shadcn/ui components:
- Button
- Input
- Table
- Select
- Dialog
- Sheet
- Form
- Toast
- Skeleton
Generate them in the components/ui directory.
```

## 3️⃣ Clockify API Client (lib/clockify.ts)
```
Create lib/clockify.ts exporting a class ClockifyAPI with methods:
- setApiKey(apiKey: string)
- getWorkspaces()
- getProjects(workspaceId: string)
- getTasks(workspaceId: string, projectId: string)
- createTask(workspaceId: string, projectId: string, name: string)
- getTimeEntries(workspaceId: string, projectId?: string, start?: string, end?: string)
- updateTimeEntry(workspaceId: string, entryId: string, data: Partial<TimeEntry>)
- createTimeEntry(workspaceId: string, data: TimeEntryPayload) // includes taskId
- bulkUpdateTimeEntries(workspaceId: string, entries: TimeEntryPayload[])

Notes:
- Use axios with API key in Authorization header.
- If taskId is missing but taskName is provided, first check if task exists. Create if missing and use returned taskId.
```

## 4️⃣ Secure API Routes
```
Under app/api create endpoints to proxy Clockify requests:
- /api/proxy/* handles GET/POST/PUT for workspaces, projects, tasks, and time-entries.
- Validate input with zod.
- Support optional taskName for creating time entries; create task if it doesn't exist.
- Return JSON responses.
```

## 5️⃣ Dashboard UI (app/page.tsx)
```
Features:
- API key input (saved in localStorage)
- Workspace dropdown from API
- Project dropdown based on workspace
- Date range picker
- Fetch Entries button
- Data table listing description, start, end, project, task, tags, billable
- Inline editing for each row (react-hook-form + shadcn Input/Select)
- Save button per row calls update endpoint
- Bulk save button updates all modified rows, ensuring tasks are created if needed
```

## 6️⃣ CSV Bulk Upload With Task Support
```
Add "Bulk Upload" button opening a shadcn Dialog:
- Upload CSV (react-csv or PapaParse)
- Preview parsed rows including task column
- On confirm, send to bulkUpdateTimeEntries API
- API creates missing tasks before updating entries
- Show success/error toasts
```

## 7️⃣ State Management
```
Use Zustand for:
- apiKey
- workspaces
- projects
- tasks per project
- timeEntries
Include optimistic UI updates for inline edits and newly created tasks.
```

## 8️⃣ Polish & Deploy
```
- Add loading skeletons and toast notifications
- Add dark/light mode toggle
- Set environment variable NEXT_PUBLIC_APP_NAME="ClockifyManager"
- Configure Vercel deployment with NEXT_PUBLIC_API_URL
```
