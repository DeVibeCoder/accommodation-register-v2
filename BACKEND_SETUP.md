# TIC Meals & Stay backend setup

## 1. Add environment variables in Vercel
Open your Vercel project settings and add:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional for local frontend calls:

- VITE_API_BASE_URL = /api

## 2. Run the database schema
In Supabase SQL Editor, open and run the script from:

- supabase-setup.sql

This creates:
- profiles
- rooms
- occupancy
- stay_history

## 3. Create your first user
In Supabase Authentication:

1. Go to Users
2. Create a user with email and password
3. The first created profile becomes Admin automatically

## 4. Deploy the backend routes
The API endpoints are already prepared under the frontend API folder:

- /api/auth/login
- /api/auth/session
- /api/auth/logout
- /api/rooms
- /api/occupancy
- /api/users/:id/role

## 5. Test in this order
1. Login
2. Rooms load
3. Occupancy load
4. Add occupant
5. Edit occupant
6. Delete occupant
7. Change role
