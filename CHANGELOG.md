# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-01-18

### Added
- Comprehensive README.md documentation
- CHANGELOG.md to track project updates
- High-level Mermaid architecture diagram in README
  - Visual representation of system architecture
  - Client, application, data, and external service layers
  - Component relationships and data flow
  - Color-coded role-based portals
  - Example data flow walkthrough
- Profile picture support in sidebar with surname display
- Field-level validation errors for better UX
- Global form validation system
- System settings configuration page

### Fixed
- **Issue #130**: Surname not showing in sidebar
  - Added surname field to NextAuth session and JWT token
  - Updated sidebar to display full name (name + surname)
  - Updated TypeScript types for User, Session, and JWT

- **Issue #129**: Instructor Exams 404 error and status issues
  - Replaced broken API fetch with direct Prisma query
  - Fixed exam details page throwing 404 when clicking on exam
  - Corrected field name from 'order' to 'orderIndex' for question sorting
  - Added proper exam filtering by instructor ID
  - Included student surname in exam attempts display

- **Issue #128**: Instructor Panel main page design inconsistency
  - Added consistent gradient background to instructor dashboard
  - Applied same styling pattern as other instructor pages
  - Added max-width container for better layout on large screens

- **Issue #127**: Admin Settings update changes not working
  - Added preprocessor to convert empty strings to null before validation
  - Fixed URL and email validation failing on empty optional fields
  - Allows partial updates without requiring all fields to be filled

- **Issue #126**: Password length input concatenation bug
  - Allow users to clear the input field when typing new values
  - Added onBlur validation to ensure valid minimum value
  - Removed immediate fallback that caused "812" when trying to type "12"

- **Issue #124**: Enrollment modal too large, buttons not visible
  - Added max-height constraint (90vh) to prevent modal overflow
  - Made content scrollable while keeping buttons visible
  - Fixed mobile layout with items-end to slide up from bottom
  - Keep action buttons visible with flex-shrink-0

- **Issue #121**: Cannot enroll in course
  - Fixed enrollment count to only include ENROLLED status
  - Previously counted ALL enrollments (PENDING, REJECTED, ENROLLED)
  - Sections no longer appear full due to PENDING/REJECTED enrollments

- **Sidebar Flickering**: Fixed icons jumping during collapse/expand
  - Changed transition-all to transition-colors to prevent layout animations
  - Only animate colors, not padding/margins which caused flickering

### Changed
- **Sidebar Improvements** (based on PR #125)
  - Better state initialization using functional useState with localStorage
  - Simplified toggle function without useEffect dependencies
  - Moved collapse button to bottom sidebar next to sign out
  - Removed unnecessary navigation loading states and prefetching
  - Cleaner code structure with removed unused imports
  - Better button organization in bottom action bar
  - Added smooth rotation animation to collapse icon
  - Improved SSR handling with typeof window checks

### Removed
- Unused useRouter and useTransition imports
- Navigation loading indicator and top progress bar
- Unnecessary prefetch logic (handled by Next.js automatically)
- All non-main git branches (cleaned up repository)

## [2.0.0] - 2026-01-17

### Added
- AI-powered question generation for exams
- Excel import functionality for user management
- Profile picture upload and display
- Enrollment approval workflow
- Two-phase file upload with PENDING/UPLOADED status tracking
- File upload confirmation endpoint and cleanup script
- File ownership validation for assignment submissions
- Late submission tracking with automatic detection and warnings
- Email rate limiting (600ms delay) for bulk user imports
- Pagination to admin users API endpoint (default 50, max 100)
- 13 database indexes for improved query performance
- MODERATOR portal with dashboard, enrollments, and courses pages
- Moderator API routes and middleware protection

### Fixed
- 9 critical, high, and medium priority security issues
- Database query performance issues
- File upload race conditions
- Email delivery reliability

### Security
- Added file ownership validation
- Implemented rate limiting for email sending
- Added pagination to prevent data exposure
- Enhanced MODERATOR role access controls

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Multi-role system (Admin, Instructor, Moderator, Student)
- Course and section management
- Assignment creation and submission
- Examination system with auto-grading
- Case rooms for discussions
- Certificate generation
- Payment tracking
- Audit logging
- System analytics
- Email notifications
- File upload to Cloudflare R2
- AI integration with Google Gemini
- Responsive dashboard layout
- Role-based access control
- NextAuth authentication
- PostgreSQL database with Prisma ORM

### Security
- Password hashing with bcrypt
- Session management
- Role-based middleware protection
- Input validation with Zod
- SQL injection prevention
- XSS protection

---

## Version History

- **2.1.0** - Documentation update, bug fixes, UI improvements
- **2.0.0** - Major feature additions, security enhancements
- **1.0.0** - Initial release

## Links

- [GitHub Repository](https://github.com/Ismat-Samadov/educy)
- [Issue Tracker](https://github.com/Ismat-Samadov/educy/issues)
- [Pull Requests](https://github.com/Ismat-Samadov/educy/pulls)

## Contributors

- Ismat Samadov (@Ismat-Samadov) - Project Lead
- RamilValiyev (@ramilvl) - Contributor (PR #125)

---

**Note**: This changelog is generated and maintained to provide transparency about what changes are being made to the project.
