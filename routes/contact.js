const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;
// const nodemailer = require('nodemailer'); // Optional - disabled for simple setup
const rateLimit = require('express-rate-limit');

// Rate limiting for contact form
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many contact form submissions, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Contact form submission endpoint
router.post('/submit', contactLimiter, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                error: 'All fields are required.'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Please enter a valid email address.'
            });
        }

        // Sanitize inputs
        const sanitizedData = {
            name: name.trim().substring(0, 100),
            email: email.trim().toLowerCase().substring(0, 100),
            subject: subject.trim(),
            message: message.trim().substring(0, 2000)
        };

        // Save to database
        const insertQuery = `
            INSERT INTO contact_inquiries (name, email, inquiry_type, message, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        const clientIP = req.ip || req.connection.remoteAddress;
        
        await db.execute(insertQuery, [
            sanitizedData.name,
            sanitizedData.email,
            sanitizedData.subject,
            sanitizedData.message,
            clientIP
        ]);

        // Send notification email (optional) - disabled for simple setup
        // if (process.env.SMTP_ENABLED === 'true') {
        //     try {
        //         await sendNotificationEmail(sanitizedData);
        //     } catch (emailError) {
        //         console.error('Email notification failed:', emailError);
        //         // Don't fail the request if email fails
        //     }
        // }

        res.json({
            success: true,
            message: 'Thank you for your message! I\'ll get back to you soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            error: 'Something went wrong. Please try again later.'
        });
    }
});

// Newsletter signup endpoint
router.post('/newsletter', contactLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email address is required.'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Please enter a valid email address.'
            });
        }

        const sanitizedEmail = email.trim().toLowerCase();

        // Check if email already exists
        const checkQuery = 'SELECT id FROM newsletter_subscribers WHERE email = ?';
        const [existing] = await db.execute(checkQuery, [sanitizedEmail]);

        if (existing.length > 0) {
            return res.status(400).json({
                error: 'This email is already subscribed to our newsletter.'
            });
        }

        // Add to newsletter
        const insertQuery = `
            INSERT INTO newsletter_subscribers (email, subscribed_at, ip_address, is_active)
            VALUES (?, NOW(), ?, TRUE)
        `;

        const clientIP = req.ip || req.connection.remoteAddress;

        await db.execute(insertQuery, [sanitizedEmail, clientIP]);

        res.json({
            success: true,
            message: 'Successfully subscribed to the newsletter!'
        });

    } catch (error) {
        console.error('Newsletter signup error:', error);
        res.status(500).json({
            error: 'Something went wrong. Please try again later.'
        });
    }
});

// Email notification function - disabled for simple setup
// async function sendNotificationEmail(formData) {
//     if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
//         console.log('SMTP not configured, skipping email notification');
//         return;
//     }
//
//     const transporter = nodemailer.createTransporter({
//         host: process.env.SMTP_HOST,
//         port: process.env.SMTP_PORT || 587,
//         secure: process.env.SMTP_SECURE === 'true',
//         auth: {
//             user: process.env.SMTP_USER,
//             pass: process.env.SMTP_PASS
//         }
//     });
//
//     const mailOptions = {
//         from: process.env.SMTP_FROM || process.env.SMTP_USER,
//         to: process.env.CONTACT_EMAIL || 'contact@a-moody-place.com',
//         subject: `New Contact Form Submission: ${formData.subject}`,
//         html: `
//             <h2>New Contact Form Submission</h2>
//             <p><strong>Name:</strong> ${formData.name}</p>
//             <p><strong>Email:</strong> ${formData.email}</p>
//             <p><strong>Subject:</strong> ${formData.subject}</p>
//             <p><strong>Message:</strong></p>
//             <div style="background: #f8f9fa; padding: 1rem; border-left: 3px solid #2c3e50;">
//                 ${formData.message.replace(/\n/g, '<br>')}
//             </div>
//             <p><small>Submitted at ${new Date().toLocaleString()}</small></p>
//         `
//     };
//
//     await transporter.sendMail(mailOptions);
// }

module.exports = router;