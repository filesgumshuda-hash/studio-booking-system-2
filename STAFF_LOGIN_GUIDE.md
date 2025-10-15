# Staff Login Assignment Guide

## Overview

This guide explains how to assign login access to staff members in the WedRing Studios Management System.

## Two Ways to Create Login for Staff

### Method 1: Using the "Create Login" Button in Staff Table

1. **Navigate to Staff Management Page**
   - Click on "Staff" in the navigation menu

2. **Find Staff Without Login**
   - Staff members without login show a **✗** in the "Login" column
   - Staff members with login show a **✓** in the "Login" column

3. **Create Login (Quick Method)**
   - Click the green **user plus icon** (👤+) in the Actions column
   - This opens the "Create Login" modal

4. **Create Login (Detailed Method)**
   - Click the **expand arrow** (▶) to expand the staff member's row
   - Scroll to the "System Access Role" section at the bottom
   - Click the **"Create Login"** button (green button with user plus icon)

5. **Fill in Login Details**
   - **Login Email**: Enter the email address for login (required)
   - **Password**: Create a strong password (minimum 6 characters)
     - Must contain uppercase letter
     - Must contain lowercase letter
     - Must contain number
   - **Confirm Password**: Re-enter the password
   - **System Access Role**: Select one of:
     - **Staff**: View only assigned events and own payments
     - **Manager**: Can manage bookings and view own payments
     - **Admin**: Full system access including user management

6. **Submit**
   - Click "Create Login Account"
   - Success message will appear
   - The staff member can now login with their email and password

### Method 2: Create Staff with Login Access (Not Yet Implemented)

This would be done when adding a new staff member:
1. Click "Add Staff/User" button
2. Fill in staff details
3. Check "Create login account for this staff member"
4. Fill in login credentials
5. Save

## Important Notes

### Password Requirements
- Minimum 6 characters
- Must include:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
- Password strength indicator shows: Weak, Fair, or Strong

### System Roles Explained

**Admin**
- Full system access
- Can manage all bookings and events
- Can create/edit/delete users and staff
- Can view all payments
- Has access to all features

**Manager**
- Can create and manage bookings
- Can assign staff to events
- Can view and manage workflows
- Can view their own payments only (if they are also staff)
- Cannot manage users or system settings

**Staff**
- View-only access to events they are assigned to
- Can view their own payments
- Can update workflow progress for their events
- Cannot create or edit bookings
- Cannot see other staff members' information

### Staff vs System Role

There are two types of roles:

1. **Job Role (Staff Role)**
   - Photographer, Videographer, Drone Operator, Editor, Manager, Coordinator
   - Defines what job they do at events
   - Set when creating/editing staff member

2. **System Role (Access Level)**
   - Admin, Manager, Staff, No Access
   - Defines what they can do in the system
   - Set when creating login account
   - Can be changed later

**Example**: A staff member can be a "Photographer" (job role) with "Manager" (system access), meaning they work as a photographer at events but have manager-level access in the system.

## Viewing Login Details

Once a login is created:

1. **In the Table**
   - Login column shows ✓
   - System role badge appears (Admin/Manager/Staff)

2. **In Expanded View**
   - Click expand arrow (▶) to see full details
   - "Login Details" section shows:
     - User ID (first 8 characters)
     - Login Email
     - Password (masked, click eye icon to show/hide)
     - Reset password button

## Managing Login Access

### Change System Role
1. Expand the staff member's row
2. Go to "System Access Role" section
3. Select new role from dropdown
4. Confirm the change in the dialog
5. Role updates immediately

### Reset Password
1. Click the key icon (🔑) in Actions column, OR
2. Expand row and click key icon in Login Details section
3. Enter new password
4. Password updates immediately

### Remove Login Access
1. Expand the staff member's row
2. In "System Access Role" section, select "No Access"
3. Confirm the removal
4. User can no longer login
5. Staff member remains in database

## Database Structure

The system uses two tables:

**staff table**
- Stores staff member information (name, contact, role, etc.)
- No login credentials stored here

**users table**
- Stores login credentials and system access
- Links to staff via `staff_id` foreign key
- One staff member can have one user account
- One user account can link to one staff member

## Troubleshooting

**"Email already in use"**
- Another user account already exists with this email
- Use a different email address

**"Phone already in use"**
- The staff member's phone number is already used by another user
- This shouldn't happen normally, contact system administrator

**Can't change role of last admin**
- System prevents removing the last admin
- Create another admin first, then change this user's role

**Password too weak**
- Ensure password meets all requirements
- Use combination of uppercase, lowercase, and numbers
- Aim for "Strong" rating

## Quick Reference

| Action | Button Location | Icon |
|--------|----------------|------|
| Create Login | Actions column (collapsed row) | 👤+ (green) |
| Create Login | System Access section (expanded row) | Button with 👤+ |
| Reset Password | Actions column | 🔑 (amber) |
| Edit Staff Info | Actions column | ✏️ (blue) |
| Expand Row | First column | ▶ / ▼ |

## Security Best Practices

1. **Strong Passwords**: Always use strong passwords with mix of characters
2. **Unique Emails**: Each user should have their own unique email
3. **Appropriate Roles**: Assign minimum required access level
4. **Regular Review**: Periodically review user access and remove unused accounts
5. **Inactive Staff**: Remove login access for staff who leave or become inactive
6. **Password Resets**: Change passwords if compromised or when staff leave

## Example Workflow

**Adding a new photographer with login:**

1. Go to Staff Management
2. Click "Add Staff/User"
3. Enter: Name: "John Doe", Role: "Photographer", Phone: "9876543210", Email: "john@example.com"
4. Save staff member
5. Find John Doe in the table
6. Click the green 👤+ icon or expand row and click "Create Login"
7. Enter Login Email: "john@wedring.com" (work email)
8. Create Password: "John2024Photo!"
9. Confirm Password: "John2024Photo!"
10. Select System Role: "Staff"
11. Click "Create Login Account"
12. John can now login at john@wedring.com with password

**Promoting a staff member to manager:**

1. Find the staff member in the table
2. Expand their row (click ▶)
3. Scroll to "System Access Role"
4. Change dropdown from "Staff" to "Manager"
5. Confirm the dialog
6. User now has manager-level access
