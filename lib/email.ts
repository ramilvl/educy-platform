import { Resend } from 'resend'

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@educy.com'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('Resend API error:', {
        message: error.message,
        name: error.name,
        code: (error as any).statusCode || (error as any).code,
        fullError: error,
      })

      // Create error with more context
      const enhancedError = new Error(`Resend API error: ${error.message}`) as any
      enhancedError.resendError = error
      enhancedError.statusCode = (error as any).statusCode
      throw enhancedError
    }

    return data
  } catch (error: any) {
    // If this is not already a Resend error, log it
    if (!error.resendError) {
      console.error('Email sending error (non-Resend):', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      })
    }
    throw error
  }
}

/**
 * Email template for assignment creation notification
 */
export function getAssignmentCreatedEmailHTML(params: {
  studentName: string
  assignmentTitle: string
  courseCode: string
  dueDate: Date
  assignmentUrl: string
}) {
  const dueDateStr = params.dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Assignment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📚 New Assignment Posted</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.studentName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">A new assignment has been posted in <strong>${params.courseCode}</strong>:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${params.assignmentTitle}</h2>
      <p style="margin: 5px 0; color: #6b7280;">
        <strong>Due Date:</strong> ${dueDateStr}
      </p>
    </div>

    <p style="font-size: 16px; margin: 20px 0;">Click the button below to view the assignment details and submit your work:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.assignmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Assignment</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Email template for grade received notification
 */
export function getGradeReceivedEmailHTML(params: {
  studentName: string
  assignmentTitle: string
  courseCode: string
  grade: number
  feedback?: string
  submissionUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grade Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Assignment Graded</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.studentName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Your assignment has been graded for <strong>${params.courseCode}</strong>:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${params.assignmentTitle}</h2>
      <p style="margin: 15px 0;">
        <span style="font-size: 36px; font-weight: bold; color: #10b981;">${params.grade}%</span>
      </p>
      ${
        params.feedback
          ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 5px 0; color: #6b7280; font-weight: 600;">Feedback:</p>
        <p style="margin: 10px 0; color: #374151;">${params.feedback}</p>
      </div>
      `
          : ''
      }
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.submissionUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Details</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Email template for enrollment approval
 */
export function getEnrollmentApprovedEmailHTML(params: {
  studentName: string
  courseCode: string
  courseTitle: string
  courseUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enrollment Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎓 Enrollment Approved</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.studentName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Great news! Your enrollment request has been approved.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${params.courseTitle}</h2>
      <p style="margin: 5px 0; color: #6b7280;">
        <strong>Course Code:</strong> ${params.courseCode}
      </p>
    </div>

    <p style="font-size: 16px; margin: 20px 0;">You can now access all course materials, assignments, and resources.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.courseUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Course</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Email template for enrollment rejection
 */
export function getEnrollmentRejectedEmailHTML(params: {
  studentName: string
  courseCode: string
  courseTitle: string
  reason?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enrollment Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Enrollment Update</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.studentName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Unfortunately, your enrollment request for <strong>${params.courseCode} - ${params.courseTitle}</strong> could not be approved at this time.</p>

    ${
      params.reason
        ? `
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 5px 0; color: #6b7280; font-weight: 600;">Reason:</p>
      <p style="margin: 10px 0; color: #374151;">${params.reason}</p>
    </div>
    `
        : ''
    }

    <p style="font-size: 16px; margin: 20px 0;">If you have questions about this decision, please contact your instructor or course administrator.</p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Send assignment created notification email
 */
export async function sendAssignmentCreatedEmail(params: {
  to: string
  studentName: string
  assignmentTitle: string
  courseCode: string
  dueDate: Date
  assignmentId: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const assignmentUrl = `${baseUrl}/student/assignments/${params.assignmentId}`

  return sendEmail({
    to: params.to,
    subject: `New Assignment: ${params.assignmentTitle} - ${params.courseCode}`,
    html: getAssignmentCreatedEmailHTML({
      studentName: params.studentName,
      assignmentTitle: params.assignmentTitle,
      courseCode: params.courseCode,
      dueDate: params.dueDate,
      assignmentUrl,
    }),
  })
}

/**
 * Send grade received notification email
 */
export async function sendGradeReceivedEmail(params: {
  to: string
  studentName: string
  assignmentTitle: string
  courseCode: string
  grade: number
  feedback?: string
  assignmentId: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const submissionUrl = `${baseUrl}/student/assignments/${params.assignmentId}`

  return sendEmail({
    to: params.to,
    subject: `Grade Posted: ${params.assignmentTitle} - ${params.courseCode}`,
    html: getGradeReceivedEmailHTML({
      studentName: params.studentName,
      assignmentTitle: params.assignmentTitle,
      courseCode: params.courseCode,
      grade: params.grade,
      feedback: params.feedback,
      submissionUrl,
    }),
  })
}

/**
 * Send enrollment approved notification email
 */
export async function sendEnrollmentApprovedEmail(params: {
  to: string
  studentName: string
  courseCode: string
  courseTitle: string
  courseId: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const courseUrl = `${baseUrl}/student/courses`

  return sendEmail({
    to: params.to,
    subject: `Enrollment Approved: ${params.courseCode} - ${params.courseTitle}`,
    html: getEnrollmentApprovedEmailHTML({
      studentName: params.studentName,
      courseCode: params.courseCode,
      courseTitle: params.courseTitle,
      courseUrl,
    }),
  })
}

/**
 * Send enrollment rejected notification email
 */
export async function sendEnrollmentRejectedEmail(params: {
  to: string
  studentName: string
  courseCode: string
  courseTitle: string
  reason?: string
}) {
  return sendEmail({
    to: params.to,
    subject: `Enrollment Update: ${params.courseCode} - ${params.courseTitle}`,
    html: getEnrollmentRejectedEmailHTML({
      studentName: params.studentName,
      courseCode: params.courseCode,
      courseTitle: params.courseTitle,
      reason: params.reason,
    }),
  })
}

/**
 * Email template for welcome email with credentials
 */
export function getWelcomeEmailHTML(params: {
  userName: string
  email: string
  temporaryPassword: string
  loginUrl: string
  role: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Educy</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Welcome to Educy!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.userName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Your account has been created for the Educy learning platform. Below are your login credentials:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong></p>
      <p style="margin: 5px 0 15px 0; color: #1f2937; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${params.email}</p>

      <p style="margin: 15px 0 5px 0; color: #6b7280;"><strong>Temporary Password:</strong></p>
      <p style="margin: 5px 0 15px 0; color: #1f2937; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${params.temporaryPassword}</p>

      <p style="margin: 15px 0 5px 0; color: #6b7280;"><strong>Role:</strong></p>
      <p style="margin: 5px 0; color: #1f2937;">${params.role}</p>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important:</strong> For security reasons, please change your password after your first login.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Sign In Now</a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions or need assistance, please contact your course administrator.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Send welcome email with credentials
 */
export async function sendWelcomeEmail(params: {
  to: string
  userName: string
  temporaryPassword: string
  role: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/auth/signin`

  return sendEmail({
    to: params.to,
    subject: 'Welcome to Educy - Your Account Credentials',
    html: getWelcomeEmailHTML({
      userName: params.userName,
      email: params.to,
      temporaryPassword: params.temporaryPassword,
      loginUrl,
      role: params.role,
    }),
  })
}

/**
 * Email template for password reset
 */
export function getPasswordResetEmailHTML(params: {
  userName: string
  resetUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.userName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password. Click the button below to choose a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ This link will expire in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #6b7280; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace;">
      ${params.resetUrl}
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string
  userName: string
  resetUrl: string
}) {
  return sendEmail({
    to: params.to,
    subject: 'Reset Your Password - Educy',
    html: getPasswordResetEmailHTML({
      userName: params.userName,
      resetUrl: params.resetUrl,
    }),
  })
}

/**
 * Email template for welcome email with password setup link (bulk import)
 */
export function getWelcomeWithSetupEmailHTML(params: {
  userName: string
  email: string
  setupUrl: string
  role: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Educy - Set Up Your Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #5C2482 0%, #7B3FA3 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Welcome to Educy!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.userName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">Your account has been created for the Educy learning platform! To get started, you'll need to set up your password.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #5C2482; margin: 20px 0;">
      <p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong></p>
      <p style="margin: 5px 0 15px 0; color: #1f2937; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">${params.email}</p>

      <p style="margin: 15px 0 5px 0; color: #6b7280;"><strong>Role:</strong></p>
      <p style="margin: 5px 0; color: #1f2937;">${params.role}</p>
    </div>

    <p style="font-size: 16px; margin: 20px 0;">Click the button below to set up your password and activate your account:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.setupUrl}" style="display: inline-block; background: linear-gradient(135deg, #F95B0E 0%, #d94f0c 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Set Up Your Password</a>
    </div>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important:</strong> This link will expire in 7 days. Please set up your password before then to access your account.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #6b7280; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace;">
      ${params.setupUrl}
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions or need assistance, please contact your course administrator.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated notification from your course management system.
    </p>
  </div>
</body>
</html>
  `
}

/**
 * Send welcome email with password setup link (for bulk import)
 */
export async function sendWelcomeWithSetupEmail(params: {
  to: string
  userName: string
  setupUrl: string
  role: string
}) {
  return sendEmail({
    to: params.to,
    subject: 'Welcome to Educy - Set Up Your Account',
    html: getWelcomeWithSetupEmailHTML({
      userName: params.userName,
      email: params.to,
      setupUrl: params.setupUrl,
      role: params.role,
    }),
  })
}
