# Futura Homes - Admin & Client Management System

A comprehensive real estate property management platform built with Next.js 15 for managing property sales, client interactions, contracts, and payment systems.

## Overview

Futura Homes is a full-stack property management system designed for real estate developers to manage their entire sales pipeline - from property listings and client reservations to contract management and payment tracking.

## Technology Stack

### Core Technologies

- **Next.js 15.5.2** with App Router and Turbopack
- **React 19.1.0**
- **Tailwind CSS v4** with DaisyUI
- **Supabase** (PostgreSQL + Authentication + Storage)
- **Nodemailer** for email notifications

### Key Libraries

- **UI**: Radix UI, Lucide Icons, react-select, react-toastify
- **Date Handling**: date-fns
- **PDF Generation**: jsPDF with autotable
- **Animations**: Framer Motion
- **Security**: Google reCAPTCHA v3, Supabase RLS

## Project Structure

```
src/
├── app/
│   ├── api/                    # 30+ API endpoints
│   ├── dashboard/              # Admin dashboard
│   ├── properties/             # Property management
│   ├── reservations/           # Reservation tracking
│   ├── contracts/              # Contract management
│   ├── transactions/           # Payment transactions
│   ├── client-home/            # Client landing page
│   ├── client-signup/          # Client registration
│   └── client-login/           # Client authentication
│
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── features/               # Feature-specific components
│   └── common/                 # Layout & ProtectedRoute
│
├── contexts/
│   ├── ClientAuthContext.js    # Authentication state
│   └── NotificationContext.js  # Notifications
│
├── hooks/
│   ├── useAuth.js              # Authentication logic
│   ├── useNewItemCounts.js     # Item counting
│   └── use-mobile.js           # Responsive detection
│
└── lib/
    ├── supabase.js             # Supabase client
    ├── email.js                # Email utilities
    ├── storage.js              # File upload utilities
    ├── recaptcha.js            # reCAPTCHA verification
    └── data.js                 # Constants & mock data
```

## Key Features

### 1. Authentication & Authorization

- Supabase Auth with Admin API
- OTP verification via email (5-minute expiration)
- Role-based access control (Admin, Sales Rep, Customer Service, Collection, Homeowner)
- Protected routes with role validation
- Session persistence

### 2. Property Management

- CRUD operations for properties
- Multiple property types (houses, condos, townhouses, lots)
- Photo uploads to Supabase Storage
- Property status tracking (available, reserved, sold)
- Detailed property information (bedrooms, bathrooms, area, amenities)

### 3. Reservation System

- Client property reservations with unique tracking numbers
- Employment & income verification
- ID document upload and validation
- Approval/rejection workflow
- Automatic contract generation upon approval

### 4. Contract Management

- Automated contract generation from approved reservations
- Flexible payment plans (1-24 months)
- Automatic monthly installment calculation
- Payment schedule generation with due dates and grace periods
- Contract number auto-generation (CTS-YYYY-XXXXXXXX)

### 5. Payment & Collection System

- Walk-in payment recording
- Payment progress tracking (percentage complete)
- Overdue payment detection and management
- Payment status tracking (pending, paid, overdue)
- Penalty calculations
- Payment reversal capability
- Complete transaction history

### 6. Client Inquiry System

- Inquiry submission with reCAPTCHA v3 protection
- Status tracking (pending, in_progress, responded, closed, declined)
- Email follow-ups
- Search and filtering capabilities

### 7. Tour Booking System

- Property tour appointment scheduling
- Date/time selection (future dates only)
- Auto-confirmation with approval workflow
- Booking status tracking

### 8. Announcements

- Homeowner announcements with file/image uploads
- Email notifications
- Real-time notification system

### 9. Security Features

- Row Level Security (RLS) at database level
- Google reCAPTCHA v3 bot protection
- Email-based OTP verification
- Input validation (client + server)
- Protected API endpoints

### 10. Admin Dashboard

- Key metrics and KPIs
- Payment collection statistics
- Property status overview
- User and inquiry management
- Role and user settings

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user

### OTP & Email

- `POST /api/send-otp` - Generate and send OTP
- `POST /api/verify-otp` - Verify OTP code
- `POST /api/send-inquiry` - Send inquiry form
- `POST /api/send-follow-up` - Send follow-up email

### Property Reservations

- `GET/POST /api/property-reservation` - Manage reservations
- `POST /api/property-reservation/approve` - Approve reservation
- `POST /api/property-reservation/reject` - Reject reservation
- `POST /api/property-reservation/revert` - Revert status

### Contracts

- `GET/POST /api/contracts` - List and create contracts
- `GET/PATCH /api/contracts/[id]` - Contract details
- `POST /api/contracts/[id]/change-plan` - Change payment plan
- `POST /api/contracts/[id]/validate-plan-change` - Validate plan change
- `GET /api/contracts/by-reservation` - Get contract by reservation

### Payments

- `POST /api/contracts/payment/walk-in` - Record payment
- `GET /api/contracts/payment/transactions` - Fetch transactions
- `GET /api/contracts/payment/history` - Payment history
- `POST /api/contracts/payment/revert` - Revert payment

### Inquiries

- `GET/PATCH/DELETE /api/client-inquiries` - Manage inquiries

### Bookings

- `POST /api/book-tour` - Create tour booking
- `POST /api/book-tour/approve` - Approve booking
- `POST /api/book-tour/reject` - Reject booking

### Announcements & Files

- `GET/POST /api/homeowner-announcements` - Manage announcements
- `POST /api/homeowner-announcements/upload` - Upload files
- `POST /api/upload` - General file upload
- `POST /api/upload-property-photo` - Property photo upload

### User & Role Management

- `GET/POST /api/users` - User management
- `GET /api/roles` - Fetch roles

## Database Schema

### Core Tables

- `auth.users` - Supabase Auth users
- `property_info_tbl` - Property listings
- `property_photos` - Property images
- `property_types` - Property categories
- `property_reservations` - Client reservations
- `property_contracts` - Sales contracts
- `contract_payment_schedules` - Monthly payment schedules
- `reservation_transactions` - Payment records
- `contract_plan_changes` - Payment plan modifications
- `client_inquiries` - Client inquiries/leads
- `appointments` - Tour bookings
- `homeowner_announcements` - System announcements
- `otp_verifications` - OTP storage
- `users_role_mapping` - User role assignments

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Gmail account with App Password for email notifications
- Google reCAPTCHA v3 keys

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd admin-futura-home
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up Supabase database:

   - Run the SQL migration files to create necessary tables
   - Enable Row Level Security (RLS) policies
   - Configure Storage buckets for file uploads

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Create production build
npm start        # Run production server
npm run futura   # Build and start production server
npm run lint     # Run ESLint
```

## User Roles & Permissions

1. **Admin** - Full system access
2. **Sales Representative** - Property and reservation management
3. **Customer Service** - Inquiry and appointment handling
4. **Collection** - Payment tracking and collection
5. **Home Owner** - Client self-service portal

## Authentication Flow

### Client Signup

1. User visits `/client-signup`
2. Fills registration form (name, email, password, phone)
3. System validates and creates user via Supabase Admin API
4. User is automatically logged in
5. Redirected to properties page

### Client Login

1. User visits `/client-login`
2. Enters credentials (email & password)
3. Supabase validates credentials
4. Session created in browser storage
5. Redirected to authenticated area

### Protected Routes

- Routes are protected via `ProtectedRoute` component
- Validates session and user role
- Redirects to login if unauthorized

## Security Highlights

1. **Row Level Security (RLS)** - Database-level access control
2. **reCAPTCHA v3** - Bot protection on public forms
3. **OTP Verification** - Email-based two-factor authentication
4. **Service Role Key** - Server-side only (never exposed to client)
5. **Role-Based Access** - Fine-grained permissions system
6. **Input Validation** - Client-side and server-side validation
7. **Protected API Routes** - Authorization checks on all endpoints

## Email Configuration

The system uses Gmail SMTP for sending emails. To set up:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password (not your regular password)
3. Add credentials to `.env.local`

Email is used for:

- OTP verification codes
- Inquiry confirmations
- Tour booking notifications
- Announcement broadcasts
- Follow-up communications

## File Upload & Storage

Uses Supabase Storage for:

- Property photos
- Client ID documents
- Announcement attachments
- Contract-related files

Storage buckets need to be configured with proper access policies.

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Setup

Ensure all production environment variables are configured:

- Supabase production URLs and keys
- Production email credentials
- reCAPTCHA production keys
- Correct `NEXT_PUBLIC_APP_URL`

### Recommended Platforms

- Vercel (optimized for Next.js)
- Railway
- DigitalOcean App Platform

## Troubleshooting

### Common Issues

**Email not sending:**

- Verify Gmail App Password is correct (16 characters with spaces)
- Check that 2FA is enabled on Gmail account
- Ensure `EMAIL_USER` and `EMAIL_PASSWORD` are set correctly

**Supabase connection errors:**

- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Ensure RLS policies are properly configured

**File upload failures:**

- Verify Supabase Storage buckets exist
- Check bucket access policies
- Ensure file size limits are not exceeded

**OTP verification fails:**

- Check system time is synchronized
- Verify OTP expiration time (5 minutes)
- Ensure email delivery is working

## Contributing

When contributing to this project:

1. Follow the existing code structure
2. Maintain consistent naming conventions
3. Add proper error handling
4. Test all new features thoroughly
5. Update documentation as needed

## Support

For issues or questions:

- Check the troubleshooting section above
- Review Supabase logs for database errors
- Check browser console for client-side errors
- Review API route logs for server-side issues

## License

[Add your license information here]

## Acknowledgments

Built with Next.js, Supabase, and modern web technologies for efficient property management.
