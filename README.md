# Educy - Learning Management System

A modern, full-featured Learning Management System (LMS) built with Next.js 14, Prisma, and PostgreSQL. Educy provides a comprehensive platform for educational institutions to manage courses, assignments, exams, and student interactions.

## Screenshots

### Landing & Onboarding

| Landing Page | Features Overview |
|:---:|:---:|
| ![Landing Page](screens/landing%20page.png) | ![Features](screens/features.png) |

| How It Works | Sign In |
|:---:|:---:|
| ![How It Works](screens/how%20it%20works.png) | ![Sign In](screens/sign%20in%20page.png) |

### Instructor Portal

| Instructor Dashboard | Courses |
|:---:|:---:|
| ![Instructor Dashboard](screens/instructor%20dashboard.png) | ![Courses](screens/courses%20page.png) |

| Assignments | Exams |
|:---:|:---:|
| ![Assignments](screens/assignments.png) | ![Exams](screens/exams.png) |

| Content Review | Schedule |
|:---:|:---:|
| ![Content Review](screens/content%20review.png) | ![Schedule](screens/schedule.png) |

### Student Features

| Case Rooms | Payments |
|:---:|:---:|
| ![Case Rooms](screens/case%20rooms.png) | ![Payments](screens/payments.png) |

| Certificates | Profile |
|:---:|:---:|
| ![Certificates](screens/certificates.png) | ![Profile](screens/profile.png) |

---

## Features

### Multi-Role Support
- **Admin**: Full system control, user management, analytics, and system settings
- **Instructor**: Course creation, assignment management, grading, and student monitoring
- **Moderator**: Content moderation, enrollment management, and user activity tracking
- **Student**: Course enrollment, assignment submission, exam taking, and progress tracking

### Core Functionality

#### Course Management
- Create and manage courses with multiple sections
- Support for multiple instructors per course
- Course visibility controls
- Enrollment request workflow with approval system
- Course capacity management

#### Assignments & Grading
- Create assignments with due dates and point values
- File upload support with Cloudflare R2 storage
- Late submission tracking with automatic warnings
- Comprehensive grading interface with rubrics

#### Examination System
- Create exams with multiple question types
- Automatic grading for objective questions
- Exam scheduling with time limits
- Student exam attempts tracking
- Export exam results

#### Interactive Features
- **Case Rooms**: Discussion forums for courses with moderation
- **Certificates**: Automatic certificate generation for course completion
- **Timetable**: Visual schedule management
- **Payments**: Track course payments and financial records
- **Real-time Notifications**: Keep users informed of important events

### Security & Administration

#### Authentication & Authorization
- Secure password hashing with bcrypt
- Role-based access control (RBAC)
- Session management with NextAuth.js
- Password reset functionality
- Email verification

#### Audit & Monitoring
- Comprehensive audit logging
- Security event tracking
- User activity monitoring
- Rate limiting to prevent abuse
- File upload validation and security

#### System Configuration
- Configurable password policies (length, complexity)
- Upload size limits
- Maximum enrollments per student
- Feature flags for modular functionality
- Email configuration

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS
- **Forms**: Custom validation system with field-level errors
- **State**: React Hooks, Context API
- **Date Handling**: date-fns
- **Authentication**: NextAuth.js

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: Next.js API Routes
- **Validation**: Zod
- **File Storage**: Cloudflare R2
- **Email**: Resend

### Development Tools
- **Language**: TypeScript
- **Linting**: ESLint
- **Code Quality**: Prettier
- **Version Control**: Git

## Architecture Overview

### Architecture Layers

#### 1. Client Layer
- User interface rendered in the browser
- Responsive design supporting desktop and mobile devices
- Role-based UI components and navigation

#### 2. Next.js Application Layer

**App Router Pages**
- Separate portals for each user role (Admin, Instructor, Moderator, Student)
- Server-side rendering for optimal performance
- Authentication-protected routes

**Components**
- Reusable UI components (Layout, Forms, Modals)
- Shared across different role portals
- Tailwind CSS for styling

**API Routes**
- RESTful API endpoints
- Role-based middleware protection
- Input validation with Zod schemas

**Business Logic**
- Authentication configuration (NextAuth.js)
- Role-based access control (RBAC)
- Database client management (Prisma)

#### 3. Data Layer
- Prisma ORM for type-safe database queries
- PostgreSQL for data persistence
- Comprehensive schema with relations

#### 4. External Services
- **Cloudflare R2**: Scalable file storage for assignments and uploads
- **Resend**: Reliable email delivery for notifications

### Data Flow Example

1. **User Request**: Student submits an assignment
2. **Authentication**: NextAuth validates session
3. **Authorization**: RBAC checks student permissions
4. **Validation**: Zod validates submission data
5. **File Upload**: Assignment file uploaded to Cloudflare R2
6. **Database**: Submission record created via Prisma
7. **Notification**: Email sent to instructor via Resend
8. **Response**: Success message returned to student

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Cloudflare R2 account (for file uploads)
- Resend account (for email)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ismat-Samadov/educy.git
   cd educy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/educy"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"

   # Cloudflare R2
   R2_ACCOUNT_ID="your-account-id"
   R2_ACCESS_KEY_ID="your-access-key"
   R2_SECRET_ACCESS_KEY="your-secret-key"
   R2_BUCKET_NAME="educy-uploads"
   R2_PUBLIC_URL="https://your-bucket.r2.cloudflarestorage.com"

   # Email (Resend)
   RESEND_API_KEY="your-resend-api-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
educy/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel pages
│   ├── instructor/        # Instructor portal pages
│   ├── moderator/         # Moderator panel pages
│   ├── student/           # Student portal pages
│   ├── api/               # API routes
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── dashboard-layout.tsx    # Main layout with sidebar
│   └── confirmation-dialog.tsx # Reusable modal components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── rbac.ts           # Role-based access control
│   └── prisma.ts         # Prisma client
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── public/               # Static assets
└── scripts/              # Utility scripts
```

## Database Schema

The application uses a comprehensive database schema with the following main entities:

- **User**: Students, instructors, moderators, and admins
- **Course**: Courses offered by the institution
- **Section**: Course sections with specific instructors and terms
- **Enrollment**: Student enrollments in course sections
- **Assignment**: Course assignments with file attachments
- **Submission**: Student assignment submissions
- **Exam**: Examinations with questions
- **ExamAttempt**: Student exam attempts and answers
- **CaseRoom**: Discussion forums for courses
- **Certificate**: Course completion certificates
- **Notification**: User notifications
- **AuditLog**: Security and activity audit trail
- **SystemSettings**: Configurable system parameters

See `prisma/schema.prisma` for the complete schema definition.

## API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Courses & Enrollment
- `GET /api/courses` - List courses
- `GET /api/courses/[id]` - Get course details
- `POST /api/enrollments/request` - Request enrollment
- `POST /api/enrollments/[id]/approve` - Approve enrollment
- `POST /api/enrollments/[id]/reject` - Reject enrollment

### Assignments
- `GET /api/assignments/[id]` - Get assignment details
- `GET /api/assignments/[id]/submissions` - List submissions
- `POST /api/submissions/[id]/grade` - Grade submission

### Exams
- `GET /api/exams` - List exams
- `GET /api/exams/[id]` - Get exam details
- `POST /api/exams/[id]/attempt` - Submit exam attempt

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/audit-logs` - Audit logs
- `PUT /api/admin/system-settings` - Update settings

## Recent Updates

See [CHANGELOG.md](CHANGELOG.md) for detailed information about recent updates and bug fixes.

### Latest Improvements (January 2026)
- ✅ Fixed sidebar surname display
- ✅ Fixed instructor exam 404 errors
- ✅ Improved admin settings validation
- ✅ Fixed password input concatenation issue
- ✅ Fixed enrollment modal sizing
- ✅ Fixed course enrollment capacity counting
- ✅ Enhanced sidebar collapse functionality
- ✅ Improved UI consistency across panels

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

If you discover a security vulnerability, please email the security team at security@educy.com. All security vulnerabilities will be promptly addressed.

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@educy.com or open an issue in the GitHub repository.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Prisma](https://www.prisma.io/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- File storage by [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- Email delivery by [Resend](https://resend.com/)

---

Built with ❤️ by the Educy Team
